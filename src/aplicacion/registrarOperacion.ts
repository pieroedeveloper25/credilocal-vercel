import { detalleAuditoria } from './detalleAuditoria';
import type { CasosDeUso } from './casosDeUso';
import { ejecutarOperacion, type Operacion } from './ejecutarOperacion';
import type { Repositorios } from './repositorios';
import type { Sesion } from '../contexts/identity-and-access/dominio/modelos';
/**
 * Se invoca dentro de la unidad de trabajo. Ejecuta el caso de uso, deja constancia en la auditoría, emite los cortes
 * vencidos y solo entonces confirma los cambios.
 */
export async function registrarOperacion(casos: CasosDeUso, repos: Repositorios, sesion: Sesion, operacion: Operacion, confirmar: () => void, ahora: () => string) {
    const resultado = await ejecutarOperacion(casos, sesion, operacion);
    repos.auditoria.registrar({ fecha: new Date().toISOString(), actor: sesion.correo, accion: operacion.accion, tiendaId: sesion.tiendaId, detalle: detalleAuditoria(operacion, resultado, ahora().slice(0, 10)) });
    casos.emitirCortesPendientes(ahora());
    confirmar();
    return resultado;
}
