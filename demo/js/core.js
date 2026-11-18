/**
 * NAP Paint — ядро демо: датчики линии порошковой окраски, имитатор, правила контроля,
 * прогноз тренда, партии и подсказки технологу.
 * Файл не зависит от браузера: тот же код можно запустить на локальном сервере (Node.js).
 * В рабочей системе имитатор заменяется реальными датчиками и приборами, а статистический
 * прогноз — обученной нейросетью (см. вкладку «Система»).
 */

export const STAGES = [
  { id: 'prem', ln: 'p', name: 'Предсмесь' },
  { id: 'ext', ln: 'p', name: 'Экструзия' },
  { id: 'cool', ln: 'p', name: 'Охлаждение, чипсы' },
  { id: 'mill', ln: 'p', name: 'Помол (ACM)' },
  { id: 'sieve', ln: 'p', name: 'Просев, фасовка' },
  { id: 'coat', ln: 'p', name: 'Нанесение' },
  { id: 'cure', ln: 'p', name: 'Полимеризация' },
  { id: 'qc', ln: 'p', name: 'Контроль цвета' },
  { id: 'ldis', ln: 'l', name: 'Диссольвер' },
  { id: 'lmill', ln: 'l', name: 'Бисерная мельница' },
  { id: 'llet', ln: 'l', name: 'Долив, тонировка' },
  { id: 'lfil', ln: 'l', name: 'Фильтр, налив' },
];

export const LINES = { p: 'Порошковые краски', l: 'Жидкие краски' };

// Нормы условные (демо), но порядок величин взят из практики: зоны цилиндра экструдера 70–130 °C,
// валок охлаждения 10–20 °C, ACM-мельница D50 ~30–45 мкм, окружная скорость диска диссольвера 18–26 м/с,
// температура продукта в бисерной мельнице до ~55 °C, тонкость помола 6,5+ по Хегману и т.д.
// В рабочей системе нормы задаёт технолог под рецептуру и регламент.
// ln: p — порошковая линия, l — жидкая. zone — номер зоны цилиндра экструдера (число зон 2–6 выбирается).
export const SENSORS = [
  // ---- порошковые: предсмесь
  { id: 'mix', ln: 'p', st: 'prem', name: 'Смеситель (премиксер)', unit: 'об/мин', min: 400, max: 600, dec: 0, base: 500, amp: 12, per: 540, noise: 4 },
  { id: 'mixT', ln: 'p', st: 'prem', name: 'Температура смеси', unit: '°C', min: 20, max: 45, dec: 1, base: 31, amp: 2, per: 1500, noise: 0.25 },
  { id: 'feed', ln: 'p', st: 'prem', name: 'Подача питателя в экструдер', unit: 'кг/ч', min: 35, max: 55, dec: 0, base: 45, amp: 1.5, per: 700, noise: 0.5 },
  // ---- порошковые: экструдер (двухшнековый, валы 1–2, зоны цилиндра 2–6)
  { id: 'ext1', ln: 'p', st: 'ext', zone: 1, name: 'Экструдер, зона 1', unit: '°C', min: 85, max: 105, dec: 1, base: 94, amp: 1.6, per: 720, noise: 0.3 },
  { id: 'ext2', ln: 'p', st: 'ext', zone: 2, name: 'Экструдер, зона 2', unit: '°C', min: 95, max: 115, dec: 1, base: 105, amp: 1.6, per: 900, noise: 0.3 },
  { id: 'ext3', ln: 'p', st: 'ext', zone: 3, name: 'Экструдер, зона 3', unit: '°C', min: 100, max: 120, dec: 1, base: 110, amp: 1.5, per: 840, noise: 0.3 },
  { id: 'ext4', ln: 'p', st: 'ext', zone: 4, name: 'Экструдер, зона 4', unit: '°C', min: 104, max: 124, dec: 1, base: 114, amp: 1.5, per: 780, noise: 0.3 },
  { id: 'ext5', ln: 'p', st: 'ext', zone: 5, name: 'Экструдер, зона 5', unit: '°C', min: 107, max: 127, dec: 1, base: 117, amp: 1.4, per: 960, noise: 0.3 },
  { id: 'ext6', ln: 'p', st: 'ext', zone: 6, name: 'Экструдер, зона 6 (головка)', unit: '°C', min: 102, max: 122, dec: 1, base: 112, amp: 1.4, per: 1020, noise: 0.3 },
  { id: 'srew', ln: 'p', st: 'ext', name: 'Обороты шнеков (валы 1–2)', unit: 'об/мин', min: 300, max: 500, dec: 0, base: 400, amp: 5, per: 620, noise: 1.8 },
  { id: 'extl', ln: 'p', st: 'ext', name: 'Нагрузка экструдера (момент)', unit: '%', min: 30, max: 85, dec: 0, base: 62, amp: 4, per: 600, noise: 1 },
  { id: 'extp', ln: 'p', st: 'ext', name: 'Давление расплава перед головкой', unit: 'бар', min: 5, max: 25, dec: 1, base: 13, amp: 1.2, per: 640, noise: 0.3 },
  { id: 'melt', ln: 'p', st: 'ext', name: 'Температура расплава на выходе', unit: '°C', min: 100, max: 125, dec: 1, base: 112, amp: 1.3, per: 880, noise: 0.3 },
  { id: 'cwat', ln: 'p', st: 'ext', name: 'Охлаждающая вода, подача', unit: '°C', min: 12, max: 25, dec: 1, base: 18, amp: 0.8, per: 1300, noise: 0.15 },
  { id: 'vibExt', ln: 'p', st: 'ext', name: 'Вибрация редуктора экструдера', unit: 'мм/с', min: 0, max: 4.5, dec: 1, base: 2.0, amp: 0.25, per: 700, noise: 0.06, one: 'hi' },
  // ---- порошковые: охлаждение и чипсы
  { id: 'chill', ln: 'p', st: 'cool', name: 'Охлаждающий валок / лента', unit: '°C', min: 10, max: 20, dec: 1, base: 14, amp: 0.7, per: 1100, noise: 0.15 },
  { id: 'chipT', ln: 'p', st: 'cool', name: 'Температура чипсов на выходе', unit: '°C', min: 20, max: 35, dec: 1, base: 26, amp: 1.2, per: 1000, noise: 0.25 },
  { id: 'chipSz', ln: 'p', st: 'cool', name: 'Толщина ленты (чипсов)', unit: 'мм', min: 1.0, max: 2.0, dec: 2, base: 1.5, amp: 0.07, per: 760, noise: 0.02 },
  { id: 'cT0', ln: 'p', st: 'cool', name: 'Лента на входе (после валка)', unit: '°C', min: 55, max: 85, dec: 1, base: 70, amp: 2, per: 800, noise: 0.4 },
  { id: 'cT1', ln: 'p', st: 'cool', name: 'Лента в середине', unit: '°C', min: 35, max: 58, dec: 1, base: 46, amp: 1.6, per: 880, noise: 0.35 },
  { id: 'cT2', ln: 'p', st: 'cool', name: 'Чипсы на выходе', unit: '°C', min: 18, max: 35, dec: 1, base: 28, amp: 1.2, per: 960, noise: 0.3 },
  { id: 'cdT', ln: 'p', st: 'cool', name: 'Охлаждение: вход − выход', unit: '°C', min: 28, max: 60, dec: 0, derived: true },
  { id: 'cTh', ln: 'p', st: 'cool', name: 'Толщина ленты (лазер)', unit: 'мм', min: 1, max: 2, dec: 2, base: 1.45, amp: 0.04, per: 500, noise: 0.02 },
  { id: 'cBr', ln: 'p', st: 'cool', name: 'Чистые изломы (камера)', unit: '%', min: 90, max: 100, dec: 0, base: 97, amp: 1, per: 700, noise: 0.5, one: 'lo' },
  { id: 'cInc', ln: 'p', st: 'cool', name: 'Вкрапления в чипсах (камера)', unit: 'шт/мин', min: 0, max: 3, dec: 1, base: 1, amp: 0.3, per: 900, noise: 0.2, one: 'hi' },
  // ---- порошковые: помол ACM
  { id: 'mill', ln: 'p', st: 'mill', name: 'Мельница, температура', unit: '°C', min: 15, max: 35, dec: 1, base: 26, amp: 1.5, per: 1200, noise: 0.3 },
  { id: 'asp', ln: 'p', st: 'mill', name: 'Аспирация, разрежение', unit: 'Па', min: 800, max: 1500, dec: 0, base: 1150, amp: 40, per: 660, noise: 10 },
  { id: 'cls', ln: 'p', st: 'mill', name: 'Обороты классификатора ACM', unit: 'об/мин', min: 3500, max: 5000, dec: 0, base: 4200, amp: 60, per: 800, noise: 15 },
  { id: 'd50', ln: 'p', st: 'mill', name: 'Размер частиц D50', unit: 'мкм', min: 30, max: 45, dec: 1, base: 36, amp: 1, per: 1700, noise: 0.25 },
  { id: 'filt', ln: 'p', st: 'mill', name: 'Перепад на рукавном фильтре', unit: 'Па', min: 500, max: 1400, dec: 0, base: 950, amp: 40, per: 1500, noise: 10 },
  { id: 'vibMill', ln: 'p', st: 'mill', name: 'Вибрация мельницы', unit: 'мм/с', min: 0, max: 4.5, dec: 1, base: 1.7, amp: 0.2, per: 600, noise: 0.05, one: 'hi' },
  { id: 'brgT', ln: 'p', st: 'mill', name: 'Подшипник мельницы, температура', unit: '°C', min: 40, max: 80, dec: 0, base: 58, amp: 1.5, per: 1900, noise: 0.3 },
  // ---- порошковые: просев и фасовка
  { id: 'resid', ln: 'p', st: 'sieve', name: 'Остаток на сите 125 мкм', unit: '%', min: 0, max: 0.5, dec: 2, base: 0.15, amp: 0.04, per: 1300, noise: 0.02, one: 'hi' },
  { id: 'bag', ln: 'p', st: 'sieve', name: 'Масса мешка (20 кг)', unit: 'кг', min: 19.9, max: 20.2, dec: 2, base: 20.04, amp: 0.02, per: 900, noise: 0.015 },
  // ---- порошковые: нанесение
  { id: 'boothH', ln: 'p', st: 'coat', name: 'Влажность камеры', unit: '%', min: 40, max: 60, dec: 0, base: 50, amp: 2.5, per: 1440, noise: 0.35 },
  { id: 'boothT', ln: 'p', st: 'coat', name: 'Температура камеры', unit: '°C', min: 18, max: 28, dec: 1, base: 23, amp: 1, per: 1560, noise: 0.15 },
  { id: 'film', ln: 'p', st: 'coat', name: 'Толщина покрытия', unit: 'мкм', min: 60, max: 100, dec: 0, base: 78, amp: 3, per: 480, noise: 0.9 },
  { id: 'volt', ln: 'p', st: 'coat', name: 'Напряжение пистолетов', unit: 'кВ', min: 60, max: 90, dec: 0, base: 75, amp: 2, per: 560, noise: 0.5 },
  { id: 'pflow', ln: 'p', st: 'coat', name: 'Расход порошка', unit: 'г/мин', min: 150, max: 300, dec: 0, base: 220, amp: 8, per: 800, noise: 2.5 },
  // ---- порошковые: печь
  { id: 'oven', ln: 'p', st: 'cure', name: 'Печь полимеризации', unit: '°C', min: 175, max: 205, dec: 0, base: 190, amp: 2, per: 780, noise: 0.4 },
  { id: 'belt', ln: 'p', st: 'cure', name: 'Скорость конвейера', unit: 'м/мин', min: 1.5, max: 3, dec: 2, base: 2.2, amp: 0.04, per: 1020, noise: 0.008 },
  { id: 'pmt', ln: 'p', st: 'cure', name: 'Температура металла (PMT)', unit: '°C', min: 170, max: 200, dec: 0, derived: true },
  { id: 'dwell', ln: 'p', st: 'cure', name: 'Время в печи', unit: 'мин', min: 10, max: 25, dec: 1, derived: true },
  { id: 'bSl', ln: 'p', st: 'cure', name: 'Проскальзывание ленты', unit: '%', min: 0, max: 2, dec: 1, base: 0.6, amp: 0.2, per: 700, noise: 0.12, one: 'hi' },
  { id: 'bTr', ln: 'p', st: 'cure', name: 'Смещение ленты от центра', unit: 'мм', min: -15, max: 15, dec: 0, base: 0, amp: 4, per: 500, noise: 1.2 },
  { id: 'bBg', ln: 'p', st: 'cure', name: 'Подшипник барабана, температура', unit: '°C', min: 20, max: 70, dec: 0, base: 46, amp: 2, per: 900, noise: 0.4 },
  { id: 'bVb', ln: 'p', st: 'cure', name: 'Вибрация редуктора конвейера', unit: 'мм/с', min: 0.5, max: 4.5, dec: 1, base: 2, amp: 0.3, per: 640, noise: 0.12 },
  { id: 'bTe', ln: 'p', st: 'cure', name: 'Натяжение ленты', unit: '%', min: 85, max: 115, dec: 0, base: 100, amp: 2, per: 760, noise: 0.5 },
  // ---- порошковые: контроль цвета
  { id: 'dE', ln: 'p', st: 'qc', name: 'ΔE цвета', unit: '', min: 0, max: 1, dec: 2, base: 0.45, amp: 0.08, per: 1800, noise: 0.025, one: 'hi' },
  { id: 'gloss', ln: 'p', st: 'qc', name: 'Блеск 60°', unit: 'GU', min: 70, max: 90, dec: 0, base: 82, amp: 1.2, per: 2000, noise: 0.3 },
  // ---- жидкие: диссольвер
  { id: 'dtip', ln: 'l', st: 'ldis', name: 'Окружная скорость диска', unit: 'м/с', min: 18, max: 26, dec: 1, base: 22, amp: 0.6, per: 720, noise: 0.15 },
  { id: 'dT', ln: 'l', st: 'ldis', name: 'Температура базы', unit: '°C', min: 25, max: 50, dec: 1, base: 36, amp: 1.5, per: 1100, noise: 0.2 },
  { id: 'dkw', ln: 'l', st: 'ldis', name: 'Мощность диссольвера', unit: 'кВт', min: 8, max: 15, dec: 1, base: 11.5, amp: 0.5, per: 900, noise: 0.12 },
  { id: 'visc', ln: 'l', st: 'ldis', name: 'Вязкость базы', unit: 'KU', min: 85, max: 110, dec: 0, base: 97, amp: 1.8, per: 1300, noise: 0.5 },
  // ---- жидкие: бисерная мельница
  { id: 'bmT', ln: 'l', st: 'lmill', name: 'Температура на выходе мельницы', unit: '°C', min: 30, max: 55, dec: 1, base: 42, amp: 1.4, per: 1000, noise: 0.2 },
  { id: 'bmP', ln: 'l', st: 'lmill', name: 'Давление в камере помола', unit: 'бар', min: 0.5, max: 3.5, dec: 1, base: 1.8, amp: 0.15, per: 760, noise: 0.03 },
  { id: 'bmKw', ln: 'l', st: 'lmill', name: 'Мощность привода мельницы', unit: 'кВт', min: 20, max: 45, dec: 1, base: 32, amp: 1.2, per: 1100, noise: 0.25 },
  { id: 'grind', ln: 'l', st: 'lmill', name: 'Тонкость помола (Хегман)', unit: '', min: 6.5, max: 8, dec: 1, base: 7.1, amp: 0.1, per: 2000, noise: 0.03, one: 'lo' },
  // ---- жидкие: долив и тонировка
  { id: 'ph', ln: 'l', st: 'llet', name: 'pH', unit: '', min: 8.2, max: 9.5, dec: 2, base: 8.8, amp: 0.08, per: 1700, noise: 0.02 },
  { id: 'dens', ln: 'l', st: 'llet', name: 'Плотность', unit: 'кг/л', min: 1.2, max: 1.4, dec: 3, base: 1.31, amp: 0.006, per: 1250, noise: 0.002 },
  { id: 'solid', ln: 'l', st: 'llet', name: 'Сухой остаток', unit: '%', min: 48, max: 56, dec: 1, base: 52, amp: 0.5, per: 1500, noise: 0.1 },
  { id: 'lvl', ln: 'l', st: 'llet', name: 'Уровень в ёмкости долива', unit: '%', min: 15, max: 90, dec: 0, base: 55, amp: 8, per: 2400, noise: 0.3 },
  // ---- жидкие: фильтрация и налив
  { id: 'lfdp', ln: 'l', st: 'lfil', name: 'Перепад на фильтре', unit: 'бар', min: 0.1, max: 1.5, dec: 2, base: 0.45, amp: 0.05, per: 1400, noise: 0.01 },
  { id: 'fillW', ln: 'l', st: 'lfil', name: 'Масса налива (20 кг)', unit: 'кг', min: 19.9, max: 20.3, dec: 2, base: 20.08, amp: 0.03, per: 700, noise: 0.02 },
];

export function normText(s) {
  if (s.one === 'hi') return `допуск ≤ ${fmt(s.max, s.dec)}`;
  if (s.one === 'lo') return `не ниже ${fmt(s.min, s.dec)}`;
  return `норма ${fmt(s.min, s.dec)}…${fmt(s.max, s.dec)}`;
}

// Сценарии демо: что именно происходит и какие датчики это затрагивает.
// d — на сколько уходит параметр, dur — сколько секунд держится, ramp — за сколько секунд нарастает.
export const SCENARIOS = {
  humidity: { ln: 'p', label: 'Влажность выросла', set: { boothH: { d: 15, dur: 170 } } },
  oven: { ln: 'p', label: 'Печь остывает', set: { oven: { d: -20, dur: 170 } } },
  belt: { ln: 'p', label: 'Конвейер ускорился', set: { belt: { d: 1.0, dur: 170 } } },
  dust: { ln: 'p', label: 'Слабая аспирация', set: { asp: { d: -450, dur: 170 } } },
  color: { ln: 'p', label: 'Цвет уходит', set: { dE: { d: 1.0, dur: 160 }, gloss: { d: -9, dur: 160 } } },
  zone: { ln: 'p', label: 'Перегрев зоны экструдера', set: { ext3: { d: 22, dur: 190, ramp: 50 }, melt: { d: 14, dur: 190, ramp: 60 } } },
  die: { ln: 'p', label: 'Засор головки экструдера', set: { extp: { d: 14, dur: 190, ramp: 50 }, extl: { d: 24, dur: 190, ramp: 50 } } },
  starve: { ln: 'p', label: 'Питатель недодаёт', set: { feed: { d: -22, dur: 180, ramp: 40 }, extl: { d: -32, dur: 180, ramp: 40 } } },
  cwater: { ln: 'p', label: 'Сбой охлаждающей воды', set: { cwat: { d: 11, dur: 200, ramp: 50 }, melt: { d: 14, dur: 200, ramp: 70 }, chill: { d: 8, dur: 200, ramp: 60 }, ext2: { d: 12, dur: 200, ramp: 70 } } },
  chips: { ln: 'p', label: 'Чипсы липнут', set: { chill: { d: 11, dur: 180, ramp: 50 }, chipT: { d: 12, dur: 180, ramp: 60 } } },
  bearing: { ln: 'p', label: 'Износ подшипника мельницы', set: { vibMill: { d: 3.4, dur: 230, ramp: 110 }, brgT: { d: 26, dur: 230, ramp: 110 } } },
  filter: { ln: 'p', label: 'Забит фильтр мельницы', set: { filt: { d: 800, dur: 190, ramp: 60 }, asp: { d: -420, dur: 190, ramp: 60 }, d50: { d: 8, dur: 190, ramp: 80 } } },
  sieve: { ln: 'p', label: 'Прорыв сита', set: { resid: { d: 0.9, dur: 170, ramp: 30 }, d50: { d: 7, dur: 170, ramp: 40 } } },
  gun: { ln: 'p', label: 'Падает заряд пистолетов', set: { volt: { d: -30, dur: 180, ramp: 50 }, pflow: { d: -75, dur: 180, ramp: 50 }, film: { d: -24, dur: 180, ramp: 60 } } },
  stretch: { ln: 'p', label: 'Чипсы тянутся (лента не остыла)', set: { cT2: { d: 14, dur: 170 }, cT1: { d: 10, dur: 170 }, cBr: { d: -16, dur: 170 } } },
  thick: { ln: 'p', label: 'Лента толще нормы', set: { cTh: { d: 0.7, dur: 170 }, cT2: { d: 6, dur: 170 }, cBr: { d: -6, dur: 170 } } },
  burn: { ln: 'p', label: 'Пригорание на шнеке: вкрапления', set: { cInc: { d: 8, dur: 170 }, ext2: { d: 12, dur: 170 } } },
  slip: { ln: 'p', label: 'Лента конвейера проскальзывает', set: { bSl: { d: 4, dur: 170 }, bTe: { d: -12, dur: 170 } } },
  track: { ln: 'p', label: 'Сход ленты конвейера', set: { bTr: { d: 24, dur: 170 } } },
  brg: { ln: 'p', label: 'Греется подшипник барабана', set: { bBg: { d: 30, dur: 170 }, bVb: { d: 2.6, dur: 170 } } },
  beads: { ln: 'l', label: 'Бисерная мельница перегрета', set: { bmT: { d: 16, dur: 200, ramp: 70 }, bmP: { d: 1.5, dur: 200, ramp: 60 }, bmKw: { d: 10, dur: 200, ramp: 60 } } },
  coarse: { ln: 'l', label: 'Грубый помол (износ бисера)', set: { grind: { d: -1.3, dur: 200, ramp: 80 }, bmKw: { d: -7, dur: 200, ramp: 80 } } },
  ph: { ln: 'l', label: 'Уход pH и вязкости', set: { ph: { d: -1.1, dur: 190, ramp: 60 }, visc: { d: 14, dur: 190, ramp: 60 } } },
  lclog: { ln: 'l', label: 'Забит фильтр линии налива', set: { lfdp: { d: 1.2, dur: 190, ramp: 60 }, fillW: { d: -0.4, dur: 190, ramp: 60 } } },
  fill: { ln: 'l', label: 'Недолив тары', set: { fillW: { d: -0.45, dur: 170, ramp: 30 } } },
};

// Что обычно стоит за отклонением (демо-база знаний; в продукте наполняется вашими регламентами).
const KB = {
  cT0: { high: ['Лента выходит с валка слишком горячей: остывает дольше. Проверить температуру воды валка и скорость ленты'], low: ['Лента остыла раньше времени: возможна неровная толщина. Проверить подачу и валок'] },
  cT1: { high: ['Лента остывает медленно: проверить обдув и воду под лентой'], low: ['Лента остывает слишком быстро: возможны трещины. Проверить воду и скорость ленты'] },
  cT2: { high: ['Чипсы на выходе тёплые: они тянутся, а не ломаются, и слипаются. Снизить скорость подачи или усилить охлаждение'], low: ['Чипсы переохлаждены: возможна конденсация влаги. Проверить воду охлаждения'] },
  cdT: { high: ['Лента остывает резко: проверить расход воды под лентой'], low: ['Лента остывает слабо: проверить воду, обдув и толщину ленты'] },
  cTh: { high: ['Лента толще нормы: остывает дольше, риск тянучки. Проверить зазор валков и подачу. Технологу сделать контрольный замер'], low: ['Лента тоньше нормы: проверить зазор валков. Технологу сделать контрольный замер'] },
  cBr: { low: ['Мало чистых изломов: чипсы тянутся. Проверить температуру на выходе и толщину ленты'] },
  cInc: { high: ['Тёмные вкрапления в чипсах: возможно пригорание на шнеке или в зоне. Проверить температуру зон, остановить подачу и осмотреть шнек'] },
  bSl: { high: ['Лента проскальзывает на приводном барабане: износ или отслоение футеровки, слабое натяжение, налипание пыли или влага. Осмотреть барабан, проверить натяжение, остановить конвейер до ремонта'] },
  bTr: { high: ['Лента сходит в сторону: перекос барабана или роликов, неравномерная загрузка, налипание на один край. Проверить центровку и очистить'], low: ['Лента сходит в другую сторону: перекос барабана или роликов, неравномерный износ кромки. Проверить центровку и очистить'] },
  bBg: { high: ['Греется подшипник барабана или ролика: нет смазки, износ, перекос оси. Заявка ремонтной бригаде, смазать или заменить подшипник'], low: ['Температура подшипника ниже нормы: проверить датчик'] },
  bVb: { high: ['Растёт вибрация редуктора: расцентровка муфты, износ зубьев или подшипников, ослабли крепления, мало масла. Проверить уровень масла и крепления'], low: ['Вибрация ниже нормы: проверить датчик и крепление'] },
  bTe: { high: ['Лента перетянута: растёт нагрузка на подшипники и риск обрыва стыка. Ослабить натяжитель'], low: ['Натяжение упало: растяжение ленты или ослаб натяжитель. Подтянуть, проверить износ ленты и стык'] },
  mix: { high: ['Перегрев и пыление смеси: снизить обороты'], low: ['Смесь недостаточно гомогенна: проверить привод и загрузку'] },
  mixT: { high: ['Смесь греется в премиксере: слипание компонентов, риск «комков». Проверить время цикла и охлаждение рубашки'], low: ['Холодная смесь: проверить температуру сырья'] },
  feed: { high: ['Питатель перегружает экструдер: растёт момент и давление. Снизить подачу'], low: ['Недогруз шнеков: расплав нестабилен, разброс цвета. Проверить питатель, бункер, мостообразование смеси'] },
  ext1: { high: ['Перегрев расплава: риск преждевременной полимеризации (гель-частицы). Снизить задание зоны'], low: ['Пигменты хуже диспергируются: проверить нагреватели зоны'] },
  ext2: { high: ['Перегрев расплава: риск гель-частиц. Проверить охлаждение и задание'], low: ['Недостаточный прогрев: проверить нагреватели и термопару'] },
  ext3: { high: ['Перегрев зоны: падает вязкость и сдвиг, хуже диспергируются пигменты, риск гель-частиц. Проверить охлаждение цилиндра и термопару'], low: ['Зона недогрета: смола не плавится, растёт момент. Проверить нагреватель зоны'] },
  ext4: { high: ['Перегрев зоны: риск преждевременного отверждения в цилиндре. Проверить охлаждение'], low: ['Недогрев: непроплав, крупные частицы в чипсах'] },
  ext5: { high: ['Перегрев: риск преждевременной реакции отвердителя. Снизить задание'], low: ['Недогрев перед головкой: рост давления. Проверить нагреватель'] },
  ext6: { high: ['Перегрев головки: риск пригорания на головке и посторонних частиц в чипсах'], low: ['Холодная головка: растёт давление, риск засора'] },
  srew: { high: ['Слишком высокие обороты: расплав перегревается от сдвига'], low: ['Низкие обороты: слабая дисперсия пигментов. Проверить привод и частотный преобразователь'] },
  extl: { high: ['Перегрузка привода: проверить подачу и засорение'], low: ['Нестабильная подача: проверить дозатор'] },
  extp: { high: ['Давление перед головкой растёт: засор фильтра или головки, посторонний предмет. Остановить подачу, проверить металлодетектор и сито'], low: ['Давление падает: недогруз шнеков или износ элементов'] },
  melt: { high: ['Расплав перегрет: проверить зоны, охлаждение, обороты'], low: ['Расплав холодный: проверить зоны и подачу'] },
  cwat: { high: ['Охлаждающая вода тёплая: цилиндр и валок хуже охлаждаются. Проверить чиллер, насос и фильтры воды'], low: ['Переохлаждение воды: возможен конденсат на валках'] },
  vibExt: { high: ['Вибрация редуктора выше допуска: износ подшипников или зубьев, нарушена соосность. Запланировать осмотр, проверить смазку'] },
  chill: { high: ['Валок тёплый: расплав липнет к валку и ленте, лента неровная. Проверить воду и поток'], low: ['Валок слишком холодный: конденсат, влага на чипсах'] },
  chipT: { high: ['Чипсы тёплые: не ломаются при дроблении, слипаются в бункере. Проверить охлаждение и скорость ленты'], low: ['Чипсы холодные: возможен конденсат'] },
  chipSz: { high: ['Лента толстая: хуже охлаждается, крупные чипсы. Проверить зазор валков'], low: ['Лента тонкая: быстрый износ, пыление. Проверить подачу расплава'] },
  mill: { high: ['Перегрев помола: частицы склеиваются, мельница забивается. Проверить охлаждающий воздух'], low: ['Температура ниже нормы: проверить поток воздуха'] },
  asp: { high: ['Лишний поток уносит тонкие фракции: проверить заслонки'], low: ['Слабая аспирация: растёт запылённость, риск для безопасности. Проверить фильтры и вентилятор'] },
  cls: { high: ['Классификатор вращается быстро: порошок мельче нормы, падает выход. Проверить задание'], low: ['Классификатор медленный: порошок грубее нормы. Проверить привод'] },
  d50: { high: ['Порошок грубее нормы: возможны «апельсиновая корка» и пятна. Проверить классификатор, сито, износ бил'], low: ['Порошок мельче нормы: пыление, плохая текучесть. Проверить классификатор'] },
  filt: { high: ['Рукавный фильтр забивается: падает аспирация, растёт температура. Проверить продувку и рукава'], low: ['Перепад ниже нормы: возможен разрыв рукава. Проверить'] },
  vibMill: { high: ['Вибрация мельницы выше допуска: износ подшипников, дисбаланс бил или налипание. Остановить в плановое окно'] },
  brgT: { high: ['Подшипник перегревается: нехватка смазки или износ. Риск остановки линии. Проверить смазку, запланировать замену'], low: ['Температура подшипника ниже ожидаемой: проверить датчик'] },
  resid: { high: ['Крупные частицы на сите: порвано сито или переполнение. Остановить просев, проверить сито'] },
  bag: { high: ['Перевес мешка: потери порошка. Откалибровать весы'], low: ['Недовес мешка: претензии покупателя. Откалибровать весы'] },
  boothH: { high: ['Порошок слипается и плохо подаётся: возможны пятна и неровная плёнка. Проверить осушение воздуха и влагоотделитель'], low: ['Растёт статика: хуже ложится в углублениях. Проверить приточный воздух'] },
  boothT: { high: ['Тёплый воздух ухудшает текучесть порошка: проверить вентиляцию'], low: ['Холодная камера: проверить приток и обогрев'] },
  film: { high: ['Перерасход порошка, риск «апельсиновой корки» и стекания. Проверить режим распыления'], low: ['Недостаточное укрытие: цвет может просвечивать. Проверить подачу и скорость конвейера'] },
  volt: { high: ['Слишком высокое напряжение: обратная ионизация, «кратеры» в покрытии'], low: ['Заряд падает: хуже осаждение, перерасход порошка. Проверить кабели, изоляцию, заземление подвески'] },
  pflow: { high: ['Перерасход порошка: проверить подачу воздуха и инжекторы'], low: ['Расход падает: засор шланга или инжектора, влага в порошке'] },
  oven: { high: ['Перегрев: светлые цвета могут желтеть, меняется блеск. Проверить регулятор температуры'], low: ['Риск недоотверждения: слабая адгезия и стойкость. Проверить горелки или ТЭНы и термопары'] },
  belt: { high: ['Изделие проходит печь быстрее: риск недоотверждения. Снизить скорость'], low: ['Время в печи растёт: риск перегрева и смены цвета'] },
  pmt: { high: ['Металл перегрет: проверить задание печи и скорость конвейера'], low: ['Металл не прогрелся до режима: риск недоотверждения. Проверить массу изделий на подвеске и температуру печи'] },
  dwell: { high: ['Время в печи больше нормы: риск перегрева. Увеличить скорость'], low: ['Время полимеризации меньше нормы: риск недоотверждения. Снизить скорость конвейера или поднять температуру'] },
  dE: { high: ['Цвет вне допуска: сделать замер и рассчитать колорант на вкладке «Цвет», проверить режим печи'] },
  gloss: { high: ['Блеск выше нормы: проверить режим печи и состав'], low: ['Блеск ниже нормы: перегрев, грубый помол или влага. Проверить D50 и печь'] },
  dtip: { high: ['Скорость диска слишком велика: вспенивание, перегрев базы. Снизить обороты'], low: ['Диск вращается медленно: слабый вихрь, агломераты не разбиваются. Увеличить обороты'] },
  dT: { high: ['База перегревается: риск для связующего. Проверить охлаждение рубашки, снизить мощность'], low: ['Температура ниже нормы: дольше смачиваются пигменты'] },
  dkw: { high: ['Мощность выросла: вязкость выше нормы или забит диск. Проверить загрузку порошков'], low: ['Мощность ниже нормы: слишком жидкая база, плохая дисперсия'] },
  visc: { high: ['База слишком вязкая: перегрузка диссольвера и мельницы. Проверить загрузку и растворитель/воду'], low: ['База жидкая: хуже диспергируются пигменты. Проверить долив'] },
  bmT: { high: ['Мельница перегрета: риск для связующего, смена цвета. Проверить охлаждение, расход продукта и загрузку бисера'], low: ['Температура ниже нормы: проверить подачу охлаждающей воды'] },
  bmP: { high: ['Давление в камере растёт: забито сепараторное сито бисера или вязкость выше нормы. Проверить'], low: ['Давление падает: утечка или износ насоса'] },
  bmKw: { high: ['Мощность растёт: слишком вязкий продукт или избыток бисера. Проверить'], low: ['Мощность падает: износ бисера, мало загрузки. Проверить загрузку и размер бисера'] },
  grind: { low: ['Помол грубее нормы: проверить износ бисера, число проходов, расход. Возможны потеря цвета и блеска'] },
  ph: { high: ['pH выше нормы: проверить дозировку нейтрализатора'], low: ['pH ниже нормы: риск потери стабильности и вязкости. Проверить нейтрализатор и воду'] },
  dens: { high: ['Плотность выше нормы: проверить пигменты и наполнители'], low: ['Плотность ниже нормы: проверить дозировку, воздух в продукте'] },
  solid: { high: ['Сухой остаток выше нормы: краска густеет'], low: ['Сухой остаток ниже нормы: слишком много воды или растворителя'] },
  lvl: { high: ['Ёмкость близка к переливу: остановить подачу'], low: ['Ёмкость почти пуста: сухой ход насоса. Проверить подачу'] },
  lfdp: { high: ['Фильтр забивается: падает производительность. Заменить фильтрующий элемент'], low: ['Перепад низкий: возможен прорыв фильтра. Проверить'] },
  fillW: { high: ['Перелив: потери краски. Откалибровать дозатор'], low: ['Недолив: претензии покупателя. Проверить дозатор и фильтр на линии'] },
};

// Составные ситуации: несколько отклонений сразу указывают на одну причину.
const COMBOS = [
  { key: 'cmp:bearing', need: ['vibMill', 'brgT'], text: 'Мельница: вибрация и температура подшипника растут вместе — вероятный износ подшипника', advice: 'Остановить в ближайшее плановое окно, проверить смазку и подшипник. До отказа обычно остаются часы, а не дни' },
  { key: 'cmp:die', need: ['extp', 'extl'], text: 'Экструдер: давление перед головкой и нагрузка растут вместе — вероятный засор головки или посторонний предмет', advice: 'Остановить подачу, проверить решётку головки и металлодетектор, очистить' },
  { key: 'cmp:cool', need: ['cwat', 'melt'], text: 'Экструдер: вода тёплая и расплав перегрет — сбой системы охлаждения', advice: 'Проверить чиллер, насос и фильтры воды, снизить подачу до устранения' },
  { key: 'cmp:chips', need: ['chill', 'chipT'], text: 'Охлаждение: валок и чипсы тёплые — чипсы липнут и плохо дробятся', advice: 'Проверить поток воды в валке, снизить подачу, при необходимости остановить дробилку' },
  { key: 'cmp:filter', need: ['filt', 'asp'], text: 'Помол: фильтр забит и аспирация падает — растёт запылённость и температура', advice: 'Включить продувку, проверить рукава, снизить подачу в мельницу' },
  { key: 'cmp:gun', need: ['volt', 'pflow'], text: 'Нанесение: напряжение и расход порошка падают — хуже осаждение и тоньше плёнка', advice: 'Проверить кабели и заземление подвески, инжекторы и шланги' },
  { key: 'cmp:bead', need: ['bmT', 'bmP'], text: 'Бисерная мельница: температура и давление растут — вероятный перегрев и забит сепаратор', advice: 'Снизить подачу, проверить охлаждение и сепаратор бисера' },
  { key: 'cmp:ph', need: ['ph', 'visc'], text: 'Долив: pH и вязкость уходят вместе — риск потери стабильности краски', advice: 'Проверить нейтрализатор и загрузочный лист, сделать контрольный замер' },
];

const CORE = {
  limit: 'Страж параметров', trend: 'Прогноз отклонения', anomaly: 'Аномалия', cure: 'Контроль отверждения',
  color: 'Контроль цвета', safe: 'Безопасность', shelf: 'Срок хранения', fail: 'Предупреждение о поломке', combo: 'Диагностика причины',
};

export function fmt(v, dec = 1) {
  return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
export const DEFAULT_SETTINGS = { ovenLen: 26, tol: 1.0, horizonMin: 10, tickSec: 2, histLen: 150 };

function seedBatches(now) {
  const mk = (no, ral, name, finish, chem, kg, line, emp, hAgo, st, dE) => ({
    id: no, no, ral, name, finish, chem, kg, line, emp, made: now - hAgo * 3600000, shelfMonths: 12, status: st, dE,
  });
  return [
    mk('RP-261114-01', 'RAL 9010', 'Белый', 'глянец', 'эпокси-полиэстер', 500, 'Линия 1', 'Иванов И.И.', 2, 'work', null),
    mk('RP-261114-02', 'RAL 7016', 'Антрацит', 'структура', 'полиэстер', 300, 'Линия 1', 'Иванов И.И.', 5, 'qc', 1.4),
    mk('RP-261113-03', 'RAL 3020', 'Красный', 'глянец', 'полиэстер', 200, 'Линия 2', 'Петрова А.С.', 20, 'done', 0.5),
    mk('RP-261113-02', 'RAL 5010', 'Синий', 'глянец', 'полиэстер', 250, 'Линия 2', 'Петрова А.С.', 24, 'done', 0.7),
    mk('RP-261112-01', 'RAL 9005', 'Чёрный', 'мат', 'эпокси-полиэстер', 400, 'Линия 1', 'Алексеев В.Н.', 44, 'done', 0.4),
    mk('RP-261031-02', 'RAL 6005', 'Зелёный мох', 'глянец', 'полиэстер', 150, 'Линия 2', 'Петрова А.С.', 24 * 335, 'done', 0.6),
  ];
}

export class Plant {
  constructor({ now = Date.now(), seed = 11 } = {}) {
    this.settings = { ...DEFAULT_SETTINGS };
    this.rnd = mulberry32(seed);
    this.zones = 4;
    this.allSensors = SENSORS.map((s) => ({ ...s, value: s.base ?? 0, ts: now }));
    this.sensors = this.allSensors.filter((s) => !s.zone || s.zone <= this.zones);
    this.hist = Object.fromEntries(this.allSensors.map((s) => [s.id, []]));
    this.inj = {};
    this.events = [];
    this.ack = {};
    this.items = [];
    this.batches = seedBatches(now);
    this.seq = 3;
    this.t = now - this.settings.histLen * this.settings.tickSec * 1000;
    this.phase = Object.fromEntries(this.allSensors.map((s) => [s.id, this.rnd() * 6.28]));
    this._warm = true;
    for (let i = 0; i < this.settings.histLen; i++) this.step(this.t + this.settings.tickSec * 1000, true);
    this._warm = false;
    this.events = [];
    this.evaluate(now, true);
  }

  /** Число рабочих зон цилиндра двухшнекового экструдера (2–6): датчики зон добавляются или убираются */
  setZones(n) {
    this.zones = Math.max(2, Math.min(6, Math.round(n)));
    this.sensors = this.allSensors.filter((s) => !s.zone || s.zone <= this.zones);
    this.items = this.items.filter((i) => this.sensors.some((s) => s.id === i.key) || !SENSORS.some((s) => s.id === i.key));
  }

  gauss() { return Math.sqrt(-2 * Math.log(1 - this.rnd())) * Math.cos(6.2832 * this.rnd()); }

  // сценарий демо: плавный сдвиг параметра, затем возврат
  offset(id, t) {
    const j = this.inj[id];
    if (!j) return 0;
    const el = (t - j.t0) / 1000;
    if (el < 0) return 0;
    const ramp = Math.min(1, el / (j.ramp || 70));
    const fade = el > j.dur ? Math.max(0, 1 - (el - j.dur) / 40) : 1;
    if (el > j.dur + 40) { delete this.inj[id]; return 0; }
    return j.d * ramp * fade;
  }

  inject(kind) {
    const t0 = this.t;
    if (kind === 'reset') { this.inj = {}; return; }
    const sc = SCENARIOS[kind]?.set;
    if (!sc) return;
    for (const id in sc) this.inj[id] = { t0, ...sc[id] };
  }

  step(now, silent) {
    const sec = now / 1000;
    this.t = now;
    const v = {};
    const list = this._warm ? this.allSensors : this.sensors;
    for (const s of list) {
      if (s.derived) continue;
      let x = s.base + s.amp * Math.sin((6.2832 * sec) / s.per + this.phase[s.id]) + s.noise * this.gauss();
      x += this.offset(s.id, now);
      v[s.id] = x;
    }
    v.pmt = v.oven - 6.5 + 0.4 * this.gauss();
    v.cdT = v.cT0 - v.cT2;
    v.dwell = this.settings.ovenLen / Math.max(0.2, v.belt);
    for (const s of list) {
      s.value = v[s.id];
      s.ts = now;
      const h = this.hist[s.id];
      h.push(s.value);
      if (h.length > this.settings.histLen) h.shift();
    }
    this.allSensors.find((s) => s.id === 'dE').max = this.settings.tol;
    if (!silent) this.evaluate(now);
  }

  bounds(s) {
    return { lo: s.one === 'hi' ? -Infinity : s.min, hi: s.one === 'lo' ? Infinity : s.max };
  }

  status(s) {
    const it = this.items.find((i) => i.key === s.id);
    return it ? it.level : 'ok';
  }

  evaluate(now, silent) {
    const items = [];
    const { horizonMin, tickSec } = this.settings;
    for (const s of this.sensors) {
      const h = this.hist[s.id];
      const v = s.value;
      const { lo, hi } = this.bounds(s);
      const range = s.max - s.min || 1;
      const margin = 0.08 * range;
      const kb = KB[s.id] || {};
      const core = s.id === 'dwell' || s.id === 'pmt' ? CORE.cure : s.id === 'dE' || s.id === 'gloss' ? CORE.color : s.id === 'asp' || s.id === 'filt' ? CORE.safe : ['vibExt', 'vibMill', 'brgT', 'extp', 'lfdp'].includes(s.id) ? CORE.fail : CORE.limit;
      const base = `${s.name} ${fmt(v, s.dec)}${s.unit ? ' ' + s.unit : ''}`;
      const norm = normText(s);
      let it = null;
      if (v < lo || v > hi) {
        const dir = v > hi ? 'high' : 'low';
        it = { level: 'act', core, dir, text: `${base} — вне нормы (${norm})`, advice: (kb[dir] || [])[0] };
      } else {
        // тренд: устойчивый дрейф за последнюю минуту (регрессия + проверка, что это не шум)
        const n = Math.min(12, h.length);
        if (n >= 10) {
          const seg = h.slice(-n);
          let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
          seg.forEach((y, i) => { sx += i; sy += y; sxy += i * y; sxx += i * i; syy += y * y; });
          const cov = n * sxy - sx * sy, vx = n * sxx - sx * sx, vy = n * syy - sy * sy;
          const slope = cov / vx;
          const r2 = vy > 1e-12 ? (cov * cov) / (vx * vy) : 0;
          let target = null;
          if (slope > 0 && hi !== Infinity) target = hi;
          if (slope < 0 && lo !== -Infinity) target = lo;
          if (target !== null && r2 > 0.7 && Math.abs(slope) * n > 0.12 * range) {
            const mins = (Math.abs(target - v) / Math.abs(slope)) * tickSec / 60;
            if (mins > 0 && mins <= horizonMin) {
              const dir = target === hi ? 'high' : 'low';
              it = { level: 'watch', core: CORE.trend, dir, text: `${base}: при таком темпе выйдет за границу через ~${Math.max(1, Math.round(mins))} мин (${norm})`, advice: (kb[dir] || [])[0] };
            }
          }
        }
        if (!it && (v - lo < margin || hi - v < margin)) {
          const dir = hi - v < margin ? 'high' : 'low';
          it = { level: 'watch', core, dir, text: `${base} на грани нормы (${norm})`, advice: (kb[dir] || [])[0] };
        }
        if (!it && h.length > 60) {
          const ref = h.slice(-100, -3);
          const m = ref.reduce((a, b) => a + b, 0) / ref.length;
          const sd = Math.sqrt(ref.reduce((a, b) => a + (b - m) ** 2, 0) / ref.length) || 0;
          const z = Math.abs(v - m) / Math.max(sd, 0.01 * range);
          if (z > 4.5) it = { level: 'watch', core: CORE.anomaly, dir: v > m ? 'high' : 'low', text: `${base}: резкое отклонение от обычного поведения` };
        }
      }
      if (it) items.push({ key: s.id, sensorId: s.id, ...it });
    }
    for (const c of COMBOS) {
      const got = c.need.map((k) => items.find((i) => i.key === k));
      if (got.every(Boolean)) items.push({ key: c.key, level: 'act', core: CORE.combo, text: c.text, advice: c.advice });
    }
    for (const b of this.batches) {
      if (b.status !== 'done') continue;
      const left = Math.round((this.expires(b) - now) / DAY);
      if (left <= 30) items.push({ key: 'shelf:' + b.id, level: left <= 7 ? 'act' : 'watch', core: CORE.shelf, text: `Партия ${b.no} (${b.ral}): срок хранения заканчивается через ${Math.max(0, left)} дн.`, advice: 'Отгрузить в первую очередь или провести повторный контроль' });
    }
    this.reconcile(items, now, silent);
    this.items = items;
  }

  reconcile(items, now, silent) {
    const keys = new Set(items.map((i) => i.key));
    for (const e of this.events) {
      if (e.open && !keys.has(e.key)) { e.open = false; e.closedTs = now; }
    }
    for (const it of items) {
      const open = this.events.find((e) => e.open && e.key === it.key);
      if (!open && !silent) this.events.unshift({ id: ++this.seq, key: it.key, ts: now, level: it.level, core: it.core, text: it.text, open: true });
      else if (open) { open.level = it.level; open.text = it.text; open.core = it.core; }
    }
    if (this.events.length > 200) this.events.length = 200;
    for (const k of Object.keys(this.ack)) if (!keys.has(k)) delete this.ack[k];
  }

  acknowledge(key, how) { this.ack[key] = { ts: this.t, how }; }

  expires(b) { const d = new Date(b.made); d.setMonth(d.getMonth() + b.shelfMonths); return d.getTime(); }

  addBatch({ ral, name, finish, chem, kg, line, emp }) {
    const d = new Date(this.t);
    const p = (n) => String(n).padStart(2, '0');
    const day = `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
    const n = this.batches.filter((b) => b.no.startsWith('RP-' + day)).length + 1;
    const no = `RP-${day}-${p(n)}`;
    const b = { id: no, no, ral: ral || 'RAL', name: name || '', finish: finish || 'глянец', chem: chem || 'полиэстер', kg: Number(kg) || 0, line: line || 'Линия 1', emp: emp || 'Оператор', made: this.t, shelfMonths: 12, status: 'work', dE: null };
    this.batches.unshift(b);
    return b;
  }

  setBatch(id, patch) {
    const b = this.batches.find((x) => x.id === id);
    if (b) Object.assign(b, patch);
  }

  kpi() {
    const act = this.items.filter((i) => i.level === 'act').length;
    const watch = this.items.filter((i) => i.level === 'watch').length;
    const measured = this.batches.filter((b) => b.dE != null);
    const okN = measured.filter((b) => b.dE <= this.settings.tol).length;
    return {
      act, watch, sensors: this.sensors.length,
      work: this.batches.filter((b) => b.status === 'work' || b.status === 'qc').length,
      inTol: measured.length ? Math.round((okN / measured.length) * 100) : null,
    };
  }

  stageState(id) {
    const list = this.sensors.filter((s) => s.st === id);
    let lvl = 'ok';
    for (const s of list) {
      const st = this.status(s);
      if (st === 'act') return 'act';
      if (st === 'watch') lvl = 'watch';
    }
    return lvl;
  }

  /** Ответ помощника технолога (демо: по правилам и базе знаний; в продукте — локальная языковая модель) */
  assistant(q, extra = []) {
    const t = (q || '').toLowerCase();
    const open = [...this.items, ...extra].filter((i) => i.level !== 'ok');
    const lines = [];
    const list = (arr) => arr.map((i) => `• ${i.text}${i.advice ? '\n   Что проверить: ' + i.advice : ''}`).join('\n');
    const has = (...w) => w.some((x) => t.includes(x));
    if (has('цвет', 'колорант', 'добав', 'оттенок', 'ral', 'delta', 'δe')) {
      const de = this.sensors.find((s) => s.id === 'dE');
      lines.push(`Текущее ΔE: ${fmt(de.value, 2)} при допуске ≤ ${fmt(this.settings.tol, 1)}.`);
      lines.push('Чтобы узнать, какой колорант и сколько % добавить, откройте вкладку «Цвет»: укажите эталон (RAL или замер), покажите образец на графике a*b* и ползунком L*. Программа предложит дозу первым неполным шагом, после замера уточнит её.');
      const q2 = this.batches.filter((b) => b.status === 'qc');
      if (q2.length) lines.push(`На контроле цвета сейчас: ${q2.map((b) => `${b.no} (${b.ral}, ΔE ${fmt(b.dE, 1)})`).join(', ')}.`);
    } else if (has('печ', 'полимер', 'отвержд', 'pmt', 'конвейер')) {
      const g = (id) => this.sensors.find((s) => s.id === id);
      lines.push(`Печь ${fmt(g('oven').value, 0)} °C, металл (PMT) ${fmt(g('pmt').value, 0)} °C, конвейер ${fmt(g('belt').value, 2)} м/мин, время в печи ${fmt(g('dwell').value, 1)} мин.`);
      const c = open.filter((i) => ['oven', 'belt', 'pmt', 'dwell'].includes(i.key));
      lines.push(c.length ? 'Есть отклонения:\n' + list(c) : 'Режим полимеризации в норме.');
    } else if (has('партия', 'партии', 'паспорт', 'этикет', 'срок')) {
      const w = this.batches.filter((b) => b.status !== 'done');
      lines.push(`В работе и на контроле: ${w.length}. ${w.map((b) => `${b.no} (${b.ral})`).join(', ') || '—'}.`);
      lines.push('Паспорт качества и этикетку можно распечатать на вкладке «Партии».');
    } else if (has('брак', 'почему', 'причин', 'что случ', 'проблем', 'отклонен', 'тревог', 'что не так')) {
      lines.push(open.length ? 'Сейчас видны такие отклонения и возможные причины:\n' + list(open) : 'Отклонений нет: все параметры в норме.');
    } else {
      lines.push(open.length ? `Сейчас отклонений: ${open.length}.\n${list(open.slice(0, 3))}` : 'Все параметры линии в норме.');
      lines.push('Спросите, например: «почему растёт брак», «что с печью», «какой колорант добавить», «что по партиям».');
    }
    return lines.join('\n\n');
  }
}
