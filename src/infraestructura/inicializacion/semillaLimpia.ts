import { crearCuenta } from '../../contexts/identity-and-access/infraestructura/credenciales';
import type { Datos } from '../../shared/dominio/datos';

/**
 * Datos iniciales de la versión Vercel: solo el Superadministrador. La clave llega por entorno
 * (CREDILOCAL_CLAVE_INICIAL) y nunca se escribe en el código ni en la base.
 */
export async function semillaLimpia(claveInicial: string | undefined): Promise<Datos> {
    if (!claveInicial) throw new Error('Falta CREDILOCAL_CLAVE_INICIAL: se necesita para crear el Superadministrador inicial.');
    const cuenta = await crearCuenta('sistema@credilocal.pe', claveInicial, 'Superadministrador', 0);
    return { tiendas: [], cuentas: [cuenta], clientes: [], productos: [], ventas: [], pagos: [], auditoria: [] };
}
