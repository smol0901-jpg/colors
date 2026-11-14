/**
 * Малая нейросеть (MLP) на чистом JS: вход — цвет образца + эффективные дозы колорантов,
 * выход — сдвиг ΔL*, Δa*, Δb*. Обучается в браузере на данных физической модели (model.js),
 * веса хранятся локально. Архитектура: (3 + N) → 20 → 20 → 3, tanh, Adam.
 */
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

const NN_OUT_SCALE = 20;

function nnFeatures(sam, eff) {
  const f = [sam.L / 100, sam.a / 100, sam.b / 100];
  for (let i = 0; i < eff.length; i++) f.push(Math.log10(1 + 100 * Math.max(0, eff[i])) / 3);
  return f;
}

class MLP {
  constructor(nIn, h = 20, rnd = Math.random) {
    this.nIn = nIn; this.h = h;
    const init = (n, fan) => Float64Array.from({ length: n }, () => (rnd() * 2 - 1) * Math.sqrt(3 / fan));
    this.W1 = init(h * nIn, nIn); this.b1 = new Float64Array(h);
    this.W2 = init(h * h, h); this.b2 = new Float64Array(h);
    this.W3 = init(3 * h, h); this.b3 = new Float64Array(3);
    this._adam = null;
  }
  forward(x, keep) {
    const { nIn, h } = this;
    const a1 = new Float64Array(h), a2 = new Float64Array(h), out = new Float64Array(3);
    for (let j = 0; j < h; j++) {
      let s = this.b1[j];
      for (let i = 0; i < nIn; i++) s += this.W1[j * nIn + i] * x[i];
      a1[j] = Math.tanh(s);
    }
    for (let j = 0; j < h; j++) {
      let s = this.b2[j];
      for (let i = 0; i < h; i++) s += this.W2[j * h + i] * a1[i];
      a2[j] = Math.tanh(s);
    }
    for (let k = 0; k < 3; k++) {
      let s = this.b3[k];
      for (let i = 0; i < h; i++) s += this.W3[k * h + i] * a2[i];
      out[k] = s;
    }
    return keep ? { a1, a2, out } : out;
  }
  predict(x) { const o = this.forward(x); return [o[0] * NN_OUT_SCALE, o[1] * NN_OUT_SCALE, o[2] * NN_OUT_SCALE]; }

  /** один шаг Adam по мини-батчу (X: массив входов, Y: массив целей в масштабе сети) */
  step(X, Y, lr) {
    const { nIn, h } = this;
    const g = { W1: new Float64Array(this.W1.length), b1: new Float64Array(h), W2: new Float64Array(this.W2.length), b2: new Float64Array(h), W3: new Float64Array(this.W3.length), b3: new Float64Array(3) };
    const n = X.length;
    for (let s = 0; s < n; s++) {
      const x = X[s], y = Y[s];
      const { a1, a2, out } = this.forward(x, true);
      const d3 = [out[0] - y[0], out[1] - y[1], out[2] - y[2]];
      const d2 = new Float64Array(h), d1 = new Float64Array(h);
      for (let k = 0; k < 3; k++) {
        g.b3[k] += d3[k];
        for (let i = 0; i < h; i++) { g.W3[k * h + i] += d3[k] * a2[i]; d2[i] += this.W3[k * h + i] * d3[k]; }
      }
      for (let i = 0; i < h; i++) d2[i] *= 1 - a2[i] * a2[i];
      for (let j = 0; j < h; j++) {
        g.b2[j] += d2[j];
        for (let i = 0; i < h; i++) { g.W2[j * h + i] += d2[j] * a1[i]; d1[i] += this.W2[j * h + i] * d2[j]; }
      }
      for (let i = 0; i < h; i++) d1[i] *= 1 - a1[i] * a1[i];
      for (let j = 0; j < h; j++) {
        g.b1[j] += d1[j];
        for (let i = 0; i < nIn; i++) g.W1[j * nIn + i] += d1[j] * x[i];
      }
    }
    if (!this._adam) {
      this._adam = { t: 0 };
      for (const k of Object.keys(g)) this._adam[k] = { m: new Float64Array(g[k].length), v: new Float64Array(g[k].length) };
    }
    const A = this._adam; A.t++;
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    for (const k of Object.keys(g)) {
      const P = this[k], G = g[k], M = A[k].m, V = A[k].v;
      for (let i = 0; i < P.length; i++) {
        const gi = G[i] / n;
        M[i] = b1 * M[i] + (1 - b1) * gi;
        V[i] = b2 * V[i] + (1 - b2) * gi * gi;
        P[i] -= (lr * (M[i] / (1 - Math.pow(b1, A.t)))) / (Math.sqrt(V[i] / (1 - Math.pow(b2, A.t))) + eps);
      }
    }
  }
  toJSON() { const r = (a) => Array.from(a, (v) => +v.toFixed(6)); return { nIn: this.nIn, h: this.h, W1: r(this.W1), b1: r(this.b1), W2: r(this.W2), b2: r(this.b2), W3: r(this.W3), b3: r(this.b3) }; }
  static fromJSON(o) {
    const m = new MLP(o.nIn, o.h, () => 0.5);
    for (const k of ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']) m[k] = Float64Array.from(o[k]);
    return m;
  }
}

function nnSignature(colorants) {
  return 'v1|' + colorants.map((c) => [c.id, c.dL, c.dA, c.dB].join(',')).join('|');
}

function genSample(colorants, rnd) {
  const sam = { L: 10 + rnd() * 85, a: -40 + rnd() * 100, b: -40 + rnd() * 120 };
  const eff = new Array(colorants.length).fill(0);
  const k = 1 + Math.floor(rnd() * 3);
  for (let t = 0; t < k; t++) {
    const i = Math.floor(rnd() * colorants.length);
    eff[i] = colorants[i].id === 'base' ? Math.pow(10, -2 + rnd() * 3.8) : Math.pow(10, -3.5 + rnd() * 4.4); // краски 0,0003…8 %, основа 0,01…63 %
  }
  return { sam, eff };
}

/** Обучение сети на физической модели. Асинхронно (не блокирует интерфейс). */
async function trainNN(colorants, opts = {}) {
  const N = opts.samples || 4000, epochs = opts.epochs || 130, batch = 64;
  const rnd = mulberry32(opts.seed || 7);
  const mk = (n) => {
    const X = [], Y = [];
    for (let i = 0; i < n; i++) {
      const { sam, eff } = genSample(colorants, rnd);
      X.push(nnFeatures(sam, eff));
      Y.push(effectPrior(sam, eff, colorants).map((v) => v / NN_OUT_SCALE));
    }
    return { X, Y };
  };
  const tr = mk(N), te = mk(600);
  const net = new MLP(3 + colorants.length, 20, rnd);
  const idx = Array.from({ length: N }, (_, i) => i);
  for (let ep = 0; ep < epochs; ep++) {
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const lr = 0.01 * (1 - 0.9 * (ep / epochs));
    for (let s = 0; s < N; s += batch) {
      const bi = idx.slice(s, s + batch);
      net.step(bi.map((i) => tr.X[i]), bi.map((i) => tr.Y[i]), lr);
    }
    if (opts.onProgress && ep % 5 === 4) { opts.onProgress((ep + 1) / epochs); await new Promise((r) => setTimeout(r, 0)); }
  }
  let mae = 0;
  for (let i = 0; i < te.X.length; i++) {
    const o = net.predict(te.X[i]);
    for (let k = 0; k < 3; k++) mae += Math.abs(o[k] - te.Y[i][k] * NN_OUT_SCALE);
  }
  mae /= te.X.length * 3;
  return { net, mae };
}

if (typeof module !== 'undefined') module.exports = { MLP, trainNN, nnFeatures, nnSignature, NN_OUT_SCALE };
