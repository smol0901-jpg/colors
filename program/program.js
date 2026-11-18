/* Страница «Программа под ваше производство»: калькулятор выгоды и помощник с готовыми вопросами. Расчёты иллюстративные. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (n, d = 0) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d });
const rub = (n) => (n >= 1e6 ? nf(n / 1e6, n >= 1e7 ? 1 : 2) + ' млн ₽' : n >= 1e3 ? nf(Math.round(n / 1e3)) + ' тыс ₽' : nf(Math.round(n)) + ' ₽');
const rubS = (n) => (n >= 1e6 ? nf(n / 1e6, 1) + ' млн' : n >= 1e3 ? nf(Math.round(n / 1e3)) + ' тыс' : nf(Math.round(n)));
const IMG = '../img/agent/cam-line3.jpg';

/* ---------- калькулятор ---------- */
const FIELDS = [
  { k: 'tons', t: 'Выпуск, т/мес', min: 10, max: 1000, step: 10, v: 120, f: (v) => nf(v) + ' т', h: 'все линии, которые хотите подключить' },
  { k: 'defPct', t: 'Брак и переделка, % выпуска', min: 0.5, max: 8, step: 0.1, v: 2.5, f: (v) => nf(v, 1) + ' %', h: 'списание, корректировка, перепроизводство' },
  { k: 'defPrice', t: 'Потери на 1 кг брака, ₽', min: 50, max: 600, step: 10, v: 220, f: (v) => nf(v) + ' ₽', h: 'материалы, энергия, переработка, утилизация' },
  { k: 'downH', t: 'Внеплановые простои, ч/мес', min: 0, max: 120, step: 1, v: 14, f: (v) => nf(v) + ' ч', h: 'остановки линии по поломкам и сбоям' },
  { k: 'hourCost', t: 'Потери за час простоя, ₽/ч', min: 5000, max: 300000, step: 5000, v: 50000, f: (v) => rubS(v) + ' ₽', h: 'недовыпуск, простой людей, срыв сроков' },
  { k: 'repair', t: 'Аварийный ремонт и запчасти, ₽/год', min: 0, max: 10e6, step: 100000, v: 1.5e6, f: (v) => rub(v), h: 'внеплановые замены узлов' },
  { k: 'claims', t: 'Рекламации и перекрас, ₽/год', min: 0, max: 10e6, step: 100000, v: 0.6e6, f: (v) => rub(v), h: 'возвраты, скидки, повторные поставки' },
];
const SCN = {
  cons: { name: 'Осторожный', red: { defects: 0.1, down: 0.15, repair: 0.1, claims: 0.1 } },
  typ: { name: 'Типовой', red: { defects: 0.25, down: 0.3, repair: 0.25, claims: 0.25 } },
  opt: { name: 'Оптимистичный', red: { defects: 0.4, down: 0.45, repair: 0.35, claims: 0.4 } },
};
const ITEMS = [
  { k: 'defects', n: 'Брак и переделка', c: '#46d391', why: 'отклонение режима ловится до выпуска партии, а камера видит вкрапления на ленте сразу' },
  { k: 'down', n: 'Простои', c: '#8fbcff', why: 'рост вибрации и нагрева виден за часы и дни, остановка переносится в плановое окно' },
  { k: 'repair', n: 'Ремонт и запчасти', c: '#f6c453', why: 'подшипник меняют до разрушения узла, запчасть заказана заранее' },
  { k: 'claims', n: 'Рекламации', c: '#ff9f7a', why: 'паспорт партии и история режимов дают причину и снимают спорные претензии' },
];
const S = { period: 12, scn: 'typ', cost: 0, ...Object.fromEntries(FIELDS.map((f) => [f.k, f.v])) };

function calc() {
  const loss = { defects: S.tons * 1000 * 12 * (S.defPct / 100) * S.defPrice, down: S.downH * 12 * S.hourCost, repair: S.repair, claims: S.claims };
  const red = SCN[S.scn].red;
  const save = Object.fromEntries(ITEMS.map((i) => [i.k, loss[i.k] * red[i.k]]));
  const year = Object.values(save).reduce((a, b) => a + b, 0), lossYear = Object.values(loss).reduce((a, b) => a + b, 0);
  const monthly = year / 12;
  const cum = (m) => { let s = 0; for (let i = 1; i <= m; i++) s += monthly * Math.min(1, i / 3); return s; };
  let pay = null;
  if (S.cost > 0) for (let m = 1; m <= 120; m++) if (cum(m) >= S.cost) { pay = m; break; }
  return { loss, save, year, lossYear, monthly, cum, pay };
}

function cumChart(C, w = 560, h = 230) {
  const M = 36, pad = { l: 46, r: 26, t: 14, b: 26 };
  const maxV = Math.max(C.cum(M), S.cost * 1.12, 1);
  const x = (m) => pad.l + (m / M) * (w - pad.l - pad.r), y = (v) => h - pad.b - (v / maxV) * (h - pad.t - pad.b);
  const pts = Array.from({ length: M + 1 }, (_, m) => [x(m), y(C.cum(m))]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);
  const sel = Math.min(S.period, M);
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Накопленная экономия по месяцам">
   <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46d391" stop-opacity=".45"/><stop offset="1" stop-color="#46d391" stop-opacity="0"/></linearGradient></defs>
   ${ticks.map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#fff" stroke-opacity=".12"/><text x="${pad.l - 6}" y="${y(v) + 3}" text-anchor="end" font-size="9.5" fill="#fff" fill-opacity=".65">${rubS(v)}</text>`).join('')}
   ${[0, 6, 12, 18, 24, 30, 36].map((m) => `<text x="${x(m)}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#fff" fill-opacity=".65">${m ? m + ' мес' : '0'}</text>`).join('')}
   <path d="${path}L${x(M)},${y(0)}L${x(0)},${y(0)}Z" fill="url(#cg)"/><path d="${path}" fill="none" stroke="#46d391" stroke-width="2.4" stroke-linejoin="round"/>
   <line x1="${x(3)}" x2="${x(3)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#fff" stroke-opacity=".3" stroke-dasharray="3 4"/><text x="${x(3) + 4}" y="${pad.t + 9}" font-size="9" fill="#fff" fill-opacity=".6">выход на эффект</text>
   ${S.cost > 0 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(S.cost)}" y2="${y(S.cost)}" stroke="#ff7a70" stroke-dasharray="5 4"/><text x="${w - pad.r}" y="${y(S.cost) - 5}" text-anchor="end" font-size="10" fill="#ff7a70">стоимость внедрения ${rubS(S.cost)} ₽</text>` : ''}
   ${C.pay && C.pay <= M ? `<circle cx="${x(C.pay)}" cy="${y(C.cum(C.pay))}" r="5" fill="#f6c453" stroke="#10202c" stroke-width="2"/><text x="${Math.min(w - 70, x(C.pay) + 8)}" y="${y(C.cum(C.pay)) + 16}" font-size="10.5" font-weight="700" fill="#f6c453">окупится за ${C.pay} мес</text>` : ''}
   <line x1="${x(sel)}" x2="${x(sel)}" y1="${y(0)}" y2="${y(C.cum(sel))}" stroke="#8fbcff" stroke-width="1.6"/><circle cx="${x(sel)}" cy="${y(C.cum(sel))}" r="5" fill="#8fbcff" stroke="#10202c" stroke-width="2"/>
   <text x="${Math.min(w - 8, x(sel) + (sel > 28 ? -8 : 8))}" y="${y(C.cum(sel)) - 9}" text-anchor="${sel > 28 ? 'end' : 'start'}" font-size="11.5" font-weight="800" fill="#8fbcff">${rubS(C.cum(sel))} ₽</text></svg>`;
}
function donut(vals, cols, label, sub) {
  const tot = vals.reduce((a, b) => a + b, 0) || 1, R = 46, Ci = 2 * Math.PI * R;
  let off = 0;
  const seg = vals.map((v, i) => { const l = (v / tot) * Ci, s = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${cols[i]}" stroke-width="16" stroke-dasharray="${l - 1.5} ${Ci - l + 1.5}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += l; return s; }).join('');
  return `<svg viewBox="0 0 120 120" style="width:100%;max-width:150px;display:block;margin:auto" role="img" aria-label="${esc(label)}"><circle r="${R}" cx="60" cy="60" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="16"/>${seg}<text x="60" y="58" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">${esc(label)}</text><text x="60" y="73" text-anchor="middle" font-size="8.5" fill="#fff" fill-opacity=".7">${esc(sub)}</text></svg>`;
}

function paintCalc() {
  const C = calc();
  $('#scn').textContent = 'сценарий: ' + SCN[S.scn].name.toLowerCase();
  $('#out').innerHTML = `
   <div class="seg" id="scnSeg" role="group" aria-label="Сценарий эффекта">${Object.entries(SCN).map(([k, v]) => `<button type="button" data-scn="${k}" aria-pressed="${S.scn === k}">${v.name}</button>`).join('')}</div>
   <div class="big">
    <div class="kpi"><span>Потери сейчас</span><b style="color:var(--bad)">${rub(C.lossYear)}</b><em>в год по вашим данным</em></div>
    <div class="kpi"><span>Сохраните за ${S.period} мес</span><b style="color:var(--ok)">${rub(C.cum(S.period))}</b><em>${nf((C.cum(S.period) / Math.max(1, C.lossYear / 12 * S.period)) * 100)} % от потерь за период</em></div>
    <div class="kpi"><span>Окупаемость</span><b>${S.cost > 0 ? (C.pay ? C.pay + ' мес' : 'дольше 10 лет') : 'после обследования'}</b><em>${S.cost > 0 ? 'при стоимости ' + rub(S.cost) : 'введите стоимость, если известна'}</em></div>
   </div>
   <div class="seg" id="perSeg" role="group" aria-label="Период">${[3, 6, 12, 24, 36].map((m) => `<button type="button" data-per="${m}" aria-pressed="${S.period === m}">${m} мес</button>`).join('')}</div>
   <div class="chartbox"><h4>Накопленная экономия по месяцам</h4>${cumChart(C)}</div>
   <div style="display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center" class="chartbox">${donut(ITEMS.map((i) => C.save[i.k]), ITEMS.map((i) => i.c), rubS(C.year), 'в год')}
     <div><h4>Откуда экономия в год</h4><ul class="why" style="color:var(--ink)">${ITEMS.map((i) => `<li style="background:#17212e;border-color:#2a3646;color:#eef1f5"><i style="background:${i.c}"></i><span><b style="font-weight:700">${i.n}</b><br><span style="font-size:12px;color:#a9b4c2">${i.why}</span></span><b>${rub(C.save[i.k])}</b></li>`).join('')}</ul></div></div>`;
  $('#out').querySelectorAll('[data-scn]').forEach((b) => b.addEventListener('click', () => { S.scn = b.dataset.scn; paintCalc(); }));
  $('#out').querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { S.period = +b.dataset.per; paintCalc(); }));
}
function initCalc() {
  $('#inp').innerHTML = FIELDS.map((f) => `<div class="row"><label for="f_${f.k}">${f.t}<output id="o_${f.k}">${f.f(f.v)}</output></label><input id="f_${f.k}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.v}"><small>${f.h}</small></div>`).join('')
    + `<div class="row"><label for="f_cost">Стоимость внедрения, ₽ (если известна)</label><input class="numin" id="f_cost" type="number" min="0" step="100000" placeholder="не знаю: посчитаем после обследования" inputmode="numeric"><small>нужна только для оценки срока окупаемости</small></div>`;
  FIELDS.forEach((f) => $('#f_' + f.k).addEventListener('input', (e) => { S[f.k] = +e.target.value; $('#o_' + f.k).textContent = f.f(S[f.k]); paintCalc(); }));
  $('#f_cost').addEventListener('input', (e) => { S.cost = Math.max(0, +e.target.value || 0); paintCalc(); });
  paintCalc();
}

/* ---------- иконки и карточки ---------- */
const I = {
  q: '<path d="M9 9a3 3 0 1 1 4 2.8c-.9.4-1 1-1 2M12 17.5v.1"/><circle cx="12" cy="12" r="9"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.1M4 12h.1M4 18h.1"/>',
  zap: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v2M12 16v2"/>',
  up: '<path d="M4 18l6-6 4 4 6-8M15 8h5v5"/>',
  wrench: '<path d="M14 4a4 4 0 0 0-4 5l-6 6 3 3 6-6a4 4 0 0 0 5-4l-3 2-2-2z"/>',
  tag: '<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  sensor: '<path d="M4 12a8 8 0 0 1 16 0M7 12a5 5 0 0 1 10 0"/><circle cx="12" cy="12" r="1.6"/><path d="M12 14v7"/>',
  cam: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  doc: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2.5 1.6-4.5 4-4.5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
};
const ico = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const gl = (label, value, tone, hint, children, cls = '', icon) => `<div class="gl ${cls}"><div class="gl-h">${icon ? ico(icon, 15) : ''}${label}</div>${value !== null && value !== undefined ? `<div class="gl-v ${tone ? 'c-' + tone : ''}">${value}</div>` : ''}${hint ? `<div class="gl-t">${hint}</div>` : ''}${children ? `<div class="gl-c">${children}</div>` : ''}</div>`;
const backdrop = (inner) => `<div class="bd"><img src="${IMG}" alt="" aria-hidden="true" loading="lazy"><div class="bd-s"></div><div class="bd-c">${inner}</div></div>`;
const bar = (v, c) => `<div class="bar"><i style="width:${Math.max(2, Math.min(100, v * 100))}%;background:${c}"></i></div>`;

function pfCurve() {
  const W = 560, H = 210, x = (t) => 30 + t * 500, y = (c) => 14 + (1 - c) * 160;
  const pts = Array.from({ length: 61 }, (_, i) => { const t = i / 60; const c = t < 0.45 ? 0.93 - 0.02 * t : 0.92 - Math.pow((t - 0.45) / 0.55, 2.2) * 0.85; return [x(t), y(c)]; });
  const P = x(0.62), F = x(0.95), path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const cy = (xx) => { const t = (xx - 30) / 500; return y(t < 0.45 ? 0.93 - 0.02 * t : 0.92 - Math.pow((t - 0.45) / 0.55, 2.2) * 0.85); };
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Кривая P–F: от первого признака до отказа">
   <rect x="${P}" y="14" width="${F - P}" height="160" fill="#f6c453" fill-opacity=".12"/>
   <line x1="30" x2="530" y1="${y(0.15)}" y2="${y(0.15)}" stroke="#ff7a70" stroke-dasharray="5 4"/><text x="34" y="${y(0.15) - 5}" font-size="10" fill="#ff7a70">отказ: линия стоит</text>
   <path d="${path}" fill="none" stroke="#46d391" stroke-width="2.6"/>
   <circle cx="${P}" cy="${cy(P)}" r="6" fill="#f6c453" stroke="#10202c" stroke-width="2"/><text x="${P - 6}" y="${cy(P) - 12}" text-anchor="end" font-size="11" font-weight="800" fill="#f6c453">P: система видит признак</text>
   <circle cx="${F}" cy="${cy(F)}" r="6" fill="#ff7a70" stroke="#10202c" stroke-width="2"/><text x="${F - 4}" y="${cy(F) + 20}" text-anchor="end" font-size="11" font-weight="800" fill="#ff7a70">F: отказ</text>
   <line x1="${P}" x2="${F}" y1="190" y2="190" stroke="#f6c453" stroke-width="2"/><path d="M${P} 185v10M${F} 185v10" stroke="#f6c453" stroke-width="2"/><text x="${(P + F) / 2}" y="204" text-anchor="middle" font-size="11" fill="#f6c453">время на плановое действие</text>
   <text x="30" y="204" font-size="9.5" fill="#fff" fill-opacity=".6">время →</text></svg>`;
}
function flowNodes(items) {
  return `<div style="display:grid;grid-template-columns:repeat(${items.length},minmax(0,1fr));gap:6px;align-items:stretch">${items.map((it, i) => `<div style="position:relative;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px 8px;text-align:center"><div style="color:#8fbcff;display:grid;place-items:center;margin-bottom:4px">${ico(it[0], 22)}</div><div style="font-size:12.5px;font-weight:700;line-height:1.2">${it[1]}</div><div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:3px;line-height:1.25">${it[2] || ''}</div>${i < items.length - 1 ? '<span style="position:absolute;right:-9px;top:50%;transform:translateY(-50%);color:#f2b705;font-size:14px;z-index:2">›</span>' : ''}</div>`).join('')}</div>`;
}

/* ---------- ответы помощника ---------- */
const PRESETS = [
  ['purpose', 'q', 'Для чего это нужно?', 'три главные потери'],
  ['need', 'list', 'Что для этого нужно?', 'датчики, камера, сервер'],
  ['helps', 'zap', 'Чем программа поможет?', 'видит раньше, чем ломается'],
  ['saves', 'coin', 'Сколько мы сохраним и за какой период?', 'по вашим цифрам'],
  ['why', 'up', 'Почему это выгодно бизнесу?', 'цепочка эффекта'],
  ['connect', 'wrench', 'Кто подключит оборудование?', 'три варианта'],
  ['cost', 'tag', 'Сколько это стоит?', 'из чего складывается'],
  ['start', 'flag', 'С чего начать?', 'пилот на одной линии'],
];
function answer(key) {
  const C = calc(), per = S.period;
  const tiles = (arr, cls = 'g3') => `<div class="gg ${cls}">${arr.join('')}</div>`;
  switch (key) {
    case 'purpose': return {
      steps: ['Беру ваши данные из калькулятора', 'Считаю структуру потерь', 'Сопоставляю с причинами на оборудовании'],
      title: 'Для чего нужна программа',
      p: ['Производство красок теряет деньги в трёх местах: брак и переделка партий, внеплановые остановки линии, аварийный ремонт и рекламации. Все три начинаются с небольшого отклонения, которое видно по датчикам задолго до результата.', `Программа нужна, чтобы увидеть это отклонение вовремя, объяснить причину и подсказать действие. По введённым вами данным потери сейчас составляют около ${rub(C.lossYear)} в год.`],
      g: backdrop(`<div style="display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center">${donut(ITEMS.map((i) => C.loss[i.k]), ITEMS.map((i) => i.c), rubS(C.lossYear), 'потери в год')}<div>${ITEMS.map((i) => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px"><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${i.c};margin-right:6px"></i>${i.n}</span><b>${rub(C.loss[i.k])}</b></div>${bar(C.loss[i.k] / Math.max(1, C.lossYear), i.c)}</div>`).join('')}</div></div>`) };
    case 'need': return {
      steps: ['Перебираю, что нужно на стороне оборудования', 'Добавляю данные и людей', 'Собираю минимальный состав для пилота'],
      title: 'Что нужно для работы системы',
      p: ['Для начала хватает того, что уже есть на линии, плюс точечные датчики и камера в проблемных местах. Всё остальное можно наращивать по мере результата.'],
      list: ['датчики температуры зон, давления, момента, вибрации и подшипников', 'камера над лентой для контроля чипсов и контрольных точек', 'шлюз и локальный сервер в цеху (интернет не нужен)', 'ваши технологические карты, нормы и история отказов', 'технолог, механик и специалист по АСУ для доступа к оборудованию'],
      g: backdrop(tiles([gl('Датчики', 'на оборудовании', 'b', 'температуры, давление, вибрация, момент, ток', '', '', 'sensor'), gl('Камера', 'над лентой', 'b', 'в пыленепроницаемом корпусе, с обдувом оптики', '', '', 'cam'), gl('Шлюз и сервер', 'в вашем цеху', 'b', 'данные остаются у вас', '', '', 'cpu'), gl('Нормы и история', 'ваши документы', 'b', 'рецептуры, допуски, отказы', '', '', 'doc'), gl('Люди', 'с двух сторон', 'b', 'технолог, механик, АСУ + наши специалисты', '', '', 'users'), gl('Пилот', 'одна линия', 'ok', 'проверяем эффект и масштабируем', '', '', 'flag')])) };
    case 'helps': return {
      steps: ['Сравниваю показания с нормами и трендом', 'Ищу признак раньше отказа', 'Подбираю действие'],
      title: 'Чем программа поможет',
      p: ['Главное преимущество в времени. Если ждать отказа, линия остановится сама. Если видеть первый признак (рост вибрации, нагрев, ползущий тренд), остаётся время на плановое действие: заказать запчасть, остановить в удобное окно, поправить режим.', 'Интервал между признаком и отказом зависит от узла: от нескольких часов до недель. Программа не обещает «знать всё», она сокращает число сюрпризов.'],
      g: backdrop(`<div class="chartbox" style="background:transparent;border:0;padding:0">${pfCurve()}</div>${tiles([gl('Видит раньше', 'тренд + прогноз', 'ok', 'до выхода за допуск', '', '', 'eye'), gl('Объясняет причину', 'по доказательствам', 'ok', 'график, кадр камеры, спектр', '', '', 'brain'), gl('Предлагает действие', 'что проверить', 'ok', 'и в какое окно', '', '', 'bell'), gl('Ведёт журнал', 'для проверок', 'ok', 'партии, режимы, отклонения', '', '', 'doc')], 'g2')}`) };
    case 'saves': return {
      steps: ['Беру потери из калькулятора', `Применяю сценарий «${SCN[S.scn].name.toLowerCase()}»`, 'Строю нарастание эффекта по месяцам'],
      title: 'Сколько вы сохраните и за какой период',
      p: [`По вашим данным и сценарию «${SCN[S.scn].name.toLowerCase()}» экономия составит около ${rub(C.year)} в год. Эффект нарастает первые три месяца: на третий месяц система выходит на полную силу.`, `Накопленно: за 3 месяца ${rub(C.cum(3))}, за 6 месяцев ${rub(C.cum(6))}, за 12 месяцев ${rub(C.cum(12))}, за 24 месяца ${rub(C.cum(24))}. ${S.cost > 0 ? (C.pay ? 'При введённой стоимости внедрения окупаемость ' + C.pay + ' мес.' : 'При введённой стоимости окупаемость дольше 10 лет.') : 'Стоимость внедрения называем после обследования: тогда можно будет посчитать срок окупаемости.'}`, 'Почему так: большая часть экономии идёт от раннего предупреждения, которое переносит остановку в плановое окно и ловит отклонение до выпуска партии. Это допущения, и они проверяются на пилоте.'],
      g: backdrop(`<div class="chartbox" style="background:transparent;border:0;padding:0">${cumChart(C)}</div>${tiles([gl('За 12 мес', rub(C.cum(12)), 'ok', 'накопленная экономия'), gl('За 24 мес', rub(C.cum(24)), 'ok', 'накопленная экономия'), gl('Потери сейчас', rub(C.lossYear), 'bad', 'в год')])}`) };
    case 'why': return {
      steps: ['Строю цепочку причин и следствий', 'Сравниваю потери сейчас и после', 'Проверяю, из чего складывается эффект'],
      title: 'Почему это выгодно бизнесу',
      p: ['Выгода не в красивых графиках, а в простой цепочке: раньше увидели, раньше сработали, меньше потеряли. Каждая из четырёх статей потерь уменьшается своим механизмом.', `По вашим данным: сейчас ${rub(C.lossYear)} в год, после внедрения останется около ${rub(C.lossYear - C.year)}. Разница ${rub(C.year)} остаётся в бизнесе.`],
      g: backdrop(`${flowNodes([['sensor', 'Датчик и камера', 'видят отклонение'], ['brain', 'Программа', 'находит причину'], ['bell', 'Предупреждение', 'до брака и поломки'], ['wrench', 'Плановое действие', 'в удобное окно'], ['coin', 'Экономия', 'брак, простой, ремонт']])}<div class="gl wide"><div class="gl-h">Потери в год: сейчас и после</div><div style="margin-top:8px;display:grid;gap:8px"><div><div style="display:flex;justify-content:space-between;font-size:13px"><span>Сейчас</span><b class="c-bad">${rub(C.lossYear)}</b></div>${bar(1, '#ff7a70')}</div><div><div style="display:flex;justify-content:space-between;font-size:13px"><span>С системой</span><b class="c-ok">${rub(C.lossYear - C.year)}</b></div>${bar((C.lossYear - C.year) / Math.max(1, C.lossYear), '#46d391')}</div></div></div>`) };
    case 'connect': return {
      steps: ['Смотрю, какие силы есть у вас', 'Раскладываю роли', 'Фиксирую, что считается отдельно'],
      title: 'Кто подключит датчики и оборудование',
      p: ['Программу создаём под ваш проект и ваше производство. Подключение можно сделать тремя способами, выбирайте по своим ресурсам.'],
      list: ['ваши инженеры: подключают сами, мы даём схему, список точек и протоколы', 'совместно: мы настраиваем программную часть и сложные точки, ваши инженеры дают доступ и делают монтаж', 'под ключ: наши инженеры подключают всё оборудование, стоимость этих работ рассчитывается дополнительно после обследования'],
      g: backdrop(tiles([gl('1. Ваши инженеры', 'вы подключаете', 'b', 'мы: схема, точки, приём данных, настройка нормативов', '', '', 'users'), gl('2. Совместно', 'делим работу', 'b', 'мы: софт и сложные точки; вы: доступ и монтаж', '', '', 'users'), gl('3. Под ключ', 'мы подключаем', 'b', 'наши инженеры; стоимость работ считается отдельно', '', '', 'wrench')])) };
    case 'cost': return {
      steps: ['Перечисляю факторы объёма', 'Оцениваю влияние каждого', 'Фиксирую порядок расчёта'],
      title: 'Сколько это стоит',
      p: ['Стоимость зависит от объёма проекта, поэтому называть её без обследования нечестно. Она складывается из нескольких факторов и фиксируется в техническом задании.', 'Если подключение выполняют ваши инженеры, работы по монтажу в стоимость не входят. Если наши, их стоимость считается дополнительно.'],
      g: backdrop(`<div class="gl wide"><div class="gl-h">Что влияет на стоимость</div><div style="margin-top:8px;display:grid;gap:9px">${[['Число линий и точек контроля', 0.9], ['Типы оборудования и протоколы связи', 0.7], ['Камеры и контрольные точки по видео', 0.65], ['Сервер и видеокарта для нейросетей', 0.55], ['Интеграция с вашими системами', 0.5], ['Обучение смен и сопровождение', 0.4]].map(([n, v]) => `<div><div style="display:flex;justify-content:space-between;font-size:13px"><span>${n}</span></div>${bar(v, '#8fbcff')}</div>`).join('')}</div><div class="gl-t" style="margin-top:8px">Длина полосы показывает типовое влияние фактора; точный расчёт после обследования вашей линии.</div></div>`) };
    default: return {
      steps: ['Выбираю безопасный первый шаг', 'Определяю границы пилота', 'Расставляю этапы'],
      title: 'С чего начать',
      p: ['Лучше всего начать с одной линии или участка, где больше всего потерь. На ней проверяется эффект на ваших данных, а потом система распространяется на остальные линии.'],
      g: backdrop(flowNodes([['users', 'Знакомство', 'ваши линии и цели'], ['doc', 'ТЗ', 'состав, сроки, стоимость'], ['sensor', 'Пилот', 'подключение и нормы'], ['up', 'Проверка эффекта', 'до и после'], ['flag', 'Масштаб', 'остальные линии']])) };
  }
}

/* ---------- чат ---------- */
const chat = () => $('#chat');
let busy = false, curSkip = null;
function setBusy(b) { busy = b; document.querySelectorAll('#pre button').forEach((x) => (x.disabled = b)); $('#skip').hidden = !b; }
function paintPre() { $('#pre').innerHTML = PRESETS.map(([k, ic, t, s]) => `<button type="button" data-k="${k}"><i>${ico(ic, 20)}</i><span><b>${t}</b><span>${s}</span></span></button>`).join(''); }
function ask(key) {
  if (busy) return;
  const meta = PRESETS.find((p) => p[0] === key), a = answer(key);
  document.querySelectorAll('#pre button').forEach((b) => b.classList.toggle('on', b.dataset.k === key));
  const empty = $('.empty', chat()); if (empty) empty.remove();
  const me = document.createElement('div'); me.className = 'msg me'; me.innerHTML = `<div class="b">${esc(meta[2])}</div>`; chat().appendChild(me);
  const el = document.createElement('div'); el.className = 'msg bot';
  el.innerHTML = `<div class="av">${ico('brain', 20)}</div><div class="b"><div class="think"></div><div class="txt"></div><div class="ext"></div></div>`; chat().appendChild(el);
  const th = $('.think', el), tx = $('.txt', el), ex = $('.ext', el), full = a.p.join('\n');
  setBusy(true);
  let step = 0, chars = 0, timer = 0, done = false;
  const fin = () => {
    if (done) return; done = true; clearTimeout(timer);
    th.innerHTML = `<div class="steps">${a.steps.map((s) => `<span>${ico('check', 13)}${esc(s)}</span>`).join('')}</div>`;
    tx.innerHTML = `<h4>${esc(a.title)}</h4>${a.p.map((x) => `<p>${esc(x)}</p>`).join('')}${a.list ? `<ul>${a.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    ex.innerHTML = a.g + (key === 'saves' || key === 'purpose' || key === 'why' ? '<p style="margin:10px 0 0"><a href="#calc" style="color:var(--b);font-weight:700">Изменить данные в калькуляторе →</a></p>' : '');
    setBusy(false); curSkip = null; chat().scrollTop = chat().scrollHeight;
  };
  curSkip = fin;
  const tick = () => {
    if (done) return;
    if (step < a.steps.length) { step++; th.innerHTML = `<div class="steps">${a.steps.slice(0, step).map((s, i) => `<span>${i === step - 1 ? '<u></u>' : ico('check', 13)}${esc(s)}</span>`).join('')}</div>`; chat().scrollTop = chat().scrollHeight; timer = setTimeout(tick, 380); return; }
    chars = Math.min(full.length, chars + 7);
    tx.innerHTML = `<p>${esc(full.slice(0, chars)).replace(/\n/g, '</p><p>')}<span class="cur"></span></p>`; chat().scrollTop = chat().scrollHeight;
    if (chars >= full.length) { fin(); return; }
    timer = setTimeout(tick, 14);
  };
  tick();
}
document.addEventListener('click', (e) => { const b = e.target.closest('#pre [data-k]'); if (b) ask(b.dataset.k); });
$('#skip').addEventListener('click', () => curSkip && curSkip());
$('#clr').addEventListener('click', () => { if (busy) return; chat().innerHTML = '<div class="empty">Нажмите на вопрос слева, и помощник ответит с графикой.</div>'; document.querySelectorAll('#pre button').forEach((b) => b.classList.remove('on')); });

paintPre(); initCalc();
chat().innerHTML = '<div class="empty">Нажмите на вопрос слева, и помощник ответит с графикой.</div>';
