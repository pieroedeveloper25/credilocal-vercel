/** Modalidad de la venta que originó la obligación. */
export type Modalidad = 'Fin de mes' | 'Cuotas';

/** Lo que cobranzas necesita saber del cliente: una interfaz propia y mínima. */
export interface ClienteDeCobranza {
    id: number;
    tiendaId?: number;
    diaCorte: number;
    diaPago: number;
    horaCorte?: string;
    moneda: 'PEN' | 'USD';
}

/** Capital original de una venta, necesario para prorratear la línea que aún consume. */
export interface VentaCobrable {
    id: number;
    clienteId: number;
    tiendaId?: number;
    capital: string;
}
export interface Pago {
    clienteId: number;
    tiendaId?: number;
    periodo?: string;
    capital: string;
    constancia: string;
    fecha?: string;
    hora?: string;
    abono?: string;
    comp?: string;
    mora?: string;
    moneda?: string;
    detalles?: DetallePago[];
}

export interface Obligacion {
    id: string;
    tiendaId: number;
    clienteId: number;
    ventaId: number;
    modalidad: Modalidad;
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
    pagada?: string;
    fechaPago?: string;
    horaPago?: string;
}

export interface DetallePago {
    obligacionId: string;
    capital: string;
    comp: string;
    mora: string;
}

export interface LineaDeuda extends Obligacion {
    mora: string;
    total: string;
    dias: number;
    diasMora: number;
}

export interface ListadoCorte {
    id: string;
    clienteId: number;
    tiendaId: number;
    periodo: string;
    corte: string;
    fechaPago: string;
    moneda: string;
    lineas: {
        obligacionId: string;
        fechaCompra: string;
        detalle: string;
        concepto: string;
        importe: string;
        vencimiento?: string;
        dias?: number;
        tasa?: string;
        baseTasa?: string;
    }[];
    capital: string;
    comp: string;
    mora: string;
    total: string;
}
