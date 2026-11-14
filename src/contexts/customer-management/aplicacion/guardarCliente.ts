import { ClienteAgregado } from '../dominio/cliente';
import type { Cliente } from '../dominio/modelos';
import type { AccesoDeClientes, HistorialDeCompras, RepositorioClientes, RepositorioTopes } from '../dominio/repositorios';
import type { Sesion } from '../../identity-and-access/dominio/modelos';
import { relojPeru } from '../../../shared/dominio/fechas';
import { exigir } from '../../../shared/dominio/validaciones';
export interface DependenciasGuardarCliente { clientes: RepositorioClientes; acceso: AccesoDeClientes; historial: HistorialDeCompras; topes: RepositorioTopes }
export async function guardarCliente(deps: DependenciasGuardarCliente, sesion: Sesion, registro: Cliente, clave: string | undefined) {
    const { clientes, acceso, historial, topes } = deps;
    // Los identificadores los asigna el servidor: un id negativo es un cliente nuevo y cualquier otro debe existir.
    const nuevoCliente = registro.id < 0;
    const id = nuevoCliente ? clientes.siguienteId() : registro.id;
    const previa = clientes.porId(id);
    exigir(nuevoCliente || previa, 'El cliente no existe.');
    const otrosDeLaTienda = clientes.delaTienda(sesion.tiendaId);
    let cliente: ClienteAgregado;
    if (previa) {
        const existente = ClienteAgregado.reconstituir(previa);
        exigir(existente.perteneceA(sesion.tiendaId), 'El cliente no pertenece a la tienda.');
        cliente = existente.modificar(registro, { otrosDeLaTienda, huboComprasEnElMes: () => historial.huboComprasEnElMes(id, relojPeru().slice(0, 7)), topes: topes.todos() });
    }
    else {
        cliente = ClienteAgregado.registrar(id, sesion.tiendaId, registro, otrosDeLaTienda, topes.todos());
    }
    if (cliente.correo) {
        acceso.exigirCorreoDisponible(cliente.correo, sesion.tiendaId, id);
        if (!acceso.tieneAcceso(id)) {
            exigir(clave, 'Ingrese la contraseña inicial para el acceso del cliente.');
            await acceso.crear(cliente.correo, clave, sesion.tiendaId, id);
        }
        else {
            acceso.cambiarCorreo(id, cliente.correo);
        }
    }
    else {
        acceso.quitar(id);
    }
    clientes.guardar(cliente.datos);
}
