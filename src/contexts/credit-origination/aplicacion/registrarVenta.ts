import { ventaCreditoRegistrada } from '../dominio/eventos';
import type { Publicar } from '../../../shared/aplicacion/busDeEventos';
import type { Venta } from '../dominio/modelos';
import type { CatalogoDeVenta, Compradores, RepositorioVentas } from '../dominio/repositorios';
import { registrarVenta } from '../dominio/venta';
export interface DependenciasRegistrarVenta { ventas: RepositorioVentas; compradores: Compradores; catalogo: CatalogoDeVenta }
export function registrarCompra(deps: DependenciasRegistrarVenta, tiendaId: number, entrada: Omit<Venta, 'id'>, publicar: Publicar): Venta {
    const { venta, obligaciones } = registrarVenta({ id: deps.ventas.siguienteId(), tiendaId, entrada, comprador: deps.compradores.buscar(tiendaId, entrada.clienteId), catalogo: deps.catalogo });
    deps.ventas.agregar(venta);
    publicar(ventaCreditoRegistrada(venta, obligaciones));
    return venta;
}
