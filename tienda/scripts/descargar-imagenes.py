#!/usr/bin/env python3
"""
Descarga y optimiza TODAS las imágenes de los productos para que la tienda no
dependa de Amazon ni de ningún dominio externo.

Uso (desde la carpeta tienda/):   python3 scripts/descargar-imagenes.py

Qué hace, para cada producto de data/catalogo.json y data/encargo.json:
  1. Toma sus imágenes (URL externa o archivo local). En URLs de Amazon pide la
     versión grande (._AC_SL1500_) y, si falla, la original.
  2. Guarda la copia intacta en img/originales/<slug>/N.jpg (respaldo).
  3. Genera img/productos/<slug>/N.jpg (máx. 1200 px de ancho, JPG) y N.webp (calidad 80).
  4. Genera la imagen para compartir img/og/<slug>.jpg (1200x630, producto centrado sobre blanco).
  5. Escribe img/productos/manifiesto.json (slug, archivos, URL de origen, fecha).
  6. Actualiza los datos para que todas las rutas sean locales (y guarda la URL
     de origen en "fotoOrigen" / "imagenesOrigen" para poder volver a descargar).
El script es repetible: si una imagen ya está en img/originales/ no la vuelve a bajar.
Requiere Pillow (pip install pillow).
"""
import json, os, re, subprocess, sys, shutil, hashlib
from datetime import date
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)
ANCHO_MAX = 1200
CAL_JPG = 85
CAL_WEBP = 80
HOY = date.today().isoformat()

def leer(p): return json.load(open(p, encoding='utf-8'))
def escribir(p, d):
    with open(p, 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')

catalogo = leer('data/catalogo.json')
encargo = leer('data/encargo.json')
slugs = leer('data/slugs.json')
manifiesto_prev = leer('img/productos/manifiesto.json') if os.path.exists('img/productos/manifiesto.json') else {'productos': []}
prev = {m['slug']: m for m in manifiesto_prev.get('productos', [])}

def slug_de(pid):
    if pid not in slugs:
        slugs[pid] = re.sub(r'^ya-', '', pid)
    return slugs[pid]

def descargar(url, destino):
    """Descarga url a destino con curl (respeta el proxy del sistema). Devuelve True si quedó un archivo de imagen válido."""
    r = subprocess.run(['curl', '-fsSL', '--retry', '2', '-o', destino, url], capture_output=True)
    if r.returncode != 0 or not os.path.exists(destino): return False
    try:
        with Image.open(destino) as im: im.verify()
        return True
    except Exception:
        os.remove(destino); return False

def obtener_original(origen, destino):
    """Deja en destino la copia intacta de la imagen (descargada en máxima resolución o copiada del archivo local)."""
    if os.path.exists(destino): return 'ya estaba'
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    if re.match(r'^https?://', origen):
        candidatos = []
        if 'media-amazon.com' in origen:
            grande = re.sub(r'\._[A-Z0-9_,]+_\.', '._AC_SL1500_.', origen)
            if grande != origen: candidatos.append(grande)
        candidatos.append(origen)
        for u in candidatos:
            if descargar(u, destino): return 'descargada ' + ('(1500 px)' if u != origen else '(original)')
        raise RuntimeError(f'No se pudo descargar {origen}')
    local = re.sub(r'^tienda/', '', origen)
    if not os.path.exists(local): raise RuntimeError(f'No existe el archivo local {local}')
    shutil.copy2(local, destino); return 'copiada del archivo local'

def optimizar(original, base_sin_ext):
    with Image.open(original) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ('RGBA', 'LA', 'P'):
            fondo = Image.new('RGB', im.size, (255, 255, 255)); fondo.paste(im.convert('RGBA'), mask=im.convert('RGBA').split()[-1]); im = fondo
        else: im = im.convert('RGB')
        if im.width > ANCHO_MAX: im = im.resize((ANCHO_MAX, round(im.height * ANCHO_MAX / im.width)), Image.LANCZOS)
        im.save(base_sin_ext + '.jpg', 'JPEG', quality=CAL_JPG, optimize=True, progressive=True)
        im.save(base_sin_ext + '.webp', 'WEBP', quality=CAL_WEBP, method=6)
        # versión pequeña para tarjetas, carrito y buscador (400 px de ancho)
        chica = im.copy(); chica.thumbnail((400, 400), Image.LANCZOS)
        chica.save(base_sin_ext + '-400.jpg', 'JPEG', quality=CAL_JPG, optimize=True)
        chica.save(base_sin_ext + '-400.webp', 'WEBP', quality=CAL_WEBP, method=6)
        return im.width, im.height

def imagen_og(original, destino):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    lienzo = Image.new('RGB', (1200, 630), (255, 255, 255))
    with Image.open(original) as im:
        im = ImageOps.exif_transpose(im).convert('RGBA')
        im.thumbnail((1000, 560), Image.LANCZOS)
        fondo = Image.new('RGB', im.size, (255, 255, 255)); fondo.paste(im, mask=im.split()[-1])
        lienzo.paste(fondo, ((1200 - im.width) // 2, (630 - im.height) // 2))
    lienzo.save(destino, 'JPEG', quality=88, optimize=True)

def procesar(pid, nombre, origenes):
    slug = slug_de(pid)
    salida = []
    # Foto con el empaque traducido (scripts/traducir-foto.py → img/originales/<slug>/1-es.jpg): va de primera y la original queda de segunda
    es = f'img/originales/{slug}/1-es.jpg'
    if os.path.exists(es):
        origenes = [es] + [o for o in origenes if not o.endswith('1-es.jpg')]
    for n, origen in enumerate(origenes, 1):
        # Si el dato ya es la ruta local optimizada, el origen real está en el manifiesto anterior
        if re.match(rf'^img/productos/{re.escape(slug)}/\d+\.jpg$', origen):
            previo = next((x for x in prev.get(slug, {}).get('imagenes', []) if x['archivo'] == origen), None)
            origen = previo['origen'] if previo else origen
        ext = '.png' if origen.lower().endswith('.png') else '.jpg'
        original = origen if origen.endswith('1-es.jpg') else f'img/originales/{slug}/{n - (1 if os.path.exists(es) else 0)}{ext}'
        try:
            estado = obtener_original(origen, original)
        except RuntimeError as e:
            print(f'  ✗ {e}'); continue
        os.makedirs(f'img/productos/{slug}', exist_ok=True)
        w, h = optimizar(original, f'img/productos/{slug}/{n}')
        if n == 1: imagen_og(original, f'img/og/{slug}.jpg')
        print(f'  ✓ {slug}/{n}.jpg {w}x{h} ({estado})')
        salida.append({'archivo': f'img/productos/{slug}/{n}.jpg', 'webp': f'img/productos/{slug}/{n}.webp', 'chica': f'img/productos/{slug}/{n}-400.jpg', 'original': original,
                       'ancho': w, 'alto': h, 'origen': origen, 'descargado': HOY if estado.startswith('descargada') or estado.startswith('copiada') else prev.get(slug, {}).get('descargado', HOY)})
    return slug, salida

manifiesto = {'generado': HOY, 'nota': 'Imágenes locales de los productos. "origen" es la URL o archivo del que se bajó; "original" es la copia intacta de respaldo.', 'productos': []}

print('Catálogo propio (data/catalogo.json)')
for p in catalogo['productos']:
    print(p['id'])
    origenes = p.get('imagenesOrigen') or p.get('imagenes') or []
    slug, imgs = procesar(p['id'], p['nombre'], origenes)
    if imgs:
        p['imagenesOrigen'] = [i['origen'] for i in imgs]
        p['imagenes'] = [i['archivo'] for i in imgs]
        manifiesto['productos'].append({'slug': slug, 'id': p['id'], 'nombre': p['nombre'], 'og': f'img/og/{slug}.jpg', 'descargado': HOY, 'imagenes': imgs})

print('Productos de la hoja (data/encargo.json)')
for p in encargo['productos']:
    print(p['id'])
    origen = p.get('fotoOrigen') or p.get('foto')
    if not origen: print('  (sin foto)'); continue
    slug, imgs = procesar(p['id'], p['nombre'], [origen])
    if imgs:
        p['fotoOrigen'] = next((i['origen'] for i in imgs if not i['origen'].endswith('1-es.jpg')), imgs[0]['origen'])
        p['foto'] = imgs[0]['archivo']
        p['fotos'] = [i['archivo'] for i in imgs]  # todas las fotos locales (traducida primero, original después)
        manifiesto['productos'].append({'slug': slug, 'id': p['id'], 'nombre': p['nombre'], 'og': f'img/og/{slug}.jpg', 'descargado': HOY, 'imagenes': imgs})

# Combos: foto montada con los componentes lado a lado sobre blanco (1500x1500), luego el mismo tratamiento
if os.path.exists('data/combos.json'):
    combos = leer('data/combos.json')
    print('Combos (data/combos.json)')
    por_id = {p['id']: p for p in catalogo['productos']} | {p['id']: p for p in encargo['productos']}
    for k in combos.get('combos', []):
        if not k.get('publicado'): continue
        slug = slug_de(k['id'])
        fuentes = []
        for cid in k.get('componentes', []):
            c = por_id.get(cid)
            if not c: continue
            img = (c.get('imagenes') or [c.get('foto')])[0]
            m = next((x for x in prev.get(slug_de(cid), {}).get('imagenes', []) + [i for mm in manifiesto['productos'] if mm['id'] == cid for i in mm['imagenes']] if x['archivo'] == img), None)
            fuentes.append(m['original'] if m and os.path.exists(m['original']) else img)
        if len(fuentes) < 2: print(f'  ✗ {k["id"]}: faltan componentes'); continue
        original = f'img/originales/{slug}/1.jpg'
        os.makedirs(os.path.dirname(original), exist_ok=True)
        lienzo = Image.new('RGB', (1500, 1500), (255, 255, 255))
        ancho = 1500 // len(fuentes)
        for i, f in enumerate(fuentes):
            with Image.open(f) as im:
                im = ImageOps.exif_transpose(im).convert('RGBA'); im.thumbnail((ancho - 60, 1200), Image.LANCZOS)
                fondo = Image.new('RGB', im.size, (255, 255, 255)); fondo.paste(im, mask=im.split()[-1])
                lienzo.paste(fondo, (i * ancho + (ancho - im.width) // 2, (1500 - im.height) // 2))
        lienzo.save(original, 'JPEG', quality=92)
        os.makedirs(f'img/productos/{slug}', exist_ok=True)
        w, h = optimizar(original, f'img/productos/{slug}/1'); imagen_og(original, f'img/og/{slug}.jpg')
        k['imagenes'] = [f'img/productos/{slug}/1.jpg'] + [por_id[c].get('imagenes', [por_id[c].get('foto')])[0] for c in k['componentes'] if c in por_id]
        manifiesto['productos'].append({'slug': slug, 'id': k['id'], 'nombre': k['nombre'], 'og': f'img/og/{slug}.jpg', 'descargado': HOY,
            'imagenes': [{'archivo': f'img/productos/{slug}/1.jpg', 'webp': f'img/productos/{slug}/1.webp', 'chica': f'img/productos/{slug}/1-400.jpg', 'original': original, 'ancho': w, 'alto': h, 'origen': 'montaje: ' + ' + '.join(k['componentes']), 'descargado': HOY}]})
        print(f'  ✓ {slug}/1.jpg montaje de {len(fuentes)} productos')
    escribir('data/combos.json', combos)

escribir('img/productos/manifiesto.json', manifiesto)
escribir('data/catalogo.json', catalogo)
escribir('data/encargo.json', encargo)
escribir('data/slugs.json', slugs)
print(f'\nListo: {len(manifiesto["productos"])} productos con imágenes locales. Manifiesto en img/productos/manifiesto.json')
