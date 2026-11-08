import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { Sesion } from '../dominio/modelos';
import type { RepositorioCuentas } from '../dominio/repositorios';
import { comprobacionFicticia, comprobarClave, conClave, exigirClaveValida, hashObsoleto } from './credenciales';
import type { AlmacenIntentos, AlmacenSesiones } from '../../../shared/aplicacion/puertos';
import { ErrorDeDominio, ErrorDeSesion, exigir, normalizarCorreo } from '../../../shared/dominio/validaciones';
export class ErrorDeAccesoLimitado extends ErrorDeDominio {
    constructor(public readonly segundosRestantes: number) {
        super('Demasiados intentos. Espere diez minutos.');
    }
}
/** Lo que la autenticación necesita saber del resto del sistema: las cuentas y si la tienda o el cliente siguen habilitados. */
export interface FuenteDeAcceso {
    cuentas: RepositorioCuentas;
    tiendaActiva(tiendaId: number | undefined): boolean;
    clienteActivo(clienteId: number | undefined, tiendaId: number | undefined): boolean;
}
/** Almacén por defecto: las sesiones duran lo que dure el proceso. */
export function sesionesEnMemoria(): AlmacenSesiones {
    const mapa = new Map<string, { cuentaId: number; vence: number }>();
    return {
        obtener: r => mapa.get(r),
        guardar: (r, s) => void mapa.set(r, s),
        borrar: r => void mapa.delete(r),
        borrarDeCuenta: (cuentaId, conservar) => { for (const [r, s] of mapa) if (s.cuentaId === cuentaId && r !== conservar) mapa.delete(r); },
        limpiarVencidas: ahora => { for (const [r, s] of mapa) if (s.vence < ahora) mapa.delete(r); },
    };
}
const resumen = (token: string) => createHash('sha256').update(token).digest('hex');
const DURACION_SESION = 8 * 3600000;
/** Intentos fallidos: por cuenta y perfil desde un origen, y en total por origen. */
const VENTANA = 600000, MAX_POR_CUENTA = 10, MAX_POR_ORIGEN = 40, MAX_CAMBIO_CLAVE = 5;
/** Intentos fallidos sin base de datos (pruebas y desarrollo): viven lo que dure el proceso. */
export function intentosEnMemoria(): AlmacenIntentos {
    const mapa = new Map<string, { n: number; hasta: number }>();
    return {
        obtener: l => mapa.get(l),
        guardar: (l, i) => void mapa.set(l, i),
        borrar: l => void mapa.delete(l),
        limpiarVencidos: ahora => { for (const [l, i] of mapa) if (i.hasta < ahora) mapa.delete(l); },
    };
}
/** Contador de fallos. Su estado vive en el almacén de la solicitud: en producción, en la base de datos compartida. */
export function crearLimitador(almacen: AlmacenIntentos = intentosEnMemoria()) {
    return {
        segundosRestantes: (llave: string, maximo: number) => {
            const fallo = almacen.obtener(llave);
            return fallo && fallo.n >= maximo ? Math.max(0, Math.ceil((fallo.hasta - Date.now()) / 1000)) : 0;
        },
        bloqueado: (llave: string, maximo: number) => {
            const f = almacen.obtener(llave);
            return !!f && f.hasta > Date.now() && f.n >= maximo;
        },
        anotar: (llave: string) => {
            const f = almacen.obtener(llave);
            almacen.guardar(llave, { n: (f && f.hasta > Date.now() ? f.n : 0) + 1, hasta: Date.now() + VENTANA });
            almacen.limpiarVencidos(Date.now());
        },
        olvidar: (llave: string) => void almacen.borrar(llave),
    };
}
/** La cookie solo viaja por HTTPS cuando la conexión (o el proxy que la termina) lo es. */
const atributosCookie = (req: IncomingMessage) =>
    `HttpOnly; SameSite=Strict; Path=/${(req.socket as { encrypted?: boolean } | null)?.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;
export type Limitador = ReturnType<typeof crearLimitador>;
export function crearSesiones(sesiones: AlmacenSesiones = sesionesEnMemoria(), limitador: Limitador = crearLimitador()) {
    const cookie = (req: IncomingMessage) => /\bcredilocal=([a-f0-9]{64})\b/.exec(req.headers.cookie ?? '')?.[1];
    const sesionDe = (req: IncomingMessage, f: FuenteDeAcceso): Sesion => {
        const token = cookie(req), s = token ? sesiones.obtener(resumen(token)) : undefined;
        if (!s || s.vence <= Date.now())
            throw new ErrorDeSesion();
        const a = f.cuentas.todas().find(a => a.id === s.cuentaId);
        exigir(a, 'La cuenta ya no está habilitada.');
        if (a.rol !== 'Superadministrador')
            exigir(f.tiendaActiva(a.tiendaId), 'La tienda está dada de baja.');
        if (a.rol === 'Cliente')
            exigir(f.clienteActivo(a.clienteId, a.tiendaId), 'El cliente está dado de baja.');
        return { rol: a.rol, correo: a.correo, tiendaId: a.tiendaId ?? 0, clienteId: a.clienteId ?? -1, claveProvisional: a.claveProvisional === true };
    };
    /**
     * Inicia sesión. Si el hash de la cuenta es de un formato o costo anteriores, lo renueva y avisa con
     * `datosModificados` para que quien llama guarde los datos.
     */
    async function entrar(req: IncomingMessage, res: ServerResponse, f: FuenteDeAcceso, pedido: Record<string, unknown>) {
        const { correo, clave, rol } = pedido;
        exigir(typeof correo === 'string' && typeof clave === 'string' && typeof rol === 'string' && clave.length <= 64 && correo.length <= 100, 'Ingrese correo y contraseña válidos.');
        const ipReal = (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.socket?.remoteAddress || 'desconocido';
        const origen = `origen:${ipReal}`;
        const llave = `${ipReal}:${normalizarCorreo(correo)}:${rol}`;
        const espera = Math.max(limitador.segundosRestantes(llave, MAX_POR_CUENTA), limitador.segundosRestantes(origen, MAX_POR_ORIGEN));
        if (espera > 0) throw new ErrorDeAccesoLimitado(espera);
        const encontrada = f.cuentas.todas().find(a => a.rol === rol && a.correo === normalizarCorreo(correo));
        if (!encontrada || !await comprobarClave(encontrada, clave)) {
            if (!encontrada)
                await comprobacionFicticia(clave);
            limitador.anotar(llave);
            limitador.anotar(origen);
            throw new ErrorDeDominio('Correo, contraseña o perfil incorrectos.');
        }
        let a = encontrada;
        let datosModificados = false;
        if (hashObsoleto(a)) {
            const renovada = await conClave(a, clave);
            f.cuentas.reemplazar(renovada);
            a = renovada;
            datosModificados = true;
        }
        const token = randomBytes(32).toString('hex');
        sesiones.guardar(resumen(token), { cuentaId: a.id, vence: Date.now() + DURACION_SESION });
        const simulada = { headers: { cookie: `credilocal=${token}` } } as IncomingMessage;
        let s: Sesion;
        try {
            s = sesionDe(simulada, f);
        }
        catch (e) {
            sesiones.borrar(resumen(token));
            throw e;
        }
        const viejo = cookie(req);
        if (viejo)
            sesiones.borrar(resumen(viejo));
        limitador.olvidar(llave);
        sesiones.limpiarVencidas(Date.now());
        res.setHeader('Set-Cookie', `credilocal=${token}; ${atributosCookie(req)}; Max-Age=${DURACION_SESION / 1000}`);
        return { sesion: s, datosModificados };
    }
    function salir(req: IncomingMessage, res: ServerResponse) {
        const token = cookie(req);
        if (token)
            sesiones.borrar(resumen(token));
        res.setHeader('Set-Cookie', `credilocal=; ${atributosCookie(req)}; Max-Age=0`);
    }
    /** Cambia la contraseña de la cuenta de la sesión y cierra sus demás sesiones. Devuelve el id de la cuenta. */
    async function cambiarClave(req: IncomingMessage, f: FuenteDeAcceso, pedido: Record<string, unknown>) {
        sesionDe(req, f);
        const token = cookie(req)!;
        const cuentaId = sesiones.obtener(resumen(token))!.cuentaId;
        const a = f.cuentas.todas().find(x => x.id === cuentaId)!;
        const { actual, nueva } = pedido;
        exigir(typeof actual === 'string' && typeof nueva === 'string' && actual.length <= 64, 'Ingrese la contraseña actual y la nueva.');
        const llave = `clave:${cuentaId}`;
        exigir(!limitador.bloqueado(llave, MAX_CAMBIO_CLAVE), 'Demasiados intentos. Espere diez minutos.');
        if (!await comprobarClave(a, actual)) {
            limitador.anotar(llave);
            throw new ErrorDeDominio('La contraseña actual no es correcta.');
        }
        exigirClaveValida(nueva);
        exigir(nueva !== actual, 'La nueva contraseña debe ser distinta de la actual.');
        const renovada = { ...(await conClave(a, nueva)), claveProvisional: false };
        f.cuentas.reemplazar(renovada);
        sesiones.borrarDeCuenta(a.id, resumen(token));
        limitador.olvidar(llave);
        return a.id;
    }
    return { entrar, salir, cambiarClave, obtener: sesionDe };
}
