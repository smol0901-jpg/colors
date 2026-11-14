/**
 * Физическая «модель-подсказка» (prior): как краска сдвигает цвет в L*a*b*.
 * Учитывает то, что простая линейная модель не видит:
 *  - насыщение: чем больше добавлено, тем слабее каждая следующая доля (sat);
 *  - состояние базы: белый сильнее действует на тёмной базе, чёрный — на светлой,
 *    цветные пигменты слабее на уже насыщенной базе.
 * Это стартовые допущения — реальную силу каждой краски уточняют замеры (коэффициенты силы).
 * Малая нейросеть (nn.js) обучается воспроизводить эту модель и дальше используется для расчёта.
 */
const SAT_K = 0.08;
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** eff[i] — эффективная доза колоранта i, % (доза × коэффициент силы) */
function effectPrior(sam, eff, colorants) {
  let dL = 0, dA = 0, dB = 0;
  const C = Math.hypot(sam.a, sam.b);
  for (let i = 0; i < colorants.length; i++) {
    const e = eff[i];
    if (!(e > 0)) continue;
    const c = colorants[i];
    if (c.id === 'base') { const f = e / (100 + e); dL += (c.dL - sam.L) * f; dA += (c.dA - sam.a) * f; dB += (c.dB - sam.b) * f; continue; }
    const sat = 1 / (1 + SAT_K * e);
    let m;
    if (c.id === 'white') m = clampN((100 - sam.L) / 50, 0.15, 2.5);
    else if (c.id === 'black') m = clampN(sam.L / 50, 0.15, 2.5);
    else m = (0.7 + 0.3 * clampN(sam.L / 50, 0.2, 1.8)) / (1 + C / 200);
    const k = e * sat * m;
    dL += c.dL * k; dA += c.dA * k; dB += c.dB * k;
  }
  return [dL, dA, dB];
}

if (typeof module !== 'undefined') module.exports = { effectPrior, clampN };
