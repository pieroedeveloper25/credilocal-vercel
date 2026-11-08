export const normalizarCorreo = (s: string) => s.trim().toLowerCase();

export const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const horaValida = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Incumplimiento de una regla: su mensaje está pensado para mostrarse a la persona usuaria. */
export class ErrorDeDominio extends Error {
    constructor(mensaje: string) {
        super(mensaje);
        this.name = 'ErrorDeDominio';
    }
}

/** Falta de sesión válida; el servidor lo responde con 401. */
export class ErrorDeSesion extends ErrorDeDominio {
    constructor(mensaje = 'Inicie sesión.') {
        super(mensaje);
        this.name = 'ErrorDeSesion';
    }
}

export function exigir(ok: unknown, mensaje: string): asserts ok { if (!ok)
    throw new ErrorDeDominio(mensaje); }

export const activo = (c: {
    activo?: boolean;
}) => c.activo !== false;

/** Siguiente identificador libre, nunca menor que `desde`. Recorre la lista sin expandirla (sirve para listas grandes). */
export const siguienteId = (l: {
    id: number;
}[], desde = 0) => l.reduce((mayor, x) => Math.max(mayor, x.id), desde - 1) + 1;

export function texto(s: string | undefined, min: number, max: number, nombre: string) {
    exigir((s ?? '').trim().length >= min && (s ?? '').length <= max, `${nombre}: entre ${min} y ${max} caracteres.`);
}

export function telefono(s: string | undefined) {
    exigir(/^[+\d]{0,20}$/.test(s ?? ''), 'El teléfono admite hasta 20 caracteres, solo dígitos y +.');
}

export function decimalEntrada(s: string, enteros: number, decimales: number) {
    return new RegExp(`^\\d{1,${enteros}}(\\.\\d{1,${decimales}})?$`).test(s);
}
