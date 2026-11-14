import { abrirBaseDatos, type PoolSql } from '../persistencia/postgres';
import { casosSobre } from '../persistencia/casosSobreDatos';
import { crearManejador } from '../http/crearManejador';
import { crearCuenta } from '../../contexts/identity-and-access/infraestructura/credenciales';
import { relojPeru } from '../../shared/dominio/fechas';
import type { Datos } from '../../shared/dominio/datos';
import type { ContextoSolicitud, UnidadDeSolicitud } from '../../shared/aplicacion/puertos';

export interface OpcionesApi { pool: PoolSql; semilla: () => Promise<Datos>; ahora?: () => string; claveCron?: string }

/** Punto de composición de la API: base PostgreSQL, corte de día en cada solicitud y manejador HTTP. */
export async function crearApi(o: OpcionesApi) {
    const ahora = o.ahora ?? relojPeru;
    const cuentas = { crearCuenta };
    const base = await abrirBaseDatos(o.pool, o.semilla);
    // El corte de día se emite al empezar cada solicitud; si hay cambios, se confirman con ella.
    const unidad: UnidadDeSolicitud = {
        ejecutar: operacion => base.ejecutar((contexto: ContextoSolicitud) => {
            casosSobre(contexto.datos, cuentas).emitirCortesPendientes(ahora());
            return operacion(contexto);
        }),
    };
    const salud = async () => {
        const c = await o.pool.connect();
        try { await c.query('SELECT 1'); } finally { c.release(); }
    };
    return {
        manejar: crearManejador({ unidad, cuentas, ahora, claveCron: o.claveCron, salud }),
        unidad,
        /** Emite los cortes pendientes y devuelve cuántos se emitieron. */
        revisarCortes: () => base.ejecutar((contexto: ContextoSolicitud) => casosSobre(contexto.datos, cuentas).emitirCortesPendientes(ahora())),
        cerrar: () => base.cerrar(),
    };
}
