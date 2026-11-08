import { crearCasosDeUso } from '../../aplicacion/casosDeUso';
import type { CreadorDeCuentas } from '../../shared/aplicacion/puertos';
import type { Datos } from '../../shared/dominio/datos';
import { repositoriosSobre } from './repositoriosSobreDatos';

/** Los casos de uso de la aplicación trabajando sobre una fotografía de datos en memoria. */
export const casosSobre = (datos: Datos, creador: CreadorDeCuentas) => crearCasosDeUso(repositoriosSobre(datos), creador);
