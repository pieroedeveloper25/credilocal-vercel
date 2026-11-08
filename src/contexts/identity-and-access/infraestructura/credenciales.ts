import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Cuenta, Rol } from '../dominio/modelos';
import { exigir, normalizarCorreo } from '../../../shared/dominio/validaciones';
const pbkdf2 = promisify(pbkdf2Callback);
/**
 * Formato actual del campo hash: `pbkdf2-sha256$<iteraciones>$<hex>`.
 * Las cuentas anteriores guardaban solo el hexadecimal (PBKDF2-SHA256 con 100 000 iteraciones); se reconocen
 * y se renuevan al primer ingreso correcto.
 */
const ALGORITMO = 'pbkdf2-sha256';
export const ITERACIONES = 600_000;
const ITERACIONES_ANTERIORES = 100_000;
const prefijoActual = `${ALGORITMO}$${ITERACIONES}$`;
const derivar = async (clave: string, sal: string, iteraciones: number) => await pbkdf2(clave, sal, iteraciones, 32, 'sha256');
const iguales = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
export function exigirClaveValida(clave: string) {
    exigir(typeof clave === 'string' && clave.length >= 8 && clave.length <= 64 && /[a-zA-Z]/.test(clave) && /\d/.test(clave), 'La contraseña requiere entre 8 y 64 caracteres, letras y números.');
}
const nuevaSal = () => randomBytes(16).toString('hex');
async function hashNuevo(clave: string, sal: string) {
    return `${prefijoActual}${(await derivar(clave, sal, ITERACIONES)).toString('hex')}`;
}
export async function crearCuenta(correo: string, clave: string, rol: Rol, id: number, tiendaId?: number, clienteId?: number): Promise<Cuenta> {
    exigir(correo.trim().length >= 5 && correo.trim().length <= 100, 'El correo debe tener entre 5 y 100 caracteres.');
    exigir(clave.length >= 8 && clave.length <= 64 && /[a-zA-Z]/.test(clave) && /\d/.test(clave), 'La contraseña inicial requiere entre 8 y 64 caracteres, letras y números.');
    const sal = nuevaSal();
    return { id, rol, correo: normalizarCorreo(correo), sal, hash: await hashNuevo(clave, sal), tiendaId, clienteId };
}
/** Compara en tiempo constante. */
export async function comprobarClave(c: Cuenta, clave: string): Promise<boolean> {
    const actual = c.hash.startsWith(prefijoActual);
    const esperado = Buffer.from(actual ? c.hash.slice(prefijoActual.length) : c.hash, 'hex');
    return iguales(await derivar(clave, c.sal, actual ? ITERACIONES : ITERACIONES_ANTERIORES), esperado);
}
/** true si el hash usa un formato o un costo anteriores. */
export const hashObsoleto = (c: Cuenta) => !c.hash.startsWith(prefijoActual);
/** Devuelve la cuenta con sal y hash nuevos para la contraseña indicada. */
export async function conClave(c: Cuenta, clave: string): Promise<Cuenta> {
    const sal = nuevaSal();
    return { ...c, sal, hash: await hashNuevo(clave, sal) };
}
const SAL_FICTICIA = nuevaSal();
/** Cuesta lo mismo que una comprobación real; evita descubrir por el tiempo de respuesta qué correos existen. */
export async function comprobacionFicticia(clave: string) {
    await derivar(clave, SAL_FICTICIA, ITERACIONES);
}
