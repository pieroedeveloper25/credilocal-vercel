/**
 * Esquema relacional de CrediLocal, independiente del motor (SQLite o PostgreSQL).
 * Una tabla por entidad del modelo del capítulo 8 del informe. El puerto RepositorioDatos no cambia.
 * Tipos de columna: T = texto, I = entero, B = booleano (0/1) y J = JSON en texto (solo `plan` e `imagenCredito`).
 * Los campos opcionales ausentes se guardan como NULL y se omiten al leer.
 * Guardar es incremental: se compara el estado nuevo con el último conocido y solo se planifican los
 * INSERT, UPDATE y DELETE de las filas que cambiaron. El adaptador ejecuta el plan dentro de una transacción.
 */
import { createHash } from 'node:crypto';
import type { Datos } from '../../shared/dominio/datos';

export type Tipo = 'T' | 'I' | 'B' | 'J';
export type Columna = readonly [propiedad: string, tipo: Tipo];
export interface Dependencia {
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
export interface Tabla {
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
export const TABLAS: Tabla[] = [
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

/** Tabla auxiliar de metadatos: versión, bandera de inicialización y versión de finanzas. */
export const METADATOS_DDL = 'CREATE TABLE IF NOT EXISTS metadatos (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)';
/** Tabla auxiliar de infraestructura: no es una entidad del modelo del informe. Guarda solo el resumen del token. */
export const SESIONES_DDL = 'CREATE TABLE IF NOT EXISTS sesiones (token_hash TEXT PRIMARY KEY, cuenta_id INTEGER NOT NULL, vence BIGINT NOT NULL)';

function ddl(t: Tabla): string {
    const d = t.dependencia;
    const cols = [
        ...(d ? [`${d.columna} ${SQL[d.tipo]} NOT NULL`, ...(d.heredadas ?? []).map(h => `${h.columna} INTEGER`)] : []),
        ...(d?.unoAUno ? [] : ['posicion INTEGER NOT NULL']),
        ...t.columnas.map(([p, tipo]) => `${snake(p)} ${SQL[tipo]}`),
    ];
    return `CREATE TABLE IF NOT EXISTS ${t.nombre} (${[...cols, `PRIMARY KEY (${t.clave})`, ...(t.restricciones ?? [])].join(', ')})`;
}

/** Sentencias DDL idempotentes, en el orden de creación. */
export function sentenciasDeEsquema(): string[] {
    return [METADATOS_DDL, ...TABLAS.map(ddl), SESIONES_DDL];
}

/** Lectura de una tabla completa, en el orden en que se reconstruye la entidad. */
export function sqlLectura(t: Tabla): string {
    return `SELECT * FROM ${t.nombre}${t.lista || !t.dependencia?.unoAUno ? ' ORDER BY posicion' : ''}`;
}

/** Filas crudas de cada tabla, indexadas por nombre de tabla y con nombres de columna en snake_case. */
export type Crudos = Record<string, Record<string, unknown>[]>;

export const aSql = (v: unknown, tipo: Tipo): string | number | null => {
    if (v === undefined || v === null) return null;
    if (tipo === 'B') return v ? 1 : 0;
    if (tipo === 'J') return JSON.stringify(v);
    return v as string | number;
};
const deSql = (v: unknown, tipo: Tipo): unknown => (tipo === 'B' ? v === 1 : tipo === 'J' ? JSON.parse(v as string) : v);
const objeto = (fila: any, columnas: Columna[]) => {
    const o: any = {};
    for (const [p, tipo] of columnas) if (fila[snake(p)] !== null && fila[snake(p)] !== undefined) o[p] = deSql(fila[snake(p)], tipo);
    return o;
};

/** Columnas físicas de la tabla, en el orden en que se escriben. */
export const nombresColumnas = (t: Tabla) => [
    ...(t.dependencia ? [t.dependencia.columna, ...(t.dependencia.heredadas ?? []).map(h => h.columna)] : []),
    ...(t.dependencia?.unoAUno ? [] : ['posicion']),
    ...t.columnas.map(([p]) => snake(p)),
];
/** Posiciones, dentro de la fila, de las columnas que forman la clave primaria. */
export const indicesClave = (t: Tabla) => t.clave.split(',').map(c => nombresColumnas(t).indexOf(c.trim()));
const firmaDe = (f: unknown[]) => createHash('sha256').update(JSON.stringify(f)).digest('base64');

export type Fila = unknown[];
/** Última versión conocida de cada fila: su clave y la firma (hash) de sus valores. */
export type Estado = Map<string, Map<string, { clave: unknown[]; firma: string }>>;
export interface ResumenGuardado { insertadas: number; actualizadas: number; eliminadas: number }
/** Una sentencia del plan. Usa `?` como marcador; cada adaptador lo traduce a su propio formato. */
export interface Operacion { tabla: string; sql: string; params: unknown[] }

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
        const valoresDe = (o: any) => t.columnas.map(([p, tipo]) => aSql(o[p], tipo));
        if (t.lista) {
            ((d[t.lista] as any[]) ?? []).forEach((o, i) => agregar([i, ...valoresDe(o)]));
        }
        else {
            const principal = TABLAS.find(x => x.nombre === dep!.tabla)!;
            for (const p of ((d[principal.lista!] as any[]) ?? [])) {
                const hijo = p[dep!.hijos];
                if (hijo === undefined || hijo === null) continue;
                const claves = [p[dep!.propiedad], ...heredadas.map(h => p[h.propiedad] ?? null)];
                if (dep!.unoAUno) agregar([...claves, ...valoresDe(hijo)]);
                else (hijo as any[]).forEach((h, i) => agregar([...claves, i, ...valoresDe(h)]));
            }
        }
        todas.set(t.nombre, filas);
    }
    return todas;
}

/** Calcula el estado conocido a partir de las filas leídas de la base. */
export function estadoDesde(crudos: Crudos): Estado {
    const estado: Estado = new Map();
    for (const t of TABLAS) {
        const nombres = nombresColumnas(t), indices = indicesClave(t);
        const filas = new Map<string, { clave: unknown[]; firma: string }>();
        for (const f of crudos[t.nombre] ?? []) {
            const fila: Fila = nombres.map(c => f[c] ?? null);
            const clave = indices.map(i => fila[i]);
            filas.set(JSON.stringify(clave), { clave, firma: firmaDe(fila) });
        }
        estado.set(t.nombre, filas);
    }
    return estado;
}

/** Reconstruye Datos a partir de las filas leídas de la base. */
export function armarDatos(crudos: Crudos): Datos {
    const d: any = {};
    for (const t of TABLAS.filter(x => x.lista))
        d[t.lista!] = (crudos[t.nombre] ?? []).map(f => objeto(f, t.columnas));
    for (const t of TABLAS.filter(x => x.dependencia)) {
        const dep = t.dependencia!;
        const principal = TABLAS.find(x => x.nombre === dep.tabla)!;
        const padres = new Map<unknown, any>((d[principal.lista!] as any[]).map(p => [p[dep.propiedad], p]));
        if (dep.siempre) for (const p of padres.values()) p[dep.hijos] = [];
        for (const f of crudos[t.nombre] ?? []) {
            const padre = padres.get(f[dep.columna]);
            if (dep.unoAUno) padre[dep.hijos] = objeto(f, t.columnas);
            else (padre[dep.hijos] ??= []).push(objeto(f, t.columnas));
        }
    }
    return d as Datos;
}

const insertar = (t: Tabla, fila: Fila): Operacion => {
    const nombres = nombresColumnas(t);
    return { tabla: t.nombre, sql: `INSERT INTO ${t.nombre}(${nombres.join(',')}) VALUES (${nombres.map(() => '?').join(',')})`, params: fila };
};
const eliminar = (t: Tabla, clave: unknown[]): Operacion => {
    const nombres = nombresColumnas(t), indices = indicesClave(t);
    return { tabla: t.nombre, sql: `DELETE FROM ${t.nombre} WHERE ${indices.map(i => `${nombres[i]}=?`).join(' AND ')}`, params: clave };
};
const actualizar = (t: Tabla, fila: Fila): Operacion => {
    const nombres = nombresColumnas(t), indices = indicesClave(t);
    const variables = nombres.map((_, i) => i).filter(i => !indices.includes(i));
    return { tabla: t.nombre,
        sql: `UPDATE ${t.nombre} SET ${variables.map(i => `${nombres[i]}=?`).join(',')} WHERE ${indices.map(i => `${nombres[i]}=?`).join(' AND ')}`,
        params: [...variables.map(i => fila[i]), ...indices.map(i => fila[i])] };
};

/**
 * Plan mínimo para llevar la base del estado `previo` al de `d`. Primero se eliminan filas (hijas antes que padres)
 * y luego se insertan y actualizan (padres antes que hijas), de modo que las claves foráneas se cumplen en todo momento.
 */
export function planificar(d: Datos, previo: Estado): { operaciones: Operacion[]; estado: Estado; resumen: ResumenGuardado } {
    const nuevas = filasDe(d);
    const operaciones: Operacion[] = [];
    const resumen: ResumenGuardado = { insertadas: 0, actualizadas: 0, eliminadas: 0 };
    for (const t of [...TABLAS].reverse()) {
        const actuales = nuevas.get(t.nombre)!;
        for (const [clave, fila] of previo.get(t.nombre) ?? [])
            if (!actuales.has(clave)) {
                operaciones.push(eliminar(t, fila.clave));
                resumen.eliminadas++;
            }
    }
    const estado: Estado = new Map();
    for (const t of TABLAS) {
        const anteriores = previo.get(t.nombre);
        const indices = indicesClave(t);
        const filas = new Map<string, { clave: unknown[]; firma: string }>();
        for (const [clave, fila] of nuevas.get(t.nombre)!) {
            const firma = firmaDe(fila);
            const anterior = anteriores?.get(clave);
            if (!anterior) {
                operaciones.push(insertar(t, fila));
                resumen.insertadas++;
            }
            else if (anterior.firma !== firma) {
                if (nombresColumnas(t).some((_, i) => !indices.includes(i))) operaciones.push(actualizar(t, fila));
                resumen.actualizadas++;
            }
            filas.set(clave, { clave: indices.map(i => fila[i]), firma });
        }
        estado.set(t.nombre, filas);
    }
    return { operaciones, estado, resumen };
}
