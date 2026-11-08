/** Servidor local de desarrollo: el mismo manejador de la API que en Vercel, sobre PGlite en una carpeta. */
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApi } from '../src/infraestructura/composicion/api';
import { poolPglite } from '../src/infraestructura/persistencia/poolPglite';
import { semillaLimpia } from '../src/infraestructura/inicializacion/semillaLimpia';
import { servirArchivos } from '../src/infraestructura/http/archivosEstaticos';
import type { Datos } from '../src/shared/dominio/datos';

export async function crearAplicacion(ruta = resolve('datos/pglite'), semilla: () => Promise<Datos> = () => semillaLimpia(process.env.CREDILOCAL_CLAVE_INICIAL), ahora?: () => string) {
    const api = await crearApi({ pool: await poolPglite(ruta), semilla, ahora, claveCron: process.env.CRON_SECRET });
    const servidor = createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        if (url.pathname.startsWith('/api/'))
            void api.manejar(req, res);
        else
            servirArchivos(req, res, url);
    });
    // Revisión periódica de cortes, como el cron diario de Vercel pero con mayor frecuencia en local.
    const revisarCortes = api.revisarCortes;
    const reloj = setInterval(() => {
        void revisarCortes().catch(error => console.error('No se pudo guardar el corte:', error.message));
    }, 30000);
    reloj.unref();
    return {
        servidor,
        revisarCortes,
        cerrar: async () => {
            clearInterval(reloj);
            await new Promise<void>(resolver => servidor.close(() => resolver()));
            await api.cerrar();
        },
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const app = await crearAplicacion(process.env.CREDILOCAL_DB ?? resolve('datos/pglite'));
    const puerto = Number(process.env.PORT ?? 3000);
    const host = process.env.HOST ?? '127.0.0.1';
    app.servidor.listen(puerto, host, () => console.log(`CrediLocal: http://${host}:${puerto}`));
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.once(signal, () => { void app.cerrar().then(() => process.exit(0)); });
    }
}
