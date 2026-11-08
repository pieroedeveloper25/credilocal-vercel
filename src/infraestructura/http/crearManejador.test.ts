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
