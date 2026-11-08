import type { Sesion } from '../../identity-and-access/dominio/modelos';
import type { Producto } from '../dominio/modelos';
import type { RepositorioProductos } from '../dominio/repositorios';
import { validarProducto } from '../dominio/validaciones';
export function guardarProducto(productos: RepositorioProductos, sesion: Sesion, registro: Producto) {
    const nuevo = { ...registro, tiendaId: sesion.tiendaId };
    validarProducto(nuevo);
    productos.guardar(nuevo);
}
