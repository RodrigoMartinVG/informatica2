# Guía de estudio: la investigación de hongos, paso a paso

Esta guía sirve para entender a fondo el trabajo y poder explicarlo con soltura. Va de lo general a lo particular: primero la idea, después los datos, los conceptos que se usan en todo el trabajo, las 14 correlaciones del Excel una por una, lo hecho en GeoGebra y, al final, un guion para exponer y respuestas a preguntas probables.

Todas las cifras salen de `v5_Hongos_DataSet_Rodrigo_Vidal.xlsx`.

---

## Índice

1. [La idea en un minuto](#1-la-idea-en-un-minuto)
2. [Los datos](#2-los-datos)
3. [Qué se hizo en Excel antes de analizar](#3-qué-se-hizo-en-excel-antes-de-analizar)
4. [Cómo se arma una tabla dinámica (la herramienta de todo el trabajo)](#4-cómo-se-arma-una-tabla-dinámica)
5. [Seis conceptos que aparecen en todo el trabajo](#5-seis-conceptos-que-aparecen-en-todo-el-trabajo)
6. [Las 14 correlaciones, una por una](#6-las-14-correlaciones-una-por-una)
7. [GeoGebra: los dos modelos](#7-geogebra-los-dos-modelos)
8. [El giro: combinar rasgos](#8-el-giro-combinar-rasgos)
9. [El modelado 3D en dos minutos](#9-el-modelado-3d-en-dos-minutos)
10. [Guion para exponer en 5 minutos](#10-guion-para-exponer-en-5-minutos)
11. [Preguntas que te pueden hacer (y cómo responderlas)](#11-preguntas-que-te-pueden-hacer)
12. [Glosario](#12-glosario)

---

## 1. La idea en un minuto

**La pregunta:** ¿alcanza con mirar un hongo para saber si se puede comer?

Hay reglas populares (“si tiene anillo es venenoso”, “si cambia de color al cortarlo, no lo comas”, “los de colores fuertes son peligrosos”). El trabajo las toma como **hipótesis** y las pone a prueba con 61.069 hongos.

**La respuesta corta:**

- **Con una regla simple, no.** Los mitos no informan nada, y las pistas que sí existen (color, textura, tamaño) solo funcionan en grupos chicos y raros.
- **Con muchos rasgos a la vez, casi sí**, pero porque eso ya es **reconocer la especie**, que es el trabajo de un especialista.

**Las etapas del trabajo:**

| Etapa | Herramienta | Qué se hizo |
| --- | --- | --- |
| Preparación | Excel | Traducir códigos, crear columnas útiles |
| Etapa I | Excel | Una tabla dinámica por pregunta (14 correlaciones en 9 hojas) |
| Etapa II | Excel + presentación | Juntar los resultados y comunicarlos |
| Etapa III | GeoGebra | Escribir dos relaciones como funciones |
| Complementaria | Tinkercad / OpenSCAD | Modelar en 3D el hongo típico de cada forma |

---

## 2. Los datos

### De dónde salen

Se usa el **Secondary Mushroom Dataset** (Wagner, Heider y Hattab, 2021, *Scientific Reports*), publicado en el repositorio de la UCI.

Hay que entender cómo se armó, porque explica muchos resultados:

1. Los autores tomaron una **guía de campo con 173 especies** reales.
2. La guía describe cada especie con **rangos**: “sombrero de 5 a 10 cm, marrón o gris”.
3. Una computadora **sorteó** valores dentro de esos rangos y generó **61.069 hongos simulados**.

Una buena forma de decirlo: *es una enciclopedia de 173 especies convertida en 61.069 fichas*.

### Qué tiene cada ficha

- La **clase**: comestible (`e`) o venenoso (`p`). “Venenoso” incluye también los “no recomendados”.
- **3 variables numéricas:** diámetro del sombrero (cm), alto del tallo (cm) y grosor del tallo (mm).
- **17 variables cualitativas:** forma, superficie y color del sombrero; color, superficie y raíz del tallo; láminas; anillo; velo; color de esporas; si se magulla; hábitat; estación.

### El número más importante: 55,5 %

| | Cantidad | Porcentaje |
| --- | --- | --- |
| Venenosos | 33.888 | 55,5 % |
| Comestibles | 27.181 | 44,5 % |
| **Total** | **61.069** | 100 % |

Ese 55,5 % es la **línea de base** (ver la sección 5). Todo el trabajo compara contra ese número.

### Límites (conviene decirlos antes de que te los pregunten)

1. **Son simulados.** Los porcentajes muestran cómo se generaron los datos, no qué tan comunes son esos hongos en la naturaleza.
2. **Solo 173 especies.** Cada especie aparece cientos de veces. Por eso, cuando un grupo da 0 % o 100 %, muchas veces es **una sola especie**.
3. **Celdas vacías.** Algunas columnas están casi vacías: velo (94,8 %), color de esporas (89,6 %), raíz del tallo (84,4 %). No se usaron.
4. **Detalles de la fuente.** Hay 146 filas repetidas, y el código `d` de la superficie del sombrero no está explicado.
5. **No hay columna de especie.** No se puede comprobar nada especie por especie.

---

## 3. Qué se hizo en Excel antes de analizar

Los datos venían en **códigos de una letra** (`x`, `n`, `t`…). El primer paso fue agregar columnas que los traducen y otras que facilitan el análisis. Son las fórmulas de la hoja `Data`:

| Columna nueva | Fórmula | Para qué sirve |
| --- | --- | --- |
| `Class por Nombre` | `=SI(F2="p";"Venenoso";"Comestible")` | Leer la clase en castellano |
| `cap-shape Nombre` | `=SI(J2="b";"Campana";SI(J2="c";"Cónica";…;"Otras"))` | Traducir la forma con `SI` anidados |
| `habitat Nombre`, `season Nombre`, `stem-color Nombre`, `cap-surface Nombre` | `=SI.CONJUNTO(AB2="g";"Pastos"; … ;VERDADERO;"Sin dato")` | Traducir con varias condiciones. La rama `VERDADERO` atrapa todo lo demás (por ejemplo, las celdas vacías) |
| `has-ring Nombre`, `does-bruise-or-bleed Nombre` | `=SI(Y2="t";"Sí";"No")` | El dataset usa `t` (true) y `f` (false) |
| `Con tallo` | `=SI(S2>0;"Sí";"No")` | Un grosor de tallo 0 quiere decir que no tiene tallo |
| `cap-diameter_Grande-Chico` | `=SI(H2>=10;"Grande";"Chico")` | Separar sombreros de 10 cm o más |
| `toxico (1/0)` | `=SI(F2="p";1;0)` | **Clave:** su promedio da la proporción de venenosos (ver concepto 4) |

Y unas fórmulas de control en las primeras columnas:

| Para qué | Fórmula | Resultado |
| --- | --- | --- |
| Cantidad de hongos | `=CONTAR(H2:H61070)` | 61.069 |
| Venenosos | `=CONTAR.SI(F2:F61070;"p")` | 33.888 |
| Proporción de venenosos | `=CONTAR.SI(F2:F61070;"p")/B6` | 0,555 |
| Control | `=SI(ABS((B2/B6)-B5)<=0,01;"OK";"FAIL")` | Comprueba que suma ÷ cantidad = promedio |

> **Para explicarlo:** “Antes de analizar, traduje los códigos y agregué columnas auxiliares. La más útil fue `toxico (1/0)`, porque su promedio en cualquier grupo es directamente el porcentaje de venenosos.”

---

## 4. Cómo se arma una tabla dinámica

Casi todas las correlaciones son una tabla dinámica con la misma receta. Si entendés esta, entendés todas.

**Ejemplo: ¿el anillo tiene que ver con la toxicidad?**

1. Seleccionar los datos → *Insertar → Tabla dinámica*.
2. Arrastrar `has-ring Nombre` a **Filas** → aparecen dos filas, “Sí” y “No”.
3. Arrastrar `Class por Nombre` a **Columnas** → aparecen “Comestible” y “Venenoso”.
4. Arrastrar `class` a **Valores** → Excel cuenta hongos en cada casilla.
5. En Valores: *Configuración de campo de valor → Mostrar valores como → % del total de fila*. Ahora cada fila suma 100 % y se lee directo qué parte es venenosa.
6. Insertar un gráfico de barras 100 % apiladas.

Variantes que aparecen en el trabajo:

- **Promedio en vez de cuenta** (correlación 3): en Valores, *Resumir por → Promedio* de `cap-diameter`.
- **Agrupar números en rangos** (correlaciones 4 a 7): clic derecho sobre los números de la fila → *Agrupar* (inicio 0, fin 25, intervalo 1).
- **Filtro** (correlaciones 5 a 7): arrastrar `Con tallo` a *Filtros* y dejar solo “Sí”.
- **Dos campos en filas** (correlación 14): color y, adentro, forma.
- **Segmentación de datos** (correlación 13): botones para filtrar con un clic.
- **Detalle de una celda**: doble clic sobre un número muestra en una hoja nueva los hongos que lo forman. Así se generó la hoja `Detail1` (los 774 hongos de “Cónica / Comestible”).

---

## 5. Seis conceptos que aparecen en todo el trabajo

### Concepto 1: la línea de base

Si elegís un hongo **al azar**, la chance de que sea venenoso es **55,5 %**. Es lo que sabés **antes** de mirarlo.

**Regla de oro del trabajo:** un rasgo sirve si **aleja mucho** ese número. Si los hongos con anillo fueran venenosos en un 95 %, el anillo sería una gran pista. Si dan 60 %, casi no cambia nada.

### Concepto 2: probabilidad condicional

Lo que muestra cada barra del Excel es una **probabilidad condicional**: la chance de que un hongo sea venenoso **sabiendo** que tiene cierto rasgo.

```
p(c) = P(venenoso | rasgo = c) = venenosos con ese rasgo / total con ese rasgo
```

Ejemplo: con anillo hay 15.179 hongos y son venenosos el 60,5 %. Entonces P(venenoso | con anillo) = 0,605.

Para comparar con la base se usa la diferencia en **puntos porcentuales**: 60,5 % − 55,5 % = **+5 puntos**.

### Concepto 3: el promedio ponderado (por qué casi todo queda “cerca del 55 %”)

El 55,5 % general es el **promedio ponderado** de los grupos: cada grupo pesa según cuántos hongos tiene.

**Ejemplo con el anillo:**

```
(15.179 × 0,605 + 45.890 × 0,538) / 61.069 = 0,555
```

Como “sin anillo” tiene 45.890 hongos (tres de cada cuatro), arrastra el promedio hacia su valor. **Un grupo grande no puede alejarse mucho del promedio.** Por eso los valores extremos (0 % o 100 %) aparecen casi siempre en **grupos chicos**. Es una idea que vuelve en todas las correlaciones.

### Concepto 4: el promedio de un 0/1 es una proporción

La columna `toxico (1/0)` vale 1 si es venenoso y 0 si no. Si en un grupo hay 10 hongos y 7 son venenosos:

```
(1+1+1+1+1+1+1+0+0+0) / 10 = 0,7 = 70 % venenosos
```

Por eso, en las tablas por rangos, *Promedio de toxico (1/0)* da directamente el porcentaje de venenosos.

### Concepto 5: media vs. mediana

- **Media (promedio):** se suman todos y se divide por la cantidad. Un valor muy grande la mueve.
- **Mediana:** el valor del medio cuando se ordenan. No le afectan los valores extremos.

En el trabajo:

| | Media | Mediana |
| --- | --- | --- |
| Comestibles (diámetro, cm) | 7,80 | 6,71 |
| Venenosos (diámetro, cm) | 5,88 | 4,98 |
| “Otras” comestibles | **25,22** | **8,91** |

En “Otras” comestibles la media (25,2) está muy por encima de la mediana (8,9) porque hay unos pocos hongos gigantes, de unos 50 cm, que la inflan.

### Concepto 6: no todos los porcentajes valen lo mismo (margen de error)

Un 100 % calculado con 32 hongos vale mucho menos que un 65 % calculado con 8.000. Una medida simple es el **error estándar**:

```
EE = raíz( p × (1 − p) / n )
```

El valor real está, aproximadamente, a menos de **2 × EE** del calculado:

- Sombreros de 3 a 4 cm (8.080 hongos, 64,7 %): margen de **±1 punto**.
- Sombreros de 24 a 25 cm (32 hongos, 62,5 %): margen de **±17 puntos**.

> **Para explicarlo:** “Los puntos de los extremos de los gráficos saltan porque tienen pocos hongos; no hay que darles mucha importancia.”

---

## 6. Las 14 correlaciones, una por una

Para cada una: la pregunta, cómo se arma, qué muestra, cómo se lee y qué se concluye. Están en el orden de la web, agrupadas por hipótesis.

### Hipótesis 1: “si tiene anillo o cambia de color, es venenoso”

#### Correlación 1: el anillo

- **Hoja:** Mitos - Anillo y Magulladura
- **Pregunta:** ¿el anillo sirve para reconocer un hongo venenoso?
- **Cómo se arma:** Filas = `has-ring Nombre` · Columnas = clase · Valores = cuenta, como % del total de fila.

| ¿Tiene anillo? | Hongos | Venenosos |
| --- | --- | --- |
| Sí | 15.179 | 60,5 % |
| No | 45.890 | 53,8 % |

- **Cómo se lee:** las dos filas quedan a pocos puntos del 55,5 %. Saber que tiene anillo mueve la estimación unos 5 puntos.
- **Conclusión:** **mito**. Ejemplo para contar: la *Amanita phalloides* (mortal) y el *Agaricus campestris* (comestible) tienen anillo los dos.

#### Correlación 2: la magulladura

- **Hoja:** Mitos - Anillo y Magulladura
- **Pregunta:** ¿es venenoso el hongo que cambia de color o “sangra” al cortarlo?
- **Cómo se arma:** igual que la anterior, con `does-bruise-or-bleed Nombre`.

| ¿Se magulla? | Hongos | Venenosos |
| --- | --- | --- |
| Sí | 10.590 | 53,3 % |
| No | 50.479 | 55,9 % |

- **Cómo se lee:** prácticamente iguales, y los dos pegados a la base. Es el rasgo que **menos** informa de todo el trabajo.
- **Conclusión:** **mito**. Ejemplo: el *Boletus pulverulentus* se pone azul oscuro al tocarlo y es comestible.

### Hipótesis 2: “los hongos chicos son los peligrosos”

#### Correlación 3: tamaño y forma

- **Hoja:** Toxicidad - Tamaño y Forma
- **Pregunta:** ¿los venenosos son más grandes o más chicos? ¿Depende de la forma?
- **Cómo se arma:** Filas = forma · Columnas = clase · Valores = **promedio** de `cap-diameter`.

| Forma | Comestibles (cm) | Venenosos (cm) |
| --- | --- | --- |
| Campana | 3,45 | 3,68 |
| Cónica | 3,08 | 4,28 |
| Convexa | 7,09 | 6,27 |
| Esférica | 11,21 | 5,83 |
| Hundida | 7,81 | 7,14 |
| Plana | 7,57 | 6,42 |
| Otras | 25,22 | 4,89 |
| **Total** | **7,80** | **5,88** |

- **Cómo se lee:** en general los comestibles son más grandes. Pero depende de la forma: en las esféricas la diferencia es enorme (11,2 contra 5,8 cm) y en campana y cónica se **invierte**.
- **Ojo:** el 25,2 de “Otras” comestibles está inflado por unos pocos gigantes (ver concepto 5).
- **Conclusión:** el efecto **depende de otro rasgo** (la forma). Un promedio describe a un grupo, no a un hongo.

#### Correlación 4: diámetro del sombrero por rangos

- **Hoja:** Toxicidad - Tamaño por Rangos
- **Pregunta:** ¿cambia la proporción de venenosos a medida que el sombrero es más grande?
- **Cómo se arma:** Filas = `cap-diameter` **agrupado** de a 1 cm (0 a 25) · Valores = **promedio de `toxico (1/0)`**. Se ocultan los sombreros de 25 cm o más (396 hongos).

| Rango (cm) | 0-1 | 1-2 | 2-3 | 3-4 | 4-5 | 5-6 | 6-7 | 9-10 | 10-11 | 15-16 | 20-21 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % venenosos | 79,5 | 66,8 | 76,8 | 64,7 | 55,6 | 52,4 | 48,2 | 43,4 | 40,1 | 46,1 | 34,9 |

- **Cómo se lee:** hasta 4 cm, entre 65 % y 80 % son venenosos. Desde unos 9 cm baja a 40–50 % y se mantiene.
- **Conclusión:** **tendencia, no regla.** Es la mejor pista numérica, pero ni en el mejor rango baja de 35 %. Esta curva es la base del **Modelo 2 de GeoGebra**.

#### Correlación 5: alto del tallo por rangos

- **Hoja:** Toxicidad - Tamaño por Rangos
- **Cómo se arma:** igual, agrupando `stem-height` de a 1 cm, con el filtro `Con tallo = Sí` (los sin tallo tienen alto 0 y distorsionarían el primer rango).
- **Qué muestra:** sube y baja entre 43 % y 74 % sin orden. Los tallos de más de 19 cm son casi todos comestibles.
- **Cómo se lee:** para hablar de tendencia, la curva tendría que ser **monótona** (siempre subir o siempre bajar). No lo es. Los tallos altos comestibles son probablemente una sola especie.
- **Conclusión:** **sin patrón.**

#### Correlación 6: grosor del tallo por rangos

- **Hoja:** Toxicidad - Tamaño por Rangos
- **Cómo se arma:** agrupando `stem-width` de a 2 mm, con `Con tallo = Sí`. Se ocultan los de 50 mm o más.
- **Qué muestra:** baja hasta **20 %** cerca de los 21 mm y vuelve a subir hasta **80 %** cerca de los 31 mm. Tiene forma de “U”.
- **Cómo se lee:** una relación curva (en U) puede ser fuerte en tramos y aun así no servir como regla. Si se le ajustara una recta, saldría casi plana.
- **Conclusión:** **sin patrón** útil.

#### Correlación 7: sombrero y tallo

- **Hoja:** Correlación Sombrero-Tallo
- **Pregunta:** ¿los hongos con sombrero más grande tienen el tallo más grueso? ¿Pasa lo mismo en venenosos y comestibles?
- **Cómo se arma:** Filas = `cap-diameter` agrupado de a 1 cm · Columnas = clase · Valores = **promedio** de `stem-width`. Aparte, una tabla con r, pendiente, ordenada y R² (en Excel: `COEF.DE.CORREL`, `PENDIENTE`, `INTERSECCION.EJE`, `COEFICIENTE.R2`).

| Grupo (sombrero < 25 cm) | r | R² | Pendiente (mm por cm) | Ordenada (mm) | Hongos |
| --- | --- | --- | --- | --- | --- |
| Todos | 0,764 | 0,584 | 1,830 | 0,278 | 59.614 |
| Venenosos | 0,840 | 0,706 | 1,828 | −0,155 | 32.808 |
| Comestibles | 0,684 | 0,468 | 1,789 | 1,111 | 26.806 |

- **Cómo se lee:**
  - **r = 0,76** indica una relación fuerte (va de −1 a 1; 0 es “ninguna relación en línea recta”).
  - **Pendiente 1,8:** por cada cm más de sombrero, el tallo es 1,8 mm más grueso.
  - **R² = 0,58:** la recta explica el 58 % de la variación del grosor. El resto depende de otras cosas, como la especie.
  - Las pendientes de venenosos (1,83) y comestibles (1,79) son **casi iguales**.
- **Ojo:** si se incluyen los 396 sombreros gigantes, la pendiente de los comestibles cae de 1,79 a **1,03**. Unos pocos puntos muy lejanos “tiran” de la recta.
- **Conclusión:** **relación fuerte, pero no distingue.** Un hongo grande es grande “en todo”, igual en los dos grupos. Es la base del **Modelo 1 de GeoGebra**.

### Hipótesis 3: “los colores llamativos avisan que es venenoso”

#### Correlación 8: color del sombrero

- **Hoja:** Toxicidad - Color y Forma (tabla derecha)
- **Cómo se arma:** Filas = `cap-color Nombre` · Columnas = clase · % del total de fila · ordenada de mayor a menor.

| Color | Verde | Rojo | Rosa | Naranja | Púrpura | Negro | Amarillo | Blanco | Marrón | Gris | Azul | Crema |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % venenosos | 88,9 | 78,2 | 73,6 | 70,7 | 64,2 | 60,8 | 58,0 | 51,1 | 48,8 | 48,0 | 45,4 | 20,8 |

- **Cómo se lee:** los colores llamativos tienen más venenosos. Pero el **marrón es el 40 % de la muestra** (24.218 hongos) y está en 49 %: justo donde más hace falta, el color no ayuda. Ningún color es seguro: aun en crema, 1 de cada 5 es venenoso.
- **Conclusión:** **sirve solo en los extremos.** Ejemplo: *Amanita muscaria* (roja, venenosa) contra *Cantharellus cibarius* (naranja, comestible).

#### Correlación 9: color del tallo

- **Hoja:** Toxicidad - Color del Tallo

| Color del tallo | Sin tallo | Rosa | Verde | Negro | Rojo | Amarillo | Púrpura | Naranja | Marrón | Azul | Blanco | Gris | Crema |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % venenosos | 100 | 87,1 | 79,0 | 77,4 | 73,8 | 68,3 | 64,2 | 60,8 | 59,5 | 53,5 | 42,7 | 39,3 | 0 |

- **Cómo se lee:** es la característica que **más separa**. Pero el tallo blanco, el más común (22.926 hongos), está en 43 %. Los extremos son grupos chicos: 1.059 sin tallo y 173 de tallo crema.
- **Conclusión:** **sirve solo en los extremos.**

#### Correlación 10: superficie del sombrero

- **Hoja:** Toxicidad - Superficie

| Superficie | Sedosa | Fibrosa | Pegajosa | Arrugada | Con surcos | d (sin doc.) | Sin dato | Carnosa | Coriácea | Escamosa | Brillante | Lisa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % venenosos | 92,1 | 83,4 | 65,6 | 59,9 | 58,4 | 53,8 | 52,5 | 52,2 | 50,0 | 47,5 | 47,4 | 43,0 |

- **Cómo se lee:** sedosa y fibrosa son la señal de alarma más fuerte entre los rasgos comunes. Lisa no garantiza nada (43 %). El 23 % de la muestra no tiene la superficie cargada (“Sin dato”), y ese grupo queda cerca de la base.
- **Conclusión:** **sirve solo en los extremos.** Detalle útil: la textura se percibe con el **tacto** (lo retoman las conclusiones, en la parte sobre personas ciegas).

### Hipótesis 4: “depende de dónde y cuándo lo encontrás”

#### Correlación 11: hábitat

- **Hoja:** Toxicidad - Hábitat y Estación

| Hábitat | Caminos | Pastos | Matorrales | Bosques | Prados | Hojas | Desechos | Urbano |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hongos | 360 | 7.943 | 2.001 | 44.209 | 2.920 | 3.168 | 353 | 115 |
| % venenosos | 100 | 68,7 | 65,2 | 54,4 | 51,1 | 38,8 | 0 | 0 |

- **Cómo se lee:** los 0 % y 100 % son grupos chicos (probablemente una especie cada uno). Lo importante: **en el bosque crece el 72 % de la muestra**, con 54 % de venenosos, casi igual a la base.
- **Conclusión:** **sirve solo en los extremos.**

#### Correlación 12: estación

| Estación | Verano | Otoño | Primavera | Invierno |
| --- | --- | --- | --- | --- |
| Hongos | 22.898 | 30.177 | 2.727 | 5.267 |
| % venenosos | 57,9 | 57,6 | 43,1 | 39,3 |

- **Cómo se lee:** verano y otoño tienen más venenosos. Otoño y verano son el **87 % de la muestra**, por eso el 55,5 % general queda cerca de sus valores (concepto 3).
- **Ojo:** los datos no tienen fechas. La “estación” es un rasgo asignado a cada especie.
- **Conclusión:** **pista débil.**

#### Correlación 13: hábitat según la estación

- **Hoja:** Toxicidad - Hábitat y Estación (la **segmentación de datos** “Filtrar hábitat por estación”)
- **Cómo se arma:** sobre la tabla de hábitat se agrega una segmentación conectada a `season Nombre`. Al hacer clic en una estación, la tabla se recalcula solo con esos hongos.

| Hábitat | Primavera | Verano | Otoño | Invierno |
| --- | --- | --- | --- | --- |
| Bosques | 41,5 % | 55,3 % | 56,5 % | 45,2 % |
| Pastos | 56,0 % | 75,0 % | 69,3 % | 29,7 % |
| Hojas | 0 % | 53,2 % | 40,1 % | 21,3 % |
| Prados | 61,7 % | 51,2 % | 57,0 % | 0 % |

- **Cómo se lee:** en **pastos**, la estación cambia mucho (de 30 % en invierno a 75 % en verano). En el **bosque**, casi nada.
- **Concepto nuevo, la interacción:** cuando el efecto de un rasgo **cambia según otro**. Si no hubiera interacción, la diferencia entre invierno y verano sería parecida en todos los hábitats.
- **Conclusión:** **depende de otro rasgo.** Anticipa el giro: dos rasgos juntos dicen más que uno.

### Etapa II: dos rasgos a la vez

#### Correlación 14: color y forma

- **Hoja:** Toxicidad - Color y Forma (tabla izquierda)
- **Cómo se arma:** **dos campos en filas**: `cap-color Nombre` y, adentro, `cap-shape Nombre`. Excel muestra un subtotal por color, que coincide con la correlación 8.
- **Qué muestra:** dentro de un mismo color, la forma lo cambia todo.
  - Blancos **esféricos**: 14 % venenosos. Blancos **cónicos**: 100 %.
  - Marrones **cónicos**: 10 %. Marrones de **campana**: 78 %.
- **La cuenta que lo explica:** el total del blanco (51,1 %) es el promedio ponderado de sus formas:

```
0,511 ≈ 0,11·0,67 + 0,03·1,00 + 0,36·0,55 + 0,08·0,14 + 0,14·0,35 + 0,21·0,36 + 0,07·1,00
        (campana) (cónica)  (convexa)  (esférica) (hundida) (plana)  (otras)
```

Cada término es *(parte de los blancos con esa forma) × (proporción de venenosos en esa forma)*. Un total “cerca del 50 %” puede esconder grupos de 14 % y de 100 %.

- **Conclusión:** **depende de otro rasgo.** Es la bisagra hacia el giro (sección 8).

### Resumen de las 14

| # | Correlación | Cifra para recordar | Veredicto |
| --- | --- | --- | --- |
| 1 | Anillo | 61 % con · 54 % sin | Mito |
| 2 | Magulladura | 53 % sí · 56 % no | Mito |
| 3 | Tamaño y forma | 7,8 vs 5,9 cm | Depende de otro rasgo |
| 4 | Diámetro por rangos | 80 % → 40 % | Tendencia |
| 5 | Alto del tallo | 43–74 %, sin orden | Sin patrón |
| 6 | Grosor del tallo | baja a 20 %, sube a 80 % | Sin patrón |
| 7 | Sombrero y tallo | r = 0,76; 1,8 mm por cm | Relación fuerte, no distingue |
| 8 | Color del sombrero | verde 89 % · crema 21 % | Solo en los extremos |
| 9 | Color del tallo | sin tallo 100 % · blanco 43 % | Solo en los extremos |
| 10 | Superficie | sedosa 92 % · lisa 43 % | Solo en los extremos |
| 11 | Hábitat | bosque 54 % (72 % de la muestra) | Solo en los extremos |
| 12 | Estación | verano 58 % · invierno 39 % | Pista débil |
| 13 | Hábitat × estación | pastos 30 % → 75 % | Depende de otro rasgo |
| 14 | Color × forma | blanco esférico 14 % · cónico 100 % | Depende de otro rasgo |

---

## 7. GeoGebra: los dos modelos

### Por qué GeoGebra y por qué así

Los datos no tienen fechas, así que no se puede modelar “cómo cambia algo en el tiempo”. Se modela, en cambio, **la relación entre medidas**.

No se pueden cargar 61.069 puntos: el gráfico sería ilegible. La solución está en la hoja `Datos GeoGebra`:

1. Se agrupan los hongos de a **1 cm de sombrero** (0–1, 1–2, …).
2. Cada grupo aporta **un punto**: x = el centro del grupo (0,5; 1,5; 2,5…) e y = el promedio del grupo.
3. Los grupos con **menos de 100 hongos** se descartan, para que ningún punto dependa de pocos casos.
4. Excel arma el texto de la lista, listo para copiar y pegar en GeoGebra.

### Modelo 1: una recta (sombrero → grosor del tallo)

**Pasos en GeoGebra** (cada línea se pega en la barra de Entrada):

```
Todos = {(0.5, 1.18), (1.5, 2.40), (2.5, 4.69), (3.5, 6.56), …, (21.5, 43.43)}
f(x) = FitLine(Todos)
Venenosos = {(0.5, 1.18), (1.5, 2.61), …, (19.5, 35.62)}
Comestibles = {(0.5, 1.19), (1.5, 1.98), …, (20.5, 42.01)}
v(x) = FitLine(Venenosos)
c(x) = FitLine(Comestibles)
```

**Resultado** (ajustando sobre los puntos agrupados):

```
f(x) = 1,86·x − 0,18      (todos)
v(x) = 1,79·x + 0,16      (venenosos)
c(x) = 1,79·x + 0,56      (comestibles)
```

**Cómo leer la fórmula `y = m·x + b`:**

- **m (pendiente) = 1,8:** cuánto aumenta y cuando x aumenta 1. Por cada cm más de sombrero, el tallo engorda 1,8 mm. Es la **razón de cambio**.
- **b (ordenada al origen):** el valor de y cuando x = 0. Acá no tiene sentido físico (no hay sombreros de 0 cm); es solo para ubicar la recta.

**Ejemplo para usar en la exposición:** para un sombrero de 8 cm, el tallo esperado es 1,79 × 8 + 0,16 ≈ **14,4 mm** si es venenoso y 1,79 × 8 + 0,56 ≈ **14,8 mm** si es comestible. Menos de medio milímetro de diferencia: **no sirve para distinguir**.

**Qué hace `FitLine` (mínimos cuadrados), en palabras simples:**

1. Para cada punto se mide la distancia vertical hasta la recta (el “error”).
2. Se eleva cada error al cuadrado. Así los errores de arriba y los de abajo no se cancelan, y los errores grandes pesan más.
3. Se suman todos.
4. `FitLine` elige la única recta que hace **más chica** esa suma.

```
elegir m y b que minimicen  Σ ( yᵢ − (m·xᵢ + b) )²
```

**Por qué en la web dice r = 0,76 y no el ajuste de GeoGebra:** el r y el R² se calcularon en Excel sobre los **59.614 hongos individuales**. Los puntos de GeoGebra son **promedios**, y sobre promedios la recta ajusta mucho mejor de lo que ajusta a cada hongo. Es importante aclararlo si te preguntan.

### Modelo 2: una curva (sombrero → probabilidad de ser venenoso)

**Pasos en GeoGebra:**

```
Prob = {(0.5, 0.795), (1.5, 0.668), (2.5, 0.768), (3.5, 0.647), …, (21.5, 0.460)}
p(x) = FitLog(Prob)
p(3)
p(15)
```

**Resultado:**

```
p(x) = 0,740 − 0,109 · ln(x)
p(3)  ≈ 0,62   → un sombrero de 3 cm tiene 62 % de probabilidad de ser venenoso
p(15) ≈ 0,45   → uno de 15 cm, 45 %
```

El ajuste tiene R² ≈ 0,79 sobre los puntos agrupados: la curva sigue bien la tendencia de los promedios, aunque cada punto salta un poco por arriba o por abajo.

**Por qué una curva logarítmica:** los puntos bajan rápido al principio y después casi no cambian. La función `ln(x)` tiene justo esa forma: crece rápido para x chicos y cada vez más despacio. Como `b` es negativo (−0,109), la curva **baja** rápido y después **se aplana**.

**Qué hace `FitLog`, en palabras simples:** es un truco de cambio de variable.

1. Se llama `u = ln(x)`.
2. Entonces `p = a + b·u` es una **recta** en u.
3. GeoGebra calcula ln(x) de cada punto y aplica mínimos cuadrados como en `FitLine`.

**El límite del modelo (vale oro en la exposición):** cuando x se acerca a 0, `ln(x)` tiende a −∞, y como b es negativo, `p(x)` crece sin límite. Para sombreros de **menos de 0,09 cm**, la fórmula da **más de 1**, es decir, más de 100 %: imposible para una probabilidad. En el gráfico de GeoGebra se ve: la curva sube hasta 1,1 junto al eje.

- No tiene importancia práctica (no hay sombreros de 1 mm), pero muestra que **un modelo solo vale dentro del rango de los datos**.
- La mejora natural sería un **modelo logístico**, que siempre queda entre 0 y 1.

**Conclusión de GeoGebra:** el riesgo baja con el tamaño, pero dentro del rango de los datos la curva **nunca baja de 0,40**. A cualquier tamaño, al menos 4 de cada 10 son venenosos.

---

## 8. El giro: combinar rasgos

> Este cálculo **no está en el Excel**: se hizo aparte, con un script sobre la misma hoja `Data`. Conviene aclararlo.

**La idea:** agregar rasgos de a uno, como si se sumaran campos a las filas de una tabla dinámica, y contar qué parte de los hongos queda en grupos donde **todos** son de la misma clase (100 % comestibles o 100 % venenosos).

| Rasgos combinados | Combinaciones distintas | Hongos en grupos “puros” |
| --- | --- | --- |
| Forma | 7 | 0 % |
| + color del sombrero | 66 | 6,7 % |
| + color del tallo | 274 | 23,7 % |
| + superficie | 704 | 63,8 % |
| + anillo y magulladura | 818 | 80,0 % |
| + láminas (3 rasgos) | 1.788 | 98,0 % |
| + el resto (6 rasgos) | 2.023 | **99,8 %** |

**¿Entonces mirando sí se puede?** No exactamente. Los datos salen de **173 especies**. Cuando se combinan muchos rasgos, cada combinación termina describiendo **una especie**. Combinar rasgos es, en el fondo, **reconocer la especie**: el trabajo de un micólogo. En el mundo real hay miles de especies, y muchas venenosas son casi idénticas a otras comestibles.

**Con el tacto:** con el mismo método, cuatro rasgos táctiles (forma, superficie, tamaño, anillo) dejan en grupos puros al 38 % de los hongos, contra el 28 % de los tres colores. Es la base de la propuesta de modelos táctiles para personas ciegas.

---

## 9. El modelado 3D en dos minutos

- Con los promedios de cada forma (diámetro, alto, grosor) se construye el **hongo típico**. Ejemplo, la convexa: 6,67 cm de sombrero, 6,84 cm de tallo y 12,41 mm de grosor.
- **Dato curioso:** en las seis formas, el color más frecuente es el **marrón con tallo blanco**.
- **Sólido de revolución:** los hongos con tallo son casi simétricos alrededor de un eje. Se dibuja **la mitad del perfil** y se la hace girar 360°. Es lo que hace `rotate_extrude()` en OpenSCAD.
- **Volumen:** por el teorema de Pappus–Guldin, *V = 2π · x̄ · A* (A = área del perfil; x̄ = distancia de su centroide al eje).
- **Qué queda afuera:** “Otras” (5,7 %, hongos de repisa o sin tallo), porque no tienen eje de simetría.
- **Las imágenes de IA:** comparadas con los datos, dos tenían errores (la esférica era roja con una banda artificial; la de campana tenía el tallo exagerado). Por eso la web usa imágenes generadas desde el modelo y fotos reales.

---

## 10. Guion para exponer en 5 minutos

1. **Gancho (30 s).** Mostrar *Amanita phalloides* y *Agaricus campestris*. “Los dos son claros, de sombrero redondeado y tienen anillo. Uno es mortal y el otro comestible. ¿Se puede saber cuál es cuál mirándolos?”
2. **Datos (45 s).** “61.069 hongos generados a partir de 173 especies. El 55,5 % es venenoso: esa es mi línea de base. Un rasgo sirve si aleja mucho ese número.”
3. **Mitos (45 s).** “Con anillo, 61 %; sin anillo, 54 %. Los que se magullan, 53 %; los que no, 56 %. Los dos son mitos.”
4. **Pistas reales (1 min).** “El tamaño muestra una tendencia: los chicos tienen hasta 80 % de venenosos. Los colores llamativos también. Pero el 40 % de los hongos son marrones, y ahí la mitad es venenosa. Las señales fuertes están en grupos chicos.”
5. **GeoGebra (1 min).** “Con FitLine vi que el tallo crece 1,8 mm por cm de sombrero, igual en los dos grupos: la forma no delata. Con FitLog, la probabilidad baja de 62 % a 3 cm a 45 % a 15 cm, pero nunca baja de 40 %. Y el modelo tiene un límite: cerca de 0 da probabilidades mayores que 1.”
6. **Giro (45 s).** “Si combino todos los rasgos, el 99,8 % queda en grupos puros. Pero eso es reconocer la especie, y en el mundo hay miles.”
7. **Cierre (15 s).** “Con una regla simple, no se puede. Ningún hongo silvestre es seguro por su aspecto.”

---

## 11. Preguntas que te pueden hacer

**¿Por qué usaste datos simulados y no reales?**
Porque es el único conjunto grande, ordenado y público con la clase comestible/venenoso. Los simulados respetan los rangos de 173 especies reales. El límite es que los porcentajes no reflejan la frecuencia real en la naturaleza, y lo aclaro siempre.

**Si el anillo da 61 % contra 54 %, ¿no es una diferencia?**
Es una diferencia de 7 puntos, pero chica para decidir. Alguien que use la regla del anillo acierta casi lo mismo que tirando una moneda. Además, “tener anillo” agrupa tipos de anillo muy distintos.

**¿Qué significa r = 0,76?**
Que el sombrero y el tallo están muy relacionados en línea recta (1 sería una recta perfecta). R² = 0,58 quiere decir que la recta explica el 58 % de la variación del grosor.

**¿Por qué una curva logarítmica y no una recta en el modelo 2?**
Porque los puntos bajan rápido al principio y después se aplanan, y `ln(x)` tiene esa forma. Una recta seguiría bajando y llegaría a probabilidades negativas.

**¿El modelo 2 tiene algún problema?**
Sí: para sombreros de menos de 1 mm da probabilidades mayores que 1. Muestra que un modelo vale solo en el rango de los datos. Un modelo logístico lo resolvería.

**¿Por qué hay grupos con 0 % o 100 %?**
Porque suelen ser grupos chicos que corresponden a una o dos especies. No son reglas generales.

**¿Por qué agrupaste de a 1 cm para GeoGebra?**
Porque 61.069 puntos no se pueden cargar ni leer. Agrupar da un punto por grupo (su promedio), y descarto los grupos con menos de 100 hongos para que ningún punto dependa de pocos casos.

**El 99,8 % del giro, ¿no contradice la conclusión?**
No: muestra que combinar muchos rasgos equivale a reconocer la especie. En estos datos hay 173; en la naturaleza hay miles, con parecidos peligrosos. Además, ese cálculo se hizo fuera del Excel, y lo aclaro.

**¿Qué aporta el 3D?**
Llevar las medidas promedio a un objeto: el hongo típico de cada forma, construido como sólido de revolución. Sirve para comunicar y podría imprimirse como material táctil.

---

## 12. Glosario

| Término | Qué significa |
| --- | --- |
| **Línea de base** | La proporción de venenosos en toda la muestra (55,5 %). Lo que se sabe antes de mirar el hongo. |
| **Probabilidad condicional** | La chance de algo sabiendo otra cosa. Acá: de ser venenoso, sabiendo que tiene cierto rasgo. |
| **Punto porcentual** | La diferencia entre dos porcentajes (61 % − 55,5 % = 5,5 puntos). |
| **Promedio ponderado** | Promedio donde cada grupo pesa según cuántos casos tiene. |
| **Media / mediana** | La media es el promedio; la mediana, el valor del medio. La mediana no se mueve con valores extremos. |
| **Error estándar** | Cuánto puede variar por azar una proporción estimada. Es más chico cuanto más datos hay. |
| **Monótona** | Una curva que siempre sube o siempre baja. |
| **Interacción** | Cuando el efecto de un rasgo cambia según el valor de otro. |
| **Correlación (r)** | Qué tan alineados están dos variables en línea recta. Va de −1 a 1. |
| **R²** | La parte de la variación que explica la recta (r al cuadrado). |
| **Pendiente** | Cuánto cambia y cuando x aumenta 1. La razón de cambio. |
| **Mínimos cuadrados** | Método para elegir la recta (o curva) que hace más chica la suma de los errores al cuadrado. |
| **FitLine / FitLog** | Comandos de GeoGebra que ajustan una recta o una curva `a + b·ln(x)` a una lista de puntos. |
| **Tabla dinámica** | Herramienta de Excel que agrupa filas y calcula cuentas, promedios o porcentajes por grupo. |
| **Segmentación de datos** | Botones de Excel que filtran una tabla dinámica con un clic. |
| **Sólido de revolución** | El cuerpo que se forma al girar una figura plana 360° alrededor de un eje. |
| **Micólogo** | Especialista en hongos. |
