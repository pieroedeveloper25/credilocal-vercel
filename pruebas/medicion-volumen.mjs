import { crearAplicacion } from '../servidor-dist/main.mjs';
import { semillaDemo } from '../servidor-dist/semillaDemo.mjs';
const app = await crearAplicacion(':memory:', semillaDemo, () => '2026-09-10T10:00');
await new Promise(r => app.servidor.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${app.servidor.address().port}`;
let cookie = '';
const api = async (ruta, pedido) => {
  const r = await fetch(`${url}/api/${ruta}`, { method: pedido === undefined ? 'GET' : 'POST', headers: { ...(pedido === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie }, body: pedido === undefined ? undefined : JSON.stringify(pedido) });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return { codigo: r.status, datos: await r.json() };
};
const mide = async (f, n) => { const t = []; for (let i = 0; i < n; i++) { const s = performance.now(); await f(i); t.push(performance.now() - s); } t.sort((a, b) => a - b); return { mediana_ms: +t[Math.floor(t.length / 2)].toFixed(1), p95_ms: +t[Math.min(t.length - 1, Math.floor(t.length * 0.95))].toFixed(1) }; };
await api('login', { rol: 'Comercio', correo: 'comercio@sutaller.pe', clave: 'credi2026' });
const base = (await api('estado')).datos.clientes[0];
const cliente = (doc, nombre) => ({ accion: 'GUARDAR CLIENTE', pedido: { registro: { ...base, id: -1, tipoDoc: 'DNI', doc, nombre, correo: '', limite: '10000', tipoC: 'Nominal', valC: '24', valM: '15', horaCorte: '18:00' } } });
let creados = 0;
const filas = [];
for (const objetivo of [0, 200, 600, 1200]) {
  while (creados < objetivo) {
    const r = await api('operacion', cliente(String(10000000 + creados), 'Cliente medición ' + creados));
    if (r.codigo !== 200) { console.log('error al crear', r.datos); process.exit(1); }
    creados++;
  }
  const clientes = (await api('estado')).datos.clientes.length;
  const lectura = await mide(() => api('estado'), 15);
  const escritura = await mide(i => api('operacion', cliente(String(90000000 + i + objetivo * 10), 'Escritura ' + i)), 10);
  filas.push({ clientes_visibles: clientes, GET_estado: lectura, POST_operacion: escritura });
}
console.log(JSON.stringify(filas, null, 1));
await app.cerrar();
