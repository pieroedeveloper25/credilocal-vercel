/**
 * Composición de los contextos. Aquí viven las capas anticorrupción: cada contexto recibe de los demás solo lo que declara
 * necesitar, y los eventos de dominio conectan sus efectos. Los repositorios se inyectan, de modo que ningún contexto
 * conoce la estructura de almacenamiento.
 */
import { alAmortizarseCapital, alRegistrarseVentaCredito as consumirLinea } from '../contexts/customer-management/aplicacion/suscriptores';
import { alRegistrarseVentaCredito as crearObligacionesPactadas } from '../contexts/billing-and-collections/aplicacion/suscriptores';
import { emitirCorte, emitirCortesPendientes, type DependenciasCortes } from '../contexts/billing-and-collections/aplicacion/emitirCorte';
import { registrarCobranza, type DependenciasCobranza } from '../contexts/billing-and-collections/aplicacion/registrarPago';
import type { CapitalAmortizado } from '../contexts/billing-and-collections/dominio/eventos';
import type { ClientesDeCobranza, VentasDeCobranza } from '../contexts/billing-and-collections/dominio/repositorios';
import { registrarCompra, type DependenciasRegistrarVenta } from '../contexts/credit-origination/aplicacion/registrarVenta';
import type { VentaCreditoRegistrada } from '../contexts/credit-origination/dominio/eventos';
import type { Venta } from '../contexts/credit-origination/dominio/modelos';
import type { CatalogoDeVenta, Compradores } from '../contexts/credit-origination/dominio/repositorios';
import { guardarTopes } from '../contexts/customer-management/aplicacion/guardarTopes';
import type { TopeTasa } from '../contexts/customer-management/dominio/modelos';
import { guardarCliente, type DependenciasGuardarCliente } from '../contexts/customer-management/aplicacion/guardarCliente';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import type { AccesoDeClientes, HistorialDeCompras } from '../contexts/customer-management/dominio/repositorios';
import { guardarTienda } from '../contexts/identity-and-access/aplicacion/guardarTienda';
import { exigirCorreoDisponible } from '../contexts/identity-and-access/dominio/cuentas';
import type { Sesion, Tienda } from '../contexts/identity-and-access/dominio/modelos';
import { guardarProducto } from '../contexts/product-catalog/aplicacion/guardarProducto';
import type { Producto } from '../contexts/product-catalog/dominio/modelos';
import type { Repositorios } from './repositorios';
import { crearBusDeEventos } from '../shared/aplicacion/busDeEventos';
import type { CreadorDeCuentas } from '../shared/aplicacion/puertos';

export function crearCasosDeUso(r: Repositorios, creador: CreadorDeCuentas) {
    const bus = crearBusDeEventos();
    bus.suscribir<VentaCreditoRegistrada>('VentaCreditoRegistrada', crearObligacionesPactadas(r.obligaciones));
    bus.suscribir<VentaCreditoRegistrada>('VentaCreditoRegistrada', consumirLinea(r.clientes));
    bus.suscribir<CapitalAmortizado>('CapitalAmortizado', alAmortizarseCapital(r.clientes));

    const delaTienda = (tiendaId: number, id: number) => {
        const c = r.clientes.porId(id);
        return c && c.tiendaId === tiendaId ? c : undefined;
    };
    // Originación ve a un cliente como comprador; cobranzas, como cliente de cobranza.
    const compradores: Compradores = { buscar: delaTienda };
    const catalogo: CatalogoDeVenta = { buscar: (tiendaId, sku) => r.productos.buscar(tiendaId, sku) };
    const clientesDeCobranza: ClientesDeCobranza = { buscar: delaTienda, todos: () => r.clientes.todos() };
    const ventasDeCobranza: VentasDeCobranza = {
        cobrables: () => r.ventas.todas(),
        monedaPactada: (clienteId, tiendaId, hastaPeriodo) =>
            r.ventas.todas().filter((v: Venta) => v.clienteId === clienteId && v.tiendaId === tiendaId && v.fecha.slice(0, 7) <= hastaPeriodo)
                .sort((a: Venta, b: Venta) => b.fecha.localeCompare(a.fecha))[0]?.condiciones?.moneda,
    };
    // Clientes pide a identidad el acceso de un cliente y a originación su historial de compras.
    const acceso: AccesoDeClientes = {
        exigirCorreoDisponible: (correo, tiendaId, clienteId) => exigirCorreoDisponible(r.cuentas.todas(), correo, 'Cliente', tiendaId, clienteId),
        tieneAcceso: clienteId => r.cuentas.todas().some(c => c.rol === 'Cliente' && c.clienteId === clienteId),
        crear: async (correo, clave, tiendaId, clienteId) => {
            r.cuentas.agregar(await creador.crearCuenta(correo, clave, 'Cliente', r.cuentas.siguienteId(), tiendaId, clienteId));
        },
        cambiarCorreo: (clienteId, correo) => {
            const cuenta = r.cuentas.todas().find(c => c.rol === 'Cliente' && c.clienteId === clienteId);
            if (cuenta)
                r.cuentas.reemplazar({ ...cuenta, correo });
        },
        quitar: clienteId => {
            for (const cuenta of r.cuentas.todas().filter(c => c.rol === 'Cliente' && c.clienteId === clienteId))
                r.cuentas.eliminar(cuenta.id);
        },
    };
    const historial: HistorialDeCompras = {
        huboComprasEnElMes: (clienteId, mes) => r.ventas.todas().some((v: Venta) => v.clienteId === clienteId && v.fecha.slice(0, 7) === mes),
    };

    const paraClientes: DependenciasGuardarCliente = { clientes: r.clientes, acceso, historial, topes: r.topes };
    const paraVentas: DependenciasRegistrarVenta = { ventas: r.ventas, compradores, catalogo };
    const paraCobranza: DependenciasCobranza = { clientes: clientesDeCobranza, obligaciones: r.obligaciones, pagos: r.pagos, ventas: ventasDeCobranza };
    const paraCortes: DependenciasCortes = { clientes: clientesDeCobranza, obligaciones: r.obligaciones, listados: r.listados, ventas: ventasDeCobranza, auditoria: r.auditoria };

    return {
        guardarTienda: (registro: Tienda, clave?: string) => guardarTienda({ tiendas: r.tiendas, cuentas: r.cuentas }, registro, clave, creador),
        guardarTopes: (registro: TopeTasa) => guardarTopes(r.topes, registro),
        guardarCliente: (sesion: Sesion, registro: Cliente, clave?: string) => guardarCliente(paraClientes, sesion, registro, clave),
        guardarProducto: (sesion: Sesion, registro: Producto) => guardarProducto(r.productos, sesion, registro),
        registrarCompra: (tiendaId: number, entrada: Omit<Venta, 'id'>) => registrarCompra(paraVentas, tiendaId, entrada, bus.publicar),
        registrarCobranza: (tiendaId: number, pedido: Parameters<typeof registrarCobranza>[2]) => registrarCobranza(paraCobranza, tiendaId, pedido, bus.publicar),
        emitirCorte: (tiendaId: number, clienteId: number, periodo: string, ahora?: string) => emitirCorte(paraCortes, tiendaId, clienteId, periodo, ahora),
        emitirCortesPendientes: (ahora?: string) => emitirCortesPendientes(paraCortes, ahora),
    };
}
export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;
