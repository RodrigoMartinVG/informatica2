"""Genera la voz del juego y del tráiler con Kokoro (modelo neural de 82M parámetros, en ONNX).

Uso (desde la carpeta donde están el modelo y el entorno virtual):
    python -I kokoro_tts.py frases.json salida/ [voz] [velocidad]
frases.json es un diccionario {clave: texto}; escribe salida/clave.wav y salida/duraciones.json.
Voz por defecto: em_santa (español, masculina). Velocidad por defecto: 0.95.

Requisitos (funciona con Python 3.9 en Mac Intel):
    pip install numpy==2.0.2 onnxruntime==1.19.2 espeakng-loader phonemizer-fork soundfile colorlog
    pip install --no-deps kokoro-onnx==0.4.5   (y agregar "from __future__ import annotations" a sus módulos si se usa Python 3.9)
    modelo: kokoro-v1.0.onnx y voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx, releases model-files-v1.0)
"""
import json, os, sys
import numpy as np
import soundfile as sf
import espeakng_loader
from kokoro_onnx import Kokoro
from kokoro_onnx.config import EspeakConfig

src, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else 'em_santa'
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 0.95
os.makedirs(out, exist_ok=True)
# espeak guarda la ruta de sus datos en un búfer chico: se le pasa una ruta relativa corta
data = os.path.relpath(espeakng_loader.get_data_path())
os.environ['ESPEAK_DATA_PATH'] = data
k = Kokoro('kokoro-v1.0.onnx', 'voices-v1.0.bin', espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=data))

frases = json.load(open(src))
durs = {}
for i, (key, text) in enumerate(frases.items()):
    samples, sr = k.create(text, voice=voice, speed=speed, lang='es')
    pad = np.zeros(int(sr * 0.12), dtype=samples.dtype)  # un respiro al final
    audio = np.concatenate([samples, pad])
    sf.write(os.path.join(out, f'{key}.wav'), audio, sr)
    durs[key] = round(len(audio) / sr, 2)
    print(f'{i + 1}/{len(frases)} {key} {durs[key]}s', flush=True)
json.dump(durs, open(os.path.join(out, 'duraciones.json'), 'w'), indent=0)
