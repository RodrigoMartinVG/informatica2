# ¿Comestible a simple vista?

Informe web interactivo del Taller de Informática II. Pregunta si se puede saber si un hongo es comestible por su aspecto. Está basado en `v5_Hongos_DataSet_Rodrigo_Vidal.xlsx`.

## Hilo conductor

| Parte | Capítulos |
| --- | --- |
| Planteo | Portada · 1. La investigación y sus límites |
| Rasgo por rasgo | 2. Mitos (anillo, magulladura) · 3. Tamaño · 4. Color y textura · 5. Hábitat y estación |
| Modelos y síntesis | 6. GeoGebra (`FitLine`, `FitLog`) · 7. Combinar rasgos (el giro: 173 especies) · 8. Conclusión · 9. Accesibilidad para personas ciegas |
| Anexos | A. Las seis formas y la revisión de las imágenes generadas con IA · B. Del dibujo al 3D (sólidos de revolución, volumen por Pappus) · C. Fórmulas y fuentes |

Las **14 correlaciones del Excel** aparecen todas con la misma estructura: qué muestra (para cualquier lector), qué aporta al hilo, cómo se construye en Excel, qué significa matemáticamente y qué precauciones tomar. Cada una incluye su gráfico, una tabla con los datos y un veredicto. El capítulo 1 tiene un mapa con las 14.

El Excel v5 se puede descargar desde el índice lateral, desde el capítulo 1 y desde el anexo C.

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
