import type { ClienteComprador, ObligacionPactada, Venta } from './modelos';
import { condicionesDe, crearObligaciones } from './obligaciones';
import type { CatalogoDeVenta } from './repositorios';
import { validarVenta } from './validaciones';
import { D, r2 } from '../../../shared/dominio/decimal';
import { activo, decimalEntrada, exigir } from '../../../shared/dominio/validaciones';

/**
 * Registro de una venta a crédito: fija precios y condiciones en el momento de la compra, comprueba la línea del
 * cliente y genera las obligaciones pactadas. Nada de esto se puede hacer a medias: o se devuelve la venta completa
 * con sus obligaciones o se rechaza.
 */
export function registrarVenta(args: { id: number; tiendaId: number; entrada: Omit<Venta, 'id'>; comprador: ClienteComprador | undefined; catalogo: CatalogoDeVenta }): { venta: Venta; obligaciones: ObligacionPactada[] } {
    const { id, tiendaId, entrada, comprador: c, catalogo } = args;
    exigir(c && activo(c), 'Seleccione un cliente activo de la tienda.');
    exigir(entrada.items?.length, 'Agregue productos a la compra.');
    const items = entrada.items.map(it => {
        const p = catalogo.buscar(tiendaId, it.sku);
        exigir(p && activo(p) && (p.modalidad === 'Ambas' || p.modalidad === entrada.modalidad), 'Producto de baja, ajeno a la tienda o incompatible.');
        exigir(decimalEntrada(it.cantidad, 8, 2) && D(it.cantidad).gt(0), 'Ingrese cantidades positivas con hasta ocho enteros y dos decimales.');
        return { sku: p.sku, cantidad: it.cantidad, precio: p.credito, nombre: p.nombre };
    });
    const capital = r2(items.reduce((a, it) => a.plus(D(it.cantidad).mul(it.precio)), D(0))).toFixed(2);
    // En fin de mes el plazo no se usa: se guarda 1 para que no quede un valor arbitrario.
    const venta: Venta = { ...entrada, n: entrada.modalidad === 'Fin de mes' ? 1 : entrada.n, id, tiendaId, capital, items, detalle: items.map(it => `${it.cantidad} × ${it.nombre}`).join(' + '), condiciones: condicionesDe(c), horaCorte: c.horaCorte ?? '23:59' };
    validarVenta(venta, c, c.saldoComprometido ?? '0');
    exigir(D(entrada.capital).eq(capital), 'El precio del catálogo cambió. Revise la compra antes de registrarla.');
    const obligaciones = crearObligaciones(venta, c);
    return { venta, obligaciones };
}
