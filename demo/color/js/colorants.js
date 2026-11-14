/**
 * Набор колорантов (пигментов/паст) и их «сила» в L*a*b*.
 * dL/dA/dB — на сколько меняется цвет при добавлении 1 % колоранта от массы базы.
 * ВАЖНО: стартовые значения — ориентировочные. Откалибруйте под ваши материалы
 * (блок «Обучение по пробной добавке»).
 */
const COLORANTS_KEY = 'asv_colorants_v1';

const DEFAULT_COLORANTS = [
  { id: 'white',  name: 'Белый',    css: '#f5f5f5', on: true, dL:  4.0, dA: -0.2, dB: -0.8 },
  { id: 'black',  name: 'Чёрный',   css: '#111111', on: true, dL: -6.0, dA:  0.0, dB: -0.3 },
  { id: 'red',    name: 'Красный',  css: '#d62828', on: true, dL: -0.8, dA:  5.0, dB:  2.0 },
  { id: 'yellow', name: 'Жёлтый',   css: '#f4c20d', on: true, dL:  0.3, dA: -0.5, dB:  7.0 },
  { id: 'blue',   name: 'Синий',    css: '#1d4ed8', on: true, dL: -1.5, dA: -0.5, dB: -6.0 },
  { id: 'green',  name: 'Зелёный',  css: '#16a34a', on: true, dL: -1.0, dA: -5.0, dB: -1.0 },
  // Основа без пигмента: добавление разбавляет цвет (падает насыщенность). Здесь dL/dA/dB — это L*a*b* САМОЙ основы.
  { id: 'base',   name: 'Основа (разбавление)', css: '#e9e6dc', on: false, dL: 92, dA: -1, dB: 3 },
];

function loadColorants() {
  try {
    const raw = localStorage.getItem(COLORANTS_KEY);
    if (!raw) return DEFAULT_COLORANTS.map((c) => ({ ...c }));
    const saved = JSON.parse(raw);
    return DEFAULT_COLORANTS.map((d) => ({ ...d, ...(saved.find((s) => s.id === d.id) || {}) }));
  } catch {
    return DEFAULT_COLORANTS.map((c) => ({ ...c }));
  }
}

function saveColorants(list) {
  try { localStorage.setItem(COLORANTS_KEY, JSON.stringify(list)); } catch {}
}

function resetColorants() {
  try { localStorage.removeItem(COLORANTS_KEY); } catch {}
  return DEFAULT_COLORANTS.map((c) => ({ ...c }));
}

if (typeof module !== 'undefined') module.exports = { DEFAULT_COLORANTS };
