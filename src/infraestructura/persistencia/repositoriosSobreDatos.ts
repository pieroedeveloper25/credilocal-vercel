/**
 * Implementa los repositorios de cada agregado sobre la fotografía `Datos` de la unidad de trabajo.
 * Los cambios quedan en memoria hasta que la unidad de trabajo guarda la fotografía en SQLite.
 */
import type { Repositorios } from '../../aplicacion/repositorios';
import type { Datos } from '../../shared/dominio/datos';
import { siguienteId } from '../../shared/dominio/validaciones';

/** Inserta el elemento o reemplaza, en su misma posición, el que cumple el criterio. */
function guardarEn<T>(lista: T[], elemento: T, es: (x: T) => boolean) {
    const i = lista.findIndex(es);
    if (i < 0)
        lista.push(elemento);
    else
        lista[i] = elemento;
}

export function repositoriosSobre(datos: Datos): Repositorios {
    return {
        tiendas: {
            todas: () => datos.tiendas,
            porId: id => datos.tiendas.find(t => t.id === id),
            siguienteId: () => siguienteId(datos.tiendas, 1),
            guardar: tienda => guardarEn(datos.tiendas, tienda, t => t.id === tienda.id),
        },
        cuentas: {
            todas: () => datos.cuentas,
            siguienteId: () => siguienteId(datos.cuentas),
            agregar: cuenta => void datos.cuentas.push(cuenta),
            reemplazar: cuenta => guardarEn(datos.cuentas, cuenta, c => c.id === cuenta.id),
            eliminar: id => { datos.cuentas = datos.cuentas.filter(c => c.id !== id); },
        },
        clientes: {
            porId: id => datos.clientes.find(c => c.id === id),
            delaTienda: tiendaId => datos.clientes.filter(c => c.tiendaId === tiendaId),
            todos: () => datos.clientes,
            siguienteId: () => siguienteId(datos.clientes),
            guardar: cliente => guardarEn(datos.clientes, cliente, c => c.id === cliente.id),
        },
        topes: {
            todos: () => (datos.topes ??= []),
            guardar: tope => guardarEn(datos.topes ??= [], tope, t => t.id === tope.id),
        },
        productos: {
            buscar: (tiendaId, sku) => datos.productos.find(p => p.tiendaId === tiendaId && p.sku === sku),
            guardar: producto => guardarEn(datos.productos, producto, p => p.tiendaId === producto.tiendaId && p.sku === producto.sku),
        },
        ventas: {
            todas: () => datos.ventas,
            siguienteId: () => siguienteId(datos.ventas, 2026001),
            agregar: venta => void datos.ventas.push(venta),
        },
        obligaciones: {
            todas: () => (datos.obligaciones ??= []),
            agregar: obligaciones => void (datos.obligaciones ??= []).push(...obligaciones),
            guardar: obligacion => guardarEn(datos.obligaciones ??= [], obligacion, o => o.id === obligacion.id),
        },
        pagos: {
            siguienteNumero: () => datos.pagos.length + 1,
            agregar: pago => void datos.pagos.push(pago),
        },
        listados: {
            porId: id => datos.listados?.find(l => l.id === id),
            guardar: listado => guardarEn(datos.listados ??= [], listado, l => l.id === listado.id),
        },
        auditoria: {
            registrar: entrada => void datos.auditoria.push(entrada),
        },
    };
}
