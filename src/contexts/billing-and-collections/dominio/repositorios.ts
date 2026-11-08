import type { ClienteDeCobranza, ListadoCorte, Obligacion, Pago, VentaCobrable } from './modelos';

export interface RepositorioObligaciones {
    todas(): Obligacion[];
    agregar(obligaciones: Obligacion[]): void;
    /** Reemplaza la obligación que tiene el mismo id. */
    guardar(obligacion: Obligacion): void;
}
export interface RepositorioPagos {
    /** Número correlativo del próximo pago; forma parte de la constancia. */
    siguienteNumero(): number;
    agregar(pago: Pago): void;
}
export interface RepositorioListados {
    porId(id: string): ListadoCorte | undefined;
    /** Inserta el listado o reemplaza el que tiene el mismo id. */
    guardar(listado: ListadoCorte): void;
}

/** Lo que cobranzas pide a clientes y a originación: solo lo que declara necesitar. */
export interface ClientesDeCobranza {
    buscar(tiendaId: number, clienteId: number): ClienteDeCobranza | undefined;
    todos(): ClienteDeCobranza[];
}
export interface VentasDeCobranza {
    cobrables(): VentaCobrable[];
    /** Moneda pactada en la compra más reciente hasta el periodo, si hubo alguna. */
    monedaPactada(clienteId: number, tiendaId: number, hastaPeriodo: string): 'PEN' | 'USD' | undefined;
}
