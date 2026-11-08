import { createServer } from 'node:http';
import { datosVisibles } from '../../aplicacion/datosVisibles';
import { operacionDe } from '../../aplicacion/formaOperacion';
import { registrarOperacion } from '../../aplicacion/registrarOperacion';
import { crearCasosDeUso } from '../../aplicacion/casosDeUso';
import { repositoriosSobre } from '../persistencia/repositoriosSobreDatos';
import { enviar, cuerpo, ErrorHttp } from './json';
import { servirArchivos } from './archivosEstaticos';
import { crearSesiones, ErrorDeAccesoLimitado, type FuenteDeAcceso } from '../../contexts/identity-and-access/infraestructura/sesiones';
import type { AlmacenSesiones, CreadorDeCuentas } from '../../shared/aplicacion/puertos';
import type { crearUnidadDeTrabajo } from '../../shared/aplicacion/unidadDeTrabajo';
import { activo, ErrorDeDominio, ErrorDeSesion, exigir } from '../../shared/dominio/validaciones';
export function crearServidor(trabajo: ReturnType<typeof crearUnidadDeTrabajo>, cuentas: CreadorDeCuentas, ahora: () => string, almacenSesiones?: AlmacenSesiones) {
    const sesiones = crearSesiones(almacenSesiones);
    const servidor = createServer(async (req, res) => {
        try {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            if (url.pathname === '/api/salud' && req.method === 'GET') {
                enviar(res, 200, { estado: 'ok', almacenamiento: 'SQLite' });
                return;
            }
            if (url.pathname.startsWith('/api/')) {
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
                await trabajo.ejecutar(async () => {
                    const d = trabajo.repositorio.leer()!;
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
                        const { sesion: s, datosModificados } = await sesiones.entrar(req, res, acceso, pedido);
                        if (datosModificados)
                            trabajo.repositorio.guardar(d);
                        enviar(res, 200, { sesion: s, datos: datosVisibles(d, s) });
                        return;
                    }
                    if (url.pathname === '/api/logout' && req.method === 'POST') {
                        sesiones.salir(req, res);
                        enviar(res, 200, { estado: 'ok' });
                        return;
                    }
                    if (url.pathname === '/api/sesion' && req.method === 'GET') {
                        // Permite a la página recuperar su sesión al recargarse; sin sesión válida responde null, sin error.
                        let vigente = null;
                        try {
                            vigente = sesiones.obtener(req, acceso);
                        }
                        catch { /* sin sesión, vencida o cuenta dada de baja */ }
                        enviar(res, 200, { sesion: vigente });
                        return;
                    }
                    const s = sesiones.obtener(req, acceso);
                    if (url.pathname === '/api/accesos-clientes' && req.method === 'GET') {
                        exigir(s.rol === 'Comercio', 'Esta consulta requiere el perfil Comercio.');
                        const tiendaActiva = d.tiendas.some(t => t.id === s.tiendaId && t.activa);
                        enviar(res, 200, d.clientes.filter(c => c.tiendaId === s.tiendaId).map(c => {
                            const creada = d.cuentas.some(a => a.rol === 'Cliente' && a.tiendaId === s.tiendaId && a.clienteId === c.id);
                            return { clienteId: c.id, creada, habilitada: creada && tiendaActiva && activo(c) };
                        }));
                        return;
                    }
                    if (url.pathname === '/api/auditoria' && req.method === 'GET') {
                        exigir(s.rol === 'Superadministrador', 'Esta consulta requiere el perfil Superadministrador.');
                        enviar(res, 200, d.auditoria);
                        return;
                    }
                    if (url.pathname === '/api/clave' && req.method === 'POST') {
                        const cuentaId = await sesiones.cambiarClave(req, acceso, pedido);
                        d.auditoria.push({ fecha: new Date().toISOString(), actor: s.correo, accion: 'CAMBIAR CLAVE', tiendaId: s.tiendaId, detalle: `cuenta=${cuentaId}` });
                        trabajo.repositorio.guardar(d);
                        enviar(res, 200, { estado: 'ok' });
                        return;
                    }
                    if (url.pathname === '/api/estado' && req.method === 'GET') {
                        enviar(res, 200, datosVisibles(d, s));
                        return;
                    }
                    if (url.pathname === '/api/operacion' && req.method === 'POST') {
                        const resultado = await registrarOperacion(crearCasosDeUso(repos, cuentas), repos, s, operacionDe(pedido), () => trabajo.repositorio.guardar(d), ahora);
                        enviar(res, 200, { resultado: resultado ?? null, datos: datosVisibles(d, s) });
                        return;
                    }
                    enviar(res, 404, { error: 'Recurso no encontrado.' });
                });
                return;
            }
            servirArchivos(req, res, url);
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
    });
    return servidor;
}

function origenIgual(origen: string, host: string | undefined) {
    try {
        return new URL(origen).host === host;
    }
    catch {
        return false;
    }
}
