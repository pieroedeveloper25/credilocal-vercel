import type { IncomingMessage, ServerResponse } from 'node:http';
import { ErrorDeDominio } from '../../shared/dominio/validaciones';
/** Error de la solicitud con su propio código HTTP (413, 415...). Su mensaje es público. */
export class ErrorHttp extends ErrorDeDominio {
    constructor(readonly estado: number, mensaje: string) {
        super(mensaje);
        this.name = 'ErrorHttp';
    }
}
export const LIMITE_CUERPO = 4 * 1024 * 1024;
export function enviar(res: ServerResponse, codigo: number, valor: unknown) {
    res.writeHead(codigo, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
    });
    res.end(JSON.stringify(valor));
}

/** Lee un cuerpo JSON de hasta 4 MB. Se acumulan bytes y se decodifica una sola vez, sin cortar caracteres multibyte. */
export async function cuerpo(req: IncomingMessage): Promise<Record<string, unknown>> {
    const declarado = Number(req.headers['content-length']);
    if (Number.isFinite(declarado) && declarado > LIMITE_CUERPO)
        throw new ErrorHttp(413, 'El contenido supera 4 MB.');
    const partes: Buffer[] = [];
    let total = 0;
    for await (const parte of req) {
        const trozo = Buffer.isBuffer(parte) ? parte : Buffer.from(parte);
        total += trozo.length;
        if (total > LIMITE_CUERPO)
            throw new ErrorHttp(413, 'El contenido supera 4 MB.');
        partes.push(trozo);
    }
    let valor: unknown;
    try {
        valor = JSON.parse(partes.length ? Buffer.concat(partes).toString('utf8') : '{}');
    }
    catch {
        throw new ErrorDeDominio('Solicitud JSON inválida.');
    }
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor))
        throw new ErrorDeDominio('La solicitud debe ser un objeto JSON.');
    return valor as Record<string, unknown>;
}
