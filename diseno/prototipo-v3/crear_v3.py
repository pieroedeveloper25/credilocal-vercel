from pathlib import Path
import re

out = Path(__file__).resolve().parent
source = out.parent / 'prototipo-v2' / 'prototipo.html'
s = source.read_text(encoding='utf-8')

css = '''
/* Dashboard: misma paleta y componentes, sin alterar los flujos v2. */
.dash-meta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;font-size:13px;color:var(--muted)}
.dash-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:24px}
.dash-metric{padding:20px;background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);min-width:0}
.dash-metric dt{font-size:13px;color:var(--muted);min-height:40px}.dash-metric dd{margin:6px 0 8px;font-size:26px;font-weight:700;letter-spacing:-.5px}.dash-metric small{display:block;font-size:12px}
.dash-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px;margin-bottom:24px}.dash-row>*{min-width:0}.dash-row .card+.card{margin-top:0}
.dash-chart{margin:20px 0 0}.dash-chart-row{margin:18px 0}.dash-chart-label{display:flex;justify-content:space-between;gap:14px;font-size:13px;margin-bottom:6px}.dash-chart-label span{min-width:0;overflow-wrap:anywhere}.dash-chart-row svg,.dash-distribution svg{width:100%;height:24px;display:block}.dash-scale{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:8px}.dash-key{display:grid;gap:14px;margin-top:22px}.dash-key>div{display:flex;justify-content:space-between;gap:12px;font-size:14px}.dash-swatch{display:inline-block;width:11px;height:11px;margin-right:8px;border-radius:2px;background:var(--accent)}.dash-swatch.overdue{background:var(--amber)}
.dash-queue{display:grid;gap:16px;margin-top:20px}.dash-due{border:1px solid var(--line);padding:16px;border-radius:8px}.dash-due-top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}.dash-due p{font-size:13px;color:var(--muted);margin-bottom:12px}.dash-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:0;margin:24px 0 0;list-style:none;counter-reset:flow}.dash-flow li{border-top:3px solid #b4d4d0;padding:12px 4px;min-width:0}.dash-flow strong{display:block;margin:5px 0;font-size:14px}.dash-flow small{display:block;font-size:12px}.dash-flow .flow-date{font-size:12px;color:var(--muted)}
.dash-source{margin-top:24px;font-size:13px}.dash-source summary{min-height:32px}.dash-source dl{display:grid;grid-template-columns:minmax(120px,.6fr) minmax(0,1fr);gap:10px 18px;margin:14px 0}.dash-source dt{font-weight:600}.dash-source dd{margin:0;color:var(--muted)}
@media(min-width:651px){html{scroll-padding-top:calc(var(--prototype-banner-height,46px) + 12px)}#main{scroll-margin-top:calc(var(--prototype-banner-height,46px) + 12px)}.prototype{position:sticky;top:0;z-index:5}.app>aside{position:sticky;top:var(--prototype-banner-height,46px);height:calc(100dvh - var(--prototype-banner-height,46px));align-self:start;min-height:0}.app>aside>.brand,.app>aside>.store,.app>aside>.side-bottom{flex-shrink:0}.app>aside>nav{flex:1;min-height:0;overflow-y:auto;align-content:start}}
@media(max-width:1100px){.dash-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-metric dd{font-size:23px}.dash-row{grid-template-columns:minmax(0,1fr)}}
@media(max-width:650px){.dash-metrics{gap:12px}.dash-metric{padding:16px}.dash-metric dd{font-size:21px}.dash-flow{grid-template-columns:minmax(0,1fr);gap:6px}.dash-flow li{border-top:0;border-left:3px solid #b4d4d0;padding:10px 14px}.dash-source dl{grid-template-columns:minmax(0,1fr);gap:4px}.dash-source dd{margin-bottom:12px}.dash-row{gap:20px}}
'''
s = s.replace('</style>', css + '</style>', 1)
banner_observer = r'''
const prototypeBanner=$('.prototype');
function syncPrototypeBannerHeight(){
  const height=prototypeBanner?.getBoundingClientRect().height||46;
  document.documentElement.style.setProperty('--prototype-banner-height',`${height}px`);
}
syncPrototypeBannerHeight();
const prototypeBannerObserver=typeof ResizeObserver==='function'?new ResizeObserver(syncPrototypeBannerHeight):null;
if(prototypeBannerObserver&&prototypeBanner)prototypeBannerObserver.observe(prototypeBanner);
else window.addEventListener('resize',syncPrototypeBannerHeight);
'''
s = s.replace("let role='Comercio',route='venta'", banner_observer + "\nlet role='Comercio',route='venta'", 1)
s = s.replace("let role='Comercio',route='venta'", "let role='Comercio',route='dashboard'", 1)
# El HTML compacto usa la variante sin espacio antes del array.
nav_old = ":[['clientes','clients','Clientes'],['catalogo'"
if nav_old in s:
    s = s.replace(nav_old, ":[['dashboard','state','Dashboard'],['clientes','clients','Clientes'],['catalogo'", 1)

dashboard = r'''
function dashboardData(){
  const rows=clients.map(c=>({id:c.id,name:c.name,capital:c.id==='pedro'?(paid?0:500):c.id==='lucia'?(registered?1200:0):0,limit:c.limit}));
  const capital=rows.reduce((a,c)=>a+c.capital,0),vencido=paid?0:500;
  return {rows,capital,vencido,vigente:capital-vencido,cobros:paid?510.08:0,conDeuda:rows.filter(c=>c.capital>0).length};
}
function dashboardPage(){
 const d=dashboardData(),scale=Math.max(500,...d.rows.map(c=>c.capital));
 const currentWidth=d.capital?500*d.vigente/d.capital:0,overdueWidth=d.capital?500*d.vencido/d.capital:0;
 const metric=(name,value,description)=>`<div class="dash-metric"><dt>${name}</dt><dd>${value}</dd><small>${description}</small></div>`;
 return head('Dashboard','Una vista de la cartera, los cobros y los próximos pagos de tu comercio.','<button class="primary" data-go="venta">Nueva venta a crédito</button>')+
 `<div class="dash-meta"><span class="badge neutral">Datos ficticios</span><span>Consulta al 30 oct 2026</span><span>·</span><span>Soles (PEN)</span></div>
 <dl class="dash-metrics" aria-label="Indicadores del comercio">
 ${metric('Capital pendiente',money(d.capital),'Dinero de las compras que aún no se devuelve; sin intereses.')}
 ${metric('Cobros del periodo',money(d.cobros),'Del 1 al 30 oct 2026. Incluyen capital, interés y mora.')}
 ${metric('Capital vencido',money(d.vencido),'Parte del capital pendiente con fecha de pago ya pasada.')}
 ${metric('Clientes con saldo',String(d.conDeuda),`De ${clients.length} clientes de la demostración.`)}
 </dl>
 <div class="dash-row"><section class="card"><div class="card-top"><div><h2>Capital pendiente por cliente</h2><small>Comparación de importes en soles, sin intereses</small></div></div>
 <figure class="dash-chart" aria-label="Gráfico de barras de capital pendiente por cliente">
 ${d.rows.map(c=>`<div class="dash-chart-row"><div class="dash-chart-label"><span>${escapeHTML(c.name)}</span><strong>${money(c.capital)}</strong></div><svg role="img" aria-label="${escapeHTML(c.name)}: capital pendiente ${money(c.capital)}" viewBox="0 0 500 24" preserveAspectRatio="none"><rect width="500" height="24" rx="4" fill="#e4ebef"/><rect width="${500*c.capital/scale}" height="24" rx="4" fill="${c.id==='pedro'?'#8b5800':'#0f766e'}"/></svg></div>`).join('')}
 <figcaption class="dash-scale"><span>S/ 0.00</span><span>Escala máxima: ${money(scale)}</span></figcaption></figure>
 <details class="dash-source"><summary>Ver importes y línea autorizada en tabla</summary><div class="table-wrap"><table><caption class="sr">Capital y línea por cliente al 30 de octubre de 2026</caption><thead><tr><th scope="col">Cliente</th><th scope="col" class="money">Capital pendiente</th><th scope="col" class="money">Línea autorizada</th></tr></thead><tbody>${d.rows.map(c=>`<tr><th scope="row">${escapeHTML(c.name)}</th><td class="money">${money(c.capital)}</td><td class="money">${money(c.limit)}</td></tr>`).join('')}</tbody></table></div></details>
 </section><section class="card"><div class="card-top"><div><h2>Capital vigente y vencido</h2><small>Distribución del mismo capital pendiente</small></div></div>
 <figure class="dash-distribution" aria-label="Capital vigente ${money(d.vigente)}; capital vencido ${money(d.vencido)}; total ${money(d.capital)}"><svg role="img" aria-label="${d.capital?'Distribución del capital pendiente':'Sin capital pendiente en esta demostración'}" viewBox="0 0 500 24" preserveAspectRatio="none"><defs><pattern id="overdue-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#8b5800"/><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#c99a50" stroke-width="2"/></pattern></defs><rect width="500" height="24" rx="4" fill="#e4ebef"/><rect width="${currentWidth}" height="24" fill="#0f766e"/><rect x="${currentWidth}" width="${overdueWidth}" height="24" fill="url(#overdue-pattern)"/></svg>
 <figcaption class="dash-key"><div><span><i class="dash-swatch" aria-hidden="true"></i>Capital vigente</span><strong>${money(d.vigente)}</strong></div><div><span><i class="dash-swatch overdue" aria-hidden="true"></i>Capital vencido</span><strong>${money(d.vencido)}</strong></div></figcaption></figure>
 <p class="footnote">Vencido no equivale a interés por mora: aquí se clasifica solo el capital según su fecha de pago. La mora aparece en el detalle del cobro.</p>
 ${!d.capital?'<p class="notice success" style="margin-top:18px">No hay capital pendiente en esta demostración.</p>':''}
 </section></div>
 <div class="dash-row"><section class="card"><h2>Pagos que requieren atención</h2><p class="footnote">Situación a la fecha de consulta: 30 oct 2026. Estos importes sí incluyen los intereses del pago indicado.</p><div class="dash-queue">
 ${!paid?`<article class="dash-due"><div class="dash-due-top"><strong>Pedro · Ejemplo Reto 3</strong><span class="badge neutral">Venció el 25 oct</span></div><h3>${money(510.08)} para cancelar el pago</h3><p>5 días de atraso · Capital S/ 500.00 + interés S/ 7.31 + mora S/ 2.77.</p><button id="dashboard-pedro">Revisar pago de Pedro</button></article>`:`<article class="dash-due"><div class="dash-due-top"><strong>Pedro · Ejemplo Reto 3</strong><span class="badge">Pagado en demo</span></div><p>Se recibieron S/ 510.08 el 30 oct 2026. Capital pendiente: S/ 0.00.</p></article>`}
 ${registered?`<article class="dash-due"><div class="dash-due-top"><strong>Lucía · Ejemplo Reto 4</strong><span class="badge neutral">Próximo: 25 nov</span></div><h3>Primera cuota: ${money(427.10)}</h3><p>De una compra registrada por S/ 1,200.00 en tres cuotas. La cuota contiene interés y capital devuelto.</p><button id="dashboard-lucia">Ver cronograma de Lucía</button></article>`:`<article class="dash-due"><strong>Sin otros vencimientos registrados</strong><p>El ejemplo de Lucía aparecerá aquí cuando registres su venta ficticia.</p><button id="load-scenario">Preparar ejemplo Reto 4</button></article>`}
 </div></section>
 <section class="card"><h2>Qué representa cada cifra</h2><dl class="dash-source" style="margin-top:20px"><div><dt style="font-weight:600">Capital pendiente</dt><dd style="margin:4px 0 16px;color:var(--muted)">Suma del capital que aún debe cada cliente. No suma el interés del plan ni la mora.</dd></div><div><dt style="font-weight:600">Cobros del periodo</dt><dd style="margin:4px 0 16px;color:var(--muted)">Dinero recibido por pagos registrados. Incluye devolución de capital; no representa ganancia.</dd></div><div><dt style="font-weight:600">Capital vencido</dt><dd style="margin:4px 0 16px;color:var(--muted)">Parte del capital pendiente que ya debía pagarse. Está incluida en el total, no se suma otra vez.</dd></div></dl><p class="notice">Los gráficos usan los mismos datos de los indicadores y sus tablas. No se evalúa riesgo ni se calculan utilidades.</p></section></div>
 <section class="card"><div class="card-top"><div><h2>De la compra a la primera cuota</h2><small>Diagrama del Reto 4 · referencia para entender las fechas</small></div></div><ol class="dash-flow" aria-label="Secuencia de la compra de Lucía"><li><span class="flow-date">8 oct 2026</span><strong>Compra</strong><small>Capital de S/ 1,200.00.</small></li><li><span class="flow-date">10 oct 2026</span><strong>Corte</strong><small>La compra pertenece al ciclo actual.</small></li><li><span class="flow-date">25 oct 2026</span><strong>Termina la gracia</strong><small>No paga cuota. El interés se suma al capital.</small></li><li><span class="flow-date">25 nov 2026</span><strong>Primera cuota</strong><small>S/ 427.10; después vienen dos pagos más.</small></li></ol><p class="footnote">Es el caso de cuotas del ejemplo. Una compra en Fin de mes tiene un solo pago en su fecha pactada y se revisa con sus propias condiciones.</p></section>
 <details class="dash-source"><summary>Origen de los datos de esta demostración</summary><p>Pedro es un caso fijo del Reto 3, pendiente al abrir la maqueta. Lucía solo se suma después de registrar la venta del Reto 4. Los clientes nuevos no contraen deuda al crearlos. Los indicadores cambian al registrar las operaciones ficticias; recargar reinicia la demostración.</p><p>No hay conexión al servidor ni datos de tu tienda real. La fecha de consulta está fijada para no mezclar los casos de prueba con la fecha de hoy.</p></details>`;
}
'''
s = s.replace('function render(){renderNav();let body;if(route=', dashboard + '\nfunction render(){renderNav();let body;if(route=')
s = s.replace("let body;if(route==='venta')", "let body;if(route==='dashboard')body=dashboardPage();else if(route==='venta')", 1)
s = s.replace("({venta:'Venta a crédito'", "({dashboard:'Dashboard',venta:'Venta a crédito'", 1)
s = s.replace("role==='Cliente'?'mi-estado':'venta'", "role==='Cliente'?'mi-estado':'dashboard'", 1)
s = s.replace("location.hash.slice(1)||'venta'", "location.hash.slice(1)||'dashboard'")
s = s.replace(":['venta','clientes'", ":['dashboard','venta','clientes'")
s = s.replace("if(!['venta','clientes'", "if(!['dashboard','venta','clientes'")
s = s.replace("route='venta';render();", "route='dashboard';render();")
s = s.replace("on('#load-scenario','click',loadScenario);", "on('#load-scenario','click',loadScenario);on('#dashboard-pedro','click',()=>{paymentClient='pedro';status='';navigate('pago')});on('#dashboard-lucia','click',()=>{clientTab='cuotas';status='';navigate('estado')});", 1)
(out/'prototipo.html').write_text(s, encoding='utf-8')
(out/'prototipo-check.mjs').write_text(re.search(r'<script>([\s\S]*?)</script>',s).group(1), encoding='utf-8')
print('Creado prototipo v3 con dashboard. Bytes:', len(s.encode('utf-8')))
