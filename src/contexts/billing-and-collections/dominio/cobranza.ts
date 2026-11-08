import type { ClienteDeCobranza, Obligacion, Pago } from './modelos';
import { liquidarObligaciones } from './obligaciones';
import { imputarPorPrelacion } from './prelacion';
import { D } from '../../../shared/dominio/decimal';
import { fechaValida } from '../../../shared/dominio/fechas';
import { decimalEntrada, exigir } from '../../../shared/dominio/validaciones';

export interface PedidoDeCobro {
    clienteId: number;
    periodo: string;
    fecha: string;
    hora?: string;
    abono: string;
}

/** Marca una obligación como cancelada por un pago; devuelve una versión nueva. */
export const marcarPagada = (o: Obligacion, constancia: string, fecha: string, hora: string): Obligacion =>
    ({ ...o, pagada: constancia, fechaPago: fecha, horaPago: hora });

/**
 * Cobro de la deuda exigible de un cliente en un periodo. Las reglas del cobro viven aquí: el pago es único y total,
 * no puede ser futuro ni anterior a las compras que cancela, y se reparte por la prelación del Art. 1257 C.C.
 * Devuelve el pago y las obligaciones ya canceladas.
 */
export function cobrar(args: { cliente: ClienteDeCobranza | undefined; obligaciones: Obligacion[]; tiendaId: number; pedido: PedidoDeCobro; ahora: string; numero: number }): { pago: Pago; canceladas: Obligacion[] } {
    const { cliente: c, obligaciones, tiendaId, pedido, ahora, numero } = args;
    exigir(c, 'Cliente ajeno a la tienda.');
    exigir(fechaValida(pedido.fecha) && pedido.fecha <= ahora.slice(0, 10), 'No se puede registrar un pago con fecha futura o inválida.');
    exigir(decimalEntrada(pedido.abono, 10, 2), 'Ingrese un abono válido con hasta dos decimales.');
    const hora = pedido.hora ?? (pedido.fecha === ahora.slice(0, 10) ? ahora.slice(11, 16) : '23:59');
    exigir(/^([01]\d|2[0-3]):[0-5]\d$/.test(hora) && `${pedido.fecha}T${hora}` <= ahora, 'Ingrese una hora real de pago válida y no futura.');
    const l = liquidarObligaciones({ obligaciones }, c, pedido.periodo, pedido.fecha);
    exigir(l.lineas.every(o => `${o.fechaCompra}T${o.hora}` <= `${pedido.fecha}T${hora}`), 'El pago no puede preceder a la compra.');
    exigir(l.total.gt(0), 'No existen obligaciones pendientes para este pago.');
    exigir(D(pedido.abono).eq(l.total), 'El abono debe coincidir con toda la deuda exigible. No se admiten pagos parciales ni excedentes.');
    exigir(l.lineas.every(o => o.moneda === c.moneda), 'Las obligaciones tienen otra moneda. Mantenga la moneda pactada.');
    const pr = imputarPorPrelacion(D(pedido.abono), l.mora, l.comp, l.capital);
    const constancia = `CP-${tiendaId}-${numero}-${pedido.clienteId}`;
    const pago: Pago = { ...pedido, hora, tiendaId, constancia, capital: pr.cap.toFixed(2), comp: pr.comp.toFixed(2), mora: pr.mora.toFixed(2), moneda: c.moneda, detalles: l.lineas.map(o => ({ obligacionId: o.id, capital: o.capital, comp: o.comp, mora: o.mora })) };
    const canceladas = obligaciones.filter(o => l.lineas.some(x => x.id === o.id)).map(o => marcarPagada(o, constancia, pedido.fecha, hora));
    return { pago, canceladas };
}
