"""Genera web/juego/filas.js: una muestra estratificada de filas reales del Excel para los hongos del juego.

Uso:  python3 web/tools/filas_juego.py v5_Hongos_DataSet_Rodrigo_Vidal.xlsx web/juego/filas.js
No necesita pandas: lee el .xlsx con la biblioteca estándar (zipfile + xml).
"""
import zipfile, re, sys, json, random, collections
import xml.etree.ElementTree as ET
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
def col(ref):
    n=0
    for ch in re.match(r'[A-Z]+',ref).group(): n=n*26+ord(ch)-64
    return n-1
def sheets(path):
    z=zipfile.ZipFile(path)
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rmap={r.get('Id'):r.get('Target') for r in rels}
    out={}
    for s in wb.iter(NS+'sheet'):
        rid=s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        out[s.get('name')]='xl/'+rmap[rid].lstrip('/').replace('xl/','')
    return z,out
def rows(path, name, limit=None):
    z,sh=sheets(path)
    ss=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).iter(NS+'si'):
            ss.append(''.join(t.text or '' for t in si.iter(NS+'t')))
    f=z.open(sh[name]); n=0
    for ev,el in ET.iterparse(f):
        if el.tag==NS+'row':
            r={}
            for c in el.iter(NS+'c'):
                v=c.find(NS+'v'); t=c.get('t')
                if v is None:
                    is_=c.find(NS+'is'); val=''.join(x.text or '' for x in is_.iter(NS+'t')) if is_ is not None else None
                else:
                    val=v.text
                    if t=='s': val=ss[int(val)]
                    elif t in (None,'n'):
                        try: val=float(val)
                        except: pass
                r[col(c.get('r'))]=val
            mx=max(r) if r else -1
            yield [r.get(i) for i in range(mx+1)]
            el.clear(); n+=1
            if limit and n>=limit: break
src, out = sys.argv[1], sys.argv[2]
it = rows(src, 'Data'); head = next(it); H = {h: i for i, h in enumerate(head) if h}
need = ['class','cap-diameter','cap-shape Nombre','cap-color Nombre','stem-height','stem-width','has-ring Nombre','does-bruise-or-bleed Nombre','habitat Nombre','cap-surface Nombre','stem-color Nombre','gill-color','Con tallo']
SH = ['Convexa','Plana','Campana','Cónica','Esférica','Hundida','Otras']
CO = ['Blanco','Crema','Marrón','Gris','Negro','Amarillo','Naranja','Rojo','Rosa','Verde','Púrpura','Azul']
HAB = ['Bosques','Hojas','Pastos','Prados','Caminos','Matorrales','Urbano','Desechos']
groups = collections.defaultdict(list); n = 0
for r in it:
    g = lambda k: r[H[k]] if H[k] < len(r) else None
    if g('Con tallo') != 'Sí': continue
    try: d, sh, sw = float(g('cap-diameter')), float(g('stem-height')), float(g('stem-width'))
    except (TypeError, ValueError): continue
    if not (1 <= d <= 25 and sh >= 1 and sw >= 1): continue
    shape, color = g('cap-shape Nombre'), g('cap-color Nombre')
    if shape not in SH or color not in CO: continue
    ratio = sw / d
    row = [1 if g('class') == 'p' else 0, round(d, 1), round(sh, 1), round(sw, 1), SH.index(shape), CO.index(color),
           1 if g('has-ring Nombre') == 'Sí' else 0, 1 if g('does-bruise-or-bleed Nombre') == 'Sí' else 0,
           HAB.index(g('habitat Nombre')) if g('habitat Nombre') in HAB else 0]
    key = (row[0], row[4], row[5], row[6], row[7], 0 if d <= 4 else 2 if d >= 10 else 1, 0 if ratio < 1.4 else 2 if ratio > 2.2 else 1)
    groups[key].append(row); n += 1
random.seed(7)
sel = []
for k, v in groups.items(): sel += random.sample(v, min(3, len(v)))
print('filas', n, 'grupos', len(groups), 'elegidas', len(sel))
txt = ('// Filas reales del Excel (hoja Data de v5_Hongos_DataSet_Rodrigo_Vidal.xlsx): una muestra estratificada,\n'
       '// hasta 3 por combinación de toxicidad, forma, color, anillo, magulladura, tamaño y grosor del tallo.\n'
       '// Generado con web/tools/filas_juego.py. Campos: ' + json.dumps(['tox','diametro_cm','alto_tallo_cm','ancho_tallo_mm','forma','color','anillo','mancha','habitat']) + '\n'
       'export const FORMAS = ' + json.dumps(SH, ensure_ascii=False) + ';\n'
       'export const COLORES = ' + json.dumps(CO, ensure_ascii=False) + ';\n'
       'export const HABITATS = ' + json.dumps(HAB, ensure_ascii=False) + ';\n'
       'export const FILAS = ' + json.dumps(sel, separators=(',', ':')) + ';\n')
open(out, 'w').write(txt)
