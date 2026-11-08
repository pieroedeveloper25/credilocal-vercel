import type { Cliente } from '../../contexts/customer-management/dominio/modelos';
import type { Venta } from '../../contexts/credit-origination/dominio/modelos';
import type { Obligacion, Pago } from '../../contexts/billing-and-collections/dominio/modelos';
import { deudaLinea } from '../../contexts/billing-and-collections/dominio/obligaciones';
import { D, r2 } from '../../shared/dominio/decimal';
import { agregarMeses, isoFecha, parseFecha } from '../../shared/dominio/fechas';

export type MonedaDashboard = 'PEN' | 'USD';
export interface DatosDashboard {
    clientes: Cliente[];
    ventas: Venta[];
    obligaciones: Obligacion[];
    pagos: Pago[];
}
export function mesesDesde(periodo: string, cantidad: number, desplazamiento = 0): string[] {
    const fecha = parseFecha(`${periodo}-01`);
    return Array.from({ length: cantidad }, (_, i) => isoFecha(agregarMeses(fecha, i + desplazamiento)).slice(0, 7));
}
/** Proyección de lectura: reutiliza la deuda de línea y no modifica el motor financiero. */
export function resumirDashboard(datos: DatosDashboard, moneda: MonedaDashboard, hoy: string, periodo: string, tiendaId?: number, diaSemana = hoy) {
    const clientes = datos.clientes.filter(c => tiendaId === undefined || c.tiendaId === tiendaId);
    const clienteDe = (id: number, tienda?: number) => clientes.find(c => c.id === id && c.tiendaId === tienda);
    const ventas = datos.ventas.filter(v => (tiendaId === undefined || v.tiendaId === tiendaId) && v.fecha <= hoy &&
        (v.condiciones?.moneda ?? clienteDe(v.clienteId, v.tiendaId)?.moneda) === moneda);
    const ids = new Set(ventas.map(v => `${v.tiendaId}:${v.id}`));
    const obligaciones = datos.obligaciones.filter(o => ids.has(`${o.tiendaId}:${o.ventaId}`) && o.moneda === moneda);
    const pendientes = obligaciones.filter(o => !o.pagada);
    const cuentas = clientes.filter(c => c.moneda === moneda).map(c => {
        const propias = ventas.filter(v => v.clienteId === c.id && v.tiendaId === c.tiendaId);
        const capital = deudaLinea({ ventas: propias, obligaciones: obligaciones.filter(o => o.clienteId === c.id && o.tiendaId === c.tiendaId) }, c);
        // El interés de gracia no consume línea. El vencido usa el mismo prorrateo
        // del capital original para ser un subconjunto de la métrica de línea.
        const vencidoSinRedondear = propias.reduce((a, v) => {
            const cuotas = obligaciones.filter(o => o.ventaId === v.id && o.tiendaId === v.tiendaId);
            const base = cuotas.reduce((s, o) => s.plus(o.capital), D(0));
            const vencidas = cuotas.filter(o => !o.pagada && o.vencimiento < hoy).reduce((s, o) => s.plus(o.capital), D(0));
            return a.plus(base.gt(0) ? D(v.capital).mul(vencidas).div(base) : 0);
        }, D(0));
        const vencido = r2(vencidoSinRedondear);
        return { id: c.id, nombre: c.nombre, doc: c.doc, activo: c.activo !== false,
            limite: c.limite, capital: capital.toFixed(2), vencido: (vencido.gt(capital) ? capital : vencido).toFixed(2) };
    }).sort((a, b) => D(b.capital).comparedTo(a.capital) || a.nombre.localeCompare(b.nombre, 'es'));
    const capital = cuentas.reduce((a, c) => a.plus(c.capital), D(0));
    const vencido = cuentas.reduce((a, c) => a.plus(c.vencido), D(0));
    const pagos = datos.pagos.filter(p => (tiendaId === undefined || p.tiendaId === tiendaId) && p.fecha && p.fecha <= hoy &&
        (p.moneda ?? clienteDe(p.clienteId, p.tiendaId)?.moneda) === moneda);
    const importePago = (p: Pago) => p.abono !== undefined ? D(p.abono) : D(p.capital).plus(p.comp ?? 0).plus(p.mora ?? 0);
    const cobros = pagos.filter(p => p.fecha!.slice(0, 7) === periodo).reduce((a, p) => a.plus(importePago(p)), D(0));
    const actividad = mesesDesde(periodo, 6, -5).map(mes => ({ mes,
        ventas: ventas.filter(v => v.fecha.slice(0, 7) === mes).reduce((a, v) => a.plus(v.capital), D(0)).toFixed(2),
        cobros: pagos.filter(p => p.fecha!.slice(0, 7) === mes).reduce((a, p) => a.plus(importePago(p)), D(0)).toFixed(2) }));
    const lunes = parseFecha(diaSemana);
    lunes.setUTCDate(lunes.getUTCDate() - (lunes.getUTCDay() + 6) % 7);
    const actividadSemanal = Array.from({ length: 7 }, (_, indice) => {
        const dia = new Date(lunes);
        dia.setUTCDate(dia.getUTCDate() + indice);
        const fecha = isoFecha(dia);
        return { fecha,
            ventas: ventas.filter(v => v.fecha === fecha).reduce((s, v) => s.plus(v.capital), D(0)).toFixed(2),
            cobros: pagos.filter(p => p.fecha === fecha).reduce((s, p) => s.plus(importePago(p)), D(0)).toFixed(2) };
    });
    const proximos = mesesDesde(hoy.slice(0, 7), 6).map(mes => ({ mes,
        importe: pendientes.filter(o => o.vencimiento >= hoy && o.vencimiento.slice(0, 7) === mes)
            .reduce((a, o) => a.plus(o.capital).plus(o.comp), D(0)).toFixed(2) }));
    const pendientesOrdenados = [...pendientes].sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || a.id.localeCompare(b.id));
    const detalle = (o: Obligacion) => ({ id: o.id, clienteId: o.clienteId,
        cliente: clienteDe(o.clienteId, o.tiendaId)?.nombre ?? `Cliente #${o.clienteId}`,
        ventaId: o.ventaId, vencimiento: o.vencimiento, cuota: o.cuota,
        importe: D(o.capital).plus(o.comp).toFixed(2) });
    return { moneda, hoy, periodo, cuentas, capital: capital.toFixed(2), vencido: vencido.toFixed(2),
        vigente: capital.minus(vencido).toFixed(2), cobros: cobros.toFixed(2), clientesConSaldo: cuentas.filter(c => D(c.capital).gt(0)).length,
        actividad, actividadSemanal, proximos, obligacionesVencidas: pendientesOrdenados.filter(o => o.vencimiento < hoy).map(detalle),
        proximasObligaciones: pendientesOrdenados.filter(o => o.vencimiento >= hoy).map(detalle),
        pagosSinFecha: datos.pagos.filter(p => (!p.fecha && (tiendaId === undefined || p.tiendaId === tiendaId)) &&
            (p.moneda ?? clienteDe(p.clienteId, p.tiendaId)?.moneda) === moneda).length };
}
