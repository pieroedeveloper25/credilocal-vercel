import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep, extname } from 'node:path';
const CABECERAS_BASE = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
};
/** Política de contenido: solo recursos propios, las fuentes de Google y los scripts en línea que trae el propio index.html. */
function politicaDeContenido(html: string) {
    const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
    return ["default-src 'self'", `script-src 'self' ${hashes.join(' ')}`.trim(), "style-src 'self' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
}
/** Sirve únicamente la compilación pública dist, nunca fuentes ni la base SQLite. */
export function servirArchivos(req: IncomingMessage, res: ServerResponse, url: URL) {
    if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
    }
    const raiz = resolve('dist');
    let archivo = resolve(raiz, '.' + decodeURIComponent(url.pathname));
    if (archivo !== raiz && !archivo.startsWith(raiz + sep)) {
        res.writeHead(403);
        res.end();
        return;
    }
    if (!existsSync(archivo) || !statSync(archivo).isFile())
        archivo = resolve(raiz, 'index.html');
    if (!existsSync(archivo)) {
        res.writeHead(503);
        res.end('Ejecute npm run build antes de iniciar.');
        return;
    }
    const tipos: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
    const contenido = readFileSync(archivo);
    const esHtml = extname(archivo) === '.html';
    res.writeHead(200, {
        'Content-Type': tipos[extname(archivo)] ?? 'application/octet-stream',
        ...CABECERAS_BASE,
        // El HTML siempre se revalida; los archivos de /assets/ llevan hash en el nombre y no cambian.
        'Cache-Control': esHtml ? 'no-cache' : archivo.startsWith(resolve(raiz, 'assets') + sep) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        ...(esHtml ? { 'Content-Security-Policy': politicaDeContenido(contenido.toString('utf8')) } : {}),
    });
    res.end(contenido);
}
