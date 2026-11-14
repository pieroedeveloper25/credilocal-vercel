import type { TopeTasa } from '../dominio/modelos';
import type { RepositorioTopes } from '../dominio/repositorios';
import { validarTope } from '../dominio/topes';
import { exigir } from '../../../shared/dominio/validaciones';

/** Actualiza el tope de una moneda. Los topes existen desde el inicio, una fila por moneda: aquí solo se cambian. */
export function guardarTopes(topes: RepositorioTopes, registro: TopeTasa) {
    const previo = topes.todos().find(t => t.moneda === registro.moneda);
    exigir(previo, 'No hay tope registrado para esa moneda.');
    const nuevo: TopeTasa = { ...registro, id: previo.id };
    validarTope(nuevo);
    topes.guardar(nuevo);
}
