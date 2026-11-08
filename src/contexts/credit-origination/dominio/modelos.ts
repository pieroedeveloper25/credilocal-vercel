export type TipoTasa = 'Nominal' | 'Efectiva';
export type Capitalizacion = 'Diaria' | 'Mensual';
export interface Compra {
    fecha: string;
    hora?: string;
    horaCorte?: string;
    detalle: string;
    capital: string;
}

/** Condiciones pactadas con el cliente en el momento de la venta; quedan congeladas en ella. */
export interface Condiciones {
    moneda: 'PEN' | 'USD';
    diaCorte: number;
    diaPago: number;
    tipoC: TipoTasa;
    valC: string;
    capC: Capitalizacion;
    tipoM: TipoTasa;
    valM: string;
    capM: Capitalizacion;
    horaCorte: string;
}

/**
 * Lo que este contexto necesita saber de quien compra. Es una interfaz propia y mínima: otros contextos
 * la satisfacen sin que este conozca su modelo.
 */
export interface ClienteComprador extends Omit<Condiciones, 'horaCorte'> {
    id: number;
    tiendaId?: number;
    activo?: boolean;
    limite: string;
    plazo: number;
    horaCorte?: string;
    /** Capital que el cliente ya tiene comprometido en su línea. */
    saldoComprometido?: string;
}

/** Cuota o pago único pactado por una venta; cobranzas lo recibe como obligación. */
export interface ObligacionPactada {
    id: string;
    tiendaId: number;
    clienteId: number;
    ventaId: number;
    modalidad: Venta['modalidad'];
    cuota: number;
    fechaCompra: string;
    hora: string;
    detalle: string;
    vencimiento: string;
    corteAsignado: string;
    capital: string;
    comp: string;
    tedComp?: string;
    temComp?: string;
    tedMora: string;
    moneda: string;
}

export interface ItemVenta {
    sku: string;
    cantidad: string;
    precio?: string;
    /** Descripción del producto aplicada al registrar la venta. */
    nombre?: string;
}

export interface Venta {
    condiciones?: Condiciones;
    items?: ItemVenta[];
    plan?: {
        diasGracia: number;
        capitalAjustado: string;
        cuotaFija: string;
        totalIntereses: string;
        totalCuotas: string;
    };
    tiendaId?: number;
    hora?: string;
    horaCorte?: string;
    id: number;
    clienteId: number;
    fecha: string;
    capital: string;
    modalidad: 'Fin de mes' | 'Cuotas';
    n: number;
    detalle: string;
}
