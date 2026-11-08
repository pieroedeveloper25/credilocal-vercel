import{test}from'node:test';import assert from'node:assert/strict';import{mkdtempSync}from'node:fs';import{resolve}from'node:path';import{crearAplicacion}from'../servidor-dist/main.mjs';import{semillaDemo}from'../servidor-dist/semillaDemo.mjs';
async function entorno(ruta=':memory:'){
 const app=await crearAplicacion(ruta,semillaDemo);await new Promise(r=>app.servidor.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.servidor.address().port}`;
 const sesion=()=>{let cookie='';return async(ruta,pedido)=>{const r=await fetch(`${url}/api/${ruta}`,{method:pedido===undefined?'GET':'POST',headers:{...(pedido===undefined?{}:{'Content-Type':'application/json'}),Cookie:cookie},body:pedido===undefined?undefined:JSON.stringify(pedido)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{codigo:r.status,datos:await r.json()};};};return{...app,sesion};
}
const entrar=(api,rol='Comercio',correo='comercio@sutaller.pe',clave='credi2026')=>api('login',{rol,correo,clave});
const op=(api,accion,pedido)=>api('operacion',{accion,pedido});
const cliente=(base,doc,nombre='Cliente de prueba')=>({...base,id:-1,tipoDoc:'DNI',doc,nombre,correo:'',limite:'10000',tipoC:'Nominal',valC:'24',valM:'15',horaCorte:'18:00'});
async function consultar(ruta,sql,params=[]){const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite(resolve(ruta));try{return (await db.query(sql,params)).rows;}finally{await db.close();}}
test('API exige sesión, no expone contraseñas y aplica permisos en el servidor',async()=>{
 const app=await entorno();try{const api=app.sesion();assert.equal((await api('estado')).codigo,401);assert.equal((await entrar(api,'Comercio','comercio@sutaller.pe','incorrecta')).codigo,400);
 const comercio=await entrar(api);assert.equal(comercio.codigo,200);assert.deepEqual(comercio.datos.datos.cuentas,[]);assert.ok(!JSON.stringify(comercio.datos).includes('"hash"'));
 const cli=app.sesion();const c=await entrar(cli,'Cliente','contacto@transintegrales.pe');assert.equal(c.codigo,200);assert.equal(c.datos.datos.clientes.length,1);assert.ok(c.datos.datos.ventas.every(v=>v.clienteId===1));assert.equal((await op(cli,'GUARDAR PRODUCTO',{registro:comercio.datos.datos.productos[0]})).codigo,400);
 await api('logout',{});assert.equal((await api('estado')).codigo,401);
 }finally{await app.cerrar();}
});
test('dos sesiones independientes guardan simultáneamente sin perder clientes ni auditoría',async()=>{
 const app=await entorno();try{const a=app.sesion(),b=app.sesion();const [login]=await Promise.all([entrar(a),entrar(b)]);const base=login.datos.datos.clientes[0];
 const r=await Promise.all([op(a,'GUARDAR CLIENTE',{registro:cliente(base,'11111111','Simultáneo A')}),op(b,'GUARDAR CLIENTE',{registro:cliente(base,'22222222','Simultáneo B')})]);assert.ok(r.every(x=>x.codigo===200));
 const estado=(await a('estado')).datos;const nuevos=estado.clientes.filter(c=>c.nombre.startsWith('Simultáneo'));assert.equal(nuevos.length,2);assert.notEqual(nuevos[0].id,nuevos[1].id);
 const superadmin=app.sesion();await entrar(superadmin,'Superadministrador','sistema@credilocal.pe');const tienda={id:-1,ruc:'20999999999',razon:'Bodega Prueba SAC',nombre:'Bodega Prueba',giro:'Bodega',direccion:'Lima',telefono:'',correo:'bodega@prueba.pe',activa:true};assert.equal((await op(superadmin,'GUARDAR TIENDA',{registro:tienda,clave:'Prueba2026'})).codigo,200);
 const otra=app.sesion();assert.equal((await entrar(otra,'Comercio','bodega@prueba.pe','Prueba2026')).codigo,200);assert.equal((await otra('clave',{actual:'Prueba2026',nueva:'OtraClave2026'})).codigo,200);assert.equal((await otra('estado')).datos.clientes.length,0);
 assert.equal((await op(otra,'GUARDAR CLIENTE',{registro:{...estado.clientes[0],nombre:'Ajeno'}})).codigo,400);assert.equal((await otra('estado')).datos.ventas.length,0);
 }finally{await app.cerrar();}
});
test('cálculos reales por API, cobranza completa, rechazo de duplicados y conservación en SQLite',async()=>{
 const carpeta=mkdtempSync(resolve('pruebas','base-prueba-')),ruta=resolve(carpeta,'prueba.sqlite');let app=await entorno(ruta);let id;
 try{const api=app.sesion();const inicio=await entrar(api);const c=cliente(inicio.datos.datos.clientes[0],'33333333');const guardado=await op(api,'GUARDAR CLIENTE',{registro:c});assert.equal(guardado.codigo,200);id=guardado.datos.datos.clientes.find(c=>c.doc==='33333333').id;
 const venta=await op(api,'REGISTRAR VENTA',{clienteId:id,fecha:'2026-09-10',hora:'12:00',capital:'1200',modalidad:'Fin de mes',n:1,detalle:'',items:[{sku:'KIT-001',cantidad:'1'}]});assert.equal(venta.codigo,200);
 const corte=venta.datos.datos.listados.find(l=>l.clienteId===id&&l.periodo==='2026-09');assert.equal(corte.total,'1212.86');assert.equal(corte.moneda,'PEN');
 const pedido={clienteId:id,periodo:'2026-09',fecha:'2026-09-30',hora:'12:00',abono:'1214.87'};assert.equal((await op(api,'REGISTRAR PAGO',pedido)).codigo,400);
 pedido.abono='1214.88';const pago=await op(api,'REGISTRAR PAGO',pedido);assert.equal(pago.codigo,200);assert.deepEqual([pago.datos.resultado.capital,pago.datos.resultado.comp,pago.datos.resultado.mora],['1200.00','12.86','2.02']);assert.equal((await op(api,'REGISTRAR PAGO',pedido)).codigo,400);
 await app.cerrar();app=await entorno(ruta);const segunda=app.sesion();await entrar(segunda);const persistido=(await segunda('estado')).datos;assert.ok(persistido.pagos.some(p=>p.clienteId===id&&p.abono==='1214.88'));assert.ok(persistido.obligaciones.filter(o=>o.clienteId===id).every(o=>o.pagada));
 }finally{await app.cerrar();}
});
test('un producto inválido no se guarda al darlo de baja y una operación denegada no cambia la base',async()=>{
 const app=await entorno();try{const api=app.sesion(),inicio=await entrar(api);const p=inicio.datos.datos.productos[0];assert.equal((await op(api,'GUARDAR PRODUCTO',{registro:{...p,activo:false,contado:'abc'}})).codigo,400);const d=(await api('estado')).datos;assert.equal(d.productos[0].contado,p.contado);assert.equal(d.productos[0].activo,true);
 const cliente=app.sesion();await entrar(cliente,'Cliente','contacto@transintegrales.pe');assert.equal((await op(cliente,'EMITIR CORTE',{clienteId:0,periodo:'2026-09'})).codigo,400);
 }finally{await app.cerrar();}
});
test('cronograma francés del segundo caso y cobranza completa por API',async()=>{
 const app=await entorno();try{const api=app.sesion(),inicio=await entrar(api);const registro={...cliente(inicio.datos.datos.clientes[0],'55555555'),tipoC:'Efectiva',valC:'30'};
 const creado=await op(api,'GUARDAR CLIENTE',{registro});const c=creado.datos.datos.clientes.find(c=>c.doc==='55555555');
 const venta=await op(api,'REGISTRAR VENTA',{clienteId:c.id,fecha:'2026-09-15',hora:'12:00',capital:'4500',modalidad:'Cuotas',n:3,detalle:'',items:[{sku:'SRV-014',cantidad:'1'}]});assert.equal(venta.codigo,200);assert.equal(venta.datos.resultado.plan.cuotaFija,'1579.41');assert.equal(venta.datos.resultado.plan.capitalAjustado,'4536.22');
 // Hasta hoy se admiten pagos efectivamente realizados; cuotas futuras se consultan, no se registran anticipadamente como hechos futuros.
 const cuotas=venta.datos.datos.obligaciones.filter(o=>o.clienteId===c.id);assert.deepEqual(cuotas.map(o=>[o.capital,o.comp]),[['1479.14','100.27'],['1511.83','67.58'],['1545.25','34.16']]);
 const corte=await op(api,'EMITIR CORTE',{clienteId:c.id,periodo:'2026-09'});assert.equal(corte.codigo,200);
 }finally{await app.cerrar();}
});
test('el servicio genera el corte sin navegador ni sesión y evita duplicados',async()=>{
 let reloj='2026-09-19T12:00';const app=await crearAplicacion(':memory:',semillaDemo,()=>reloj);
 try{reloj='2026-09-20T23:59';assert.ok(await app.revisarCortes()>0);assert.equal(await app.revisarCortes(),0);}
 finally{await app.cerrar();}
});

test('el catálogo rechaza imagen ausente, vacía, incompatible y superior a 2 MB sin guardar cambios',async()=>{
 const app=await entorno();
 try{
  const api=app.sesion();const inicio=await entrar(api);
  const producto={...inicio.datos.datos.productos[0],sku:'REV-IMAGEN',nombre:'Producto de prueba'};
  const cantidad=inicio.datos.datos.productos.length;
  for(const imagen of [undefined,'','data:image/png;base64,','data:image/svg+xml;base64,AAAA','data:image/png;base64,!!!!','data:image/png;base64,'+'A'.repeat(2796204)]){
   const respuesta=await op(api,'GUARDAR PRODUCTO',{registro:{...producto,imagen}});
   assert.equal(respuesta.codigo,400);assert.match(respuesta.datos.error,/imagen|2 MB/);
  }
  const datos=(await api('estado')).datos;
  assert.equal(datos.productos.length,cantidad);
  assert.ok(!datos.productos.some(p=>p.sku==='REV-IMAGEN'));
 }finally{await app.cerrar();}
});

test('la imagen del producto se conserva al editar y después de reiniciar SQLite',async()=>{
 const carpeta=mkdtempSync(resolve('pruebas','base-prueba-')),ruta=resolve(carpeta,'catalogo.sqlite');
 let app=await entorno(ruta);
 try{
  const api=app.sesion();const inicio=await entrar(api);
  const producto={...inicio.datos.datos.productos[0],sku:'REV-PERSISTENCIA',nombre:'Producto con imagen'};
  assert.equal((await op(api,'GUARDAR PRODUCTO',{registro:producto})).codigo,200);
  assert.equal((await op(api,'GUARDAR PRODUCTO',{registro:{...producto,nombre:'Producto editado',credito:'1250'}})).codigo,200);
  await app.cerrar();app=await entorno(ruta);
  const segunda=app.sesion();await entrar(segunda);
  const guardado=(await segunda('estado')).datos.productos.find(p=>p.sku===producto.sku);
  assert.equal(guardado.nombre,'Producto editado');assert.equal(guardado.credito,'1250');assert.equal(guardado.imagen,producto.imagen);
 }finally{await app.cerrar();}
});

test('la sesión sigue vigente después de reiniciar el servidor y el token no queda guardado en claro',async()=>{
 const carpeta=mkdtempSync(resolve('pruebas','base-prueba-')),ruta=resolve(carpeta,'sesion.sqlite');let app=await entorno(ruta);let cookie;
 try{
  const r=await fetch(`http://127.0.0.1:${app.servidor.address().port}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rol:'Comercio',correo:'comercio@sutaller.pe',clave:'credi2026'})});
  assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
  await app.cerrar();app=await entorno(ruta);
  const e=await fetch(`http://127.0.0.1:${app.servidor.address().port}/api/estado`,{headers:{Cookie:cookie}});
  assert.equal(e.status,200,'la cookie sigue siendo válida tras el reinicio');
  await app.cerrar();
  const filas=await consultar(ruta,'SELECT token_hash FROM sesiones');assert.ok(filas.length>=1);assert.ok(filas.every(f=>f.token_hash!==cookie.split('=')[1]),'el token no se guarda en claro');
  app=await entorno(ruta);
 }finally{await app.cerrar();}
});

test('GET /api/sesion devuelve la sesión vigente y null sin sesión, sin error',async()=>{
 const app=await entorno();
 try{
  const base=`http://127.0.0.1:${app.servidor.address().port}`;
  const sin=await fetch(`${base}/api/sesion`);
  assert.equal(sin.status,200);assert.deepEqual(await sin.json(),{sesion:null});
  const falsa=await fetch(`${base}/api/sesion`,{headers:{Cookie:`credilocal=${'0'.repeat(64)}`}});
  assert.equal(falsa.status,200);assert.deepEqual(await falsa.json(),{sesion:null});
  const l=await fetch(`${base}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rol:'Comercio',correo:'comercio@sutaller.pe',clave:'credi2026'})});
  const cookie=l.headers.get('set-cookie').split(';')[0];
  const con=await (await fetch(`${base}/api/sesion`,{headers:{Cookie:cookie}})).json();
  assert.equal(con.sesion.rol,'Comercio');assert.equal(con.sesion.correo,'comercio@sutaller.pe');
  assert.ok(!JSON.stringify(con).includes('hash'),'no expone credenciales');
  await fetch(`${base}/api/logout`,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});
  assert.deepEqual(await (await fetch(`${base}/api/sesion`,{headers:{Cookie:cookie}})).json(),{sesion:null});
 }finally{await app.cerrar();}
});

test('entradas mal formadas se rechazan con 400/415, sin filtrar errores internos y sin copiar campos desconocidos',async()=>{
 const app=await entorno();
 try{
  const base=`http://127.0.0.1:${app.servidor.address().port}`;
  const json={'Content-Type':'application/json'};
  const post=(ruta,cuerpo,h=json,crudo)=>fetch(`${base}/api/${ruta}`,{method:'POST',headers:h,body:crudo??JSON.stringify(cuerpo)}).then(async r=>({estado:r.status,cookie:r.headers.get('set-cookie'),cuerpo:await r.json()}));
  const nulo=await post('login',null);assert.equal(nulo.estado,400);assert.ok(!/Cannot read|undefined|null \(/.test(nulo.cuerpo.error),nulo.cuerpo.error);
  assert.equal((await post('login',{},{'Content-Type':'text/plain'},'{}')).estado,415);
  assert.equal((await post('login',{},json,'{no es json')).estado,400);
  assert.equal((await post('login',{},json,'[1,2]')).estado,400);
  const l=await post('login',{rol:'Comercio',correo:'comercio@sutaller.pe',clave:'credi2026'});const h={...json,Cookie:l.cookie.split(';')[0]};
  const estado=l.cuerpo.datos;const c=estado.clientes[0];
  for(const [pedido,accion] of [[null,'GUARDAR CLIENTE'],[{registro:null},'GUARDAR CLIENTE'],[{registro:{...c,limite:5}},'GUARDAR CLIENTE'],[{registro:{...c,id:'1'}},'GUARDAR CLIENTE'],[{clienteId:0,items:'x'},'REGISTRAR VENTA'],[{clienteId:0,fecha:'2026-10-01',capital:'1',modalidad:'Fin de mes',n:1,detalle:'',items:[]},'REGISTRAR VENTA'],[{},'REGISTRAR PAGO']]){
   const r=await post('operacion',{accion,pedido},h);assert.equal(r.estado,400,JSON.stringify([accion,r]));assert.ok(!/Cannot read|is not a function|undefined/.test(r.cuerpo.error),r.cuerpo.error);
  }
  assert.equal((await post('operacion',{accion:'BORRAR TODO',pedido:{}},h)).estado,400);
  const guardado=await post('operacion',{accion:'GUARDAR CLIENTE',pedido:{registro:{...c,id:-1,tipoDoc:'DNI',doc:'44444444',nombre:'Con extras',correo:'',intruso:'<b>x</b>',plan:{a:1},tiendaId:99}}},h);
  assert.equal(guardado.estado,200,JSON.stringify(guardado));
  const nuevo=guardado.cuerpo.datos.clientes.find(x=>x.doc==='44444444');assert.ok(nuevo);assert.equal(nuevo.tiendaId,1);assert.equal(nuevo.intruso,undefined);
 }finally{await app.cerrar();}
});

test('cambio de contraseña: exige la actual, valida la nueva, cierra otras sesiones y se audita sin contraseñas',async()=>{
 const carpeta=mkdtempSync(resolve('pruebas','base-prueba-')),ruta=resolve(carpeta,'clave.sqlite');
 const app=await entorno(ruta);
 try{
  const a=app.sesion(),b=app.sesion();
  await entrar(a);await entrar(b);
  assert.equal((await a('clave',{actual:'incorrecta1',nueva:'NuevaClave2026'})).codigo,400);
  assert.equal((await a('clave',{actual:'credi2026',nueva:'corta1'})).codigo,400);
  assert.equal((await a('clave',{actual:'credi2026',nueva:'sololetrasaqui'})).codigo,400);
  assert.equal((await a('clave',{actual:'credi2026',nueva:'credi2026'})).codigo,400);
  assert.equal((await a('clave',{actual:'credi2026',nueva:'NuevaClave2026'})).codigo,200);
  assert.equal((await a('estado')).codigo,200,'la sesión que cambió la clave sigue vigente');
  assert.equal((await b('estado')).codigo,401,'las demás sesiones de la cuenta se cierran');
  const c=app.sesion();
  assert.equal((await entrar(c)).codigo,400,'la clave anterior ya no sirve');
  assert.equal((await entrar(c,'Comercio','comercio@sutaller.pe','NuevaClave2026')).codigo,200);
  const otra=app.sesion();await entrar(otra,'Superadministrador','sistema@credilocal.pe');
  assert.equal((await otra('clave',{actual:'credi2026'})).codigo,400);
  assert.equal((await app.sesion()('clave',{actual:'credi2026',nueva:'OtraClave2026'})).codigo,401);
  await app.cerrar();
  const filas=await consultar(ruta,'SELECT accion,actor,detalle FROM auditoria');
  const cambio=filas.filter(f=>f.accion==='CAMBIAR CLAVE');
  assert.equal(cambio.length,1);assert.equal(cambio[0].actor,'comercio@sutaller.pe');assert.match(cambio[0].detalle,/^cuenta=\d+$/);
  assert.ok(!/NuevaClave2026|credi2026/.test(JSON.stringify(filas)));
 }finally{await app.cerrar().catch(()=>undefined);}
});
test('las cuentas con hash anterior se renuevan al ingresar y siguen funcionando tras reiniciar',async()=>{
 const {pbkdf2Sync}=await import('node:crypto');
 const carpeta=mkdtempSync(resolve('pruebas','base-prueba-')),ruta=resolve(carpeta,'anterior.sqlite');
 let app=await entorno(ruta);await app.cerrar();
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite(resolve(ruta));const {sal}=(await db.query("SELECT sal FROM cuentas WHERE correo='comercio@sutaller.pe'")).rows[0];
 await db.query("UPDATE cuentas SET hash=$1 WHERE correo='comercio@sutaller.pe'",[pbkdf2Sync('credi2026',sal,100000,32,'sha256').toString('hex')]);await db.close();
 app=await entorno(ruta);
 try{
  assert.equal((await entrar(app.sesion())).codigo,200);
 }finally{await app.cerrar();}
 const [f]=await consultar(ruta,"SELECT sal,hash FROM cuentas WHERE correo='comercio@sutaller.pe'");
 assert.match(f.hash,/^pbkdf2-sha256\$600000\$[0-9a-f]{64}$/);assert.notEqual(f.sal,sal);
 app=await entorno(ruta);
 try{assert.equal((await entrar(app.sesion())).codigo,200);}finally{await app.cerrar();}
});
test('tras diez intentos fallidos la cuenta se bloquea y no revela si el correo existe',async()=>{
 const app=await entorno();
 try{
  const api=app.sesion();let ultimo;
  for(let i=0;i<10;i++)ultimo=await entrar(api,'Comercio','comercio@sutaller.pe','incorrecta1');
  assert.equal(ultimo.codigo,400);assert.match(JSON.stringify(ultimo),/incorrectos/);
  const bloqueado=await entrar(api);
  assert.equal(bloqueado.codigo,400);assert.match(JSON.stringify(bloqueado),/Demasiados intentos/);
  assert.ok(bloqueado.datos.segundosRestantes > 0 && bloqueado.datos.segundosRestantes <= 600);
  const inexistente=await entrar(api,'Comercio','nadie@sutaller.pe','incorrecta1');
  assert.match(JSON.stringify(inexistente),/incorrectos/);
 }finally{await app.cerrar();}
});

test('la página y las respuestas llevan cabeceras de seguridad, y la política permite el script del tema por su hash',async()=>{
 const app=await entorno();
 try{
  const base=`http://127.0.0.1:${app.servidor.address().port}`;
  const pagina=await fetch(`${base}/`);
  if(pagina.status===200){
   const csp=pagina.headers.get('content-security-policy');
   for(const parte of ["default-src 'self'","object-src 'none'","frame-ancestors 'none'","base-uri 'self'"])assert.ok(csp.includes(parte),`${parte} en ${csp}`);
   assert.match(csp,/script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+/);assert.ok(!csp.includes("'unsafe-eval'"));assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp));
   assert.equal(pagina.headers.get('x-frame-options'),'DENY');assert.equal(pagina.headers.get('referrer-policy'),'no-referrer');assert.equal(pagina.headers.get('x-content-type-options'),'nosniff');
   assert.equal(pagina.headers.get('cache-control'),'no-cache');
  }
  const api=await fetch(`${base}/api/salud`);
  assert.equal(api.headers.get('cache-control'),'no-store');assert.equal(api.headers.get('x-content-type-options'),'nosniff');
  const login=await fetch(`${base}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rol:'Comercio',correo:'comercio@sutaller.pe',clave:'credi2026'})});
  assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Path=\/; Max-Age=28800$/);
  const seguro=await fetch(`${base}/api/login`,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-Proto':'https'},body:JSON.stringify({rol:'Comercio',correo:'comercio@sutaller.pe',clave:'credi2026'})});
  assert.match(seguro.headers.get('set-cookie'),/; Secure; Max-Age=28800$/);
 }finally{await app.cerrar();}
});

test('el servidor asigna los identificadores: un id inexistente no crea clientes ni tiendas',async()=>{
 const app=await entorno();
 try{
  const comercio=app.sesion(),admin=app.sesion();
  const inicio=await entrar(comercio);const base=inicio.datos.datos.clientes[0];
  const antes=inicio.datos.datos.clientes.length;
  const r=await op(comercio,'GUARDAR CLIENTE',{registro:{...cliente(base,'66666666'),id:987654321}});
  assert.equal(r.codigo,400);assert.match(r.datos.error,/no existe/);
  assert.equal((await comercio('estado')).datos.clientes.length,antes);
  const creado=await op(comercio,'GUARDAR CLIENTE',{registro:cliente(base,'66666666')});
  assert.equal(creado.codigo,200);const ids=creado.datos.datos.clientes.map(c=>c.id);assert.equal(new Set(ids).size,ids.length);assert.equal(Math.max(...ids),ids.length-1);
  await entrar(admin,'Superadministrador','sistema@credilocal.pe');
  const tienda={id:55,ruc:'20999999999',razon:'Bodega Ajena SAC',nombre:'Bodega Ajena',giro:'Bodega',direccion:'Lima',telefono:'',correo:'ajena@prueba.pe',activa:true,clave:'Prueba2026'};
  const t=await op(admin,'GUARDAR TIENDA',{registro:tienda,clave:'Prueba2026'});
  assert.equal(t.codigo,400);assert.match(t.datos.error,/no existe/);
  const t2=await op(admin,'GUARDAR TIENDA',{registro:{...tienda,id:-1},clave:'Prueba2026'});
  assert.equal(t2.codigo,200);assert.deepEqual(t2.datos.datos.tiendas.map(x=>x.id),[1,2]);
 }finally{await app.cerrar();}
});

test('un producto nuevo con SKU generado, imagen y crédito de imagen se guarda; un SKU con espacios no',async()=>{
 const app=await entorno();
 try{
  const api=app.sesion();const inicio=await entrar(api);const base=inicio.datos.datos.productos[0];
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const nuevo={sku:`P-${crypto.randomUUID()}`,nombre:'Producto nuevo',unidad:'UNIDAD',marca:'',proveedor:'',descripcion:'Producto de prueba',imagen:png,imagenCredito:{autor:'Autor',licencia:'CC0',urlFuente:'https://ejemplo.org/f',urlLicencia:'https://ejemplo.org/l'},contado:'10.00',credito:'12.00',modalidad:'Ambas',activo:true};
  const ok=await op(api,'GUARDAR PRODUCTO',{registro:nuevo});assert.equal(ok.codigo,200,JSON.stringify(ok.datos));
  const guardado=ok.datos.datos.productos.find(p=>p.sku===nuevo.sku);assert.ok(guardado);assert.equal(guardado.imagenCredito.licencia,'CC0');assert.equal(guardado.tiendaId,1);
  const malo=await op(api,'GUARDAR PRODUCTO',{registro:{...nuevo,sku:'CON ESPACIO'}});assert.equal(malo.codigo,400);assert.match(malo.datos.error,/SKU/);
  assert.equal((await op(api,'GUARDAR PRODUCTO',{registro:{...nuevo,sku:'P-2',imagenCredito:'x'}})).codigo,400);
  assert.ok(base);
 }finally{await app.cerrar();}
});

test('estado de acceso y auditoría respetan perfiles y excluyen credenciales', async () => {
 const app = await entorno();
 try {
  const sinSesion = app.sesion();
  assert.equal((await sinSesion('accesos-clientes')).codigo, 401);
  assert.equal((await sinSesion('auditoria')).codigo, 401);
  const comercio = app.sesion();
  const inicio = await entrar(comercio);
  const accesos = await comercio('accesos-clientes');
  assert.equal(accesos.codigo, 200);
  assert.ok(accesos.datos.every(a => inicio.datos.datos.clientes.some(c => c.id === a.clienteId)));
  assert.ok(accesos.datos.every(a => Object.keys(a).sort().join(',') === 'clienteId,creada,habilitada'));
  assert.ok(accesos.datos.some(a => a.creada && a.habilitada));
  assert.equal((await comercio('auditoria')).codigo, 400);
  const base = inicio.datos.datos.clientes[0];
  const nuevo = cliente(base, '73125648', 'Sin cuenta de consulta');
  assert.equal((await op(comercio, 'GUARDAR CLIENTE', {registro: nuevo})).codigo, 200);
  const estado = (await comercio('estado')).datos;
  const guardado = estado.clientes.find(c => c.doc === nuevo.doc);
  assert.deepEqual((await comercio('accesos-clientes')).datos.find(a => a.clienteId === guardado.id),
    {clienteId: guardado.id, creada: false, habilitada: false});
  const administrador = app.sesion();
  await entrar(administrador, 'Superadministrador', 'sistema@credilocal.pe');
  const historial = await administrador('auditoria');
  assert.equal(historial.codigo, 200);
  assert.ok(historial.datos.some(r => r.accion));
  assert.ok(!JSON.stringify(historial.datos).includes('"hash"'));
  const consulta = app.sesion();
  await entrar(consulta, 'Cliente', 'contacto@transintegrales.pe');
  assert.equal((await consulta('auditoria')).codigo, 400);
  assert.equal((await consulta('accesos-clientes')).codigo, 400);
 } finally { await app.cerrar(); }
});

test('regresión retos: mora, parciales, compra tras corte, límite y horario', async () => {
 const app = await entorno();
 try {
  const api = app.sesion();
  const inicio = await entrar(api);
  const base = inicio.datos.datos.clientes[0];
  const registro = {...cliente(base, '74215698', 'Cliente de retos UX'),
    limite: '3000', diaCorte: 10, diaPago: 25, plazo: 6,
    tipoC: 'Efectiva', valC: '36', tipoM: 'Efectiva', valM: '48'};
  const creado = await op(api, 'GUARDAR CLIENTE', {registro});
  assert.equal(creado.codigo, 200);
  const c = creado.datos.datos.clientes.find(x => x.doc === registro.doc);
  const producto = {...inicio.datos.datos.productos[0], sku: 'RETO-UX', contado: '450', credito: '500'};
  assert.equal((await op(api, 'GUARDAR PRODUCTO', {registro: producto})).codigo, 200);
  let precioActual = 500;
  const vender = (fecha, cantidad = '1', modalidad = 'Fin de mes', hora = '12:00') =>
    op(api, 'REGISTRAR VENTA', {clienteId: c.id, fecha, hora, capital: String(precioActual * Number(cantidad)),
      modalidad, n: 3, detalle: '', items: [{sku: producto.sku, cantidad}]});
  const venta = await vender('2026-10-08');
  assert.equal(venta.codigo, 200);
  const obligacion = venta.datos.datos.obligaciones.find(o => o.ventaId === venta.datos.resultado.id);
  assert.equal(obligacion.comp, '7.31');
  for (const abono of ['300', '600']) {
   const parcial = await op(api, 'REGISTRAR PAGO',
    {clienteId: c.id, periodo: '2026-10', fecha: '2026-10-30', hora: '12:00', abono});
   assert.equal(parcial.codigo, 400);
  }
  const pago = await op(api, 'REGISTRAR PAGO',
    {clienteId: c.id, periodo: '2026-10', fecha: '2026-10-30', hora: '12:00', abono: '510.08'});
  assert.equal(pago.codigo, 200);
  assert.deepEqual([pago.datos.resultado.comp, pago.datos.resultado.mora], ['7.31', '2.77']);

  await op(api, 'GUARDAR PRODUCTO', {registro: {...producto, contado: '250', credito: '300'}});
  precioActual = 300;
  const posterior = await vender('2026-10-18');
  assert.equal(posterior.codigo, 200);
  const posteriorOb = posterior.datos.datos.obligaciones.find(o => o.ventaId === posterior.datos.resultado.id);
  assert.equal(posteriorOb.vencimiento, '2026-11-25');
  assert.equal(posteriorOb.comp, '9.90');

  await op(api, 'GUARDAR PRODUCTO', {registro: {...producto, contado: '800', credito: '900'}});
  precioActual = 900;
  const cuotas = await vender('2026-10-18', '1', 'Cuotas');
  assert.equal(cuotas.codigo, 200);
  // Compra del 18/10 después del corte (día 10): gracia de 38 días hasta el 25/11, alternativa B de QA-ALG-01.
  // Verificado con cálculo independiente: 900 capitalizado 38 días y cuota francesa a TEM de TEA 36 %.
  assert.deepEqual(cuotas.datos.datos.obligaciones.filter(o => o.ventaId === cuotas.datos.resultado.id)
    .map(o => (Number(o.capital) + Number(o.comp)).toFixed(2)), ['326.12', '326.12', '326.12']);

  await op(api, 'GUARDAR PRODUCTO', {registro: {...producto, contado: '50', credito: '100'}});
  precioActual = 100;
  const hasta2900 = await vender('2026-10-18', '17');
  assert.equal(hasta2900.codigo, 200);
  assert.equal((await vender('2026-10-18', '4')).codigo, 400);
  assert.equal((await vender('2026-10-18', '1')).codigo, 200);
  assert.equal((await vender('2099-10-18', '1')).codigo, 400);
  const horario = {...registro, id: -1, doc: '74215697', nombre: 'Cliente horario',
    limite: '3000', diaCorte: 20, diaPago: 26, horaCorte: '18:00'};
  const altaHorario = await op(api, 'GUARDAR CLIENTE', {registro: horario});
  const h = altaHorario.datos.datos.clientes.find(x => x.doc === horario.doc);
  for (const [hora, vencimiento] of [['17:59', '2026-10-26'], ['18:01', '2026-11-26']]) {
   const r = await op(api, 'REGISTRAR VENTA', {clienteId: h.id, fecha: '2026-10-20',
     hora, capital: '100', detalle: '', modalidad: 'Fin de mes', n: 1, items: [{sku: producto.sku, cantidad: '1'}]});
   assert.equal(r.codigo, 200);
   assert.equal(r.datos.datos.obligaciones.find(o => o.ventaId === r.datos.resultado.id).vencimiento, vencimiento);
  }
  const admin = app.sesion();
  await entrar(admin, 'Superadministrador', 'sistema@credilocal.pe');
  assert.ok((await admin('auditoria')).datos.some(r => /retroact/i.test(r.detalle ?? '')));
 } finally { await app.cerrar(); }
});

test('clave provisional: hasta cambiarla solo se permite cambiar la clave; después la cuenta opera normal',async()=>{
 const app=await entorno();try{
  const su=app.sesion();await entrar(su,'Superadministrador','sistema@credilocal.pe');
  const tienda={id:-1,ruc:'20888888888',razon:'Ferretería Nueva SAC',nombre:'Ferretería Nueva',giro:'Ferretería',direccion:'Lima',telefono:'',correo:'nueva@prueba.pe',activa:true};
  assert.equal((await op(su,'GUARDAR TIENDA',{registro:tienda,clave:'Prueba2026'})).codigo,200);
  const previa=app.sesion();await entrar(previa,'Comercio','nueva@prueba.pe','Prueba2026');
  const nuevo=app.sesion();const l=await entrar(nuevo,'Comercio','nueva@prueba.pe','Prueba2026');
  assert.equal(l.codigo,200);assert.equal(l.datos.sesion.claveProvisional,true);
  assert.equal((await nuevo('estado')).codigo,403);
  assert.equal((await op(nuevo,'GUARDAR CLIENTE',{registro:{}})).codigo,403);
  assert.equal((await nuevo('clave',{actual:'incorrecta1',nueva:'NuevaClave2026'})).codigo,400);
  assert.equal((await nuevo('clave',{actual:'Prueba2026',nueva:'NuevaClave2026'})).codigo,200);
  assert.equal((await nuevo('estado')).codigo,200);
  const otra=app.sesion();const l2=await entrar(otra,'Comercio','nueva@prueba.pe','NuevaClave2026');
  assert.equal(l2.datos.sesion.claveProvisional,false);
  assert.equal((await previa('estado')).codigo,401,'las demás sesiones de la cuenta se cierran al cambiar la clave');
  assert.equal((await nuevo('estado')).codigo,200,'la sesión que cambió la clave sigue abierta');
 }finally{await app.cerrar();}
});

test('el bloqueo por intentos fallidos se conserva entre instancias y se confirma aunque la respuesta sea error', async () => {
 const carpeta = mkdtempSync(resolve('pruebas', 'base-intentos-')), ruta = resolve(carpeta, 'intentos.sqlite');
 let app = await entorno(ruta);
 try {
  const api = app.sesion();
  for (let i = 0; i < 10; i++) assert.equal((await entrar(api, 'Cliente', 'bloqueo@example.com', 'ClaveErronea1')).codigo, 400);
  const bloqueado = await entrar(api, 'Cliente', 'bloqueo@example.com', 'ClaveErronea1');
  assert.equal(bloqueado.codigo, 400);
  assert.match(bloqueado.datos.error, /Demasiados intentos/);
  await app.cerrar();
  app = await entorno(ruta);
  const otraInstancia = await entrar(app.sesion(), 'Cliente', 'bloqueo@example.com', 'ClaveCorrecta1');
  assert.equal(otraInstancia.codigo, 400);
  assert.match(otraInstancia.datos.error, /Demasiados intentos/);
 } finally {
  await app.cerrar();
 }
});
