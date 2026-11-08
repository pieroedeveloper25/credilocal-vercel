import type { Cliente } from './modelos';

export interface RepositorioClientes {
    porId(id: number): Cliente | undefined;
    delaTienda(tiendaId: number): Cliente[];
    todos(): Cliente[];
    siguienteId(): number;
    /** Inserta el cliente o reemplaza el que tiene el mismo id. */
    guardar(cliente: Cliente): void;
}

/** Lo que clientes pide al contexto de identidad para gestionar el acceso de un cliente a su cuenta. */
export interface AccesoDeClientes {
    exigirCorreoDisponible(correo: string, tiendaId: number, clienteId: number): void;
    tieneAcceso(clienteId: number): boolean;
    crear(correo: string, clave: string, tiendaId: number, clienteId: number): Promise<void>;
    cambiarCorreo(clienteId: number, correo: string): void;
    quitar(clienteId: number): void;
}

/** Lo que clientes pregunta a originación para decidir si puede cambiar la moneda. */
export interface HistorialDeCompras {
    huboComprasEnElMes(clienteId: number, mes: string): boolean;
}
