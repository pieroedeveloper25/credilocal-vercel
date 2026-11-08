// Función dedicada del cron de cortes: Vercel no enruta al catch-all api/[...ruta].ts las rutas de dos o más niveles.
// El handler compartido lee la URL original y exige Authorization: Bearer <CRON_SECRET>.
export { default } from '../../vercel-dist/manejador.mjs';
