// Datos de la investigación, tomados de las hojas de análisis de v5_Hongos_DataSet_Rodrigo_Vidal.xlsx.
// Proporciones = parte de venenosos (0 a 1), salvo que se indique otra cosa.
window.RESEARCH = {
  stats: { registros: 61069, variables: 21, especies: 173, toxicos: 0.555, venenosos: 33888, comestibles: 27181, duplicados: 146 },

  // Porcentaje de celdas vacías por columna en la hoja Data
  faltantes: [
    ["Tipo de velo (veil-type)", 94.8], ["Color de esporas (spore-print-color)", 89.6], ["Color del velo (veil-color)", 87.9],
    ["Raíz del tallo (stem-root)", 84.4], ["Superficie del tallo (stem-surface)", 62.4], ["Espaciado de láminas (gill-spacing)", 41.0],
    ["Superficie del sombrero (cap-surface)", 23.1], ["Inserción de láminas (gill-attachment)", 16.2], ["Tipo de anillo (ring-type)", 4.0]
  ],

  // Hoja "Toxicidad - Tamaño y Forma": promedio de cap-diameter (cm)
  tamanoForma: {
    formas: ["Campana", "Cónica", "Convexa", "Esférica", "Hundida", "Plana", "Otras"],
    comestible: [3.45, 3.079, 7.091, 11.214, 7.806, 7.575, 25.221],
    venenoso: [3.677, 4.285, 6.274, 5.825, 7.138, 6.417, 4.891]
  },

  rasgos: {
    ring: { titulo: "¿Tiene anillo?", datos: { "Con anillo": 0.605, "Sin anillo": 0.538 } },
    bruise: { titulo: "¿Se magulla o «sangra»?", datos: { "Se magulla": 0.533, "No se magulla": 0.559 } },
    capColor: { titulo: "Color del sombrero", datos: { Verde: 0.889, Rojo: 0.782, Rosa: 0.736, Naranja: 0.707, Púrpura: 0.642, Negro: 0.608, Amarillo: 0.58, Blanco: 0.511, Marrón: 0.488, Gris: 0.48, Azul: 0.454, Crema: 0.208 } },
    stemColor: { titulo: "Color del tallo", datos: { "Sin tallo": 1, Rosa: 0.871, Verde: 0.79, Negro: 0.774, Rojo: 0.738, Amarillo: 0.683, Púrpura: 0.642, Naranja: 0.608, Marrón: 0.595, Azul: 0.535, Blanco: 0.427, Gris: 0.393, Crema: 0 } },
    surface: { titulo: "Superficie del sombrero", datos: { Sedosa: 0.921, Fibrosa: 0.834, Pegajosa: 0.656, Arrugada: 0.599, "Con surcos": 0.584, "d (sin doc.)": 0.538, "Sin dato": 0.525, Carnosa: 0.522, Coriácea: 0.5, Escamosa: 0.475, Brillante: 0.474, Lisa: 0.43 } },
    habitat: { titulo: "Hábitat", datos: { Caminos: 1, Pastos: 0.687, Matorrales: 0.652, Bosques: 0.544, Prados: 0.511, Hojas: 0.388, Desechos: 0, Urbano: 0 } },
    season: { titulo: "Estación", datos: { Verano: 0.579, Otoño: 0.576, Primavera: 0.431, Invierno: 0.393 } }
  },

  // Hoja "Toxicidad - Tamaño por Rangos"
  rangos: {
    diametro: { label: "Diámetro del sombrero (cm)", x: ["0-1","1-2","2-3","3-4","4-5","5-6","6-7","7-8","8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16","16-17","17-18","18-19","19-20","20-21","21-22","22-23","23-24","24-25"], y: [0.795,0.668,0.768,0.647,0.556,0.524,0.482,0.518,0.499,0.434,0.401,0.415,0.513,0.536,0.471,0.461,0.481,0.467,0.371,0.418,0.349,0.46,0.489,0.449,0.625] },
    alto: { label: "Alto del tallo (cm)", x: ["0-1","1-2","2-3","3-4","4-5","5-6","6-7","7-8","8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16","16-17","17-18","18-19","19-20","20-21","21-22","22-23","23-24","24-25"], y: [1,1,0.679,0.739,0.575,0.512,0.43,0.452,0.528,0.569,0.687,0.71,0.58,0.629,0.574,0.494,0.524,0.574,0.495,0.168,0.013,0,0,0,0] },
    grosor: { label: "Grosor del tallo (mm)", x: ["0-2","2-4","4-6","6-8","8-10","10-12","12-14","14-16","16-18","18-20","20-22","22-24","24-26","26-28","28-30","30-32","32-34","34-36","36-38","38-40","40-42","42-44","44-46","46-48","48-50"], y: [0.649,0.734,0.666,0.652,0.497,0.473,0.48,0.519,0.457,0.324,0.203,0.257,0.397,0.535,0.735,0.805,0.679,0.503,0.498,0.633,0.577,0.564,0.484,0.4,0.438] }
  },

  // Hoja "Datos GeoGebra"
  modelo1: {
    todos: [[0.5,1.18],[1.5,2.40],[2.5,4.69],[3.5,6.56],[4.5,8.87],[5.5,10.94],[6.5,12.17],[7.5,14.06],[8.5,16.22],[9.5,18.05],[10.5,20.39],[11.5,21.47],[12.5,21.80],[13.5,22.38],[14.5,24.28],[15.5,24.71],[16.5,28.24],[17.5,32.21],[18.5,35.63],[19.5,35.18],[20.5,40.56],[21.5,43.43]],
    venenosos: [[0.5,1.18],[1.5,2.61],[2.5,4.60],[3.5,6.27],[4.5,8.08],[5.5,9.58],[6.5,11.07],[7.5,13.10],[8.5,15.43],[9.5,18.01],[10.5,21.63],[11.5,22.77],[12.5,21.69],[13.5,22.60],[14.5,25.65],[15.5,27.00],[16.5,28.25],[17.5,31.07],[18.5,34.08],[19.5,35.62]],
    comestibles: [[0.5,1.19],[1.5,1.98],[2.5,4.97],[3.5,7.04],[4.5,9.77],[5.5,12.38],[6.5,13.18],[7.5,15.10],[8.5,17.02],[9.5,18.08],[10.5,19.55],[11.5,20.56],[12.5,21.93],[13.5,22.13],[14.5,23.06],[15.5,22.75],[16.5,28.23],[17.5,33.21],[18.5,36.54],[19.5,34.87],[20.5,42.01]],
    // Hoja "Correlación Sombrero-Tallo" (sobre los hongos individuales)
    individual: {
      sinGigantes: { todos: { r: 0.764, m: 1.83, b: 0.278, r2: 0.584, n: 59614 }, venenosos: { r: 0.84, m: 1.828, b: -0.155, r2: 0.706, n: 32808 }, comestibles: { r: 0.684, m: 1.789, b: 1.111, r2: 0.468, n: 26806 } },
      conGigantes: { todos: { r: 0.695, m: 1.311, b: 3.471, r2: 0.482, n: 60010 }, venenosos: { r: 0.842, m: 1.825, b: -0.143, r2: 0.709, n: 32829 }, comestibles: { r: 0.597, m: 1.034, b: 6.296, r2: 0.356, n: 27181 } }
    }
  },
  // Hoja "Datos GeoGebra", tabla del Modelo 1 completa: grosor promedio del tallo (mm) por cm de sombrero y por clase
  corrST: {
    x: [0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.5,14.5,15.5,16.5,17.5,18.5,19.5,20.5,21.5,22.5,23.5,24.5],
    com: [1.191,1.978,4.965,7.044,9.77,12.377,13.178,15.102,17.018,18.076,19.555,20.56,21.927,22.13,23.063,22.75,28.235,33.209,36.536,34.867,42.011,46.958,51.467,59.413,58.719],
    ven: [1.178,2.613,4.6,6.275,8.077,9.58,11.073,13.095,15.428,18.015,21.635,22.766,21.688,22.603,25.652,27.004,28.253,31.065,34.084,35.624,37.843,39.291,40.633,45.835,44.399],
    nCom: [364,1529,1120,2856,2854,2643,3107,2811,2283,1839,1474,1021,579,410,389,363,269,233,219,167,123,67,47,27,12],
    nVen: [1413,3081,3503,4790,3263,2810,2875,3026,2276,1409,988,723,610,473,346,310,249,204,129,120,66,57,45,22,20]
  },
  modelo2: [[0.5,0.795],[1.5,0.668],[2.5,0.768],[3.5,0.647],[4.5,0.556],[5.5,0.524],[6.5,0.482],[7.5,0.518],[8.5,0.499],[9.5,0.434],[10.5,0.401],[11.5,0.415],[12.5,0.513],[13.5,0.536],[14.5,0.471],[15.5,0.461],[16.5,0.481],[17.5,0.467],[18.5,0.371],[19.5,0.418],[20.5,0.349],[21.5,0.460]],
  modelo2n: [1777,4611,4819,8080,6432,5553,5995,5837,4559,3248,2462,1744,1189,883,735,673,518,437,348,287,189,124],

  // Agregando columnas a las filas de una tabla dinámica: parte de los hongos que quedan en grupos
  // 100 % comestibles o 100 % venenosos (calculado sobre la hoja Data).
  progresion: [
    { paso: "Forma del sombrero", grupos: 7, puros: 0.0 },
    { paso: "+ Color del sombrero", grupos: 66, puros: 6.7 },
    { paso: "+ Color del tallo", grupos: 274, puros: 23.7 },
    { paso: "+ Superficie del sombrero", grupos: 704, puros: 63.8 },
    { paso: "+ Anillo y magulladura", grupos: 818, puros: 80.0 },
    { paso: "+ Láminas (3 rasgos)", grupos: 1788, puros: 98.0 },
    { paso: "+ Resto (6 rasgos)", grupos: 2023, puros: 99.8 }
  ],
  // Misma cuenta separando rasgos que se perciben al tacto y rasgos que solo se ven
  sentidos: [
    { set: "Solo colores (sombrero, tallo, láminas)", tipo: "visual", grupos: 361, puros: 28.2 },
    { set: "Colores + magulladura", tipo: "visual", grupos: 424, puros: 35.3 },
    { set: "Forma, superficie, tamaño y anillo", tipo: "tactil", grupos: 419, puros: 38.0 },
    { set: "+ superficie y raíz del tallo, espaciado de láminas", tipo: "tactil", grupos: 895, puros: 85.6 }
  ],

  // Las seis formas con tallo. Colores = el más frecuente en los datos (marrón y tallo blanco en las seis).
  arquetipos: [
    { id: "convexa", nombre: "Convexa", codigo: "x", pct: 44.10, n: 26934, ven: 51.9, cap: 6.67, alto: 6.84, grosor: 12.41, anillo: 28.3,
      colorCap: "Marrón 42,5 % · Amarillo 16,4 %", colorTallo: "Blanco 35,8 % · Marrón 31,2 %", superficie: "Lisa / pegajosa",
      fill: "#8a6446", tallo: "#ece6da", generos: "Agaricus, Boletus", primitiva: "Semiesfera achatada" },
    { id: "plana", nombre: "Plana", codigo: "f", pct: 21.95, n: 13404, ven: 51.5, cap: 6.98, alto: 6.60, grosor: 11.71, anillo: 20.0,
      colorCap: "Marrón 32,8 % · Blanco 12,0 %", colorTallo: "Blanco 43,1 % · Marrón 28,3 %", superficie: "Lisa / escamosa",
      fill: "#9a7656", tallo: "#efeae0", generos: "Russula, Agrocybe", primitiva: "Disco biselado" },
    { id: "hundida", nombre: "Hundida", codigo: "s", pct: 11.73, n: 7164, ven: 54.0, cap: 7.45, alto: 5.53, grosor: 14.03, anillo: 12.1,
      colorCap: "Marrón 31,7 % · Blanco 14,7 %", colorTallo: "Blanco 35,9 % · Marrón 23,8 %", superficie: "Pegajosa",
      fill: "#a07a52", tallo: "#ebe3d4", generos: "Lactarius, Clitocybe", primitiva: "Cono invertido − esfera" },
    { id: "campana", nombre: "Campana", codigo: "b", pct: 9.32, n: 5694, ven: 77.9, cap: 3.63, alto: 6.76, grosor: 5.29, anillo: 32.4,
      colorCap: "Marrón 48,1 % · Blanco 14,9 %", colorTallo: "Blanco 38,4 % · Marrón 29,8 %", superficie: "Escamosa / con surcos",
      fill: "#7b5d45", tallo: "#e9e2d5", generos: "Mycena, Panaeolus, Galerina", primitiva: "Paraboloide" },
    { id: "esferica", nombre: "Esférica", codigo: "p", pct: 4.25, n: 2598, ven: 39.7, cap: 9.08, alto: 11.14, grosor: 19.03, anillo: 55.8,
      colorCap: "Marrón 60,3 % · Blanco 22,7 %", colorTallo: "Blanco 58,7 % · Marrón 24,3 %", superficie: "Escamosa",
      fill: "#86603f", tallo: "#f0ece4", generos: "Amanita (tipo), Boletus", primitiva: "Esfera truncada + anillo" },
    { id: "conica", nombre: "Cónica", codigo: "c", pct: 2.97, n: 1815, ven: 57.4, cap: 3.77, alto: 6.41, grosor: 7.40, anillo: 0,
      colorCap: "Marrón 40,1 % · Amarillo 34,4 %", colorTallo: "Blanco 47,7 % · Gris 19,4 %", superficie: "Con surcos / fibrosa",
      fill: "#8f6a3e", tallo: "#ebe6db", generos: "Hygrocybe, Conocybe", primitiva: "Cono" }
  ],

  // Revisión de las imágenes generadas con IA contra los datos.
  // proporción = alto del tallo / diámetro del sombrero (medida aproximada sobre la imagen)
  revision: [
    { id: "convexa", veredicto: "ok", color: "Marrón, tallo blanco: coincide.", propImg: 0.8, propDato: 1.03, nota: "Tallo apenas más corto que el promedio." },
    { id: "plana", veredicto: "ok", color: "Marrón claro, tallo blanco: coincide.", propImg: 0.62, propDato: 0.95, nota: "El tallo se ve un tercio más corto que en los datos." },
    { id: "hundida", veredicto: "aceptable", color: "Ocre amarillento: el amarillo es el 3.º color (13,8 %); el más común es el marrón.", propImg: 0.62, propDato: 0.74, nota: "Proporción razonable." },
    { id: "campana", veredicto: "corregir", color: "Marrón: coincide.", propImg: 2.7, propDato: 1.86, nota: "El tallo está exagerado: casi el triple del sombrero, cuando en los datos no llega al doble." },
    { id: "esferica", veredicto: "corregir", color: "Rojo anaranjado: en los datos el 60 % de las esféricas son marrones y el rojo es minoritario.", propImg: 1.1, propDato: 1.23, nota: "Tiene además un artefacto: una banda blanca punteada que atraviesa el sombrero." },
    { id: "conica", veredicto: "aceptable", color: "Amarillo: es el 2.º color (34,4 %), detrás del marrón (40,1 %).", propImg: 1.8, propDato: 1.70, nota: "Proporción correcta." }
  ]
};
