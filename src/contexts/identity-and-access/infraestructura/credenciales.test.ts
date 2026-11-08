import { describe, expect, it } from 'vitest';
import { pbkdf2Sync } from 'node:crypto';
import { comprobacionFicticia, comprobarClave, conClave, crearCuenta, hashObsoleto, ITERACIONES } from './credenciales';

describe('credenciales', () => {
  it('guarda el hash con algoritmo y costo, y solo acepta la contraseña correcta', async () => {
    const c = await crearCuenta('persona@demo.pe', 'Clave2026', 'Comercio', 1, 1);
    expect(c.hash).toMatch(new RegExp(`^pbkdf2-sha256\\$${ITERACIONES}\\$[0-9a-f]{64}$`));
    expect(ITERACIONES).toBeGreaterThanOrEqual(600_000);
    expect(hashObsoleto(c)).toBe(false);
    expect(await comprobarClave(c, 'Clave2026')).toBe(true);
    expect(await comprobarClave(c, 'Clave2027')).toBe(false);
    expect(JSON.stringify(c)).not.toContain('Clave2026');
  });

  it('reconoce los hashes anteriores (100 000 iteraciones, solo hexadecimal) y los marca para renovar', async () => {
    const sal = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const anterior = { id: 2, rol: 'Comercio' as const, correo: 'viejo@demo.pe', sal, hash: pbkdf2Sync('credi2026', sal, 100_000, 32, 'sha256').toString('hex') };
    expect(await comprobarClave(anterior, 'credi2026')).toBe(true);
    expect(await comprobarClave(anterior, 'otra-clave1')).toBe(false);
    expect(hashObsoleto(anterior)).toBe(true);
    const renovada = await conClave(anterior, 'credi2026');
    expect(hashObsoleto(renovada)).toBe(false);
    expect(renovada.sal).not.toBe(sal);
    expect(await comprobarClave(renovada, 'credi2026')).toBe(true);
  });

  it('rechaza un hash corrupto sin lanzar errores', async () => {
    const c = await crearCuenta('persona@demo.pe', 'Clave2026', 'Comercio', 1, 1);
    expect(await comprobarClave({ ...c, hash: 'pbkdf2-sha256$600000$zz' }, 'Clave2026')).toBe(false);
    expect(await comprobarClave({ ...c, hash: '' }, 'Clave2026')).toBe(false);
    await expect(comprobacionFicticia('lo-que-sea1')).resolves.toBeUndefined();
  });
});
