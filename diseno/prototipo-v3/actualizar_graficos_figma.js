// Actualización incremental del dashboard; no reconstruye las demás pantallas.
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const dash=await figma.getNodeByIdAsync('4:115'), main=await figma.getNodeByIdAsync('4:139'), mobile=await figma.getNodeByIdAsync('4:820');
if(main.children.some(n=>n.name==='Evolución y vencimientos'))throw new Error('Los gráficos ya están actualizados; inspeccionar antes de repetir.');
const created=[],mutated=[],removed=[];
const col={bg:'#EAF2F8',border:'#C9DCE8',muted:'#8AA9C4',action:'#3E5C76',ink:'#1D2D44',white:'#FFFFFF'};
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const styles=await figma.getLocalPaintStylesAsync();
function keep(n){created.push(n.id);return n;}
function fill(n,k){n.fills=[{type:'SOLID',color:rgb(col[k])}];const s=styles.find(s=>s.name==='Invierno/'+k);if(s)n.fillStyleId=s.id;}
function box(p,name,w,dir='VERTICAL',gap=12,pad=0,color=null){const n=keep(figma.createAutoLayout(dir));n.name=name;n.resize(w,10);p.appendChild(n);n.layoutSizingHorizontal='FIXED';n.layoutSizingVertical='HUG';n.itemSpacing=gap;n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;n.fills=[];if(color)fill(n,color);return n;}
function txt(p,s,size=13,weight='Regular',color='ink',width=null){const t=keep(figma.createText());t.name=s;t.fontName={family:'Inter',style:weight};t.fontSize=size;t.lineHeight={unit:'PERCENT',value:140};t.characters=s;fill(t,color);p.appendChild(t);if(width){t.textAutoResize='HEIGHT';t.resize(width,t.height);}return t;}
function card(p,name,w){const n=box(p,name,w,'VERTICAL',14,22,'white');n.cornerRadius=12;n.strokes=[{type:'SOLID',color:rgb(col.border)}];return n;}
function clear(n){for(const c of [...n.children]){removed.push(c.id);c.remove();}mutated.push(n.id);}
function money(n){return 'S/ '+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function verticalBars(p,data,width,max,keys=['Importe']){
 const chart=box(p,'Gráfico de columnas · escala desde cero',width,'HORIZONTAL',12);
 const axis=box(chart,'Escala en soles',54,'VERTICAL',0);axis.resize(54,230);axis.layoutSizingVertical='FIXED';axis.primaryAxisAlignItems='SPACE_BETWEEN';txt(axis,max.toLocaleString('en-US'),11,'Regular','action');txt(axis,(max/2).toLocaleString('en-US'),11,'Regular','action');txt(axis,'0',11,'Regular','action');
 const area=box(chart,'Categorías',width-66,'HORIZONTAL',16);const gw=(width-66-16*(data.length-1))/data.length;
 for(const d of data){const group=box(area,d.label,gw,'VERTICAL',8);const plot=box(group,'Importes',gw,'HORIZONTAL',8);plot.resize(gw,230);plot.layoutSizingVertical='FIXED';plot.counterAxisAlignItems='MAX';
 if(!d.values){const empty=box(plot,'Sin registros',gw,'VERTICAL',6);empty.resize(gw,230);empty.layoutSizingVertical='FIXED';empty.primaryAxisAlignItems='CENTER';empty.counterAxisAlignItems='CENTER';txt(empty,'—',20,'Medium','action');txt(empty,'Sin registros',11,'Regular','action');}
 else d.values.forEach((v,i)=>{const bw=(gw-8*(d.values.length-1))/d.values.length;const bcol=box(plot,keys[i]+' '+money(v),bw,'VERTICAL',6);bcol.counterAxisAlignItems='CENTER';txt(bcol,v===0?'0.00':v.toLocaleString('en-US',{minimumFractionDigits:2}),width<400?10:12,'Semi Bold','ink');const bar=keep(figma.createRectangle());bar.name=keys[i]+' · '+money(v);bar.resize(Math.min(56,bw),v>0?230*v/max:1);fill(bar,i===0?'action':'muted');bar.cornerRadius=3;bcol.appendChild(bar);});
 txt(group,d.label,12,'Medium','action',gw);
 }
 txt(p,'Escala: S/ 0 a '+max.toLocaleString('en-US')+' · Valores en soles',11,'Regular','action',width);
}
function donut(p,width){
 const graphic=box(p,'Anillo proporcional · capital pendiente',width,'HORIZONTAL',0);graphic.counterAxisAlignItems='CENTER';graphic.primaryAxisAlignItems='CENTER';const chart=keep(figma.createFrame());chart.name='Vigente 70.6 % · Vencido 29.4 %';chart.resize(190,190);chart.fills=[];graphic.appendChild(chart);
 const base=keep(figma.createEllipse());base.name='Vencido · S/ 500.00 · 29.4 %';base.resize(190,190);base.arcData={startingAngle:0,endingAngle:Math.PI*2,innerRadius:0.73};fill(base,'muted');chart.appendChild(base);
 const part=keep(figma.createEllipse());part.name='Vigente · S/ 1,200.00 · 70.6 %';part.resize(190,190);part.arcData={startingAngle:-Math.PI/2,endingAngle:-Math.PI/2+2*Math.PI*1200/1700,innerRadius:0.73};fill(part,'action');chart.appendChild(part);
 const center=box(chart,'Total del anillo',132,'VERTICAL',2);center.x=29;center.y=67;center.counterAxisAlignItems='CENTER';txt(center,'S/ 1,700',21,'Bold');txt(center,'Capital pendiente',11,'Regular','action');
 txt(p,'Vigente   70.6 %   ·   S/ 1,200.00',13,'Semi Bold','action',width);txt(p,'Vencido   29.4 %   ·   S/ 500.00',13,'Semi Bold','ink',width);txt(p,'Ambas partes suman el capital pendiente. No incluye intereses ni mora.',12,'Regular','action',width);
}
const bars=await figma.getNodeByIdAsync('4:173');const donutCard=await figma.getNodeByIdAsync('4:193');
const accountButton=await figma.getNodeByIdAsync('4:187');const saved=accountButton.clone();created.push(saved.id,...saved.findAll(()=>true).map(n=>n.id));main.appendChild(saved);
clear(bars);txt(bars,'Capital pendiente por cliente',18,'Semi Bold');txt(bars,'Consulta al 30 oct 2026 · Sin intereses',12,'Regular','action');verticalBars(bars,[{label:'Lucía',values:[1200]},{label:'Pedro',values:[500]}],660,1500);bars.appendChild(saved);
clear(donutCard);txt(donutCard,'Estado de la cartera',18,'Semi Bold');txt(donutCard,'Consulta al 30 oct 2026 · Capital',12,'Regular','action');donut(donutCard,368);
const second=box(main,'Evolución y vencimientos',1136,'HORIZONTAL',20);main.insertChild(4,second);
const monthly=card(second,'Ventas y cobros por mes',704);txt(monthly,'Ventas a crédito y cobros',18,'Semi Bold');txt(monthly,'Ago–oct 2026 · Solo octubre tiene registros en este caso',12,'Regular','action',660);verticalBars(monthly,[{label:'Ago 2026',values:null},{label:'Sep 2026',values:null},{label:'Oct 2026',values:[1700,0]}],660,2000,['Ventas','Cobros']);txt(monthly,'■ Ventas a crédito (azul oscuro)     ■ Cobros recibidos (azul claro)',12,'Regular','action',660);txt(monthly,'Octubre: ventas S/ 1,700.00 · Cobros S/ 0.00. Sin registros no significa cero actividad real. Los cobros no equivalen a ganancias.',12,'Regular','action',660);
const due=card(second,'Próximos vencimientos por mes',412);txt(due,'Próximos vencimientos',18,'Semi Bold');txt(due,'Cuotas de Lucía · Desde el 31 oct 2026',12,'Regular','action',368);verticalBars(due,[{label:'Nov 2026',values:[427.10]},{label:'Dic 2026',values:[427.10]},{label:'Ene 2027',values:[427.09]}],368,500);txt(due,'Programado: S/ 1,281.29 · Incluye intereses del cronograma. Son importes por vencer, no cobros recibidos.',12,'Regular','action',368);
// Una vista tabular enlazada ofrece los valores exactos de los cuatro gráficos.
const data=box(page,'13 · Datos de los gráficos',1440,'VERTICAL',22,40,'bg');data.x=1800;data.y=6200;txt(data,'Datos del dashboard',30,'Bold');txt(data,'Demostración fija · Soles (PEN) · Consulta al 30 oct 2026',14,'Medium','action');
for(const [heading,lines] of [['Capital por cliente',['Lucía: S/ 1,200.00','Pedro: S/ 500.00','Total: S/ 1,700.00']],['Estado de la cartera',['Vigente: S/ 1,200.00 · 70.6 %','Vencido: S/ 500.00 · 29.4 %']],['Ventas a crédito y cobros',['Ago 2026: sin registros; sin barras','Sep 2026: sin registros; sin barras','Oct 2026: ventas S/ 1,700.00; cobros S/ 0.00']],['Próximos vencimientos',['Nov 2026: S/ 427.10','Dic 2026: S/ 427.10','Ene 2027: S/ 427.09','Total programado: S/ 1,281.29']]]){const c=card(data,heading,1360);txt(c,heading,18,'Semi Bold');for(const l of lines)txt(c,l,14);}
const existingButton=await figma.getNodeByIdAsync('4:187').catch(()=>null);
function navClone(p,src,label,dest){const n=src.clone();p.appendChild(n);created.push(n.id,...n.findAll(()=>true).map(x=>x.id));n.name=label;n.setProperties({'Label#2:0':label});return n.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:dest,navigation:'NAVIGATE',transition:null,resetScrollPosition:true}]}]);}
await navClone(data,saved,'Volver al dashboard',dash.id);await navClone(main,saved,'Ver datos de los gráficos',data.id);
// Adaptación móvil: sustituir barras antiguas y añadir gráficos apilados.
const old=mobile.children.find(n=>n.name==='Capital por cliente');let mobileIndex=mobile.children.indexOf(old);clear(old);txt(old,'Capital por cliente',18,'Semi Bold');verticalBars(old,[{label:'Lucía',values:[1200]},{label:'Pedro',values:[500]}],306,1500);
const dm=card(mobile,'Estado de la cartera',350);mobile.insertChild(mobileIndex+1,dm);txt(dm,'Estado de la cartera',18,'Semi Bold');donut(dm,306);
const mm=card(mobile,'Ventas y cobros por mes',350);mobile.insertChild(mobileIndex+2,mm);txt(mm,'Ventas y cobros',18,'Semi Bold');txt(mm,'Oct 2026 · Único mes con registros en el caso',12,'Regular','action',306);verticalBars(mm,[{label:'Ventas',values:[1700]},{label:'Cobros',values:[0]}],306,2000);txt(mm,'Cobros recibidos: S/ 0.00. No equivalen a ganancias.',12,'Regular','action',306);
const pm=card(mobile,'Próximos vencimientos',350);mobile.insertChild(mobileIndex+3,pm);txt(pm,'Próximos vencimientos',18,'Semi Bold');verticalBars(pm,[{label:'Nov 26',values:[427.10]},{label:'Dic 26',values:[427.10]},{label:'Ene 27',values:[427.09]}],306,500);txt(pm,'Cuotas de Lucía · Programado, aún no cobrado. Total S/ 1,281.29.',12,'Regular','action',306);await navClone(mobile,saved,'Ver datos de los gráficos',data.id);
// La barra lateral crece con el contenido del dashboard; las otras vistas se conservan.
const side=dash.findOne(n=>n.type==='FRAME'&&n.name==='Navegación');side.layoutSizingVertical='FILL';mutated.push(side.id,dash.id,main.id,mobile.id);
return {createdNodeIds:created,mutatedNodeIds:mutated,removedNodeIds:removed,dataFrameId:data.id,chartData:{capital:[1200,500],vigente:1200,vencido:500,ventasOctubre:1700,cobrosOctubre:0,proximasCuotas:[427.10,427.10,427.09]},dashboard:{id:dash.id,w:dash.width,h:dash.height},mobile:{id:mobile.id,w:mobile.width,h:mobile.height}};
