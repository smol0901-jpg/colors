/**
 * Интерактивный график a* и b* (центр = эталон) и полоса светлоты L*.
 * Вверх +b* (жёлтый), вниз −b* (синий), влево −a* (зелёный), вправо +a* (красный).
 * Образец ставится касанием/кликом/перетаскиванием.
 */

const bgCache = { key: '', canvas: null };

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function plotMap(std, R, w, h) {
  return {
    toX: (a) => ((a - (std.a - R)) / (2 * R)) * w,
    toY: (b) => h - ((b - (std.b - R)) / (2 * R)) * h,
    toA: (x) => std.a - R + (x / w) * 2 * R,
    toB: (y) => std.b - R + ((h - y) / h) * 2 * R,
  };
}

function backdrop(L, std, R) {
  const key = [L.toFixed(2), std.a.toFixed(2), std.b.toFixed(2), R].join('|');
  if (bgCache.key === key) return bgCache.canvas;
  const N = 56;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const cx = c.getContext('2d');
  const img = cx.createImageData(N, N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = std.a - R + ((i + 0.5) / N) * 2 * R;
      const b = std.b - R + ((N - j - 0.5) / N) * 2 * R;
      const [r, g, bl] = labToRgb(L, a, b);
      const o = (j * N + i) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = bl; img.data[o + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  bgCache.key = key; bgCache.canvas = c;
  return c;
}

function gridStep(R) {
  const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
  return steps.find((s) => s >= R / 5) || 20;
}

function tag(ctx, text, x, y, align) {
  ctx.font = '600 12px system-ui, sans-serif';
  const tw = ctx.measureText(text).width + 10;
  const tx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  ctx.fillStyle = 'rgba(15,23,42,0.72)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(tx, y - 11, tw, 18, 6) : ctx.rect(tx, y - 11, tw, 18);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(text, tx + 5, y + 2);
}

function drawPlot(canvas, std, sam, R, predicted) {
  const { ctx, w, h } = setupCanvas(canvas);
  const m = plotMap(std, R, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(backdrop(std.L, std, R), 0, 0, w, h);

  // сетка
  const step = gridStep(R);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.fillStyle = 'rgba(15,23,42,0.75)';
  ctx.font = '10px system-ui, sans-serif';
  for (let a = Math.ceil((std.a - R) / step) * step; a <= std.a + R; a += step) {
    const x = m.toX(a);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.fillText(+a.toFixed(3), x + 2, h - 3);
  }
  for (let b = Math.ceil((std.b - R) / step) * step; b <= std.b + R; b += step) {
    const y = m.toY(b);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.fillText(+b.toFixed(3), 3, y - 2);
  }
  // нулевые оси
  ctx.strokeStyle = 'rgba(15,23,42,0.85)';
  ctx.lineWidth = 2;
  if (std.a - R < 0 && std.a + R > 0) { const x = m.toX(0); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  if (std.b - R < 0 && std.b + R > 0) { const y = m.toY(0); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // подписи сторон
  tag(ctx, 'ЖЁЛТЫЙ +b*', w / 2, 16, 'center');
  tag(ctx, 'СИНИЙ −b*', w / 2, h - 16, 'center');
  tag(ctx, '← ЗЕЛЁНЫЙ −a*', 6, h / 2, 'left');
  tag(ctx, 'КРАСНЫЙ +a* →', w - 6, h / 2, 'right');

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pad = 14;
  const xT = m.toX(std.a), yT = m.toY(std.b);
  const rawX = m.toX(sam.a), rawY = m.toY(sam.b);
  const out = rawX < 0 || rawX > w || rawY < 0 || rawY > h;
  const xS = clamp(rawX, pad, w - pad), yS = clamp(rawY, pad, h - pad);

  // вектор «куда сместить образец»
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(xS, yS); ctx.lineTo(xT, yT); ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(yT - yS, xT - xS);
  if (Math.hypot(xT - xS, yT - yS) > 24) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(xT - 14 * Math.cos(ang), yT - 14 * Math.sin(ang));
    ctx.lineTo(xT - 14 * Math.cos(ang) - 11 * Math.cos(ang - 0.45), yT - 14 * Math.sin(ang) - 11 * Math.sin(ang - 0.45));
    ctx.lineTo(xT - 14 * Math.cos(ang) - 11 * Math.cos(ang + 0.45), yT - 14 * Math.sin(ang) - 11 * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  }

  // ожидаемая позиция после добавки
  if (predicted) {
    const xp = clamp(m.toX(predicted.a), pad, w - pad), yp = clamp(m.toY(predicted.b), pad, h - pad);
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(xp, yp, 13, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    tag(ctx, 'после', xp + 16, yp + 4, 'left');
  }

  // эталон — прицел
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(xT, yT, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(xT, yT, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xT - 20, yT); ctx.lineTo(xT + 20, yT); ctx.moveTo(xT, yT - 20); ctx.lineTo(xT, yT + 20); ctx.stroke();
  tag(ctx, 'ЭТАЛОН', xT + 16, yT - 14, 'left');

  // образец
  const [r, g, b] = labToRgb(sam.L, sam.a, sam.b);
  ctx.beginPath(); ctx.arc(xS, yS, 14, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(xS, yS, 16.5, 0, Math.PI * 2); ctx.stroke();
  tag(ctx, out ? 'ОБРАЗЕЦ (за краем — увеличьте масштаб)' : 'ОБРАЗЕЦ', xS + 20, yS + 20, 'left');
}

/* ---------- полоса светлоты ---------- */

function lRange(std, R) {
  const half = Math.max(2 * R, 0.2);
  let lo = Math.max(0, std.L - half), hi = Math.min(100, std.L + half);
  if (hi - lo < 0.4) { lo = Math.max(0, hi - 0.4); }
  return { lo, hi };
}

function drawLStrip(canvas, std, sam, R) {
  const { ctx, w, h } = setupCanvas(canvas);
  const { lo, hi } = lRange(std, R);
  const toY = (L) => h - ((L - lo) / (hi - lo)) * h;
  const grad = ctx.createLinearGradient(0, h, 0, 0);
  for (let i = 0; i <= 10; i++) {
    const L = lo + ((hi - lo) * i) / 10;
    const [r, g, b] = labToRgb(L, std.a, std.b);
    grad.addColorStop(i / 10, `rgb(${r},${g},${b})`);
  }
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

  const span = hi - lo;
  const lsteps = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
  const step = lsteps.find((s) => s >= span / 8) || 20;
  ctx.font = '10px system-ui, sans-serif';
  for (let L = Math.ceil(lo / step) * step; L <= hi; L += step) {
    const y = toY(L);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w * 0.4, y); ctx.stroke();
    ctx.fillStyle = 'rgba(15,23,42,0.8)'; ctx.fillText(+L.toFixed(3), 2, y - 2);
  }
  tag(ctx, 'СВЕТЛЕЕ', w / 2, 14, 'center');
  tag(ctx, 'ТЕМНЕЕ', w / 2, h - 14, 'center');

  const yT = toY(std.L);
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, yT); ctx.lineTo(w, yT); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, yT); ctx.lineTo(w, yT); ctx.stroke();

  const yS = Math.max(14, Math.min(h - 14, toY(sam.L)));
  const [r, g, b] = labToRgb(sam.L, sam.a, sam.b);
  ctx.beginPath(); ctx.arc(w / 2, yS, 14, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(w / 2, yS, 16.5, 0, Math.PI * 2); ctx.stroke();
}

function lStripToL(canvas, y, std, R) {
  const { lo, hi } = lRange(std, R);
  const h = canvas.clientHeight;
  return lo + ((h - y) / h) * (hi - lo);
}
