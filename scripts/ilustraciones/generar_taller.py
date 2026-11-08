# Genera las ilustraciones propias del catálogo del taller (requiere Pillow). Uso: cd scripts/ilustraciones && python3 generar_taller.py
# Escribe imagenesTaller.ts; copiarlo a src/infraestructura/demostracion/.
from PIL import Image, ImageDraw
import math, base64, io, json
S=4; W,H=240,180
BG=(236,244,240); INK=(23,60,50); ACC=(16,120,92); ACC2=(120,190,165); WARM=(232,170,60); BLUE=(70,130,190); GREY=(120,135,130); LIGHT=(255,255,255)
def canvas():
    im=Image.new('RGB',(W*S,H*S),BG); return im,ImageDraw.Draw(im)
def p(*v): return [x*S for x in v]
def rr(d,box,r,fill,outline=None,w=3):
    d.rounded_rectangle(p(*box),radius=r*S,fill=fill,outline=outline,width=w*S if outline else 0)
def circ(d,cx,cy,r,fill,outline=None,w=3):
    d.ellipse(p(cx-r,cy-r,cx+r,cy+r),fill=fill,outline=outline,width=w*S if outline else 0)
def drop(d,cx,cy,s,fill):
    d.polygon(p(cx,cy-s*1.6,cx-s*0.95,cy+s*0.1,cx+s*0.95,cy+s*0.1),fill=fill)
    circ(d,cx,cy+s*0.15,s*0.95,fill)
def finish(im,name):
    im=im.resize((W,H),Image.LANCZOS); im=im.convert('P',palette=Image.ADAPTIVE,colors=48)
    b=io.BytesIO(); im.save(b,'PNG',optimize=True); return name,b.getvalue()
out={}
# KIT-001 tambor + filtro
im,d=canvas()
rr(d,(40,40,120,150),10,ACC,INK); 
for y in (62,128): d.line(p(40,y,120,y),fill=INK,width=3*S)
rr(d,(62,82,98,108),4,LIGHT); drop(d,80,92,6,WARM)
rr(d,(140,78,196,150),8,WARM,INK); rr(d,(146,66,190,80),4,GREY,INK)
for x in (156,168,180): d.line(p(x,86,x,142),fill=INK,width=2*S)
out['KIT-001']=finish(im,'KIT-001')
# SRV-014 engine overhaul: gear + wrench
im,d=canvas()
cx,cy=100,92
for a in range(0,360,30):
    t=math.radians(a); x,y=cx+54*math.cos(t),cy+54*math.sin(t)
    d.polygon(p(*[cx+46*math.cos(t-0.16),cy+46*math.sin(t-0.16),cx+58*math.cos(t-0.12),cy+58*math.sin(t-0.12),cx+58*math.cos(t+0.12),cy+58*math.sin(t+0.12),cx+46*math.cos(t+0.16),cy+46*math.sin(t+0.16)]),fill=ACC)
circ(d,cx,cy,50,ACC,INK); circ(d,cx,cy,22,BG,INK)
d.line(p(152,152,192,70),fill=INK,width=14*S); d.line(p(152,152,192,70),fill=WARM,width=9*S); circ(d,196,58,16,WARM,INK); d.polygon(p(190,38,196,58,204,38),fill=BG)
out['SRV-014']=finish(im,'SRV-014')
# ACE-002 bidón de aceite
im,d=canvas()
rr(d,(66,56,160,154),12,WARM,INK); rr(d,(76,36,124,60),6,GREY,INK); rr(d,(124,44,150,60),5,GREY,INK)
d.arc(p(120,20,170,62),200,350,fill=INK,width=6*S)
rr(d,(80,84,146,128),6,LIGHT,INK); drop(d,113,102,8,INK); d.line(p(90,120,136,120),fill=ACC,width=3*S)
out['ACE-002']=finish(im,'ACE-002')
# FIL-021 filtro
im,d=canvas()
rr(d,(74,58,166,150),14,ACC,INK); rr(d,(66,44,174,64),6,GREY,INK); rr(d,(96,36,144,48),4,INK)
for y in (80,140): d.line(p(78,y,162,y),fill=INK,width=2*S)
rr(d,(98,92,142,124),5,LIGHT,INK,2); drop(d,120,106,6,WARM)
out['FIL-021']=finish(im,'FIL-021')
# FRE-030 disco y pinza
im,d=canvas()
cx,cy=105,90
circ(d,cx,cy,64,GREY,INK); circ(d,cx,cy,52,(200,210,205)); circ(d,cx,cy,18,BG,INK)
for i in range(8):
    t=math.radians(i*45+22); circ(d,cx+34*math.cos(t),cy+34*math.sin(t),6,BG,INK,2)
rr(d,(138,58,196,122),10,WARM,INK); rr(d,(150,72,184,108),5,BG,INK,2); d.line(p(167,72,167,108),fill=INK,width=2*S)
out['FRE-030']=finish(im,'FRE-030')
# BAT-012 batería
im,d=canvas()
rr(d,(36,62,204,152),10,ACC,INK); rr(d,(58,44,88,64),4,GREY,INK); rr(d,(152,44,182,64),4,GREY,INK)
d.text(p(66,48),'+',fill=INK); 
d.polygon(p(124,76,98,112,116,112,108,142,140,100,120,100),fill=WARM,outline=INK)
d.line(p(36,126,204,126),fill=INK,width=2*S)
out['BAT-012']=finish(im,'BAT-012')
# SRV-020 llanta + flechas
im,d=canvas()
cx,cy=105,92
circ(d,cx,cy,68,INK); circ(d,cx,cy,52,GREY); circ(d,cx,cy,34,LIGHT,INK)
for i in range(5):
    t=math.radians(i*72-90); d.line(p(cx,cy,cx+32*math.cos(t),cy+32*math.sin(t)),fill=ACC,width=5*S)
circ(d,cx,cy,8,ACC,INK,2)
d.line(p(176,60,176,124),fill=WARM,width=5*S); d.polygon(p(176,48,166,64,186,64),fill=WARM); d.polygon(p(176,136,166,120,186,120),fill=WARM)
d.line(p(200,60,200,124),fill=ACC2,width=5*S); d.polygon(p(200,48,190,64,210,64),fill=ACC2); d.polygon(p(200,136,190,120,210,120),fill=ACC2)
out['SRV-020']=finish(im,'SRV-020')
# LIQ-005 refrigerante
im,d=canvas()
rr(d,(78,56,150,154),12,BLUE,INK); rr(d,(94,36,134,60),6,GREY,INK); rr(d,(90,26,138,40),4,INK)
rr(d,(88,84,140,128),6,LIGHT,INK); drop(d,114,102,8,BLUE); d.line(p(96,120,132,120),fill=ACC,width=3*S)
d.arc(p(150,70,196,126),-90,90,fill=INK,width=0)
out['LIQ-005']=finish(im,'LIQ-005')
ts="/** Ilustraciones propias y referenciales de los productos del taller (no son fotografías ni marcas reales). Generadas con scripts/ilustraciones. */\nexport const IMAGENES_TALLER: Record<string, string> = {\n"
for k,(n,b) in out.items():
    open(f'./{k}.png','wb').write(b); print(k,len(b))
    ts+=f"    '{k}': 'data:image/png;base64,{base64.b64encode(b).decode()}',\n"
ts+="};\n"
open('./imagenesTaller.ts','w').write(ts)
# hoja de contacto
sheet=Image.new('RGB',(240*4,180*2),BG)
for i,k in enumerate(out): sheet.paste(Image.open(f'./{k}.png').convert('RGB'),((i%4)*240,(i//4)*180))
sheet.save('./hoja.png')
