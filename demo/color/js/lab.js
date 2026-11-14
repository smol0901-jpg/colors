/**
 * CIE L*a*b* utilities for powder coating color correction.
 * D65 illuminant, 2° observer approximation for sRGB display.
 */

function labToRgb(L, a, b) {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const fInv = (t) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };

  const X = fInv(x) * 95.047;
  const Y = fInv(y) * 100.0;
  const Z = fInv(z) * 108.883;

  let r = (X * 3.2406 + Y * -1.5372 + Z * -0.4986) / 100;
  let g = (X * -0.9689 + Y * 1.8758 + Z * 0.0415) / 100;
  let bl = (X * 0.0557 + Y * -0.2040 + Z * 1.0570) / 100;

  const gamma = (v) =>
    v > 0.0031308
      ? 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055
      : 12.92 * v;

  r = Math.max(0, Math.min(1, gamma(r)));
  g = Math.max(0, Math.min(1, gamma(g)));
  bl = Math.max(0, Math.min(1, gamma(bl)));

  return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
}

function rgbCss(r, g, b) {
  return `rgb(${r},${g},${b})`;
}

function deltaE(L1, a1, b1, L2, a2, b2) {
  return Math.sqrt(
    Math.pow(L1 - L2, 2) + Math.pow(a1 - a2, 2) + Math.pow(b1 - b2, 2)
  );
}

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const hueDeg = (a, b) => { const h = deg(Math.atan2(b, a)); return h < 0 ? h + 360 : h; };

/** CIEDE2000 (Sharma et al.), kL=kC=kH=1 */
function deltaE00(s, t) {
  const C1 = Math.hypot(s.a, s.b), C2 = Math.hypot(t.a, t.b);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1 = (1 + G) * s.a, a2 = (1 + G) * t.a;
  const c1 = Math.hypot(a1, s.b), c2 = Math.hypot(a2, t.b);
  const h1 = c1 === 0 ? 0 : hueDeg(a1, s.b), h2 = c2 === 0 ? 0 : hueDeg(a2, t.b);
  const dL = t.L - s.L, dC = c2 - c1;
  let dh = 0;
  if (c1 * c2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));
  const Lb = (s.L + t.L) / 2, Cm = (c1 + c2) / 2;
  let hb = h1 + h2;
  if (c1 * c2 !== 0) {
    if (Math.abs(h1 - h2) > 180) hb += h1 + h2 < 360 ? 360 : -360;
    hb /= 2;
  }
  const T = 1 - 0.17 * Math.cos(rad(hb - 30)) + 0.24 * Math.cos(rad(2 * hb)) + 0.32 * Math.cos(rad(3 * hb + 6)) - 0.2 * Math.cos(rad(4 * hb - 63));
  const dTh = 30 * Math.exp(-Math.pow((hb - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2));
  const Sc = 1 + 0.045 * Cm, Sh = 1 + 0.015 * Cm * T;
  const Rt = -Math.sin(rad(2 * dTh)) * Rc;
  return Math.sqrt(Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh));
}

/** CMC l:c (по умолчанию 2:1), эталон — опорный цвет */
function deltaCMC(s, t, lw = 2, cw = 1) {
  const C1 = Math.hypot(s.a, s.b), C2 = Math.hypot(t.a, t.b);
  const dL = t.L - s.L, dC = C2 - C1;
  const dH2 = Math.max(0, Math.pow(t.a - s.a, 2) + Math.pow(t.b - s.b, 2) - dC * dC);
  const H1 = hueDeg(s.a, s.b);
  const T = H1 >= 164 && H1 <= 345 ? 0.56 + Math.abs(0.2 * Math.cos(rad(H1 + 168))) : 0.38 + Math.abs(0.4 * Math.cos(rad(H1 + 35)));
  const F = Math.sqrt(Math.pow(C1, 4) / (Math.pow(C1, 4) + 1900));
  const Sl = s.L < 16 ? 0.511 : (0.040975 * s.L) / (1 + 0.01765 * s.L);
  const Sc = (0.0638 * C1) / (1 + 0.0131 * C1) + 0.638;
  const Sh = Sc * (F * T + 1 - F);
  return Math.sqrt(Math.pow(dL / (lw * Sl), 2) + Math.pow(dC / (cw * Sc), 2) + dH2 / (Sh * Sh));
}

function deltaLab(std, sam) {
  const dL = sam.L - std.L, dA = sam.a - std.a, dB = sam.b - std.b;
  const dE = deltaE(std.L, std.a, std.b, sam.L, sam.a, sam.b);
  const dC = Math.hypot(sam.a, sam.b) - Math.hypot(std.a, std.b);
  let dH = Math.sqrt(Math.max(0, dE * dE - dL * dL - dC * dC));
  let d = hueDeg(sam.a, sam.b) - hueDeg(std.a, std.b);
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  if (d < 0) dH = -dH;
  return { dL, dA, dB, dC, dH, dE, dE00: deltaE00(std, sam), dCMC: deltaCMC(std, sam) };
}

/** Словесное описание «образец относительно эталона», как на экране прибора */
function describeDelta(d, eps = 0.3) {
  const p = [];
  if (Math.abs(d.dL) >= eps) p.push(d.dL > 0 ? 'светлее' : 'темнее');
  if (Math.abs(d.dA) >= eps) p.push(d.dA > 0 ? 'краснее' : 'зеленее');
  if (Math.abs(d.dB) >= eps) p.push(d.dB > 0 ? 'желтее' : 'синее');
  return p.length ? 'Образец ' + p.join(', ') + ' эталона' : 'Образец практически совпадает с эталоном';
}

if (typeof module !== 'undefined') module.exports = { deltaLab, deltaE00, deltaCMC };
