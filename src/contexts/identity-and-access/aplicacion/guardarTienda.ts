import type { Tienda } from '../dominio/modelos';
import { exigirCorreoDisponible } from '../dominio/cuentas';
import type { RepositorioCuentas, RepositorioTiendas } from '../dominio/repositorios';
import { validarTienda } from '../dominio/validaciones';
import type { CreadorDeCuentas } from '../../../shared/aplicacion/puertos';
import { exigir, normalizarCorreo } from '../../../shared/dominio/validaciones';
export async function guardarTienda(repos: { tiendas: RepositorioTiendas; cuentas: RepositorioCuentas }, registro: Tienda, clave: string | undefined, creador: CreadorDeCuentas) {
    const { tiendas, cuentas } = repos;
    // Los identificadores los asigna el servidor (la 0 es del administrador del sistema): un id negativo es una tienda nueva y cualquier otro debe existir.
    const nuevaTienda = registro.id < 0;
    const id = nuevaTienda ? tiendas.siguienteId() : registro.id;
    const previa = tiendas.porId(id);
    exigir(nuevaTienda || previa, 'La tienda no existe.');
    const nueva = { ...registro, id, correo: normalizarCorreo(registro.correo) };
    validarTienda(nueva, { tiendas: tiendas.todas() });
    exigirCorreoDisponible(cuentas.todas(), nueva.correo, 'Comercio', id);
    if (!previa) {
        exigir(clave, 'Ingrese la contraseña inicial.');
        cuentas.agregar(await creador.crearCuenta(nueva.correo, clave, 'Comercio', cuentas.siguienteId(), id));
        tiendas.guardar(nueva);
        return;
    }
    tiendas.guardar(nueva);
    for (const cuenta of cuentas.todas())
        if (cuenta.rol === 'Comercio' && cuenta.tiendaId === id)
            cuentas.reemplazar({ ...cuenta, correo: nueva.correo });
}
