// Las 14 correlaciones del Excel (v5). Cada una se presenta en cinco capas:
// divulgación, papel en el hilo, construcción en Excel, matemática y precauciones.
// kind indica cómo se dibuja (ver renderCorr en app.js).

export const VEREDICTOS = {
  mito: 'Mito',
  debil: 'Pista débil',
  extremos: 'Señal en los extremos',
  tendencia: 'Tendencia',
  ruido: 'Sin patrón',
  interaccion: 'Depende de otro rasgo',
  relacion: 'Relación fuerte, no distingue'
};

// Bloques de matemática que se repiten
const M_PROP = `
  <p>Para cada categoría <i>c</i> se cuentan los hongos <i>N<sub>c</sub></i> y los venenosos <i>V<sub>c</sub></i>. Lo que muestra cada barra es una <b>probabilidad condicional</b>: la probabilidad de que un hongo sea venenoso <i>sabiendo</i> que tiene ese rasgo.</p>
  <div class="eq">p(c) = P(venenoso | c) = V<sub>c</sub> / N<sub>c</sub></div>
  <p>Para saber si el rasgo informa, se la compara con la probabilidad sin saber nada, que es 0,555. La distancia en puntos porcentuales es</p>
  <div class="eq">Δ(c) = p(c) − 0,555</div>
  <p>Hay una propiedad que explica por qué casi todo queda “cerca del promedio”: el 0,555 general es el <b>promedio ponderado</b> de las categorías, donde cada una pesa según su cantidad de hongos (ley de probabilidad total).</p>
  <div class="eq">0,555 = Σ (N<sub>c</sub> / N) · p(c)</div>
  <p>Si una categoría tiene muchos hongos, arrastra el promedio hacia ella y no puede alejarse mucho de él. Por eso los valores extremos aparecen casi siempre en grupos chicos.</p>`;

export const CORR = [
  /* ---------------- mitos ---------------- */
  {
    id: 'c1', cifra: '61 % con anillo · 54 % sin', chapter: 'excel', group: 'mitos', title: 'El anillo', sheet: 'Mitos - Anillo y Magulladura', kind: 'stack', dim: 'ring',
    question: '¿Sirve el anillo del tallo para reconocer un hongo venenoso?', verdict: 'mito',
    plain: `<p>El anillo es la “pollerita” que algunos hongos tienen en el tallo, resto de una membrana que cubría las láminas cuando eran jóvenes. Hay quienes dicen que los hongos con anillo son venenosos.</p>
      <p>En los datos, los hongos <b>con anillo</b> son venenosos en un <b>61 %</b> y los <b>sin anillo</b>, en un <b>54 %</b>. Saber que tiene anillo cambia la estimación apenas 5 puntos.</p>`,
    thread: `<p>Es la primera prueba del hilo y la regla popular más conocida. Si funcionara, la pregunta estaría casi resuelta. No funciona: tener anillo no permite decir nada útil sobre un hongo.</p>`,
    build: [
      'Columna derivada <code>has-ring Nombre</code>: <code>=SI(Y2="t";"Sí";"No")</code>, porque el dataset usa <code>t</code> (true) y <code>f</code> (false).',
      'Tabla dinámica: Filas = <code>has-ring Nombre</code>; Columnas = <code>Class por Nombre</code>; Valores = cuenta de <code>class</code>.',
      'Valores mostrados como <em>% del total de la fila</em>, para que cada fila sume 100 %.',
      'Celda de referencia con el 55,5 % de toda la muestra, para comparar.'
    ],
    math: M_PROP,
    caveat: `<p>Una diferencia de 7 puntos entre los dos grupos no es cero, pero es chica comparada con lo que haría falta para decidir. Además, “tener anillo” agrupa muchos tipos distintos (columna <code>ring-type</code>), que esta hoja no separa.</p>`
  },
  {
    id: 'c2', cifra: '53 % se magullan · 56 % no', chapter: 'excel', group: 'mitos', title: 'La magulladura', sheet: 'Mitos - Anillo y Magulladura', kind: 'stack', dim: 'bruise',
    question: '¿Es venenoso el hongo que cambia de color o “sangra” al cortarlo?', verdict: 'mito',
    plain: `<p>Algunos hongos se ponen azules, negros o rojizos al tocarlos o cortarlos, y otros sueltan un líquido. La creencia popular dice que eso indica veneno.</p>
      <p>Los que se magullan tienen <b>53 %</b> de venenosos y los que no, <b>56 %</b>: prácticamente lo mismo, y los dos pegados al promedio.</p>`,
    thread: `<p>Es el rasgo que menos informa de todo el trabajo. Junto con el anillo, descarta la idea de que exista una “señal” simple.</p>`,
    build: [
      'Columna derivada <code>does-bruise-or-bleed Nombre</code>: <code>=SI(N2="t";"Sí";"No")</code>.',
      'Tabla dinámica con la misma estructura que la del anillo, en la misma hoja.',
      'Gráfico de barras 100 % apiladas junto al del anillo, para comparar los dos mitos.'
    ],
    math: M_PROP,
    caveat: `<p>Que en estos datos no informe no quiere decir que el cambio de color no sirva para nada: en micología ayuda a identificar ciertas especies. Lo que muestra el dato es que, <em>por sí solo</em>, no dice si un hongo es venenoso.</p>`
  },

  /* ---------------- tamaño ---------------- */
  {
    id: 'c3', cifra: '7,8 cm comestibles · 5,9 cm venenosos', chapter: 'excel', group: 'tamano', title: 'Tamaño y forma', sheet: 'Toxicidad - Tamaño y Forma', kind: 'tamanoForma',
    question: '¿Los venenosos son más grandes o más chicos que los comestibles? ¿Depende de la forma del sombrero?', verdict: 'interaccion',
    plain: `<p>En general los comestibles son más grandes: su sombrero mide en promedio <b>7,8 cm</b>, contra <b>5,9 cm</b> en los venenosos. Pero depende de la forma: en los esféricos la diferencia es enorme (11,2 contra 5,8 cm), y en los de campana y los cónicos se invierte.</p>
      <p>La barra de “Otras” comestibles (25,2 cm) parece un error, pero no lo es: la inflan unos pocos hongos gigantes de alrededor de 50 cm.</p>`,
    thread: `<p>Es la primera vez que un rasgo muestra una diferencia real entre los grupos. Pero también aparece por primera vez algo que se repite en todo el trabajo: el efecto <b>depende de otro rasgo</b> (acá, la forma). Por eso la conclusión de una sola variable no alcanza.</p>`,
    build: [
      'Columna derivada <code>cap-shape Nombre</code>, con <code>SI</code> anidados sobre el código: <code>b</code> → Campana, <code>c</code> → Cónica, <code>x</code> → Convexa, <code>f</code> → Plana, <code>s</code> → Hundida, <code>p</code> → Esférica. Cualquier otro código va a “Otras”.',
      'Tabla dinámica: Filas = forma; Columnas = clase; Valores = <em>promedio</em> de <code>cap-diameter</code>.',
      'Control: la hoja <code>Detail1</code> es el <em>detalle</em> de una celda (doble clic en Cónica/Comestible) y lista los 774 hongos que forman ese promedio.'
    ],
    math: `<p>Cada barra es una media aritmética:</p>
      <div class="eq">x̄ = (x<sub>1</sub> + x<sub>2</sub> + … + x<sub>n</sub>) / n</div>
      <p>La media es sensible a los valores extremos: un hongo de 50 cm en un grupo de 825 sube la media en (50 − x̄) / 825 ≈ 0,05 cm, y unas decenas de gigantes alcanzan para llevar “Otras” comestibles a 25,2 cm. La <b>mediana</b> (el valor del medio) no se ve afectada:</p>
      <table class="mini"><tr><th></th><th>Media</th><th>Mediana</th></tr>
        <tr><td>Comestibles (todos)</td><td>7,80</td><td>6,71</td></tr><tr><td>Venenosos (todos)</td><td>5,88</td><td>4,98</td></tr>
        <tr><td>Otras · comestibles</td><td>25,22</td><td>8,91</td></tr></table>
      <p>Cuando la media está muy por encima de la mediana, la distribución tiene una “cola” hacia la derecha: unos pocos valores muy grandes.</p>`,
    caveat: `<p>Comparar promedios dice cómo es un grupo, no un hongo. En todas las formas hay venenosos grandes y comestibles chicos: la figura de rangos (correlación 4) lo muestra.</p>`
  },
  {
    id: 'c4', cifra: '80 % hasta 1 cm → 40 % desde 9 cm', chapter: 'excel', group: 'tamano', title: 'Diámetro del sombrero por rangos', sheet: 'Toxicidad - Tamaño por Rangos', kind: 'rango', key: 'diametro',
    question: '¿Cambia la proporción de venenosos a medida que el sombrero es más grande?', verdict: 'tendencia',
    plain: `<p>Agrupando los hongos de a 1 cm de sombrero aparece una tendencia clara: <b>cuanto más chico, más riesgo</b>. Hasta 4 cm, entre 65 % y 80 % son venenosos. Desde unos 9 cm la proporción baja a 40–50 % y se mantiene.</p>`,
    thread: `<p>Es la mejor pista que da una sola medida numérica, y es la base del Modelo 2 de GeoGebra (Etapa III). Pero ni en el mejor rango baja de 35 %: el tamaño mejora la estimación, pero no alcanza para decidir.</p>`,
    build: [
      'Columna derivada <code>toxico (1/0)</code>: <code>=SI(F2="p";1;0)</code>.',
      'Tabla dinámica: Filas = <code>cap-diameter</code>, <em>agrupado</em> (inicio 0, fin 25, intervalo 1); Valores = <em>promedio</em> de <code>toxico (1/0)</code>.',
      'Se ocultan los sombreros de 25 cm o más (396 hongos, casi todos de una especie gigante comestible).',
      'Gráfico de líneas con un punto por rango.'
    ],
    math: `<p>El truco de esta hoja es que el promedio de una variable que vale 0 o 1 es la proporción de unos:</p>
      <div class="eq">p = (t<sub>1</sub> + … + t<sub>n</sub>) / n, &nbsp; con t<sub>i</sub> = 1 si es venenoso y 0 si no</div>
      <p>Cada punto es una estimación, y su precisión depende de cuántos hongos tiene el grupo. Una medida simple es el <b>error estándar</b> de una proporción:</p>
      <div class="eq">EE = √( p · (1 − p) / n )</div>
      <p>Aproximadamente, el valor real está a menos de 2·EE del calculado. El rango de 3 a 4 cm (8.080 hongos) tiene un margen de ±1 punto, y el de 24 a 25 cm (32 hongos), de ±17 puntos. Por eso los últimos puntos “saltan”. La tabla muestra el margen de cada rango.</p>`,
    caveat: `<p>Los saltos no son solo ruido. Como los datos salen de 173 especies, cada especie llena su propio rango de tamaños: un pico puede ser una sola especie.</p>`
  },
  {
    id: 'c5', cifra: 'Entre 43 % y 74 %, sin orden', chapter: 'excel', group: 'tamano', title: 'Alto del tallo por rangos', sheet: 'Toxicidad - Tamaño por Rangos', kind: 'rango', key: 'alto',
    question: '¿Los hongos de tallo más alto son más o menos venenosos?', verdict: 'ruido',
    plain: `<p>El alto del tallo <b>no sigue una regla</b>: la proporción sube y baja entre 43 % y 74 % sin un orden. La única zona clara es la de los tallos de más de 19 cm, que son casi todos comestibles.</p>`,
    thread: `<p>Funciona como contraste: no toda medida “grande o chica” informa. Lo que parece una regla en el extremo (tallos altos, comestibles) es, muy probablemente, una sola especie.</p>`,
    build: [
      'Tabla dinámica con la misma estructura que la del diámetro, pero agrupando <code>stem-height</code> de a 1 cm.',
      'Filtro de página: <code>Con tallo = Sí</code> (<code>=SI(S2&gt;0;"Sí";"No")</code>). Los hongos sin tallo tienen alto 0 y distorsionarían el primer rango.',
      'Se ocultan los tallos de 25 cm o más.'
    ],
    math: `<p>Es la misma proporción por grupos (promedio de un indicador 0/1). Para decir que hay una <b>tendencia</b>, la curva tendría que ser aproximadamente <b>monótona</b>: siempre subir o siempre bajar. Acá cambia de dirección varias veces (baja hasta 7 cm, sube hasta 12 cm, baja otra vez), así que no se puede resumir con una función simple.</p>
      <p>Los rangos de 0 a 2 cm dan 100 %, pero son muy pocos hongos: con <i>n</i> chico, el margen 2·√(p(1−p)/n) es grande.</p>`,
    caveat: `<p>Sin la cantidad de hongos por rango no se puede saber cuánto pesa cada punto. Conviene leer el gráfico como una forma general, no punto por punto.</p>`
  },
  {
    id: 'c6', cifra: 'Baja a 20 % y sube a 80 %', chapter: 'excel', group: 'tamano', title: 'Grosor del tallo por rangos', sheet: 'Toxicidad - Tamaño por Rangos', kind: 'rango', key: 'grosor',
    question: '¿Un tallo más grueso indica algo sobre la toxicidad?', verdict: 'ruido',
    plain: `<p>La proporción de venenosos <b>baja hasta 20 %</b> cerca de los 21 mm de grosor y después <b>vuelve a subir hasta 80 %</b> cerca de los 31 mm. Tiene forma de “U”: ni grueso es seguro ni fino es peligroso.</p>`,
    thread: `<p>Muestra que una relación puede existir sin ser una regla útil. Con el grosor se podría decir “entre 18 y 24 mm hay menos riesgo”, pero no hay una dirección simple.</p>`,
    build: [
      'Tabla dinámica que agrupa <code>stem-width</code> de a 2 mm, con valores = promedio de <code>toxico (1/0)</code>.',
      'Filtro <code>Con tallo = Sí</code>. Se ocultan los tallos de 50 mm o más.'
    ],
    math: `<p>Una curva en “U” no es monótona. Si se le ajustara una recta, la pendiente quedaría cerca de 0 aunque la relación sea fuerte en algunos tramos. Es un ejemplo de que el coeficiente de correlación lineal (<i>r</i>) solo detecta relaciones en línea recta: una relación curva puede tener <i>r</i> ≈ 0.</p>`,
    caveat: `<p>El grosor también depende del diámetro del sombrero (correlación 7). Parte de lo que se ve acá es el efecto del tamaño general del hongo, no del tallo en sí.</p>`
  },
  {
    id: 'c7', cifra: 'r = 0,76 · 1,8 mm por cm', chapter: 'excel', group: 'tamano', title: 'Sombrero y tallo', sheet: 'Correlación Sombrero-Tallo', kind: 'corrST',
    question: '¿Los hongos con sombrero más grande tienen el tallo más grueso? ¿Pasa lo mismo en venenosos y comestibles?', verdict: 'relacion',
    plain: `<p>Sí, y mucho: <b>por cada centímetro más de sombrero, el tallo es 1,8 mm más grueso</b>. Un hongo grande es grande “en todo”.</p>
      <p>Pero la proporción es casi idéntica en los dos grupos: 1,83 mm por cm en los venenosos y 1,79 en los comestibles. Las dos líneas del gráfico van casi juntas.</p>`,
    thread: `<p>Es la relación más fuerte del Excel, y justamente por eso es importante para el hilo: dos medidas pueden estar muy relacionadas sin que eso sirva para distinguir. La forma del hongo no delata su toxicidad. Es la base del Modelo 1 de GeoGebra.</p>`,
    build: [
      'Tabla dinámica: Filas = <code>cap-diameter</code> agrupado de a 1 cm; Columnas = clase; Valores = promedio de <code>stem-width</code>.',
      'Filtro <code>Con tallo = Sí</code>; se ocultan los sombreros de 25 cm o más.',
      'Tabla aparte con <i>r</i>, pendiente, ordenada al origen y <i>R</i>² para todos, venenosos y comestibles, con y sin los sombreros gigantes.',
      'En Excel se pueden obtener con <code>COEF.DE.CORREL</code>, <code>PENDIENTE</code>, <code>INTERSECCION.EJE</code> y <code>COEFICIENTE.R2</code>.'
    ],
    math: `<p>El <b>coeficiente de correlación</b> mide qué tan alineados están los puntos (<i>x</i> = diámetro, <i>y</i> = grosor). Va de −1 a 1: 0 es ninguna relación lineal y ±1 es una recta perfecta.</p>
      <div class="eq">r = Σ (x − x̄)(y − ȳ) / √( Σ (x − x̄)² · Σ (y − ȳ)² )</div>
      <p>La recta de mínimos cuadrados <i>y</i> = <i>m</i>·<i>x</i> + <i>b</i> se obtiene a partir de <i>r</i> y de los desvíos estándar <i>s</i>:</p>
      <div class="eq">m = r · s<sub>y</sub> / s<sub>x</sub> &nbsp;&nbsp;&nbsp; b = ȳ − m · x̄</div>
      <p><i>R</i>² = <i>r</i>² es la parte de la variación del grosor que explica la recta: 0,764² ≈ 0,58, es decir, un 58 %. El resto depende de otras cosas, como la especie.</p>
      <p>La pendiente es sensible a los extremos. Si se agregan los 396 sombreros gigantes (≥ 25 cm), casi todos comestibles, la pendiente de los comestibles cae de 1,79 a 1,03: unos pocos puntos muy lejanos “tiran” de la recta.</p>`,
    caveat: `<p>Correlación no es causa, y tampoco es clasificación: que <i>r</i> sea alto no ayuda a distinguir, porque los dos grupos siguen la misma recta.</p>`
  },

  /* ---------------- color y textura ---------------- */
  {
    id: 'c8', cifra: 'Verde 89 % · Crema 21 %', chapter: 'excel', group: 'color', title: 'Color del sombrero', sheet: 'Toxicidad - Color y Forma (tabla derecha)', kind: 'stack', dim: 'capColor',
    question: '¿Los hongos venenosos predominan en algún color?', verdict: 'extremos',
    plain: `<p>Los colores llamativos concentran venenosos: <b>verde (89 %)</b>, rojo (78 %), rosa (74 %) y naranja (71 %). Pero los colores más comunes (marrón, blanco y gris) quedan casi en la mitad, y son la gran mayoría.</p>
      <p>El único color con clara mayoría de comestibles es el crema, y aun así <b>1 de cada 5 es venenoso</b>.</p>`,
    thread: `<p>Confirma la intuición de que lo llamativo es peligroso, pero muestra que esa señal sirve para pocos hongos. El 40 % de la muestra es marrón, y ahí el color no dice nada.</p>`,
    build: [
      'Columna derivada <code>cap-color Nombre</code>: una fórmula matricial busca el código en el diccionario (<code>n</code> → Marrón, <code>e</code> → Rojo, <code>b</code> → Crema…).',
      'Tabla dinámica: Filas = color; Columnas = clase; Valores = cuenta, como <em>% del total de la fila</em>.',
      'Ordenada de mayor a menor proporción de venenosos.'
    ],
    math: M_PROP,
    caveat: `<p>El porcentaje de cada color es un promedio de formas muy distintas. Por ejemplo, “blanco = 51 %” mezcla blancos esféricos (14 %) con blancos cónicos (100 %). La correlación 14 lo muestra.</p>`
  },
  {
    id: 'c9', cifra: 'Sin tallo 100 % · Blanco 43 %', chapter: 'excel', group: 'color', title: 'Color del tallo', sheet: 'Toxicidad - Color del Tallo', kind: 'stack', dim: 'stemColor',
    question: '¿El color del tallo ayuda a distinguir un hongo venenoso de uno comestible?', verdict: 'extremos',
    plain: `<p>Es la característica que más diferencia muestra entre los grupos. Los hongos <b>sin tallo son todos venenosos</b>, y los tallos rosa (87 %), verde (79 %), negro (77 %) y rojo (74 %) también concentran venenosos.</p>
      <p>Pero el tallo blanco, el más común (casi 23.000 hongos), tiene <b>43 %</b>: 4 de cada 10 son venenosos.</p>`,
    thread: `<p>Es la mejor variable cualitativa del Excel, y aun así deja a la mayoría de los hongos en zona de duda. Señala el límite de mirar de a un rasgo por vez.</p>`,
    build: [
      'Columna derivada con <code>SI.CONJUNTO</code>: <code>=SI.CONJUNTO(V2="n";"Marrón"; …; V2="f";"Ninguno (sin tallo)"; VERDADERO;"Sin dato")</code>.',
      'El código <code>f</code> corresponde a los hongos sin tallo (grosor 0).',
      'Tabla dinámica: Filas = color del tallo; Columnas = clase; % del total de la fila; ordenada.'
    ],
    math: M_PROP,
    caveat: `<p>Los extremos son grupos chicos: 1.059 hongos sin tallo y solo 173 de tallo crema (100 % comestibles). Un 0 % o un 100 % en un grupo chico suele ser una o dos especies, no una regla.</p>`
  },
  {
    id: 'c10', cifra: 'Sedosa 92 % · Lisa 43 %', chapter: 'excel', group: 'color', title: 'Superficie del sombrero', sheet: 'Toxicidad - Superficie', kind: 'stack', dim: 'surface',
    question: '¿La textura del sombrero (lisa, sedosa, escamosa…) se asocia con la toxicidad?', verdict: 'extremos',
    plain: `<p>Las superficies <b>sedosa (92 %)</b> y <b>fibrosa (83 %)</b> son casi siempre venenosas: es la señal de alarma más fuerte entre los rasgos comunes. La lisa tiene 43 %, así que ser liso no garantiza nada.</p>`,
    thread: `<p>Agrega una señal fuerte y además táctil, algo que retoman las conclusiones, en la parte sobre personas ciegas. Pero el 23 % de la muestra no tiene la superficie cargada, y en ese grupo no hay información.</p>`,
    build: [
      'Columna derivada con <code>SI.CONJUNTO</code> sobre <code>cap-surface</code>: <code>i</code> → Fibrosa, <code>k</code> → Sedosa, <code>s</code> → Lisa…',
      'Las celdas vacías pasan a “Sin dato” por la rama <code>VERDADERO</code>. El código <code>d</code>, que la fuente no documenta, se deja aparte.',
      'Tabla dinámica: Filas = superficie; Columnas = clase; % del total de la fila.'
    ],
    math: M_PROP + `<p>Un detalle sobre los datos faltantes: “Sin dato” (52,5 %) queda casi en el promedio. Eso sugiere que las celdas vacías están repartidas entre venenosos y comestibles sin un sesgo fuerte.</p>`,
    caveat: `<p>“d” es un código que aparece en 4.432 hongos sin explicación en la fuente. Se muestra, pero no se interpreta.</p>`
  },

  /* ---------------- contexto ---------------- */
  {
    id: 'c11', cifra: 'Bosque 54 % (72 % de la muestra)', chapter: 'excel', group: 'contexto', title: 'Hábitat', sheet: 'Toxicidad - Hábitat y Estación', kind: 'stack', dim: 'habitat',
    question: '¿Hay lugares donde predominan los hongos venenosos?', verdict: 'extremos',
    plain: `<p>Los hongos que crecen en <b>caminos</b> son todos venenosos y los de zonas <b>urbanas</b> y <b>desechos</b>, todos comestibles, pero son grupos chicos. Lo importante está en el <b>bosque</b>: ahí crece el 72 % de la muestra, con 54 % de venenosos, casi el promedio exacto.</p>`,
    thread: `<p>El hábitat no es parte del aspecto, pero quien encuentra un hongo lo conoce. Aun así, justo donde más se buscan hongos, el lugar no ayuda.</p>`,
    build: [
      'Columna derivada con <code>SI.CONJUNTO</code> sobre <code>habitat</code>: <code>d</code> → Bosques, <code>g</code> → Pastos, <code>l</code> → Hojas, <code>m</code> → Prados, <code>h</code> → Matorrales, <code>p</code> → Caminos, <code>u</code> → Urbano, <code>w</code> → Desechos.',
      'Tabla dinámica: Filas = hábitat; Columnas = clase; % del total de la fila; ordenada.'
    ],
    math: M_PROP,
    caveat: `<p>Que los urbanos sean 100 % comestibles con 115 hongos no permite generalizar: probablemente sea una sola especie.</p>`
  },
  {
    id: 'c12', cifra: 'Verano 58 % · Invierno 39 %', chapter: 'excel', group: 'contexto', title: 'Estación', sheet: 'Toxicidad - Hábitat y Estación', kind: 'stack', dim: 'season',
    question: '¿Hay épocas del año donde predominan los hongos venenosos?', verdict: 'debil',
    plain: `<p>En <b>verano y otoño</b> hay más venenosos (58 %) que en <b>primavera</b> (43 %) e <b>invierno</b> (39 %). La diferencia es de unos 15 puntos.</p>`,
    thread: `<p>Es una pista débil pero coherente: cambia el riesgo general de una salida al campo, aunque no permite decidir sobre un hongo en particular.</p>`,
    build: [
      'Columna derivada con <code>SI.CONJUNTO</code> sobre <code>season</code>: <code>s</code> → Primavera, <code>u</code> → Verano, <code>a</code> → Otoño, <code>w</code> → Invierno.',
      'Segunda tabla dinámica en la misma hoja: Filas = estación; Columnas = clase; % del total de la fila.'
    ],
    math: M_PROP + `<p>Acá el promedio ponderado se ve muy claro: otoño (30.177 hongos) y verano (22.898) son el 87 % de la muestra, y por eso el 55,5 % general queda cerca de sus valores (58 %).</p>`,
    caveat: `<p>Los datos no tienen fechas: “estación” es un rasgo asignado a cada especie, no una fecha de recolección.</p>`
  },
  {
    id: 'c13', cifra: 'Pastos: 30 % en invierno → 75 % en verano', chapter: 'excel', group: 'contexto', title: 'Hábitat según la estación', sheet: 'Toxicidad - Hábitat y Estación (segmentación)', kind: 'heat', rows: 'habitat', cols: 'season',
    question: '¿El efecto del hábitat cambia según la época del año?', verdict: 'interaccion',
    plain: `<p>Sí, en algunos lugares bastante. En <b>pastos</b>, los venenosos pasan de 30 % en invierno a 75 % en verano. En <b>hojas</b>, de 21 % en invierno a 53 % en verano. En el <b>bosque</b>, en cambio, se mueven poco: entre 42 % y 57 %.</p>`,
    thread: `<p>Es el primer cruce de dos rasgos en el Excel: el efecto de uno <b>depende</b> del otro. Anticipa la idea de la Etapa II: combinando rasgos los grupos se separan más.</p>`,
    build: [
      'Sobre la tabla dinámica de hábitat se agregó una <em>segmentación de datos</em> (“Filtrar hábitat por estación”) conectada al campo <code>season Nombre</code>.',
      'Al hacer clic en una estación, la tabla y su gráfico se recalculan solo con los hongos de esa estación. Para volver, se borra el filtro.',
      'Esta página muestra las cuatro estaciones a la vez, como una tabla de doble entrada.'
    ],
    math: `<p>Cada celda es una probabilidad condicionada por dos rasgos a la vez:</p>
      <div class="eq">p(h, e) = P(venenoso | hábitat = h y estación = e)</div>
      <p>Si los dos rasgos actuaran por separado, sin <b>interacción</b>, la diferencia entre estaciones sería parecida en todos los hábitats. No lo es: en pastos la diferencia entre invierno y verano es de 45 puntos, y en bosques, de 10. Cuando el efecto de un rasgo cambia según el valor de otro, se dice que hay interacción.</p>`,
    caveat: `<p>Varias celdas están vacías (no hay hongos de caminos en invierno, por ejemplo) y otras tienen menos de 50 hongos. Pasá el cursor por cada celda para ver la cantidad.</p>`
  },

  /* ---------------- combinar ---------------- */
  {
    id: 'c14', cifra: 'Blancos esféricos 14 % · cónicos 100 %', chapter: 'resultados', group: 'combinar', title: 'Color y forma', sheet: 'Toxicidad - Color y Forma (tabla izquierda)', kind: 'heat', rows: 'capColor', cols: 'shape',
    question: '¿El riesgo de un color depende de la forma del sombrero?', verdict: 'interaccion',
    plain: `<p>Dentro de un mismo color, la forma cambia todo. Los <b>blancos esféricos</b> tienen 14 % de venenosos y los <b>blancos cónicos</b>, 100 %. Los marrones cónicos tienen 10 % y los marrones de campana, 78 %.</p>`,
    thread: `<p>Es la bisagra del relato. Combinando dos rasgos, muchas celdas se acercan a 0 % o a 100 %. Si con dos rasgos pasa eso, ¿qué pasa con todos? La respuesta está en la figura 2, más abajo.</p>`,
    build: [
      'Tabla dinámica con <b>dos campos en filas</b>: <code>cap-color Nombre</code> y, anidado, <code>cap-shape Nombre</code>. Columnas = clase; % del total de la fila.',
      'Excel muestra un subtotal por color (“Total Amarillo”, “Total Azul”…), que coincide con la correlación 8.',
      'Esta página muestra la misma información como mapa de calor: filas = color, columnas = forma.'
    ],
    math: `<p>El total de un color es el promedio ponderado de sus formas:</p>
      <div class="eq">p(color) = Σ<sub>forma</sub> (N<sub>color, forma</sub> / N<sub>color</sub>) · p(color, forma)</div>
      <p id="c14-example"></p>
      <p>Por eso un total “cerca del 50 %” puede esconder grupos de 0 % y de 100 %. Pasa lo mismo en todo el Excel: los promedios de una variable mezclan subgrupos muy distintos.</p>`,
    caveat: `<p>Al cruzar dos rasgos hay 66 combinaciones con hongos, y muchas son chicas. Una celda de 100 % con 40 hongos dice mucho menos que una de 60 % con 10.000.</p>`
  }
];
