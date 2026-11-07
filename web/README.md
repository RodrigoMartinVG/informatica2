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
| `promo.html`, `promo.js` | Animación promocional v1 (gráficos y modelos 3D de la investigación) |
| `promo_v2.html`, `promo2-2d.js` | **Tráiler v2** (~2 min, liviano): fotos reales de las especies, imágenes del bosque del juego, los mitos con sus datos y gráficos de GeoGebra, los gemelos y su volva, voz en off y música. `?formato=vertical` para la versión 9:16 de redes; botón para grabar el video |
| `promo_v2_3d.html`, `promo2-3d.js` | El mismo tráiler con el bosque 3D del juego en vivo (pesado); con `?limpio&t=segundos` sirve para sacar las imágenes de `promo2/img/` |
| `promo-audio.js` | Música y sonidos de las animaciones (Tone.js) y la voz en off |
| `promo2/` | Guion del tráiler (`guion.json`), voz (`voz/`), imágenes del bosque (`img/`) y `grabar.html`: la página para grabar la voz en off con tu propia voz (con `tools/voz/grabar_server.py`) |
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
| `juego/world.js` | Terreno, pasto con viento (shader TSL), hojas, musgo, árboles trepables con hongos repisa, troncos caídos, rayos de sol, polvo, esporas guía |
| `juego/beetle.js` | Escarabajo procedural: marcha en trípode, cinemática inversa de las patas, gravedad, salto, caídas, vuelo libre, picada y planeo, rebotes en los bejines, trepar tallos y troncos, y conductas en reposo (se limpia las antenas y las patas, estira las alas, mira alrededor, festeja, estornuda) |
| `juego/comparar.html` | Herramienta de prueba: cada especie en 3D al lado de su foto real (`?solo=muscaria,edulis`, `?semilla=N`, `?gl`) |
| `juego/aventuras.js` | Lo que se suma para jugar: esporas doradas escondidas en cada claro, un circuito de aros de vuelo con cronómetro y medallas, cinco escarabajos amigos perdidos que te siguen, telas de araña que frenan y sombreritos para el escarabajo (tecla H) |
| `juego/secretos.js` | Secretos del bosque: 20 cosas para descubrir (rebotar, la picada, el pájaro, las repisas…), con pistas en el cuaderno y en el botón 🔍; si pasa un rato sin descubrir nada, el juego sopla una pista |
| `juego/flora.js` | Dónde crece cada hongo: claros de los niveles, grupos sueltos y racimos sobre los troncos caídos |
| `juego/hongos3d.js` | Hongos 3D por especie (verrugas, volva, escamas, poros, pliegues…) con las medidas de una fila real del Excel |
| `juego/filas.js` | Muestra de 2.431 filas reales del Excel (generada con `tools/filas_juego.py`) |
| `juego/galeria.html` | Herramienta de prueba: todas las especies en fila (`?solo=muscaria,procera`) |
| `juego/taller.html`, `juego/taller.js` | **Taller de hongos**: diseñar un hongo con controles y verlo en 3D, con una fila real del Excel; guardar, plantar en el bosque, exportar e importar |
| `juego/disenos.js` | Diseños del taller que crecen en el juego para todos (lo que exporta el taller) |
| `juego/audio.js` | Música y sonidos generativos con Tone.js |
| `juego/config.js` | Mapa del bosque, claros y altura del terreno |
| `juego/surfaces.js` | Superficies: suelo, ramas, troncos caídos, piedras, hojas y repisas, con su altura sólida (para caminar por debajo, chocar o caer encima) |
| `juego/narrator.js` | Narración en off: subtítulos + voz rioplatense pregenerada con Piper (`juego/voz/`, ver `tools/voz/`) |
| `juego/species.js` | Especies reales: nombre, peligrosidad, nota y crédito de cada foto |
| `juego/access.js` | Accesibilidad: modo audio (descripciones habladas), sonidos espaciales, texto grande y teclas reasignables |
| `juego/debug.js` | Herramientas de prueba: solo se cargan con `?debug` |
| `juego/look.js` | Efectos de luz en TSL: translucidez a contraluz, niebla a ras del suelo y cielo |

Tecnologías: three.js r180 (WebGPURenderer + TSL), GSAP, Tone.js. Arranca con **gráficos livianos** (sin oclusión ambiental, profundidad de campo ni bloom); el botón «Gráficos» pasa a la versión completa y recuerda la elección. Parámetros útiles: `?q=alta` / `?q=baja`, `?gl` (forzar WebGL 2); con `?debug` se habilitan las herramientas de prueba (`?debug&auto` salta la intro, `&hora=0..1`, `&pajaro`, etc.). Cada claro ocurre un poco más tarde (de la tarde a la noche) y cada tanto pasa un pájaro: hay que esconderse debajo de un sombrero.

Mecánicas: hambre (la energía baja con el tiempo), olfatear (dice la verdad pero gasta energía), comer (alimenta o envenena: tres vidas), trepar ramas, piedras, hojas y hongos (empujando contra el tallo), saltar desde el borde del sombrero, cámara libre (arrastrar el mouse) con brazo con resorte, visión de antenas (V) y narración en off (con voz opcional). Al final del claro, el juego compara tus decisiones con los datos de la investigación.

Niveles (definidos en `LEVELS`, `config.js`), en orden: **el anillo**, **la magulladura** (empujar los tallos para ver cuáles se manchan de azul), **los colores** (llamativos 68 % contra comunes 48 %), **el tamaño** (chicos 70 % contra grandes 43 %), **las proporciones** (tallo grueso 49 % contra fino 60 %) y **los gemelos**, de noche: *Amanita phalloides* y *Agaricus campestris* idénticos a la vista. En cada claro los dos grupos crecen mezclados con las proporciones de los datos; con 2 hongos conocidos de cada grupo (dificultad fácil, por defecto) o 4 (normal) se descubre el mito, aparece un resumen con fotos reales de las especies del claro y el escarabajo vuela gratis al claro siguiente. Al olfatear o comer un hongo aparece una ficha con la foto real de una especie parecida (`species.js`, fotos de Wikimedia Commons). Controles de movimiento: **Espacio** salta (mantenido, abre las alas y sube; volar libre gasta energía), **X** baja volando, **G** vuela solo al próximo hongo sin explorar. Hay gravedad: desde el borde de un sombrero se cae sobre lo que haya abajo (otro sombrero, una rama o el suelo), y el vuelo tiene un techo suave de 30 cm. Los tallos, los árboles y los troncos caídos se trepan empujando contra ellos; las repisas de los árboles son escalones.

Los hongos son especies reales (las de las fotos) con las medidas de una fila real del Excel que cumple el rasgo del claro y la toxicidad del hongo (diámetro del sombrero, alto y ancho del tallo, forma y color). Sobre los troncos caídos crecen los de la madera: la gírgola (*Pleurotus*, comestible) y *Galerina*, *Mycena* e *Hypholoma*. Hay 19 especies con foto real; cada hongo tiene además su propia edad (joven, maduro o viejo) e imperfecciones (sombrero desparejo, alguna mordida, borde roto), así que no hay dos iguales. Algunos (~1 de cada 6 sueltos, y unos pocos en el borde de cada claro, que no cuentan para el mito) ya están **pasados** o **muertos**: apagados, con manchas, moho y el sombrero vencido; aunque la especie se coma, comerlos quita energía y marea. Las repisas de los árboles son *Trametes versicolor* y se pueden olfatear. Al olfatear o comer se abre la ficha del hongo (foto real, su edad y defectos, y su fila del Excel); queda abierta mientras estés cerca, se cierra con Esc y se vuelve a abrir con **I**. En el cuaderno, cada claro tiene la tabla con las filas del Excel de todos sus hongos.

**Taller de hongos** (`juego/taller.html`, también desde la pantalla de inicio): se parte de una especie real y se cambian forma, colores, dibujo del sombrero, láminas o poros, tallo, anillo, volva y verrugas. Las medidas salen de una fila real del Excel que coincide con la forma, el color, el rango de tamaño y la toxicidad elegidos. Lo guardado queda en el navegador y, con «en el bosque» marcado, crece en el juego cerca del punto de partida. Para que un diseño esté para todos, se exporta y se pega en `juego/disenos.js`.
