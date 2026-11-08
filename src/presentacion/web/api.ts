let alVencerSesion: (() => void) | undefined;
export class ErrorDeApi extends Error {
    constructor(mensaje: string, public readonly segundosRestantes?: number) { super(mensaje); }
}
/** Registra qué hacer cuando el servidor responde 401 a una consulta hecha con sesión (por ejemplo, volver al acceso). */
export const alSesionVencida = (accion?: () => void) => { alVencerSesion = accion; };
export async function api<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    const r = await fetch(`/api/${ruta}`, { method: cuerpo === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const d = await r.json();
    if (r.status === 401 && ruta !== 'login' && ruta !== 'sesion' && ruta !== 'logout')
        alVencerSesion?.();
    if (!r.ok)
        throw new ErrorDeApi(d.error ?? 'No se pudo completar la operación.', d.segundosRestantes);
    return d;
}
