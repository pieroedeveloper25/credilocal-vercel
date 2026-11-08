import type { ClienteComprador, Venta } from './modelos';

export interface RepositorioVentas {
    siguienteId(): number;
    agregar(venta: Venta): void;
}

/** Producto tal como lo necesita una venta. */
export interface ProductoVendible {
    sku: string;
    nombre: string;
    credito: string;
    modalidad: 'Ambas' | 'Fin de mes' | 'Cuotas';
    activo?: boolean;
}

/** Lo que originación pide al catálogo y a clientes: solo lo que declara necesitar. */
export interface CatalogoDeVenta {
    buscar(tiendaId: number, sku: string): ProductoVendible | undefined;
}
export interface Compradores {
    buscar(tiendaId: number, clienteId: number): ClienteComprador | undefined;
}
