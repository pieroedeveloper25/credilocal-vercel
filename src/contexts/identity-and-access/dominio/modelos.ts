export type Rol = 'Superadministrador' | 'Comercio' | 'Cliente';

export interface Cuenta {
    id: number;
    rol: Rol;
    tiendaId?: number;
    clienteId?: number;
    correo: string;
    sal: string;
    hash: string;
    /** true mientras la clave es la inicial entregada por el sistema; debe cambiarse antes de operar. */
    claveProvisional?: boolean;
}

export interface Tienda {
    id: number;
    ruc: string;
    razon: string;
    nombre: string;
    giro: string;
    direccion: string;
    telefono: string;
    correo: string;
    activa: boolean;
}

export interface Sesion {
    rol: Rol;
    clienteId: number;
    tiendaId: number;
    correo: string;
    claveProvisional?: boolean;
}
