/** Кадры визуального контроля ленты и чипсов. Иллюстрации: чистые функции «значения → SVG-строка». */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
export const LIM = { tOutMax: 35, thMin: 1.0, thMax: 2.0, brMin: 90, incMax: 3 };
export const NORM = { t0: 70, t1: 46, t2: 28, th: 1.45, br: 97, inc: 0.8 };
export const STRETCH = { t0: 73, t1: 57, t2: 42, th: 1.85, br: 80, inc: 0.8 };
export const BURN = { t0: 70, t1: 46, t2: 28, th: 1.45, br: 96, inc: 8 };
const TMIN = 20, TMAX = 85;
export function tcol(t) {
  const k = clamp((t - TMIN) / (TMAX - TMIN), 0, 1), st = [[0, [44, 92, 200]], [0.35, [40, 190, 190]], [0.62, [240, 200, 40]], [1, [222, 60, 40]]];
  for (let i = 1; i < st.length; i++) if (k <= st[i][0]) { const [k0, c0] = st[i - 1], [k1, c1] = st[i], f = (k - k0) / (k1 - k0); return 'rgb(' + c0.map((c, j) => Math.round(c + (c1[j] - c) * f)) + ')'; }
  return 'rgb(222,60,40)';
}
const tAt = (v, x) => (x < 0.5 ? v.t0 + (v.t1 - v.t0) * (x / 0.5) : v.t1 + (v.t2 - v.t1) * ((x - 0.5) / 0.5));
const open = (label) => `<svg viewBox="0 0 400 240" role="img" aria-label="${label}" style="display:block;width:100%;height:auto;border-radius:12px;background:#171c24;font-family:system-ui,sans-serif">`;
const T = (x, y, t, o = '') => `<text x="${x}" y="${y}" font-size="10" fill="#cdd5df" ${o}>${t}</text>`;
const chipPts = (r, w, h) => { const j = () => (r() - 0.5) * 3; return [[-w, -h * 0.6], [-w * 0.3, -h], [w * 0.8, -h * 0.7], [w, h * 0.3], [w * 0.2, h], [-w * 0.9, h * 0.7]].map(([px, py]) => `${(px + j()).toFixed(1)},${(py + j()).toFixed(1)}`).join(' '); };
const specks = (r, n, w, h, big) => { let s = ''; for (let k = 0; k < n; k++) s += `<circle cx="${((r() - 0.5) * w * 1.1).toFixed(1)}" cy="${((r() - 0.5) * h * 1.1).toFixed(1)}" r="${(big ? 2.2 + r() * 1.8 : 0.9 + r() * 0.9).toFixed(1)}" fill="#1b130a"/>`; return s; };

/** Кадр камеры у выхода ленты: излом или тянучка, вкрапления. */
export function frameRGB(v) {
  const r = rnd(11), N = 18, bad = Math.floor(N * (100 - v.br) / 100 * 1.5), nInc = Math.min(6, Math.round(v.inc / 1.4));
  let g = '', bx = '', good = 0, inc = 0;
  for (let i = 0; i < N; i++) {
    const x = 30 + r() * 340, y = 82 + r() * 118, w = 13 + r() * 9, h = 7 + r() * 5, a = Math.floor(r() * 180), col = ['#e9b21a', '#d99a12', '#f0c04a'][i % 3], isBad = i < bad;
    const tf = `translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${a})`;
    if (isBad) {
      g += `<g transform="${tf}"><path d="M${-w * 1.1 - 18} 1q10 -3 18 -1M${w * 1.1} 0q10 3 20 -1" stroke="#b9800f" stroke-width="1.3" fill="none"/><ellipse rx="${(w * 1.1).toFixed(1)}" ry="${(h * 0.55).toFixed(1)}" fill="#c98a10"/></g>`;
      bx += `<rect x="${(x - w - 20).toFixed(0)}" y="${(y - 14).toFixed(0)}" width="${(2 * w + 40).toFixed(0)}" height="28" fill="none" stroke="#ff5a4d" stroke-width="1.6" rx="2"/><text x="${(x - w - 20).toFixed(0)}" y="${(y - 17).toFixed(0)}" font-size="9" font-weight="700" fill="#ff5a4d">тянучка</text>`;
    } else {
      const hasInc = inc < nInc && i % 3 === 1; if (hasInc) inc++;
      g += `<g transform="${tf}"><polygon points="${chipPts(r, w, h)}" fill="${col}"/><polyline points="${-w * 0.9},${h * 0.7} ${-w * 0.3},${-h} ${w * 0.8},${-h * 0.7}" stroke="#fff4c8" stroke-width="1.4" fill="none"/>${hasInc ? specks(r, 2, w, h, true) : ''}</g>`;
      if (hasInc) bx += `<rect x="${(x - w - 6).toFixed(0)}" y="${(y - h - 7).toFixed(0)}" width="${(2 * w + 12).toFixed(0)}" height="${(2 * h + 14).toFixed(0)}" fill="none" stroke="#ff9f1c" stroke-width="1.6" rx="2"/><text x="${(x - w - 6).toFixed(0)}" y="${(y - h - 10).toFixed(0)}" font-size="9" font-weight="700" fill="#ff9f1c">вкрапление</text>`;
      else if (good++ < 2) bx += `<rect x="${(x - w - 5).toFixed(0)}" y="${(y - h - 6).toFixed(0)}" width="${(2 * w + 10).toFixed(0)}" height="${(2 * h + 12).toFixed(0)}" fill="none" stroke="#3ddc84" stroke-width="1.6" rx="2"/><text x="${(x - w - 5).toFixed(0)}" y="${(y - h - 9).toFixed(0)}" font-size="9" font-weight="700" fill="#3ddc84">излом</text>`;
    }
  }
  const warn = v.br < LIM.brMin || v.inc > LIM.incMax;
  return open('Кадр камеры: излом, тянучка и вкрапления в чипсах') + `<rect y="62" width="400" height="160" fill="#20262f"/><path d="M0 62H400M0 222H400" stroke="#3a4350" stroke-width="2"/>${g}${bx}${T(10, 16, 'CAM-03 · выход охлаждающей ленты', 'font-weight="700" fill="#fff"')}<circle cx="388" cy="13" r="4" fill="#ff5a4d"/>${T(10, 36, 'форма излома: острые грани или вытянутые края; тёмные вкрапления')}<rect y="224" width="400" height="16" fill="rgba(0,0,0,.6)"/><text x="10" y="236" font-size="10" fill="${warn ? '#ff8a80' : '#9be7b9'}" font-weight="700">чистых изломов ${v.br.toFixed(0)} % · вкрапления ${v.inc.toFixed(1)} шт/мин${warn ? ' · есть отклонение' : ''}</text></svg>`;
}

/** Макро-кадр: тёмные вкрапления (частицы пригорания) в чипсах. */
export function frameInclusions(v) {
  const r = rnd(5), n = clamp(Math.round(v.inc), 0, 12), over = v.inc > LIM.incMax;
  let g = '', k = 0;
  for (let i = 0; i < 6; i++) {
    const cx = 70 + (i % 3) * 130, cy = 100 + Math.floor(i / 3) * 88, w = 46, h = 30, a = (i * 37) % 60 - 30;
    const m = i < n ? (i < 3 ? 2 : 1) : 0; k += m;
    g += `<g transform="translate(${cx} ${cy}) rotate(${a})"><polygon points="${chipPts(r, w, h)}" fill="#e2a915"/><polyline points="${-w * 0.9},${h * 0.7} ${-w * 0.3},${-h} ${w * 0.8},${-h * 0.7}" stroke="#fff4c8" stroke-width="2" fill="none"/>${m ? specks(r, m, w, h, true) : ''}</g>`;
    if (m) g += `<circle cx="${cx}" cy="${cy}" r="${w * 0.9}" fill="none" stroke="#ff9f1c" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  }
  return open('Макро-кадр чипсов: поиск тёмных вкраплений от пригорания') + T(10, 16, 'Макро-камера: поиск тёмных вкраплений (пригорание, посторонние частицы)', 'font-weight="700" fill="#fff"') + `<rect y="38" width="400" height="168" fill="#20262f"/>${g}` +
    T(10, 224, 'размер вкрапления считается по пикселям, порог тревоги ' + LIM.incMax + ' шт/мин') + `<text x="390" y="232" font-size="12" font-weight="700" text-anchor="end" fill="${over ? '#ff8a80' : '#9be7b9'}">${v.inc.toFixed(1)} шт/мин${over ? ' · проверить шнек' : ' · норма'}</text></svg>`;
}

export function frameThermal(v) {
  let sl = '', ch = '';
  for (let i = 0; i < 40; i++) sl += `<rect x="${20 + i * 9}" y="34" width="9.5" height="46" fill="${tcol(tAt(v, i / 39))}"/>`;
  const Y = (t) => 200 - ((t - TMIN) / (TMAX - TMIN)) * 66, pts = [];
  for (let i = 0; i <= 24; i++) pts.push(`${(20 + i * 15).toFixed(0)},${Y(tAt(v, i / 24)).toFixed(1)}`);
  const yl = Y(LIM.tOutMax), hot = v.t2 > LIM.tOutMax;
  [[36, 'вход', v.t0], [200, 'середина', v.t1], [364, 'выход', v.t2]].forEach(([x, n, t]) => {
    ch += `<path d="M${x} 28V86" stroke="#fff" stroke-dasharray="3 3"/><circle cx="${x}" cy="57" r="4" fill="#ff3b30" stroke="#fff"/>${T(x, 100, n, 'text-anchor="middle"')}<text x="${x}" y="116" font-size="15" font-weight="700" text-anchor="middle" fill="${n === 'выход' && hot ? '#ff8a80' : '#fff'}">${t.toFixed(0)} °C</text>`;
  });
  const id = 'tg' + Math.round(v.t2);
  return open('Тепловизор и лазерные пирометры: температура ленты на входе, в середине и на выходе') + `<defs><linearGradient id="${id}"><stop offset="0" stop-color="${tcol(25)}"/><stop offset=".4" stop-color="${tcol(45)}"/><stop offset=".7" stop-color="${tcol(65)}"/><stop offset="1" stop-color="${tcol(85)}"/></linearGradient></defs>` + T(10, 16, 'Тепловизор по всей ленте + лазерные пирометры в трёх точках', 'font-weight="700" fill="#fff"') + sl + ch +
    `<path d="M20 134H380M20 200H380" stroke="#3a4350"/><path d="M20 ${yl.toFixed(1)}H380" stroke="#ff8a80" stroke-dasharray="4 4"/>${T(24, (yl - 3).toFixed(1), 'норма на выходе до ' + LIM.tOutMax + ' °C', 'fill="#ff8a80"')}<polyline points="${pts.join(' ')}" fill="none" stroke="#fff" stroke-width="2.2"/>${T(20, 130, 'температура по длине ленты')}` +
    `<rect x="20" y="212" width="150" height="8" fill="url(#${id})" rx="3"/>${T(20, 232, '25 °C')}${T(170, 232, '85 °C', 'text-anchor="end"')}<text x="380" y="226" font-size="12" font-weight="700" text-anchor="end" fill="${hot ? '#ff8a80' : '#9be7b9'}">вход−выход ${(v.t0 - v.t2).toFixed(0)} °C${hot ? ' · чипсы тёплые' : ''}</text></svg>`;
}

export function frameLaser(v) {
  const h = v.th * 22, y0 = 92, bad = v.th > LIM.thMax || v.th < LIM.thMin, yy = (m) => 215 - ((m - 0.6) / 1.8) * 90, pts = [];
  for (let i = 0; i <= 40; i++) { const e = i < 3 || i > 37 ? -0.14 : 0; pts.push(`${(20 + i * 9).toFixed(0)},${yy(v.th + 0.04 * Math.sin(i * 1.7) + e).toFixed(1)}`); }
  return open('Лазерный датчик: толщина ленты и профиль по ширине') + T(10, 16, 'Лазерный датчик толщины над лентой', 'font-weight="700" fill="#fff"') +
    `<rect x="172" y="22" width="56" height="14" rx="3" fill="#4a5360"/><path d="M200 36L140 ${y0 - h}M200 36L260 ${y0 - h}" stroke="#ff3b30" stroke-width="1.4" opacity=".8"/><path d="M140 ${y0 - h}H260" stroke="#ff3b30" stroke-width="2.4"/>` +
    `<rect x="140" y="${y0 - h}" width="120" height="${h}" fill="${bad ? '#e0a030' : '#e9b21a'}"/><rect x="100" y="${y0}" width="200" height="6" fill="#3a4350"/><path d="M278 ${y0 - h}V${y0}M274 ${y0 - h}h8M274 ${y0}h8" stroke="#fff"/><text x="288" y="${y0 - h / 2 + 4}" font-size="13" font-weight="700" fill="${bad ? '#ff8a80' : '#fff'}">${v.th.toFixed(2)} мм</text>` +
    T(20, 124, 'профиль толщины по ширине ленты') + `<rect x="20" y="${yy(LIM.thMax)}" width="360" height="${yy(LIM.thMin) - yy(LIM.thMax)}" fill="#3ddc84" opacity=".16"/><path d="M20 ${yy(LIM.thMax)}H380M20 ${yy(LIM.thMin)}H380" stroke="#3ddc84" stroke-dasharray="3 3" opacity=".7"/>` +
    T(382, yy(LIM.thMax) - 2, 'до ' + LIM.thMax + ' мм', 'text-anchor="end" fill="#9be7b9"') + T(382, yy(LIM.thMin) + 11, 'от ' + LIM.thMin + ' мм', 'text-anchor="end" fill="#9be7b9"') +
    `<polyline points="${pts.join(' ')}" fill="none" stroke="${bad ? '#ff8a80' : '#fff'}" stroke-width="2.2"/><text x="20" y="236" font-size="10" font-weight="700" fill="${bad ? '#ff8a80' : '#9be7b9'}">${bad ? 'толщина вне допуска: лента остывает дольше, растёт риск тянучки' : 'толщина в допуске, технолог перепроверяет выборочно'}</text></svg>`;
}
