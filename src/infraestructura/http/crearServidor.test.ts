import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { crearServidor } from './crearServidor';
import { crearUnidadDeTrabajo } from '../../shared/aplicacion/unidadDeTrabajo';

describe('servidor HTTP: errores inesperados', () => {
  afterEach(() => vi.restoreAllMocks());

  it('responde 500 genérico y no revela el mensaje interno', async () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repositorio = { leer: () => { throw new TypeError("fallo interno con ruta C:\\secreto\\base.sqlite"); }, guardar: () => undefined, cerrar: () => undefined };
    const servidor = crearServidor(crearUnidadDeTrabajo(repositorio), { crearCuenta: async () => { throw new Error('no se usa'); } }, () => '2026-10-08T12:00');
    await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
    try {
      const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/estado`;
      const r = await fetch(url);
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
