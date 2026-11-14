/**
 * «Мозг» подсказки: нейросеть (nn.js) считает отклик цвета на добавки, планировщик подбирает
 * дозы и осторожный размер шага, а журнал замеров калибрует силу каждой краски.
 *
 * Цель: уложиться в 1–2 корректировки (максимум 3). Перебор дозы опаснее недобора — убрать
 * краску нельзя, — поэтому первый шаг берётся неполным, а доля зависит от неопределённости силы краски.
 */
const STRENGTH_KEY = 'asv_strength_v1';
const OBS_KEY = 'asv_obs_v1';
const BRAIN_KEY = 'asv_brain_v1';
const Brain = { net: null, sig: null, mae: null, status: 'idle', progress: 0 };

function predictShift(sam, eff, colorants) {
  if (Brain.net && Brain.sig === nnSignature(colorants)) return Brain.net.predict(nnFeatures(sam, eff));
  return effectPrior(sam, eff, colorants);
}

/* ---------- сила красок (калибровка) ---------- */
function sigmaOf(n) { return Math.max(0.1, 0.35 / Math.sqrt(1 + 0.5 * n)); }

function loadStrengths(colorants) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STRENGTH_KEY) || '{}'); } catch {}
  const out = {};
  colorants.forEach((c) => { out[c.id] = { s: saved[c.id]?.s > 0 ? saved[c.id].s : 1, n: saved[c.id]?.n || 0 }; });
  return out;
}
function saveStrengths(st) { try { localStorage.setItem(STRENGTH_KEY, JSON.stringify(st)); } catch {} }

function loadObs() { try { return JSON.parse(localStorage.getItem(OBS_KEY) || '[]'); } catch { return []; } }
function saveObs(list) { try { localStorage.setItem(OBS_KEY, JSON.stringify(list.slice(-200))); } catch {} }

/* ---------- нейросеть: загрузка / обучение ---------- */
async function ensureBrain(colorants, onProgress, force) {
  const sig = nnSignature(colorants);
  if (!force) {
    try {
      const saved = JSON.parse(localStorage.getItem(BRAIN_KEY) || 'null');
      if (saved && saved.sig === sig) {
        Brain.net = MLP.fromJSON(saved.net); Brain.sig = sig; Brain.mae = saved.mae; Brain.status = 'ready';
        return Brain;
      }
    } catch {}
  }
  Brain.status = 'training'; Brain.net = null; Brain.sig = null;
  const r = await trainNN(colorants, { onProgress: (p) => { Brain.progress = p; if (onProgress) onProgress(p); } });
  Brain.net = r.net; Brain.sig = sig; Brain.mae = r.mae; Brain.status = 'ready';
  try { localStorage.setItem(BRAIN_KEY, JSON.stringify({ sig, mae: r.mae, net: r.net.toJSON() })); } catch {}
  return Brain;
}

/* ---------- планирование ---------- */
function plannerDE(std, p) { return deltaE(std.L, std.a, std.b, p.L, p.a, p.b); }

function planCorrection({ std, sam, colorants, strengths, tol = 1, mode = 'auto' }) {
  const n = colorants.length;
  const S = colorants.map((c) => strengths[c.id]?.s ?? 1);
  const N = colorants.map((c) => strengths[c.id]?.n ?? 0);
  const sig = N.map(sigmaOf);
  const ones = new Array(n).fill(1);
  const after = (c, scen) => {
    const eff = c.map((v, i) => v * S[i] * scen[i]);
    const sh = predictShift(sam, eff, colorants);
    return { L: sam.L + sh[0], a: sam.a + sh[1], b: sam.b + sh[2] };
  };
  const dE0 = plannerDE(std, sam);

  // 1) старт — линейное решение с учётом силы красок
  const scaled = colorants.map((c, i) => c.id === 'base'
    ? { ...c, dL: (c.dL - sam.L) / 100, dA: (c.dA - sam.a) / 100, dB: (c.dB - sam.b) / 100 }
    : { ...c, dL: c.dL * S[i], dA: c.dA * S[i], dB: c.dB * S[i] });
  const lin = solveDosing({ dL: std.L - sam.L, dA: std.a - sam.a, dB: std.b - sam.b }, scaled);
  let full = new Array(n).fill(0);
  lin.items.forEach((it) => { full[colorants.findIndex((c) => c.id === it.id)] = it.pct; });
  if (!full.some((v) => v > 0)) return { items: [], full: [], dE0, alpha: 0 };

  // 2) уточнение дозы нейросетью (поиск по шаблону) + пробное добавление других разрешённых колорантов
  const J = (c) => plannerDE(std, after(c, ones)) + 0.004 * c.reduce((a, b) => a + b, 0);
  let best = J(full);
  const refine = () => {
    for (const step of [0.35, 0.18, 0.09, 0.04, 0.02, 0.01]) {
      for (let it = 0; it < 12; it++) {
        let improved = false;
        for (let i = 0; i < n; i++) {
          if (!(full[i] > 0)) continue;
          for (const f of [1 + step, 1 - step]) {
            const t = full.slice(); t[i] = full[i] * f;
            const v = J(t);
            if (v < best - 1e-9) { best = v; full = t; improved = true; }
          }
        }
        if (!improved) break;
      }
    }
  };
  refine();
  for (let round = 0; round < 2; round++) {
    let cand = null, candV = best - 0.15; // добавляем краску, только если она заметно улучшает результат
    for (let i = 0; i < n; i++) {
      if (!colorants[i].on || full[i] > 0) continue;
      for (const d of colorants[i].id === 'base' ? [0.5, 2, 6, 15, 30] : [0.005, 0.03, 0.15, 0.6]) {
        const t = full.slice(); t[i] = d;
        const v = J(t);
        if (v < candV) { candV = v; cand = t; }
      }
    }
    if (!cand) break;
    full = cand; best = J(full); refine();
  }

  // 3) размер шага
  const used = full.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
  const uncal = used.some((i) => N[i] === 0);
  const weak = sig.map((s) => 1 - s), strong = sig.map((s) => 1 + s);
  const err = (alpha) => {
    const c = full.map((v) => v * alpha);
    return { w: plannerDE(std, after(c, weak)), s: plannerDE(std, after(c, strong)), n: plannerDE(std, after(c, ones)) };
  };
  // ожидаемые потери по сценариям силы красок: перебор (прошли цель) считается в 3 раза хуже недобора
  const ZS = [[-1.5, 0.1], [-0.75, 0.25], [0, 0.3], [0.75, 0.25], [1.5, 0.1]];
  const dx = [std.L - sam.L, std.a - sam.a, std.b - sam.b];
  const dx2 = dx[0] * dx[0] + dx[1] * dx[1] + dx[2] * dx[2] || 1;
  const expLoss = (alpha) => {
    const c = full.map((v) => v * alpha);
    let loss = 0;
    for (const [z, w] of ZS) {
      const p = after(c, sig.map((s) => Math.exp(s * z)));
      const prj = ((p.L - sam.L) * dx[0] + (p.a - sam.a) * dx[1] + (p.b - sam.b) * dx[2]) / dx2;
      loss += w * plannerDE(std, p) * (prj > 1 ? 4 : 1);
    }
    return loss;
  };
  let alpha;
  if (mode === 'auto') {
    const maxA = uncal ? 0.75 : 0.9;
    let bestLoss = Infinity; alpha = 0.4;
    for (let a = 0.4; a <= maxA + 1e-9; a += 0.025) {
      const l = expLoss(a);
      if (l < bestLoss) { bestLoss = l; alpha = a; }
    }
  } else alpha = Number(mode) || 0.5;

  const doses = full.map((v) => { const d = Math.round(v * alpha * 10000) / 10000; return d >= 0.0001 ? d : 0; });
  const e = err(alpha);
  const nominal = after(doses, ones);
  const worst = Math.max(e.w, e.s);
  let steps = 1;
  if (worst > tol) {
    const sig2 = used.reduce((a, i) => a + sigmaOf(N[i] + 1), 0) / used.length;
    steps = e.n * sig2 * 1.5 + 0.15 <= tol ? 2 : 3;
  }
  return {
    items: doses.map((d, i) => ({ id: colorants[i].id, name: colorants[i].name, css: colorants[i].css, pct: d })).filter((x) => x.pct > 0).sort((a, b) => b.pct - a.pct),
    fullItems: full.map((d, i) => ({ id: colorants[i].id, name: colorants[i].name, pct: d })).filter((x) => x.pct > 0),
    alpha, uncal, dE0, nominal, dENominal: e.n, dEWeak: e.w, dEStrong: e.s, steps,
    sigma: used.length ? used.reduce((a, i) => a + sig[i], 0) / used.length : 0,
  };
}

/* ---------- обучение по замеру после добавки ---------- */
function fitStrengths(colorants, strengths, obs) {
  const target = [obs.after.L - obs.before.L, obs.after.a - obs.before.a, obs.after.b - obs.before.b];
  const idx = obs.doses.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return { skipped: 'Доз нет — учиться не на чем.' };
  if (Math.hypot(...target) < 0.12) return { skipped: 'Цвет сдвинулся меньше шума прибора (< 0,12) — замер не использован.' };
  const cur = colorants.map((c) => strengths[c.id]?.s ?? 1);
  const f = cur.slice();
  const cost = () => {
    const eff = obs.doses.map((v, i) => v * f[i]);
    const sh = predictShift(obs.before, eff, colorants);
    return (sh[0] - target[0]) ** 2 + (sh[1] - target[1]) ** 2 + (sh[2] - target[2]) ** 2;
  };
  let c0 = cost();
  for (let d = 0.5; d > 0.01; d *= 0.7) {
    for (let r = 0; r < 8; r++) {
      let improved = false;
      for (const i of idx) {
        for (const m of [Math.exp(d), Math.exp(-d)]) {
          const old = f[i]; f[i] = Math.min(5, Math.max(0.2, old * m));
          const v = cost();
          if (v < c0 - 1e-12) { c0 = v; improved = true; } else f[i] = old;
        }
      }
      if (!improved) break;
    }
  }
  const changes = idx.map((i) => {
    const id = colorants[i].id, old = strengths[id]?.s ?? 1, n = strengths[id]?.n ?? 0;
    const w = n === 0 ? 0.6 : 0.4;
    const ns = Math.exp((1 - w) * Math.log(old) + w * Math.log(f[i]));
    strengths[id] = { s: Math.round(ns * 1000) / 1000, n: n + 1 };
    return { id, name: colorants[i].name, from: old, to: strengths[id].s, n: n + 1 };
  });
  return { changes };
}

if (typeof module !== 'undefined') module.exports = {};
