import type { Producto } from './modelos';

export interface RepositorioProductos {
    /** El SKU es único dentro de la tienda. */
    buscar(tiendaId: number, sku: string): Producto | undefined;
    /** Inserta el producto o reemplaza el que tiene el mismo SKU en su tienda. */
    guardar(producto: Producto): void;
}
