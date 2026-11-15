/** Мощность и масштаб: линии, датчики, сотрудники, агенты, хранение. Ориентировочная модель для демо. */
export const TPL = {
  powder: { name: 'Порошковая линия', s: 34, c: 2 },
  belt: { name: 'Ленточный конвейер', s: 12, c: 1 },
  liquid: { name: 'Жидкие краски', s: 26, c: 1 },
  oven: { name: 'Печь полимеризации', s: 14, c: 1 },
  custom: { name: 'Своя спецификация', s: 20, c: 0 },
};
export const DEFAULT = {
  lines: [['powder', 34, 2], ['powder', 34, 2], ['belt', 12, 1], ['oven', 14, 1], ['liquid', 26, 1]].map(([t, s, c], i) => ({ n: 'Линия ' + (i + 1), t, s, c })),
  dL: 12, dS: 60, staff: 30, online: 50, apl: 1, pa: 1, iv: 2, hot: 3, arch: 7, plan: 15,
};
const CORES = [8, 12, 16, 24, 32, 48, 64, 96, 128], RAMS = [16, 32, 64, 128, 256, 512, 1024], DISKS = [1, 2, 4, 8, 16, 32, 64, 128, 256], GPUS = [0, 1, 2, 4, 8, 16];
const up = (x, a) => a.find((v) => v >= x) || a[a.length - 1] * Math.ceil(x / a[a.length - 1]);
const r1 = (x) => Math.round(x * 10) / 10;

/** Потребность по числу датчиков, камер, агентов и людей. */
export function need(o) {
  const rps = o.sensors / o.iv, rowsDay = rps * 86400, dayGB = rowsDay * 16 / 1e9 + o.cams * 0.09, yearGB = dayGB * 365;
  const conc = Math.ceil(o.staff * o.online / 100), chats = Math.ceil(conc * 0.4);
  return {
    rps, rowsDay, yearGB, conc, chats, writes: Math.ceil(conc * 0.6),
    cores: 2 + rps / 400 + o.agents * 0.5 + o.cams * 1 + conc * 0.08,
    ram: 4 + o.sensors * 0.03 + o.agents * 1.5 + o.cams * 1 + conc * 0.05,
    gpu: o.agents ? Math.ceil(chats / 8) : 0,
    hotTB: yearGB * o.hot * 1.3 / 1000, archTB: yearGB * o.arch * 0.35 / 1000,
  };
}
const sums = (s, n = s.lines.length) => ({ sensors: s.lines.reduce((a, l) => a + l.s, 0), cams: s.lines.reduce((a, l) => a + l.c, 0), agents: n * s.apl + s.pa });
export function calc(s) {
  const n = s.lines.length, t = sums(s), cur = need({ ...t, staff: s.staff, online: s.online, iv: s.iv, hot: s.hot, arch: s.arch });
  const dn = need({ sensors: s.dL * 24, cams: s.dL * 1.4, agents: s.dL * s.apl + s.pa, staff: s.dS, online: s.online, iv: s.iv, hot: s.hot, arch: s.arch });
  const spec = { cores: up(dn.cores * 1.1, CORES), ram: up(dn.ram * 1.1, RAMS), disk: up(dn.hotTB * 1.1, DISKS), gpu: up(dn.gpu, GPUS) };
  const pl = need({ sensors: (t.sensors / n) * s.plan, cams: (t.cams / n) * s.plan, agents: s.plan * s.apl + s.pa, staff: s.staff, online: s.online, iv: s.iv, hot: s.hot, arch: s.arch });
  const u = { cores: cur.cores / spec.cores, ram: cur.ram / spec.ram, disk: cur.hotTB / spec.disk, gpu: spec.gpu ? cur.gpu / spec.gpu : 0, lines: n / s.dL, staff: s.staff / s.dS };
  const peak = Math.max(u.cores, u.ram, u.disk, u.gpu), load = Math.max(peak, u.lines * 0.9);
  const lvl = peak > 1 || u.lines > 1 || u.staff > 1 ? 'over' : load >= 0.7 || u.lines >= 0.8 || u.staff >= 0.8 ? 'warn' : 'ok';
  const lack = { cores: Math.max(0, up(pl.cores * 1.1, CORES) - spec.cores), ram: Math.max(0, up(pl.ram * 1.1, RAMS) - spec.ram), disk: Math.max(0, up(pl.hotTB * 1.1, DISKS) - spec.disk), gpu: Math.max(0, up(pl.gpu, GPUS) - spec.gpu) };
  const ub = Math.min(peak, 0.97), p95 = peak > 1 ? null : 1.2 + (0.6 * ub * ub) / (1 - ub), queue = peak < 0.85 ? 0 : Math.round((peak * peak) / (1 - Math.min(peak, 0.99)));
  return { n, t, cur, spec, pl, u, lvl, lack, p95, queue, short: lack.cores + lack.ram + lack.disk + lack.gpu > 0 };
}
export const CP_CSS = `.cp{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:14px;color:var(--fg,var(--ink));font-size:14px}
.cp h4{margin:0 0 8px;font-size:15px}.cp .k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
.cp .k div{border:1px solid var(--line);border-radius:10px;padding:8px 10px}.cp .k span{display:block;font-size:12px;color:var(--muted,var(--ink2))}.cp .k b{font-size:19px}
.cp .g{display:grid;gap:9px;margin:6px 0 12px}.cp .g div{display:grid;grid-template-columns:128px 1fr auto;gap:10px;align-items:center;font-size:13px}
.cp .g i{display:block;height:10px;border-radius:5px;background:var(--line);overflow:hidden}.cp .g u{display:block;height:100%;text-decoration:none;border-radius:5px}
.cp .b{border-radius:10px;padding:10px 12px;margin:10px 0;border:1px solid;font-size:13.5px}
.cp .b.ok{background:var(--ok-bg,#d7f0e3);border-color:var(--ok-dot,var(--g))}.cp .b.warn{background:var(--warn-bg,#f8e7c4);border-color:var(--warn-dot,var(--y))}.cp .b.over{background:var(--danger-bg,#f8dcd9);border-color:var(--danger-dot,var(--r))}
.cp .b b{display:block;margin-bottom:2px}.cp .n{font-size:12.5px;color:var(--muted,var(--ink2));margin:6px 0 0}
@media(max-width:640px){.cp .k{grid-template-columns:repeat(2,1fr)}.cp .g div{grid-template-columns:96px 1fr auto}}`;
const col = (x) => (x > 1 ? 'var(--danger-dot,var(--r))' : x >= 0.7 ? 'var(--warn-dot,var(--y))' : 'var(--ok-dot,var(--g))');
const f = (x, d = 1) => Number(x).toLocaleString('ru-RU', { maximumFractionDigits: d });
const G = (name, now, cap, u, unit) => `<div><span>${name}</span><i><u style="width:${Math.min(100, u * 100).toFixed(0)}%;background:${col(u)}"></u></i><span>${f(now)} из ${cap} ${unit} · ${(u * 100).toFixed(0)} %</span></div>`;
export function panelHTML(s) {
  const c = calc(s), L = c.lvl;
  const msg = { ok: ['Мощности хватает', `Занято ${c.n} из ${s.dL} линий проекта. Сервер справляется с запасом.`],
    warn: ['Запас исчерпывается', `Занято ${c.n} из ${s.dL} линий проекта (${(c.u.lines * 100).toFixed(0)} %). При расширении потребуется усилить сервер и вычислительные мощности.`],
    over: ['Не хватает мощностей', `Проект рассчитан на ${s.dL} линий, сейчас их ${c.n}. Сервер нужно усилить.`] }[L];
  const need = c.short ? `<div class="b over"><b>Для ${s.plan} линий потребуется добавить</b>${[c.lack.cores && `+${c.lack.cores} ядер процессора`, c.lack.ram && `+${c.lack.ram} ГБ памяти`, c.lack.disk && `+${c.lack.disk} ТБ диска для оперативной БД`, c.lack.gpu && `+${c.lack.gpu} GPU для агентов`].filter(Boolean).join(', ')}.</div>` : `<div class="b ok"><b>Для ${s.plan} линий</b>Текущего сервера достаточно.</div>`;
  return `<div class="cp"><h4>Информационная панель: мощность сервера</h4>
<div class="k"><div><span>Линии</span><b>${c.n} из ${s.dL}</b></div><div><span>Сотрудники</span><b>${s.staff} из ${s.dS}</b></div><div><span>Датчики</span><b>${c.t.sensors}</b></div><div><span>ИИ-агенты</span><b>${c.t.agents}</b></div></div>
<div class="g">${G('Процессор', c.cur.cores, c.spec.cores, c.u.cores, 'ядер')}${G('Память', c.cur.ram, c.spec.ram, c.u.ram, 'ГБ')}${G('Диск, оперативная БД', c.cur.hotTB, c.spec.disk, c.u.disk, 'ТБ')}${G('GPU для агентов', c.cur.gpu, c.spec.gpu, c.u.gpu, 'шт')}</div>
<div class="b ${L}"><b>${msg[0]}</b>${msg[1]}</div>${need}
<p class="n">Хранение: оперативная БД ${s.hot} лет (${f(c.cur.hotTB)} ТБ), затем архив ещё ${s.arch} лет (${f(c.cur.archTB)} ТБ). Одновременно работают ${c.cur.conc} сотрудников, из них с агентом ${c.cur.chats}. Время ответа агента ${c.p95 ? '≈ ' + f(c.p95) + ' с' : 'растёт'}, очередь ${c.queue ? '≈ ' + c.queue : 'нет'}. Ориентировочный расчёт, точные цифры дают на пилоте.</p></div>`;
}
export function concHTML(s) {
  const c = calc(s); let o = '';
  for (let i = 0; i < 6; i++) { const y = 46 + i * 28; o += `<circle cx="34" cy="${y}" r="9" fill="var(--accent,var(--g))"/><path d="M48 ${y}H330" stroke="var(--line)"/><circle r="3.5" fill="var(--warn-dot,var(--y))"><animateMotion dur="${2 + (i % 3) * 0.6}s" begin="${i * 0.3}s" repeatCount="indefinite" path="M48 ${y}H330"/></circle><path d="M330 ${y}L${380} ${60 + (i % 3) * 40}" stroke="var(--line)"/>`; }
  o += `<rect x="300" y="28" width="30" height="168" rx="6" fill="var(--tint,var(--paper))" stroke="var(--line)"/><text x="315" y="112" font-size="10" text-anchor="middle" transform="rotate(-90 315 112)" fill="currentColor">параллельные обработчики</text>`;
  [['Агенты', 60], ['База данных', 100], ['Журнал', 140]].forEach(([t, y]) => { o += `<rect x="380" y="${y - 16}" width="110" height="32" rx="8" fill="var(--card)" stroke="var(--line)"/><text x="435" y="${y + 4}" font-size="12" text-anchor="middle" fill="currentColor">${t}</text>`; });
  return `<svg viewBox="0 0 500 210" role="img" aria-label="Сотрудники вносят данные и пишут агенту одновременно: запросы идут параллельно, очереди нет" style="width:100%;height:auto;color:var(--fg,var(--ink))"><text x="34" y="18" font-size="12" font-weight="700" fill="currentColor">Сотрудники: ${c.cur.conc} онлайн</text>${o}<text x="250" y="204" font-size="12" text-anchor="middle" fill="${c.queue ? 'var(--danger-dot,var(--r))' : 'var(--ok-dot,var(--g))'}" font-weight="700">вносят данные: ${c.cur.writes} · пишут агенту: ${c.cur.chats} · очередь: ${c.queue ? '≈ ' + c.queue : 'нет'}</text></svg>`;
}
const KEY = 'nap.capacity';
const load = () => { try { return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...DEFAULT }; } };
const esc = (x) => String(x).replace(/[&<>"]/g, (q) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[q]));
export function viewCapacity(v) {
  let s = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* демо */ } };
  const num = (k, lab, min, max, step = 1) => `<label class="cap-f"><span>${lab}</span><input type="number" data-k="${k}" value="${s[k]}" min="${min}" max="${max}" step="${step}"></label>`;
  const draw = () => {
    v.querySelector('#cpanel').innerHTML = panelHTML(s); v.querySelector('#cconc').innerHTML = concHTML(s);
    v.querySelector('#clines').innerHTML = s.lines.map((l, i) => `<tr><td><input data-i="${i}" data-f="n" value="${esc(l.n)}" style="width:110px"></td><td><select data-i="${i}" data-f="t">${Object.entries(TPL).map(([k, t]) => `<option value="${k}" ${k === l.t ? 'selected' : ''}>${t.name}</option>`).join('')}</select></td><td><input type="number" data-i="${i}" data-f="s" value="${l.s}" min="0" max="500" style="width:70px"></td><td><input type="number" data-i="${i}" data-f="c" value="${l.c}" min="0" max="20" style="width:60px"></td><td><button class="chip" data-del="${i}" aria-label="Удалить линию">✕</button></td></tr>`).join('');
  };
  v.innerHTML = `<h2>Мощность и масштаб</h2>
    <p class="note">Линий и сотрудников можно добавлять сколько нужно. Мощность сервера считается автоматически, а если её не хватает, об этом сообщает информационная панель. Модель ориентировочная.</p>
    <h2>Линии и датчики</h2>
    <p class="note">У каждой линии своя спецификация и свой набор датчиков: порошковая, ленточный конвейер, печь, жидкие краски или своя.</p>
    <div style="overflow-x:auto"><table class="vtab"><thead><tr><th>Название</th><th>Тип</th><th>Датчиков</th><th>Камер</th><th></th></tr></thead><tbody id="clines"></tbody></table></div>
    <div class="row" id="cadd" style="margin:8px 0">${Object.entries(TPL).map(([k, t]) => `<button class="chip" data-add="${k}">+ ${t.name}</button>`).join('')}</div>
    <h2>Параметры проекта</h2>
    <div class="cap-g">${num('dL', 'Проект рассчитан на линий', 1, 500)}${num('dS', 'и на сотрудников', 1, 5000)}${num('staff', 'Сейчас сотрудников', 1, 5000)}${num('online', 'Работают одновременно, %', 5, 100, 5)}${num('apl', 'Агентов на линию (0–3)', 0, 3)}${num('pa', 'Агентов на производство (0–5)', 0, 5)}${num('iv', 'Опрос датчиков, с', 1, 60)}${num('hot', 'Оперативная БД, лет', 1, 15)}${num('arch', 'Архив после этого, лет', 0, 30)}${num('plan', 'Планируется линий', 1, 500)}</div>
    <div class="row" id="csc" style="margin:8px 0"><button class="chip" data-n="5">Было 5 линий</button><button class="chip" data-n="10">Стало 10</button><button class="chip" data-n="15">Расширение до 15</button><button class="chip" data-n="reset">Сбросить</button></div>
    <div id="cpanel"></div>
    <h2>Одновременная работа</h2><div id="cconc"></div>
    <p class="note">Сотрудники вносят данные и пишут агенту одновременно: запросы обрабатываются параллельно. Пока загрузка ниже порога, очереди нет. Если мощностей не хватает, время ответа растёт, и панель об этом предупреждает.</p>`;
  const sc = document.createElement('style'); sc.textContent = CP_CSS + '.cap-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.cap-f{display:grid;gap:3px;font-size:12.5px;color:var(--muted)}.cap-f input{width:100%}'; v.appendChild(sc);
  v.addEventListener('input', (e) => { const t = e.target;
    if (t.dataset.k) { s[t.dataset.k] = Math.max(+t.min, Math.min(+t.max, +t.value || 0)); }
    if (t.dataset.f) { const l = s.lines[+t.dataset.i]; if (t.dataset.f === 'n') l.n = t.value; else if (t.dataset.f === 't') { l.t = t.value; l.s = TPL[t.value].s; l.c = TPL[t.value].c; } else l[t.dataset.f] = Math.max(0, +t.value || 0); }
    if (t.dataset.k || t.dataset.f) { save(); if (t.dataset.f === 't') draw(); else { v.querySelector('#cpanel').innerHTML = panelHTML(s); v.querySelector('#cconc').innerHTML = concHTML(s); } } });
  v.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) { const t = TPL[b.dataset.add]; s.lines.push({ n: 'Линия ' + (s.lines.length + 1), t: b.dataset.add, s: t.s, c: t.c }); }
    else if (b.dataset.del) { if (s.lines.length > 1) s.lines.splice(+b.dataset.del, 1); }
    else if (b.dataset.n) { if (b.dataset.n === 'reset') s = { ...DEFAULT, lines: DEFAULT.lines.map((l) => ({ ...l })) }; else { const n = +b.dataset.n, base = DEFAULT.lines; s.lines = Array.from({ length: n }, (_, i) => ({ ...base[i % base.length], n: 'Линия ' + (i + 1) })); } }
    else return; save(); v.querySelectorAll('[data-k]').forEach((i) => { i.value = s[i.dataset.k]; }); draw(); });
  draw();
}
