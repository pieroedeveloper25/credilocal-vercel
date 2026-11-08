/**
 * Adaptador PostgreSQL (Neon en producción; PGlite en desarrollo y pruebas).
 * Cada solicitud es una transacción: bloquea la fila de versión, carga la fotografía de datos y las sesiones
 * vigentes, ejecuta la lógica síncrona de la aplicación sobre esa fotografía y confirma solo las filas que cambiaron.
 * Si la lógica lanza un error, la transacción se revierte completa.
 */
import type { Datos } from '../../shared/dominio/datos';
import type { AlmacenIntentos, AlmacenSesiones, UnidadDeSolicitud } from '../../shared/aplicacion/puertos';
import { TABLAS, sentenciasDeEsquema, sqlLectura, estadoDesde, armarDatos, planificar, type Crudos, type Operacion } from './esquema';

export interface ClienteSql { query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; release(): void }
export interface PoolSql { connect(): Promise<ClienteSql>; end(): Promise<void> }

const marcadores = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
const metadato = async (c: ClienteSql, clave: string) =>
    (await c.query('SELECT valor FROM metadatos WHERE clave=$1', [clave])).rows[0]?.valor as string | undefined;
const escribirMetadato = (c: ClienteSql, clave: string, valor: string) =>
    c.query('INSERT INTO metadatos(clave,valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor', [clave, valor]);
const subirVersion = "UPDATE metadatos SET valor=(CAST(valor AS INTEGER)+1)::text WHERE clave='version'";

async function crudosDe(c: ClienteSql): Promise<Crudos> {
    const crudos: Crudos = {};
    for (const t of TABLAS) crudos[t.nombre] = (await c.query(sqlLectura(t))).rows;
    return crudos;
}

/**
 * Sesiones de la solicitud: un espejo en memoria para el código síncrono. Cada cambio se anota y se
 * aplica a la base al confirmar, dentro de la misma transacción que los datos.
 */
function almacenDeSesiones(filas: { token_hash: string; cuenta_id: number; vence: number }[]) {
    const mapa = new Map(filas.map(f => [f.token_hash, { cuentaId: Number(f.cuenta_id), vence: Number(f.vence) }] as const));
    const pendientes: Operacion[] = [];
    const almacen: AlmacenSesiones = {
        obtener: r => mapa.get(r),
        guardar: (r, s) => {
            mapa.set(r, s);
            pendientes.push({ tabla: 'sesiones', sql: 'INSERT INTO sesiones(token_hash,cuenta_id,vence) VALUES (?,?,?) ON CONFLICT (token_hash) DO UPDATE SET cuenta_id=EXCLUDED.cuenta_id, vence=EXCLUDED.vence', params: [r, s.cuentaId, s.vence] });
        },
        borrar: r => {
            mapa.delete(r);
            pendientes.push({ tabla: 'sesiones', sql: 'DELETE FROM sesiones WHERE token_hash=?', params: [r] });
        },
        borrarDeCuenta: (cuentaId, conservar) => {
            for (const [r, s] of mapa) if (s.cuentaId === cuentaId && r !== conservar) mapa.delete(r);
            pendientes.push({ tabla: 'sesiones', sql: 'DELETE FROM sesiones WHERE cuenta_id=? AND token_hash IS DISTINCT FROM ?', params: [cuentaId, conservar ?? null] });
        },
        limpiarVencidas: ahora => {
            for (const [r, s] of mapa) if (s.vence < ahora) mapa.delete(r);
            pendientes.push({ tabla: 'sesiones', sql: 'DELETE FROM sesiones WHERE vence<?', params: [ahora] });
        },
    };
    return { almacen, pendientes };
}

/** Intentos fallidos de acceso: mismo patrón que las sesiones, con espejo en memoria y cambios confirmados en la transacción. */
function almacenDeIntentos(filas: { llave: string; n: number; hasta: number }[]) {
    const mapa = new Map(filas.map(f => [f.llave, { n: Number(f.n), hasta: Number(f.hasta) }] as const));
    const pendientes: Operacion[] = [];
    const almacen: AlmacenIntentos = {
        obtener: l => mapa.get(l),
        guardar: (l, i) => {
            mapa.set(l, i);
            pendientes.push({ tabla: 'intentos', sql: 'INSERT INTO intentos(llave,n,hasta) VALUES (?,?,?) ON CONFLICT (llave) DO UPDATE SET n=EXCLUDED.n, hasta=EXCLUDED.hasta', params: [l, i.n, i.hasta] });
        },
        borrar: l => {
            mapa.delete(l);
            pendientes.push({ tabla: 'intentos', sql: 'DELETE FROM intentos WHERE llave=?', params: [l] });
        },
        limpiarVencidos: ahora => {
            for (const [l, i] of mapa) if (i.hasta < ahora) mapa.delete(l);
            pendientes.push({ tabla: 'intentos', sql: 'DELETE FROM intentos WHERE hasta<?', params: [ahora] });
        },
    };
    return { almacen, pendientes };
}

/** Crea el esquema si falta y, la primera vez, siembra los datos iniciales. El bloqueo de asesor evita carreras en arranques simultáneos. */
export async function abrirBaseDatos(pool: PoolSql, semilla: () => Promise<Datos>): Promise<UnidadDeSolicitud & { cerrar(): Promise<void> }> {
    const init = await pool.connect();
    try {
        await init.query('BEGIN');
        await init.query('SELECT pg_advisory_xact_lock(7)');
        for (const sql of sentenciasDeEsquema()) await init.query(sql);
        await init.query("INSERT INTO metadatos(clave,valor) VALUES ('version','0') ON CONFLICT (clave) DO NOTHING");
        if (!(await metadato(init, 'inicializada'))) {
            const datos = await semilla();
            for (const op of planificar(datos, estadoDesde({})).operaciones) await init.query(marcadores(op.sql), op.params);
            await escribirMetadato(init, 'inicializada', '1');
            await escribirMetadato(init, 'finanzasVersion', String(datos.finanzasVersion ?? 1));
            await init.query(subirVersion);
        }
        await init.query('COMMIT');
    } catch (e) { await init.query('ROLLBACK').catch(() => undefined); throw e; } finally { init.release(); }

    return {
        ejecutar: async operacion => {
            const c = await pool.connect();
            try {
                await c.query('BEGIN');
                await c.query("SELECT valor FROM metadatos WHERE clave='version' FOR UPDATE");
                const crudos = await crudosDe(c);
                const previo = estadoDesde(crudos);
                const datos = armarDatos(crudos);
                datos.finanzasVersion = Number((await metadato(c, 'finanzasVersion')) ?? 1);
                const filas = (await c.query('SELECT token_hash, cuenta_id, vence FROM sesiones WHERE vence >= $1', [Date.now()])).rows;
                const { almacen, pendientes } = almacenDeSesiones(filas);
                const filasIntentos = (await c.query('SELECT llave, n, hasta FROM intentos WHERE hasta >= $1', [Date.now()])).rows;
                const { almacen: intentos, pendientes: pendientesIntentos } = almacenDeIntentos(filasIntentos);
                const resultado = await operacion({ datos, sesiones: almacen, intentos });
                const todas = [...planificar(datos, previo).operaciones, ...pendientes, ...pendientesIntentos];
                for (const op of todas) await c.query(marcadores(op.sql), op.params);
                if (todas.length) await c.query(subirVersion);
                await escribirMetadato(c, 'finanzasVersion', String(datos.finanzasVersion ?? 1));
                await c.query('COMMIT');
                return resultado;
            } catch (e) { await c.query('ROLLBACK').catch(() => undefined); throw e; } finally { c.release(); }
        },
        cerrar: () => pool.end(),
    };
}

/** Pool real para Neon. Se importa aquí para que las pruebas y el desarrollo local no carguen pg. */
export async function poolPostgres(conexion: string): Promise<PoolSql> {
    const { Pool } = await import('pg');
    return new Pool({ connectionString: conexion, max: 3 }) as unknown as PoolSql;
}
