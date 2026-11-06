# Voz del juego y del tráiler

Todo lo que dice la voz de «Bajo el sombrero» (la historia, los avisos, el modo audio de accesibilidad) y la voz en off del tráiler (`promo_v2.html`) está pregenerado con **[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)**, un modelo neural abierto de 82 millones de parámetros, con la voz en español **em_santa**. Se usa en su versión ONNX ([kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)), que no necesita PyTorch.

- Juego: los audios están en `web/juego/voz/` (AAC) con su índice `frases.json` (clave → texto). El juego busca cada frase por su texto y las encadena por una sola cola (`juego/speech.js`); las descripciones que cambian (rasgo, dirección, distancia, vidas) se arman con fragmentos de `juego/speechvocab.js`. Si una frase no tiene audio, se usa la voz del navegador como respaldo.
- Tráiler: `web/promo2/guion.json` (las frases) y `web/promo2/voz/` (los audios y `duraciones.json`). Los tiempos de cada escena del tráiler salen de esas duraciones.

## Regenerar

```bash
python3 -m venv kv
./kv/bin/pip install numpy==2.0.2 onnxruntime==1.19.2 espeakng-loader phonemizer-fork soundfile colorlog
./kv/bin/pip install --no-deps kokoro-onnx==0.4.5
# con Python 3.9: agregar "from __future__ import annotations" al principio de cada módulo de kokoro_onnx
# descargar kokoro-v1.0.onnx y voices-v1.0.bin (releases "model-files-v1.0" de kokoro-onnx) en esta carpeta

node frases.mjs ../../juego frases.json                       # junta todas las frases del juego
./kv/bin/python -I kokoro_tts.py frases.json wav em_santa 0.95   # un .wav por frase
for f in wav/*.wav; do afconvert -f m4af -d aac -b 48000 -c 1 "$f" "../../juego/voz/$(basename "$f" .wav).m4a"; done
cp frases.json ../../juego/voz/frases.json

./kv/bin/python -I kokoro_tts.py ../../promo2/guion.json wt em_santa 0.95   # el tráiler
for f in wt/*.wav; do afconvert -f m4af -d aac -b 64000 -c 1 "$f" "../../promo2/voz/$(basename "$f" .wav).m4a"; done
cp wt/duraciones.json ../../promo2/voz/duraciones.json
```

`kokoro_tts.py` le pasa a espeak-ng (la fonética) una ruta relativa corta a sus datos: espeak la guarda en un búfer chico y falla con rutas largas. Ejecutarlo desde la carpeta donde están el modelo y `kv/`.

Antes se usaba Piper con la voz rioplatense es_AR-daniela-high (`tts.py`, que queda como alternativa).
