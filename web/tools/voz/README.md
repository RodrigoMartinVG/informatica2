# Voz del juego y del tráiler

## Juego: voz rioplatense (Piper)

Todo lo que dice la voz de «Bajo el sombrero» (la historia, los avisos y el modo audio de accesibilidad) está pregenerado con [Piper](https://github.com/OHF-Voice/piper1-gpl) y la voz rioplatense **es_AR-daniela-high** ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_AR/daniela/high)). Los audios están en `web/juego/voz/` (AAC) con su índice `frases.json` (clave → texto). El juego busca cada frase por su texto y las encadena por una sola cola (`juego/speech.js`); las descripciones que cambian (rasgo, dirección, distancia, vidas) se arman con fragmentos de `juego/speechvocab.js`. Si una frase no tiene audio, se usa la voz del navegador como respaldo.

`tts.py` sintetiza **cada oración entera** (las comas quedan adentro, así las preguntas mantienen su entonación de punta a punta), agrega silencios según cómo termina cada oración (más largos en preguntas y puntos suspensivos), empareja el volumen entre frases y suaviza los bordes.

```bash
python3 -m venv venv && ./venv/bin/pip install piper-tts espeakng-loader
# descargar es_AR-daniela-high.onnx y .onnx.json en model/
node frases.mjs ../../juego frases.json        # junta todas las frases
./venv/bin/python -I tts.py frases.json wav     # un .wav por frase
for f in wav/*.wav; do afconvert -f m4af -d aac -b 48000 -c 1 "$f" "../../juego/voz/$(basename "$f" .wav).m4a"; done
cp frases.json ../../juego/voz/frases.json
```

`tts.py` hace la fonética con espeak-ng (paquete `espeakng-loader`) por ctypes: el módulo de espeak que trae piper-tts para Mac Intel guarda la ruta de sus datos en un búfer chico y falla con rutas largas, así que se le pasa una ruta relativa corta. Ejecutarlo desde la carpeta donde está `venv/`.

## Tráiler: tu propia voz

La voz en off del tráiler (`promo_v2.html`) se graba con una voz humana:

```bash
python3 web/tools/voz/grabar_server.py      # desde la raíz del repo
# abrir http://localhost:8770/web/promo2/grabar.html
```

La página muestra cada frase del guion (`web/promo2/guion.json`) con cómo decirla y qué se ve en ese momento. Cada toma se limpia sola (recorta silencios, empareja el volumen) y, al usarla, se guarda como `web/promo2/voz/<frase>.m4a` y se actualiza `duraciones.json`: los tiempos del tráiler se acomodan solos a tu voz. Las frases que todavía no grabaste suenan con la voz rioplatense sintética (Piper, `tts.py`), que queda como respaldo en `voz/sintetica/` (no se sube).
