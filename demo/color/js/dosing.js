/**
 * Расчёт добавок: какие колоранты и сколько % добавить,
 * чтобы сместить образец к эталону.
 *
 * Модель (1-й этап): линейная.  Δ(цвет) ≈ Σ  c_i · v_i,
 *   c_i — доза колоранта i (% от массы базы), v_i = (ΔL, Δa, Δb) на 1 %.
 * Дозы только положительные (убрать пигмент нельзя). Перебираем наборы
 * из 1–3 колорантов и берём лучший; небольшая «штрафная» добавка (ridge)
 * не даёт получить решения вида «много красного + много зелёного».
 */

function solveLinear(M, v) {
  const n = v.length;
  const A = M.map((r, i) => [...r, v[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-12) return null;
    [A[i], A[p]] = [A[p], A[i]];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}

function subsets(n, maxK) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length) out.push([...cur]);
    if (cur.length === maxK) return;
    for (let i = start; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

/**
 * @param need  {dL,dA,dB} — на сколько надо сдвинуть образец (эталон − образец)
 * @param colorants  массив {id,name,dL,dA,dB,on}
 * @returns {items:[{id,name,css,pct}], shift:{dL,dA,dB}}  shift — ожидаемый сдвиг при 100 % расчёта
 */
function solveDosing(need, colorants, opts = {}) {
  const lambda = opts.lambda ?? 0.02;
  const d = [need.dL, need.dA, need.dB];
  const list = colorants.filter((c) => c.on);
  let best = { cost: d[0] * d[0] + d[1] * d[1] + d[2] * d[2], idx: [], c: [] };

  for (const idx of subsets(list.length, 3)) {
    const k = idx.length;
    const cols = idx.map((i) => [list[i].dL, list[i].dA, list[i].dB]);
    const N = [];
    const rhs = [];
    for (let i = 0; i < k; i++) {
      N.push([]);
      for (let j = 0; j < k; j++) {
        let s = 0;
        for (let t = 0; t < 3; t++) s += cols[i][t] * cols[j][t];
        N[i].push(s + (i === j ? lambda : 0));
      }
      rhs.push(cols[i][0] * d[0] + cols[i][1] * d[1] + cols[i][2] * d[2]);
    }
    const c = solveLinear(N, rhs);
    if (!c || c.some((x) => !(x > 1e-9))) continue;
    let res = 0;
    for (let t = 0; t < 3; t++) {
      let s = -d[t];
      for (let i = 0; i < k; i++) s += c[i] * cols[i][t];
      res += s * s;
    }
    const cost = res + lambda * c.reduce((a, x) => a + x * x, 0);
    if (cost < best.cost - 1e-12) best = { cost, idx, c };
  }

  const shift = { dL: 0, dA: 0, dB: 0 };
  const items = best.idx.map((li, k) => {
    const col = list[li];
    shift.dL += best.c[k] * col.dL;
    shift.dA += best.c[k] * col.dA;
    shift.dB += best.c[k] * col.dB;
    return { id: col.id, name: col.name, css: col.css, pct: best.c[k] };
  });
  items.sort((a, b) => b.pct - a.pct);
  return { items, shift };
}

/** 0,0123 % / 0,123 % / 1,23 % (запятая, до 0,0001 %) */
function fmtPct(p) {
  if (p < 0.0001) return '< 0,0001';
  const s = p >= 10 ? p.toFixed(1) : p >= 1 ? p.toFixed(2) : p >= 0.1 ? p.toFixed(3) : p.toFixed(4);
  return s.replace('.', ',');
}

/** масса добавки на партию: pct % от batchKg кг */
function fmtMass(pct, batchKg) {
  const g = (pct / 100) * batchKg * 1000;
  if (g >= 100) return g.toFixed(0).replace('.', ',') + ' г';
  if (g >= 1) return g.toFixed(2).replace('.', ',') + ' г';
  return (g * 1000).toFixed(g * 1000 >= 10 ? 0 : 1).replace('.', ',') + ' мг';
}

if (typeof module !== 'undefined') module.exports = { solveDosing, fmtPct, fmtMass };
