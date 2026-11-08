import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { abrirBaseDatos, type PoolSql } from './postgres';
import { semillaLimpia } from '../inicializacion/semillaLimpia';

/** Adapta PGlite a la interfaz de pool; PGlite tiene una sola conexión, así que el cliente es la misma instancia. */
function pglitePool(db: PGlite): PoolSql {
    const cliente = { query: (s: string, p?: unknown[]) => db.query(s, p), release: () => {} };
    return { connect: async () => cliente, query: (s: string, p?: unknown[]) => db.query(s, p), end: async () => { await db.close(); } } as unknown as PoolSql;
}
const CLAVE = 'clave-de-prueba-2026';
const abrirPrueba = () => abrirBaseDatos(pglitePool(new PGlite()), () => semillaLimpia(CLAVE));
const tienda = { id: 1, ruc: '20100000001', razon: 'Taller S.A.C.', nombre: 'Taller', giro: 'Repuestos', direccion: 'Av. 1', telefono: '999', correo: 't@t.pe', activa: true };

describe('persistencia PostgreSQL (PGlite)', () => {
    it('siembra solo el Superadministrador', async () => {
        const base = await abrirPrueba();
        const d = await base.leer();
        expect(d.cuentas).toHaveLength(1);
        expect(d.cuentas[0]).toMatchObject({ correo: 'sistema@credilocal.pe', rol: 'Superadministrador', id: 0 });
        expect(d.tiendas).toEqual([]);
        await base.cerrar();
    });

    it('guardar y leer conserva la tienda; una segunda escritura igual no cambia filas', async () => {
        const base = await abrirPrueba();
        const d = await base.leer();
        expect(await base.guardar({ ...d, tiendas: [tienda] })).toEqual({ insertadas: 1, actualizadas: 0, eliminadas: 0 });
        expect((await base.leer()).tiendas).toEqual([tienda]);
        expect(await base.guardar({ ...(await base.leer()), tiendas: [tienda] })).toEqual({ insertadas: 0, actualizadas: 0, eliminadas: 0 });
        await base.cerrar();
    });

    it('rechaza una fila que viola clave foránea y no deja escrituras parciales', async () => {
        const base = await abrirPrueba();
        const d = await base.leer();
        const cliente = { id: 1, tiendaId: 99, tipoDoc: 'DNI', doc: '1', nombre: 'X', direccion: '', telefono: '', correo: '', activo: true,
            limite: '0', deuda: '0', saldoComprometido: '0', moneda: 'PEN', plazo: 12, diaCorte: 1, diaPago: 1, horaCorte: '23:59',
            tipoC: 'Nominal', valC: '0', capC: 'Mensual', tipoM: 'Nominal', valM: '0', capM: 'Mensual' };
        await expect(base.guardar({ ...d, clientes: [cliente] } as any)).rejects.toThrow();
        expect((await base.leer()).clientes).toEqual([]);
        await base.cerrar();
    });

    it('reabrir no vuelve a sembrar y conserva los datos', async () => {
        const db = new PGlite();
        const b1 = await abrirBaseDatos(pglitePool(db), () => semillaLimpia(CLAVE));
        await b1.guardar({ ...(await b1.leer()), tiendas: [tienda] });
        const b2 = await abrirBaseDatos(pglitePool(db), async () => { throw new Error('no debía sembrar'); });
        expect((await b2.leer()).tiendas).toHaveLength(1);
        await b2.cerrar();
    });

    it('sin CREDILOCAL_CLAVE_INICIAL la siembra falla', async () => {
        await expect(semillaLimpia(undefined)).rejects.toThrow('CREDILOCAL_CLAVE_INICIAL');
    });

    it('sesiones: guardar, borrar de cuenta conservando una, limpiar vencidas', async () => {
        const base = await abrirPrueba();
        const vence = Date.now() + 60_000;
        await base.sesiones.guardar('h1', { cuentaId: 0, vence });
        await base.sesiones.guardar('h2', { cuentaId: 0, vence });
        expect(await base.sesiones.obtener('h1')).toEqual({ cuentaId: 0, vence });
        await base.sesiones.borrarDeCuenta(0, 'h1');
        expect(await base.sesiones.obtener('h2')).toBeUndefined();
        expect(await base.sesiones.obtener('h1')).toBeDefined();
        await base.sesiones.limpiarVencidas(vence + 1);
        expect(await base.sesiones.obtener('h1')).toBeUndefined();
        await base.cerrar();
    });
});
