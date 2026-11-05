# Voz de la narración del juego

Las frases de la narración de «Bajo el sombrero» están pregeneradas con [Piper](https://github.com/OHF-Voice/piper1-gpl) y la voz rioplatense **es_AR-daniela-high** ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_AR/daniela/high)). Los audios quedan en `web/juego/voz/` (AAC, ~1,7 MB en total) con su índice `frases.json` (clave → texto). El juego busca cada frase por su texto; si una frase no tiene audio, usa la voz del navegador como respaldo.

Para regenerarlas (por ejemplo, si cambian textos en `main.js` o `config.js`):

```bash
python3 -m venv venv && ./venv/bin/pip install piper-tts espeakng-loader
# descargar es_AR-daniela-high.onnx y .onnx.json en model/
node frases.mjs ../../juego frases.json        # junta todas las frases
./venv/bin/python -I tts.py frases.json wav     # un .wav por frase
for f in wav/*.wav; do afconvert -f m4af -d aac -b 40000 -c 1 "$f" "../../juego/voz/$(basename "$f" .wav).m4a"; done
cp frases.json ../../juego/voz/frases.json
```

`tts.py` hace la fonética con espeak-ng (paquete `espeakng-loader`) por ctypes: el módulo de espeak que trae piper-tts para Mac Intel guarda la ruta de sus datos en un búfer chico y falla con rutas largas, así que se le pasa una ruta relativa corta. Ejecutar `tts.py` desde la carpeta donde está `venv/`.
