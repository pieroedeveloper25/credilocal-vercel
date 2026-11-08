import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registrarOperacion } from './registrarOperacion';
import type { Operacion } from './ejecutarOperacion';
import { repositoriosSobre } from '../infraestructura/persistencia/repositoriosSobreDatos';
import { liquidarObligaciones } from '../contexts/billing-and-collections/aplicacion/../dominio/obligaciones';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import { CLIENTES, PRODUCTOS } from '../infraestructura/demostracion/datos';
import type { Datos } from '../shared/dominio/datos';
import { casosSobre } from '../infraestructura/persistencia/casosSobreDatos';
import type { CasosDeUso } from './casosDeUso';
const casos = (d: Datos): CasosDeUso => casosSobre(d, cuentas);
const registrarCompra = (d: Datos, tiendaId: number, entrada: Parameters<CasosDeUso['registrarCompra']>[1]) => casos(d).registrarCompra(tiendaId, entrada);
const registrarCobranza = (d: Datos, tiendaId: number, pedido: Parameters<CasosDeUso['registrarCobranza']>[1]) => casos(d).registrarCobranza(tiendaId, pedido);

const cliente = (): Cliente => ({ ...CLIENTES[0], id: 50, tiendaId: 1, activo: true, horaCorte: '18:00', limite: '5000.00' });
const datos = (c = cliente()): Datos => ({ finanzasVersion: 1, tiendas: [], cuentas: [], clientes: [c], productos: PRODUCTOS.map(p => ({ ...p, tiendaId: 1, activo: true })), ventas: [], pagos: [], auditoria: [], obligaciones: [], listados: [] });
const sesion = { rol: 'Comercio' as const, correo: 'admin@demo.pe', tiendaId: 1, clienteId: -1 };
const repo = { leer: () => undefined, guardar: () => undefined, cerrar: () => undefined };
const cuentas = { crearCuenta: async (): Promise<never> => { throw new Error('no se usa'); } };
const operar = (d: Datos, operacion: Operacion, ahora: () => string) => { const c = casos(d); return registrarOperacion(c, repositoriosSobre(d), sesion, operacion, () => repo.guardar(), ahora); };


describe('auditoría con detalle y casos límite del enunciado', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T17:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('registra actor, tienda, entidad e importes de una venta y de un pago', async () => {
    const d = datos();
    const v = await operar(d, { accion: 'REGISTRAR VENTA', pedido: { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] } }, () => '2026-10-08T12:00');
    const venta = d.auditoria.find(a => a.accion === 'REGISTRAR VENTA')!;
    expect(venta).toMatchObject({ actor: 'admin@demo.pe', tiendaId: 1 });
    expect(venta.detalle).toContain(`venta=${(v as { id: number }).id}`);
    expect(venta.detalle).toContain('capital=1200.00');
    await operar(d, { accion: 'REGISTRAR PAGO', pedido: { clienteId: 50, periodo: '2026-09', fecha: '2026-09-20', hora: '17:00', abono: '1212.86' } }, () => '2026-10-08T12:00');
    const pago = d.auditoria.find(a => a.accion === 'REGISTRAR PAGO')!;
    expect(pago.detalle).toMatch(/constancia=CP-1-/);
    expect(pago.detalle).toContain('abono=1212.86');
    expect(JSON.stringify(d.auditoria)).not.toMatch(/clave|hash|credi2026/i);
  });

  it('señala en la auditoría las compras y pagos con fecha anterior al día del registro, sin cambiar su fecha', async () => {
    const d = datos();
    const ahora = () => '2026-10-08T12:00';
    await operar(d, { accion: 'REGISTRAR VENTA', pedido: { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] } }, ahora);
    await operar(d, { accion: 'REGISTRAR VENTA', pedido: { clienteId: 50, fecha: '2026-10-08', hora: '09:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] } }, ahora);
    const [antigua, delDia] = d.auditoria.filter(a => a.accion === 'REGISTRAR VENTA');
    expect(antigua.detalle).toContain('retroactiva=28 d (fecha=2026-09-10)');
    expect(delDia.detalle).not.toContain('retroactiva');
    expect(d.ventas[0].fecha).toBe('2026-09-10');
    expect(antigua.fecha).toBe('2026-10-08T17:00:00.000Z');
  });

  it('rechaza el pago parcial y el exceso de línea del enunciado', () => {
    const d = datos();
    registrarCompra(d, 1, { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] });
    expect(() => registrarCobranza(d, 1, { clienteId: 50, periodo: '2026-09', fecha: '2026-09-26', hora: '10:00', abono: '600.00' })).toThrow('pagos parciales');
    expect(() => registrarCompra(d, 1, { clienteId: 50, fecha: '2026-09-11', hora: '12:00', capital: '4500', modalidad: 'Cuotas', n: 3, detalle: '', items: [{ sku: 'SRV-014', cantidad: '2' }] })).toThrow('línea');
  });

  it('cobra mora por los días de atraso y respeta la prelación', () => {
    const d = datos();
    registrarCompra(d, 1, { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] });
    const l = liquidarObligaciones(d, d.clientes[0], '2026-09', '2026-09-30');
    expect(l.diasMora).toBe(4);
    expect(l.mora.gt(0)).toBe(true);
    const p = registrarCobranza(d, 1, { clienteId: 50, periodo: '2026-09', fecha: '2026-09-30', hora: '10:00', abono: l.total.toFixed(2) });
    expect(p.mora).toBe(l.mora.toFixed(2));
    expect(p.capital).toBe('1200.00');
  });
});
