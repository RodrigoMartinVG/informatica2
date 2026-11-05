# ¿Comestible a simple vista?

Informe web interactivo del Taller de Informática II. Pregunta si se puede saber si un hongo es comestible por su aspecto. Está basado en `v5_Hongos_DataSet_Rodrigo_Vidal.xlsx`.

## Estructura: una historia en 7 partes

La web es una sola página que se lee de arriba abajo, como una historia. La línea de etapas, fija arriba, sigue el avance de la lectura. Cada parte corresponde a una etapa de la investigación:

| # | Parte | Qué cuenta |
| --- | --- | --- |
| 1 | La pregunta | Dos hongos casi iguales (uno mortal, otro comestible), las creencias populares, el cuestionario |
| 2 | Los datos | La "enciclopedia" de 173 especies, la línea de base del 55,5 %, qué se hizo en Excel, límites |
| 3 | Etapa I · Excel | Cuatro hipótesis populares (anillo/color al cortar, tamaño, colores, lugar y época) con fotos reales, el gráfico del Excel, un veredicto y un concepto |
| 4 | Etapa II · Todo junto | Color × forma, el giro del 99,8 % (combinar rasgos = reconocer la especie), el explorador |
| 5 | Etapa III · GeoGebra | Dos conjeturas escritas como funciones (recta y curva) |
| 6 | Complementaria · 3D | El hongo típico de cada forma junto a una foto real, el sólido de revolución |
| 7 | La respuesta | Conclusión, aprendizajes, límites, personas ciegas, fuentes y créditos |

La parte técnica (cómo se armó cada tabla en Excel, su matemática y las precauciones) queda en las secciones "Para quien quiera más detalle", con las 14 correlaciones completas.

## Fotos reales

`img/fotos/` tiene 11 fotos de Wikimedia Commons (dominio público o Creative Commons). `img/fotos/creditos.json` guarda el autor, la licencia y el link de cada una, y la web los muestra al final.

## Funciones de lectura

- **Hilo visible:** una barra fija con la pregunta, los veredictos acumulados y el estado de la respuesta. Cada capítulo tiene además su mini-índice.
- **¿Vos lo comerías?:** un cuestionario en la portada con cuatro grupos reales de la muestra.
- **Glosario:** los términos subrayados con puntos muestran su definición al pasar el cursor.
- **Escuchar el gráfico:** cada correlación puede reproducirse como tonos, para lectores ciegos.
- **Fuente del dato:** cada cifra indica si sale directamente del Excel o de un cálculo adicional.
- **Modo presentación:** `presentacion.html`, con 8 diapositivas, F para pantalla completa y N para las notas del orador.
- **Imprimir o guardar en PDF:** arma todos los capítulos, incluida la parte técnica.

## Imágenes desde los datos

Las imágenes de `img/render/` se generan con el mismo modelo 3D del anexo B: las medidas promedio, el color más frecuente y la superficie más común. Para regenerarlas:

```bash
python3 web/tools/save_server.py
```

Con ese receptor corriendo, se abre `http://localhost:8765/web/tools/render.html` y las imágenes se guardan solas. Las imágenes de `img/*.jpg` son las originales generadas con IA; se usan solo para la comparación del anexo A.

Para navegar se usa el índice lateral, los enlaces de anterior y siguiente al pie de cada capítulo, o las flechas ← → del teclado.

## Cómo verla

```bash
python3 -m http.server 8765
```

Se ejecuta desde la raíz del repo y después se abre http://localhost:8765 (redirige a `web/`). Se sirve el repo entero para que funcione el link de descarga del Excel (`../v5_Hongos_DataSet_Rodrigo_Vidal.xlsx`). Hace falta conexión a internet, porque Chart.js, three.js y las fuentes se cargan desde una CDN.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `index.html` | Todo el texto del informe, organizado por capítulos |
| `styles.css` | Estilos (claro y oscuro, adaptado a celulares) |
| `corr.js` | Contenido de las 14 correlaciones (textos, pasos en Excel, matemática) |
| `app.js` | Navegación, gráficos de cada correlación, explorador y sonificación |
| `profiles.js` | Perfiles de las seis formas en mm, compartidos por las láminas y el 3D, y cálculo del volumen |
| `plates.js` | Láminas SVG generadas desde los datos |
| `viewer3d.js` | Modelos 3D con texturas, visor interactivo e imágenes fijas |
| `presentacion.html`, `deck.js` | Modo presentación |
| `tools/render.html`, `tools/save_server.py` | Regeneran las imágenes desde los datos |
| `data.js` | Tablas de las hojas de análisis del Excel |
| `explorer-data.js` | Conteos agrupados de los 61.069 registros (generado) |
| `tools/build_data.py` | Regenera `explorer-data.js` a partir de la hoja `Data` |
| `img/` | Las seis imágenes generadas con IA, reducidas, que se usan en la revisión del anexo A |

## Juego: «Bajo el sombrero» (`juego/`)

Una forma distinta de recorrer la investigación: manejás a un escarabajo por el suelo del bosque, a escala de insecto, e investigás los mitos olfateando hongos. Se abre desde el botón **🍄 Jugar** de la web o directo en `/juego/` (redirige a `web/juego/`).

| Archivo | Qué hace |
|---|---|
| `juego/index.html`, `juego/juego.css` | Pantalla de inicio, interfaz, cuaderno de campo |
| `juego/main.js` | Render (WebGPU con respaldo WebGL 2), postprocesado (profundidad de campo + bloom), cámara, controles y la lógica del mito |
| `juego/world.js` | Terreno, pasto con viento (shader TSL), hojas, musgo, troncos, rayos de sol, polvo, esporas guía |
| `juego/beetle.js` | Escarabajo procedural: marcha en trípode y cinemática inversa de las patas |
| `juego/flora.js` | Hongos: los mismos modelos 3D de la investigación (`viewer3d.js` + `profiles.js`) |
| `juego/audio.js` | Música y sonidos generativos con Tone.js |
| `juego/config.js` | Mapa del bosque, claros y altura del terreno |
| `juego/surfaces.js` | Superficies caminables: suelo, ramas, piedras y hojas |
| `juego/narrator.js` | Narración en off (subtítulos y voz opcional) |

Tecnologías: three.js r180 (WebGPURenderer + TSL), GSAP, Tone.js. Parámetros útiles: `?q=baja` (calidad baja), `?gl` (forzar WebGL 2), `?auto` (saltar la intro).

Mecánicas: hambre (la energía baja con el tiempo), olfatear (dice la verdad pero gasta energía), comer (alimenta o envenena: tres vidas), trepar ramas, piedras, hojas y hongos (empujando contra el tallo), saltar desde el borde del sombrero, cámara libre (arrastrar el mouse) con brazo con resorte, visión de antenas (V) y narración en off (con voz opcional). Al final del claro, el juego compara tus decisiones con los datos de la investigación.

Etapa 1: claro del anillo jugable. Los otros cinco claros (magulladura, colores, tamaño, proporciones y los gemelos) están marcados como «dormidos».
