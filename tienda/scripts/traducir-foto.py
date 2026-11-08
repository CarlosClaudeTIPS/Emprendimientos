#!/usr/bin/env python3
"""
Traduce al español los textos del empaque en las fotos de producto.
Borra el texto original reconstruyendo el fondo (inpainting) y dibuja el texto en español con un
color tomado del original y modulado por la luz del envase.

Uso (desde tienda/):  python3 scripts/traducir-foto.py [slug ...]
Lee data/fotos-traducidas.json: { "<slug>": { "fuente": "1.jpg", "cajas": [ {box:[x0,y0,x1,y1], lineas:[...],
  size, font: "bold"|"semibold"|"regular", fill:[r,g,b]|null, pad, spacing, align:"left"|"center"} ] } }
Escribe img/originales/<slug>/1-es.jpg; descargar-imagenes.py la usa como primera foto y deja la original como segunda.
Requiere Pillow y opencv-python-headless.
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)
FUENTES = {'bold': '/usr/share/fonts/opentype/inter/Inter-Bold.otf', 'semibold': '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 'regular': '/usr/share/fonts/opentype/inter/Inter-Regular.otf'}
spec = json.load(open('data/fotos-traducidas.json', encoding='utf-8'))
slugs = sys.argv[1:] or list(spec.keys())

def fondo_y_tinta(a, box):
    """Color de fondo (mediana del borde de la caja) y color de la tinta (píxeles más distintos del fondo)."""
    x0, y0, x1, y1 = box
    reg = a[y0:y1, x0:x1]
    borde = np.concatenate([reg[:3].reshape(-1, 3), reg[-3:].reshape(-1, 3), reg[:, :3].reshape(-1, 3), reg[:, -3:].reshape(-1, 3)])
    fondo = np.median(borde, axis=0)
    dist = np.linalg.norm(reg.reshape(-1, 3) - fondo, axis=1)
    lejos = reg.reshape(-1, 3)[dist > max(60, np.percentile(dist, 85))]
    tinta = np.median(lejos, axis=0) if len(lejos) else np.array([30, 30, 30.])
    return fondo, tinta

for slug in slugs:
    s = spec[slug]
    src = f'img/originales/{slug}/{s.get("fuente", "1.jpg")}'
    if not os.path.exists(src): print(f'✗ {slug}: no existe {src}'); continue
    img = cv2.imread(src)
    a = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(float)
    mask = np.zeros(img.shape[:2], np.uint8)
    tintas = []
    for c in s['cajas']:
        x0, y0, x1, y1 = c['box']
        fondo, tinta = fondo_y_tinta(a, c['box'])
        tintas.append(tuple(int(v) for v in tinta))
        reg = a[y0:y1, x0:x1]
        dist = np.linalg.norm(reg - fondo, axis=2)
        m = (dist > c.get('umbral', 45)).astype(np.uint8) * 255
        m = cv2.dilate(m, np.ones((5, 5), np.uint8), iterations=2)
        mask[y0:y1, x0:x1] = np.maximum(mask[y0:y1, x0:x1], m)
    limpio = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA)
    limpio = cv2.inpaint(limpio, cv2.dilate(mask, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_NS)
    base = Image.fromarray(cv2.cvtColor(limpio, cv2.COLOR_BGR2RGB))
    # modos alternativos al inpainting: "relleno" (degradado fila a fila tomado de los bordes laterales de la caja,
    # para envases metálicos) y "pill" (color sólido tomado del interior, para etiquetas de color con texto encima)
    orig_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    for c in s['cajas']:
        modo = c.get('modo', 'inpaint')
        if modo == 'inpaint': continue
        x0, y0, x1, y1 = c['box']; reg = orig_rgb[y0:y1, x0:x1].astype(float)
        if modo == 'relleno':
            # interpolación vertical entre la franja de arriba y la de abajo (conserva el brillo horizontal del envase);
            # "margen" aleja las franjas de la caja (útil cuando el texto está dentro de una píldora con borde)
            mg = c.get('margen', 0); ma, mb = mg if isinstance(mg, list) else (mg, mg)  # [arriba, abajo]; null = copiar la otra franja
            arriba = np.median(orig_rgb[max(0, y0 - ma - 10):y0 - ma, x0:x1].astype(float), axis=0) if ma is not None else None
            abajo = np.median(orig_rgb[y1 + mb:y1 + mb + 10, x0:x1].astype(float), axis=0) if mb is not None else None
            if arriba is None: arriba = abajo
            if abajo is None: abajo = arriba
            g = np.linspace(0, 1, y1 - y0)[:, None, None]
            parche = arriba[None, :, :] * (1 - g) + abajo[None, :, :] * g
            parche = cv2.GaussianBlur(parche.astype(np.float32), (0, 0), 3)
        elif modo == 'relleno-h':
            # interpolación horizontal entre la franja izquierda y la derecha (conserva el degradado vertical)
            mg = c.get('margen', 0)
            izq = np.median(orig_rgb[y0:y1, max(0, x0 - mg - 10):x0 - mg].astype(float), axis=1); der = np.median(orig_rgb[y0:y1, x1 + mg:x1 + mg + 10].astype(float), axis=1)
            g = np.linspace(0, 1, x1 - x0)[None, :, None]
            parche = izq[:, None, :] * (1 - g) + der[:, None, :] * g
            parche = cv2.GaussianBlur(parche.astype(np.float32), (0, 0), 3)
        else:
            # color sólido de la etiqueta: mediana de la franja central (evita los bordes blancos fuera de la etiqueta)
            h = y1 - y0; centro = reg[int(h * 0.3):int(h * 0.7) + 1]
            w = x1 - x0; lados = np.concatenate([centro[:, int(w * 0.06):int(w * 0.12) + 1].reshape(-1, 3), centro[:, int(w * 0.88):int(w * 0.94) + 1].reshape(-1, 3)])  # extremos de la etiqueta, sin texto ni borde
            fondo = np.array(c['fondo'], float) if c.get('fondo') else np.median(lados, axis=0)
            parche = np.ones_like(reg) * fondo
        p = Image.fromarray(parche.astype('uint8'))
        m = Image.new('L', p.size, 0); ImageDraw.Draw(m).rectangle((1, 1, p.size[0] - 2, p.size[1] - 2), fill=255); m = m.filter(ImageFilter.GaussianBlur(1.2 if modo == 'pill' else 2))
        base.paste(p, (x0, y0), m)
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    for c, tinta in zip(s['cajas'], tintas):
        x0, y0, x1, y1 = c['box']; col = tuple(c['fill']) if c.get('fill') else tinta
        f = ImageFont.truetype(FUENTES[c.get('font', 'bold')], c['size'])
        pad = c.get('pad', 4); y = y0 + pad; sp = c.get('spacing', 1.08)
        fills = c.get('fills')
        for i, t in enumerate(c['lineas']):
            if fills: col = tuple(fills[i])
            w = d.textlength(t, font=f)
            x = x0 + pad if c.get('align', 'left') == 'left' else x0 + ((x1 - x0) - w) / 2
            if w > (x1 - x0) - 2 * pad: print(f'  aviso {slug}: "{t}" se sale de la caja ({int(w)} > {x1 - x0})')
            d.text((x, y), t, font=f, fill=col + (255,)); y += c['size'] * sp
    capa = capa.filter(ImageFilter.GaussianBlur(0.5))
    # modular con la luz del envase solo la tinta de color/oscura; la tinta clara (blanca) se deja intacta
    luz = cv2.cvtColor(np.array(base), cv2.COLOR_RGB2GRAY).astype(float) / 255.0
    ref = np.percentile(luz[mask > 0], 95) if mask.any() else 1.0
    luz = np.clip(luz / max(ref, 0.2), 0.8, 1.0)
    arr = np.array(capa).astype(float)
    clara = arr[..., :3].mean(axis=2) > 200
    arr[..., :3][~clara] *= luz[..., None][~clara]
    capa = Image.fromarray(arr.astype('uint8'), 'RGBA')
    out = base.copy(); out.paste(capa, (0, 0), capa)
    dst = f'img/originales/{slug}/1-es.jpg'
    out.save(dst, quality=93)
    print(f'✓ {slug} → {dst}')
