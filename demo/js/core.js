/**
 * NAP Paint — ядро демо: датчики линии порошковой окраски, имитатор, правила контроля,
 * прогноз тренда, партии и подсказки технологу.
 * Файл не зависит от браузера: тот же код можно запустить на локальном сервере (Node.js).
 * В рабочей системе имитатор заменяется реальными датчиками и приборами, а статистический
 * прогноз — обученной нейросетью (см. вкладку «Система»).
 */

export const STAGES = [
  { id: 'mix', name: 'Смешение' },
  { id: 'ext', name: 'Экструзия' },
  { id: 'mill', name: 'Помол' },
  { id: 'coat', name: 'Нанесение' },
  { id: 'cure', name: 'Полимеризация' },
  { id: 'qc', name: 'Контроль цвета' },
];

// Нормы условные (демо). В рабочей системе их задаёт технолог под рецептуру и регламент.
export const SENSORS = [
  { id: 'mix', st: 'mix', name: 'Смеситель', unit: 'об/мин', min: 400, max: 600, dec: 0, base: 500, amp: 12, per: 540, noise: 4 },
  { id: 'ext1', st: 'ext', name: 'Экструдер, зона 1', unit: '°C', min: 85, max: 105, dec: 1, base: 94, amp: 1.6, per: 720, noise: 0.3 },
  { id: 'ext2', st: 'ext', name: 'Экструдер, зона 2', unit: '°C', min: 95, max: 115, dec: 1, base: 105, amp: 1.6, per: 900, noise: 0.3 },
  { id: 'extl', st: 'ext', name: 'Нагрузка экструдера', unit: '%', min: 30, max: 85, dec: 0, base: 62, amp: 4, per: 600, noise: 1 },
  { id: 'mill', st: 'mill', name: 'Мельница, температура', unit: '°C', min: 15, max: 35, dec: 1, base: 26, amp: 1.5, per: 1200, noise: 0.3 },
  { id: 'asp', st: 'mill', name: 'Аспирация, разрежение', unit: 'Па', min: 800, max: 1500, dec: 0, base: 1150, amp: 40, per: 660, noise: 10 },
  { id: 'boothH', st: 'coat', name: 'Влажность камеры', unit: '%', min: 40, max: 60, dec: 0, base: 50, amp: 2.5, per: 1440, noise: 0.35 },
  { id: 'boothT', st: 'coat', name: 'Температура камеры', unit: '°C', min: 18, max: 28, dec: 1, base: 23, amp: 1, per: 1560, noise: 0.15 },
  { id: 'film', st: 'coat', name: 'Толщина покрытия', unit: 'мкм', min: 60, max: 100, dec: 0, base: 78, amp: 3, per: 480, noise: 0.9 },
  { id: 'oven', st: 'cure', name: 'Печь полимеризации', unit: '°C', min: 175, max: 205, dec: 0, base: 190, amp: 2, per: 780, noise: 0.4 },
  { id: 'belt', st: 'cure', name: 'Скорость конвейера', unit: 'м/мин', min: 1.5, max: 3, dec: 2, base: 2.2, amp: 0.04, per: 1020, noise: 0.008 },
  { id: 'pmt', st: 'cure', name: 'Температура металла (PMT)', unit: '°C', min: 170, max: 200, dec: 0, derived: true },
  { id: 'dwell', st: 'cure', name: 'Время в печи', unit: 'мин', min: 10, max: 25, dec: 1, derived: true },
  { id: 'dE', st: 'qc', name: 'ΔE цвета', unit: '', min: 0, max: 1, dec: 2, base: 0.45, amp: 0.08, per: 1800, noise: 0.025, one: 'hi' },
];

// Что обычно стоит за отклонением (демо-база знаний; в продукте наполняется вашими регламентами).
const KB = {
  mix: { high: ['Перегрев и пыление смеси: снизить обороты'], low: ['Смесь недостаточно гомогенна: проверить привод и загрузку'] },
  ext1: { high: ['Перегрев расплава: риск преждевременной полимеризации (гель-частицы). Снизить задание зоны'], low: ['Пигменты хуже диспергируются: проверить нагреватели зоны'] },
  ext2: { high: ['Перегрев расплава: риск гель-частиц. Проверить охлаждение и задание'], low: ['Недостаточный прогрев: проверить нагреватели и термопару'] },
  extl: { high: ['Перегрузка привода: проверить подачу и засорение'], low: ['Нестабильная подача: проверить дозатор'] },
  mill: { high: ['Перегрев помола: частицы склеиваются, мельница забивается. Проверить охлаждающий воздух'], low: ['Температура ниже нормы: проверить поток воздуха'] },
  asp: { high: ['Лишний поток уносит тонкие фракции: проверить заслонки'], low: ['Слабая аспирация: растёт запылённость, риск для безопасности. Проверить фильтры и вентилятор'] },
  boothH: { high: ['Порошок слипается и плохо подаётся: возможны пятна и неровная плёнка. Проверить осушение воздуха и влагоотделитель'], low: ['Растёт статика: хуже ложится в углублениях. Проверить приточный воздух'] },
  boothT: { high: ['Тёплый воздух ухудшает текучесть порошка: проверить вентиляцию'], low: ['Холодная камера: проверить приток и обогрев'] },
  film: { high: ['Перерасход порошка, риск «апельсиновой корки» и стекания. Проверить режим распыления'], low: ['Недостаточное укрытие: цвет может просвечивать. Проверить подачу и скорость конвейера'] },
  oven: { high: ['Перегрев: светлые цвета могут желтеть, меняется блеск. Проверить регулятор температуры'], low: ['Риск недоотверждения: слабая адгезия и стойкость. Проверить горелки или ТЭНы и термопары'] },
  belt: { high: ['Изделие проходит печь быстрее: риск недоотверждения. Снизить скорость'], low: ['Время в печи растёт: риск перегрева и смены цвета'] },
  pmt: { high: ['Металл перегрет: проверить задание печи и скорость конвейера'], low: ['Металл не прогрелся до режима: риск недоотверждения. Проверить массу изделий на подвеске и температуру печи'] },
  dwell: { high: ['Время в печи больше нормы: риск перегрева. Увеличить скорость'], low: ['Время полимеризации меньше нормы: риск недоотверждения. Снизить скорость конвейера или поднять температуру'] },
  dE: { high: ['Цвет вне допуска: сделать замер и рассчитать колорант на вкладке «Цвет», проверить режим печи'] },
};

const CORE = {
  limit: 'Страж параметров', trend: 'Прогноз отклонения', anomaly: 'Аномалия', cure: 'Контроль отверждения',
  color: 'Контроль цвета', safe: 'Безопасность', shelf: 'Срок хранения',
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
    this.sensors = SENSORS.map((s) => ({ ...s, value: s.base ?? 0, ts: now }));
    this.hist = Object.fromEntries(this.sensors.map((s) => [s.id, []]));
    this.inj = {};
    this.events = [];
    this.ack = {};
    this.items = [];
    this.batches = seedBatches(now);
    this.seq = 3;
    this.t = now - this.settings.histLen * this.settings.tickSec * 1000;
    this.phase = Object.fromEntries(this.sensors.map((s) => [s.id, this.rnd() * 6.28]));
    for (let i = 0; i < this.settings.histLen; i++) this.step(this.t + this.settings.tickSec * 1000, true);
    this.events = [];
    this.evaluate(now, true);
  }

  gauss() { return Math.sqrt(-2 * Math.log(1 - this.rnd())) * Math.cos(6.2832 * this.rnd()); }

  // сценарий демо: плавный сдвиг параметра, затем возврат
  offset(id, t) {
    const j = this.inj[id];
    if (!j) return 0;
    const el = (t - j.t0) / 1000;
    if (el < 0) return 0;
    const ramp = Math.min(1, el / 70);
    const fade = el > j.dur ? Math.max(0, 1 - (el - j.dur) / 40) : 1;
    if (el > j.dur + 40) { delete this.inj[id]; return 0; }
    return j.d * ramp * fade;
  }

  inject(kind) {
    const t0 = this.t;
    const sc = {
      humidity: { boothH: { d: 15, dur: 170 } },
      oven: { oven: { d: -20, dur: 170 } },
      belt: { belt: { d: 1.0, dur: 170 } },
      color: { dE: { d: 1.0, dur: 160 } },
      dust: { asp: { d: -450, dur: 170 } },
    }[kind];
    if (kind === 'reset') { this.inj = {}; return; }
    if (!sc) return;
    for (const id in sc) this.inj[id] = { t0, ...sc[id] };
  }

  step(now, silent) {
    const sec = now / 1000;
    this.t = now;
    const v = {};
    for (const s of this.sensors) {
      if (s.derived) continue;
      let x = s.base + s.amp * Math.sin((6.2832 * sec) / s.per + this.phase[s.id]) + s.noise * this.gauss();
      x += this.offset(s.id, now);
      v[s.id] = x;
    }
    v.pmt = v.oven - 6.5 + 0.4 * this.gauss();
    v.dwell = this.settings.ovenLen / Math.max(0.2, v.belt);
    for (const s of this.sensors) {
      s.value = v[s.id];
      s.ts = now;
      const h = this.hist[s.id];
      h.push(s.value);
      if (h.length > this.settings.histLen) h.shift();
    }
    this.sensors.find((s) => s.id === 'dE').max = this.settings.tol;
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
      const core = s.id === 'dwell' || s.id === 'pmt' ? CORE.cure : s.id === 'dE' ? CORE.color : s.id === 'asp' ? CORE.safe : CORE.limit;
      const base = `${s.name} ${fmt(v, s.dec)}${s.unit ? ' ' + s.unit : ''}`;
      const norm = s.one === 'hi' ? `допуск ≤ ${fmt(s.max, s.dec)}` : `норма ${fmt(s.min, s.dec)}…${fmt(s.max, s.dec)}`;
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
  assistant(q) {
    const t = (q || '').toLowerCase();
    const open = this.items.filter((i) => i.level !== 'ok');
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
