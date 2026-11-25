/* Коррекция цвета добавлением v2. Бесплатный инструмент для технолога: расчёт добавок по данным спектрофотометра,
   итерации с самообучением модели, нелинейная модель, профили базы, проверка метамерии, варианты с ценой,
   история и аналитика, протокол для печати. Все данные хранятся только в браузере пользователя. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (n, d = 2) => (Number.isFinite(n) ? Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−') : '—');
const pf = (v) => { const x = parseFloat(String(v).replace(',', '.').replace('−', '-')); return Number.isFinite(x) ? x : NaN; };
const num = (a) => String(a).replace('.', ',');

/* ---------- цвет ---------- */
function de00(l1, a1, b1, l2, a2, b2, kL = 1, kC = 1, kH = 1) {
  const rad = Math.PI / 180, deg = 180 / Math.PI, p7 = 25 ** 7;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + p7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = Math.atan2(b1, a1p) * deg; if (h1p < 0) h1p += 360; let h2p = Math.atan2(b2, a2p) * deg; if (h2p < 0) h2p += 360;
  const dLp = l2 - l1, dCp = C2p - C1p; let dhp = 0; if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2), Lbp = (l1 + l2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p; if (C1p * C2p !== 0) { hbp = (h1p + h2p) / 2; if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 180 : -180; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dT = 30 * Math.exp(-(((hbp - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + p7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T, Rt = -Math.sin(2 * dT * rad) * Rc;
  const x = dLp / (kL * Sl), y = dCp / (kC * Sc), z = dHp / (kH * Sh);
  return Math.sqrt(x * x + y * y + z * z + Rt * y * z);
}
const de76 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function de94(t, s) { const dL = s[0] - t[0], C1 = Math.hypot(t[1], t[2]), C2 = Math.hypot(s[1], s[2]), dC = C2 - C1, da = s[1] - t[1], db = s[2] - t[2], dH2 = Math.max(0, da * da + db * db - dC * dC); return Math.sqrt(dL * dL + (dC / (1 + 0.045 * C1)) ** 2 + dH2 / (1 + 0.015 * C1) ** 2); }
const ML = () => ({ '00': 'ΔE00', 94: 'ΔE94', ab: 'ΔE*ab' }[S.metric] || 'ΔE00');
function relabel(root = document.body) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (/ΔE(00|94|\*ab)/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/ΔE(00|94|\*ab)/g, ML()); }
function lab2rgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, f = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const X = 0.95047 * f(fx), Y = f(fy), Z = 1.08883 * f(fz);
  const r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, bl = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  const gm = (c) => { c = Math.max(0, Math.min(1, c)); return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)); };
  return `rgb(${gm(r)},${gm(g)},${gm(bl)})`;
}
function breakdown(t, s) {
  const dL = s[0] - t[0], dC = Math.hypot(s[1], s[2]) - Math.hypot(t[1], t[2]);
  const dH2 = Math.max(0, (s[1] - t[1]) ** 2 + (s[2] - t[2]) ** 2 - dC * dC - 0), dH = Math.sqrt(dH2);
  const hs = Math.atan2(s[2], s[1]), ht = Math.atan2(t[2], t[1]); let dh = hs - ht; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
  return { dL, dC, dH: dh >= 0 ? dH : -dH };
}

/* ---------- приборы ---------- */
const INST = [
  { id: 'byk', name: 'BYK spectro2guide', tag: 'd/8°, D65/10°, блеск 60°', noise: 0.1, angles: 1, modes: ['без выбора'], gloss: true, note: 'Берите значения L*a*b* и блеск 60° GU с экрана «Быстрое измерение». ΔE на экране прибора считается по формуле CIE94: инструмент показывает её тоже. На экране видна серия замеров (например, 1/5, 2/5): введите их все, и результат усредняется.' },
  { id: 'my', name: 'Другой мой прибор', tag: 'настраиваемый', noise: 0.15, angles: 1, editable: true, modes: ['SCI', 'SCE', 'без выбора'], note: 'Укажите режим, как на вашем приборе, и допуск повторяемости по паспорту. Эталон и образец измеряйте одинаково.' },
  { id: 'sph', name: 'Сферический d/8°', tag: 'лабораторный и портативный', noise: 0.05, angles: 1, modes: ['SCI', 'SCE'], note: 'Основной тип для порошковых красок. SCI не зависит от блеска и лучше подходит для сравнения цвета, SCE ближе к визуальному впечатлению.' },
  { id: 'g45', name: 'Геометрия 45°/0°', tag: 'портативный', noise: 0.1, angles: 1, modes: ['без выбора'], note: 'Близок к визуальной оценке, но зависит от блеска и фактуры: эталон и образец должны иметь одинаковый блеск.' },
  { id: 'ma', name: 'Многоугловой', tag: 'металлики и эффекты', noise: 0.12, angles: 3, modes: ['без выбора'], note: 'Для металликов и эффектов: значения под тремя углами (15°, 45°, 110°), главный вес у 45°.' },
  { id: 'col', name: 'Колориметр', tag: 'простой, только L*a*b*', noise: 0.2, angles: 1, modes: ['без выбора'], note: 'Даёт только L*a*b* без спектра. Для сравнения образцов одного типа подходит, при смене пигментов точность ниже.' },
];
const ANG = [{ n: '45°', w: 0.5 }, { n: '15°', w: 0.25 }, { n: '110°', w: 0.25 }];

/* ---------- колоранты (чувствительность на +0,1 % к массе замеса, средняя база) ---------- */
const COL0 = [
  { id: 'w', sh: 'TiO₂', n: 'Диоксид титана', ci: 'P.W.6', s: [0.35, -0.02, -0.08], c: '#f4f5f6', kind: 'w', price: 350 },
  { id: 'k', sh: 'Сажа', n: 'Сажа', ci: 'P.Bk.7', s: [-2.6, 0, -0.35], c: '#1c1f24', kind: 'k', price: 450 },
  { id: 'r', sh: 'Fe красный', n: 'Оксид железа красный', ci: 'P.R.101', s: [-0.35, 1.05, 0.55], c: '#b4483a', kind: 'c', price: 250 },
  { id: 'y', sh: 'Fe жёлтый', n: 'Оксид железа жёлтый', ci: 'P.Y.42', s: [-0.05, 0.15, 1.35], c: '#c9993a', kind: 'c', price: 250 },
  { id: 'by', sh: 'BiVO₄', n: 'Висмут-ванадат жёлтый', ci: 'P.Y.184', s: [0.1, -0.2, 2.4], c: '#f2d21b', kind: 'c', price: 2200 },
  { id: 'u', sh: 'Ультрамарин', n: 'Ультрамарин', ci: 'P.B.29', s: [-0.55, 0.35, -1.3], c: '#3b4fa8', kind: 'c', price: 600 },
  { id: 'b', sh: 'Фталоцианин', n: 'Фталоцианин синий', ci: 'P.B.15:3', s: [-1.1, -0.45, -2.2], c: '#1b4fa0', kind: 'c', price: 1500 },
  { id: 'g', sh: 'Cr₂O₃ зелёный', n: 'Оксид хрома зелёный', ci: 'P.G.17', s: [-0.3, -0.55, 0.4], c: '#4f7a55', kind: 'c', price: 700 },
  { id: 'pg', sh: 'Фталоцианин зелёный', n: 'Фталоцианин зелёный', ci: 'P.G.7', s: [-1.2, -1.5, -0.35], c: '#1a7a52', kind: 'c', price: 1600 },
  { id: 'dpp', sh: 'DPP красный', n: 'Дикетопирролопиррол красный', ci: 'P.R.254', s: [-0.6, 1.6, 0.9], c: '#c0392b', kind: 'c', price: 2600 },
  { id: 'qv', sh: 'Хинакридон фиолетовый', n: 'Хинакридон фиолетовый', ci: 'P.V.19', s: [-0.9, 1.1, -0.9], c: '#8e3a8a', kind: 'c', price: 4200 },
];
const PROFILES = { light: { n: 'Светлая база', f: { w: 0.5, k: 1.2, c: 1.2 } }, mid: { n: 'Средняя база', f: { w: 1, k: 1, c: 1 } }, dark: { n: 'Тёмная база', f: { w: 1.4, k: 0.5, c: 0.65 } } };
const X0 = 40; // насыщение: при добавке 4 % эффект вдвое слабее линейного

/* ---------- состояние ---------- */
const K1 = 'cik-corr2', store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };
const P = store.get(K1 + '-p', {});
const S = {
  inst: P.inst || 'byk', metric: P.metric || '94', riskK: P.riskK || 1.5, dirty: false, view: null, model: null, geo: 'SCI', mode: 'pair', bt: 'made', maxN: 3, profile: P.profile || 'mid', nonlin: P.nonlin !== false, learn: P.learn !== false,
  myName: P.myName || '', myNoise: P.myNoise || 0.15, tol: P.tol || 1.0, kL: 1, kC: 1, kH: 1,
  std: [[43.47, 21.65, 19.67], [43.47, 21.65, 19.67], [43.47, 21.65, 19.67]], smp: [[42.62, 20.02, 19.9], [42.62, 20.02, 19.9], [42.62, 20.02, 19.9]], del: [[1.3, 1.2, 1.8], [1.3, 1.2, 1.8], [1.3, 1.2, 1.8]],
  ill2: { on: false, std: [45.0, -8.4, 14.5], smp: [46.2, -7.0, 16.6] },
  batchKg: 1000, sampleKg: 0.5, resB: 10, resS: 0.1, allowed: {}, content: {}, variant: 0,
  series: { on: false, std: [[43.47, 21.65, 19.67]], smp: [[42.62, 20.02, 19.9]] }, gl: { std: '', smp: '22,9' }, plan: { unit: 'pct', v: {} },
  sensP: P.sensP || {}, custom: P.custom || [], price: P.price || {}, meta: P.meta || { line: '', batch: '', color: '', tech: '' },
  steps: store.get(K1 + '-steps', []), hist: store.get(K1 + '-hist', []),
};
const colors = () => [...COL0, ...S.custom.map((c) => ({ ...c, kind: 'c' }))];
colors().forEach((c) => { if (S.allowed[c.id] === undefined) S.allowed[c.id] = true; });
const inst = () => INST.find((i) => i.id === S.inst);
const persist = () => store.set(K1 + '-p', { inst: S.inst, profile: S.profile, nonlin: S.nonlin, learn: S.learn, metric: S.metric, riskK: S.riskK, myName: S.myName, myNoise: S.myNoise, tol: S.tol, sensP: S.sensP, custom: S.custom, price: S.price, meta: S.meta });
const saveSteps = () => store.set(K1 + '-steps', S.steps), saveHist = () => store.set(K1 + '-hist', S.hist);
function sens(id) {
  const o = S.sensP[S.profile]?.[id]; if (o) return o;
  const c = colors().find((x) => x.id === id), f = PROFILES[S.profile]?.f?.[c.kind] ?? 1;
  return c.s.map((v) => v * f);
}
const price = (id) => (S.price[id] ?? colors().find((c) => c.id === id)?.price ?? 0);
const eff = (x) => (S.nonlin ? x / (1 + Math.abs(x) / X0) : x), inv = (y) => (S.nonlin ? y / (1 - Math.min(0.8, Math.abs(y) / X0) * Math.sign(y) * Math.sign(y)) : y);

/* ---------- расчёт ---------- */
function problem() {
  const na = inst().angles, rows = [];
  for (let k = 0; k < na; k++) {
    const tgt = S.std[k], cur = S.mode === 'pair' ? S.smp[k] : S.std[k].map((v, i) => v + S.del[k][i]);
    rows.push({ cur, tgt, w: na === 1 ? 1 : ANG[k].w, tag: na > 1 ? ANG[k].n : 'D65' });
  }
  if (S.ill2.on) rows.push({ cur: S.ill2.smp, tgt: S.ill2.std, w: 0.5, tag: 'A' });
  return rows;
}
const ddE = (r, c) => (S.metric === '94' ? de94(r.tgt, c) : S.metric === 'ab' ? de76(r.tgt, c) : de00(r.tgt[0], r.tgt[1], r.tgt[2], c[0], c[1], c[2], S.kL, S.kC, S.kH));
const wmean = (rows, f) => rows.reduce((a, r, k) => a + r.w * f(r, k), 0) / rows.reduce((a, r) => a + r.w, 0);
function solve(rows, ids, lo, hi) {
  const cols = ids.map(sens), n = ids.length, d = [], A = cols.map(() => []);
  rows.forEach((r) => { const sw = Math.sqrt(r.w); for (let c = 0; c < 3; c++) { d.push((r.tgt[c] - r.cur[c]) * sw); cols.forEach((s, j) => A[j].push(s[c] * sw)); } });
  const dot = (u, v) => u.reduce((a, x, i) => a + x * v[i], 0), lam = 0.03, G = A.map((u) => A.map((v) => dot(u, v))), h = A.map((u) => dot(u, d)), y = new Array(n).fill(0);
  for (let it = 0; it < 700; it++) for (let j = 0; j < n; j++) { let s = h[j]; for (let k = 0; k < n; k++) if (k !== j) s -= G[j][k] * y[k]; y[j] = Math.max(lo[j], Math.min(hi[j], s / (G[j][j] + lam))); }
  return y;
}
function roundMass(p, kg, res) { const m = (kg * 1000 * p) / 100; const r = Math.round(m / res) * res; return (r / (kg * 1000)) * 100; }
function predict(rows, ids, xs) { return rows.map((r) => r.cur.map((v, c) => v + ids.reduce((a, id, j) => a + sens(id)[c] * eff(xs[j]), 0))); }
function calc(opt = {}) {
  const rows = opt.rows || problem(), before = wmean(rows, (r) => ddE(r, r.cur));
  const ids = colors().filter((c) => S.allowed[c.id] && !(opt.exclude || []).includes(c.id)).map((c) => c.id), next = S.bt === 'next';
  const evalSub = (sub) => {
    const lo = sub.map((id) => (next && S.content[id] > 0 ? -eff(S.content[id] * 10) : 0)), hi = sub.map(() => eff(40));
    const y = solve(rows, sub, lo, hi), xs = y.map((v) => inv(v)).map((v, j) => Math.max(lo[j] ? inv(lo[j]) : 0, Math.min(40, v)));
    const ps = xs.map((x) => roundMass(x / 10, S.batchKg, S.resB)), xr = ps.map((p) => p * 10), used = sub.map((id, j) => ({ id, j, p: ps[j] })).filter((u) => Math.abs(u.p) > 1e-6);
    if (!used.length) return null;
    const sid = used.map((u) => u.id), sx = used.map((u) => xr[u.j]), pred = predict(rows, sid, sx), sc = wmean(rows, (r, k) => ddE(r, pred[k])), mass = used.reduce((a, u) => a + Math.abs(u.p), 0);
    const cost = used.reduce((a, u) => a + ((S.batchKg * Math.abs(u.p)) / 100) * price(u.id), 0);
    return { lines: used.map((u) => ({ id: u.id, p: u.p })), pred, sc, mass, cost, score: sc + 0.01 * mass + 0.03 * used.length };
  };
  const cand = [];
  const combos = (() => { let c = 1; for (let i = 0; i < Math.min(S.maxN, ids.length); i++) c = (c * (ids.length - i)) / (i + 1); return c; })();
  if (ids.length <= 8 && S.maxN <= 4 || combos < 400) {
    const rec = (st, cur) => { if (cur.length) { const c = evalSub(cur.slice()); if (c) cand.push(c); } if (cur.length === S.maxN) return; for (let i = st; i < ids.length; i++) { cur.push(ids[i]); rec(i + 1, cur); cur.pop(); } };
    rec(0, []);
  } else { // жадный подбор для большого числа пигментов
    const sel = [];
    for (let step = 0; step < Math.min(S.maxN, ids.length); step++) {
      let bestC = null, bestId = null;
      for (const id of ids) { if (sel.includes(id)) continue; const c = evalSub([...sel, id]); if (c && (!bestC || c.score < bestC.score)) { bestC = c; bestId = id; } }
      if (!bestC) break; sel.push(bestId); cand.push(bestC);
    }
  }
  cand.sort((a, b) => a.score - b.score);
  const seen = new Set(), vars = []; for (const c of cand) { const k = c.lines.map((l) => l.id).sort().join(); if (!seen.has(k)) { seen.add(k); vars.push(c); } if (vars.length === 4) break; }
  return { rows, before, vars };
}

/* ---------- интерфейс ---------- */
const fmtP = (v) => nf(v, Math.abs(v) < 0.1 ? 3 : 2);
const massStr = (kg) => (Math.abs(kg) < 1 ? nf(Math.abs(kg) * 1000, 0) + ' г' : nf(Math.abs(kg), 2) + ' кг');
function labIn(arr, key, k, names = ['L*', 'a*', 'b*']) { return names.map((t, c) => `<label class="lab"><span>${t}</span><input inputmode="decimal" data-lab="${key}|${k}|${c}" value="${num(arr[k][c])}"></label>`).join(''); }
const meanL = (rows) => { const v = rows.filter((r) => r.every(Number.isFinite)); return v.length ? [0, 1, 2].map((c) => v.reduce((a, r) => a + r[c], 0) / v.length) : [NaN, NaN, NaN]; };
function syncSeries() { if (S.series.on && inst().angles === 1) { S.std[0] = meanL(S.series.std); S.smp[0] = meanL(S.series.smp); } }
function seriesHtml() {
  const t = S.series, tr = (key, label) => `<div><h4>${label}</h4>${t[key].map((r, i) => `<div class="labs" style="margin-bottom:4px">${[0, 1, 2].map((c) => `<input inputmode="decimal" data-ser="${key}|${i}|${c}" value="${Number.isFinite(r[c]) ? num(r[c]) : ''}" placeholder="${['L*', 'a*', 'b*'][c]}" aria-label="${label} ${i + 1}">`).join('')}</div>`).join('')}</div>`;
  const spread = (key) => { const m = meanL(t[key]); const v = t[key].filter((r) => r.every(Number.isFinite)); return v.length > 1 ? Math.max(...v.map((r) => de94(m, r))) : 0; };
  return `<label class="ck" style="margin-top:10px"><input type="checkbox" id="serOn" ${t.on ? 'checked' : ''}><span><b>Серия замеров: усреднять</b><em>введите все замеры с прибора (1/5, 2/5…), берётся среднее</em></span></label>` + (t.on ? `<div class="ang"><div class="two">${tr('std', 'Эталон, замеры')}${tr('smp', 'Образец, замеры')}</div><div class="act"><button class="btn ghost" id="serAdd" type="button">+ замер</button><button class="btn ghost" id="serDel" type="button">− замер</button></div><p class="small" id="serSum">${serSummary()}</p></div>` : '');
}
function serSummary() {
  const t = S.series, spread = (key) => { const m = meanL(t[key]); const v = t[key].filter((r) => r.every(Number.isFinite)); return v.length > 1 ? Math.max(...v.map((r) => de94(m, r))) : 0; };
  return `Среднее: эталон ${meanL(t.std).map((x) => nf(x, 2)).join(' / ')}, образец ${meanL(t.smp).map((x) => nf(x, 2)).join(' / ')}. Разброс между замерами: эталон ${nf(spread('std'), 2)}, образец ${nf(spread('smp'), 2)}${spread('smp') > 0.5 || spread('std') > 0.5 ? '. Разброс большой: проверьте панель и перемерьте' : ''}.`;
}
function renderStatic() {
  const I = inst();
  $('#insts').innerHTML = INST.map((i) => `<button type="button" class="ic ${i.id === S.inst ? 'on' : ''}" data-inst="${i.id}"><b>${i.id === 'my' && S.myName ? esc(S.myName) : i.name}</b><span>${i.tag}</span></button>`).join('');
  $('#instNote').innerHTML = `<p class="small">${I.note}</p>` + (I.editable ? `<div class="row3"><label>Название прибора<input id="myName" value="${esc(S.myName)}" placeholder="например, ваша модель"></label><label>Допуск повторяемости, ΔE00<input id="myNoise" inputmode="decimal" value="${num(S.myNoise)}"></label></div>` : '');
  $('#geo').innerHTML = I.modes.length > 1 && I.modes[0] !== 'без выбора' ? `<div class="seg">${I.modes.map((m) => `<button type="button" data-geo="${m}" aria-pressed="${S.geo === m}">${m}</button>`).join('')}</div><p class="small">Измеряйте эталон и образец в одном режиме. Для сравнения цвета обычно берут SCI.</p>` : '';
  $('#modeSeg').innerHTML = `<button type="button" data-mode="pair" aria-pressed="${S.mode === 'pair'}">Эталон и образец</button><button type="button" data-mode="delta" aria-pressed="${S.mode === 'delta'}">Отклонение ΔL Δa Δb</button>`;
  $('#btSeg').innerHTML = `<button type="button" data-bt="made" aria-pressed="${S.bt === 'made'}">Готовый замес: только добавление</button><button type="button" data-bt="next" aria-pressed="${S.bt === 'next'}">Рецепт следующего замеса: плюс и минус</button>`;
  let lh = '';
  for (let k = 0; k < I.angles; k++) lh += `<div class="ang">${I.angles > 1 ? `<div class="angh">Угол ${ANG[k].n}</div>` : ''}<div class="two"><div><h4>Эталон</h4><div class="labs">${labIn(S.std, 'std', k)}</div></div><div>${S.mode === 'pair' ? `<h4>Образец (замес)</h4><div class="labs">${labIn(S.smp, 'smp', k)}</div>` : `<h4>Отклонение с прибора</h4><div class="labs">${labIn(S.del, 'del', k, ['ΔL*', 'Δa*', 'Δb*'])}</div>`}</div></div></div>`;
  if (I.angles === 1 && S.mode === 'pair') lh += seriesHtml();
  lh += `<h4 style="margin-top:12px">Блеск 60°, GU (необязательно)</h4><div class="two"><label class="lab"><span>Эталон</span><input inputmode="decimal" data-gl="std" value="${esc(S.gl.std)}" placeholder="—"></label><label class="lab"><span>Образец</span><input inputmode="decimal" data-gl="smp" value="${esc(S.gl.smp)}" placeholder="—"></label></div>`;
  lh += `<label class="ck" style="margin-top:10px"><input type="checkbox" id="ill2on" ${S.ill2.on ? 'checked' : ''}><span><b>Проверка метамерии: второй источник света (A)</b><em>цвет под другим освещением учитывается в расчёте</em></span></label>`;
  if (S.ill2.on) lh += `<div class="ang"><div class="two"><div><h4>Эталон, источник A</h4><div class="labs">${['L*', 'a*', 'b*'].map((t, c) => `<label class="lab"><span>${t}</span><input inputmode="decimal" data-ill="std|${c}" value="${num(S.ill2.std[c])}"></label>`).join('')}</div></div><div><h4>Образец, источник A</h4><div class="labs">${['L*', 'a*', 'b*'].map((t, c) => `<label class="lab"><span>${t}</span><input inputmode="decimal" data-ill="smp|${c}" value="${num(S.ill2.smp[c])}"></label>`).join('')}</div></div></div></div>`;
  $('#labs').innerHTML = lh;
  $('#sizes').innerHTML = `<label>Размер замеса, кг<input id="batchKg" inputmode="decimal" value="${num(S.batchKg)}"></label><label>Размер пробы, кг<input id="sampleKg" inputmode="decimal" value="${num(S.sampleKg)}"></label><label>Точность весов, замес, г<input id="resB" inputmode="decimal" value="${num(S.resB)}"></label><label>Точность весов, проба, г<input id="resS" inputmode="decimal" value="${num(S.resS)}"></label>`;
  $('#settings').innerHTML = `<div class="seg" style="align-items:center"><span class="small">База:</span>${Object.entries(PROFILES).map(([k, v]) => `<button type="button" data-prof="${k}" aria-pressed="${S.profile === k}">${v.n}</button>`).join('')}</div>
   <div class="seg" style="align-items:center;margin-top:8px"><span class="small">Формула ΔE:</span>${[['00', 'CIEDE2000'], ['94', 'CIE94 (как на BYK)'], ['ab', 'ΔE*ab']].map(([k, n]) => `<button type="button" data-met="${k}" aria-pressed="${S.metric === k}">${n}</button>`).join('')}</div><div class="seg" style="align-items:center;margin-top:8px"><span class="small">Допуск ΔE00:</span>${[0.5, 1, 1.5, 2].map((t) => `<button type="button" data-tol="${t}" aria-pressed="${S.tol === t}">${num(t)}</button>`).join('')}<span class="small">Жёлтая зона (риск) до:</span>${[1.25, 1.5, 2, 3].map((t) => `<button type="button" data-rk="${t}" aria-pressed="${S.riskK === t}">×${String(t).replace('.', ',')}</button>`).join('')}<span class="small">Пигментов в добавке (до 10):</span>${[1, 2, 3, 4, 5, 6, 8, 10].map((n) => `<button type="button" data-n="${n}" aria-pressed="${S.maxN === n}">${n}</button>`).join('')}</div>
   <div class="seg" style="margin-top:8px"><label class="ck"><input type="checkbox" id="nonlin" ${S.nonlin ? 'checked' : ''}><span><b>Нелинейная модель</b><em>большие добавки действуют слабее линейного расчёта</em></span></label><label class="ck"><input type="checkbox" id="learn" ${S.learn ? 'checked' : ''}><span><b>Самообучение по итерациям</b><em>после замера модель уточняет чувствительности</em></span></label></div>`;
  $('#cols').innerHTML = colors().map((c) => `<div class="colr"><label class="ck"><input type="checkbox" data-allow="${c.id}" ${S.allowed[c.id] ? 'checked' : ''}><i style="background:${c.c}"></i><span><b>${esc(c.n)}</b><em>${esc(c.ci || 'свой')}</em></span></label><label class="cont">в рецепте, %<input inputmode="decimal" data-cont="${c.id}" value="${S.content[c.id] != null ? num(S.content[c.id]) : ''}" placeholder="—"></label></div>`).join('');
  renderCal(); renderMeta();
}
const zone = (v) => (v <= S.tol ? 'ok' : v <= S.tol * S.riskK ? 'warn' : 'bad');
const ZL = { ok: 'в допуске', warn: 'риск', bad: 'вне допуска' };
const zbadge = (v) => `<span class="zb z-${zone(v)}">${ZL[zone(v)]}</span>`;
const unitP = (p) => String(+(S.plan.unit === 'pct' ? p : S.plan.unit === 'gb' ? (p / 100) * S.batchKg * 1000 : (p / 100) * S.sampleKg * 1000).toFixed(4)).replace('.', ',');
const toP = (x) => (S.plan.unit === 'pct' ? x : S.plan.unit === 'gb' ? (x / (S.batchKg * 1000)) * 100 : (x / (S.sampleKg * 1000)) * 100);
const shortName = (id) => { const c = colors().find((q) => q.id === id); return c ? c.sh || c.n.split(' ')[0] : id; };

function result(keep) {
  const out = $('#res'), I = inst();
  const raw = [...S.std.slice(0, I.angles), ...(S.mode === 'pair' ? S.smp.slice(0, I.angles) : S.del.slice(0, I.angles)), ...(S.ill2.on ? [S.ill2.std, S.ill2.smp] : [])].flat();
  if (raw.some((v) => !Number.isFinite(v)) || !(S.batchKg > 0)) { out.innerHTML = '<div class="warn">Заполните значения L*, a*, b* и размер замеса.</div>'; return; }
  const { rows, before, vars } = calc(), r0 = rows[0];
  if (S.view) S.view.auto = true;
  out._vars = vars; out._rows = rows; out._before = before; S.variant = Math.min(S.variant, Math.max(0, vars.length - 1));
  const best = vars[S.variant], bd = breakdown(r0.tgt, r0.cur);
  if (!keep) { S.dirty = false; S.plan.v = {}; if (best) best.lines.forEach((l) => (S.plan.v[l.id] = unitP(l.p))); }
  let h = `<div class="sw3">${[['Эталон', r0.tgt, 'swT'], ['Сейчас', r0.cur, 'swC'], ['После добавки (живой прогноз)', r0.cur, 'swP']].map(([t, l, id]) => `<div><i id="${id}" style="background:${lab2rgb(...l)}"></i><span>${t}</span><em id="${id}t">L ${nf(l[0], 1)} · a ${nf(l[1], 1)} · b ${nf(l[2], 1)}</em></div>`).join('')}</div>`;
  h += `<div class="kp"><div class="kpi"><span>Отклонение сейчас</span><b class="zt-${zone(before)}">ΔE00 ${nf(before)}</b>${zbadge(before)}<em>ΔE\u200b00 ${nf(de00(...r0.tgt, ...r0.cur))} · ΔE\u200b94 ${nf(de94(r0.tgt, r0.cur))} · ΔE*\u200bab ${nf(de76(r0.tgt, r0.cur))}</em></div><div class="kpi" id="kpP"></div></div>`;
  h += `<div class="zlegend"><span class="zb z-ok">в допуске ≤ ${num(S.tol)}</span><span class="zb z-warn">риск ${num(S.tol)}…${nf(S.tol * S.riskK, 2)}</span><span class="zb z-bad">вне допуска > ${nf(S.tol * S.riskK, 2)}</span></div>`;
  const tx = (v, a, b, t) => (Math.abs(v) < 0.15 ? '' : `${v > 0 ? a : b} на ${nf(Math.abs(v), 1)}${t}`);
  const parts = [tx(bd.dL, 'светлее', 'темнее', ' ед. L*'), tx(bd.dC, 'насыщеннее', 'тусклее', ' ед. C*'), tx(bd.dH, 'оттенок смещён', 'оттенок смещён', ' ед. H*')].filter(Boolean);
  h += `<div class="bdw"><b>Чем образец отличается от эталона:</b> ${parts.length ? parts.join(', ') : 'различий нет'}.${S.ill2.on ? ` Под источником A: ΔE00 ${nf(ddE(rows[rows.length - 1], rows[rows.length - 1].cur))}.` : ''}</div>`;
  { const ge = pf(S.gl.std), gs = pf(S.gl.smp); if (Number.isFinite(ge) && Number.isFinite(gs) && Math.abs(ge - gs) > 5) h += `<div class="warn">Блеск образца и эталона отличается на ${nf(Math.abs(ge - gs), 1)} GU. При разном блеске цвет сравнивается неточно: сначала выровняйте блеск (режим отверждения, текстура).</div>`; }
  if (before <= S.tol) h += `<div class="note ok">Цвет в допуске ΔE00 ≤ ${num(S.tol)}. Корректировка не нужна.</div>`;
  if (!best) h += '<div class="warn">Автоподбор с выбранными колорантами не нашёл добавку. Можно задать свои значения ниже или выбрать больше колорантов.</div>';
  else h += `<div class="vars">${vars.map((v, i) => `<button type="button" class="vr ${i === S.variant ? 'on' : ''}" data-var="${i}"><b>Вариант ${i + 1} <i class="zd z-${zone(v.sc)}"></i></b><span>${v.lines.map((l) => shortName(l.id)).join(' + ')}</span><em>ΔE00 ${nf(v.sc)} · ${nf(v.cost, 0)} ₽</em></button>`).join('')}</div>`;
  h += `<h4 style="margin:14px 0 4px">Мой рецепт добавок: правьте значения, прогноз пересчитывается сразу</h4><div id="liveIn"></div><div id="liveOut"></div>`;
  out.innerHTML = h;
  renderLiveIn(); updateLive(); renderSteps(); renderProto(); relabel();
}

/* ---------- живой рецепт добавок ---------- */
const UNITS = { pct: '% к массе замеса', gb: 'г на замес', gs: 'г на пробу' };
function planLines() {
  const out = [];
  for (const [id, v] of Object.entries(S.plan.v)) { const x = pf(v); if (!Number.isFinite(x) || x === 0) continue; const p = toP(x); out.push({ id, p: S.bt === 'made' ? Math.max(0, p) : p }); }
  return out.filter((l) => l.p !== 0);
}
function renderLiveIn() {
  const box = $('#liveIn'); if (!box) return;
  const ids = Object.keys(S.plan.v), free = colors().filter((c) => !ids.includes(c.id));
  const rows = ids.map((id) => { const c = colors().find((q) => q.id === id); if (!c) return ''; const p = toP(pf(S.plan.v[id]) || 0), mx = Math.max(0.5, Math.abs(p) * 2.2);
    return `<div class="lr" data-row="${id}"><i style="background:${c.c}"></i><span class="ln">${esc(c.sh || c.n)}</span><input type="range" min="${S.bt === 'made' ? 0 : -mx}" max="${mx}" step="0.005" value="${Number.isFinite(p) ? p : 0}" data-psl="${id}" aria-label="${esc(c.n)}, % к массе"><input class="lv" inputmode="decimal" data-plan="${id}" value="${S.plan.v[id] ?? ''}" aria-label="${esc(c.n)}"><button type="button" class="lx" data-prm="${id}" aria-label="Убрать">×</button></div>`; }).join('');
  box.innerHTML = `<div class="seg" style="margin-bottom:8px">${Object.entries(UNITS).map(([k, n]) => `<button type="button" data-punit="${k}" aria-pressed="${S.plan.unit === k}">${n}</button>`).join('')}</div>
   <div class="lrows">${rows || '<p class="small">Добавьте пигмент или нажмите «К рекомендации».</p>'}</div>
   <div class="act" style="margin:8px 0"><select id="padd" aria-label="Добавить пигмент"><option value="">+ добавить пигмент (до 10)</option>${free.map((c) => `<option value="${c.id}">${esc(c.n)}</option>`).join('')}</select><button class="btn ghost" id="planFill" type="button">К рекомендации</button><button class="btn ghost" id="planClear" type="button">Очистить</button></div>
   <div class="seg" style="align-items:center"><span class="small">Дозу всего рецепта:</span>${[0.5, 0.75, 1.25, 1.5, 2].map((m) => `<button type="button" data-pscale="${m}">×${String(m).replace('.', ',')}</button>`).join('')}</div>`;
}
function liveModel() {
  const rows = $('#res')._rows || problem(), lines = planLines(), ids = lines.map((l) => l.id), xs = lines.map((l) => l.p * 10);
  const pred = ids.length ? predict(rows, ids, xs) : rows.map((r) => r.cur.slice());
  const sc = wmean(rows, (r, k) => ddE(r, pred[k])), total = lines.reduce((a, l) => a + Math.abs(l.p), 0), cost = lines.reduce((a, l) => a + ((S.batchKg * Math.abs(l.p)) / 100) * price(l.id), 0);
  return { rows, lines, ids, xs, pred, sc, total, cost };
}
function updateLive() {
  const out = $('#liveOut'); if (!out) return;
  const M = liveModel(), r0 = M.rows[0], before = $('#res')._before, p0 = M.pred[0], bd = breakdown(r0.tgt, p0);
  $('#swP').style.background = lab2rgb(...p0); $('#swPt').textContent = `L ${nf(p0[0], 1)} · a ${nf(p0[1], 1)} · b ${nf(p0[2], 1)}`;
  const kp = `<span>Будет после добавки</span><b class="zt-${zone(M.sc)}">ΔE00 ${nf(M.sc)}</b>${zbadge(M.sc)}<em>${M.sc < before ? 'лучше на ' + nf(before - M.sc, 2) : M.sc > before ? 'хуже на ' + nf(M.sc - before, 2) : 'без изменений'} · проверить на пробе</em>`;
  $('#kpP').innerHTML = kp;
  const w = [];
  if (S.bt === 'made' && Object.values(S.plan.v).some((v) => pf(v) < 0)) w.push('Замес готов, убрать пигмент нельзя: отрицательные значения не учтены.');
  if (M.lines.length > 10) w.push('Больше 10 пигментов в одной добавке: лучше сократить.');
  if (M.total > 1.5) w.push('Суммарная добавка больше 1,5 %: расчёт менее точен, делайте в два шага.'); else if (M.total > 0.6) w.push('Добавка заметная: сначала сделайте пробу на малой массе.');
  const tab = M.lines.length ? `<div class="xw"><table class="tab"><thead><tr><th>Пигмент</th><th>% к массе</th><th>На пробу</th><th>На замес</th><th>К рецептуре</th></tr></thead><tbody>${M.lines.map((l) => { const c = colors().find((q) => q.id === l.id), cont = S.content[l.id], sg = l.p >= 0 ? '+' : '−'; return `<tr><td><i class="dot" style="background:${c.c}"></i>${esc(c.n)}</td><td>${sg}${fmtP(Math.abs(l.p))} %</td><td>${sg}${nf(Math.round(((S.sampleKg * 1000 * Math.abs(l.p)) / 100) / S.resS) * S.resS, S.resS < 1 ? 2 : 0)} г</td><td>${sg}${massStr((S.batchKg * l.p) / 100)}</td><td>${cont > 0 ? sg + nf(Math.abs(l.p) / cont * 100, 1) + ' %' : '<span class="small">% в рецепте не указан</span>'}</td></tr>`; }).join('')}</tbody></table></div><p class="small">Всего ${nf(M.total, 3)} % к массе, стоимость ${nf(M.cost, 0)} ₽.</p>` : '';
  out.innerHTML = `<div class="bdw">После добавок относительно эталона: ${[Math.abs(bd.dL) < 0.15 ? '' : `${bd.dL > 0 ? 'светлее' : 'темнее'} на ${nf(Math.abs(bd.dL), 1)} L*`, Math.abs(bd.dC) < 0.15 ? '' : `${bd.dC > 0 ? 'насыщеннее' : 'тусклее'} на ${nf(Math.abs(bd.dC), 1)} C*`, Math.abs(bd.dH) < 0.15 ? '' : `оттенок смещён на ${nf(Math.abs(bd.dH), 1)} H*`].filter(Boolean).join(', ') || 'различий нет'}.</div>${w.map((x) => `<div class="warn">${x}</div>`).join('')}${tab}
   <div class="pbar"><b>Карта цвета и масштаб</b><span class="seg"><button type="button" data-pz="out" aria-label="Отдалить">−</button><button type="button" data-pz="in" aria-label="Приблизить">+</button><button type="button" data-pz="fit">По точкам</button><button type="button" data-pz="2">±2</button><button type="button" data-pz="5">±5</button></span></div><div id="plotHost" class="plotw"></div><p class="small" id="plotNote"></p>
   <div id="doseC"></div>
   <div class="act"><button class="btn" id="planStep" type="button">Применить мой рецепт как шаг и ввести новый замер</button><button class="btn ghost" id="copy" type="button">Скопировать</button><button class="btn ghost" id="share" type="button">Ссылка на расчёт</button></div><p class="small">Расчёт ориентировочный. Окончательное решение и массы определяет технолог по результатам пробной добавки.</p>`;
  $('#res')._text = `Коррекция цвета · ${S.meta.color} ${S.meta.batch}\nОтклонение: ΔE00 ${nf(before)}\n` + M.lines.map((l) => `- ${colors().find((x) => x.id === l.id).n}: ${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))} % (${massStr((S.batchKg * l.p) / 100)})`).join('\n') + `\nПрогноз: ΔE00 ${nf(M.sc)} (${ZL[zone(M.sc)]})`;
  S.model = M; setupPlot(); drawPlot(); drawDose(M);
  const st = M.lines.length ? '' : ''; $('#res')._lines = M.lines; $('#res')._after = M.sc;
  renderProto(); relabel(out); relabel($('#kpP'));
}

/* ---------- карта цвета: масштаб, зоны, зум ---------- */
const Z = { W: 520, H: 360, x0: 130, x1: 504, y0: 26, y1: 326, lx: 78 };
const NICE = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
const zoneCache = {};
function contour(level, tgt) {
  const key = [level, S.metric, tgt.join(), S.kL, S.kC, S.kH].join('|'); if (zoneCache[key]) return zoneCache[key];
  const f = (da, db, dL = 0) => ddE({ tgt }, [tgt[0] + dL, tgt[1] + da, tgt[2] + db]), pts = [];
  for (let i = 0; i < 72; i++) { const th = (i / 72) * 2 * Math.PI, c = Math.cos(th), s = Math.sin(th); let lo = 0, hi = 80; for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (f(m * c, m * s) > level) hi = m; else lo = m; } pts.push([lo * c, lo * s]); }
  return (zoneCache[key] = pts);
}
function lRadius(level, tgt) { const f = (dL) => ddE({ tgt }, [tgt[0] + dL, tgt[1], tgt[2]]); let lo = 0, hi = 90; for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (f(m) > level) hi = m; else lo = m; } return lo; }
function fitView(M) {
  const t = M.rows[0].tgt, pts = [[0, 0], [M.rows[0].cur[1] - t[1], M.rows[0].cur[2] - t[2]], [M.pred[0][1] - t[1], M.pred[0][2] - t[2]]];
  let x = M.rows[0].cur.slice(1); M.lines.forEach((l) => { const s = sens(l.id), f = eff(l.p * 10); x = [x[0] + s[1] * f, x[1] + s[2] * f]; pts.push([x[0] - t[1], x[1] - t[2]]); });
  const r = contour(S.tol * S.riskK, t), ry = Math.max(...r.map((p) => Math.hypot(p[0], p[1])));
  const ex = Math.max(...pts.map((p) => Math.abs(p[0])), ry * 0.6) * 1.3 + 0.2, ey = Math.max(...pts.map((p) => Math.abs(p[1])), ry * 0.6) * 1.3 + 0.2;
  const k = Math.max(3, Math.min(400, Math.min((Z.x1 - Z.x0) / 2 / ex, (Z.y1 - Z.y0) / 2 / ey)));
  return { cx: 0, cy: 0, k };
}
function setupPlot() {
  const host = $('#plotHost'); if (!host) return;
  if (!S.view) S.view = { auto: true, ...fitView(S.model) };
  if (S.view.auto) Object.assign(S.view, fitView(S.model));
  if (host._ready) return; host._ready = true;
  const pts = new Map();
  const toU = (e) => { const r = host.getBoundingClientRect(), sx = Z.W / r.width; return { u: (e.clientX - r.left) * sx, v: (e.clientY - r.top) * sx }; };
  const zoomAt = (u, v, f) => { const V = S.view, ca = V.cx + (u - (Z.x0 + Z.x1) / 2) / V.k, cb = V.cy - (v - (Z.y0 + Z.y1) / 2) / V.k; V.k = Math.max(2, Math.min(800, V.k * f)); V.cx = ca - (u - (Z.x0 + Z.x1) / 2) / V.k; V.cy = cb + (v - (Z.y0 + Z.y1) / 2) / V.k; V.auto = false; drawPlot(); };
  host.addEventListener('wheel', (e) => { e.preventDefault(); const p = toU(e); zoomAt(p.u, p.v, e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
  host.addEventListener('pointerdown', (e) => { host.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); host._last = null; });
  host.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = host.getBoundingClientRect(), sx = Z.W / r.width, V = S.view;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (host._d) { const p = toU({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); zoomAt(p.u, p.v, d / host._d); } host._d = d; }
    else { V.cx -= ((e.clientX - prev.x) * sx) / V.k; V.cy += ((e.clientY - prev.y) * sx) / V.k; V.auto = false; drawPlot(); }
  });
  const up = (e) => { pts.delete(e.pointerId); host._d = 0; }; host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
}
function drawPlot() {
  const host = $('#plotHost'), M = S.model; if (!host || !M) return;
  const V = S.view, t = M.rows[0].tgt, cur = M.rows[0].cur, pr = M.pred[0], X = (da) => (Z.x0 + Z.x1) / 2 + (da - V.cx) * V.k, Y = (db) => (Z.y0 + Z.y1) / 2 - (db - V.cy) * V.k;
  const step = NICE.find((n) => n * V.k >= 44) || 50, a0 = V.cx - (Z.x1 - Z.x0) / 2 / V.k, a1 = V.cx + (Z.x1 - Z.x0) / 2 / V.k, b0 = V.cy - (Z.y1 - Z.y0) / 2 / V.k, b1 = V.cy + (Z.y1 - Z.y0) / 2 / V.k;
  const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('') + 'Z';
  const g = [], gt = [];
  for (let a = Math.ceil(a0 / step) * step; a <= a1; a += step) { g.push(`<line x1="${X(a)}" x2="${X(a)}" y1="${Z.y0}" y2="${Z.y1}" stroke="#fff" stroke-opacity="${Math.abs(a) < 1e-9 ? 0.45 : 0.1}"/>`); gt.push(`<text x="${X(a)}" y="${Z.y1 + 14}" font-size="10" text-anchor="middle" fill="#fff" fill-opacity=".8">${nf(a, step < 1 ? 2 : 0)}</text>`); }
  for (let b = Math.ceil(b0 / step) * step; b <= b1; b += step) { g.push(`<line y1="${Y(b)}" y2="${Y(b)}" x1="${Z.x0}" x2="${Z.x1}" stroke="#fff" stroke-opacity="${Math.abs(b) < 1e-9 ? 0.45 : 0.1}"/>`); gt.push(`<text x="${Z.x0 - 6}" y="${Y(b) + 3}" font-size="10" text-anchor="end" fill="#fff" fill-opacity=".8">${nf(b, step < 1 ? 2 : 0)}</text>`); }
  const inner = contour(S.tol, t), outer = contour(S.tol * S.riskK, t);
  const pc = [[0, 0, 'эталон', '#46d391', 'e'], [cur[1] - t[1], cur[2] - t[2], 'сейчас', '#ff7a70', 'c'], [pr[1] - t[1], pr[2] - t[2], 'прогноз', '#f6c453', 'p']];
  const sp = pc.map((p) => ({ ...p, sx: X(p[0]), sy: Y(p[1]) })).sort((u, v) => u.sy - v.sy); for (let i = 1; i < sp.length; i++) if (Math.abs(sp[i].sy - sp[i - 1].sy) < 14 && Math.abs(sp[i].sx - sp[i - 1].sx) < 70) sp[i].sy = sp[i - 1].sy + 14;
  let ax = cur[1], ay = cur[2]; const arrows = M.lines.map((l) => { const s = sens(l.id), f = eff(l.p * 10), nx = ax + s[1] * f, ny = ay + s[2] * f, c = colors().find((q) => q.id === l.id).c, a = `<line x1="${X(ax - t[1])}" y1="${Y(ay - t[2])}" x2="${X(nx - t[1])}" y2="${Y(ny - t[2])}" stroke="${c === '#f4f5f6' ? '#cfd6dd' : c}" stroke-width="3" stroke-linecap="round"/>`; ax = nx; ay = ny; return a; }).join('');
  // шкала L*
  const Lg = lRadius(S.tol, t), Ly = lRadius(S.tol * S.riskK, t), dLc = cur[0] - t[0], dLp = pr[0] - t[0], Lr = Math.max(Ly * 1.6, Math.abs(dLc) * 1.3, Math.abs(dLp) * 1.3, 1.5), LY = (d) => (Z.y0 + Z.y1) / 2 - (d / Lr) * ((Z.y1 - Z.y0) / 2), Lstep = NICE.find((n) => (n / Lr) * ((Z.y1 - Z.y0) / 2) >= 28) || 50;
  const band = (d0, d1, col, op) => `<rect x="${Z.lx - 7}" y="${LY(d1)}" width="14" height="${Math.max(0, LY(d0) - LY(d1))}" fill="${col}" fill-opacity="${op}"/>`;
  const Lticks = []; for (let v = -Math.floor(Lr / Lstep) * Lstep; v <= Lr; v += Lstep) Lticks.push(`<line x1="${Z.lx + 7}" x2="${Z.lx + 12}" y1="${LY(v)}" y2="${LY(v)}" stroke="#fff" stroke-opacity=".5"/><text x="${Z.lx + 15}" y="${LY(v) + 3}" font-size="9.5" fill="#fff" fill-opacity=".75">${nf(v, Lstep < 1 ? 1 : 0)}</text>`);
  const Lmark = (d, col, lab) => `<path d="M${Z.lx - 9},${LY(d)} l-8,-5 v10z" fill="${col}"/><text x="${Z.lx - 20}" y="${LY(d) + 3}" font-size="9.5" text-anchor="end" fill="${col}">${lab}</text>`;
  host.innerHTML = `<svg viewBox="0 0 ${Z.W} ${Z.H}" role="img" aria-label="Карта цвета с зонами допуска, масштабом и прогнозом" style="touch-action:none;cursor:grab"><defs><clipPath id="pc"><rect x="${Z.x0}" y="${Z.y0}" width="${Z.x1 - Z.x0}" height="${Z.y1 - Z.y0}"/></clipPath></defs><rect width="${Z.W}" height="${Z.H}" rx="14" fill="#10202c"/>
   <g clip-path="url(#pc)"><rect x="${Z.x0}" y="${Z.y0}" width="${Z.x1 - Z.x0}" height="${Z.y1 - Z.y0}" fill="#ff7a70" fill-opacity=".10"/><path d="${poly(outer)}" fill="#f6c453" fill-opacity=".22" stroke="#f6c453" stroke-width="1.5"/><path d="${poly(inner)}" fill="#46d391" fill-opacity=".28" stroke="#46d391" stroke-width="1.5"/>${g.join('')}${arrows}
   ${pc.map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${p[4] === 'e' ? 6 : 5.5}" fill="${p[3]}" stroke="#10202c" stroke-width="2"/>`).join('')}</g>
   ${sp.map((p) => `<text x="${p.sx + 10 > Z.x1 - 50 ? p.sx - 10 : p.sx + 10}" y="${p.sy - 8}" font-size="11" font-weight="700" text-anchor="${p.sx + 10 > Z.x1 - 50 ? 'end' : 'start'}" fill="${p[3]}" stroke="#10202c" stroke-width="3" paint-order="stroke">${p[2]}</text>`).join('')}
   ${gt.join('')}<rect x="${Z.x0}" y="${Z.y0}" width="${Z.x1 - Z.x0}" height="${Z.y1 - Z.y0}" fill="none" stroke="#fff" stroke-opacity=".3"/>
   <text x="${Z.x1}" y="${Z.y1 + 30}" font-size="10" text-anchor="end" fill="#fff" fill-opacity=".75">Δa* (красный →)</text><text x="${Z.x1}" y="${Z.y0 - 8}" font-size="10" text-anchor="end" fill="#fff" fill-opacity=".75">Δb* (жёлтый ↑)</text>
   <rect x="${Z.lx - 7}" y="${Z.y0}" width="14" height="${Z.y1 - Z.y0}" fill="#ff7a70" fill-opacity=".14"/>${band(-Ly, Ly, '#f6c453', 0.3)}${band(-Lg, Lg, '#46d391', 0.45)}<text x="${Z.lx}" y="${Z.y0 - 8}" font-size="10" text-anchor="middle" fill="#fff" fill-opacity=".75">ΔL*</text>${Lticks.join('')}${Lmark(0, '#46d391', '0')}${Math.abs(dLc) > 1e-6 ? Lmark(dLc, '#ff7a70', 'сейчас') : ''}${Lmark(dLp, '#f6c453', 'прогноз')}
   <g transform="translate(${Z.x0 + 8} ${Z.y1 - 14})"><line x1="0" x2="${step * V.k}" y1="0" y2="0" stroke="#fff" stroke-width="2"/><path d="M0 -4v8M${step * V.k} -4v8" stroke="#fff" stroke-width="2"/><text x="${step * V.k + 6}" y="3.5" font-size="10.5" font-weight="700" fill="#fff">${nf(step, step < 1 ? 2 : 0)} ед. Lab</text></g></svg>`;
  $('#plotNote').innerHTML = `Масштаб: одна сетка = ${nf(step, step < 1 ? 2 : 0)} ед. a*/b*. Приближайте колесом мыши, щипком или кнопками, двигайте перетаскиванием. Зоны: зелёная в допуске (ΔE ≤ ${num(S.tol)}), жёлтая риск (до ${nf(S.tol * S.riskK, 2)}), красная вне допуска. Эллипсы построены по выбранной формуле ΔE при L* эталона, слева шкала ΔL*.`; relabel($('#plotNote'));
}
function drawDose(M) {
  const host = $('#doseC'); if (!host) return; if (!M.lines.length) { host.innerHTML = ''; return; }
  const ms = Array.from({ length: 51 }, (_, i) => i * 0.04), vals = ms.map((m) => { const pred = predict(M.rows, M.ids, M.xs.map((x) => x * m)); return wmean(M.rows, (r, k) => ddE(r, pred[k])); });
  const W = 520, H = 170, p = { l: 44, r: 12, t: 12, b: 26 }, ymax = Math.max(S.tol * S.riskK * 1.6, Math.min(Math.max(...vals), S.tol * S.riskK * 6)), x = (m) => p.l + (m / 2) * (W - p.l - p.r), y = (v) => H - p.b - (Math.min(v, ymax) / ymax) * (H - p.t - p.b);
  const bi = vals.indexOf(Math.min(...vals));
  host.innerHTML = `<h4 style="margin:14px 0 4px">Что будет, если добавить меньше или больше</h4><div class="doseb"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Отклонение в зависимости от дозы"><rect width="${W}" height="${H}" rx="12" fill="#10202c"/>
   <rect x="${p.l}" y="${y(S.tol)}" width="${W - p.l - p.r}" height="${y(0) - y(S.tol)}" fill="#46d391" fill-opacity=".22"/><rect x="${p.l}" y="${y(S.tol * S.riskK)}" width="${W - p.l - p.r}" height="${y(S.tol) - y(S.tol * S.riskK)}" fill="#f6c453" fill-opacity=".2"/><rect x="${p.l}" y="${p.t}" width="${W - p.l - p.r}" height="${y(S.tol * S.riskK) - p.t}" fill="#ff7a70" fill-opacity=".12"/>
   ${[0, 0.5, 1, 1.5, 2].map((m) => `<line x1="${x(m)}" x2="${x(m)}" y1="${p.t}" y2="${H - p.b}" stroke="#fff" stroke-opacity=".1"/><text x="${x(m)}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#fff" fill-opacity=".75">×${String(m).replace('.', ',')}</text>`).join('')}
   ${[0, S.tol, S.tol * S.riskK].map((v) => `<text x="${p.l - 6}" y="${y(v) + 3}" font-size="10" text-anchor="end" fill="#fff" fill-opacity=".75">${nf(v, 1)}</text>`).join('')}
   <path d="${ms.map((m, i) => `${i ? 'L' : 'M'}${x(m).toFixed(1)},${y(vals[i]).toFixed(1)}`).join('')}" fill="none" stroke="#8fbcff" stroke-width="2.4"/>
   <line x1="${x(1)}" x2="${x(1)}" y1="${p.t}" y2="${H - p.b}" stroke="#fff" stroke-dasharray="3 3"/><circle cx="${x(1)}" cy="${y(vals[25])}" r="5" fill="#fff" stroke="#10202c" stroke-width="2"/><text x="${x(1) + 8}" y="${y(vals[25]) - 8}" font-size="11" font-weight="700" fill="#fff">сейчас ${nf(vals[25], 2)}</text>
   <circle cx="${x(ms[bi])}" cy="${y(vals[bi])}" r="4.5" fill="#46d391" stroke="#10202c" stroke-width="2"/></svg></div><p class="small">Показано, как меняется ΔE при дозе от 0 до ×2 от вашего рецепта. ${bi === 25 ? 'Ваша доза уже близка к лучшей.' : `Лучший результат примерно при ×${nf(ms[bi], 2)} от вашей дозы (ΔE ${nf(vals[bi], 2)}).`} При ×0,5 будет ΔE ${nf(vals[12], 2)}, при ×1,5 ${nf(vals[37], 2)}.</p>`;
  relabel(host);
}

/* ---------- итерации, обучение, история ---------- */
function spark(vals) {
  if (vals.length < 1) return '';
  const W = 300, H = 70, mx = Math.max(...vals, S.tol * 1.2), x = (i) => 14 + (i / Math.max(1, vals.length - 1)) * (W - 28), y = (v) => H - 10 - (v / mx) * (H - 20);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:340px"><line x1="0" x2="${W}" y1="${y(S.tol)}" y2="${y(S.tol)}" stroke="#46d391" stroke-dasharray="4 3"/><text x="4" y="${y(S.tol) - 3}" font-size="9" fill="#46d391">допуск</text><path d="${vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')}" fill="none" stroke="#1f5fbf" stroke-width="2.4"/>${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#1f5fbf"/><text x="${x(i)}" y="${y(v) - 7}" text-anchor="middle" font-size="9" fill="currentColor">${nf(v, 2)}</text>`).join('')}</svg>`;
}
function renderSteps() {
  const box = $('#steps'), st = S.steps, open = st.find((s) => !s.after);
  const des = []; if (st.length) { des.push(st[0].deBefore); st.forEach((s) => s.after && des.push(s.deAfter)); }
  let h = st.length ? `<div class="two"><div>${spark(des)}<p class="small">ΔE00 по шагам коррекции</p></div><div><ol class="stl">${st.map((s, i) => `<li><b>Шаг ${i + 1}</b>: ${s.applied.map((a) => `${esc(colors().find((c) => c.id === a.id)?.n || a.id)} ${a.p >= 0 ? '+' : '−'}${fmtP(Math.abs(a.p))} %`).join(', ')}<br><span class="small">${s.after ? `замер после: ΔE00 ${nf(s.deAfter)} (прогноз был ${nf(s.pred)})` : 'ждёт нового замера'}</span></li>`).join('')}</ol></div></div>` : '<p class="small">Нажмите «Применить как шаг» в результате, добавьте колоранты в замес и введите новый замер здесь. Модель станет точнее под ваш замес.</p>';
  if (open) h += `<div class="ang"><h4>Новый замер образца после шага ${st.indexOf(open) + 1}</h4><div class="labs">${['L*', 'a*', 'b*'].map((t, c) => `<label class="lab"><span>${t}</span><input inputmode="decimal" id="nm${c}" placeholder="${t}"></label>`).join('')}</div><div class="act"><button class="btn" id="recStep" type="button">Записать замер${S.learn ? ' и обучить модель' : ''}</button><button class="btn ghost" id="cancelStep" type="button">Отменить шаг</button></div></div>`;
  if (st.length) h += `<div class="act"><button class="btn" id="finish" type="button">Завершить коррекцию и сохранить в историю</button><button class="btn ghost" id="clearSteps" type="button">Начать заново</button></div>`;
  box.innerHTML = h + `<div id="learnMsg" class="small"></div>`;
}
function applyStep(v0) {
  const v = v0 || $('#res')._vars?.[S.variant]; if (!v) return;
  const rows = problem(), before = wmean(rows, (r) => ddE(r, r.cur));
  S.steps.push({ ts: Date.now(), applied: v.lines.map((l) => ({ id: l.id, p: l.p })), before: rows[0].cur.slice(), deBefore: before, pred: v.sc, after: null });
  saveSteps(); renderSteps(); $('#iter').scrollIntoView({ behavior: 'smooth' });
}
function recordStep() {
  const st = S.steps.find((s) => !s.after), nl = [0, 1, 2].map((c) => pf($('#nm' + c).value)); if (!st || nl.some((v) => !Number.isFinite(v))) { $('#learnMsg').textContent = 'Введите L*, a*, b* нового замера.'; return; }
  const rows = problem(), tgt = rows[0].tgt; st.after = nl; st.deAfter = de00(tgt[0], tgt[1], tgt[2], nl[0], nl[1], nl[2], S.kL, S.kC, S.kH);
  let msg = '';
  if (S.learn) {
    const obs = nl.map((v, i) => v - st.before[i]), fs = st.applied.map((a) => eff(a.p * 10)), pred = [0, 1, 2].map((c) => st.applied.reduce((s, a, j) => s + sens(a.id)[c] * fs[j], 0)), res = obs.map((o, i) => o - pred[i]), den = fs.reduce((s, f) => s + f * f, 0) || 1;
    S.sensP[S.profile] = S.sensP[S.profile] || {};
    st.applied.forEach((a, j) => { const old = sens(a.id).slice(), nw = old.map((v, c) => { const d = 0.5 * res[c] * fs[j] / den; const lim = Math.max(0.15, Math.abs(v) * 0.5); return +(v + Math.max(-lim, Math.min(lim, d))).toFixed(3); }); S.sensP[S.profile][a.id] = nw; });
    msg = 'Модель обновлена по результату шага: чувствительности использованных колорантов уточнены. ';
    persist();
  }
  S.smp = [nl.slice(), nl.slice(), nl.slice()]; S.mode = 'pair'; saveSteps();
  msg += st.deAfter <= S.tol ? `Цвет в допуске: ΔE00 ${nf(st.deAfter)}. Можно завершить коррекцию.` : `Осталось ΔE00 ${nf(st.deAfter)}. Расчёт ниже уже обновлён по новому замеру.`;
  renderStatic(); result(); renderSteps(); $('#learnMsg').textContent = msg;
}
function finish() {
  const st = S.steps; if (!st.length) return; const last = [...st].reverse().find((s) => s.after);
  S.hist.unshift({ ts: Date.now(), line: S.meta.line, batch: S.meta.batch, color: S.meta.color, steps: st.length, deStart: st[0].deBefore, deEnd: last ? last.deAfter : st[0].deBefore, ok: last ? last.deAfter <= S.tol : false, used: [...new Set(st.flatMap((s) => s.applied.map((a) => a.id)))] });
  S.hist = S.hist.slice(0, 300); saveHist(); S.steps = []; saveSteps(); renderSteps(); renderHist();
}
function renderHist() {
  const H = S.hist, ok = H.filter((h) => h.ok).length, cnt = {}; H.forEach((h) => h.used.forEach((id) => (cnt[id] = (cnt[id] || 0) + 1)));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5), mx = top[0]?.[1] || 1;
  $('#hist').innerHTML = H.length ? `<div class="kp k4"><div class="kpi"><span>Коррекций</span><b>${H.length}</b></div><div class="kpi"><span>В допуске</span><b class="ok">${Math.round((ok / H.length) * 100)} %</b></div><div class="kpi"><span>Шагов в среднем</span><b>${nf(H.reduce((a, h) => a + h.steps, 0) / H.length, 1)}</b></div><div class="kpi"><span>ΔE00 до → после</span><b>${nf(H.reduce((a, h) => a + h.deStart, 0) / H.length, 1)} → ${nf(H.reduce((a, h) => a + h.deEnd, 0) / H.length, 2)}</b></div></div>
   <h4 style="margin-top:12px">Чем корректируют чаще всего</h4>${top.map(([id, n]) => `<div class="hb"><span>${esc(colors().find((c) => c.id === id)?.n || id)}</span><div class="rbar2"><i style="width:${(n / mx) * 100}%"></i></div><b>${n}</b></div>`).join('')}
   <div class="xw"><table class="tab" style="margin-top:10px"><thead><tr><th>Дата</th><th>Линия</th><th>Партия</th><th>Цвет</th><th>Шагов</th><th>ΔE00</th><th>Итог</th></tr></thead><tbody>${H.slice(0, 15).map((h) => `<tr><td>${new Date(h.ts).toLocaleDateString('ru-RU')}</td><td>${esc(h.line)}</td><td>${esc(h.batch)}</td><td>${esc(h.color)}</td><td>${h.steps}</td><td>${nf(h.deStart, 1)} → ${nf(h.deEnd, 2)}</td><td class="${h.ok ? 'ok' : 'warn'}">${h.ok ? 'в допуске' : 'вне допуска'}</td></tr>`).join('')}</tbody></table></div><div class="act"><button class="btn ghost" id="csv" type="button">Выгрузить CSV</button><button class="btn ghost" id="clrHist" type="button">Очистить историю</button></div>` : '<p class="small">История пока пуста. Завершённые коррекции сохраняются здесь, и по ним строится аналитика.</p>';
}
function renderCal() {
  $('#calTab').innerHTML = `<table class="tab"><thead><tr><th>Колорант</th><th>ΔL*</th><th>Δa*</th><th>Δb*</th><th>₽/кг</th></tr></thead><tbody>${colors().map((c) => { const s = sens(c.id); return `<tr><td>${esc(c.n)}</td>${[0, 1, 2].map((k) => `<td><input class="sn" inputmode="decimal" data-sens="${c.id}|${k}" value="${num(s[k])}"></td>`).join('')}<td><input class="sn" inputmode="decimal" data-price="${c.id}" value="${price(c.id)}"></td></tr>`; }).join('')}</tbody></table>`;
  $('#calSel').innerHTML = colors().map((c) => `<option value="${c.id}">${esc(c.n)}</option>`).join('');
}
function renderMeta() { $('#meta').innerHTML = [['line', 'Линия'], ['batch', '№ партии'], ['color', 'Цвет / RAL'], ['tech', 'Технолог']].map(([k, t]) => `<label>${t}<input data-meta="${k}" value="${esc(S.meta[k])}"></label>`).join(''); }
function renderProto() {
  const v = $('#res')._vars?.[S.variant], rows = problem(), before = wmean(rows, (r) => ddE(r, r.cur));
  $('#proto').innerHTML = `<h3>Протокол коррекции цвета</h3><table class="tab pt"><tbody><tr><td>Дата</td><td>${new Date().toLocaleDateString('ru-RU')}</td><td>Линия</td><td>${esc(S.meta.line) || '—'}</td></tr><tr><td>№ партии</td><td>${esc(S.meta.batch) || '—'}</td><td>Цвет / RAL</td><td>${esc(S.meta.color) || '—'}</td></tr><tr><td>Прибор</td><td>${esc(inst().id === 'my' && S.myName ? S.myName : inst().name)}</td><td>Технолог</td><td>${esc(S.meta.tech) || '—'}</td></tr><tr><td>Размер замеса</td><td>${nf(S.batchKg, 0)} кг</td><td>Размер пробы</td><td>${nf(S.sampleKg, 2)} кг</td></tr><tr><td>Эталон L*a*b*</td><td>${S.std[0].map((x) => nf(x, 1)).join(' / ')}</td><td>Образец L*a*b*</td><td>${rows[0].cur.map((x) => nf(x, 1)).join(' / ')}</td></tr><tr><td>ΔE00 до</td><td>${nf(before)}</td><td>Допуск</td><td>${num(S.tol)}</td></tr></tbody></table>${v ? `<table class="tab pt" style="margin-top:10px"><thead><tr><th>Колорант</th><th>% к массе</th><th>Масса на замес</th><th>Масса на пробу, г</th><th>Подпись</th></tr></thead><tbody>${v.lines.map((l) => `<tr><td>${esc(colors().find((c) => c.id === l.id).n)}</td><td>${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))}</td><td>${massStr((S.batchKg * l.p) / 100)}</td><td>${nf((S.sampleKg * 1000 * Math.abs(l.p)) / 100, 2)}</td><td></td></tr>`).join('')}</tbody></table><p>Прогноз после добавки: ΔE00 ${nf(v.sc)}</p>` : ''}${S.steps.length ? `<p><b>Шаги:</b> ${S.steps.map((s, i) => `${i + 1}) ${s.applied.map((a) => (colors().find((c) => c.id === a.id)?.n || a.id) + ' ' + fmtP(a.p) + ' %').join(', ')}${s.after ? ' → ΔE00 ' + nf(s.deAfter) : ''}`).join('; ')}</p>` : ''}<p class="small">Расчёт ориентировочный. Подпись технолога: ____________________</p>`;
}

/* ---------- события ---------- */
const reflow = () => { syncSeries(); renderStatic(); result(); renderHist(); renderSteps(); relabel(); };
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return; const d = t.dataset;
  if (d.inst) { S.inst = d.inst; persist(); reflow(); } else if (d.mode) { S.mode = d.mode; reflow(); } else if (d.bt) { S.bt = d.bt; reflow(); }
  else if (d.n) { S.maxN = +d.n; reflow(); } else if (d.geo) { S.geo = d.geo; reflow(); } else if (d.prof) { S.profile = d.prof; persist(); reflow(); }
  else if (d.tol) { S.tol = +d.tol; persist(); reflow(); } else if (d.var) { S.variant = +d.var; result(); }
  else if (d.demo !== undefined) demo(+d.demo); else if (t.id === 'copy') { navigator.clipboard && navigator.clipboard.writeText($('#res')._text || ''); t.textContent = 'Скопировано'; setTimeout(() => (t.textContent = 'Скопировать'), 1500); }
  else if (t.id === 'share') { const u = location.href.split('#')[0] + '#s=' + btoa(unescape(encodeURIComponent(JSON.stringify({ i: S.inst, m: S.mode, std: S.std, smp: S.smp, del: S.del, b: S.batchKg, s: S.sampleKg })))); navigator.clipboard && navigator.clipboard.writeText(u); t.textContent = 'Ссылка скопирована'; setTimeout(() => (t.textContent = 'Ссылка на расчёт'), 1800); }
  else if (d.met) { S.metric = d.met; persist(); reflow(); } else if (d.rk) { S.riskK = +d.rk; persist(); reflow(); }
  else if (d.punit) { const old = S.plan.unit, ps = Object.fromEntries(Object.entries(S.plan.v).map(([id, v]) => [id, toP(pf(v) || 0)])); S.plan.unit = d.punit; Object.keys(ps).forEach((id) => (S.plan.v[id] = unitP(ps[id]))); renderLiveIn(); updateLive(); }
  else if (t.id === 'planFill') { S.dirty = false; result(); } else if (t.id === 'planClear') { S.plan.v = {}; S.dirty = true; renderLiveIn(); updateLive(); }
  else if (d.pscale) { const m = +d.pscale; Object.keys(S.plan.v).forEach((id) => { const x = pf(S.plan.v[id]); if (Number.isFinite(x)) S.plan.v[id] = String(+(x * m).toFixed(4)).replace('.', ','); }); S.dirty = true; renderLiveIn(); updateLive(); }
  else if (d.prm) { delete S.plan.v[d.prm]; S.dirty = true; renderLiveIn(); updateLive(); }
  else if (d.pz) { const V = S.view; if (!V) return; if (d.pz === 'fit') { V.auto = true; Object.assign(V, fitView(S.model)); } else if (d.pz === 'in' || d.pz === 'out') { V.k = Math.max(2, Math.min(800, V.k * (d.pz === 'in' ? 1.5 : 1 / 1.5))); V.auto = false; } else { V.k = (Z.x1 - Z.x0) / 2 / +d.pz; V.cx = 0; V.cy = 0; V.auto = false; } drawPlot(); }
  else if (t.id === 'planStep') { const o = $('#res'); if (o._lines && o._lines.length) applyStep({ lines: o._lines.map((l) => ({ id: l.id, p: l.p })), sc: o._after }); }
  else if (t.id === 'serAdd') { if (S.series.std.length < 10) { S.series.std.push([NaN, NaN, NaN]); S.series.smp.push([NaN, NaN, NaN]); } reflow(); } else if (t.id === 'serDel') { if (S.series.std.length > 1) { S.series.std.pop(); S.series.smp.pop(); } reflow(); }
  else if (t.id === 'applyStep') applyStep(); else if (t.id === 'recStep') recordStep(); else if (t.id === 'cancelStep') { S.steps = S.steps.filter((s) => s.after); saveSteps(); renderSteps(); }
  else if (t.id === 'finish') finish(); else if (t.id === 'clearSteps') { S.steps = []; saveSteps(); renderSteps(); }
  else if (t.id === 'csv') csv(); else if (t.id === 'clrHist') { S.hist = []; saveHist(); renderHist(); }
  else if (t.id === 'print') { document.body.classList.add('pp'); window.print(); setTimeout(() => document.body.classList.remove('pp'), 500); }
  else if (t.id === 'calApply') applyCal(); else if (t.id === 'calReset') { S.sensP[S.profile] = {}; S.price = {}; persist(); reflow(); }
  else if (t.id === 'addCol') addCol(); else if (t.id === 'expJson') expJson(); else if (t.id === 'impJson') $('#impFile').click();
});
document.addEventListener('input', (e) => {
  const el = e.target, d = el.dataset;
  if (d.lab) { const [key, k, c] = d.lab.split('|'); S[key][+k][+c] = pf(el.value); result(); }
  else if (d.ill) { const [key, c] = d.ill.split('|'); S.ill2[key][+c] = pf(el.value); result(); }
  else if (el.id === 'batchKg') { S.batchKg = pf(el.value); result(); } else if (el.id === 'sampleKg') { S.sampleKg = pf(el.value) || 0; result(); }
  else if (el.id === 'resB') { S.resB = Math.max(0.01, pf(el.value) || 10); result(); } else if (el.id === 'resS') { S.resS = Math.max(0.001, pf(el.value) || 0.1); result(); }
  else if (d.allow) { S.allowed[d.allow] = el.checked; result(); } else if (d.cont) { const v = pf(el.value); S.content[d.cont] = Number.isFinite(v) ? v : undefined; result(); }
  else if (d.sens) { const [id, k] = d.sens.split('|'), v = pf(el.value); if (Number.isFinite(v)) { S.sensP[S.profile] = S.sensP[S.profile] || {}; const cur = sens(id).slice(); cur[+k] = v; S.sensP[S.profile][id] = cur; persist(); result(); } }
  else if (d.price) { const v = pf(el.value); if (Number.isFinite(v)) { S.price[d.price] = v; persist(); result(); } }
  else if (d.meta) { S.meta[d.meta] = el.value; persist(); renderProto(); }
  else if (el.id === 'myName') { S.myName = el.value; persist(); } else if (el.id === 'myNoise') { const v = pf(el.value); if (v > 0) { S.myNoise = v; persist(); } }
  else if (el.id === 'nonlin') { S.nonlin = el.checked; persist(); result(); } else if (el.id === 'learn') { S.learn = el.checked; persist(); renderSteps(); }
  else if (el.id === 'ill2on') { S.ill2.on = el.checked; reflow(); }
  else if (el.id === 'serOn') { S.series.on = el.checked; reflow(); }
  else if (d.ser) { const [key, i, c] = d.ser.split('|'); S.series[key][+i][+c] = pf(el.value); S.view = null; syncSeries(); const ss = $('#serSum'); if (ss) ss.textContent = serSummary(); result(); relabel(); }
  else if (d.gl) { S.gl[d.gl] = el.value; result(); relabel(); }
  else if (d.plan) { S.plan.v[d.plan] = el.value; S.dirty = true; const sl = $(`[data-psl="${d.plan}"]`); const p = toP(pf(el.value)); if (sl && Number.isFinite(p)) sl.value = p; updateLive(); }
  else if (d.psl) { S.plan.v[d.psl] = unitP(+el.value); S.dirty = true; const ti = $(`[data-plan="${d.psl}"]`); if (ti) ti.value = S.plan.v[d.psl]; updateLive(); }
  else if (el.id === 'padd') { if (el.value && Object.keys(S.plan.v).length < 10) { S.plan.v[el.value] = unitP(0.05); S.dirty = true; renderLiveIn(); updateLive(); } else if (el.value) { el.value = ''; } }
});
$('#impFile').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((tx) => { try { const o = JSON.parse(tx); if (o.sensP) S.sensP = o.sensP; if (o.custom) S.custom = o.custom; if (o.price) S.price = o.price; if (o.hist) { S.hist = o.hist; saveHist(); } persist(); colors().forEach((c) => { if (S.allowed[c.id] === undefined) S.allowed[c.id] = true; }); reflow(); $('#calMsg').textContent = 'Данные загружены.'; } catch { $('#calMsg').textContent = 'Не удалось прочитать файл.'; } }); });
function expJson() { const b = new Blob([JSON.stringify({ v: 2, sensP: S.sensP, custom: S.custom, price: S.price, hist: S.hist }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'коррекция-цвета-данные.json'; a.click(); }
function csv() { const rows = [['Дата', 'Линия', 'Партия', 'Цвет', 'Шагов', 'ΔE00 до', 'ΔE00 после', 'В допуске'], ...S.hist.map((h) => [new Date(h.ts).toLocaleString('ru-RU'), h.line, h.batch, h.color, h.steps, nf(h.deStart), nf(h.deEnd), h.ok ? 'да' : 'нет'])]; const t = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = 'история-коррекции.csv'; a.click(); }
function applyCal() {
  const id = $('#calSel').value, add = pf($('#calAdd').value), a = [0, 1, 2].map((i) => pf($('#cb' + i).value)), b = [0, 1, 2].map((i) => pf($('#ca' + i).value));
  if (!(add > 0) || [...a, ...b].some((v) => !Number.isFinite(v))) { $('#calMsg').textContent = 'Заполните все значения: добавка в % и L*a*b* до и после.'; return; }
  S.sensP[S.profile] = S.sensP[S.profile] || {}; S.sensP[S.profile][id] = b.map((v, i) => +((v - a[i]) / (eff(add * 10) || add * 10)).toFixed(3));
  persist(); reflow(); $('#calMsg').textContent = 'Чувствительность сохранена для профиля «' + PROFILES[S.profile].n + '».';
}
function addCol() {
  const n = $('#cn').value.trim(), s = [pf($('#cs0').value), pf($('#cs1').value), pf($('#cs2').value)], pr = pf($('#cpr').value) || 0;
  if (!n || s.some((v) => !Number.isFinite(v))) { $('#calMsg').textContent = 'Укажите название и ΔL, Δa, Δb на +0,1 %.'; return; }
  const id = 'x' + Date.now().toString(36); S.custom.push({ id, n, ci: 'свой', s, c: lab2rgbHex(s), price: pr }); S.allowed[id] = true; persist(); reflow(); $('#calMsg').textContent = 'Колорант добавлен.';
}
function lab2rgbHex(s) { return lab2rgb(Math.max(10, Math.min(90, 50 + s[0] * 8)), s[1] * 12, s[2] * 12); }
function demo(k) {
  S.mode = 'pair'; S.bt = 'made'; S.inst = k < 2 ? 'byk' : 'sph'; S.steps = []; saveSteps(); S.content = {}; S.plan.v = {}; S.series.on = false;
  const ex = [[[43.47, 21.65, 19.67], [42.62, 20.02, 19.9], '', '22,9'], [[66.59, -0.97, -2.03], [57.01, 7.13, 4.17], '', '48,3'], [[32.4, 1.2, -18.6], [33.9, 0.4, -16.2], '', '']][k % 3];
  S.std = [0, 1, 2].map(() => ex[0].slice()); S.smp = [0, 1, 2].map(() => ex[1].slice()); S.gl = { std: ex[2], smp: ex[3] }; S.batchKg = 1000; S.sampleKg = 0.5; S.ill2.on = false; S.metric = k < 2 ? '94' : S.metric; reflow();
}
try { const m = location.hash.match(/#s=(.+)/); if (m) { const o = JSON.parse(decodeURIComponent(escape(atob(m[1])))); S.inst = o.i || 'byk'; S.mode = o.m; S.std = o.std; S.smp = o.smp; S.del = o.del; S.batchKg = o.b; S.sampleKg = o.s; } } catch { /* */ }
reflow();
