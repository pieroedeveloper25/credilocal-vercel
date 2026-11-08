import { resolve } from 'node:path';
import type { ClienteSql, PoolSql } from './postgres';

/**
 * Pool sobre PGlite (PostgreSQL en WebAssembly) para desarrollo local y pruebas. Usa una sola conexión:
 * las transacciones se serializan con un turno, como lo haría una cola de conexiones.
 * ':memory:' crea una base temporal; cualquier otra ruta es una carpeta de datos persistente.
 */
export async function poolPglite(ruta: string): Promise<PoolSql> {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite(ruta === ':memory:' ? undefined : resolve(ruta));
    await db.waitReady;
    let turno: Promise<void> = Promise.resolve();
    const exclusivo = async (): Promise<() => void> => {
        let liberar!: () => void;
        const anterior = turno;
        turno = new Promise<void>(r => { liberar = r; });
        await anterior;
        return liberar;
    };
    let cerrada = false;
    return {
        connect: async (): Promise<ClienteSql> => {
            const liberar = await exclusivo();
            return { query: (sql, params) => db.query(sql, params as unknown[]), release: () => liberar() };
        },
        end: async () => { if (!cerrada) { cerrada = true; await db.close(); } },
    };
}
