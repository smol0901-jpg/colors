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
  inst: P.inst || 'byk', metric: P.metric || '94', geo: 'SCI', mode: 'pair', bt: 'made', maxN: 3, profile: P.profile || 'mid', nonlin: P.nonlin !== false, learn: P.learn !== false,
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
const persist = () => store.set(K1 + '-p', { inst: S.inst, profile: S.profile, nonlin: S.nonlin, learn: S.learn, metric: S.metric, myName: S.myName, myNoise: S.myNoise, tol: S.tol, sensP: S.sensP, custom: S.custom, price: S.price, meta: S.meta });
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
   <div class="seg" style="align-items:center;margin-top:8px"><span class="small">Формула ΔE:</span>${[['00', 'CIEDE2000'], ['94', 'CIE94 (как на BYK)'], ['ab', 'ΔE*ab']].map(([k, n]) => `<button type="button" data-met="${k}" aria-pressed="${S.metric === k}">${n}</button>`).join('')}</div><div class="seg" style="align-items:center;margin-top:8px"><span class="small">Допуск ΔE00:</span>${[0.5, 1, 1.5, 2].map((t) => `<button type="button" data-tol="${t}" aria-pressed="${S.tol === t}">${num(t)}</button>`).join('')}<span class="small">Пигментов в добавке (до 10):</span>${[1, 2, 3, 4, 5, 6, 8, 10].map((n) => `<button type="button" data-n="${n}" aria-pressed="${S.maxN === n}">${n}</button>`).join('')}</div>
   <div class="seg" style="margin-top:8px"><label class="ck"><input type="checkbox" id="nonlin" ${S.nonlin ? 'checked' : ''}><span><b>Нелинейная модель</b><em>большие добавки действуют слабее линейного расчёта</em></span></label><label class="ck"><input type="checkbox" id="learn" ${S.learn ? 'checked' : ''}><span><b>Самообучение по итерациям</b><em>после замера модель уточняет чувствительности</em></span></label></div>`;
  $('#cols').innerHTML = colors().map((c) => `<div class="colr"><label class="ck"><input type="checkbox" data-allow="${c.id}" ${S.allowed[c.id] ? 'checked' : ''}><i style="background:${c.c}"></i><span><b>${esc(c.n)}</b><em>${esc(c.ci || 'свой')}</em></span></label><label class="cont">в рецепте, %<input inputmode="decimal" data-cont="${c.id}" value="${S.content[c.id] != null ? num(S.content[c.id]) : ''}" placeholder="—"></label></div>`).join('');
  renderCal(); renderMeta();
}
function result() {
  const out = $('#res'), I = inst(), noise = I.editable ? S.myNoise : I.noise;
  const raw = [...S.std.slice(0, I.angles), ...(S.mode === 'pair' ? S.smp.slice(0, I.angles) : S.del.slice(0, I.angles)), ...(S.ill2.on ? [S.ill2.std, S.ill2.smp] : [])].flat();
  if (raw.some((v) => !Number.isFinite(v)) || !(S.batchKg > 0)) { out.innerHTML = '<div class="warn">Заполните значения L*, a*, b* и размер замеса.</div>'; return; }
  const { rows, before, vars } = calc(), r0 = rows[0], tolOk = before <= S.tol;
  out._vars = vars; S.variant = Math.min(S.variant, Math.max(0, vars.length - 1));
  const best = vars[S.variant], bd = breakdown(r0.tgt, r0.cur);
  let h = `<div class="sw3">${[['Эталон', r0.tgt], ['Сейчас', r0.cur], ['После добавки (прогноз)', best ? best.pred[0] : r0.cur]].map(([t, l]) => `<div><i style="background:${lab2rgb(...l)}"></i><span>${t}</span><em>L ${nf(l[0], 1)} · a ${nf(l[1], 1)} · b ${nf(l[2], 1)}</em></div>`).join('')}</div>`;
  const cls = (v) => (v > S.tol * 1.5 ? 'bad' : v > S.tol ? 'warn' : 'ok');
  h += `<div class="kp"><div class="kpi"><span>Отклонение сейчас</span><b class="${cls(before)}">ΔE00 ${nf(before)}</b><em>ΔE\u200b00 ${nf(de00(...r0.tgt, ...r0.cur))} · ΔE\u200b94 ${nf(de94(r0.tgt, r0.cur))} · ΔE*\u200bab ${nf(de76(r0.tgt, r0.cur))}<br>допуск ${num(S.tol)}</em></div>${best ? `<div class="kpi"><span>После добавки, прогноз</span><b class="${cls(best.sc)}">ΔE00 ${nf(best.sc)}</b><em>${best.sc <= S.tol ? 'в допуске' : 'вне допуска'}, проверить на пробе</em></div>` : ''}</div>`;
  const tx = (v, a, b, t) => (Math.abs(v) < 0.15 ? '' : `${v > 0 ? a : b} на ${nf(Math.abs(v), 1)}${t}`);
  const parts = [tx(bd.dL, 'светлее', 'темнее', ' ед. L*'), tx(bd.dC, 'насыщеннее', 'тусклее', ' ед. C*'), tx(bd.dH, 'оттенок смещён', 'оттенок смещён', ' ед. H*')].filter(Boolean);
  h += `<div class="bdw"><b>Чем образец отличается от эталона:</b> ${parts.length ? parts.join(', ') : 'различий нет'}.${S.ill2.on ? ` Под источником A: ΔE00 ${nf(ddE(rows[rows.length - 1], rows[rows.length - 1].cur))}.` : ''}</div>`;
  { const ge = pf(S.gl.std), gs = pf(S.gl.smp); if (Number.isFinite(ge) && Number.isFinite(gs) && Math.abs(ge - gs) > 5) h += `<div class="warn">Блеск образца и эталона отличается на ${nf(Math.abs(ge - gs), 1)} GU. При разном блеске цвет сравнивается неточно: сначала выровняйте блеск (режим отверждения, текстура).</div>`; }
  if (tolOk) h += `<div class="note ok">Цвет в допуске ΔE00 ≤ ${num(S.tol)}. Корректировка не нужна.</div>`;
  if (!best) { out.innerHTML = h + '<div class="warn">Добавлением с выбранными колорантами приблизить цвет не получается. Выберите больше колорантов или проверьте значения.</div>'; return; }
  h += `<div class="vars">${vars.map((v, i) => `<button type="button" class="vr ${i === S.variant ? 'on' : ''}" data-var="${i}"><b>Вариант ${i + 1}</b><span>${v.lines.map((l) => (() => { const c = colors().find((q) => q.id === l.id); return c.sh || c.n.split(' ')[0]; })()).join(' + ')}</span><em>ΔE00 ${nf(v.sc)} · ${nf(v.cost, 0)} ₽</em></button>`).join('')}</div>`;
  const total = best.lines.reduce((a, l) => a + Math.abs(l.p), 0);
  h += `<div class="xw"><table class="tab res"><thead><tr><th>Колорант</th><th>% к массе замеса</th><th>На пробу ${nf(S.sampleKg, S.sampleKg < 1 ? 2 : 1)} кг</th><th>На замес ${nf(S.batchKg, 0)} кг</th><th>К рецептуре</th></tr></thead><tbody>${best.lines.map((l) => {
    const c = colors().find((x) => x.id === l.id), cont = S.content[l.id], sg = l.p >= 0 ? '+' : '−', gS = (S.sampleKg * 1000 * Math.abs(l.p)) / 100;
    return `<tr><td><i class="dot" style="background:${c.c}"></i><b>${esc(c.n)}</b> <em>${esc(c.ci || '')}</em></td><td><b>${sg}${fmtP(Math.abs(l.p))} %</b></td><td>${sg}${nf(Math.round(gS / S.resS) * S.resS, S.resS < 1 ? 2 : 0)} г</td><td>${sg}${massStr((S.batchKg * l.p) / 100)}</td><td>${cont > 0 ? sg + nf(Math.abs(l.p) / cont * 100, 1) + ' % от количества в рецепте' : '<span class="small">укажите % в рецепте</span>'}</td></tr>`;
  }).join('')}</tbody></table></div><p class="small">Стоимость добавки по вашим ценам: <b>${nf(best.cost, 0)} ₽</b>${S.bt === 'made' ? '. Замес готов, поэтому расчёт только добавляет.' : '.'}</p>`;
  const w = [];
  if (total > 1.5) w.push('Суммарная добавка больше 1,5 % — вне зоны, где расчёт точен. Делайте в два шага: сначала половину, затем новый замер.'); else if (total > 0.6) w.push('Добавка заметная. Сначала сделайте пробу на малой массе и перемерьте.');
  if (S.ill2.on) { const dA = ddE(rows[rows.length - 1], best.pred[rows.length - 1]), dD = ddE(rows[0], best.pred[0]); if (dA > dD + 0.6) w.push(`Под источником A остаётся ΔE00 ${nf(dA)}: возможна метамерия (цвет совпадает при одном свете и расходится при другом). Попробуйте другие колоранты.`); }
  const rr = [r0.tgt[0] - best.pred[0][0], r0.tgt[1] - best.pred[0][1], r0.tgt[2] - best.pred[0][2]], hint = [];
  if (rr[0] > 0.7) hint.push('останется темнее эталона: осветлить можно только белым'); if (rr[0] < -0.7) hint.push('останется светлее эталона');
  if (rr[1] > 0.7) hint.push('не хватает красного'); if (rr[1] < -0.7) hint.push('не хватает зелёного'); if (rr[2] > 0.7) hint.push('не хватает жёлтого'); if (rr[2] < -0.7) hint.push('не хватает синего');
  if (best.sc > S.tol && hint.length) w.push('Полностью исправить добавкой не получается: ' + hint.join('; ') + '. Увеличьте число колорантов или выберите другие.');
  h += w.map((x) => `<div class="warn">${x}</div>`).join('') + plane(rows, best);
  h += `<div class="act"><button class="btn" id="applyStep" type="button">Применить как шаг и ввести новый замер</button><button class="btn ghost" id="copy" type="button">Скопировать</button><button class="btn ghost" id="share" type="button">Ссылка на расчёт</button></div><p class="small">Расчёт ориентировочный. Окончательное решение и массы определяет технолог по результатам пробной добавки.</p>`;
  out.innerHTML = h;
  out._text = `Коррекция цвета · ${esc(S.meta.color)} ${esc(S.meta.batch)}\nОтклонение: ΔE00 ${nf(before)}\n` + best.lines.map((l) => { const c = colors().find((x) => x.id === l.id); return `- ${c.n}: ${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))} % (${massStr((S.batchKg * l.p) / 100)})`; }).join('\n') + `\nПрогноз: ΔE00 ${nf(best.sc)}`;
  renderSteps(); renderProto(); planResult(); relabel();
}
function plane(rows, best) {
  const W = 360, H = 290, cx = W / 2, cy = H / 2, sc = 11, r0 = rows[0], t = r0.tgt, cur = r0.cur, pr = best.pred[0];
  const X = (a) => cx + (a - t[1]) * sc, Y = (b) => cy - (b - t[2]) * sc;
  let x0 = cur[1], y0 = cur[2];
  const arrows = best.lines.map((l) => { const s = sens(l.id), f = eff(l.p * 10), vx = s[1] * f, vy = s[2] * f, c = colors().find((q) => q.id === l.id).c; const a = `<line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x0 + vx)}" y2="${Y(y0 + vy)}" stroke="${c === '#f4f5f6' ? '#cfd6dd' : c}" stroke-width="3" stroke-linecap="round"/>`; x0 += vx; y0 += vy; return a; }).join('');
  return `<h4 style="margin:16px 0 6px">Где цвет на плоскости a*–b*</h4><div class="plane"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Положение эталона, образца и прогноза на плоскости a*b*"><rect width="${W}" height="${H}" fill="#10202c" rx="14"/>${[-10, -5, 0, 5, 10].map((g) => `<line x1="${cx + g * sc}" x2="${cx + g * sc}" y1="10" y2="${H - 10}" stroke="#fff" stroke-opacity="${g ? 0.08 : 0.25}"/><line y1="${cy + g * sc}" y2="${cy + g * sc}" x1="10" x2="${W - 10}" stroke="#fff" stroke-opacity="${g ? 0.08 : 0.25}"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="${S.tol * sc}" fill="none" stroke="#46d391" stroke-dasharray="3 3" stroke-opacity=".8"/>${arrows}<circle cx="${X(cur[1])}" cy="${Y(cur[2])}" r="6" fill="#ff7a70" stroke="#10202c" stroke-width="2"/><text x="${X(cur[1]) + 9}" y="${Y(cur[2]) - 8}" font-size="11" fill="#ff7a70">сейчас</text><circle cx="${X(pr[1])}" cy="${Y(pr[2])}" r="5" fill="#f6c453" stroke="#10202c" stroke-width="2"/><text x="${X(pr[1]) + 9}" y="${Y(pr[2]) + 14}" font-size="11" fill="#f6c453">прогноз</text><circle cx="${cx}" cy="${cy}" r="6" fill="#46d391" stroke="#10202c" stroke-width="2"/><text x="${cx + 9}" y="${cy - 8}" font-size="11" fill="#46d391">эталон</text><text x="${W - 14}" y="${cy - 5}" text-anchor="end" font-size="10" fill="#fff" fill-opacity=".6">+a* красный</text><text x="${cx + 4}" y="22" font-size="10" fill="#fff" fill-opacity=".6">+b* жёлтый</text><text x="14" y="${cy - 5}" font-size="10" fill="#fff" fill-opacity=".6">зелёный</text><text x="${cx + 4}" y="${H - 12}" font-size="10" fill="#fff" fill-opacity=".6">синий</text></svg><p class="small" style="margin:6px 0 0">Стрелки: вклад каждого колоранта. Пунктир: допуск вокруг эталона.</p></div>`;
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

/* ---------- свои добавки: что будет, если ---------- */
const UNITS = { pct: '% к массе замеса', gb: 'г на замес', gs: 'г на пробу' };
function planLines() {
  const u = S.plan.unit, out = [];
  for (const [id, v] of Object.entries(S.plan.v)) {
    const x = pf(v); if (!Number.isFinite(x) || x === 0) continue;
    const p = u === 'pct' ? x : u === 'gb' ? (x / (S.batchKg * 1000)) * 100 : (x / (S.sampleKg * 1000)) * 100;
    out.push({ id, p: S.bt === 'made' ? Math.max(0, p) : p, raw: p });
  }
  return out.filter((l) => l.p !== 0);
}
function renderPlan() {
  const host = $('#planBox'); if (!host) return;
  host.innerHTML = `<div class="seg">${Object.entries(UNITS).map(([k, n]) => `<button type="button" data-punit="${k}" aria-pressed="${S.plan.unit === k}">${n}</button>`).join('')}</div>
   <div class="plgrid">${colors().map((c) => `<label class="plr"><i style="background:${c.c}"></i><span>${esc(c.sh || c.n)}</span><input inputmode="decimal" data-plan="${c.id}" value="${S.plan.v[c.id] ?? ''}" placeholder="0"></label>`).join('')}</div>
   <div class="act"><button class="btn ghost" id="planFill" type="button">Взять рекомендацию</button><button class="btn ghost" id="planClear" type="button">Очистить</button></div>`;
  planResult();
}
function planResult() {
  const out = $('#planOut'); if (!out) return;
  const rows = problem(), lines = planLines();
  if (rows.flat().some((r) => r.cur?.some?.((v) => !Number.isFinite(v)))) { out.innerHTML = '<div class="warn">Заполните данные замера выше.</div>'; return; }
  if (!lines.length) { out.innerHTML = '<p class="small">Введите, сколько какого пигмента вы планируете добавить, или нажмите «Взять рекомендацию». Здесь появится прогноз цвета.</p>'; return; }
  const r0 = rows[0], ids = lines.map((l) => l.id), pred = predict(rows, ids, lines.map((l) => l.p * 10)), after = wmean(rows, (r, k) => ddE(r, pred[k])), before = wmean(rows, (r) => ddE(r, r.cur));
  const total = lines.reduce((a, l) => a + Math.abs(l.p), 0), cost = lines.reduce((a, l) => a + ((S.batchKg * Math.abs(l.p)) / 100) * price(l.id), 0), bd = breakdown(r0.tgt, pred[0]);
  const cls = (v) => (v > S.tol * 1.5 ? 'bad' : v > S.tol ? 'warn' : 'ok');
  let h = `<div class="sw3">${[['Эталон', r0.tgt], ['Сейчас', r0.cur], ['С вашими добавками', pred[0]]].map(([t, l]) => `<div><i style="background:${lab2rgb(...l)}"></i><span>${t}</span><em>L ${nf(l[0], 1)} · a ${nf(l[1], 1)} · b ${nf(l[2], 1)}</em></div>`).join('')}</div>
  <div class="kp"><div class="kpi"><span>Было</span><b class="${cls(before)}">ΔE00 ${nf(before)}</b></div><div class="kpi"><span>Будет, прогноз</span><b class="${cls(after)}">ΔE00 ${nf(after)}</b><em>${after <= S.tol ? 'в допуске' : 'вне допуска'}</em></div></div>
  <div class="bdw">После добавок относительно эталона: ${[Math.abs(bd.dL) < 0.15 ? '' : `${bd.dL > 0 ? 'светлее' : 'темнее'} на ${nf(Math.abs(bd.dL), 1)} L*`, Math.abs(bd.dC) < 0.15 ? '' : `${bd.dC > 0 ? 'насыщеннее' : 'тусклее'} на ${nf(Math.abs(bd.dC), 1)} C*`, Math.abs(bd.dH) < 0.15 ? '' : `оттенок смещён на ${nf(Math.abs(bd.dH), 1)} H*`].filter(Boolean).join(', ') || 'различий нет'}.</div>
  <div class="xw"><table class="tab"><thead><tr><th>Пигмент</th><th>% к массе</th><th>На замес</th><th>На пробу</th></tr></thead><tbody>${lines.map((l) => { const c = colors().find((q) => q.id === l.id); return `<tr><td><i class="dot" style="background:${c.c}"></i>${esc(c.n)}</td><td>${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))} %</td><td>${massStr((S.batchKg * l.p) / 100)}</td><td>${nf((S.sampleKg * 1000 * Math.abs(l.p)) / 100, 2)} г</td></tr>`; }).join('')}</tbody></table></div><p class="small">Всего ${nf(total, 3)} % к массе, стоимость ${nf(cost, 0)} ₽.</p>`;
  const w = [];
  if (lines.length > 10) w.push('Больше 10 пигментов в одной добавке: расчёт считается, но лучше сократить.');
  if (S.bt === 'made' && Object.values(S.plan.v).some((v) => pf(v) < 0)) w.push('Замес готов, убрать пигмент нельзя: отрицательные значения не учтены.');
  if (total > 1.5) w.push('Суммарная добавка больше 1,5 %: расчёт менее точен, делайте в два шага.');
  h += w.map((x) => `<div class="warn">${x}</div>`).join('') + plane(rows, { lines: lines.map((l) => ({ id: l.id, p: l.p })), pred });
  if (after > S.tol) { const rows2 = rows.map((r, k) => ({ ...r, cur: pred[k] })), c2 = calc({ rows: rows2, exclude: ids }), v = c2.vars[0]; if (v) h += `<div class="note"><b>Чтобы довести до допуска, можно ещё добавить:</b> ${v.lines.map((l) => `${esc(colors().find((q) => q.id === l.id).sh || '')} ${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))} %`).join(', ')} (прогноз ΔE00 ${nf(v.sc)}).<div class="act"><button class="btn ghost" id="planAddComp" type="button">Добавить это в план</button></div></div>`; out._comp = v; }
  h += `<div class="act"><button class="btn" id="planStep" type="button">Применить мой план как шаг</button></div>`;
  out.innerHTML = h; out._lines = lines; out._pred = pred; out._after = after; relabel(out);
}

/* ---------- события ---------- */
const reflow = () => { syncSeries(); renderStatic(); result(); renderHist(); renderSteps(); renderPlan(); relabel(); };
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return; const d = t.dataset;
  if (d.inst) { S.inst = d.inst; persist(); reflow(); } else if (d.mode) { S.mode = d.mode; reflow(); } else if (d.bt) { S.bt = d.bt; reflow(); }
  else if (d.n) { S.maxN = +d.n; reflow(); } else if (d.geo) { S.geo = d.geo; reflow(); } else if (d.prof) { S.profile = d.prof; persist(); reflow(); }
  else if (d.tol) { S.tol = +d.tol; persist(); reflow(); } else if (d.var) { S.variant = +d.var; result(); }
  else if (d.demo !== undefined) demo(+d.demo); else if (t.id === 'copy') { navigator.clipboard && navigator.clipboard.writeText($('#res')._text || ''); t.textContent = 'Скопировано'; setTimeout(() => (t.textContent = 'Скопировать'), 1500); }
  else if (t.id === 'share') { const u = location.href.split('#')[0] + '#s=' + btoa(unescape(encodeURIComponent(JSON.stringify({ i: S.inst, m: S.mode, std: S.std, smp: S.smp, del: S.del, b: S.batchKg, s: S.sampleKg })))); navigator.clipboard && navigator.clipboard.writeText(u); t.textContent = 'Ссылка скопирована'; setTimeout(() => (t.textContent = 'Ссылка на расчёт'), 1800); }
  else if (d.met) { S.metric = d.met; persist(); reflow(); } else if (d.punit) { const k = S.plan.unit; S.plan.unit = d.punit; const conv = (p) => (d.punit === 'pct' ? p : d.punit === 'gb' ? (p / 100) * S.batchKg * 1000 : (p / 100) * S.sampleKg * 1000), toP = (x) => (k === 'pct' ? x : k === 'gb' ? (x / (S.batchKg * 1000)) * 100 : (x / (S.sampleKg * 1000)) * 100); Object.keys(S.plan.v).forEach((id) => { const x = pf(S.plan.v[id]); if (Number.isFinite(x)) S.plan.v[id] = String(+conv(toP(x)).toFixed(4)).replace('.', ','); }); renderPlan(); }
  else if (t.id === 'planFill') { const v = $('#res')._vars?.[S.variant]; if (v) { S.plan.unit = 'pct'; S.plan.v = {}; v.lines.forEach((l) => (S.plan.v[l.id] = String(+l.p.toFixed(4)).replace('.', ','))); renderPlan(); } }
  else if (t.id === 'planClear') { S.plan.v = {}; renderPlan(); }
  else if (t.id === 'planAddComp') { const c = $('#planOut')._comp; if (c) { const u = S.plan.unit; c.lines.forEach((l) => { const cur = pf(S.plan.v[l.id]) || 0, add = u === 'pct' ? l.p : u === 'gb' ? (l.p / 100) * S.batchKg * 1000 : (l.p / 100) * S.sampleKg * 1000; S.plan.v[l.id] = String(+(cur + add).toFixed(4)).replace('.', ','); }); renderPlan(); } }
  else if (t.id === 'planStep') { const o = $('#planOut'); if (o._lines) applyStep({ lines: o._lines.map((l) => ({ id: l.id, p: l.p })), sc: o._after }); }
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
  else if (d.ser) { const [key, i, c] = d.ser.split('|'); S.series[key][+i][+c] = pf(el.value); syncSeries(); const ss = $('#serSum'); if (ss) ss.textContent = serSummary(); result(); relabel(); }
  else if (d.gl) { S.gl[d.gl] = el.value; result(); relabel(); }
  else if (d.plan) { S.plan.v[d.plan] = el.value; planResult(); }
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
