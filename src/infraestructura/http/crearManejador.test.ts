import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { crearManejador } from './crearManejador';

describe('manejador HTTP: errores inesperados', () => {
  afterEach(() => vi.restoreAllMocks());

  it('responde 500 genérico y no revela el mensaje interno', async () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unidad = { ejecutar: async () => { throw new TypeError('fallo interno con ruta C:\\secreto\\base.sql'); } };
    const manejar = crearManejador({ unidad, cuentas: { crearCuenta: async () => { throw new Error('no se usa'); } }, ahora: () => '2026-10-08T12:00' });
    const servidor = createServer(manejar);
    await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
    try {
      const r = await fetch(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/estado`);
      const texto = await r.text();
      expect(r.status).toBe(500);
      expect(JSON.parse(texto)).toEqual({ error: 'Error interno del servidor.' });
      expect(texto).not.toMatch(/secreto|TypeError/);
      expect(registro).toHaveBeenCalled();
    }
    finally {
      await new Promise<void>(r => servidor.close(() => r()));
    }
  });
});

describe('manejador HTTP: cron de cortes', () => {
  const abrir = async () => {
    const datos = { auditoria: [] as { fecha: string; actor: string; accion: string; detalle?: string }[] };
    const unidad = { ejecutar: async (operacion: (contexto: never) => unknown) => operacion({ datos } as never) };
    const manejar = crearManejador({ unidad: unidad as never, cuentas: { crearCuenta: async () => { throw new Error('no se usa'); } }, ahora: () => '2026-11-09T00:00', claveCron: 'secreto-de-prueba' });
    const servidor = createServer(manejar);
    await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
    return { datos, servidor, url: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/cron/cortes` };
  };

  it('rechaza con 401 sin el encabezado correcto y no deja constancia', async () => {
    const { datos, servidor, url } = await abrir();
    try {
      expect((await fetch(url)).status).toBe(401);
      expect((await fetch(url, { headers: { Authorization: 'Bearer otro' } })).status).toBe(401);
      expect(datos.auditoria).toHaveLength(0);
    }
    finally {
      await new Promise<void>(r => servidor.close(() => r()));
    }
  });

  it('con el encabezado correcto responde 200 y deja constancia de la ejecución en la auditoría', async () => {
    const { datos, servidor, url } = await abrir();
    try {
      const r = await fetch(url, { headers: { Authorization: 'Bearer secreto-de-prueba' } });
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ estado: 'ok' });
      expect(datos.auditoria).toHaveLength(1);
      expect(datos.auditoria[0]).toMatchObject({ actor: 'Sistema', accion: 'CRON CORTES' });
    }
    finally {
      await new Promise<void>(r => servidor.close(() => r()));
    }
  });
});
