import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { datosVisibles } from '../../aplicacion/datosVisibles';
import { operacionDe } from '../../aplicacion/formaOperacion';
import { registrarOperacion } from '../../aplicacion/registrarOperacion';
import { crearCasosDeUso } from '../../aplicacion/casosDeUso';
import { repositoriosSobre } from '../persistencia/repositoriosSobreDatos';
import { enviar, cuerpo, ErrorHttp } from './json';
import { crearSesiones, crearLimitador, ErrorDeAccesoLimitado, type FuenteDeAcceso, type Limitador } from '../../contexts/identity-and-access/infraestructura/sesiones';
import type { CreadorDeCuentas, UnidadDeSolicitud } from '../../shared/aplicacion/puertos';
import { activo, ErrorDeDominio, ErrorDeSesion, exigir } from '../../shared/dominio/validaciones';

export interface OpcionesManejador {
    unidad: UnidadDeSolicitud;
    cuentas: CreadorDeCuentas;
    ahora: () => string;
    limitador?: Limitador;
    /** Secreto de /api/cron/cortes. Sin valor, la ruta no existe. */
    claveCron?: string;
}

const claveCronValida = (encabezado: string | undefined, secreto: string) => {
    const esperado = Buffer.from(`Bearer ${secreto}`), recibido = Buffer.from(encabezado ?? '');
    return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
};
const respuesta = (codigo: number, valor: unknown) => ({ codigo, valor });

/**
 * Manejador HTTP de la API. Cada solicitud se ejecuta dentro de la unidad de solicitud: si termina sin error,
 * sus cambios se confirman; si lanza un error, no se escribe nada. Las respuestas se envían después de confirmar.
 */
export function crearManejador(o: OpcionesManejador) {
    return async function manejar(req: IncomingMessage, res: ServerResponse): Promise<void> {
        try {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            if (url.pathname === '/api/salud' && req.method === 'GET') {
                enviar(res, 200, { estado: 'ok', almacenamiento: 'PostgreSQL' });
                return;
            }
            if (url.pathname === '/api/cron/cortes' && o.claveCron) {
                if (req.method !== 'GET' || !claveCronValida(req.headers.authorization, o.claveCron)) {
                    enviar(res, 401, { error: 'No autorizado.' });
                    return;
                }
                // La unidad emite los cortes vencidos al empezar. Además deja constancia de la ejecución: en el plan Hobby los logs
                // duran una hora y no hay otra forma de saber después si el cron corrió.
                await o.unidad.ejecutar(({ datos: d }) => {
                    d.auditoria.push({ fecha: new Date().toISOString(), actor: 'Sistema', accion: 'CRON CORTES', detalle: 'ejecución diaria' });
                });
                enviar(res, 200, { estado: 'ok' });
                return;
            }
            if (!url.pathname.startsWith('/api/')) {
                enviar(res, 404, { error: 'Recurso no encontrado.' });
                return;
            }
            if (req.method !== 'GET' && req.method !== 'POST') {
                enviar(res, 405, { error: 'Método no permitido.' });
                return;
            }
            if (req.method === 'POST') {
                // Defensa en profundidad además de SameSite=Strict: mismo origen y cuerpo JSON declarado.
                if (req.headers.origin)
                    exigir(origenIgual(req.headers.origin, req.headers.host), 'Origen de solicitud no permitido.');
                else {
                    const sitio = req.headers['sec-fetch-site'];
                    exigir(sitio === undefined || sitio === 'same-origin' || sitio === 'none', 'Origen de solicitud no permitido.');
                }
                if (!/^application\/json\b/i.test(req.headers['content-type'] ?? ''))
                    throw new ErrorHttp(415, 'Use Content-Type: application/json.');
            }
            const pedido = req.method === 'POST' ? await cuerpo(req) : {};
            // Un intento fallido debe quedar contado aunque la respuesta sea un error: ese error se lanza después de confirmar.
            let diferido: unknown;
            const { codigo, valor } = await o.unidad.ejecutar(async ({ datos: d, sesiones: almacen, intentos }) => {
                const limitador = o.limitador ?? crearLimitador(intentos);
                const sesiones = crearSesiones(almacen, limitador);
                const repos = repositoriosSobre(d);
                const acceso: FuenteDeAcceso = {
                    cuentas: repos.cuentas,
                    tiendaActiva: id => repos.tiendas.todas().some(t => t.id === id && t.activa),
                    clienteActivo: (id, tiendaId) => {
                        const c = id === undefined ? undefined : repos.clientes.porId(id);
                        return !!c && c.tiendaId === tiendaId && activo(c);
                    },
                };
                if (url.pathname === '/api/login' && req.method === 'POST') {
                    try {
                        const { sesion: s } = await sesiones.entrar(req, res, acceso, pedido);
                        return respuesta(200, { sesion: s, datos: datosVisibles(d, s) });
                    }
                    catch (e) {
                        if (!(e instanceof ErrorDeDominio)) throw e;
                        diferido = e;
                        return respuesta(0, null);
                    }
                }
                if (url.pathname === '/api/logout' && req.method === 'POST') {
                    sesiones.salir(req, res);
                    return respuesta(200, { estado: 'ok' });
                }
                if (url.pathname === '/api/sesion' && req.method === 'GET') {
                    // Permite a la página recuperar su sesión al recargarse; sin sesión válida responde null, sin error.
                    let vigente = null;
                    try {
                        vigente = sesiones.obtener(req, acceso);
                    }
                    catch { /* sin sesión, vencida o cuenta dada de baja */ }
                    return respuesta(200, { sesion: vigente });
                }
                const s = sesiones.obtener(req, acceso);
                // Con clave provisional solo se permite cambiarla: ninguna otra operación o consulta.
                if (s.claveProvisional && url.pathname !== '/api/clave')
                    throw new ErrorHttp(403, 'Debe cambiar la contraseña provisional antes de continuar.');
                if (url.pathname === '/api/accesos-clientes' && req.method === 'GET') {
                    exigir(s.rol === 'Comercio', 'Esta consulta requiere el perfil Comercio.');
                    const tiendaActiva = d.tiendas.some(t => t.id === s.tiendaId && t.activa);
                    return respuesta(200, d.clientes.filter(c => c.tiendaId === s.tiendaId).map(c => {
                        const creada = d.cuentas.some(a => a.rol === 'Cliente' && a.tiendaId === s.tiendaId && a.clienteId === c.id);
                        return { clienteId: c.id, creada, habilitada: creada && tiendaActiva && activo(c) };
                    }));
                }
                if (url.pathname === '/api/auditoria' && req.method === 'GET') {
                    exigir(s.rol === 'Superadministrador', 'Esta consulta requiere el perfil Superadministrador.');
                    return respuesta(200, d.auditoria);
                }
                if (url.pathname === '/api/clave' && req.method === 'POST') {
                    try {
                        const cuentaId = await sesiones.cambiarClave(req, acceso, pedido);
                        d.auditoria.push({ fecha: new Date().toISOString(), actor: s.correo, accion: 'CAMBIAR CLAVE', tiendaId: s.tiendaId, detalle: `cuenta=${cuentaId}` });
                        return respuesta(200, { estado: 'ok' });
                    }
                    catch (e) {
                        // Igual que el login: el intento fallido se confirma y el error se muestra después.
                        if (!(e instanceof ErrorDeDominio)) throw e;
                        diferido = e;
                        return respuesta(0, null);
                    }
                }
                if (url.pathname === '/api/estado' && req.method === 'GET') {
                    return respuesta(200, datosVisibles(d, s));
                }
                if (url.pathname === '/api/operacion' && req.method === 'POST') {
                    const resultado = await registrarOperacion(crearCasosDeUso(repos, o.cuentas), repos, s, operacionDe(pedido), () => undefined, o.ahora);
                    return respuesta(200, { resultado: resultado ?? null, datos: datosVisibles(d, s) });
                }
                return respuesta(404, { error: 'Recurso no encontrado.' });
            });
            if (diferido) throw diferido;
            enviar(res, codigo, valor);
        }
        catch (e) {
            // Solo los errores de dominio y de solicitud muestran su mensaje; cualquier otro se registra y se oculta.
            if (e instanceof ErrorDeAccesoLimitado) {
                res.setHeader('Retry-After', e.segundosRestantes);
                enviar(res, 400, { error: e.message, segundosRestantes: e.segundosRestantes });
            }
            else if (e instanceof ErrorDeSesion)
                enviar(res, 401, { error: e.message });
            else if (e instanceof ErrorHttp)
                enviar(res, e.estado, { error: e.message });
            else if (e instanceof ErrorDeDominio)
                enviar(res, 400, { error: e.message });
            else {
                console.error('Error interno:', e);
                enviar(res, 500, { error: 'Error interno del servidor.' });
            }
        }
    };
}

function origenIgual(origen: string, host: string | undefined) {
    try {
        return new URL(origen).host === host;
    }
    catch {
        return false;
    }
}
