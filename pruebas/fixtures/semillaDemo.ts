import { iniciales } from './demostracion/iniciales';
import { normalizarFinanzas } from './migracion/normalizarFinanzas';
import type { Datos } from '../../src/shared/dominio/datos';

/** Datos de demostración solo para pruebas automatizadas. No forma parte de la versión desplegada. */
export async function semillaDemo(): Promise<Datos> {
    const d = await iniciales();
    normalizarFinanzas(d);
    return d;
}
