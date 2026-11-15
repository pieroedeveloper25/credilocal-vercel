import { describe, expect, it } from 'vitest';
import type { Cliente } from './modelos';
import { TOPES_INICIALES, tasaEfectivaAnual, validarTope } from './topes';
import { validarCliente } from './validaciones';
import { guardarTopes } from '../aplicacion/guardarTopes';
import { CLIENTES } from '../../../../pruebas/fixtures/demostracion/datos';

const cliente: Cliente = { ...CLIENTES[0], horaCorte: '18:00', activo: true };

describe('topes de tasas', () => {
  it('convierte las tasas nominales a efectivas anuales antes de compararlas', () => {
    expect(tasaEfectivaAnual('Efectiva', '30', 'Diaria').mul(100).toFixed(2)).toBe('30.00');
    expect(tasaEfectivaAnual('Nominal', '24', 'Mensual').mul(100).toFixed(2)).toBe('26.82');
    expect(tasaEfectivaAnual('Nominal', '24', 'Diaria').mul(100).toFixed(2)).toBe('27.11');
  });
  it('acepta las tasas de los juegos de prueba y rechaza las que superan el tope', () => {
    expect(() => validarCliente(cliente, [], TOPES_INICIALES)).not.toThrow();
    expect(() => validarCliente({ ...cliente, tipoC: 'Nominal', capC: 'Diaria', valC: '80' }, [], TOPES_INICIALES)).toThrow('compensatoria');
    expect(() => validarCliente({ ...cliente, tipoM: 'Efectiva', valM: '18' }, [], TOPES_INICIALES)).toThrow('moratoria');
  });
  it('compara con el tope de la moneda del cliente', () => {
    const usd = { ...cliente, moneda: 'USD' as const, tipoC: 'Nominal' as const, capC: 'Mensual' as const, valC: '75' };
    expect(() => validarCliente(usd, [], TOPES_INICIALES)).toThrow('USD');
    expect(() => validarCliente({ ...usd, moneda: 'PEN' }, [], TOPES_INICIALES)).not.toThrow();
  });
  it('sin topes cargados no bloquea', () => {
    expect(() => validarCliente({ ...cliente, tipoC: 'Efectiva', valC: '100' }, [])).not.toThrow();
  });
  it('el administrador solo cambia el tope de una moneda existente y con valores válidos', () => {
    const lista = structuredClone(TOPES_INICIALES);
    const repo = { todos: () => lista, guardar: (t: (typeof lista)[number]) => { lista[lista.findIndex(x => x.id === t.id)] = t; } };
    guardarTopes(repo, { id: 99, moneda: 'USD', compensatorioMax: '90.50', moratorioMax: '13.58', vigenteDesde: '2026-11-01' });
    expect(lista[1]).toMatchObject({ id: 2, moneda: 'USD', compensatorioMax: '90.50' });
    expect(() => validarTope({ ...lista[0], compensatorioMax: '0' })).toThrow();
    expect(() => validarTope({ ...lista[0], moratorioMax: '120' })).toThrow('moratorio');
    expect(() => validarTope({ ...lista[0], vigenteDesde: '2026-13-40' })).toThrow('fecha');
  });
});
