/** Todos los repositorios que la aplicación necesita, uno por agregado. Cada contexto define el suyo; infraestructura los implementa. */
import type { RepositorioListados, RepositorioObligaciones, RepositorioPagos } from '../contexts/billing-and-collections/dominio/repositorios';
import type { RepositorioVentas } from '../contexts/credit-origination/dominio/repositorios';
import type { RepositorioClientes, RepositorioTopes } from '../contexts/customer-management/dominio/repositorios';
import type { RepositorioCuentas, RepositorioTiendas } from '../contexts/identity-and-access/dominio/repositorios';
import type { Venta } from '../contexts/credit-origination/dominio/modelos';
import type { RepositorioProductos } from '../contexts/product-catalog/dominio/repositorios';
import type { RegistroDeAuditoria } from '../shared/aplicacion/puertos';

export interface Repositorios {
    tiendas: RepositorioTiendas;
    cuentas: RepositorioCuentas;
    clientes: RepositorioClientes;
    topes: RepositorioTopes;
    productos: RepositorioProductos;
    ventas: RepositorioVentas & { todas(): Venta[] };
    obligaciones: RepositorioObligaciones;
    pagos: RepositorioPagos;
    listados: RepositorioListados;
    auditoria: RegistroDeAuditoria;
}
