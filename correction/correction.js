/* Коррекция цвета добавлением: по данным спектрофотометра считает, какого колоранта и сколько добавить.
   Расчёт линейный и ориентировочный; чувствительности колорантов можно откалибровать по своим пробным добавкам.
   Все данные остаются в браузере. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (n, d = 2) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
const pf = (v) => { const x = parseFloat(String(v).replace(',', '.').replace('−', '-')); return Number.isFinite(x) ? x : NaN; };

/* ---------- цвет ---------- */
function de00(l1, a1, b1, l2, a2, b2) {
  const rad = Math.PI / 180, deg = 180 / Math.PI, p7 = 25 ** 7;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + p7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = Math.atan2(b1, a1p) * deg; if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * deg; if (h2p < 0) h2p += 360;
  const dLp = l2 - l1, dCp = C2p - C1p;
  let dhp = 0; if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lbp = (l1 + l2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p; if (C1p * C2p !== 0) { hbp = (h1p + h2p) / 2; if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 180 : -180; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dT = 30 * Math.exp(-(((hbp - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + p7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dT * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}
function lab2rgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, f = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const X = 0.95047 * f(fx), Y = f(fy), Z = 1.08883 * f(fz);
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, bl = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  const gm = (c) => { c = Math.max(0, Math.min(1, c)); return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)); };
  return `rgb(${gm(r)},${gm(g)},${gm(bl)})`;
}

/* ---------- приборы ---------- */
const INST = [
  { id: 'my', name: 'Мой спектрофотометр', tag: 'ваш прибор', noise: 0.15, angles: 1, editable: true, modes: ['SCI', 'SCE', 'без выбора'], note: 'Укажите режим, как на вашем приборе, и допуск повторяемости по паспорту. Эталон и образец измеряйте одинаково.' },
  { id: 'sph', name: 'Сферический d/8°', tag: 'лабораторный и портативный', noise: 0.05, angles: 1, modes: ['SCI', 'SCE'], note: 'Основной тип для порошковых красок. SCI не зависит от блеска и лучше подходит для сравнения цвета, SCE ближе к визуальному впечатлению.' },
  { id: 'g45', name: 'Геометрия 45°/0°', tag: 'портативный', noise: 0.1, angles: 1, modes: ['без выбора'], note: 'Близок к тому, как цвет видит глаз, но зависит от блеска и фактуры: эталон и образец должны быть с одинаковым блеском.' },
  { id: 'ma', name: 'Многоугловой', tag: 'металлики и эффекты', noise: 0.12, angles: 3, modes: ['без выбора'], note: 'Для металликов и эффектов: вводятся значения под тремя углами (15°, 45°, 110°), расчёт учитывает все три, главный вес у 45°.' },
  { id: 'col', name: 'Колориметр', tag: 'простой, только L*a*b*', noise: 0.2, angles: 1, modes: ['без выбора'], note: 'Даёт только L*a*b* без спектра. Для сравнения образцов одного типа подходит, но при смене пигментов точность ниже.' },
];
const ANG = [{ n: '45°', w: 0.5 }, { n: '15°', w: 0.25 }, { n: '110°', w: 0.25 }];

/* ---------- колоранты: чувствительность на +0,1 % к массе замеса (ориентир для средней базы; калибруется) ---------- */
const COL = [
  { id: 'w', n: 'Диоксид титана', ci: 'P.W.6', s: [0.35, -0.02, -0.08], c: '#f4f5f6' },
  { id: 'k', n: 'Сажа', ci: 'P.Bk.7', s: [-2.6, 0, -0.35], c: '#1c1f24' },
  { id: 'r', n: 'Оксид железа красный', ci: 'P.R.101', s: [-0.35, 1.05, 0.55], c: '#b4483a' },
  { id: 'y', n: 'Оксид железа жёлтый', ci: 'P.Y.42', s: [-0.05, 0.15, 1.35], c: '#c9993a' },
  { id: 'by', n: 'Висмут-ванадат жёлтый', ci: 'P.Y.184', s: [0.1, -0.2, 2.4], c: '#f2d21b' },
  { id: 'u', n: 'Ультрамарин', ci: 'P.B.29', s: [-0.55, 0.35, -1.3], c: '#3b4fa8' },
  { id: 'b', n: 'Фталоцианин синий', ci: 'P.B.15:3', s: [-1.1, -0.45, -2.2], c: '#1b4fa0' },
  { id: 'g', n: 'Оксид хрома зелёный', ci: 'P.G.17', s: [-0.3, -0.55, 0.4], c: '#4f7a55' },
];
const SKEY = 'cik-corr-v1';
const store = { get() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }, set(o) { try { localStorage.setItem(SKEY, JSON.stringify(o)); } catch { /* */ } } };
const saved = store.get();
const S = {
  inst: saved.inst || 'sph', mode: 'pair', batchType: 'made', maxN: 3, myName: saved.myName || '', myNoise: saved.myNoise || 0.15, geoMode: 'SCI',
  std: [[45.2, -8.1, 15.0], [45.2, -8.1, 15.0], [45.2, -8.1, 15.0]], smp: [[46.5, -6.9, 16.8], [46.5, -6.9, 16.8], [46.5, -6.9, 16.8]], del: [[1.3, 1.2, 1.8], [1.3, 1.2, 1.8], [1.3, 1.2, 1.8]],
  batchKg: 1000, sampleKg: 0.5, allowed: Object.fromEntries(COL.map((c) => [c.id, true])), content: {},
  sens: Object.fromEntries(COL.map((c) => [c.id, (saved.sens && saved.sens[c.id]) || c.s.slice()])),
};
const inst = () => INST.find((i) => i.id === S.inst);

/* ---------- расчёт ---------- */
function problem() {
  const na = inst().angles, rows = [];
  for (let k = 0; k < na; k++) {
    const tgt = S.std[k], cur = S.mode === 'pair' ? S.smp[k] : S.std[k].map((v, i) => v + S.del[k][i]);
    rows.push({ cur, tgt, w: na === 1 ? 1 : ANG[k].w });
  }
  return rows;
}
function solveSubset(rows, ids, lo, hi) {
  const cols = ids.map((id) => S.sens[id]);
  const n = ids.length, d = [], A = cols.map(() => []);
  rows.forEach((r) => { const sw = Math.sqrt(r.w); for (let c = 0; c < 3; c++) { d.push((r.tgt[c] - r.cur[c]) * sw); cols.forEach((s, j) => A[j].push(s[c] * sw)); } });
  const dot = (u, v) => u.reduce((a, x, i) => a + x * v[i], 0), lam = 0.03;
  const G = A.map((u) => A.map((v) => dot(u, v))), h = A.map((u) => dot(u, d));
  const x = new Array(n).fill(0);
  for (let it = 0; it < 600; it++) for (let j = 0; j < n; j++) {
    let s = h[j]; for (let k = 0; k < n; k++) if (k !== j) s -= G[j][k] * x[k];
    x[j] = Math.max(lo[j], Math.min(hi[j], s / (G[j][j] + lam)));
  }
  return x;
}
function predict(rows, ids, x) {
  return rows.map((r) => r.cur.map((v, c) => v + ids.reduce((a, id, j) => a + S.sens[id][c] * x[j], 0)));
}
function score(rows, pred) {
  return rows.reduce((a, r, k) => a + r.w * de00(r.tgt[0], r.tgt[1], r.tgt[2], pred[k][0], pred[k][1], pred[k][2]), 0) / rows.reduce((a, r) => a + r.w, 0);
}
function calc() {
  const rows = problem();
  const before = rows.reduce((a, r) => a + r.w * de00(r.tgt[0], r.tgt[1], r.tgt[2], r.cur[0], r.cur[1], r.cur[2]), 0) / rows.reduce((a, r) => a + r.w, 0);
  const ids = COL.filter((c) => S.allowed[c.id]).map((c) => c.id);
  const next = S.batchType === 'next';
  const bound = (id) => { const c = S.content[id]; return { lo: next && c > 0 ? -c * 10 : 0, hi: 40 }; };
  let best = null;
  const subsets = [];
  const rec = (start, cur) => { if (cur.length) subsets.push(cur.slice()); if (cur.length === S.maxN) return; for (let i = start; i < ids.length; i++) { cur.push(ids[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  for (const sub of subsets) {
    const lo = sub.map((id) => bound(id).lo), hi = sub.map((id) => bound(id).hi);
    const x = solveSubset(rows, sub, lo, hi);
    const used = sub.filter((_, j) => Math.abs(x[j]) > 0.004);
    if (!used.length) continue;
    const pred = predict(rows, sub, x), sc = score(rows, pred), mass = x.reduce((a, v) => a + Math.abs(v), 0);
    const cost = sc + 0.01 * mass + 0.03 * used.length;
    if (!best || cost < best.cost) best = { ids: sub, x, pred, sc, cost, mass };
  }
  return { rows, before, best };
}

/* ---------- отрисовка ---------- */
const fmtP = (v) => nf(v, Math.abs(v) < 0.1 ? 3 : 2);
function inputsHtml() {
  const I = inst(), na = I.angles;
  const lab = (arr, key, k) => ['L*', 'a*', 'b*'].map((t, c) => `<label class="lab"><span>${t}</span><input inputmode="decimal" data-lab="${key}|${k}|${c}" value="${String(arr[k][c]).replace('.', ',')}"></label>`).join('');
  let h = '';
  for (let k = 0; k < na; k++) {
    const head = na > 1 ? `<div class="angh">Угол ${ANG[k].n}</div>` : '';
    h += `<div class="ang">${head}${S.mode === 'pair'
      ? `<div class="two"><div><h4>Эталон</h4><div class="labs">${lab(S.std, 'std', k)}</div></div><div><h4>Образец (замес)</h4><div class="labs">${lab(S.smp, 'smp', k)}</div></div></div>`
      : `<div class="two"><div><h4>Эталон</h4><div class="labs">${lab(S.std, 'std', k)}</div></div><div><h4>Отклонение, прибор выдаёт</h4><div class="labs">${['ΔL*', 'Δa*', 'Δb*'].map((t, c) => `<label class="lab"><span>${t}</span><input inputmode="decimal" data-lab="del|${k}|${c}" value="${String(S.del[k][c]).replace('.', ',')}"></label>`).join('')}</div></div></div>`}</div>`;
  }
  return h;
}
function render() {
  const I = inst();
  $('#insts').innerHTML = INST.map((i) => `<button type="button" class="ic ${i.id === S.inst ? 'on' : ''}" data-inst="${i.id}"><b>${i.id === 'my' && S.myName ? esc(S.myName) : i.name}</b><span>${i.tag}</span></button>`).join('');
  $('#instNote').innerHTML = `<p class="small">${I.note}</p>` + (I.editable ? `<div class="row3"><label>Название прибора<input id="myName" value="${esc(S.myName)}" placeholder="например, ваша модель"></label><label>Допуск повторяемости, ΔE00<input id="myNoise" inputmode="decimal" value="${String(S.myNoise).replace('.', ',')}"></label></div>` : '');
  const modes = I.modes.length > 1 && I.modes[0] !== 'без выбора' ? `<div class="seg" data-seg="geo">${I.modes.map((m) => `<button type="button" data-geo="${m}" aria-pressed="${S.geoMode === m}">${m}</button>`).join('')}</div><p class="small">Измеряйте эталон и образец в одном режиме. Для сравнения цвета обычно берут SCI.</p>` : '';
  $('#geo').innerHTML = modes;
  $('#modeSeg').innerHTML = `<button type="button" data-mode="pair" aria-pressed="${S.mode === 'pair'}">Эталон и образец</button><button type="button" data-mode="delta" aria-pressed="${S.mode === 'delta'}">Отклонение ΔL Δa Δb</button>`;
  $('#btSeg').innerHTML = `<button type="button" data-bt="made" aria-pressed="${S.batchType === 'made'}">Готовый замес: только добавление</button><button type="button" data-bt="next" aria-pressed="${S.batchType === 'next'}">Рецепт следующего замеса: плюс и минус</button>`;
  $('#labs').innerHTML = inputsHtml();
  $('#sizes').innerHTML = `<label>Размер замеса, кг<input id="batchKg" inputmode="decimal" value="${String(S.batchKg).replace('.', ',')}"></label><label>Размер пробы, кг<input id="sampleKg" inputmode="decimal" value="${String(S.sampleKg).replace('.', ',')}"></label>`;
  $('#nseg').innerHTML = [1, 2, 3].map((n) => `<button type="button" data-n="${n}" aria-pressed="${S.maxN === n}">${n}</button>`).join('');
  $('#cols').innerHTML = COL.map((c) => `<div class="colr"><label class="ck"><input type="checkbox" data-allow="${c.id}" ${S.allowed[c.id] ? 'checked' : ''}><i style="background:${c.c}"></i><span><b>${c.n}</b><em>${c.ci}</em></span></label><label class="cont">в рецепте, %<input inputmode="decimal" data-cont="${c.id}" value="${S.content[c.id] != null ? String(S.content[c.id]).replace('.', ',') : ''}" placeholder="—"></label></div>`).join('');
  $('#calTab').innerHTML = `<table class="tab"><thead><tr><th>Колорант</th><th>ΔL*</th><th>Δa*</th><th>Δb*</th></tr></thead><tbody>${COL.map((c) => `<tr><td>${c.n}</td>${[0, 1, 2].map((k) => `<td><input class="sn" inputmode="decimal" data-sens="${c.id}|${k}" value="${String(S.sens[c.id][k]).replace('.', ',')}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('#calSel').innerHTML = COL.map((c) => `<option value="${c.id}">${c.n}</option>`).join('');
  result();
}
function result() {
  const out = $('#res'), I = inst();
  const noise = I.editable ? S.myNoise : I.noise;
  const all = [...S.std.slice(0, I.angles), ...(S.mode === 'pair' ? S.smp.slice(0, I.angles) : S.del.slice(0, I.angles))].flat();
  if (all.some((v) => !Number.isFinite(v)) || !(S.batchKg > 0)) { out.innerHTML = '<div class="warn">Заполните значения L*, a*, b* и размер замеса.</div>'; return; }
  const { rows, before, best } = calc();
  const r0 = rows[0];
  const tolOk = before <= Math.max(noise, 0.3);
  let h = `<div class="sw3">${[['Эталон', r0.tgt], ['Сейчас', r0.cur], ['После добавки (прогноз)', best ? best.pred[0] : r0.cur]].map(([t, l]) => `<div><i style="background:${lab2rgb(...l)}"></i><span>${t}</span><em>L ${nf(l[0], 1)} · a ${nf(l[1], 1)} · b ${nf(l[2], 1)}</em></div>`).join('')}</div>`;
  h += `<div class="kp"><div class="kpi"><span>Отклонение сейчас</span><b class="${before > 1 ? 'bad' : before > noise ? 'warn' : 'ok'}">ΔE00 ${nf(before)}</b><em>допуск повторяемости ${nf(noise)}</em></div>`;
  if (best) h += `<div class="kpi"><span>После добавки, прогноз</span><b class="${best.sc > 1 ? 'bad' : best.sc > 0.5 ? 'warn' : 'ok'}">ΔE00 ${nf(best.sc)}</b><em>линейная модель, проверить на пробе</em></div>`;
  h += `</div>`;
  if (tolOk) h += `<div class="note ok">Цвет в пределах повторяемости прибора. Корректировка не нужна.</div>`;
  if (!best) { out.innerHTML = h + '<div class="warn">Добавлением с выбранными колорантами приблизить цвет к эталону не получается. Попробуйте выбрать больше колорантов или проверьте значения.</div>'; return; }
  const total = best.ids.reduce((a, id, j) => a + Math.abs(best.x[j]) / 10, 0);
  const lines = best.ids.map((id, j) => ({ id, p: best.x[j] / 10 })).filter((l) => Math.abs(l.p) > 0.0004);
  h += `<h4 style="margin:16px 0 6px">Что добавить</h4><div class="xw"><table class="tab res"><thead><tr><th>Колорант</th><th>% к массе замеса</th><th>На пробу ${nf(S.sampleKg, S.sampleKg < 1 ? 2 : 1)} кг</th><th>На замес ${nf(S.batchKg, 0)} кг</th><th>К рецептуре</th></tr></thead><tbody>${lines.map((l) => {
    const c = COL.find((x) => x.id === l.id), cont = S.content[l.id], g = (S.sampleKg * 1000 * l.p) / 100, kg = (S.batchKg * l.p) / 100;
    return `<tr><td><i class="dot" style="background:${c.c}"></i><b>${c.n}</b> <em>${c.ci}</em></td><td><b>${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))} %</b></td><td>${l.p >= 0 ? '+' : '−'}${nf(Math.abs(g), 2)} г</td><td>${l.p >= 0 ? '+' : '−'}${Math.abs(kg) < 1 ? nf(Math.abs(kg) * 1000, 0) + ' г' : nf(Math.abs(kg), 2) + ' кг'}</td><td>${cont > 0 ? (l.p >= 0 ? '+' : '−') + nf(Math.abs(l.p) / cont * 100, 1) + ' % от количества в рецепте' : '<span class="small">укажите % в рецепте</span>'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
  if (S.batchType === 'made') h += `<p class="small">Замес готов, поэтому убрать лишнее нельзя: расчёт только добавляет. Массы даны от массы замеса.</p>`;
  const warns = [];
  if (total > 1.5) warns.push('Суммарная добавка больше 1,5 % — это вне зоны, где линейная модель точна. Делайте в два шага: сначала половину, затем новый замер.');
  else if (total > 0.6) warns.push('Добавка заметная. Сначала сделайте пробу на малой массе и перемерьте.');
  const rs = best.pred[0], rr = [r0.tgt[0] - rs[0], r0.tgt[1] - rs[1], r0.tgt[2] - rs[2]];
  const hint = [];
  if (rr[0] > 0.7) hint.push('останется темнее эталона: осветлить можно только белым, а он уже учтён или не выбран');
  if (rr[0] < -0.7) hint.push('останется светлее эталона');
  if (rr[1] > 0.7) hint.push('не хватает красного (a*)'); if (rr[1] < -0.7) hint.push('не хватает зелёного (a*)');
  if (rr[2] > 0.7) hint.push('не хватает жёлтого (b*)'); if (rr[2] < -0.7) hint.push('не хватает синего (b*)');
  if (best.sc > Math.max(noise, 0.5) && hint.length) warns.push('Полностью исправить добавкой не получается: ' + hint.join('; ') + '. Увеличьте число колорантов или выберите другие.');
  h += warns.map((w) => `<div class="warn">${w}</div>`).join('');
  h += plane(rows, best);
  h += `<div class="act"><button type="button" class="btn ghost" id="copy">Скопировать расчёт</button><button type="button" class="btn ghost" id="print">Печать</button></div><p class="small">Расчёт ориентировочный. Окончательное решение и итоговые массы определяет технолог по результатам пробной добавки.</p>`;
  out.innerHTML = h;
  out._text = `Коррекция цвета\nПрибор: ${I.id === 'my' && S.myName ? S.myName : I.name}\nОтклонение сейчас: ΔE00 ${nf(before)}\nДобавить:\n` + lines.map((l) => { const c = COL.find((x) => x.id === l.id); return `- ${c.n}: ${l.p >= 0 ? '+' : '−'}${fmtP(Math.abs(l.p))} % (${nf(Math.abs(S.batchKg * l.p) / 100, 3)} кг на ${nf(S.batchKg, 0)} кг)`; }).join('\n') + `\nПрогноз после добавки: ΔE00 ${nf(best.sc)} (проверить на пробе)`;
}
function plane(rows, best) {
  const W = 360, H = 300, R = 12, cx = W / 2, cy = H / 2, sc = 11;
  const px = (a) => cx + a * sc, py = (b) => cy - b * sc;
  const r0 = rows[0], c = r0.tgt, cur = r0.cur, pr = best.pred[0];
  const pts = [c, cur, pr]; const ox = c[1], oy = c[2];
  const X = (a) => cx + (a - ox) * sc, Y = (b) => cy - (b - oy) * sc;
  const vec = best.ids.map((id, j) => ({ id, v: S.sens[id].slice(1).map((s) => s * best.x[j]) }));
  let x0 = cur[1], y0 = cur[2];
  const arrows = vec.filter((v) => Math.hypot(...v.v) > 0.05).map((v) => { const a = `<line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x0 + v.v[0])}" y2="${Y(y0 + v.v[1])}" stroke="${COL.find((q) => q.id === v.id).c === '#f4f5f6' ? '#cfd6dd' : COL.find((q) => q.id === v.id).c}" stroke-width="3" stroke-linecap="round"/>`; x0 += v.v[0]; y0 += v.v[1]; return a; }).join('');
  return `<h4 style="margin:16px 0 6px">Где цвет на плоскости a*–b*</h4><div class="plane"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Положение эталона, образца и прогноза на плоскости a*b*"><rect width="${W}" height="${H}" fill="#10202c" rx="14"/>
   ${[-10, -5, 0, 5, 10].map((g) => `<line x1="${cx + g * sc}" x2="${cx + g * sc}" y1="10" y2="${H - 10}" stroke="#fff" stroke-opacity="${g ? 0.08 : 0.25}"/><line y1="${cy + g * sc}" y2="${cy + g * sc}" x1="10" x2="${W - 10}" stroke="#fff" stroke-opacity="${g ? 0.08 : 0.25}"/>`).join('')}
   <circle cx="${cx}" cy="${cy}" r="${0.5 * sc * 2}" fill="none" stroke="#46d391" stroke-dasharray="3 3" stroke-opacity=".8"/>
   ${arrows}
   <circle cx="${X(cur[1])}" cy="${Y(cur[2])}" r="6" fill="#ff7a70" stroke="#10202c" stroke-width="2"/><text x="${X(cur[1]) + 9}" y="${Y(cur[2]) - 8}" font-size="11" fill="#ff7a70">сейчас</text>
   <circle cx="${X(pr[1])}" cy="${Y(pr[2])}" r="5" fill="#f6c453" stroke="#10202c" stroke-width="2"/><text x="${X(pr[1]) + 9}" y="${Y(pr[2]) + 14}" font-size="11" fill="#f6c453">прогноз</text>
   <circle cx="${cx}" cy="${cy}" r="6" fill="#46d391" stroke="#10202c" stroke-width="2"/><text x="${cx + 9}" y="${cy - 8}" font-size="11" fill="#46d391">эталон</text>
   <text x="${W - 14}" y="${cy - 5}" text-anchor="end" font-size="10" fill="#fff" fill-opacity=".6">+a* красный</text><text x="${cx + 4}" y="22" font-size="10" fill="#fff" fill-opacity=".6">+b* жёлтый</text><text x="14" y="${cy - 5}" font-size="10" fill="#fff" fill-opacity=".6">зелёный</text><text x="${cx + 4}" y="${H - 12}" font-size="10" fill="#fff" fill-opacity=".6">синий</text></svg>
   <p class="small" style="margin:6px 0 0">Цветные стрелки показывают вклад каждого колоранта. Пунктир: допуск ΔE ≈ 1 вокруг эталона.</p></div>`;
}

/* ---------- события ---------- */
const persist = () => store.set({ inst: S.inst, myName: S.myName, myNoise: S.myNoise, sens: S.sens });
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.inst) { S.inst = t.dataset.inst; persist(); render(); }
  else if (t.dataset.mode) { S.mode = t.dataset.mode; render(); }
  else if (t.dataset.bt) { S.batchType = t.dataset.bt; render(); }
  else if (t.dataset.n) { S.maxN = +t.dataset.n; render(); }
  else if (t.dataset.geo) { S.geoMode = t.dataset.geo; render(); }
  else if (t.id === 'demo') { demo(); }
  else if (t.id === 'copy') { navigator.clipboard && navigator.clipboard.writeText($('#res')._text || ''); t.textContent = 'Скопировано'; setTimeout(() => (t.textContent = 'Скопировать расчёт'), 1500); }
  else if (t.id === 'print') window.print();
  else if (t.id === 'calApply') applyCal();
  else if (t.id === 'calReset') { COL.forEach((c) => (S.sens[c.id] = c.s.slice())); persist(); render(); }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.lab) { const [key, k, c] = el.dataset.lab.split('|'); S[key][+k][+c] = pf(el.value); result(); }
  else if (el.id === 'batchKg') { S.batchKg = pf(el.value); result(); }
  else if (el.id === 'sampleKg') { S.sampleKg = pf(el.value) || 0; result(); }
  else if (el.dataset.allow) { S.allowed[el.dataset.allow] = el.checked; result(); }
  else if (el.dataset.cont) { const v = pf(el.value); S.content[el.dataset.cont] = Number.isFinite(v) ? v : undefined; result(); }
  else if (el.dataset.sens) { const [id, k] = el.dataset.sens.split('|'); const v = pf(el.value); if (Number.isFinite(v)) { S.sens[id][+k] = v; persist(); result(); } }
  else if (el.id === 'myName') { S.myName = el.value; persist(); }
  else if (el.id === 'myNoise') { const v = pf(el.value); if (v > 0) { S.myNoise = v; persist(); result(); } }
});
function demo() {
  S.mode = 'pair'; S.batchType = 'made'; S.inst = 'sph';
  S.std = [[45.2, -8.1, 15.0], [45.2, -8.1, 15.0], [45.2, -8.1, 15.0]]; S.smp = [[46.5, -6.9, 16.8], [46.5, -6.9, 16.8], [46.5, -6.9, 16.8]];
  S.batchKg = 1000; S.sampleKg = 0.5; S.content = {}; render();
}
function applyCal() {
  const id = $('#calSel').value, add = pf($('#calAdd').value), a = [0, 1, 2].map((i) => pf($('#cb' + i).value)), b = [0, 1, 2].map((i) => pf($('#ca' + i).value));
  if (!(add > 0) || [...a, ...b].some((v) => !Number.isFinite(v))) { $('#calMsg').textContent = 'Заполните все значения: добавка в % и L*a*b* до и после.'; return; }
  S.sens[id] = b.map((v, i) => +(((v - a[i]) / (add / 0.1))).toFixed(3));
  persist(); render(); $('#calMsg').textContent = 'Чувствительность сохранена в этом браузере.';
}
render();
