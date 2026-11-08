import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { abrirBase, crearDatosDemo } from '../servidor-dist/demo.mjs';

const ENTIDADES = ['auditoria', 'clientes', 'condiciones', 'cuentas', 'detalles_pago', 'items', 'lineas_listado', 'listados', 'obligaciones', 'pagos', 'productos', 'tiendas', 'ventas'];
const ordenado = v => Array.isArray(v) ? v.map(ordenado)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, ordenado(x)])) : v;
const igual = (a, b) => assert.deepEqual(ordenado(JSON.parse(JSON.stringify(a))), ordenado(JSON.parse(JSON.stringify(b))));
const carpeta = () => mkdtempSync(resolve('pruebas', 'base-prueba-persistencia-'));
const FECHA = '2026-10-24';

test('crea una tabla por entidad del modelo del capítulo 8 y ninguna guarda documentos JSON completos', () => {
  const ruta = resolve(carpeta(), 'a.sqlite');
  abrirBase(ruta).cerrar();
  const db = new DatabaseSync(ruta, { readOnly: true });
  try {
    const tablas = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('metadatos','sesiones') ORDER BY name").all().map(t => t.name);
    assert.deepEqual(tablas, ENTIDADES);
    for (const t of tablas) assert.ok(!db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().some(c => c.name === 'contenido'), t);
  } finally { db.close(); }
});

test('guardar y volver a leer la base de demostración devuelve los mismos datos', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const repo = abrirBase(':memory:');
  try {
    repo.guardar(datos);
    igual(repo.leer(), datos);
    repo.guardar(repo.leer());
    igual(repo.leer(), datos);
  } finally { repo.cerrar(); }
});

test('las claves foráneas rechazan referencias inexistentes y lo guardado no se pierde', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const repo = abrirBase(':memory:');
  try {
    repo.guardar(datos);
    const roto = JSON.parse(JSON.stringify(datos));
    roto.ventas[0].clienteId = 999999;
    assert.throws(() => repo.guardar(roto), /FOREIGN KEY/i);
    igual(repo.leer(), datos);
  } finally { repo.cerrar(); }
});

test('una base de la versión 1.0 (un JSON por fila) se convierte al abrirla sin perder datos', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const ruta = resolve(carpeta(), 'v1.sqlite');
  const db = new DatabaseSync(ruta);
  db.exec('CREATE TABLE metadatos (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)');
  for (const t of ['tiendas', 'cuentas', 'clientes', 'productos', 'ventas', 'obligaciones', 'listados', 'pagos', 'auditoria']) {
    db.exec(`CREATE TABLE ${t} (posicion INTEGER PRIMARY KEY, contenido TEXT NOT NULL CHECK(json_valid(contenido)))`);
    const ins = db.prepare(`INSERT INTO ${t} VALUES (?,?)`);
    (datos[t] ?? []).forEach((o, i) => ins.run(i, JSON.stringify(o)));
  }
  db.prepare('INSERT INTO metadatos VALUES (?,?)').run('inicializada', '1');
  db.prepare('INSERT INTO metadatos VALUES (?,?)').run('finanzasVersion', String(datos.finanzasVersion ?? 1));
  db.close();
  const repo = abrirBase(ruta);
  try { igual(repo.leer(), datos); } finally { repo.cerrar(); }
  const nuevo = new DatabaseSync(ruta, { readOnly: true });
  try { assert.ok(!nuevo.prepare("SELECT name FROM pragma_table_info('ventas')").all().some(c => c.name === 'contenido')); } finally { nuevo.close(); }
});

test('la base hace cumplir las reglas del modelo: una cancelación por obligación, una cuenta por cliente y valores permitidos', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const repo = abrirBase(':memory:');
  const copia = () => JSON.parse(JSON.stringify(datos));
  try {
    repo.guardar(datos);
    const doble = copia();
    const pago = doble.pagos.find(p => p.detalles?.length);
    doble.pagos.push({ ...pago, constancia: 'CP-DUPLICADO' });
    assert.throws(() => repo.guardar(doble), /UNIQUE/i, 'una obligación solo se cancela una vez');
    const cuenta = copia();
    const conCliente = cuenta.cuentas.find(c => c.clienteId);
    cuenta.cuentas.push({ ...conCliente, id: 9999, correo: 'otra@cuenta.pe' });
    assert.throws(() => repo.guardar(cuenta), /UNIQUE/i, 'un cliente tiene como máximo una cuenta de consulta');
    for (const [coleccion, campo, valor] of [['ventas', 'modalidad', 'Mensual'], ['clientes', 'moneda', 'EUR'], ['productos', 'modalidad', 'Otra'], ['cuentas', 'rol', 'Invitado']]) {
      const roto = copia();
      roto[coleccion][0][campo] = valor;
      assert.throws(() => repo.guardar(roto), /CHECK/i, `${coleccion}.${campo}`);
    }
    igual(repo.leer(), datos);
  } finally { repo.cerrar(); }
});

test('un ítem solo puede referirse a un producto de la misma tienda de la venta', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const repo = abrirBase(':memory:');
  try {
    repo.guardar(datos);
    const roto = JSON.parse(JSON.stringify(datos));
    const venta = roto.ventas.find(v => v.items?.length);
    venta.items[0].sku = 'SKU-INEXISTENTE';
    assert.throws(() => repo.guardar(roto), /FOREIGN KEY/i);
    igual(repo.leer(), datos);
  } finally { repo.cerrar(); }
});

test('las sesiones se guardan como resumen del token y sobreviven al reinicio de la base', () => {
  const ruta = resolve(carpeta(), 's.sqlite');
  let repo = abrirBase(ruta);
  const vence = Date.now() + 60000;
  repo.sesiones.guardar('a'.repeat(64), { cuentaId: 7, vence });
  repo.sesiones.guardar('b'.repeat(64), { cuentaId: 8, vence: Date.now() - 1 });
  repo.cerrar();
  repo = abrirBase(ruta);
  try {
    assert.deepEqual(repo.sesiones.obtener('a'.repeat(64)), { cuentaId: 7, vence });
    repo.sesiones.limpiarVencidas(Date.now());
    assert.equal(repo.sesiones.obtener('b'.repeat(64)), undefined);
    repo.sesiones.borrar('a'.repeat(64));
    assert.equal(repo.sesiones.obtener('a'.repeat(64)), undefined);
  } finally { repo.cerrar(); }
});

const clon = o => JSON.parse(JSON.stringify(o));
const total = r => r.insertadas + r.actualizadas + r.eliminadas;

test('guardar de forma incremental solo toca las filas que cambiaron', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const repo = abrirBase(':memory:');
  try {
    repo.guardar(datos);
    assert.ok(repo.ultimoGuardado().insertadas > 30);
    repo.guardar(clon(datos));
    assert.deepEqual(repo.ultimoGuardado(), { insertadas: 0, actualizadas: 0, eliminadas: 0 });

    const a = clon(datos);
    a.clientes[1].limite = a.clientes[1].limite + 100;
    repo.guardar(a);
    assert.deepEqual(repo.ultimoGuardado(), { insertadas: 0, actualizadas: 1, eliminadas: 0 });
    igual(repo.leer(), a);

    const b = clon(a);
    b.auditoria.push({ fecha: '2026-10-25', actor: 'prueba', accion: 'Nueva acción' });
    repo.guardar(b);
    assert.deepEqual(repo.ultimoGuardado(), { insertadas: 1, actualizadas: 0, eliminadas: 0 });
    igual(repo.leer(), b);

    const c = clon(b);
    c.auditoria.pop();
    repo.guardar(c);
    assert.deepEqual(repo.ultimoGuardado(), { insertadas: 0, actualizadas: 0, eliminadas: 1 });
    igual(repo.leer(), c);
  } finally { repo.cerrar(); }
});

test('tras muchas operaciones mezcladas la base queda igual que si se hubiera escrito completa', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const dir = carpeta();
  const incremental = abrirBase(resolve(dir, 'inc.sqlite'));
  let actual = clon(datos);
  try {
    incremental.guardar(actual);
    for (let i = 0; i < 60; i++) {
      const sig = clon(actual);
      switch (i % 6) {
        case 0: sig.clientes.push({ ...clon(sig.clientes[0]), id: 1000 + i, doc: String(70000000 + i), nombre: `Cliente ${i}`, correo: `c${i}@x.pe` }); break;
        case 1: sig.clientes[i % sig.clientes.length].nombre = `Renombrado ${i}`; break;
        case 2: sig.auditoria.push({ fecha: FECHA, actor: 'prueba', accion: `Acción ${i}` }); break;
        case 3: sig.clientes.splice(sig.clientes.findIndex(c => c.id >= 1000), 1); break;
        case 4: sig.productos[0].credito = (sig.productos[0].credito ?? 0) + 1; break;
        case 5: sig.auditoria.splice(0, 1); break;
      }
      incremental.guardar(sig);
      igual(incremental.leer(), sig);
      actual = sig;
    }
    const completa = abrirBase(resolve(dir, 'completa.sqlite'));
    try { completa.guardar(actual); igual(completa.leer(), incremental.leer()); } finally { completa.cerrar(); }
  } finally { incremental.cerrar(); }
  const reabierta = abrirBase(resolve(dir, 'inc.sqlite'));
  try { igual(reabierta.leer(), actual); } finally { reabierta.cerrar(); }
});

test('un guardado que falla se deshace por completo y el siguiente guardado sigue siendo correcto', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const repo = abrirBase(':memory:');
  try {
    repo.guardar(datos);
    const roto = clon(datos);
    roto.clientes[0].nombre = 'No debe quedar';
    roto.ventas[0].clienteId = 999999;
    assert.throws(() => repo.guardar(roto), /FOREIGN KEY/i);
    igual(repo.leer(), datos);
    const bueno = clon(datos);
    bueno.clientes[2].nombre = 'Sí queda';
    repo.guardar(bueno);
    assert.equal(total(repo.ultimoGuardado()), 1);
    igual(repo.leer(), bueno);
  } finally { repo.cerrar(); }
});

test('si otra conexión modificó la base, el guardado parte de lo que realmente hay en ella', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const ruta = resolve(carpeta(), 'compartida.sqlite');
  const a = abrirBase(ruta), b = abrirBase(ruta);
  try {
    a.guardar(datos);
    const deB = clon(b.leer());
    deB.auditoria.push({ fecha: FECHA, actor: 'b', accion: 'Desde B' });
    b.guardar(deB);
    const deA = clon(datos);
    deA.clientes[0].nombre = 'Desde A';
    a.guardar(deA);
    igual(a.leer(), deA);
    igual(b.leer(), deA);
  } finally { a.cerrar(); b.cerrar(); }
});

test('guardar un volumen grande y cambiar una sola fila escribe una sola fila', async () => {
  const { datos } = await crearDatosDemo(FECHA);
  const grande = clon(datos);
  for (let i = 0; i < 3000; i++) grande.auditoria.push({ fecha: FECHA, actor: 'carga', accion: `Registro ${i}` });
  const repo = abrirBase(':memory:');
  try {
    repo.guardar(grande);
    grande.auditoria[1500].accion = 'Modificado';
    repo.guardar(grande);
    assert.deepEqual(repo.ultimoGuardado(), { insertadas: 0, actualizadas: 1, eliminadas: 0 });
    igual(repo.leer(), grande);
  } finally { repo.cerrar(); }
});
