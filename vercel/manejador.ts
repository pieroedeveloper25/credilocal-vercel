import type { IncomingMessage, ServerResponse } from 'node:http';
import { crearApi } from '../src/infraestructura/composicion/api';
import { poolPostgres } from '../src/infraestructura/persistencia/postgres';
import { semillaLimpia } from '../src/infraestructura/inicializacion/semillaLimpia';

type Api = Awaited<ReturnType<typeof crearApi>>;
let api: Promise<Api> | undefined;

/** Una sola base y un solo manejador por instancia de la función; el pool se reutiliza entre solicitudes. */
const obtener = () => api ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Falta DATABASE_URL.');
    return crearApi({
        pool: await poolPostgres(url),
        semilla: () => semillaLimpia(process.env.CREDILOCAL_CLAVE_INICIAL),
        claveCron: process.env.CRON_SECRET,
    });
})();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    let instancia: Api;
    try {
        instancia = await obtener();
    }
    catch (e) {
        // No se guarda el fallo: la siguiente solicitud vuelve a intentar la conexión.
        api = undefined;
        console.error('No se pudo abrir la base:', (e as Error).message);
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ error: 'Servicio no disponible.' }));
        return;
    }
    await instancia.manejar(req, res);
}
