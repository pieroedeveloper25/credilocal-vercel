import { describe, it, expect } from 'vitest';
import { ClienteAgregado } from './cliente';
import type { Cliente } from './modelos';
import { CLIENTES } from '../../../../pruebas/fixtures/demostracion/datos';

const base = (): Cliente => ({ ...CLIENTES[0], id: 7, tiendaId: 1, activo: true, horaCorte: '18:00', limite: '5000.00', correo: '' });
const sinCompras = { otrosDeLaTienda: [] as Cliente[], huboComprasEnElMes: () => false };

describe('agregado Cliente', () => {
  it('nace sin capital comprometido y con el correo normalizado', () => {
    const c = ClienteAgregado.registrar(8, 1, { ...base(), correo: '  Ana@Demo.PE ', saldoComprometido: '999.00' }, []);
    expect(c.datos.saldoComprometido).toBe('0.00');
    expect(c.correo).toBe('ana@demo.pe');
    expect(c.id).toBe(8);
    expect(c.lineaDisponible.toFixed(2)).toBe('5000.00');
  });

  it('rechaza datos que incumplen las reglas del cliente', () => {
    expect(() => ClienteAgregado.registrar(8, 1, { ...base(), nombre: ' ' }, [])).toThrow();
    expect(() => ClienteAgregado.registrar(8, 1, base(), [{ ...base(), id: 3 }])).toThrow('documento');
  });

  it('compromete y libera la línea sin alterar la versión anterior', () => {
    const inicial = ClienteAgregado.reconstituir({ ...base(), saldoComprometido: '100.00' });
    const comprometido = inicial.comprometer('250.50');
    expect(comprometido.saldoComprometido).toBe('350.50');
    expect(comprometido.lineaDisponible.toFixed(2)).toBe('4649.50');
    expect(inicial.saldoComprometido).toBe('100.00');
    expect(comprometido.sincronizarSaldo('0.00').saldoComprometido).toBe('0.00');
  });

  it('no cambia de moneda con capital comprometido ni en un mes con compras', () => {
    const conDeuda = ClienteAgregado.reconstituir({ ...base(), saldoComprometido: '10.00' });
    expect(() => conDeuda.modificar({ ...base(), moneda: 'USD' }, sinCompras)).toThrow('obligaciones pendientes');
    const libre = ClienteAgregado.reconstituir({ ...base(), saldoComprometido: '0.00' });
    expect(() => libre.modificar({ ...base(), moneda: 'USD' }, { ...sinCompras, huboComprasEnElMes: () => true })).toThrow('mes sin operaciones');
    expect(libre.modificar({ ...base(), moneda: 'USD' }, sinCompras).datos.moneda).toBe('USD');
  });

  it('al modificar conserva identidad, tienda y capital comprometido aunque lleguen otros valores', () => {
    const c = ClienteAgregado.reconstituir({ ...base(), saldoComprometido: '40.00' });
    const m = c.modificar({ ...base(), id: 99, tiendaId: 5, saldoComprometido: '0.00', nombre: 'Nuevo nombre' }, sinCompras);
    expect(m.id).toBe(7);
    expect(m.tiendaId).toBe(1);
    expect(m.saldoComprometido).toBe('40.00');
    expect(m.datos.nombre).toBe('Nuevo nombre');
  });

  it('no consulta el historial de compras si la moneda no cambia', () => {
    const c = ClienteAgregado.reconstituir(base());
    expect(() => c.modificar(base(), { otrosDeLaTienda: [], huboComprasEnElMes: () => { throw new Error('no debía consultarse'); } })).not.toThrow();
  });
});
