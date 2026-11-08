import type { Pago } from '../dominio/modelos';
import { cobrar, type PedidoDeCobro } from '../dominio/cobranza';
import { capitalAmortizado } from '../dominio/eventos';
import { deudaLinea } from '../dominio/obligaciones';
import type { ClientesDeCobranza, RepositorioObligaciones, RepositorioPagos, VentasDeCobranza } from '../dominio/repositorios';
import type { Publicar } from '../../../shared/aplicacion/busDeEventos';
import { relojPeru } from '../../../shared/dominio/fechas';
export interface DependenciasCobranza { clientes: ClientesDeCobranza; obligaciones: RepositorioObligaciones; pagos: RepositorioPagos; ventas: VentasDeCobranza }
export function registrarCobranza(deps: DependenciasCobranza, tiendaId: number, pedido: PedidoDeCobro, publicar: Publicar): Pago {
    const { clientes, obligaciones, pagos, ventas } = deps;
    const cliente = clientes.buscar(tiendaId, pedido.clienteId);
    const { pago, canceladas } = cobrar({ cliente, obligaciones: obligaciones.todas(), tiendaId, pedido, ahora: relojPeru(), numero: pagos.siguienteNumero() });
    for (const o of canceladas)
        obligaciones.guardar(o);
    pagos.agregar(pago);
    publicar(capitalAmortizado(pedido.clienteId, tiendaId, deudaLinea({ obligaciones: obligaciones.todas(), ventas: ventas.cobrables() }, cliente!).toFixed(2)));
    return pago;
}
