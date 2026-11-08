import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBaseDatos } from './postgres';
import { poolPglite } from './poolPglite';
import { semillaLimpia } from '../inicializacion/semillaLimpia';

const CLAVE = 'clave-de-prueba-2026';
const carpeta = () => mkdtempSync(join(tmpdir(), 'credilocal-pg-'));
const abrirPrueba = async (ruta = carpeta()) => abrirBaseDatos(await poolPglite(ruta), () => semillaLimpia(CLAVE));
const tienda = { id: 1, ruc: '20100000001', razon: 'Taller S.A.C.', nombre: 'Taller', giro: 'Repuestos', direccion: 'Av. 1', telefono: '999', correo: 't@t.pe', activa: true };

describe('persistencia PostgreSQL (PGlite)', () => {
    it('siembra solo el Superadministrador', async () => {
        const base = await abrirPrueba();
        const cuentas = await base.ejecutar(({ datos }) => datos.cuentas);
        expect(cuentas).toHaveLength(1);
        expect(cuentas[0]).toMatchObject({ correo: 'sistema@credilocal.pe', rol: 'Superadministrador', id: 0 });
        expect(await base.ejecutar(({ datos }) => datos.tiendas)).toEqual([]);
        await base.cerrar();
    });

    it('lo confirmado se lee en la siguiente solicitud', async () => {
        const base = await abrirPrueba();
        await base.ejecutar(({ datos }) => { datos.tiendas.push(tienda); });
        expect(await base.ejecutar(({ datos }) => datos.tiendas)).toEqual([tienda]);
        await base.cerrar();
    });

    it('un error dentro de la solicitud revierte todo lo escrito', async () => {
        const base = await abrirPrueba();
        await expect(base.ejecutar(({ datos }) => {
            datos.tiendas.push(tienda);
            throw new Error('fallo a propósito');
        })).rejects.toThrow('fallo a propósito');
        expect(await base.ejecutar(({ datos }) => datos.tiendas)).toEqual([]);
        await base.cerrar();
    });

    it('rechaza una fila que viola clave foránea y no deja escrituras parciales', async () => {
        const base = await abrirPrueba();
        const cliente = { id: 1, tiendaId: 99, tipoDoc: 'DNI', doc: '1', nombre: 'X', direccion: '', telefono: '', correo: '', activo: true,
            limite: '0', deuda: '0', saldoComprometido: '0', moneda: 'PEN', plazo: 12, diaCorte: 1, diaPago: 1, horaCorte: '23:59',
            tipoC: 'Nominal', valC: '0', capC: 'Mensual', tipoM: 'Nominal', valM: '0', capM: 'Mensual' };
        await expect(base.ejecutar(({ datos }) => { datos.clientes.push(cliente as any); })).rejects.toThrow();
        expect(await base.ejecutar(({ datos }) => datos.clientes)).toEqual([]);
        await base.cerrar();
    });

    it('reabrir no vuelve a sembrar y conserva los datos', async () => {
        const ruta = carpeta();
        const b1 = await abrirPrueba(ruta);
        await b1.ejecutar(({ datos }) => { datos.tiendas.push(tienda); });
        await b1.cerrar();
        const b2 = await abrirBaseDatos(await poolPglite(ruta), async () => { throw new Error('no debía sembrar'); });
        expect(await b2.ejecutar(({ datos }) => datos.tiendas)).toHaveLength(1);
        await b2.cerrar();
    });

    it('sin CREDILOCAL_CLAVE_INICIAL la siembra falla', async () => {
        await expect(semillaLimpia(undefined)).rejects.toThrow('CREDILOCAL_CLAVE_INICIAL');
    });

    it('sesiones: guardar, borrar de cuenta conservando una, limpiar vencidas', async () => {
        const base = await abrirPrueba();
        const vence = Date.now() + 60_000;
        await base.ejecutar(({ sesiones }) => { sesiones.guardar('h1', { cuentaId: 0, vence }); sesiones.guardar('h2', { cuentaId: 0, vence }); });
        expect(await base.ejecutar(({ sesiones }) => sesiones.obtener('h1'))).toEqual({ cuentaId: 0, vence });
        await base.ejecutar(({ sesiones }) => sesiones.borrarDeCuenta(0, 'h1'));
        expect(await base.ejecutar(({ sesiones }) => sesiones.obtener('h2'))).toBeUndefined();
        expect(await base.ejecutar(({ sesiones }) => sesiones.obtener('h1'))).toBeDefined();
        await base.ejecutar(({ sesiones }) => sesiones.limpiarVencidas(vence + 1));
        expect(await base.ejecutar(({ sesiones }) => sesiones.obtener('h1'))).toBeUndefined();
        await base.cerrar();
    });
});
