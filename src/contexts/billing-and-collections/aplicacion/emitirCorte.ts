import type { ListadoCorte } from '../dominio/modelos';
import { contextoListado, corteDelPeriodo, liquidarObligaciones } from '../dominio/obligaciones';
import type { ClientesDeCobranza, RepositorioListados, RepositorioObligaciones, VentasDeCobranza } from '../dominio/repositorios';
import type { RegistroDeAuditoria } from '../../../shared/aplicacion/puertos';
import { D } from '../../../shared/dominio/decimal';
import { isoFecha, relojPeru } from '../../../shared/dominio/fechas';
import { exigir } from '../../../shared/dominio/validaciones';
export interface DependenciasCortes { clientes: ClientesDeCobranza; obligaciones: RepositorioObligaciones; listados: RepositorioListados; ventas: VentasDeCobranza; auditoria: RegistroDeAuditoria }
export function emitirCorte(deps: DependenciasCortes, tiendaId: number, clienteId: number, periodo: string, ahora = relojPeru()) {
    const d = { obligaciones: deps.obligaciones.todas() };
    const c = deps.clientes.buscar(tiendaId, clienteId);
    exigir(c, 'Cliente ajeno a la tienda.');
    const corte = corteDelPeriodo(d, c, periodo);
    exigir(ahora >= corte, 'El corte todavía no ha llegado. Puede consultar la proyección.');
    // Las compras todavía por vencer no generan mora futura al emitir el corte.
    const l = liquidarObligaciones(d, c, periodo, corte.slice(0, 10), corte);
    const lineas: ListadoCorte['lineas'] = [];
    for (const o of l.lineas) {
        const base = { obligacionId: o.id, fechaCompra: o.fechaCompra, detalle: o.detalle };
        lineas.push({ ...base, concepto: o.cuota ? `Capital cuota ${o.cuota}` : 'Capital', importe: o.capital }, { ...base, concepto: 'Interés compensatorio', importe: o.comp });
        if (D(o.mora).gt(0))
            lineas.push({ ...base, concepto: 'Interés por mora', importe: o.mora });
    }
    for (const fila of lineas) {
        const o = l.lineas.find(o => o.id === fila.obligacionId)!;
        Object.assign(fila, contextoListado(o, fila.concepto, corte.slice(0, 10)));
    }
    const monedas = [...new Set(l.lineas.map(o => o.moneda))];
    exigir(monedas.length <= 1, 'El corte reúne operaciones de distintas monedas. Mantenga una moneda por cuenta.');
    const anterior = deps.listados.porId(`${tiendaId}:${clienteId}:${periodo}`);
    const moneda = monedas[0] ?? anterior?.moneda ?? deps.ventas.monedaPactada(clienteId, tiendaId, periodo) ?? c.moneda;
    const listado: ListadoCorte = { id: `${tiendaId}:${clienteId}:${periodo}`, clienteId, tiendaId, periodo, corte, fechaPago: isoFecha(l.vencimiento), moneda, lineas, capital: l.capital.toFixed(2), comp: l.comp.toFixed(2), mora: l.mora.toFixed(2), total: l.total.toFixed(2) };
    deps.listados.guardar(listado);
    return listado;
}
/** Serializa con las propiedades ordenadas: dos listados iguales coinciden aunque la base devuelva otro orden. */
function canonico(valor: unknown): string {
    return JSON.stringify(valor, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
        : v);
}
/** Recupera y actualiza cortes; el servidor decide cuándo invocar este caso de uso. */
export function emitirCortesPendientes(deps: DependenciasCortes, ahora = relojPeru()) {
    let cambios = 0;
    for (const c of deps.clientes.todos()) {
        const obs = deps.obligaciones.todas().filter(o => o.clienteId === c.id && o.tiendaId === c.tiendaId);
        if (!obs.length)
            continue;
        const inicio = obs.map(o => o.corteAsignado.slice(0, 7)).sort()[0];
        const [iy, im] = inicio.split('-').map(Number);
        for (let y = iy, m = im; `${y}-${String(m).padStart(2, '0')}` <= ahora.slice(0, 7); m === 12 ? (y++, m = 1) : m++) {
            const periodo = `${y}-${String(m).padStart(2, '0')}`;
            const corte = corteDelPeriodo({ obligaciones: deps.obligaciones.todas() }, c, periodo);
            if (corte > ahora)
                break;
            const id = `${c.tiendaId}:${c.id}:${periodo}`;
            const anterior = canonico(deps.listados.porId(id));
            const actualizado = emitirCorte(deps, c.tiendaId!, c.id, periodo, ahora);
            if (anterior !== canonico(actualizado)) {
                cambios++;
                deps.auditoria.registrar({ fecha: ahora, actor: 'Sistema', accion: `EMITIR CORTE ${id}` });
            }
        }
    }
    return cambios;
}
