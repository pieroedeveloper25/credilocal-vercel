import { createHash } from 'node:crypto';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AlmacenSesiones, RepositorioDatos } from '../../shared/aplicacion/puertos';
import type { Datos } from '../../shared/dominio/datos';

/**
 * Persistencia relacional: una tabla por entidad del modelo del capítulo 8 del informe.
 * El puerto RepositorioDatos no cambia; aquí solo se traduce entre el objeto Datos y las tablas.
 * Tipos de columna: T = texto, I = entero, B = booleano (0/1) y J = JSON (solo `plan` e `imagenCredito`).
 * Los campos opcionales ausentes se guardan como NULL y se omiten al leer.
 * Guardar es incremental: se compara el estado nuevo con el último conocido de la base y solo se ejecutan los
 * INSERT, UPDATE y DELETE de las filas que cambiaron, dentro de una única transacción.
 */
type Tipo = 'T' | 'I' | 'B' | 'J';
type Columna = readonly [propiedad: string, tipo: Tipo];
interface Dependencia {
    /** Tabla de la entidad principal de la que depende. */
    tabla: string;
    /** Columna que referencia a la entidad principal. */
    columna: string;
    tipo: Tipo;
    /** Propiedad de la entidad principal que la identifica. */
    propiedad: string;
    /** Propiedad de la entidad principal donde viven las filas dependientes. */
    hijos: string;
    /** true: una sola fila por padre (objeto); false: lista ordenada. */
    unoAUno?: boolean;
    /** true: la propiedad siempre existe en el modelo, aunque la lista esté vacía. */
    siempre?: boolean;
    /** Columnas que se copian de la entidad principal para enlazar claves compuestas; no forman parte del objeto. */
    heredadas?: { columna: string; propiedad: string }[];
}
interface Tabla {
    nombre: string;
    /** Propiedad de Datos que contiene la lista (entidades principales). */
    lista?: 'tiendas' | 'cuentas' | 'clientes' | 'productos' | 'ventas' | 'obligaciones' | 'listados' | 'pagos' | 'auditoria';
    dependencia?: Dependencia;
    columnas: Columna[];
    clave: string;
    restricciones?: string[];
}
const SQL: Record<Tipo, string> = { T: 'TEXT', I: 'INTEGER', B: 'INTEGER', J: 'TEXT' };
const snake = (s: string) => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
/** Valores permitidos de una columna de texto; NULL queda permitido en los campos opcionales. */
const valores = (col: string, ...v: string[]) => `CHECK (${col} IS NULL OR ${col} IN (${v.map(x => `'${x}'`).join(', ')}))`;
const fk = (col: string, tabla: string, ref: string) => `FOREIGN KEY (${col}) REFERENCES ${tabla}(${ref})`;
const condiciones: Columna[] = [['moneda', 'T'], ['diaCorte', 'I'], ['diaPago', 'I'], ['horaCorte', 'T'], ['tipoC', 'T'], ['valC', 'T'], ['capC', 'T'], ['tipoM', 'T'], ['valM', 'T'], ['capM', 'T']];

/** El orden de la lista es el orden de inserción: cada padre aparece antes que sus dependientes. */
const TABLAS: Tabla[] = [
    { nombre: 'tiendas', lista: 'tiendas', clave: 'id', restricciones: ['UNIQUE (ruc)'],
        columnas: [['id', 'I'], ['ruc', 'T'], ['razon', 'T'], ['nombre', 'T'], ['giro', 'T'], ['direccion', 'T'], ['telefono', 'T'], ['correo', 'T'], ['activa', 'B']] },
    { nombre: 'clientes', lista: 'clientes', clave: 'id', restricciones: [fk('tienda_id', 'tiendas', 'id'), valores('tipo_doc', 'DNI', 'RUC'), valores('moneda', 'PEN', 'USD'), valores('tipo_c', 'Nominal', 'Efectiva'), valores('cap_c', 'Diaria', 'Mensual'), valores('tipo_m', 'Nominal', 'Efectiva'), valores('cap_m', 'Diaria', 'Mensual')],
        columnas: [['id', 'I'], ['tiendaId', 'I'], ['tipoDoc', 'T'], ['doc', 'T'], ['nombre', 'T'], ['direccion', 'T'], ['telefono', 'T'], ['correo', 'T'], ['activo', 'B'],
            ['limite', 'T'], ['deuda', 'T'], ['saldoComprometido', 'T'], ['moneda', 'T'], ['plazo', 'I'], ['diaCorte', 'I'], ['diaPago', 'I'], ['horaCorte', 'T'],
            ['tipoC', 'T'], ['valC', 'T'], ['capC', 'T'], ['tipoM', 'T'], ['valM', 'T'], ['capM', 'T']] },
    { nombre: 'cuentas', lista: 'cuentas', clave: 'id', restricciones: ['UNIQUE (correo)', 'UNIQUE (cliente_id)', fk('tienda_id', 'tiendas', 'id'), fk('cliente_id', 'clientes', 'id'), valores('rol', 'Superadministrador', 'Comercio', 'Cliente')],
        columnas: [['id', 'I'], ['tiendaId', 'I'], ['clienteId', 'I'], ['correo', 'T'], ['sal', 'T'], ['hash', 'T'], ['rol', 'T']] },
    { nombre: 'productos', lista: 'productos', clave: 'tienda_id, sku', restricciones: [fk('tienda_id', 'tiendas', 'id'), valores('modalidad', 'Ambas', 'Fin de mes', 'Cuotas')],
        columnas: [['tiendaId', 'I'], ['sku', 'T'], ['nombre', 'T'], ['descripcion', 'T'], ['marca', 'T'], ['proveedor', 'T'], ['unidad', 'T'], ['imagen', 'T'], ['imagenCredito', 'J'],
            ['contado', 'T'], ['credito', 'T'], ['modalidad', 'T'], ['activo', 'B']] },
    { nombre: 'ventas', lista: 'ventas', clave: 'id', restricciones: [fk('tienda_id', 'tiendas', 'id'), fk('cliente_id', 'clientes', 'id'), valores('modalidad', 'Fin de mes', 'Cuotas')],
        columnas: [['id', 'I'], ['tiendaId', 'I'], ['clienteId', 'I'], ['fecha', 'T'], ['hora', 'T'], ['horaCorte', 'T'], ['detalle', 'T'], ['capital', 'T'], ['modalidad', 'T'], ['n', 'I'], ['plan', 'J']] },
    { nombre: 'items', clave: 'venta_id, posicion', restricciones: [fk('venta_id', 'ventas', 'id'), 'FOREIGN KEY (tienda_id, sku) REFERENCES productos(tienda_id, sku)'],
        dependencia: { tabla: 'ventas', columna: 'venta_id', tipo: 'I', propiedad: 'id', hijos: 'items', heredadas: [{ columna: 'tienda_id', propiedad: 'tiendaId' }] },
        columnas: [['sku', 'T'], ['cantidad', 'T'], ['precio', 'T'], ['nombre', 'T']] },
    { nombre: 'condiciones', clave: 'venta_id', restricciones: [fk('venta_id', 'ventas', 'id')],
        dependencia: { tabla: 'ventas', columna: 'venta_id', tipo: 'I', propiedad: 'id', hijos: 'condiciones', unoAUno: true },
        columnas: condiciones },
    { nombre: 'obligaciones', lista: 'obligaciones', clave: 'id', restricciones: [fk('tienda_id', 'tiendas', 'id'), fk('cliente_id', 'clientes', 'id'), fk('venta_id', 'ventas', 'id'), valores('modalidad', 'Fin de mes', 'Cuotas')],
        columnas: [['id', 'T'], ['tiendaId', 'I'], ['clienteId', 'I'], ['ventaId', 'I'], ['modalidad', 'T'], ['cuota', 'I'], ['fechaCompra', 'T'], ['hora', 'T'], ['detalle', 'T'],
            ['vencimiento', 'T'], ['corteAsignado', 'T'], ['capital', 'T'], ['comp', 'T'], ['tedComp', 'T'], ['temComp', 'T'], ['tedMora', 'T'], ['moneda', 'T'],
            ['pagada', 'T'], ['fechaPago', 'T'], ['horaPago', 'T']] },
    { nombre: 'listados', lista: 'listados', clave: 'id', restricciones: [fk('tienda_id', 'tiendas', 'id'), fk('cliente_id', 'clientes', 'id')],
        columnas: [['id', 'T'], ['tiendaId', 'I'], ['clienteId', 'I'], ['periodo', 'T'], ['corte', 'T'], ['fechaPago', 'T'], ['moneda', 'T'], ['capital', 'T'], ['comp', 'T'], ['mora', 'T'], ['total', 'T']] },
    { nombre: 'lineas_listado', clave: 'listado_id, posicion', restricciones: [fk('listado_id', 'listados', 'id'), fk('obligacion_id', 'obligaciones', 'id')],
        dependencia: { tabla: 'listados', columna: 'listado_id', tipo: 'T', propiedad: 'id', hijos: 'lineas', siempre: true },
        columnas: [['obligacionId', 'T'], ['fechaCompra', 'T'], ['detalle', 'T'], ['vencimiento', 'T'], ['dias', 'I'], ['tasa', 'T'], ['baseTasa', 'T'], ['concepto', 'T'], ['importe', 'T']] },
    { nombre: 'pagos', lista: 'pagos', clave: 'constancia', restricciones: [fk('tienda_id', 'tiendas', 'id'), fk('cliente_id', 'clientes', 'id')],
        columnas: [['constancia', 'T'], ['tiendaId', 'I'], ['clienteId', 'I'], ['periodo', 'T'], ['fecha', 'T'], ['hora', 'T'], ['moneda', 'T'], ['abono', 'T'], ['capital', 'T'], ['comp', 'T'], ['mora', 'T']] },
    { nombre: 'detalles_pago', clave: 'pago_constancia, posicion', restricciones: [fk('pago_constancia', 'pagos', 'constancia'), fk('obligacion_id', 'obligaciones', 'id'), 'UNIQUE (obligacion_id)'],
        dependencia: { tabla: 'pagos', columna: 'pago_constancia', tipo: 'T', propiedad: 'constancia', hijos: 'detalles' },
        columnas: [['obligacionId', 'T'], ['capital', 'T'], ['comp', 'T'], ['mora', 'T']] },
    { nombre: 'auditoria', lista: 'auditoria', clave: 'posicion',
        columnas: [['fecha', 'T'], ['actor', 'T'], ['accion', 'T'], ['tiendaId', 'I'], ['detalle', 'T']] },
];
/** Colecciones de la versión 1.0, que guardaba un documento JSON por fila. */
const LEGADAS = ['tiendas', 'cuentas', 'clientes', 'productos', 'ventas', 'obligaciones', 'listados', 'pagos', 'auditoria'] as const;

const aSql = (v: unknown, tipo: Tipo): string | number | null => {
    if (v === undefined || v === null) return null;
    if (tipo === 'B') return v ? 1 : 0;
    if (tipo === 'J') return JSON.stringify(v);
    return v as string | number;
};
const deSql = (v: unknown, tipo: Tipo): unknown => (tipo === 'B' ? v === 1 : tipo === 'J' ? JSON.parse(v as string) : v);
const objeto = (fila: any, columnas: Columna[]) => {
    const o: any = {};
    for (const [p, tipo] of columnas) if (fila[snake(p)] !== null) o[p] = deSql(fila[snake(p)], tipo);
    return o;
};

function ddl(t: Tabla): string {
    const d = t.dependencia;
    const cols = [
        ...(d ? [`${d.columna} ${SQL[d.tipo]} NOT NULL`, ...(d.heredadas ?? []).map(h => `${h.columna} INTEGER`)] : []),
        ...(d?.unoAUno ? [] : ['posicion INTEGER NOT NULL']),
        ...t.columnas.map(([p, tipo]) => `${snake(p)} ${SQL[tipo]}`),
    ];
    return `CREATE TABLE IF NOT EXISTS ${t.nombre} (${[...cols, `PRIMARY KEY (${t.clave})`, ...(t.restricciones ?? [])].join(', ')})`;
}
function crearEsquema(db: DatabaseSync) {
    db.exec('CREATE TABLE IF NOT EXISTS metadatos (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)');
    for (const t of TABLAS) db.exec(ddl(t));
    // Tabla auxiliar de infraestructura: no es una entidad del modelo del informe. Sin claves foráneas, porque las cuentas se reescriben en cada guardado.
    db.exec('CREATE TABLE IF NOT EXISTS sesiones (token_hash TEXT PRIMARY KEY, cuenta_id INTEGER NOT NULL, vence INTEGER NOT NULL)');
}

/** Una fila lista para escribir: sus valores en el orden de `nombresColumnas`. */
type Fila = unknown[];
/** Última versión conocida de cada fila: su clave y la firma (hash) de sus valores. */
type Estado = Map<string, Map<string, { clave: unknown[]; firma: string }>>;
export interface ResumenGuardado { insertadas: number; actualizadas: number; eliminadas: number }

/** Columnas físicas de la tabla, en el orden en que se escriben. */
const nombresColumnas = (t: Tabla) => [
    ...(t.dependencia ? [t.dependencia.columna, ...(t.dependencia.heredadas ?? []).map(h => h.columna)] : []),
    ...(t.dependencia?.unoAUno ? [] : ['posicion']),
    ...t.columnas.map(([p]) => snake(p)),
];
/** Posiciones, dentro de la fila, de las columnas que forman la clave primaria. */
const indicesClave = (t: Tabla) => t.clave.split(',').map(c => nombresColumnas(t).indexOf(c.trim()));
const firmaDe = (f: Fila) => createHash('sha256').update(JSON.stringify(f)).digest('base64');

/** Convierte Datos en las filas de cada tabla, indexadas por clave primaria. */
function filasDe(d: Datos): Map<string, Map<string, Fila>> {
    const todas = new Map<string, Map<string, Fila>>();
    for (const t of TABLAS) {
        const dep = t.dependencia;
        const heredadas = dep?.heredadas ?? [];
        const indices = indicesClave(t);
        const filas = new Map<string, Fila>();
        const agregar = (fila: Fila) => {
            const clave = JSON.stringify(indices.map(i => fila[i]));
            if (filas.has(clave)) throw new Error(`Clave duplicada en ${t.nombre}: ${clave}`);
            filas.set(clave, fila);
        };
        const valores = (o: any) => t.columnas.map(([p, tipo]) => aSql(o[p], tipo));
        if (t.lista) {
            ((d[t.lista] as any[]) ?? []).forEach((o, i) => agregar([i, ...valores(o)]));
        }
        else {
            const principal = TABLAS.find(x => x.nombre === dep!.tabla)!;
            for (const p of ((d[principal.lista!] as any[]) ?? [])) {
                const hijo = p[dep!.hijos];
                if (hijo === undefined || hijo === null) continue;
                const claves = [p[dep!.propiedad], ...heredadas.map(h => p[h.propiedad] ?? null)];
                if (dep!.unoAUno) agregar([...claves, ...valores(hijo)]);
                else (hijo as any[]).forEach((h, i) => agregar([...claves, i, ...valores(h)]));
            }
        }
        todas.set(t.nombre, filas);
    }
    return todas;
}

/** Lee la base y calcula la firma de cada fila: punto de partida cuando no se conoce el último estado. */
function leerEstado(db: DatabaseSync): Estado {
    const estado: Estado = new Map();
    for (const t of TABLAS) {
        const nombres = nombresColumnas(t), indices = indicesClave(t);
        const filas = new Map<string, { clave: unknown[]; firma: string }>();
        for (const f of db.prepare(`SELECT ${nombres.join(',')} FROM ${t.nombre}`).all() as any[]) {
            const fila: Fila = nombres.map(c => f[c] ?? null);
            const clave = indices.map(i => fila[i]);
            filas.set(JSON.stringify(clave), { clave, firma: firmaDe(fila) });
        }
        estado.set(t.nombre, filas);
    }
    return estado;
}

interface Sentencias { insertar: StatementSync; actualizar?: StatementSync; eliminar: StatementSync; indices: number[]; variables: number[] }
function prepararSentencias(db: DatabaseSync): Map<string, Sentencias> {
    const m = new Map<string, Sentencias>();
    for (const t of TABLAS) {
        const nombres = nombresColumnas(t), indices = indicesClave(t);
        const variables = nombres.map((_, i) => i).filter(i => !indices.includes(i));
        const donde = indices.map(i => `${nombres[i]}=?`).join(' AND ');
        m.set(t.nombre, {
            indices, variables,
            insertar: db.prepare(`INSERT INTO ${t.nombre}(${nombres.join(',')}) VALUES (${nombres.map(() => '?').join(',')})`),
            actualizar: variables.length ? db.prepare(`UPDATE ${t.nombre} SET ${variables.map(i => `${nombres[i]}=?`).join(',')} WHERE ${donde}`) : undefined,
            eliminar: db.prepare(`DELETE FROM ${t.nombre} WHERE ${donde}`),
        });
    }
    return m;
}

/**
 * Lleva la base del estado `previo` al de `d` con las sentencias mínimas. Primero se eliminan filas (hijas antes que padres)
 * y luego se insertan y actualizan (padres antes que hijas), de modo que las claves foráneas se cumplen en todo momento.
 */
function sincronizar(sentencias: Map<string, Sentencias>, d: Datos, previo: Estado): { estado: Estado; resumen: ResumenGuardado } {
    const nuevas = filasDe(d);
    const resumen: ResumenGuardado = { insertadas: 0, actualizadas: 0, eliminadas: 0 };
    for (const t of [...TABLAS].reverse()) {
        const actuales = nuevas.get(t.nombre)!;
        for (const [clave, fila] of previo.get(t.nombre) ?? [])
            if (!actuales.has(clave)) {
                sentencias.get(t.nombre)!.eliminar.run(...(fila.clave as any[]));
                resumen.eliminadas++;
            }
    }
    const estado: Estado = new Map();
    for (const t of TABLAS) {
        const s = sentencias.get(t.nombre)!;
        const anteriores = previo.get(t.nombre);
        const filas = new Map<string, { clave: unknown[]; firma: string }>();
        for (const [clave, fila] of nuevas.get(t.nombre)!) {
            const firma = firmaDe(fila);
            const anterior = anteriores?.get(clave);
            if (!anterior) {
                s.insertar.run(...(fila as any[]));
                resumen.insertadas++;
            }
            else if (anterior.firma !== firma) {
                s.actualizar!.run(...(s.variables.map(i => fila[i]) as any[]), ...(s.indices.map(i => fila[i]) as any[]));
                resumen.actualizadas++;
            }
            filas.set(clave, { clave: s.indices.map(i => fila[i]), firma });
        }
        estado.set(t.nombre, filas);
    }
    return { estado, resumen };
}

function leerTodo(db: DatabaseSync): Datos {
    const d: any = {};
    for (const t of TABLAS.filter(x => x.lista))
        d[t.lista!] = db.prepare(`SELECT * FROM ${t.nombre} ORDER BY posicion`).all().map(f => objeto(f, t.columnas));
    for (const t of TABLAS.filter(x => x.dependencia)) {
        const dep = t.dependencia!;
        const principal = TABLAS.find(x => x.nombre === dep.tabla)!;
        const padres = new Map<unknown, any>((d[principal.lista!] as any[]).map(p => [p[dep.propiedad], p]));
        if (dep.siempre) for (const p of padres.values()) p[dep.hijos] = [];
        for (const f of db.prepare(`SELECT * FROM ${t.nombre}${dep.unoAUno ? '' : ' ORDER BY posicion'}`).all() as any[]) {
            const padre = padres.get(f[dep.columna]);
            if (dep.unoAUno) padre[dep.hijos] = objeto(f, t.columnas);
            else (padre[dep.hijos] ??= []).push(objeto(f, t.columnas));
        }
    }
    return d;
}

/** Una base de la versión 1.0 se convierte una sola vez, dentro de una transacción, al abrirla. */
function migrarLegado(db: DatabaseSync) {
    if (!db.prepare("SELECT 1 AS x FROM pragma_table_info('tiendas') WHERE name='contenido'").get())
        return;
    const viejo: any = {};
    for (const tabla of LEGADAS)
        viejo[tabla] = db.prepare(`SELECT contenido FROM ${tabla} ORDER BY posicion`).all().map((r: any) => JSON.parse(r.contenido));
    db.exec('BEGIN IMMEDIATE');
    try {
        for (const tabla of LEGADAS) db.exec(`DROP TABLE ${tabla}`);
        crearEsquema(db);
        sincronizar(prepararSentencias(db), viejo, new Map());
        db.exec('COMMIT');
    }
    catch (e) {
        db.exec('ROLLBACK');
        throw e;
    }
}

export function abrirBase(ruta: string): RepositorioDatos & { sesiones: AlmacenSesiones; ultimoGuardado(): ResumenGuardado } {
    if (ruta !== ':memory:')
        mkdirSync(dirname(ruta), { recursive: true });
    const db = new DatabaseSync(ruta);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
    db.exec('CREATE TABLE IF NOT EXISTS metadatos (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)');
    migrarLegado(db);
    crearEsquema(db);
    const leer = (): Datos | undefined => {
        if (!db.prepare("SELECT valor FROM metadatos WHERE clave='inicializada'").get())
            return;
        const d: any = leerTodo(db);
        d.finanzasVersion = Number((db.prepare("SELECT valor FROM metadatos WHERE clave='finanzasVersion'").get() as any)?.valor ?? 1);
        return d;
    };
    const sentencias = prepararSentencias(db);
    const metadato = (clave: string) => (db.prepare('SELECT valor FROM metadatos WHERE clave=?').get(clave) as { valor: string } | undefined)?.valor;
    const escribirMetadato = (clave: string, valor: string) => void db.prepare('INSERT OR REPLACE INTO metadatos(clave,valor) VALUES (?,?)').run(clave, valor);
    /** Último estado conocido de la base y la versión que tenía; solo vale mientras nadie más escriba. */
    let conocido: { version: number; estado: Estado } | undefined;
    let ultimo: ResumenGuardado = { insertadas: 0, actualizadas: 0, eliminadas: 0 };
    const guardar = (d: Datos) => {
        db.exec('BEGIN IMMEDIATE');
        try {
            const version = Number(metadato('version') ?? 0);
            const previo = conocido && conocido.version === version ? conocido.estado : leerEstado(db);
            const { estado, resumen } = sincronizar(sentencias, d, previo);
            let metadatosCambiados = false;
            if (metadato('inicializada') !== '1') { escribirMetadato('inicializada', '1'); metadatosCambiados = true; }
            if (metadato('finanzasVersion') !== String(d.finanzasVersion ?? 1)) { escribirMetadato('finanzasVersion', String(d.finanzasVersion ?? 1)); metadatosCambiados = true; }
            const hubo = metadatosCambiados || resumen.insertadas + resumen.actualizadas + resumen.eliminadas > 0;
            if (hubo) escribirMetadato('version', String(version + 1));
            db.exec('COMMIT');
            conocido = { version: hubo ? version + 1 : version, estado };
            ultimo = resumen;
        }
        catch (e) {
            conocido = undefined;
            db.exec('ROLLBACK');
            throw e;
        }
    };
    const sesiones: AlmacenSesiones = {
        obtener: r => {
            const f = db.prepare('SELECT cuenta_id, vence FROM sesiones WHERE token_hash=?').get(r) as { cuenta_id: number; vence: number } | undefined;
            return f && { cuentaId: f.cuenta_id, vence: f.vence };
        },
        guardar: (r, s) => void db.prepare('INSERT OR REPLACE INTO sesiones(token_hash,cuenta_id,vence) VALUES (?,?,?)').run(r, s.cuentaId, s.vence),
        borrar: r => void db.prepare('DELETE FROM sesiones WHERE token_hash=?').run(r),
        borrarDeCuenta: (cuentaId, conservar) => void db.prepare('DELETE FROM sesiones WHERE cuenta_id=? AND token_hash IS NOT ?').run(cuentaId, conservar ?? null),
        limpiarVencidas: ahora => void db.prepare('DELETE FROM sesiones WHERE vence<?').run(ahora),
    };
    return { leer, guardar, cerrar: () => db.close(), sesiones, ultimoGuardado: () => ultimo };
}
