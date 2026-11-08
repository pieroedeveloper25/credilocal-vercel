import { describe, expect, it } from 'vitest';
import { casosSobre } from '../infraestructura/persistencia/casosSobreDatos';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import type { Sesion } from '../contexts/identity-and-access/dominio/modelos';
import { validarProducto } from '../contexts/product-catalog/dominio/validaciones';
import { CLIENTES, PRODUCTOS } from '../infraestructura/demostracion/datos';
import type { Datos } from '../shared/dominio/datos';
import { siguienteId } from '../shared/dominio/validaciones';

const sesion: Sesion = { rol: 'Comercio', correo: 'admin@demo.pe', tiendaId: 1, clienteId: -1 };
const cuentas = { crearCuenta: async (correo: string, _clave: string, rol: 'Comercio' | 'Cliente' | 'Superadministrador', id: number, tiendaId?: number, clienteId?: number) => ({ id, rol, correo, sal: 's', hash: 'h', tiendaId, clienteId }) };
const tienda = { id: 1, ruc: '20601234567', razon: 'Tienda SAC', nombre: 'Tienda', giro: 'Bodega', direccion: 'Lima', telefono: '', correo: 'admin@demo.pe', activa: true };
const datos = (): Datos => ({ tiendas: [tienda], cuentas: [], clientes: [{ ...CLIENTES[0], id: 7, tiendaId: 1, activo: true, horaCorte: '18:00', limite: '5000.00' } as Cliente], productos: PRODUCTOS.map(p => ({ ...p, tiendaId: 1, activo: true })), ventas: [], pagos: [], auditoria: [] });

const registrarCompra = (d: Datos, tiendaId: number, entrada: Parameters<ReturnType<typeof casosSobre>['registrarCompra']>[1]) => casosSobre(d, cuentas).registrarCompra(tiendaId, entrada);
const guardarCliente = (d: Datos, sesion: Sesion, registro: Cliente, clave: string | undefined, _c: unknown) => casosSobre(d, cuentas).guardarCliente(sesion, registro, clave);
const guardarTienda = (d: Datos, registro: typeof tienda, clave: string | undefined, _c: unknown) => casosSobre(d, cuentas).guardarTienda(registro, clave);

describe('identificadores asignados por el servidor', () => {
  it('no crea clientes con un id elegido por quien llama', async () => {
    const d = datos();
    const base = d.clientes[0];
    await expect(guardarCliente(d, sesion, { ...base, id: 987654321, tipoDoc: 'DNI', doc: '10000001' }, undefined, cuentas)).rejects.toThrow('El cliente no existe');
    expect(d.clientes).toHaveLength(1);
    await guardarCliente(d, sesion, { ...base, id: -1, tipoDoc: 'DNI', doc: '10000002', correo: '' }, undefined, cuentas);
    expect(d.clientes.map(c => c.id)).toEqual([7, 8]);
    await guardarCliente(d, sesion, { ...d.clientes[1], nombre: 'Editado' }, undefined, cuentas);
    expect(d.clientes[1].nombre).toBe('Editado');
  });

  it('no crea tiendas con un id elegido y numera desde la 1', async () => {
    const d = datos();
    await expect(guardarTienda(d, { ...tienda, id: 55, ruc: '20999999999', correo: 'otra@demo.pe' }, 'Clave2026', cuentas)).rejects.toThrow('La tienda no existe');
    await guardarTienda(d, { ...tienda, id: -1, ruc: '20999999999', correo: 'otra@demo.pe' }, 'Clave2026', cuentas);
    expect(d.tiendas.map(t => t.id)).toEqual([1, 2]);
    const vacia: Datos = { ...datos(), tiendas: [] };
    await guardarTienda(vacia, { ...tienda, id: -1 }, 'Clave2026', cuentas);
    expect(vacia.tiendas[0].id).toBe(1);
  });

  it('calcula el siguiente id sin expandir la lista (listas muy grandes)', () => {
    const grande = Array.from({ length: 300_000 }, (_, i) => ({ id: i }));
    expect(siguienteId(grande)).toBe(300_000);
    expect(siguienteId([])).toBe(0);
    expect(siguienteId([], 2026001)).toBe(2026001);
    expect(siguienteId([{ id: 2026005 }], 2026001)).toBe(2026006);
  });
});

describe('otros datos de entrada', () => {
  it('exige un SKU acotado y sin espacios ni caracteres de control', () => {
    const p = { ...PRODUCTOS[0], tiendaId: 1, activo: true, descripcion: 'Descripción', imagen: 'data:image/png;base64,iVBORw0KGgo=' };
    expect(() => validarProducto(p)).not.toThrow();
    expect(() => validarProducto({ ...p, sku: `P-${'a'.repeat(36)}` })).not.toThrow();
    for (const sku of ['', ' ', 'A B', 'A\n1', 'x'.repeat(41)])
      expect(() => validarProducto({ ...p, sku }), JSON.stringify(sku)).toThrow('SKU');
  });

  it('guarda 1 como plazo de una venta a fin de mes, sin importar lo recibido', () => {
    const d = datos();
    const v = registrarCompra(d, 1, { clienteId: 7, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 9999, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] });
    expect(v.n).toBe(1);
    expect(v.id).toBe(2026001);
    const w = registrarCompra(d, 1, { clienteId: 7, fecha: '2026-09-11', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] });
    expect(w.id).toBe(2026002);
  });
});
