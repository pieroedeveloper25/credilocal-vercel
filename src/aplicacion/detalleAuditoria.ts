import type { Operacion } from './ejecutarOperacion';
import { diasEntre, fechaValida, parseFecha } from '../shared/dominio/fechas';
/**
 * Resume la entidad afectada y los importes clave de una operación. Nunca incluye contraseñas.
 * `hoy` (AAAA-MM-DD, hora de Lima) permite señalar las compras y pagos registrados con fecha anterior al día del registro.
 */
export function detalleAuditoria(operacion: Operacion, resultado: unknown, hoy?: string): string {
    const r = (resultado ?? {}) as Record<string, unknown>;
    const retroactiva = () => {
        const fecha = r.fecha;
        if (!hoy || typeof fecha !== 'string' || !fechaValida(fecha) || !fechaValida(hoy) || fecha >= hoy)
            return '';
        return `; retroactiva=${diasEntre(parseFecha(fecha), parseFecha(hoy))} d (fecha=${fecha})`;
    };
    switch (operacion.accion) {
        case 'GUARDAR TIENDA': {
            const t = operacion.pedido.registro;
            return `tienda=${t.id < 0 ? 'nueva' : t.id}; ruc=${t.ruc}; activa=${t.activa}`;
        }
        case 'GUARDAR CLIENTE': {
            const c = operacion.pedido.registro;
            return `cliente=${c.id < 0 ? 'nuevo' : c.id}; doc=${c.doc}; activo=${c.activo !== false}; limite=${c.limite}; moneda=${c.moneda}`;
        }
        case 'GUARDAR PRODUCTO': {
            const p = operacion.pedido.registro;
            return `sku=${p.sku}; activo=${p.activo !== false}; contado=${p.contado}; credito=${p.credito}`;
        }
        case 'REGISTRAR VENTA':
            return `venta=${r.id}; cliente=${r.clienteId}; modalidad=${r.modalidad}; capital=${r.capital}; n=${r.n}${retroactiva()}`;
        case 'REGISTRAR PAGO':
            return `constancia=${r.constancia}; cliente=${r.clienteId}; periodo=${r.periodo}; abono=${r.abono}; mora=${r.mora}; compensatorio=${r.comp}; capital=${r.capital}${retroactiva()}`;
        case 'EMITIR CORTE':
            return `listado=${r.id}; total=${r.total}`;
    }
}
