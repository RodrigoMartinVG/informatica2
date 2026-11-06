"""Servidor local para grabar la voz en off del tráiler con tu propia voz.

Uso (desde la raíz del repo):  python3 web/tools/voz/grabar_server.py
y abrí http://localhost:8770/web/promo2/grabar.html

Sirve los archivos del repo (solo en esta compu: escucha en 127.0.0.1) y recibe cada toma grabada:
la guarda como web/promo2/voz/<frase>.m4a (AAC, con afconvert de macOS) y actualiza duraciones.json,
así el tráiler acomoda solo sus tiempos a tu voz.
"""
import json, os, re, shutil, subprocess, tempfile, wave
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
VOZ = os.path.join(ROOT, 'web', 'promo2', 'voz')
GUION = os.path.join(ROOT, 'web', 'promo2', 'guion.json')
ESTADO = os.path.join(VOZ, 'grabadas.json')


def load(path, default):
    try:
        with open(path) as f: return json.load(f)
    except (OSError, ValueError): return default


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')  # siempre la última toma
        super().end_headers()

    def do_GET(self):
        if urlparse(self.path).path == '/estado':
            return self.json(load(ESTADO, {}))
        return super().do_GET()

    def do_POST(self):
        q = parse_qs(urlparse(self.path).query); key = q.get('id', [''])[0]
        if urlparse(self.path).path != '/guardar' or key not in load(GUION, {}) or not re.fullmatch(r'[a-z0-9]+', key):
            return self.json({'ok': False, 'error': 'frase desconocida'}, 400)
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if not data.startswith(b'RIFF') or len(data) > 20_000_000:
            return self.json({'ok': False, 'error': 'se esperaba un WAV'}, 400)
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, f'{key}.wav')
            with open(wav, 'wb') as f: f.write(data)
            with wave.open(wav) as w: dur = round(w.getnframes() / w.getframerate(), 2)
            out = os.path.join(VOZ, f'{key}.m4a')
            # la primera vez, guardar la voz sintética anterior como respaldo
            backup = os.path.join(VOZ, 'sintetica'); os.makedirs(backup, exist_ok=True)
            if os.path.exists(out) and not os.path.exists(os.path.join(backup, f'{key}.m4a')):
                shutil.copy(out, os.path.join(backup, f'{key}.m4a'))
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', '-c', '1', wav, out], check=True)
        durs = load(os.path.join(VOZ, 'duraciones.json'), {}); durs[key] = dur
        with open(os.path.join(VOZ, 'duraciones.json'), 'w') as f: json.dump(durs, f, indent=0)
        estado = load(ESTADO, {}); estado[key] = dur
        with open(ESTADO, 'w') as f: json.dump(estado, f, indent=0)
        print(f'guardada {key} ({dur} s)', flush=True)
        self.json({'ok': True, 'dur': dur})

    def json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def log_message(self, *a): pass


if __name__ == '__main__':
    print('Abrí http://localhost:8770/web/promo2/grabar.html', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8770), Handler).serve_forever()
