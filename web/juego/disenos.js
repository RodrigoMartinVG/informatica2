// Diseños de hongos hechos en el taller (taller.html).
// DISENOS: los que quedan en el juego para todos (pegá acá lo que exporta el taller).
// Los que se guardan en el navegador viven en localStorage y solo los ve quien los hizo.
export const DISENOS = [];

const KEY = 'bajo-el-sombrero:disenos';
export function loadLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveLocal(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ } }
// Todos los diseños que crecen en el bosque
export const planted = () => [...DISENOS, ...loadLocal().filter((d) => d.plant)];
