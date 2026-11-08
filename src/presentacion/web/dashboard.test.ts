import { describe, expect, it } from 'vitest';
import { resumirDashboard, mesesDesde, type DatosDashboard } from './dashboard';
import type { Cliente } from '../../contexts/customer-management/dominio/modelos';
import type { Venta } from '../../contexts/credit-origination/dominio/modelos';
import { crearObligaciones } from '../../contexts/credit-origination/dominio/obligaciones';
import { deudaLinea } from '../../contexts/billing-and-collections/dominio/obligaciones';
import { D } from '../../shared/dominio/decimal';
import { relojPeru } from '../../shared/dominio/fechas';

const cliente = (id = 1, moneda: 'PEN' | 'USD' = 'PEN', tiendaId = 1): Cliente => ({ id, tiendaId, nombre: `Cliente ${id}`, doc: String(id), tipoDoc: 'DNI', moneda,
    limite: '3000', deuda: '0', diaCorte: 10, diaPago: 25, plazo: 3, tipoC: 'Efectiva', valC: '36', capC: 'Diaria', tipoM: 'Efectiva', valM: '48', capM: 'Diaria' });
function venta(c: Cliente, id: number, capital: string, cuotas = false): Venta {
    return { id, tiendaId: c.tiendaId, clienteId: c.id, capital, fecha: '2026-10-08', hora: '12:00', modalidad: cuotas ? 'Cuotas' : 'Fin de mes', n: cuotas ? 3 : 1, detalle: 'Producto' };
}
function caso(): DatosDashboard {
    const lucia = cliente(), pedro = cliente(2), v1 = venta(lucia, 100, '1200', true), v2 = venta(pedro, 101, '500');
    return { clientes: [lucia, pedro], ventas: [v1, v2], obligaciones: [...crearObligaciones(v1, lucia), ...crearObligaciones(v2, pedro)], pagos: [] };
}
describe('Dashboard financiero de solo lectura', () => {
    it('separa gracia capitalizada, capital de línea y cuotas futuras sin inventar cobros', () => {
        const datos = caso(), antes = JSON.stringify(datos), r = resumirDashboard(datos, 'PEN', '2026-10-30', '2026-10', 1);
        expect(datos.ventas[0].plan?.capitalAjustado).toBe('1217.55');
        expect([r.capital, r.vencido, r.vigente, r.cobros, r.clientesConSaldo]).toEqual(['1700.00', '500.00', '1200.00', '0.00', 2]);
        expect(r.proximos.filter(m => D(m.importe).gt(0)).map(m => [m.mes, m.importe])).toEqual([['2026-11', '427.10'], ['2026-12', '427.10'], ['2027-01', '427.09']]);
        expect(r.actividad.at(-1)).toEqual({ mes: '2026-10', ventas: '1700.00', cobros: '0.00' });
        expect(JSON.stringify(datos)).toBe(antes);
    });
    it('al pagar una cuota libera línea con el prorrateo del motor y no duplica capital e interés', () => {
        const d = caso(); d.obligaciones[0] = { ...d.obligaciones[0], pagada: 'CP-1', fechaPago: '2026-11-25' };
        d.pagos.push({ clienteId: 1, tiendaId: 1, moneda: 'PEN', fecha: '2026-11-25', constancia: 'CP-1', capital: d.obligaciones[0].capital, comp: d.obligaciones[0].comp, mora: '0', abono: '427.10' });
        const r = resumirDashboard(d, 'PEN', '2026-11-26', '2026-11', 1);
        expect(r.capital).toBe(d.clientes.reduce((s, c) => s.plus(deudaLinea(d, c)), D(0)).toFixed(2));
        expect(r.cobros).toBe('427.10');
        expect(r.proximasObligaciones.map(o => o.id)).not.toContain(d.obligaciones[0].id);
        expect(D(r.vigente).plus(r.vencido).toFixed(2)).toBe(r.capital);
        expect(r.vencido).toBe('500.00');
    });
    it('mantiene deudas de clientes de baja y no considera vencida una cuota del día actual', () => {
        const d = caso(); d.clientes[0].activo = false;
        const r = resumirDashboard(d, 'PEN', '2026-11-25', '2026-11', 1);
        expect(r.cuentas[0].activo).toBe(false); expect(r.capital).toBe('1700.00');
        expect(r.obligacionesVencidas).toHaveLength(1);
        expect(r.proximasObligaciones[0].vencimiento).toBe('2026-11-25');
        expect(r.proximos.find(m => m.mes === '2026-11')?.importe).toBe('427.10');
    });
    it('separa tienda y moneda, y usa la moneda histórica de la venta/pago aunque cambie el cliente', () => {
        const d = caso(), usd = cliente(3, 'USD'), vUsd = venta(usd, 102, '75');
        d.clientes.push(usd); d.ventas.push(vUsd); d.obligaciones.push(...crearObligaciones(vUsd, usd));
        const ajeno = cliente(4, 'PEN', 2), vAjeno = venta(ajeno, 103, '900');
        d.clientes.push(ajeno); d.ventas.push(vAjeno); d.obligaciones.push(...crearObligaciones(vAjeno, ajeno));
        d.pagos.push({ clienteId: 3, tiendaId: 1, moneda: 'USD', capital: '20', comp: '1', mora: '2', fecha: '2026-10-29', constancia: 'H-USD' });
        expect(resumirDashboard(d, 'USD', '2026-10-30', '2026-10', 1).capital).toBe('75.00');
        expect(resumirDashboard(d, 'USD', '2026-10-30', '2026-10', 1).cobros).toBe('23.00');
        const r = resumirDashboard(d, 'PEN', '2026-10-30', '2026-10', 1); expect(r.capital).toBe('1700.00');
        expect(r.actividad.at(-1)?.ventas).toBe('1700.00');
        // El cliente cambia después de cancelar sus operaciones PEN: el historial conserva PEN.
        d.obligaciones.filter(o => o.clienteId === 1).forEach(o => { o.pagada = 'CANCELADO'; });
        d.clientes[0].moneda = 'USD';
        expect(resumirDashboard(d, 'PEN', '2026-10-30', '2026-10', 1).actividad.at(-1)?.ventas).toBe('1700.00');
        expect(resumirDashboard(d, 'USD', '2026-10-30', '2026-10', 1).actividad.at(-1)?.ventas).toBe('75.00');
    });
    it('no convierte pagos sin fecha en cobros del mes y respeta el período elegido', () => {
        const d = caso(); d.pagos.push({ clienteId: 1, tiendaId: 1, capital: '10', constancia: 'ANTIGUO', moneda: 'PEN' });
        const r = resumirDashboard(d, 'PEN', '2026-10-30', '2026-09', 1);
        expect(r.cobros).toBe('0.00'); expect(r.pagosSinFecha).toBe(1); expect(r.actividad.at(-1)?.mes).toBe('2026-09');
        expect(r.actividad.every(m => m.ventas === '0.00')).toBe(true);
    });
    it('produce un resumen vacío estable y cruza el cambio de año en meses', () => {
        const r = resumirDashboard({ clientes: [], ventas: [], obligaciones: [], pagos: [] }, 'PEN', '2026-01-01', '2026-01', 1);
        expect([r.capital, r.vencido, r.vigente, r.cobros]).toEqual(['0.00', '0.00', '0.00', '0.00']);
        expect(mesesDesde('2026-01', 3, -2)).toEqual(['2025-11', '2025-12', '2026-01']);
        expect(relojPeru(new Date('2026-11-01T02:00:00Z')).slice(0, 10)).toBe('2026-10-31');
    });
    it('agrupa lunes a domingo al cruzar de año y separa cobros por fecha efectiva, tienda y moneda', () => {
        const c = cliente();
        const otraMoneda = cliente(2, 'USD'), otraTienda = cliente(3, 'PEN', 2);
        const datos: DatosDashboard = {
            clientes: [c, otraMoneda, otraTienda], obligaciones: [],
            ventas: [
                { ...venta(c, 11, '40.30'), fecha: '2026-12-31' },
                { ...venta(c, 12, '70'), fecha: '2027-01-01' },
                { ...venta(otraMoneda, 13, '40'), fecha: '2026-12-31' },
                { ...venta(otraTienda, 14, '50'), fecha: '2026-12-31' },
                { ...venta(c, 15, '12'), fecha: '2027-01-03' },
            ],
            pagos: [{ clienteId: c.id, tiendaId: c.tiendaId, moneda: 'PEN',
                capital: '20', comp: '1', mora: '2', fecha: '2027-01-01', constancia: 'H-1' }],
        };
        const semana = resumirDashboard(datos, 'PEN', '2027-01-02', '2026-12', 1, '2027-01-01').actividadSemanal;
        expect(semana.map(d => d.fecha)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
        expect(semana.filter(d => d.ventas !== '0.00' || d.cobros !== '0.00')).toEqual([
            { fecha: '2026-12-31', ventas: '40.30', cobros: '0.00' },
            { fecha: '2027-01-01', ventas: '70.00', cobros: '23.00' },
        ]);
    });
});
