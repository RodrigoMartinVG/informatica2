# Guía de estudio: entender el trabajo de hongos

## Cómo usar esta guía

Esta guía se lee de corrido, como un apunte. No hace falta saber estadística: cada idea se explica cuando aparece por primera vez.

Tené abiertos al lado:

- **El Excel:** `v5_Hongos_DataSet_Rodrigo_Vidal.xlsx`.
- **GeoGebra:** la calculadora gráfica en geogebra.org/calculator.

A lo largo del texto vas a ver recuadros como este:

> **📂 En el Excel:** abrí tal hoja y mirá tal cosa.

> **📐 En GeoGebra:** pegá tal comando y fijate tal cosa.

La idea es que leas un párrafo, vayas al archivo, mires lo que te indica y vuelvas. Así, cuando tengas que explicarlo, ya lo viste con tus propios ojos y no lo estás repitiendo de memoria.

Al final de cada lección hay un recuadro **💬 Para decirlo con tus palabras**: una forma corta y clara de explicar esa parte en voz alta.

---

## Lección 1: la pregunta

Todo el trabajo gira alrededor de una sola pregunta: **¿se puede saber si un hongo es comestible con solo mirarlo?**

La pregunta no es caprichosa. Mucha gente que sale a buscar hongos confía en reglas populares: *“si tiene anillo, es venenoso”*, *“si cambia de color al cortarlo, no lo comas”*, *“los de colores fuertes son peligrosos”*. Son fáciles de recordar y parecen razonables. El trabajo las toma como **hipótesis**, es decir, como ideas que pueden ser verdaderas o falsas y que se pueden poner a prueba con datos.

¿Cómo se pone a prueba una regla así? Con muchos hongos. Si la regla del anillo fuera cierta, al juntar todos los hongos con anillo deberíamos encontrar que casi todos son venenosos. Si no pasa eso, la regla no sirve.

Spoiler, para que sepas adónde vamos: ninguna regla simple funciona. Algunas son directamente mitos, y otras sirven solo en casos raros. Y al final aparece un giro interesante: si combinás muchísimos rasgos a la vez, casi podés acertar… pero eso ya no es “mirar”, es reconocer la especie, que es lo que hace un especialista.

> 💬 **Para decirlo con tus palabras:** “Tomé las creencias populares sobre hongos y las traté como hipótesis. Las puse a prueba con más de 60.000 hongos para ver si alguna permite saber, mirando, si un hongo es venenoso.”

---

## Lección 2: los datos y de dónde salen

### Una enciclopedia convertida en fichas

Para probar las reglas hacen falta muchísimos hongos, cada uno con sus características anotadas y con la respuesta correcta: comestible o venenoso. Juntar eso en el campo llevaría años. Por eso usamos un conjunto de datos publicado por investigadores alemanes (Wagner, Heider y Hattab, 2021), que se armó así:

1. Partieron de una **guía de campo con 173 especies** de hongos reales.
2. La guía describe cada especie con rangos: “sombrero de 5 a 10 cm, marrón o gris, superficie escamosa…”.
3. Una computadora **sorteó** valores dentro de esos rangos y generó **61.069 hongos**. Cada uno es una “ficha” posible de alguna de esas 173 especies.

Una imagen que ayuda: **es una enciclopedia de 173 especies convertida en 61.069 fichas**. Esta idea es importante y va a volver al final, porque explica el giro del trabajo.

> **📂 En el Excel:** abrí la hoja **Acerca de**. Ahí está explicado el origen de los datos y por qué se eligió esta versión.

### Qué tiene cada ficha

> **📂 En el Excel:** abrí la hoja **Data**. Cada fila es un hongo: son 61.069 filas.

Recorré las columnas de izquierda a derecha. Vas a ver:

- La columna **`class`** (F), con una letra: `e` (*edible*, comestible) o `p` (*poisonous*, venenoso).
- Tres columnas con números: **`cap-diameter`** (H, diámetro del sombrero en cm), **`stem-height`** (R, alto del tallo en cm) y **`stem-width`** (S, grosor del tallo en mm).
- Muchas columnas con letras sueltas: forma, color, superficie, anillo, hábitat, estación…

Esas letras son códigos. Para saber qué significa cada uno está la hoja **Diccionario**.

> **📂 En el Excel:** abrí la hoja **Diccionario**. Por ejemplo, en `cap-shape` vas a ver que `x` = convexa y `b` = campana. En `cap-color`, que `n` = marrón y `e` = rojo.

### Lo que estos datos no pueden decir

Antes de sacar conclusiones conviene tener claros los límites, porque te los pueden preguntar:

- **Son simulados.** Los hongos no se recolectaron: los generó una computadora. Los porcentajes muestran cómo se armaron los datos, no qué tan común es cada hongo en la naturaleza.
- **Son solo 173 especies.** Cada especie aparece cientos de veces. Por eso, cuando un grupo da “100 % venenoso”, muchas veces es una sola especie, no una regla general.
- **Hay columnas casi vacías.** Por ejemplo, el color de las esporas falta en casi el 90 % de las filas. Esas columnas no se usaron.

> 💬 **Para decirlo con tus palabras:** “Los datos salen de una guía de 173 especies reales. A partir de ella, una computadora generó 61.069 hongos con sus características. No son hongos recolectados, y eso es un límite que hay que tener en cuenta.”

---

## Lección 3: preparar los datos en Excel

Con los datos crudos no se puede trabajar cómodo: están en inglés y en códigos de una letra. Lo primero fue **traducirlos** y agregar algunas columnas útiles.

> **📂 En el Excel:** en la hoja **Data**, mirá las columnas que terminan en **“Nombre”** (por ejemplo `Class por Nombre`, en la columna E, o `cap-shape Nombre`, en la I). Hacé clic en una celda y mirá la fórmula en la barra de arriba.

Vas a encontrar dos tipos de fórmula:

- **`SI` anidados.** La de `cap-shape Nombre` dice, en criollo: “si el código es `b`, escribí Campana; si no, si es `c`, escribí Cónica; si no…”, y así hasta llegar a “Otras”.
- **`SI.CONJUNTO`.** Hace lo mismo con varias condiciones de forma más prolija. Se usa para hábitat, estación, color del tallo y superficie. La última condición, `VERDADERO;"Sin dato"`, atrapa todo lo que no coincidió antes, como las celdas vacías.

Hay tres columnas nuevas que vale la pena entender:

- **`Con tallo`** (AJ) dice “Sí” si el grosor del tallo es mayor que 0. Un hongo con grosor 0 es un hongo sin tallo.
- **`cap-diameter_Grande-Chico`** (G) separa los sombreros de 10 cm o más.
- **`toxico (1/0)`** (AK) vale 1 si el hongo es venenoso y 0 si es comestible. Parece poca cosa, pero es la columna más útil del trabajo, y en la lección 5 vas a ver por qué.

> **📂 En el Excel:** mirá las primeras columnas de la hoja **Data** (de la A a la C). Ahí están las fórmulas de control: `CONTAR` da 61.069 hongos y `CONTAR.SI` cuenta 33.888 venenosos. La celda “Chequeo” verifica que la suma dividida por la cantidad dé el promedio: es una forma de comprobar que las cuentas son coherentes.

> 💬 **Para decirlo con tus palabras:** “Primero traduje los códigos con fórmulas SI y SI.CONJUNTO, y agregué columnas auxiliares. La más útil fue una que vale 1 si el hongo es venenoso y 0 si no.”

---

## Lección 4: la idea clave de todo el trabajo, la línea de base

Si hay una sola idea que tenés que entender bien, es esta.

De los 61.069 hongos, **33.888 son venenosos: el 55,5 %**. Pensalo así: si metés todos los hongos en una bolsa y sacás uno sin mirar, la chance de que sea venenoso es 55,5 %. Eso es lo que sabés **antes** de mirar el hongo. Lo llamamos **línea de base**.

Ahora, ¿qué significa que una regla “sirva”? Que **cambie mucho** ese número. Por ejemplo:

- Si los hongos con anillo fueran venenosos en un **95 %**, saber que un hongo tiene anillo te daría muchísima información: pasarías de 55 % a 95 %.
- Si los hongos con anillo fueran venenosos en un **58 %**, saber que tiene anillo casi no te diría nada: seguirías prácticamente igual que antes de mirar.

Esa es la vara con la que se mide todo el trabajo: **cada rasgo se compara contra el 55,5 %**. En casi todos los gráficos del Excel vas a ver una referencia a ese número.

Una forma más técnica de nombrar lo mismo: cuando calculamos “qué porcentaje de los hongos con anillo son venenosos”, estamos calculando una **probabilidad condicional**. Es la probabilidad de ser venenoso **sabiendo que** tiene anillo. No hace falta usar el término en la exposición, pero si alguien lo menciona, ya sabés qué es.

> 💬 **Para decirlo con tus palabras:** “El 55,5 % de los hongos son venenosos. Esa es mi línea de base. Una regla sirve si, al aplicarla, ese porcentaje cambia mucho. Si queda cerca del 55 %, no sirve.”

---

## Lección 5: la herramienta, la tabla dinámica

Casi todo el análisis se hizo con **tablas dinámicas**. Una tabla dinámica es una herramienta de Excel que agrupa filas parecidas y hace una cuenta por grupo: cuántas hay, qué promedio tienen o qué porcentaje representan.

Veamos cómo se arma con un ejemplo, porque todas las demás son variaciones de esta.

> **📂 En el Excel:** abrí la hoja **Mitos - Anillo y Magulladura** y hacé clic sobre la primera tabla. A la derecha se abre el panel de campos de la tabla dinámica. Fijate en qué campo está en cada lugar.

Vas a ver:

- En **Filas**, el campo `has-ring Nombre`. Por eso la tabla tiene dos filas: “Sí” y “No”.
- En **Columnas**, el campo `Class por Nombre`. Por eso hay dos columnas: Comestible y Venenoso.
- En **Valores**, una cuenta de hongos, configurada para **mostrarse como % del total de la fila**. Gracias a eso cada fila suma 100 %, y se lee directo qué parte de los hongos con anillo es venenosa.

Hay dos trucos más que se usan en otras hojas:

- **Agrupar números en rangos.** En vez de tener una fila por cada diámetro posible (3,21 cm, 3,22 cm…), Excel los junta de a 1 cm: 0 a 1, 1 a 2, 2 a 3… Se hace con clic derecho sobre los números → *Agrupar*.
- **El promedio de la columna 0/1.** Acá aparece la utilidad de `toxico (1/0)`. Si en un grupo hay 10 hongos y 7 son venenosos, la columna tiene siete 1 y tres 0. El promedio es (1+1+1+1+1+1+1+0+0+0) / 10 = 0,7, es decir, **70 % venenosos**. El promedio de una columna de unos y ceros te da directamente el porcentaje.

Un detalle más: si hacés **doble clic** sobre un número de una tabla dinámica, Excel abre una hoja nueva con los hongos que forman ese número. Así se creó la hoja **Detail1**, que muestra los 774 hongos cónicos comestibles. Sirve para comprobar de dónde sale una cifra.

> 💬 **Para decirlo con tus palabras:** “Para cada pregunta armé una tabla dinámica: en las filas el rasgo, en las columnas la clase, y como valor el porcentaje por fila. Así veo directamente qué parte de cada grupo es venenosa.”

---

## Lección 6: poner a prueba las creencias populares

Ahora sí, las hipótesis. Cada hoja de análisis del Excel tiene arriba un recuadro **“Cómo leer esta hoja”**, con cuatro partes: qué muestra, cómo leerlo, qué encontramos y la conclusión. Usalo como resumen cuando repases.

### Hipótesis 1: “si tiene anillo, es venenoso”

El anillo es una especie de “pollerita” que algunos hongos tienen en el tallo. La creencia viene de que las amanitas mortales tienen un anillo muy visible.

> **📂 En el Excel:** hoja **Mitos - Anillo y Magulladura**, primera tabla y su gráfico.

Lo que vas a ver: los hongos **con anillo** son venenosos en un **61 %**, y los **sin anillo**, en un **54 %**. Las dos cifras están muy cerca de la línea de base (55,5 %). Saber que un hongo tiene anillo te mueve la estimación unos 5 puntos. Es casi como no saber nada.

**Conclusión: es un mito.** Un ejemplo que lo muestra bien: la *Amanita phalloides* (mortal) y el *Agaricus campestris* (comestible, pariente del champiñón) tienen anillo los dos.

### Hipótesis 1 bis: “si cambia de color al cortarlo, es venenoso”

Algunos hongos se ponen azules o negros al tocarlos, o largan un líquido. La creencia dice que eso indica veneno.

> **📂 En el Excel:** misma hoja, segunda tabla.

Lo que vas a ver: los que se magullan son venenosos en un **53 %** y los que no, en un **56 %**. Son prácticamente iguales, y los dos están pegados a la base. Es el rasgo que **menos** información da de todo el trabajo.

**Conclusión: otro mito.** Hay hongos que se ponen azul oscuro al cortarlos y son comestibles, como el *Boletus pulverulentus*.

> 💬 **Para decirlo con tus palabras:** “Las dos reglas más conocidas, la del anillo y la del cambio de color, son mitos: los porcentajes quedan muy cerca del 55 % general.”

### Hipótesis 2: “los hongos chicos son los peligrosos”

Esta tiene más sustento: muchos hongos chiquitos y marrones del bosque son tóxicos.

**Primer intento: comparar promedios.**

> **📂 En el Excel:** hoja **Toxicidad - Tamaño y Forma**. La tabla muestra el diámetro promedio del sombrero según la forma, separado en comestibles y venenosos.

En general, los comestibles miden en promedio **7,8 cm** y los venenosos **5,9 cm**. Parece confirmar la hipótesis, pero mirá la tabla por forma: en las esféricas la diferencia es enorme (11,2 contra 5,8 cm), y en las de campana y cónicas **se da vuelta**: ahí los venenosos son un poco más grandes.

Fijate también en la fila **“Otras”**: los comestibles dan **25,2 cm**, un número rarísimo. No es un error. En ese grupo hay unos pocos hongos gigantes, de unos 50 cm, que inflan el promedio. Es un buen ejemplo de algo que conviene saber: **el promedio se deja arrastrar por los valores extremos**. La mediana (el valor del medio cuando ordenás todos) no tiene ese problema: para “Otras” comestibles da 8,9 cm.

**Segundo intento: mirar por rangos.** Un promedio resume miles de hongos en un número y esconde lo que pasa adentro. Es mejor agrupar los hongos por tamaño y mirar cada grupo.

> **📂 En el Excel:** hoja **Toxicidad - Tamaño por Rangos**, primer gráfico (diámetro del sombrero). Cada punto es un grupo de hongos de 1 cm de sombrero, y la altura del punto es el porcentaje de venenosos (el promedio de `toxico (1/0)`, como vimos en la lección 5).

Seguí la línea con el dedo de izquierda a derecha:

- En los sombreros de **menos de 4 cm**, entre el **65 % y el 80 %** son venenosos. Acá la hipótesis tiene algo de razón.
- A partir de unos **9 cm**, la proporción baja a **40–50 %** y ya casi no cambia.
- Los últimos puntos, a la derecha, saltan bastante. No les des mucha importancia: son grupos con pocos hongos. Un porcentaje calculado con 30 hongos es mucho menos confiable que uno calculado con 8.000.

**Conclusión: es una tendencia, no una regla.** Los chicos son más riesgosos, pero aun entre los más grandes, 4 de cada 10 son venenosos. Este gráfico es el que después llevamos a GeoGebra (lección 9).

**¿Y el tallo?** En la misma hoja hay dos gráficos más.

> **📂 En el Excel:** mismos rangos, gráficos de **alto del tallo** y **grosor del tallo**. Fijate que tienen un filtro arriba, **Con tallo = Sí**: los hongos sin tallo se excluyen porque tienen alto 0 y distorsionarían el primer grupo.

El **alto** sube y baja sin orden: no hay una tendencia. El **grosor** baja hasta 20 % cerca de los 21 mm y vuelve a subir hasta 80 % cerca de los 31 mm, como una “U”. Ninguno de los dos sirve como regla.

> 💬 **Para decirlo con tus palabras:** “El tamaño del sombrero es la única medida con una tendencia clara: los chicos tienen más venenosos. Pero no es una regla, porque aun entre los grandes hay un 40 % de venenosos.”

### Una relación fuerte que no sirve: el sombrero y el tallo

Esta correlación es distinta a las demás: no compara un rasgo con la toxicidad, sino **dos medidas entre sí**.

> **📂 En el Excel:** hoja **Correlación Sombrero-Tallo**. El gráfico muestra, para cada centímetro de sombrero, el grosor promedio del tallo: una línea para comestibles y otra para venenosos. A la derecha hay una tabla con unos números: r, pendiente, ordenada y R².

Mirá el gráfico: las dos líneas suben juntas. Cuanto más grande el sombrero, más grueso el tallo. Tiene sentido: un hongo grande es grande “en todo”.

Ahora los números de la tabla, explicados sin fórmulas:

- **r = 0,76.** La **correlación** mide qué tan alineados están los puntos en línea recta. Va de −1 a 1. Cerca de 0 quiere decir “ninguna relación”, y cerca de 1, “casi una recta perfecta”. Un 0,76 es una relación fuerte.
- **Pendiente = 1,83.** Por cada centímetro más de sombrero, el tallo es **1,8 mm más grueso**.
- **R² = 0,58.** De todo lo que varía el grosor del tallo entre un hongo y otro, el 58 % se explica por el tamaño del sombrero. El resto depende de otras cosas, como la especie.

Lo importante viene ahora: la pendiente de los **venenosos (1,83)** y la de los **comestibles (1,79)** son casi iguales. Las dos líneas del gráfico van una encima de la otra. O sea, la **proporción** del hongo es la misma en los dos grupos: mirar si un hongo es “de tallo grueso o fino” para su tamaño no dice nada.

Un detalle que muestra la tabla: si se incluyen los 396 sombreros gigantes, la pendiente de los comestibles cae de 1,79 a 1,03. Unos pocos casos muy extremos pueden mover mucho un resultado.

> 💬 **Para decirlo con tus palabras:** “El sombrero y el tallo están muy relacionados: el tallo crece 1,8 mm por cada centímetro de sombrero. Pero esa proporción es igual en venenosos y comestibles, así que no sirve para distinguirlos. Una relación fuerte no siempre es útil.”

### Hipótesis 3: “los colores llamativos avisan que es venenoso”

La idea viene de la naturaleza: muchos animales venenosos son de colores fuertes, y el hongo rojo con puntos blancos de los cuentos es tóxico.

> **📂 En el Excel:** hoja **Toxicidad - Color y Forma**, tabla y gráfico de la **derecha** (porcentaje de venenosos por color del sombrero).

Lo que vas a ver: el **verde (89 %)**, el **rojo (78 %)**, el **rosa (74 %)** y el **naranja (71 %)** tienen muchos venenosos. Hasta ahí, la hipótesis parece cierta. Pero mirá dónde caen los colores **más comunes**: el marrón (49 %), el blanco (51 %) y el gris (48 %) quedan casi exactamente en la mitad.

Y acá está la clave: **el marrón solo es el 40 % de todos los hongos**. Justo donde está la mayoría, el color no ayuda. Además, ningún color es seguro: aun en el crema, el color “más seguro”, 1 de cada 5 es venenoso.

Pasa lo mismo con otros dos rasgos:

> **📂 En el Excel:** hoja **Toxicidad - Color del Tallo**. Los hongos **sin tallo** son 100 % venenosos, y algunos colores de tallo (rosa, verde, negro) tienen muchos venenosos. Pero el **tallo blanco**, que es el más común (casi 23.000 hongos), tiene **43 %**.

> **📂 En el Excel:** hoja **Toxicidad - Superficie**. Las superficies **sedosa (92 %)** y **fibrosa (83 %)** son casi siempre venenosas. La **lisa** tiene 43 %: ser liso no garantiza nada.

¿Por qué pasa siempre lo mismo? Porque **los porcentajes extremos aparecen en grupos chicos**. Hay pocos hongos verdes y pocos sin tallo. La mayoría tiene rasgos comunes, y ahí los porcentajes quedan cerca del 50 %. No es casualidad: el 55,5 % general es un promedio de todos los grupos, donde cada uno pesa según cuántos hongos tiene (un **promedio ponderado**). Si un grupo es enorme, como el marrón, “arrastra” el promedio hacia su valor y no puede alejarse mucho de él.

**Conclusión: estos rasgos sirven solo en los extremos.** El color del tallo es, de todas, la característica que más separa, y aun así deja a la mayoría de los hongos en zona de duda.

> 💬 **Para decirlo con tus palabras:** “Los colores llamativos sí tienen más venenosos, pero son pocos hongos. La mayoría son marrones y con tallo blanco, y ahí la mitad es venenosa. Las señales fuertes están en casos raros.”

### Hipótesis 4: “depende de dónde y cuándo lo encontrás”

Esto no es parte del aspecto, pero quien encuentra un hongo sabe dónde y cuándo lo encontró.

> **📂 En el Excel:** hoja **Toxicidad - Hábitat y Estación**. Arriba está el gráfico por hábitat y abajo el gráfico por estación.

Por **hábitat**: los que crecen en caminos son todos venenosos, y los urbanos, todos comestibles. Pero son grupos muy chicos, probablemente de una sola especie. Lo que importa es que **el 72 % de los hongos crece en el bosque**, y ahí son venenosos el 54 %: casi la línea de base. Justo donde más se buscan hongos, el lugar no ayuda.

Por **estación**: en verano y otoño hay más venenosos (58 %) que en primavera (43 %) e invierno (39 %). Es una pista débil.

Ahora, algo más interesante. En esa hoja hay un cuadro con botones, la **segmentación de datos** “Filtrar hábitat por estación”.

> **📂 En el Excel:** hacé clic en **Invierno** en la segmentación y mirá cómo cambia el gráfico de hábitat. Después probá **Verano**. Para volver a ver todo, borrá el filtro con el botón de la esquina.

En los **pastos**, los venenosos pasan de **30 % en invierno a 75 % en verano**. En el **bosque**, en cambio, casi no cambian (entre 42 % y 57 %). Cuando el efecto de un rasgo **cambia según otro** (acá, la estación cambia mucho en pastos y poco en bosque), se dice que hay una **interacción**. Es la primera pista de lo que viene: **dos rasgos juntos dicen más que uno solo**.

> 💬 **Para decirlo con tus palabras:** “El lugar y la época cambian algo los porcentajes, pero la mayoría de los hongos crece en el bosque, y ahí la mitad es venenosa en cualquier estación. Lo interesante es que, combinando hábitat y estación, algunos grupos se separan más.”

---

## Lección 7: dos rasgos a la vez

La hipótesis 4 dejó una pista. Vamos a seguirla con dos rasgos que ya conocemos: el color y la forma del sombrero.

> **📂 En el Excel:** hoja **Toxicidad - Color y Forma**, tabla de la **izquierda**. Es una tabla dinámica con **dos campos en las filas**: primero el color y, adentro de cada color, la forma.

Buscá el color **Blanco** y recorré sus formas:

- **Blanco esférico:** 14 % de venenosos.
- **Blanco cónico:** 100 % de venenosos.

Mismo color, resultados opuestos. Probá con el **Marrón**: los cónicos tienen 10 % y los de campana, 78 %.

Ahora mirá la fila **“Total Blanco”**: da 51 %. Ese total era el número que veíamos en la lección anterior, y es un **promedio de grupos muy distintos**: algunos casi sin venenosos y otros 100 % venenosos. Un total “en el medio” puede esconder cosas muy diferentes adentro.

> 💬 **Para decirlo con tus palabras:** “Al cruzar color y forma, muchos grupos se separan mucho más. El blanco en general tiene 51 % de venenosos, pero los blancos esféricos tienen 14 % y los cónicos, 100 %.”

---

## Lección 8: el giro, ¿y si miramos todo junto?

Si dos rasgos separan más que uno, ¿qué pasa si combinamos muchos? Este cálculo **no está en el Excel** (con tantos campos la tabla dinámica se vuelve inmanejable), así que se hizo aparte, sobre los mismos datos de la hoja `Data`. Conviene aclararlo en la exposición.

La idea es la misma de la tabla de color y forma, pero agregando rasgos de a uno. Y en cada paso se cuenta qué parte de los hongos queda en grupos “puros”, es decir, grupos donde **todos** son comestibles o **todos** son venenosos.

- Con la **forma** sola, ningún grupo es puro (0 %).
- Sumando el **color del sombrero**, el 7 %.
- Sumando el **color del tallo**, el 24 %.
- Sumando la **superficie**, el 64 %.
- Con **todos** los rasgos del aspecto, el **99,8 %**.

¿Entonces sí se puede saber mirando? No exactamente, y este es el punto más importante del trabajo. Acordate de la lección 2: los datos salen de **173 especies**. Cuando combinás muchos rasgos, cada combinación termina describiendo **una especie**. Combinar todos los rasgos es, en el fondo, **reconocer la especie**: exactamente lo que hace un especialista en hongos (un micólogo).

En estos datos funciona porque hay solo 173 especies. En el mundo real hay miles, y muchas venenosas son casi idénticas a otras comestibles, como la amanita y el champiñón del principio.

> 💬 **Para decirlo con tus palabras:** “Si combino todos los rasgos, casi todos los hongos quedan en grupos puros. Pero eso es porque combinar muchos rasgos equivale a reconocer la especie. Y en la naturaleza no hay 173 especies, hay miles.”

---

## Lección 9: GeoGebra, escribir las relaciones como fórmulas

En el Excel encontramos dos relaciones claras con las medidas:

1. El tallo crece con el sombrero (la correlación sombrero-tallo).
2. El riesgo baja a medida que el sombrero es más grande (el gráfico por rangos).

En GeoGebra probamos escribirlas como **funciones**: una fórmula que, dado el tamaño del sombrero, devuelve un valor.

### Primero, preparar los puntos

No se pueden llevar 61.069 puntos a GeoGebra: sería imposible de leer. Por eso los agrupamos.

> **📂 En el Excel:** hoja **Datos GeoGebra**. Abajo hay dos tablas: una para cada modelo. Fijate cómo se arma cada punto.

Los hongos se agrupan de a **1 cm de sombrero**. Cada grupo se convierte en **un punto**: la coordenada x es el centro del grupo (0,5; 1,5; 2,5…) y la coordenada y es el promedio del grupo. Los grupos con **menos de 100 hongos** se descartan, para que ningún punto dependa de unos pocos casos.

Arriba, en las **celdas amarillas**, está todo listo para copiar y pegar en GeoGebra. Las instrucciones paso a paso están en la misma hoja.

### Modelo 1: la recta

> **📐 En GeoGebra:** copiá la celda amarilla del **Paso 1** del Modelo 1 (empieza con `Todos = {(0.5, 1.18), …}`) y pegala en la barra de Entrada. Apretá Enter. Si no ves los puntos, alejá el zoom o tocá el botón de la casita.

Vas a ver una nube de puntos que sube, casi en línea recta.

> **📐 En GeoGebra:** pegá `f(x) = FitLine(Todos)`.

GeoGebra dibuja la recta que **mejor pasa** por los puntos. ¿Cómo la elige? Mide la distancia vertical de cada punto a la recta (el “error”), eleva cada error al cuadrado y los suma. De todas las rectas posibles, se queda con la que hace esa suma lo más chica posible. Por eso el método se llama **mínimos cuadrados**. Los cuadrados sirven para que los errores de arriba y los de abajo no se cancelen.

La recta que obtenés es aproximadamente **f(x) = 1,86·x − 0,18**. Cómo se lee:

- El número que multiplica a x, **1,86**, es la **pendiente**: por cada centímetro más de sombrero, el tallo crece 1,86 mm. Es la **razón de cambio**.
- El **−0,18** es la **ordenada al origen**: el valor cuando x = 0. Acá no tiene sentido real (no hay sombreros de 0 cm); sirve solo para ubicar la recta.

> **📐 En GeoGebra:** pegá los Pasos 3 y 4 (las listas `Venenosos` y `Comestibles`, y las rectas `v(x)` y `c(x)`).

Ahora tenés tres rectas, y casi no se distinguen: **v(x) ≈ 1,79·x + 0,16** y **c(x) ≈ 1,79·x + 0,56**. Un ejemplo para mostrarlo: para un sombrero de 8 cm, la recta de los venenosos da un tallo de 14,4 mm y la de los comestibles, 14,8 mm. Menos de medio milímetro de diferencia. Es la misma conclusión del Excel, ahora como fórmula: **las proporciones no distinguen**.

Un aviso por si te lo preguntan: el r = 0,76 se calculó en Excel con los 59.614 hongos uno por uno. En GeoGebra se usan promedios por grupo, y sobre promedios la recta siempre se ve más ajustada de lo que está a cada hongo individual.

### Modelo 2: la curva

> **📐 En GeoGebra:** abrí una ventana nueva (o borrá lo anterior) y pegá la celda amarilla del **Paso 1** del Modelo 2: `Prob = {(0.5, 0.795), (1.5, 0.668), …}`.

Ahora cada punto es el porcentaje de venenosos (entre 0 y 1) para cada tamaño de sombrero. Los puntos bajan rápido al principio y después casi se quedan quietos. Una recta no sirve para esa forma: seguiría bajando hasta dar probabilidades negativas.

> **📐 En GeoGebra:** pegá `p(x) = FitLog(Prob)`.

`FitLog` ajusta una curva de la forma **a + b·ln(x)**. La función logaritmo (`ln`) crece rápido al principio y cada vez más despacio, que es justo la forma de los puntos. Como b es negativo, la curva **baja** rápido y después **se aplana**. El resultado es aproximadamente:

**p(x) = 0,740 − 0,109 · ln(x)**

> **📐 En GeoGebra:** escribí `p(3)` y después `p(15)`.

Vas a obtener:

- **p(3) ≈ 0,62:** un sombrero de 3 cm tiene un 62 % de probabilidad de ser venenoso.
- **p(15) ≈ 0,45:** uno de 15 cm, un 45 %.

La curva baja, pero dentro del rango de los datos **nunca baja de 0,40**. A cualquier tamaño, al menos 4 de cada 10 son venenosos. La fórmula confirma lo que ya mostraba el Excel.

### El límite del modelo (muy bueno para mencionar)

> **📐 En GeoGebra:** hacé zoom cerca del origen, donde x es casi 0.

Vas a ver que la curva **sube por encima de 1**: llega a 1,1 junto al eje. Eso quiere decir una probabilidad de más del 100 %, que es imposible. Pasa porque, cuando x se acerca a 0, el logaritmo se va a menos infinito, y como b es negativo, p(x) crece sin límite. Ocurre con sombreros de menos de 1 mm, que no existen, así que no afecta las conclusiones. Pero muestra algo valioso: **un modelo solo vale dentro del rango de datos con el que se armó**. Una mejora sería usar otro tipo de curva (logística) que siempre quede entre 0 y 1.

> 💬 **Para decirlo con tus palabras:** “En GeoGebra escribí las dos relaciones como fórmulas. La recta muestra que el tallo crece 1,8 mm por centímetro de sombrero, igual en venenosos y comestibles. La curva logarítmica muestra que el riesgo baja con el tamaño pero nunca de 40 %. Y tiene un límite: cerca de cero da probabilidades mayores que 1, lo que muestra que un modelo vale solo en el rango de los datos.”

---

## Lección 10: el modelado 3D, en breve

Con los promedios de cada forma se puede construir el hongo “típico”. Por ejemplo, el convexo típico tiene un sombrero de 6,67 cm, un tallo de 6,84 cm de alto y 12,41 mm de grosor. Un dato curioso: en las seis formas, el color más frecuente es el **marrón con tallo blanco**. El hongo “promedio” no es nada llamativo.

Para modelarlo en 3D se usa una idea de matemática. Los hongos con tallo son casi simétricos alrededor de un eje vertical. Alcanza con dibujar **la mitad del perfil** y hacerla girar una vuelta completa: se obtiene el hongo entero. Eso se llama **sólido de revolución**, y es lo que hace OpenSCAD con `rotate_extrude()`.

Los hongos de la categoría “Otras” (hongos de repisa, sin tallo) no tienen eje de simetría, así que no se pueden modelar de esta manera.

> 💬 **Para decirlo con tus palabras:** “Con las medidas promedio armé el hongo típico de cada forma en 3D. Como son simétricos, alcanza con dibujar medio perfil y girarlo: es un sólido de revolución.”

---

## Lección 11: la respuesta y cómo contarla

### La respuesta

**Con una regla simple, no se puede.** Las dos creencias más conocidas (el anillo y el cambio de color) son mitos. Las pistas que sí existen (el tamaño, los colores llamativos, el color del tallo, la textura) funcionan solo en grupos chicos. Donde está la mayoría de los hongos, siguen siendo venenosos entre 4 y 6 de cada 10.

**Con muchos rasgos a la vez, casi sí**, pero porque eso ya es reconocer la especie, y en la naturaleza hay muchas más especies que en estos datos.

Y la frase de cierre: **ningún hongo silvestre es seguro por su aspecto.**

### Lo que aprendiste en el camino (útil para la reflexión final)

- **Un ejemplo no prueba una regla.** Hay que contar todos los casos y compararlos con la línea de base.
- **Los promedios esconden cosas.** El “blanco = 51 %” mezclaba grupos de 14 % y de 100 %.
- **Las señales fuertes suelen estar en grupos chicos.** Lo común es lo difícil.
- **Una relación fuerte no siempre es útil.** El sombrero y el tallo están muy relacionados, pero igual en los dos grupos.
- **Un modelo resume, pero tiene límites.** La curva de GeoGebra da probabilidades imposibles en los bordes.

### Si te preguntan…

**¿Por qué usaste datos simulados?** Porque es el único conjunto grande, ordenado y público con la respuesta comestible/venenoso. Respeta las características de 173 especies reales. El límite es que los porcentajes no reflejan cuán comunes son los hongos en la naturaleza.

**61 % contra 54 % en el anillo, ¿no es una diferencia?** Es una diferencia de 7 puntos, pero muy chica para tomar una decisión. Quien use esa regla acierta casi lo mismo que tirando una moneda.

**¿Por qué hay grupos con 0 % o 100 %?** Porque suelen ser grupos chicos que corresponden a una o dos especies. No son reglas generales.

**¿Por qué agrupaste de a 1 cm para GeoGebra?** Porque 61.069 puntos no se pueden leer. Cada grupo se resume en su promedio, y descarté los grupos con menos de 100 hongos.

**¿Por qué una curva logarítmica?** Porque los puntos bajan rápido y después se aplanan, que es la forma del logaritmo. Una recta seguiría bajando hasta dar probabilidades negativas.

**El 99,8 % del giro, ¿no contradice la conclusión?** No. Muestra que combinar muchos rasgos equivale a reconocer la especie. En estos datos hay 173; en la naturaleza hay miles.

---

## Mapa rápido del Excel

Para encontrar cada cosa rápido mientras repasás:

| Si querés ver… | Abrí la hoja… |
| --- | --- |
| El origen de los datos | Acerca de |
| Los datos, las fórmulas de traducción y de control | Data |
| Qué significa cada código | Diccionario |
| El anillo y la magulladura | Mitos - Anillo y Magulladura |
| Tamaño promedio por forma | Toxicidad - Tamaño y Forma |
| Porcentaje de venenosos por tamaño (diámetro, alto y grosor) | Toxicidad - Tamaño por Rangos |
| Sombrero vs. tallo (r, pendiente, R²) | Correlación Sombrero-Tallo |
| Color del sombrero, y color cruzado con forma | Toxicidad - Color y Forma |
| Color del tallo | Toxicidad - Color del Tallo |
| Textura del sombrero | Toxicidad - Superficie |
| Hábitat, estación y el filtro por estación | Toxicidad - Hábitat y Estación |
| Los puntos y comandos para GeoGebra | Datos GeoGebra |
| Ejemplo de detalle de una tabla dinámica | Detail1 |
