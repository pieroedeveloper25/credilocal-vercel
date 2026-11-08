import { iniciales } from '../../src/infraestructura/demostracion/iniciales';
import { normalizarFinanzas } from '../../src/infraestructura/migracion/normalizarFinanzas';
import type { Datos } from '../../src/shared/dominio/datos';

/** Datos de demostración solo para pruebas automatizadas. No forma parte de la versión desplegada. */
export async function semillaDemo(): Promise<Datos> {
    const d = await iniciales();
    normalizarFinanzas(d);
    return d;
}
