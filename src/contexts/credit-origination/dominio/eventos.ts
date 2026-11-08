import type { EventoDeDominio } from '../../../shared/dominio/eventos';
import type { ObligacionPactada, Venta } from './modelos';

/** BC 4 confirma una venta a crédito y entrega las obligaciones pactadas. */
export interface VentaCreditoRegistrada extends EventoDeDominio {
    readonly tipo: 'VentaCreditoRegistrada';
    readonly venta: Venta;
    readonly obligaciones: ObligacionPactada[];
}
export const ventaCreditoRegistrada = (venta: Venta, obligaciones: ObligacionPactada[]): VentaCreditoRegistrada =>
    ({ tipo: 'VentaCreditoRegistrada', venta, obligaciones });
