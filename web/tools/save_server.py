"""Receptor local para render.html: guarda en web/img/render/ las imágenes que genera la página.

Uso (desde la raíz del repo):  python3 web/tools/save_server.py
Escucha solo en localhost:8766 y acepta solo nombres simples (.jpg / .json).
"""
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img', 'render')
os.makedirs(OUT, exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        name = parse_qs(urlparse(self.path).query).get('name', [''])[0]
        if not re.fullmatch(r'[a-z0-9_]+\.(jpg|json)', name):
            self.send_response(400)
            self._cors()
            self.end_headers()
            return
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(data)
        print('guardado', name, len(data), 'bytes')
        self.send_response(200)
        self._cors()
        self.end_headers()


if __name__ == '__main__':
    print('Receptor en http://localhost:8766 → ', os.path.abspath(OUT))
    HTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
