import type { VentaCreditoRegistrada } from '../../credit-origination/dominio/eventos';
import type { CapitalAmortizado } from '../../billing-and-collections/dominio/eventos';
import { ClienteAgregado } from '../dominio/cliente';
import type { RepositorioClientes } from '../dominio/repositorios';

/** Una venta a crédito compromete su capital en la línea del cliente. */
export const alRegistrarseVentaCredito = (clientes: RepositorioClientes) => (evento: VentaCreditoRegistrada) => {
    const guardado = clientes.porId(evento.venta.clienteId);
    if (guardado && guardado.tiendaId === evento.venta.tiendaId)
        clientes.guardar(ClienteAgregado.reconstituir(guardado).comprometer(evento.venta.capital).datos);
};

/** El cobranza informa el capital pendiente; la línea disponible se libera con él. */
export const alAmortizarseCapital = (clientes: RepositorioClientes) => (evento: CapitalAmortizado) => {
    const guardado = clientes.porId(evento.clienteId);
    if (guardado && guardado.tiendaId === evento.tiendaId)
        clientes.guardar(ClienteAgregado.reconstituir(guardado).sincronizarSaldo(evento.saldoPendiente).datos);
};
