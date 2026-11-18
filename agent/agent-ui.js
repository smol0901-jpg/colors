/* Страница «ИИ-агент контроля линий»: интерактивная демонстрация без сборки. Данные имитированы. */
import { LINES, lineById, lineStatus, vibStatus, zoneStatus, cameraStatus, wearStatus, worst, spectrum, STATUS_LABEL, VIB_WARN, VIB_BAD, TOPICS, buildAnswer, defaultQuestion, parseQuery, noteFor, impactFor, impactRub, fleetImpact, rub } from './agent-core.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v, d = 1) => v.toFixed(d).replace('.', ',').replace('-', '−');
const TC = { ok: '#46d391', warn: '#f6c453', bad: '#ff7a70' };
const TL = { ok: 'ok', warn: 'warn', bad: 'bad' };
const JKEY = 'line-agent-journal-v2';
const time = (ts, sec) => new Date(ts).toLocaleTimeString('ru-RU', sec ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : { hour: '2-digit', minute: '2-digit' });
const targetLabel = (t) => (t === 'all' ? 'Все линии' : 'Линия ' + t);

/* ---------- иконки ---------- */
const IC = {
  radio: '<path d="M4 12a8 8 0 0 1 16 0M7 12a5 5 0 0 1 10 0"/><circle cx="12" cy="12" r="1.6"/><path d="M12 14v7"/>',
  camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  ff: '<path d="M4 6l8 6-8 6zM12 6l8 6-8 6z"/>',
};
const ico = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

/* ---------- графики ---------- */
function trend({ values, forecast, thresholds = [], tone = 'ok', height = 120, min, max, xLabels, id }) {
  const W = 320, H = height;
  const all = [...values, ...(forecast || []), ...thresholds.map((t) => t.v)];
  const mn = Math.min(...all), mx = Math.max(...all);
  const lo = min ?? mn - (mx - mn) * 0.15, hi = max ?? mx + (mx - mn) * 0.15 + 0.001;
  const total = values.length + (forecast ? forecast.length : 0);
  const x = (i) => (i / Math.max(1, total - 1)) * W;
  const y = (v) => H - 6 - ((v - lo) / (hi - lo)) * (H - 12);
  const last = values[values.length - 1] ?? 0;
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${path}L${x(values.length - 1)},${H}L0,${H}Z`;
  const fpath = forecast && forecast.length ? [last, ...forecast].map((v, i) => `${i ? 'L' : 'M'}${x(values.length - 1 + i).toFixed(1)},${y(v).toFixed(1)}`).join('') : '';
  const c = TC[tone];
  return `<div><svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none" role="img" aria-label="График тренда">
    <defs><linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75].map((f) => `<line x1="0" x2="${W}" y1="${H * f}" y2="${H * f}" stroke="currentColor" stroke-opacity=".1"/>`).join('')}
    ${thresholds.map((t) => `<g><line x1="0" x2="${W}" y1="${y(t.v)}" y2="${y(t.v)}" stroke="${TC[t.tone]}" stroke-dasharray="4 4" stroke-opacity=".85"/><text x="3" y="${y(t.v) - 4}" font-size="9" fill="${TC[t.tone]}">${t.label}</text></g>`).join('')}
    <path d="${area}" fill="url(#g-${id})"/><path d="${path}" fill="none" stroke="${c}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
    ${fpath ? `<path d="${fpath}" fill="none" stroke="${TC.bad}" stroke-width="1.8" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>` : ''}
    <circle cx="${x(values.length - 1)}" cy="${y(last)}" r="3.2" fill="${c}"/></svg>
    ${xLabels ? `<div class="xl">${xLabels.map((l) => `<span>${l}</span>`).join('')}</div>` : ''}</div>`;
}
function spectrumChart(data, peaks, tone) {
  const W = 320, H = 130, mx = Math.max(...data) * 1.25, bw = W / data.length;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Спектр вибрации">
    ${data.map((v, i) => { const h = (v / mx) * (H - 22), f = i * 2.5, hot = peaks.some((p) => p.hot && Math.abs(p.f - f) < 3); return `<rect x="${(i * bw).toFixed(1)}" y="${(H - 12 - h).toFixed(1)}" width="${Math.max(1, bw - 0.6).toFixed(1)}" height="${h.toFixed(1)}" rx=".6" fill="${hot ? TC[tone] : 'currentColor'}" fill-opacity="${hot ? 0.95 : 0.35}"/>`; }).join('')}
    ${peaks.map((p) => { const i = Math.round(p.f / 2.5), h = ((data[i] || 0) / mx) * (H - 22); return `<text x="${Math.min(W - 4, Math.max(4, i * bw)).toFixed(1)}" y="${Math.max(9, H - 16 - h).toFixed(1)}" text-anchor="${i * bw > W - 60 ? 'end' : 'start'}" font-size="8.5" fill="${p.hot ? TC[tone] : 'currentColor'}" fill-opacity="${p.hot ? 1 : 0.7}">${esc(p.label)}</text>`; }).join('')}
    <line x1="0" x2="${W}" y1="${H - 12}" y2="${H - 12}" stroke="currentColor" stroke-opacity=".25"/>
    ${[0, 80, 160, 240, 320].map((f) => `<text x="${Math.min(W - 2, (f / 320) * W)}" y="${H - 1}" font-size="8" text-anchor="${f === 0 ? 'start' : f === 320 ? 'end' : 'middle'}" fill="currentColor" fill-opacity=".55">${f} Гц</text>`).join('')}</svg>`;
}
function zoneProfile(zones) {
  return `<div class="zp">${zones.map((z, i) => { const s = zoneStatus(z), d = z.act - z.set; return `<div><span class="zd t-${s}">${d >= 0 ? '+' : ''}${num(d)}</span><div class="zb"><i class="bg-${s}" style="height:${(z.act / 130) * 100}%"></i><b style="bottom:${(z.set / 130) * 100}%" title="Уставка ${z.set} °C"></b></div><span class="zv">${num(z.act)}°</span><span class="zn">${i < zones.length - 1 ? 'зона ' + (i + 1) : 'фильера'}</span></div>`; }).join('')}</div>`;
}
function gauge(value, max, zones, unit, label) {
  const R = 52, cx = 64, cy = 62, ang = (v) => Math.PI * (1 - Math.min(v, max) / max), pt = (a, r = R) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  let from = 0;
  const arcs = zones.map((z) => { const [x1, y1] = pt(ang(from)), [x2, y2] = pt(ang(z.to)); from = z.to; return `<path d="M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}" fill="none" stroke="${TC[z.tone]}" stroke-opacity=".85" stroke-width="8"/>`; });
  const [nx, ny] = pt(ang(value), R - 12);
  const cur = (zones.find((z) => value <= z.to) || zones[zones.length - 1]).tone;
  return `<div class="gauge"><svg viewBox="0 0 128 74" role="img" aria-label="${label}: ${value} ${unit}">${arcs.join('')}<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="currentColor"/></svg><div class="gv t-${cur}">${num(value)} <small>${unit}</small></div></div>`;
}
const bar = (v, tone) => `<div class="bar"><i class="bg-${tone}" style="width:${Math.max(2, Math.min(100, v * 100))}%"></i></div>`;
const pill = (s) => `<span class="pill p-${s}"><i></i>${STATUS_LABEL[s]}</span>`;

/* ---------- карточки доказательств ---------- */
const glass = (label, value, unit, tone, hint, children, cls = '') => `<div class="gl ${cls}"><div class="gl-h"><span>${label}</span>${tone ? `<i class="dot bg-${tone}"></i>` : ''}</div>${value !== undefined && value !== null ? `<div class="gl-v ${tone ? 't-' + tone : ''}" ${String(value).length > 9 ? 'style="font-size:16px"' : ''}>${value}${unit ? `<small>${unit}</small>` : ''}</div>` : ''}${hint ? `<div class="gl-t">${hint}</div>` : ''}${children ? `<div class="gl-c">${children}</div>` : ''}</div>`;
const backdrop = (line, inner) => `<div class="bd"><img src="${line.camera.img}" alt="" aria-hidden="true" loading="lazy"><div class="bd-s"></div><div class="bd-c">${inner}</div></div>`;

function cameraFrame(line, ts, compact) {
  const cs = cameraStatus(line.camera.detections), ds = line.camera.detections;
  const cnt = (k) => ds.filter((d) => d.kind === k).length;
  return `<figure class="cam"><div class="cam-f"><img src="${line.camera.img}" alt="Кадр камеры ${line.camera.id}: чипсы ${esc(line.ral)} на ленте охлаждения линии ${line.id}" width="1280" height="800" loading="lazy">
    <div class="cam-hud"><span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
    ${ds.map((d, i) => `<div class="box k-${d.kind}" style="left:${d.x - d.w / 2}%;top:${d.y - d.h / 2}%;width:${d.w}%;height:${d.h}%;animation-delay:${i * 80}ms">${compact ? '' : `<span>${esc(d.label)} ${Math.round(d.conf * 100)}%</span>`}</div>`).join('')}
    <div class="cam-id"><i></i>${line.camera.id} · ${ts ? time(ts, true) : 'LIVE'}</div><div class="cam-ral">${esc(line.ral)} · 2448×2048 · ${line.camera.frames} кадр.</div></div></div>
    ${compact ? '' : `<figcaption><span>Детектор: ${cnt('inclusion')} вкрапл. · ${cnt('discoloration')} потемн. · ${cnt('thickness')} волн толщины</span>${pill(cs)}</figcaption>`}</figure>`;
}
const maxDev = (l) => l.zones.reduce((m, z) => (Math.abs(z.act - z.set) > Math.abs(m.act - m.set) ? z : m), l.zones[0]);

function evidence(target, topic, compact, ts) {
  if (target === 'all') return topic === 'impact' ? fleetImpactCards() : fleetCards();
  const l = lineById(target);
  if (topic === 'impact') return impactCards(l, compact);
  const vs = vibStatus(l.vibration.rms), md = maxDev(l), zs = worst(...l.zones.map(zoneStatus)), cs = cameraStatus(l.camera.detections), ws = wearStatus(l.screw.wear);
  const inc = l.camera.detections.filter((d) => d.kind === 'inclusion').length;
  const grid = (inner) => backdrop(l, `<div class="gg ${compact ? '' : 'g3'}">${inner}</div>`);
  if (topic === 'camera') {
    return backdrop(l, cameraFrame(l, ts, compact) + `<div class="gg ${compact ? '' : 'g3'}">${glass('Вкрапления', inc, 'шт.', inc >= 3 ? 'bad' : inc ? 'warn' : 'ok', inc ? 'размер ' + (l.camera.detections.find((d) => d.size) || {}).size + '…' : 'не обнаружено')}${glass('Потемнение / толщина', l.camera.detections.length - inc, 'шт.', l.camera.detections.length - inc ? 'warn' : 'ok', 'предвестники брака')}${compact ? '' : glass('Находки за 2 часа', null, '', cs, '', trend({ id: 'cam' + l.id, values: l.camera.trend2h, tone: cs, height: 60, min: 0, max: Math.max(4, ...l.camera.trend2h) + 1, xLabels: ['−2 ч', '−1 ч', 'сейчас'] }))}</div>`);
  }
  if (topic === 'vibration') {
    const hot = l.vibration.peaks.find((p) => p.hot) || l.vibration.peaks[0];
    return grid(glass('Вибрация СКЗ', null, '', vs, '', gauge(l.vibration.rms, 8, [{ to: VIB_WARN, tone: 'ok' }, { to: VIB_BAD, tone: 'warn' }, { to: 8, tone: 'bad' }], 'мм/с', 'Вибрация'))
      + glass('Пик / эксцесс', `${num(l.vibration.peak)} / ${num(l.vibration.kurtosis)}`, '', l.vibration.kurtosis > 4 ? 'warn' : 'ok', l.vibration.kurtosis > 4 ? 'ударные импульсы (эксцесс > 4)' : 'ударов нет (эксцесс ≈ 3)')
      + (compact ? '' : glass('Главная частота', esc(hot ? hot.label : '—'), '', vs, l.vibration.peaks.some((p) => p.hot) ? 'совпадает с дефектной частотой узла' : 'штатная картина'))
      + glass('Спектр FFT, 0–320 Гц', null, '', null, '', spectrumChart(spectrum(l), l.vibration.peaks, vs), compact ? '' : 'wide')
      + (compact ? '' : glass('Тренд за 72 часа', null, '', vs, '', trend({ id: 'vib' + l.id, values: l.vibration.trend72h, tone: vs, min: 0, max: 6, thresholds: [{ v: VIB_WARN, label: '2,8 внимание', tone: 'warn' }, { v: VIB_BAD, label: '4,5 авария', tone: 'bad' }], xLabels: ['−72 ч', '−36 ч', 'сейчас'] }), 'wide')));
  }
  if (topic === 'temp') {
    const z4 = l.zones[3];
    return grid(glass('Профиль цилиндра, °C', null, '', zs, 'столбец — факт, черта — уставка рецепта', zoneProfile(l.zones), compact ? '' : 'w2')
      + glass('Расплав на выходе', num(l.screw.meltT, 0), '°C', l.screw.meltT > 125 ? 'warn' : 'ok', 'окно рецепта 112–125 °C')
      + glass('Макс. отклонение', `${md.act - md.set >= 0 ? '+' : ''}${num(md.act - md.set)}`, '°C', zs, esc(md.name))
      + (compact ? '' : glass('Охлаждение валков', `${num(l.cooling.waterIn)} → ${num(l.cooling.waterOut)}`, '°C', l.cooling.waterOut - l.cooling.waterIn > 6 ? 'warn' : 'ok', `валки ${num(l.cooling.rollT)} °C · лента ${num(l.cooling.beltT)} °C`)
        + glass('Зона 4 · 60 минут', null, '', zoneStatus(z4), '', trend({ id: 't' + l.id, values: l.tempTrend60m, tone: zoneStatus(z4), min: z4.set - 4, max: Math.max(z4.set + 4, ...l.tempTrend60m) + 2, thresholds: [{ v: z4.set, label: 'уставка ' + z4.set, tone: 'ok' }], xLabels: ['−60 мин', '−30', 'сейчас'] }))));
  }
  if (topic === 'screw') {
    return grid(glass('Обороты шнеков', l.screw.rpm, 'об/мин', 'ok', esc(l.extruder))
      + glass('Крутящий момент', l.screw.torque, '%', l.id === 3 ? 'warn' : 'ok', '', trend({ id: 'tq' + l.id, values: l.torqueTrend60m, tone: l.id === 3 ? 'warn' : 'ok', height: 44 }))
      + glass('Ток привода', num(l.screw.current), 'А', l.screw.current > 50 ? 'warn' : 'ok')
      + glass('Давление расплава', num(l.screw.meltP), 'бар', l.id === 5 ? 'warn' : 'ok', l.id === 5 ? 'скачки до 31 бар' : 'стабильно')
      + glass('Износ элементов', l.screw.wear, '%', ws, '', bar(l.screw.wear / 100, ws))
      + glass('Остаточный ресурс', l.screw.rulHours ? '≈ ' + l.screw.rulHours : '> 2000', 'ч', l.screw.rulHours ? 'warn' : 'ok', l.screw.rulHours ? 'до зоны D по вибрации' : 'по модели износа'));
  }
  if (topic === 'forecast') {
    const s2 = lineStatus(l);
    return grid(glass('Вероятности событий', null, '', null, '', `<ul class="rk">${l.risks.map((r) => { const s = r.p >= 0.5 ? 'bad' : r.p >= 0.2 ? 'warn' : 'ok'; return `<li><span>${esc(r.name)} <em>· ${esc(r.horizon)}</em></span><b class="t-${s}">${Math.round(r.p * 100)}%</b>${bar(r.p, s)}</li>`; }).join('')}</ul>`, compact ? '' : 'w2')
      + glass('Индекс здоровья', l.health, '/ 100', s2, esc(l.headline))
      + (compact ? '' : glass(l.vibration.forecast ? 'Вибрация: факт + прогноз 7 суток' : 'Вибрация: тренд 72 часа', null, '', vs, '', trend({ id: 'fc' + l.id, values: l.vibration.trend72h, forecast: l.vibration.forecast, tone: vs, min: 0, max: 8, thresholds: [{ v: VIB_BAD, label: '4,5 авария', tone: 'warn' }, { v: 7.1, label: '7,1 зона D', tone: 'bad' }], xLabels: l.vibration.forecast ? ['−72 ч', 'сейчас', '+7 сут'] : ['−72 ч', '−36 ч', 'сейчас'] }), 'wide')));
  }
  const s = lineStatus(l); // summary
  return backdrop(l, `<div class="sm">${cameraFrame(l, ts, true)}<div class="gg">${glass('Индекс здоровья', l.health, '/ 100', s, '', bar(l.health / 100, s))}${glass('Выпуск', l.throughput.act, `/ ${l.throughput.plan} кг/ч`, l.throughput.act / l.throughput.plan < 0.96 ? 'warn' : 'ok')}${glass('Вибрация', num(l.vibration.rms), 'мм/с', vs)}${glass('Температуры', `${md.act - md.set >= 0 ? '+' : ''}${num(md.act - md.set)}`, '°C', zs, 'макс. · ' + esc(md.name))}${glass('Камера', inc, 'вкрапл.', cs)}${glass('Износ шнека', l.screw.wear, '%', ws)}</div></div>`);
}
function fleetCards() {
  return `<div class="bd fleetbd"><div class="bd-s"></div><div class="bd-c"><div class="gg g5">${LINES.map((l) => { const s = lineStatus(l); return glass('Линия ' + l.id, l.health, '/100', s, esc(l.headline), pill(s)); }).join('')}</div></div></div>`;
}
const lossRows = [['defectKg', 'Брак', (v) => `${v.toLocaleString('ru-RU')} кг`], ['downtimeH', 'Остановка', (v) => `${num(v, v % 1 ? 2 : 0)} ч`], ['repairRub', 'Ремонт / рекламация', (v) => (v ? rub(v) : '0 ₽')], ['slowKg', 'Недовыпуск', (v) => `${v.toLocaleString('ru-RU')} кг`]];
function impactCards(l, compact) {
  const im = impactFor(l.id), r = impactRub(im), mx = Math.max(1, r.wait);
  return backdrop(l, `<div class="gg ${compact ? '' : 'g3'}">${glass('Агент предупредил', esc(im.lead), '', r.saved > 0 ? (im.leadHours === 0 ? 'bad' : 'warn') : 'ok', esc(im.event))}${glass('Можно сохранить', r.saved > 0 ? rub(r.saved) : '—', '', r.saved > 0 ? 'ok' : null, r.saved > 0 ? 'разница сценариев' : 'потерь нет')}${glass('Сценарии, ₽', null, '', null, '', [['Ждать', r.wait, 'bad'], ['Действовать', r.act, 'ok']].map(([k, v, t]) => `<div class="sc"><div><span>${k}</span><b class="t-${t}">${v ? rub(v) : '0 ₽'}</b></div>${bar(v / mx, t)}</div>`).join(''))}
    ${glass('Расклад потерь', null, '', null, '', `<div class="lt"><span></span><span>ждать</span><span>действовать</span>${lossRows.map(([k, n, f]) => `<span>${n}</span><b class="t-bad">${f(im.noAction[k])}</b><b class="t-ok">${f(im.withAction[k])}</b>`).join('')}</div><p class="mini">демо-оценка · брак 420 ₽/кг · упущенная маржа 140 ₽/кг</p>`, compact ? '' : 'wide')}</div>`);
}
function fleetImpactCards() {
  const f = fleetImpact();
  return `<div class="bd fleetbd"><div class="bd-s"></div><div class="bd-c"><div class="gg g3">${glass('Если ждать', rub(f.wait), '', 'bad', 'потери по пяти линиям')}${glass('По рекомендации', rub(f.act), '', 'ok', 'плановые работы')}${glass('Сохранено', rub(f.saved), '', 'ok', `${Math.round(f.defectKg).toLocaleString('ru-RU')} кг брака · ${Math.round(f.downtimeH)} ч простоя`)}</div>
    <div class="gg" style="margin-top:10px">${glass('По линиям', null, '', null, '', `<ul class="fl">${LINES.map((l) => { const r = impactRub(impactFor(l.id)); const s = lineStatus(l); return `<li><b>Л${l.id}</b><span>${esc(impactFor(l.id).event)}</span><em class="t-${r.saved ? 'ok' : 'warn'}">${r.saved ? rub(r.saved) : '—'}</em>${bar(r.saved / Math.max(1, f.saved), s)}</li>`; }).join('')}</ul>`, 'wide')}</div></div></div>`;
}

/* ---------- состояние ---------- */
const st = { line: 3, topic: 'vibration', busy: false, queue: [], scriptOn: false, tick: 0, journal: [] };
try { st.journal = JSON.parse(localStorage.getItem(JKEY) || '[]'); } catch { st.journal = []; }
const SCRIPT = [
  { target: 'all', topic: 'summary', q: 'Какая ситуация по всем линиям?', label: 'Сводка по цеху' },
  { target: 3, topic: 'forecast', q: 'Линия 3, есть прогноз поломки шнека?', label: 'Линия 3 · прогноз поломки' },
  { target: 4, topic: 'temp', q: 'Линия 4, почему перегрев и чем грозит?', label: 'Линия 4 · перегрев' },
  { target: 5, topic: 'camera', q: 'Покажи камеру пятой линии', label: 'Линия 5 · камера' },
  { target: 'all', topic: 'impact', q: 'Сколько потеряем, если не реагировать?', label: 'Цена бездействия' },
];
const FEED = [
  { line: 3, topic: 'vibration', sev: 'warn', text: 'Вибрация подшипника 4,1 мм/с — рост +0,3 за смену', q: 'Линия 3, что с вибрацией?' },
  { line: 4, topic: 'temp', sev: 'warn', text: 'Зона 4: 113,6 °C при уставке 105 °C', q: 'Линия 4, почему перегрев?' },
  { line: 5, topic: 'camera', sev: 'bad', text: 'CAM-05: вкрапление 0,7 мм, кадр сохранён', q: 'Покажи камеру пятой линии' },
  { line: 2, topic: 'forecast', sev: 'ok', text: 'Напоминание: смазка редуктора через 46 ч', q: 'Линия 2, что по обслуживанию?' },
  { line: 3, topic: 'impact', sev: 'warn', text: 'Окно для плановой замены подшипника — 160 ч', q: 'Линия 3, сколько потеряем, если ждать?' },
  { line: 1, topic: 'camera', sev: 'ok', text: 'CAM-01: 240 кадров без замечаний', q: 'Линия 1, покажи камеру' },
  { line: 5, topic: 'forecast', sev: 'bad', text: 'Вероятность брака партии П-1611-053 — 92 %', q: 'Линия 5, какой прогноз?' },
  { line: 3, topic: 'screw', sev: 'warn', text: 'Пульсация момента шнека ±6 % (норма ±2 %)', q: 'Линия 3, что со шнеками?' },
  { line: 4, topic: 'camera', sev: 'warn', text: 'CAM-04: 3 потемневших чипса — предвестник вкраплений', q: 'Линия 4, покажи камеру' },
];
const jitter = (tick, seed, amp) => (tick === 0 ? 0 : (Math.sin(tick * 1.7 + seed * 3.1) + Math.sin(tick * 0.63 + seed)) * amp * 0.5);

/* ---------- парк линий ---------- */
function paintFleet() {
  $('#fleet').innerHTML = LINES.map((l) => {
    const s = lineStatus(l), vs = vibStatus(l.vibration.rms);
    return `<button type="button" class="fc ${l.id === st.line ? 'on' : ''}" data-ask="${l.id}|summary" ${st.busy ? 'disabled' : ''}>
      <div class="fc-h"><b>Линия ${l.id}</b>${pill(s)}</div>
      <div class="fc-p"><i style="background:${l.swatch}"></i><span>${esc(l.ral)} · ${esc(l.product)}</span></div>
      <div class="fc-v"><span class="t2-${vs}">${num(l.vibration.rms + jitter(st.tick, l.id, l.vibration.rms * 0.04), 2)} мм/с</span><span>${num(l.zones[3].act + jitter(st.tick, l.id + 7, 0.3), 1)} °C</span></div>
      <div class="fc-t">${trend({ id: 'fl' + l.id, values: l.vibration.trend72h, tone: vs, height: 34, min: 0, max: 5 })}</div>
      <div class="fc-f"><b class="hl-${s}">${l.health}</b><span>${esc(l.headline)}</span></div></button>`;
  }).join('');
}

/* ---------- лента событий ---------- */
let feed = [], fn = 4;
function paintFeed() {
  $('#feed').innerHTML = feed.map((e) => `<li><button type="button" data-ask="${e.line}|${e.topic}|${esc(e.q)}" ${st.busy ? 'disabled' : ''}><span class="ft">${time(e.ts)}</span><span class="fb t2-${e.sev}">Л${e.line}</span><span class="fx">${esc(e.text)}</span></button></li>`).join('');
}
function initFeed() {
  const now = Date.now();
  feed = FEED.slice(0, 4).map((e, i) => ({ ...e, id: i, ts: now - (4 - i) * 47000 })).reverse();
  paintFeed();
  setInterval(() => { const e = FEED[fn % FEED.length]; feed = [{ ...e, id: fn++, ts: Date.now() }, ...feed].slice(0, 5); paintFeed(); }, 6500);
}

/* ---------- чат ---------- */
const chat = () => $('#chat');
function bubbleUser(text) { const d = document.createElement('div'); d.className = 'msg me'; d.innerHTML = `<div class="b">${esc(text)}</div>`; chat().appendChild(d); scrollChat(); }
function scrollChat() { const c = chat(); c.scrollTop = c.scrollHeight; }
function setBusy(b) { st.busy = b; $('#askForm button[type=submit]').disabled = b; $('#skip').hidden = !b; $('#sumBtn').hidden = b; document.querySelectorAll('[data-ask],[data-topic]').forEach((x) => (x.disabled = b)); }

function ask(target, topic, question) {
  if (st.busy) return;
  const a = buildAnswer(target, topic, question || defaultQuestion(target, topic));
  if (target !== 'all') { st.line = target; st.topic = topic; paintPickers(); paintFleet(); }
  bubbleUser(a.question);
  const el = document.createElement('div'); el.className = 'msg bot';
  el.innerHTML = `<div class="av">${ico('brain', 20)}</div><div class="b"><div class="think"></div><div class="txt" aria-live="polite"></div><div class="ext"></div></div>`;
  chat().appendChild(el);
  setBusy(true);
  const th = $('.think', el), tx = $('.txt', el), ex = $('.ext', el);
  let step = 0, chars = 0, timer = 0, done = false;
  const finish = () => {
    if (done) return; done = true; clearTimeout(timer);
    th.innerHTML = `<div class="steps done">${a.steps.map((s) => `<span>${ico('check', 13)}${esc(s)}</span>`).join('')}</div>`;
    tx.innerHTML = `<div class="ttl"><b>${esc(a.title)}</b>${pill(a.severity)}</div><p>${esc(a.text)}</p>`;
    ex.innerHTML = `${a.actions.length ? `<div class="act"><b>Рекомендации</b><ol>${a.actions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}${evidence(a.target, a.topic, true, a.ts)}<div class="ev-f"><button type="button" class="lnk" data-open="${a.target}|${a.topic}">Открыть в анализаторе →</button><span>проверка сохранена в журнал</span></div>`;
    saveJournal(a); setBusy(false); scrollChat();
    if (st.scriptOn) nextScript();
  };
  el._skip = finish;
  const tick = () => {
    if (done) return;
    if (step < a.steps.length) { step++; th.innerHTML = `<div class="steps">${a.steps.slice(0, step).map((s, i) => `<span class="${i === step - 1 ? 'now' : ''}">${i === step - 1 ? '<u></u>' : ico('check', 13)}${esc(s)}</span>`).join('')}</div>`; scrollChat(); timer = setTimeout(tick, 360); return; }
    chars = Math.min(a.text.length, chars + 6);
    tx.innerHTML = `<p>${esc(a.text.slice(0, chars))}<span class="cur"></span></p>`; scrollChat();
    if (chars >= a.text.length) { finish(); return; }
    timer = setTimeout(tick, 16);
  };
  tick();
}
function skip() { const m = [...chat().querySelectorAll('.msg.bot')].pop(); if (m && m._skip) m._skip(); }

/* ---------- журнал ---------- */
function saveJournal(a) {
  st.journal = [a, ...st.journal].slice(0, 40);
  try { localStorage.setItem(JKEY, JSON.stringify(st.journal)); } catch { /* хранилище недоступно */ }
  paintJournal();
}
function paintJournal() {
  const L = $('#jlist');
  $('#jcount').textContent = st.journal.length ? `${st.journal.length} записей` : 'пока пусто';
  L.innerHTML = st.journal.length ? st.journal.map((a, i) => `<li><button type="button" data-j="${i}"><span class="ft">${time(a.ts, true)}</span><b>${targetLabel(a.target)}</b><span class="jt">${esc((TOPICS.find((t) => t.id === a.topic) || {}).short || '')}</span>${pill(a.severity)}<span class="jq">${esc(a.question)}</span></button></li>`).join('') : '<li class="empty">Здесь появятся проверки агента. Задайте вопрос выше или запустите демонстрацию смены.</li>';
}
function exportCsv() {
  const rows = [['Время', 'Линия', 'Тема', 'Статус', 'Вывод', 'Рекомендации'], ...st.journal.map((a) => [new Date(a.ts).toLocaleString('ru-RU'), targetLabel(a.target), (TOPICS.find((t) => t.id === a.topic) || {}).label || '', STATUS_LABEL[a.severity], a.text, a.actions.join('; ')])];
  const csv = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'журнал-агента-линий.csv'; a.click(); URL.revokeObjectURL(url);
}
function openJournal(i) {
  const a = st.journal[i]; if (!a) return;
  $('#dlgBody').innerHTML = `<h3>${esc(a.title)}</h3><p class="mini">${new Date(a.ts).toLocaleString('ru-RU')} · вопрос: «${esc(a.question)}»</p><p>${esc(a.text)}</p>${a.actions.length ? `<div class="act"><b>Рекомендации</b><ol>${a.actions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}${evidence(a.target, a.topic, false, a.ts)}`;
  $('#dlg').showModal();
}

/* ---------- анализатор ---------- */
function paintPickers() {
  $('#linePick').innerHTML = LINES.map((l) => `<button type="button" class="pk ${l.id === st.line ? 'on' : ''}" data-line="${l.id}"><i class="bg-${lineStatus(l)}"></i>Л${l.id}</button>`).join('');
  $('#topicPick').innerHTML = TOPICS.map((t) => `<button type="button" class="pk ${t.id === st.topic ? 'on' : ''}" data-topic="${t.id}" ${st.busy ? 'disabled' : ''}>${t.short}</button>`).join('');
  paintAnalyzer();
}
function paintAnalyzer() {
  const l = lineById(st.line), s = lineStatus(l);
  $('#anHead').innerHTML = `<b>Линия ${l.id}</b> ${pill(s)} <span class="mini">${esc(l.ral)} · ${esc(l.product)} · ${esc(l.extruder)} · партия ${esc(l.batch)}</span>`;
  $('#anBody').innerHTML = `<p class="an-note">${esc(noteFor(l.id, st.topic))}</p>${evidence(l.id, st.topic, false)}${st.topic === 'impact' ? '' : `<div class="act"><b>Что делать</b><ol>${l.actions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`}`;
}

/* ---------- сценарий показа ---------- */
function paintScript() {
  const done = SCRIPT.length - st.queue.length;
  $('#scList').innerHTML = SCRIPT.map((s, i) => { const state = !st.scriptOn ? 'idle' : i < done - 1 ? 'done' : i === done - 1 ? 'now' : 'next'; return `<li class="${state}"><span>${state === 'done' ? ico('check', 13) : i + 1}</span>${esc(s.label)}</li>`; }).join('');
  $('#scTime').textContent = st.scriptOn ? `шаг ${Math.max(1, done)} из ${SCRIPT.length}` : '≈ 1,5 мин';
  $('#scBtn').innerHTML = st.scriptOn ? `${ico('stop', 16)} Остановить сценарий` : `${ico('play', 16)} Запустить демонстрацию смены`;
}
function nextScript() {
  if (!st.queue.length) { st.scriptOn = false; paintScript(); return; }
  setTimeout(() => {
    if (!st.scriptOn || st.busy) return;
    const i = st.queue.shift(); paintScript();
    const s = SCRIPT[i]; ask(s.target, s.topic, s.q);
  }, 1600);
}
function startScript() {
  if (st.busy) return;
  st.scriptOn = true; st.queue = SCRIPT.map((_, i) => i); paintScript();
  $('#console').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const i = st.queue.shift(); paintScript(); const s = SCRIPT[i]; ask(s.target, s.topic, s.q);
}
function stopScript() { st.queue = []; st.scriptOn = false; paintScript(); }

/* ---------- «как работает» ---------- */
const FLOW = [
  ['radio', 'Датчики линии', 'Термопары 6 зон, акселерометры на редукторе и подшипниках шнеков, ток и момент привода, давление расплава, вода охлаждения'],
  ['camera', 'Камера над лентой', 'Промышленная камера после охлаждающих валков в пыленепроницаемом корпусе: снимок чипсов каждые 0,5 с при кольцевой LED-подсветке'],
  ['cpu', 'Шлюз в цеху', 'OPC UA / Modbus, буфер на случай обрыва сети. Данные остаются на предприятии, работает без интернета'],
  ['brain', 'Модели и агент', 'Спектр вибрации, тепловой профиль, детектор вкраплений, прогноз ресурса. Агент сводит всё в вывод и объясняет причину'],
  ['bell', 'Действие', 'Ответ мастеру с доказательствами, уведомление в Telegram, запись в журнал, при критике — сигнал на остановку'],
];
const RULES = [
  ['Вибрация шнека, СКЗ', `< ${num(VIB_WARN)} мм/с`, `${num(VIB_WARN)}–${num(VIB_BAD)} мм/с`, `> ${num(VIB_BAD)} мм/с`, 'ISO 10816-3'],
  ['Температура зоны', '±3 °C от уставки', '±3–10 °C', '> 10 °C', 'рецепт'],
  ['Вкрапления в кадре', '0', '1–2 или потемнение', '≥ 3', 'камера'],
  ['Износ элементов шнека', '< 60 %', '60–85 %', '≥ 85 %', 'модель износа'],
];
function paintHow() {
  $('#flow').innerHTML = FLOW.map((f, i) => `<li><div class="fh"><span>${ico(f[0], 20)}</span><em>0${i + 1}</em></div><b>${f[1]}</b><p>${f[2]}</p></li>`).join('');
  $('#rules').innerHTML = `<table><thead><tr><th>Параметр</th><th>Норма</th><th>Внимание</th><th>Критично</th><th>Основание</th></tr></thead><tbody>${RULES.map((r) => `<tr><td>${r[0]}</td><td class="t2-ok">${r[1]}</td><td class="t2-warn">${r[2]}</td><td class="t2-bad">${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table>`;
}

/* ---------- события ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-ask]');
  if (a) { const [t, topic, q] = a.dataset.ask.split('|'); ask(t === 'all' ? 'all' : +t, topic, q); return; }
  const o = e.target.closest('[data-open]');
  if (o) { const [t, topic] = o.dataset.open.split('|'); if (t !== 'all') st.line = +t; st.topic = topic; paintPickers(); $('#analyzer').scrollIntoView({ behavior: 'smooth' }); return; }
  const lp = e.target.closest('[data-line]'); if (lp) { st.line = +lp.dataset.line; paintPickers(); paintFleet(); return; }
  const tp = e.target.closest('[data-topic]'); if (tp && !st.busy) { st.topic = tp.dataset.topic; paintPickers(); return; }
  const j = e.target.closest('[data-j]'); if (j) { openJournal(+j.dataset.j); return; }
});
$('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#askIn').value.trim(); if (!t || st.busy) return; const p = parseQuery(t); ask(p.target ?? st.line, p.topic, t); $('#askIn').value = ''; });
$('#skip').addEventListener('click', skip);
$('#sumBtn').addEventListener('click', () => ask('all', 'summary'));
$('#askAskTopic').addEventListener('click', () => ask(st.line, st.topic));
$('#scBtn').addEventListener('click', () => (st.scriptOn ? stopScript() : startScript()));
$('#heroGo').addEventListener('click', startScript);
$('#jcsv').addEventListener('click', exportCsv);
$('#jclr').addEventListener('click', () => { st.journal = []; try { localStorage.removeItem(JKEY); } catch { /* */ } paintJournal(); });
$('#dlgX').addEventListener('click', () => $('#dlg').close());
$('#dlg').addEventListener('click', (e) => { if (e.target.id === 'dlg') $('#dlg').close(); });
$('#thBtn').addEventListener('click', () => { const r = document.documentElement; const dark = (r.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark'; r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('theme', r.dataset.theme); } catch { /* */ } });
try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* */ }

/* ---------- старт ---------- */
paintFleet(); initFeed(); paintPickers(); paintScript(); paintJournal(); paintHow();
setInterval(() => { st.tick++; paintFleet(); }, 1500);
ask('all', 'summary'); // стартовая сводка
