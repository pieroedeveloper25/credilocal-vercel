import type { Cuenta, Rol } from './modelos';
import { exigir, normalizarCorreo } from '../../../shared/dominio/validaciones';

/** Un correo identifica una sola cuenta del sistema; la cuenta que se está editando no cuenta como duplicada. */
export function exigirCorreoDisponible(cuentas: Cuenta[], correo: string, rol: Rol, tiendaId?: number, clienteId?: number) {
    exigir(!cuentas.some(cuenta => cuenta.correo === normalizarCorreo(correo) &&
        !(cuenta.rol === rol && cuenta.tiendaId === tiendaId && cuenta.clienteId === clienteId)), 'Este correo ya pertenece a otra cuenta.');
}
