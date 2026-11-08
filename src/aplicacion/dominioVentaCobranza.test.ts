import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cobrar } from '../contexts/billing-and-collections/dominio/cobranza';
import { registrarVenta } from '../contexts/credit-origination/dominio/venta';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import { CLIENTES, PRODUCTOS } from '../infraestructura/demostracion/datos';

const cliente = (): Cliente => ({ ...CLIENTES[0], id: 50, tiendaId: 1, activo: true, horaCorte: '18:00', limite: '5000.00' });
const catalogo = { buscar: (tiendaId: number, sku: string) => PRODUCTOS.map(p => ({ ...p, tiendaId, activo: true })).find(p => p.sku === sku) };
const entrada = { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes' as const, n: 5, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] };
const vender = () => registrarVenta({ id: 2026001, tiendaId: 1, entrada, comprador: cliente(), catalogo });

describe('registro de una venta (originación)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T17:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('devuelve la venta con precios y condiciones congelados y sus obligaciones', () => {
    const { venta, obligaciones } = vender();
    expect(venta.capital).toBe('1200.00');
    expect(venta.n).toBe(1);
    expect(venta.condiciones?.moneda).toBe(cliente().moneda);
    expect(obligaciones).toHaveLength(1);
    expect(obligaciones[0].ventaId).toBe(2026001);
  });

  it('rechaza compradores inexistentes o dados de baja, precios desactualizados y líneas excedidas', () => {
    expect(() => registrarVenta({ id: 1, tiendaId: 1, entrada, comprador: undefined, catalogo })).toThrow('cliente activo');
    expect(() => registrarVenta({ id: 1, tiendaId: 1, entrada, comprador: { ...cliente(), activo: false }, catalogo })).toThrow('cliente activo');
    expect(() => registrarVenta({ id: 1, tiendaId: 1, entrada: { ...entrada, capital: '1' }, comprador: cliente(), catalogo })).toThrow('precio del catálogo');
    expect(() => registrarVenta({ id: 1, tiendaId: 1, entrada, comprador: { ...cliente(), saldoComprometido: '4900.00' }, catalogo })).toThrow('línea');
  });
});

describe('cobro de una deuda (cobranzas)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T17:00:00Z')); });
  afterEach(() => vi.useRealTimers());
  const ahora = '2026-10-08T12:00';

  it('cancela las obligaciones sin alterar las originales y reparte el pago por prelación', () => {
    const { obligaciones } = vender();
    const pendientes = obligaciones.map(o => ({ ...o }));
    const total = '1212.86';
    const { pago, canceladas } = cobrar({ cliente: cliente(), obligaciones: pendientes, tiendaId: 1, pedido: { clienteId: 50, periodo: '2026-09', fecha: '2026-09-20', hora: '17:59', abono: total }, ahora, numero: 3 });
    expect(pago.constancia).toBe('CP-1-3-50');
    expect(Number(pago.capital) + Number(pago.comp) + Number(pago.mora)).toBeCloseTo(Number(total), 2);
    expect(canceladas).toHaveLength(1);
    expect(canceladas[0].pagada).toBe('CP-1-3-50');
    expect('pagada' in pendientes[0]).toBe(false);
  });

  it('rechaza clientes ajenos, pagos parciales y fechas futuras', () => {
    const { obligaciones } = vender();
    const pedido = { clienteId: 50, periodo: '2026-09', fecha: '2026-09-20', hora: '17:59', abono: '1212.86' };
    const datos = { cliente: cliente(), obligaciones, tiendaId: 1, pedido, ahora, numero: 1 };
    expect(() => cobrar({ ...datos, cliente: undefined })).toThrow('ajeno');
    expect(() => cobrar({ ...datos, pedido: { ...pedido, abono: '600.00' } })).toThrow('pagos parciales');
    expect(() => cobrar({ ...datos, pedido: { ...pedido, fecha: '2026-10-09' } })).toThrow('futura');
  });
});
