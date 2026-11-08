import type { VentaCreditoRegistrada } from '../../credit-origination/dominio/eventos';
import type { RepositorioObligaciones } from '../dominio/repositorios';

/** Las obligaciones pactadas por la venta pasan a ser deuda gestionada por cobranzas. */
export const alRegistrarseVentaCredito = (obligaciones: RepositorioObligaciones) => (evento: VentaCreditoRegistrada) => {
    obligaciones.agregar(evento.obligaciones.map(pactada => ({ ...pactada })));
};
