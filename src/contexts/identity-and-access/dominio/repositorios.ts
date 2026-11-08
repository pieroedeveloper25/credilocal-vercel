import type { Cuenta, Tienda } from './modelos';

export interface RepositorioTiendas {
    todas(): Tienda[];
    porId(id: number): Tienda | undefined;
    /** Identificador libre; la 0 es del administrador del sistema. */
    siguienteId(): number;
    /** Inserta la tienda o reemplaza la que tiene el mismo id. */
    guardar(tienda: Tienda): void;
}

export interface RepositorioCuentas {
    todas(): Cuenta[];
    siguienteId(): number;
    agregar(cuenta: Cuenta): void;
    /** Reemplaza la cuenta que tiene el mismo id. */
    reemplazar(cuenta: Cuenta): void;
    eliminar(id: number): void;
}
