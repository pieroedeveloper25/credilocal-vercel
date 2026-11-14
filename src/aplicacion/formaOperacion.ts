import type { Operacion } from './ejecutarOperacion';
import { exigir } from '../shared/dominio/validaciones';

/** Tipos admitidos; el sufijo ? indica campo opcional. */
type Tipo = 'texto' | 'entero' | 'booleano' | 'texto?' | 'entero?' | 'booleano?';
interface Esquema { [campo: string]: Tipo | Esquema | [Esquema] | Opcional }
/** Objeto anidado que puede omitirse; los demás objetos anidados son obligatorios. */
class Opcional { constructor(readonly esquema: Esquema) { } }

const MAX_TEXTO = 600;
const MAX_IMAGEN = 3_000_000;
const MAX_LINEAS = 100;
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Comprueba que `valor` tenga la forma del esquema y devuelve una copia solo con los campos del esquema.
 * Así un campo desconocido, o de otro tipo, no entra a los casos de uso ni a la base.
 */
function tomar(valor: unknown, esquema: Esquema, nombre: string): any {
    exigir(esObjeto(valor), `${nombre}: formato inválido.`);
    const copia: Record<string, unknown> = {};
    for (const [campo, tipo] of Object.entries(esquema)) {
        const v = valor[campo];
        const etiqueta = `${nombre}.${campo}`;
        if (Array.isArray(tipo)) {
            exigir(Array.isArray(v) && v.length >= 1 && v.length <= MAX_LINEAS, `${etiqueta}: lista inválida.`);
            copia[campo] = v.map((x, i) => tomar(x, tipo[0], `${etiqueta}[${i}]`));
            continue;
        }
        if (tipo instanceof Opcional) {
            if (v !== undefined && v !== null)
                copia[campo] = tomar(v, tipo.esquema, etiqueta);
            continue;
        }
        if (typeof tipo === 'object') {
            copia[campo] = tomar(v, tipo, etiqueta);
            continue;
        }
        const opcional = tipo.endsWith('?');
        if (opcional && (v === undefined || v === null))
            continue;
        const base = tipo.replace('?', '');
        if (base === 'texto')
            exigir(typeof v === 'string' && v.length <= (campo === 'imagen' ? MAX_IMAGEN : MAX_TEXTO), `${etiqueta}: texto inválido o demasiado largo.`);
        else if (base === 'entero')
            exigir(Number.isSafeInteger(v), `${etiqueta}: número entero inválido.`);
        else
            exigir(typeof v === 'boolean', `${etiqueta}: valor lógico inválido.`);
        copia[campo] = v;
    }
    return copia;
}

const CLIENTE: Esquema = {
    id: 'entero', nombre: 'texto', tipoDoc: 'texto', doc: 'texto', limite: 'texto', deuda: 'texto?', diaCorte: 'entero', diaPago: 'entero', plazo: 'entero',
    moneda: 'texto', tipoC: 'texto', valC: 'texto', capC: 'texto', tipoM: 'texto', valM: 'texto', capM: 'texto',
    tiendaId: 'entero?', activo: 'booleano?', direccion: 'texto?', telefono: 'texto?', correo: 'texto?', horaCorte: 'texto?', saldoComprometido: 'texto?',
};
const TOPE: Esquema = { id: 'entero', moneda: 'texto', compensatorioMax: 'texto', moratorioMax: 'texto', vigenteDesde: 'texto' };
const PRODUCTO: Esquema = {
    sku: 'texto', nombre: 'texto', unidad: 'texto', marca: 'texto', contado: 'texto', credito: 'texto', modalidad: 'texto',
    tiendaId: 'entero?', activo: 'booleano?', imagen: 'texto?', proveedor: 'texto?', descripcion: 'texto?',
    imagenCredito: new Opcional({ autor: 'texto', licencia: 'texto', urlFuente: 'texto', urlLicencia: 'texto', nota: 'texto?' }),
};
const TIENDA: Esquema = {
    id: 'entero', ruc: 'texto', razon: 'texto', nombre: 'texto', giro: 'texto', direccion: 'texto', telefono: 'texto', correo: 'texto', activa: 'booleano',
};
const VENTA: Esquema = {
    clienteId: 'entero', fecha: 'texto', hora: 'texto?', horaCorte: 'texto?', capital: 'texto', modalidad: 'texto', n: 'entero', detalle: 'texto',
    items: [{ sku: 'texto', cantidad: 'texto', precio: 'texto?', nombre: 'texto?' }],
};
const PAGO: Esquema = { clienteId: 'entero', periodo: 'texto', fecha: 'texto', hora: 'texto?', abono: 'texto' };
const CORTE: Esquema = { clienteId: 'entero', periodo: 'texto' };

/** Valida el cuerpo de POST /api/operacion y lo convierte en una Operacion con solo los campos esperados. */
export function operacionDe(cuerpo: Record<string, unknown>): Operacion {
    exigir(typeof cuerpo.accion === 'string' && esObjeto(cuerpo.pedido), 'Operación inválida.');
    const p = cuerpo.pedido;
    switch (cuerpo.accion) {
        case 'GUARDAR TIENDA':
            return { accion: cuerpo.accion, pedido: tomar(p, { registro: TIENDA, clave: 'texto?' }, 'pedido') };
        case 'GUARDAR TOPES':
            return { accion: cuerpo.accion, pedido: tomar(p, { registro: TOPE }, 'pedido') };
        case 'GUARDAR CLIENTE':
            return { accion: cuerpo.accion, pedido: tomar(p, { registro: CLIENTE, clave: 'texto?' }, 'pedido') };
        case 'GUARDAR PRODUCTO':
            return { accion: cuerpo.accion, pedido: tomar(p, { registro: PRODUCTO }, 'pedido') };
        case 'REGISTRAR VENTA':
            return { accion: cuerpo.accion, pedido: tomar(p, VENTA, 'pedido') };
        case 'REGISTRAR PAGO':
            return { accion: cuerpo.accion, pedido: tomar(p, PAGO, 'pedido') };
        case 'EMITIR CORTE':
            return { accion: cuerpo.accion, pedido: tomar(p, CORTE, 'pedido') };
        default:
            exigir(false, 'Operación no permitida.');
    }
}
