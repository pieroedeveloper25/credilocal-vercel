// Genera vercel.json con las cabeceras de seguridad. La política de contenido permite solo los scripts en línea
// que trae el propio index.html, identificados por su hash, y el resto de recursos del mismo origen.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('dist/index.html', 'utf8');
const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
const politica = ["default-src 'self'", `script-src 'self' ${hashes.join(' ')}`.trim(), "style-src 'self' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');

const configuracion = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    headers: [{
        source: '/(.*)',
        headers: [
            { key: 'Content-Security-Policy', value: politica },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'no-referrer' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
    }],
    rewrites: [{ source: '/((?!api/).*)', destination: '/index.html' }],
    // 05:00 UTC equivale a 00:00 en Lima: el corte de día se revisa al inicio de cada día.
    crons: [{ path: '/api/cron/cortes', schedule: '0 5 * * *' }],
};
writeFileSync('vercel.json', JSON.stringify(configuracion, null, 2) + '\n');
console.log(`vercel.json generado; scripts en línea permitidos: ${hashes.length}`);
