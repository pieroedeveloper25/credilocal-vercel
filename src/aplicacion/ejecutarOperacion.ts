import type { CasosDeUso } from './casosDeUso';
import type { Venta } from '../contexts/credit-origination/dominio/modelos';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import type { Sesion, Tienda } from '../contexts/identity-and-access/dominio/modelos';
import type { Producto } from '../contexts/product-catalog/dominio/modelos';
import { exigir } from '../shared/dominio/validaciones';
export type Operacion = {
    accion: 'GUARDAR TIENDA';
    pedido: {
        registro: Tienda;
        clave?: string;
    };
} | {
    accion: 'GUARDAR CLIENTE';
    pedido: {
        registro: Cliente;
        clave?: string;
    };
} | {
    accion: 'GUARDAR PRODUCTO';
    pedido: {
        registro: Producto;
    };
} | {
    accion: 'REGISTRAR VENTA';
    pedido: Omit<Venta, 'id'>;
} | {
    accion: 'REGISTRAR PAGO';
    pedido: Parameters<CasosDeUso['registrarCobranza']>[1];
} | {
    accion: 'EMITIR CORTE';
    pedido: {
        clienteId: number;
        periodo: string;
    };
};
/** Selecciona el caso de uso y exige el perfil antes de ejecutar sus cambios. */
export async function ejecutarOperacion(casos: CasosDeUso, sesion: Sesion, operacion: Operacion) {
    if (operacion.accion === 'GUARDAR TIENDA') {
        exigir(sesion.rol === 'Superadministrador', 'Solo el administrador del sistema gestiona tiendas.');
        return casos.guardarTienda(operacion.pedido.registro, operacion.pedido.clave);
    }
    // Una acción desconocida no debe adquirir permisos por entrar en este despachador.
    const accionesComercio = ['GUARDAR CLIENTE', 'GUARDAR PRODUCTO', 'REGISTRAR VENTA', 'REGISTRAR PAGO', 'EMITIR CORTE'];
    exigir(accionesComercio.includes(operacion.accion), 'Operación no permitida.');
    exigir(sesion.rol === 'Comercio', 'Esta operación requiere el perfil Comercio.');
    switch (operacion.accion) {
        case 'GUARDAR CLIENTE':
            return casos.guardarCliente(sesion, operacion.pedido.registro, operacion.pedido.clave);
        case 'GUARDAR PRODUCTO':
            return casos.guardarProducto(sesion, operacion.pedido.registro);
        case 'REGISTRAR VENTA':
            return casos.registrarCompra(sesion.tiendaId, operacion.pedido);
        case 'REGISTRAR PAGO':
            return casos.registrarCobranza(sesion.tiendaId, operacion.pedido);
        case 'EMITIR CORTE':
            return casos.emitirCorte(sesion.tiendaId, operacion.pedido.clienteId, operacion.pedido.periodo);
    }
}
