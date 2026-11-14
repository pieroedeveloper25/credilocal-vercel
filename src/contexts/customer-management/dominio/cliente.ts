import type { Cliente, TopeTasa } from './modelos';
import { saldoComprometidoDe } from './lineaCredito';
import { validarCliente } from './validaciones';
import { D } from '../../../shared/dominio/decimal';
import { exigir, normalizarCorreo } from '../../../shared/dominio/validaciones';

/** Lo que hace falta saber del exterior para modificar un cliente. `huboComprasEnElMes` solo se consulta si cambia la moneda. */
export interface ContextoDeModificacion {
    otrosDeLaTienda: Cliente[];
    huboComprasEnElMes: () => boolean;
    topes?: TopeTasa[];
}

/**
 * Cliente de una tienda y su línea de crédito. Es la raíz del agregado: toda modificación pasa por sus métodos, que
 * hacen cumplir las reglas del cliente y devuelven una versión nueva sin alterar la anterior.
 */
export class ClienteAgregado {
    private constructor(private readonly estado: Readonly<Cliente>) { }

    /** Reconstruye el agregado desde lo guardado; no vuelve a validar datos que ya fueron aceptados. */
    static reconstituir(guardado: Cliente) {
        return new ClienteAgregado({ ...guardado });
    }

    /** Alta de un cliente: nace sin capital comprometido y con el correo normalizado. */
    static registrar(id: number, tiendaId: number, datos: Cliente, otrosDeLaTienda: Cliente[], topes: TopeTasa[] = []) {
        const nuevo: Cliente = { ...datos, id, tiendaId, saldoComprometido: '0.00', correo: normalizarCorreo(datos.correo ?? '') };
        validarCliente(nuevo, otrosDeLaTienda, topes);
        return new ClienteAgregado(nuevo);
    }

    get id() { return this.estado.id; }
    get tiendaId() { return this.estado.tiendaId; }
    get correo() { return this.estado.correo ?? ''; }
    /** Copia de los datos del cliente para guardarlos o mostrarlos. */
    get datos(): Cliente { return { ...this.estado }; }
    get saldoComprometido() { return saldoComprometidoDe(this.estado); }
    get lineaDisponible() { return D(this.estado.limite).minus(this.saldoComprometido); }

    perteneceA(tiendaId: number) { return this.estado.tiendaId === tiendaId; }

    /** El cliente cambia sus datos. No puede cambiar de moneda con deuda pendiente ni en un mes con compras. */
    modificar(datos: Cliente, contexto: ContextoDeModificacion) {
        const cambiaMoneda = this.estado.moneda !== datos.moneda;
        exigir(!cambiaMoneda || D(this.saldoComprometido).isZero(), 'No cambie la moneda mientras existan obligaciones pendientes.');
        exigir(!cambiaMoneda || !contexto.huboComprasEnElMes(), 'Cambie la moneda a partir de un mes sin operaciones previas para no mezclar monedas en el corte.');
        const nuevo: Cliente = { ...datos, id: this.estado.id, tiendaId: this.estado.tiendaId, saldoComprometido: this.estado.saldoComprometido ?? '0.00', correo: normalizarCorreo(datos.correo ?? '') };
        // Los topes rigen al pactar o cambiar tasas: un cliente con condiciones anteriores puede seguir editando sus demás datos.
        const cambiaTasas = cambiaMoneda || (['tipoC', 'valC', 'capC', 'tipoM', 'valM', 'capM'] as const).some(k => this.estado[k] !== datos[k]);
        validarCliente(nuevo, contexto.otrosDeLaTienda, cambiaTasas ? contexto.topes : []);
        return new ClienteAgregado(nuevo);
    }

    /** Una venta a crédito compromete su capital en la línea. */
    comprometer(capital: string) {
        return new ClienteAgregado({ ...this.estado, saldoComprometido: D(this.saldoComprometido).plus(capital).toFixed(2) });
    }

    /** Cobranzas informa el capital que sigue pendiente; la línea se libera en lo cobrado. */
    sincronizarSaldo(saldoPendiente: string) {
        return new ClienteAgregado({ ...this.estado, saldoComprometido: saldoPendiente });
    }
}
