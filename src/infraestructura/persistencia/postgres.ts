/**
 * Adaptador PostgreSQL (Neon en producción, PGlite en pruebas).
 * - guardar: transacción con bloqueo de la fila de versión; compara con el estado vigente de la base
 *   y escribe solo las filas que cambiaron (misma regla que SQLite, en esquema.ts).
 * - leer: transacción de solo lectura con instantánea coherente de todas las tablas.
 * - Las operaciones de sesiones son sentencias individuales.
 * La interfaz es asíncrona. El puerto síncrono de SQLite se reemplaza en la Fase 3.
 */
import type { Datos } from '../../shared/dominio/datos';
import { TABLAS, sentenciasDeEsquema, sqlLectura, estadoDesde, armarDatos, planificar, type Crudos, type ResumenGuardado } from './esquema';

export interface ClienteSql { query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; release(): void }
export interface PoolSql { connect(): Promise<ClienteSql>; query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; end(): Promise<void> }

export interface SesionGuardada { cuentaId: number; vence: number }
export interface AlmacenSesionesAsync {
    obtener(tokenHash: string): Promise<SesionGuardada | undefined>;
    guardar(tokenHash: string, sesion: SesionGuardada): Promise<void>;
    borrar(tokenHash: string): Promise<void>;
    borrarDeCuenta(cuentaId: number, conservar?: string): Promise<void>;
    limpiarVencidas(ahora: number): Promise<void>;
}
export interface BaseDatosPostgres {
    leer(): Promise<Datos>;
    guardar(datos: Datos): Promise<ResumenGuardado>;
    sesiones: AlmacenSesionesAsync;
    cerrar(): Promise<void>;
}

/** Traduce los marcadores `?` del plan al formato `$1, $2…` de PostgreSQL. */
const marcadores = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
const metadato = async (c: ClienteSql | PoolSql, clave: string) =>
    (await c.query('SELECT valor FROM metadatos WHERE clave=$1', [clave])).rows[0]?.valor as string | undefined;
const escribirMetadato = (c: ClienteSql, clave: string, valor: string) =>
    c.query('INSERT INTO metadatos(clave,valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor', [clave, valor]);
async function crudosDe(c: ClienteSql): Promise<Crudos> {
    const crudos: Crudos = {};
    for (const t of TABLAS) crudos[t.nombre] = (await c.query(sqlLectura(t))).rows;
    return crudos;
}

/** Crea el esquema si falta y, la primera vez, siembra los datos iniciales. Un bloqueo de asesor evita carreras en arranques simultáneos. */
export async function abrirBaseDatos(pool: PoolSql, semilla: () => Promise<Datos>): Promise<BaseDatosPostgres> {
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
        }
        await init.query('COMMIT');
    } catch (e) { await init.query('ROLLBACK'); throw e; } finally { init.release(); }

    return {
        leer: async () => {
            const c = await pool.connect();
            try {
                await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
                const d = armarDatos(await crudosDe(c));
                d.finanzasVersion = Number((await metadato(c, 'finanzasVersion')) ?? 1);
                await c.query('COMMIT');
                return d;
            } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
        },
        guardar: async datos => {
            const c = await pool.connect();
            try {
                await c.query('BEGIN');
                await c.query("SELECT valor FROM metadatos WHERE clave='version' FOR UPDATE");
                const { operaciones, resumen } = planificar(datos, estadoDesde(await crudosDe(c)));
                for (const op of operaciones) await c.query(marcadores(op.sql), op.params);
                if (operaciones.length) await c.query("UPDATE metadatos SET valor=(CAST(valor AS INTEGER)+1)::text WHERE clave='version'");
                await escribirMetadato(c, 'finanzasVersion', String(datos.finanzasVersion ?? 1));
                await c.query('COMMIT');
                return resumen;
            } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
        },
        sesiones: {
            obtener: async r => {
                const f = (await pool.query('SELECT cuenta_id, vence FROM sesiones WHERE token_hash=$1', [r])).rows[0];
                return f && { cuentaId: Number(f.cuenta_id), vence: Number(f.vence) };
            },
            guardar: async (r, s) => void await pool.query(
                'INSERT INTO sesiones(token_hash,cuenta_id,vence) VALUES ($1,$2,$3) ON CONFLICT (token_hash) DO UPDATE SET cuenta_id=EXCLUDED.cuenta_id, vence=EXCLUDED.vence',
                [r, s.cuentaId, s.vence]),
            borrar: async r => void await pool.query('DELETE FROM sesiones WHERE token_hash=$1', [r]),
            borrarDeCuenta: async (cuentaId, conservar) => void await pool.query(
                'DELETE FROM sesiones WHERE cuenta_id=$1 AND token_hash IS DISTINCT FROM $2', [cuentaId, conservar ?? null]),
            limpiarVencidas: async ahora => void await pool.query('DELETE FROM sesiones WHERE vence<$1', [ahora]),
        },
        cerrar: () => pool.end(),
    };
}

/** Pool real para Neon. Se importa aquí para que las pruebas no dependan de pg. */
export async function poolPostgres(conexion: string): Promise<PoolSql> {
    const { Pool } = await import('pg');
    return new Pool({ connectionString: conexion, max: 3 }) as unknown as PoolSql;
}
