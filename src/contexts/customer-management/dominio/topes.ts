import type { Capitalizacion, Cliente, TipoTasa, TopeTasa } from './modelos';
import { D, Decimal } from '../../../shared/dominio/decimal';
import { fechaValida } from '../../../shared/dominio/fechas';
import { decimalEntrada, exigir } from '../../../shared/dominio/validaciones';

/** Topes que la base inicial guarda hasta que el administrador los actualice. */
export const TOPES_INICIALES: TopeTasa[] = [
    { id: 1, moneda: 'PEN', compensatorioMax: '114.13', moratorioMax: '17.12', vigenteDesde: '2026-08-01' },
    { id: 2, moneda: 'USD', compensatorioMax: '99.84', moratorioMax: '14.98', vigenteDesde: '2026-08-01' },
];

/** Tasa efectiva anual (fracción) equivalente a la tasa pactada; las nominales se capitalizan antes de compararlas con el tope. */
export function tasaEfectivaAnual(tipo: TipoTasa, valorPct: string, cap: Capitalizacion): Decimal {
    const t = D(valorPct).div(100);
    if (tipo === 'Efectiva') return t;
    return cap === 'Diaria' ? t.div(360).plus(1).pow(360).minus(1) : t.div(12).plus(1).pow(12).minus(1);
}

/** Las tasas pactadas con el cliente no pueden superar el tope vigente de su moneda. */
export function validarTopes(c: Cliente, topes: TopeTasa[]) {
    const tope = topes.find(t => t.moneda === c.moneda);
    if (!tope) return;
    const comp = tasaEfectivaAnual(c.tipoC, c.valC, c.capC).mul(100), mora = tasaEfectivaAnual(c.tipoM, c.valM, c.capM).mul(100);
    exigir(comp.lte(tope.compensatorioMax), `La tasa compensatoria equivale a ${comp.toFixed(2)} % efectivo anual y supera el tope vigente de ${tope.compensatorioMax} % para ${c.moneda}.`);
    exigir(mora.lte(tope.moratorioMax), `La tasa moratoria equivale a ${mora.toFixed(2)} % efectivo anual y supera el tope vigente de ${tope.moratorioMax} % para ${c.moneda}.`);
}

export function validarTope(t: TopeTasa) {
    exigir(t.moneda === 'PEN' || t.moneda === 'USD', 'Seleccione una moneda.');
    for (const v of [t.compensatorioMax, t.moratorioMax])
        exigir(/^\d+(\.\d{1,2})?$/.test(v) && decimalEntrada(v, 4, 2) && D(v).gt(0) && D(v).lte(1000), 'Los topes son porcentajes mayores que 0 y hasta 1000, con dos decimales como máximo.');
    exigir(D(t.moratorioMax).lte(t.compensatorioMax), 'El tope moratorio no puede superar al compensatorio.');
    exigir(fechaValida(t.vigenteDesde), 'Ingrese una fecha de vigencia válida.');
}
