import { Plant, STAGES, fmt } from './core.js';
import { BASE, NAMES, BASE_PROC, predict, advice, window_ } from './chem.js';
import { Ops, ROLES, PERMS, ST, STAGE_ORDER, ENTRY, WASTE_REASONS, REPL } from './ops.js';

const plant = new Plant();
const ops = new Ops(plant);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hm = (ts) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const ICON = {
  center: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />',
  color: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="16.5" cy="7.5" r="2" fill="currentColor"/>',
  batches: '<path d="M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10"/>',
  helper: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 7V3M9 13h.01M15 13h.01M9 16h6"/>',
  lines: '<path d="M3 7h18M3 12h18M3 17h18"/><circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="15" cy="12" r="1.6" fill="currentColor"/><circle cx="10" cy="17" r="1.6" fill="currentColor"/>',
  orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  shift: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  system: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><path d="M12 7v3M10.5 13.5L6.5 16.5M13.5 13.5l4 3"/>',
};
const TABS = [['center', 'Центр'], ['lines', 'Линии'], ['orders', 'Заявки'], ['shift', 'Смена'], ['more', 'Ещё']];
const NAV = { color: 'more', batches: 'more', journal: 'more', helper: 'more', system: 'more', premix: 'more', analytics: 'more', roles: 'more', chem: 'more' };
const NEED = { lines: 'lines.view', orders: 'orders.view', shift: 'shift.view', color: 'color.use', batches: 'batches.view', journal: 'journal.view', premix: 'premix.view', analytics: 'analytics.view', roles: 'roles.manage', chem: 'chem.use' };
const tabOk = (t) => !NEED[t] || ops.has(NEED[t]);
const st = { tab: 'center', filter: 'all', chat: [], tier: 'f', sig: {} };

/* ---------- каркас ---------- */
function renderTabs() {
  $('#tabs').innerHTML = TABS.filter(([id]) => tabOk(id)).map(([id, name]) =>
    `<button data-tab="${id}" ${(NAV[st.tab] || st.tab) === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[id]}</svg>${name}</button>`).join('');
}
function go(tab) {
  if (!tabOk(tab)) tab = 'center';
  st.tab = tab; st.sig = {};
  renderTabs();
  const v = $('#view');
  ({ center: viewCenter, lines: viewLines, orders: viewOrders, shift: viewShift, more: viewMore, color: viewColor, batches: viewBatches, journal: viewJournal, helper: viewHelper, system: viewSystem, premix: viewPremix, analytics: viewAnalytics, roles: viewRoles, chem: viewChem })[tab](v);
  window.scrollTo({ top: 0 });
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
$('#bell').addEventListener('click', () => { go('center'); });

const allItems = () => [...plant.items, ...ops.lineItems()];
const ackOf = (k) => plant.ack[k] || ops.ack[k];
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
const dt = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

/* ---------- Центр ---------- */
function viewCenter(v) {
  v.innerHTML = `
    <h2>Сводка</h2><div class="kpis" id="kpi"></div>
    <h2>Что требует внимания</h2><div class="attn" id="attn"></div>
    <h2>Линии сейчас</h2><div class="two-col" id="lmini"></div>
    <h2>Этапы производства</h2><div class="pipe" id="pipe"></div>
    <p class="note" style="margin-top:6px">Этапы показаны для линии порошковых красок. Для жидких красок и других процессов набор этапов, параметров и норм собирается под производство.</p>
    <h2>Датчики</h2><div class="sens" id="sens"></div>
    <h2>Журнал отклонений</h2><div class="jr" id="jr"></div>
    <h2>Показать на демо</h2>
    <div class="row" id="scen">
      <button class="chip" data-sc="humidity">Влажность выросла</button>
      <button class="chip" data-sc="oven">Печь остывает</button>
      <button class="chip" data-sc="belt">Конвейер ускорился</button>
      <button class="chip" data-sc="dust">Слабая аспирация</button>
      <button class="chip" data-sc="color">Цвет уходит</button>
      <button class="chip" data-sc="reset">Сбросить</button>
    </div>
    <p class="note" style="margin-top:8px">Сценарии плавно меняют имитируемые датчики: видно, как система сначала прогнозирует выход за норму, затем поднимает тревогу и подсказывает, что проверить.</p>`;
  paintCenter();
}

function spark(s, w = 100, h = 30, band = true) {
  const d = plant.hist[s.id];
  if (!d.length) return '';
  const lo = Math.min(s.min, ...d), hi = Math.max(s.max, ...d), rg = hi - lo || 1;
  const y = (x) => (h - 2 - ((x - lo) / rg) * (h - 4)).toFixed(1);
  const pts = d.map((x, i) => `${((i / (d.length - 1)) * w).toFixed(1)},${y(x)}`).join(' ');
  const lvl = plant.status(s);
  const col = lvl === 'act' ? 'var(--danger-dot)' : lvl === 'watch' ? 'var(--warn-dot)' : 'var(--ok-dot)';
  const b = band ? `<rect x="0" y="${y(s.max)}" width="${w}" height="${Math.max(0, y(s.min) - y(s.max))}" fill="currentColor" opacity=".08"/>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="color:var(--fg)">${b}<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

function paintCenter() {
  if (st.tab !== 'center') return;
  const k = plant.kpi(), ok = ops.kpi();
  const set = (id, html, sig) => { const el = $('#' + id); if (!el) return; if (sig !== undefined) { if (st.sig[id] === sig) return; st.sig[id] = sig; } el.innerHTML = html; };
  set('kpi', `
    <div class="kpi ${k.act ? 'd' : ''}"><small>Тревоги</small><b>${k.act}</b></div>
    <div class="kpi ${k.watch ? 'w' : ''}"><small>Внимание</small><b>${k.watch}</b></div>
    <div class="kpi"><small>Датчики онлайн</small><b>${k.sensors}/${k.sensors}</b></div>
    <div class="kpi"><small>Партии в работе</small><b>${k.work}</b></div>
    <div class="kpi ${k.inTol != null && k.inTol < 80 ? 'w' : ''}"><small>Цвет в допуске</small><b>${k.inTol ?? '—'}${k.inTol != null ? ' %' : ''}</b></div>
    <div class="kpi"><small>Заявок в работе</small><b>${ok.active}</b></div>
    <div class="kpi"><small>Линий в работе</small><b>${ok.linesWork}/${ok.lines}</b></div>
    <div class="kpi"><small>Корректировок на заявку</small><b>${fmt(ok.corr, 1)}</b></div>`, [k.act, k.watch, k.work, k.inTol, ok.active, ok.linesWork, ok.corr].join());

  const items = allItems().sort((a, b) => (b.level === 'act') - (a.level === 'act'));
  const sig = items.map((i) => i.key + i.level + (ackOf(i.key) ? 'a' : '') + i.text.replace(/\d+/g, '')).join('|');
  set('attn', items.length ? items.map((i) => {
    const ack = ackOf(i.key);
    return `<div class="al ${i.level}" ${ack ? 'style="opacity:.72"' : ''}>
      <div class="t">${esc(i.text)}</div>
      <div class="m">${esc(i.core)} · ${i.level === 'act' ? 'тревога' : 'внимание'}${ack ? ' · ' + (ack.how === 'minor' ? 'не критично' : 'принято') : ''}</div>
      ${i.advice ? `<div class="a"><b>Что проверить:</b> ${esc(i.advice)}</div>` : ''}
      ${ack ? '' : `<div class="btns"><button class="btn pri" data-ack="${esc(i.key)}" data-how="took">Принял</button><button class="btn" data-ack="${esc(i.key)}" data-how="minor">Не критично</button>${i.key === 'dE' ? '<button class="btn" data-tab="color">Открыть «Цвет»</button>' : ''}</div>`}
    </div>`;
  }).join('') : '<div class="empty">Отклонений нет. Все параметры линии в норме.</div>', sig);

  set('lmini', ops.lines.map((l) => {
    const o = ops.order(l.orderId), a = ops.actual(l);
    const dev = allItems().some((i) => i.lineId === l.id && i.level === 'act');
    return `<div class="lc ${l.state}"><div class="hd" style="display:flex;justify-content:space-between"><b>${l.name}</b><span class="pill ${l.state === 'work' ? (dev ? 'd' : 'g') : l.state === 'stop' ? 'w' : ''}">${l.state === 'work' ? (dev ? 'отклонение' : 'работает') : l.state === 'stop' ? 'простой' : 'свободна'}</span></div>
      ${o ? `<div class="m">${esc(o.no)} · ${esc(o.ral)} · ${esc(ops.name(l.opId))}</div><div class="kv"><span>Установка печи</span><b>${fmt(l.sp.oven, 0)} °C</b><span>Реально сейчас</span><b class="live ${a && Math.abs(a.oven - l.sp.oven) > 6 ? 'bad' : ''}">${a ? fmt(a.oven, 1) + ' °C' : '—'}</b></div>` : '<div class="m">Ожидает задачу</div>'}</div>`;
  }).join(''));
  set('pipe', STAGES.map((s) => {
    const lv = plant.stageState(s.id);
    const n = plant.sensors.filter((x) => x.st === s.id).length;
    return `<div class="stage ${lv}"><i></i><b>${s.name}</b><small>${lv === 'act' ? 'тревога' : lv === 'watch' ? 'внимание' : 'в норме'} · ${n} парам.</small></div>`;
  }).join(''), STAGES.map((s) => plant.stageState(s.id)).join());

  set('sens', plant.sensors.map((s) => {
    const lv = plant.status(s);
    const norm = s.one === 'hi' ? `допуск ≤ ${fmt(s.max, s.dec)}` : `норма ${fmt(s.min, s.dec)}…${fmt(s.max, s.dec)}`;
    return `<button class="sc ${lv}" data-sens="${s.id}"><div class="n">${esc(s.name)}<i></i></div>
      <div class="v">${fmt(s.value, s.dec)}<small>${esc(s.unit)}</small></div><div class="r">${norm}</div>${spark(s)}</button>`;
  }).join(''));

  set('jr', plant.events.slice(0, 10).map((e) => {
    const dur = e.open ? '' : Math.max(1, Math.round((e.closedTs - e.ts) / 60000));
    const tag = e.open ? `<span class="tag ${e.level === 'act' ? 'act' : 'open'}">${e.level === 'act' ? 'тревога' : 'открыто'}</span>` : `<span class="tag closed">закрыто · ${dur < 1 ? '<1' : dur} мин</span>`;
    return `<div><time>${hm(e.ts)}</time><span>${esc(e.text)}<br><span class="note">${esc(e.core)}</span></span>${tag}</div>`;
  }).join('') || '<div><time></time><span class="note">Пока событий нет. Запустите сценарий ниже.</span><span></span></div>', plant.events.slice(0, 10).map((e) => e.id + e.open + e.level).join());
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-ack]');
  if (a) { (a.dataset.ack.startsWith('ln:') ? ops : plant).acknowledge(a.dataset.ack, a.dataset.how); st.sig = {}; paintCenter(); return; }
  const sc = e.target.closest('[data-sc]');
  if (sc) { plant.inject(sc.dataset.sc); return; }
  const se = e.target.closest('[data-sens]');
  if (se) { openSensor(se.dataset.sens); return; }
  const tb = e.target.closest('[data-tab]');
  if (tb && !tb.closest('#tabs')) go(tb.dataset.tab);
});

function openSensor(id) {
  const s = plant.sensors.find((x) => x.id === id);
  const lv = plant.status(s);
  const it = plant.items.find((i) => i.key === id);
  const d = plant.hist[id];
  const W = 600, H = 170;
  const lo = Math.min(s.min, ...d), hi = Math.max(s.max, ...d), rg = hi - lo || 1;
  const y = (x) => (H - 8 - ((x - lo) / rg) * (H - 16)).toFixed(1);
  const pts = d.map((x, i) => `${((i / (d.length - 1)) * W).toFixed(1)},${y(x)}`).join(' ');
  const col = lv === 'act' ? 'var(--danger-dot)' : lv === 'watch' ? 'var(--warn-dot)' : 'var(--ok-dot)';
  const mins = Math.round((d.length * plant.settings.tickSec) / 60 * 10) / 10;
  $('#dlg').innerHTML = `
    <h3>${esc(s.name)}</h3>
    <div class="big">${fmt(s.value, s.dec)} <small style="font-size:16px;font-weight:500">${esc(s.unit)}</small></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="color:var(--fg)">
      <rect x="0" y="${y(s.max)}" width="${W}" height="${Math.max(0, y(s.min) - y(s.max))}" fill="currentColor" opacity=".08"/>
      <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>
    <p class="note">Последние ~${fmt(mins, 1)} мин. Серая полоса — норма (${fmt(s.min, s.dec)}…${fmt(s.max, s.dec)} ${esc(s.unit)}; нормы в демо условные).${s.derived ? ' Параметр расчётный.' : ''}</p>
    ${it ? `<div class="al ${it.level}"><div class="t">${esc(it.text)}</div>${it.advice ? `<div class="a"><b>Что проверить:</b> ${esc(it.advice)}</div>` : ''}</div>` : '<p><b>В норме.</b></p>'}
    <div class="row" style="margin-top:12px"><button class="btn pri" id="dlgClose">Закрыть</button></div>`;
  $('#dlg').showModal();
  $('#dlgClose').onclick = () => $('#dlg').close();
}
$('#dlg').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ---------- Цвет: ваш инструмент коррекции ---------- */
function viewColor(v) {
  v.innerHTML = `<h2>Коррекция цвета</h2>
    <p class="note">Инструмент для работы со спектрофотометром: график a*b*, колорант и % добавки, RAL. Здесь он встроен в центр управления; в рабочей системе замеры приходят с прибора автоматически, а дозу подсказывает нейросеть, обученная на ваших рецептурах.</p>
    <iframe class="frame" src="color/index.html" title="Коррекция цвета"></iframe>`;
}

/* ---------- Партии ---------- */
const SWATCH = { '9010': '#f1f0ea', '7016': '#383e42', '3020': '#cc0605', '5010': '#0e518d', '9005': '#0a0a0d', '6005': '#114232', '1003': '#e5be01', '9003': '#f4f4f4', '7035': '#c5c7c4', '5015': '#2271b3' };
const swatch = (ral) => SWATCH[(ral.match(/\d{4}/) || [''])[0]] || '#b9c2bc';
const STL = { work: 'В работе', qc: 'Контроль цвета', done: 'Готово', bad: 'На корректировку' };

function viewBatches(v) {
  const list = plant.batches.filter((b) => st.filter === 'all' || b.status === st.filter);
  v.innerHTML = `
    <h2>Новая партия</h2>
    <div class="card"><div class="form">
      <label><small>Цвет (RAL)</small><input id="nbRal" list="rals" placeholder="RAL 9010"><datalist id="rals"><option value="RAL 9010"><option value="RAL 9003"><option value="RAL 9005"><option value="RAL 7016"><option value="RAL 7035"><option value="RAL 3020"><option value="RAL 5010"><option value="RAL 6005"><option value="RAL 1003"></datalist></label>
      <label><small>Название</small><input id="nbName" placeholder="Белый"></label>
      <label><small>Поверхность</small><select id="nbFin"><option>глянец</option><option>полуглянец</option><option>мат</option><option>структура</option></select></label>
      <label><small>Основа</small><select id="nbChem"><option>полиэстер</option><option>эпокси-полиэстер</option><option>эпоксидный</option><option>полиуретановый</option><option>акриловый</option></select></label>
      <label><small>Масса, кг</small><input id="nbKg" type="number" min="0" inputmode="decimal" placeholder="500"></label>
      <label><small>Линия</small><select id="nbLine"><option>Линия 1</option><option>Линия 2</option></select></label>
    </div><button class="btn pri" id="nbAdd">Создать партию</button></div>
    <h2>Партии</h2>
    <div class="row" style="margin-bottom:10px">${[['all', 'Все'], ['work', 'В работе'], ['qc', 'Контроль'], ['bad', 'Коррекция'], ['done', 'Готово']].map(([k, n]) => `<button class="chip" data-f="${k}" aria-pressed="${st.filter === k}">${n}</button>`).join('')}</div>
    <div class="bl">${list.map(batchCard).join('') || '<div class="empty">Нет партий в этом статусе.</div>'}</div>`;
  $('#nbAdd').onclick = () => {
    plant.addBatch({ ral: $('#nbRal').value.trim(), name: $('#nbName').value.trim(), finish: $('#nbFin').value, chem: $('#nbChem').value, kg: $('#nbKg').value, line: $('#nbLine').value, emp: 'Оператор смены' });
    st.filter = 'all'; viewBatches(v);
  };
  v.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { st.filter = b.dataset.f; viewBatches(v); }));
  v.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => batchAction(b.dataset.b, b.dataset.act, v)));
}

function batchCard(b) {
  const left = Math.round((plant.expires(b) - plant.t) / 86400000);
  const acts = { work: [['qc', 'На контроль цвета']], qc: [['dE', 'Записать ΔE']], bad: [['qc', 'Скорректировали, на повторный замер']], done: [] }[b.status];
  return `<div class="bc"><div class="sw" style="background:${swatch(b.ral)}" title="Цвет условный"></div>
    <div><b>${esc(b.ral)} ${esc(b.name)}</b>
    <div class="m">${esc(b.no)} · ${esc(b.finish)}, ${esc(b.chem)}</div>
    <div class="m">${b.kg} кг · ${esc(b.line)} · ${esc(b.emp)} · ${hm(b.made)}</div>
    <div class="m">${b.dE != null ? 'ΔE ' + fmt(b.dE, 1) + ' · ' : ''}годна ещё ${left} дн.</div>
    <span class="st ${b.status}">${STL[b.status]}</span></div>
    <div class="btns">${acts.map(([a, n]) => `<button class="btn pri" data-b="${esc(b.id)}" data-act="${a}">${n}</button>`).join('')}<button class="btn" data-b="${esc(b.id)}" data-act="print">Паспорт и этикетка</button></div></div>`;
}

function batchAction(id, act, v) {
  const b = plant.batches.find((x) => x.id === id);
  if (act === 'qc') plant.setBatch(id, { status: 'qc' });
  else if (act === 'dE') {
    const raw = prompt('ΔE по замеру спектрофотометра (например 0,8):', '0,8');
    if (raw === null) return;
    const x = parseFloat(raw.replace(',', '.'));
    if (!(x >= 0)) return;
    plant.setBatch(id, { dE: x, status: x <= plant.settings.tol ? 'done' : 'bad' });
  } else if (act === 'print') { printBatch(b); return; }
  viewBatches(v);
}

function printBatch(b) {
  const ok = b.dE != null ? (b.dE <= plant.settings.tol ? 'соответствует эталону' : 'требует корректировки') : 'замер не проведён';
  const d = (t) => new Date(t).toLocaleDateString('ru-RU');
  $('#printSheet').innerHTML = `<h1>Порошковая краска · ${esc(b.ral)} ${esc(b.name)}</h1>
    <table><tr><th>Партия</th><td>${esc(b.no)}</td></tr>
    <tr><th>Поверхность</th><td>${esc(b.finish)}</td></tr><tr><th>Основа</th><td>${esc(b.chem)}</td></tr>
    <tr><th>Масса</th><td>${b.kg} кг</td></tr>
    <tr><th>Изготовлена</th><td>${d(b.made)}</td></tr><tr><th>Годна до</th><td>${d(plant.expires(b))}</td></tr>
    <tr><th>Контроль цвета</th><td>${b.dE != null ? 'ΔE*ab ' + fmt(b.dE, 1) + ', ' : ''}${ok}</td></tr>
    <tr><th>Линия / смена</th><td>${esc(b.line)}, ${esc(b.emp)}</td></tr></table>
    <p style="font-size:9px;margin-top:4px">Демонстрационный образец документа. Реквизиты и нормативные данные задаются на предприятии.</p>`;
  window.print();
}

/* ---------- Помощник ---------- */
function viewHelper(v) {
  const chips = ['Почему растёт брак?', 'Что с печью?', 'Какой колорант добавить?', 'Что по партиям?'];
  v.innerHTML = `<h2>Помощник технолога</h2>
    <p class="note">Демо-режим: ответы строятся по текущим показаниям линии и базе знаний. В рабочей системе помощник работает на языковой модели, установленной на вашем сервере, и знает ваши регламенты и рецептуры.</p>
    <div class="row" style="margin-bottom:10px">${chips.map((c) => `<button class="chip" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="chat" id="chat"></div>
    <div class="ask"><input id="q" placeholder="Спросите о линии, цвете или партиях…" autocomplete="off"><button class="btn pri" id="send">Спросить</button></div>`;
  const draw = () => { $('#chat').innerHTML = st.chat.map((m) => `<div class="msg ${m.r}">${esc(m.t)}</div>`).join('') || '<div class="empty">Задайте вопрос или выберите готовый.</div>'; };
  const ask = (t) => {
    t = t.trim(); if (!t) return;
    st.chat.push({ r: 'u', t }); draw(); $('#q').value = '';
    setTimeout(() => { st.chat.push({ r: 'a', t: plant.assistant(t, ops.lineItems()) }); draw(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 350);
  };
  draw();
  $('#send').onclick = () => ask($('#q').value);
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(e.target.value); });
  v.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => ask(b.dataset.q)));
}

/* ---------- Система ---------- */
const TIERS = {
  s: { n: 'Старт', p: '≈ 0,05 млн', who: 'Малое предприятие, одна линия', tasks: ['Подбор дозы колоранта по замеру и разбор отклонений цвета', 'Контроль нескольких ключевых параметров (например, печь и влажность камеры)', 'Журнал отклонений и паспорт качества партии'], hw: 'Обычный ПК или мини-сервер, как правило без видеокарты' },
  m: { n: 'Малый+', p: '≈ 0,1 млн', who: 'Малое предприятие, несколько линий', tasks: ['Всё из «Старта» по нескольким линиям', 'Прогноз отклонений по 10–20 датчикам', 'Сравнение смен, линий и партий'], hw: 'Сервер начального уровня на процессоре' },
  f: { n: 'Завод', p: 'от 0,5 млн', who: 'Завод, несколько цехов и линий', tasks: ['Единая модель по всему циклу: смешение, экструзия, помол, нанесение, печь, контроль цвета', 'Прогноз брака и числа корректировок до запуска партии', 'Десятки и сотни датчиков, несколько приборов'], hw: 'Серверный процессор; при больших объёмах данных — ускоритель' },
  x: { n: 'Расширенный', p: 'по задаче', who: 'Крупные производства, особые требования', tasks: ['Более продвинутая архитектура нейронной сети для сложных зависимостей и длинных временных рядов', 'Обучение и дообучение на ваших данных', 'Подбор под конкретное оборудование и задачу'], hw: 'Мощное оборудование: сервер с графическим ускорителем; состав определяется задачей' },
};

function viewSystem(v) {
  const t = TIERS[st.tier];
  v.innerHTML = `
    <h2>Единая система контроля качества и безопасности</h2>
    <div class="card"><p><b>Что это.</b> Система собирает данные с датчиков и приборов производства красок (порошковых, жидких или другого процесса), заранее показывает отклонения, подсказывает технологу, что проверить, и рассчитывает коррекцию цвета. Цель: меньше брака, меньше корректировок, быстрее запуск продукции на линии и выше производительность.</p>
    <p style="margin:0"><b>Единой системой или по отдельности.</b> Модули можно внедрять все вместе или по одному, под конкретную задачу предприятия.</p></div>

    <h2>Модули</h2>
    <div class="grid2">
      ${[['Цвет и коррекция', 'Спектрофотометр, RAL, расчёт колоранта и дозы. Меньше корректировок, быстрее выход на цвет.'],
         ['Процесс и датчики', 'Смешение, экструзия, помол, нанесение, печь. Прогноз отклонений до появления брака.'],
         ['Партии и прослеживаемость', 'Номер партии, паспорт качества, этикетка, срок хранения.'],
         ['Безопасность', 'Контроль параметров, влияющих на безопасность: аспирация и запылённость, температуры, журнал отклонений.'],
         ['Помощник технолога', 'Подсказывает причины и порядок проверки, знает регламенты предприятия.'],
         ['Состав и нагрев (опционально)', 'Нейросеть сравнивает рецептуры и считает результат при смещении ингредиентов и нагреве, расчёт состава.'],
         ['Компьютерное зрение (опционально)', 'Камеры и тепловизоры наблюдают за процессами, замечают перегрев и отклонения. После обучения предупреждает заранее.']].map(([n, d]) => `<div class="card"><h3>${n}</h3><p class="note" style="margin:0">${d}</p></div>`).join('')}
    </div>

    <h2>Какие нейросети работают в системе</h2>
    <p class="note" style="margin-bottom:8px">Одна самая большая сеть на все задачи не нужна. Работает набор моделей, каждая под свою задачу, на вашем сервере.</p>
    <div class="grid2">
      <div class="card"><h3>Прикладные нейросети</h3><p class="note" style="margin:0">Прогноз отклонений, дозы колоранта, аномалии, брак, настройка под каждую линию. От ≈ 0,05 до 0,5 млн параметров и выше. Серверный процессор.</p></div>
      <div class="card"><h3>Модели свойств продукции</h3><p class="note" style="margin:0">Результат по составу и режиму: цвет, блеск, отверждение. Обучаются на ваших рецептах и результатах. От сотен тысяч до десятков миллионов параметров и выше.</p></div>
      <div class="card"><h3>Языковая модель</h3><p class="note" style="margin:0">Помощник на русском (текст, голос), технологические карты, регламенты, документы. Миллиарды параметров, сервер с видеокартой.</p></div>
    </div>
    <h2>Масштаб прикладных нейросетей</h2>
    <div class="tiers">${Object.entries(TIERS).map(([k, x]) => `<button data-tier="${k}" aria-pressed="${st.tier === k}"><b>${x.n}</b><small>${x.p} параметров</small></button>`).join('')}</div>
    <div class="card"><h3>${t.n}: ${t.p === 'по задаче' ? 'размер сети подбирается по задаче' : t.p + ' параметров'}</h3>
      <p class="note">${t.who}</p><b>Задачи</b><ul class="l">${t.tasks.map((x) => `<li>${x}</li>`).join('')}</ul>
      <p style="margin:10px 0 0"><b>Оборудование:</b> ${t.hw}</p></div>
    <p class="note" style="margin-top:8px">Число параметров — размер нейронной сети, а не показатель качества. Прогноз по составу и режимам упирается в объём и качество данных: размер модели подбирают экспериментом, начиная с компактной. Каждая линия настраивается отдельно на общей модели. Что можно надёжно предсказывать и какой будет эффект, определяется на пилоте по реальным данным предприятия.</p>

    <h2>Как это устроено</h2>
    <div class="flow">
      <div><b>Датчики и приборы</b>Термопары, влажность, давление, весы, спектрофотометр</div><span class="ar">→</span>
      <div><b>Шлюз на предприятии</b>Сбор и буфер данных, работа при обрывах связи</div><span class="ar">→</span>
      <div><b>Локальный сервер</b>Данные хранятся у вас и не уходят наружу</div><span class="ar">→</span>
      <div><b>Нейросети и правила</b>Прогноз отклонений, подбор дозы, поиск аномалий</div><span class="ar">→</span>
      <div><b>Технолог</b>Планшет, телефон, терминал, уведомления</div>
    </div>

    <h2>Демо и рабочая система</h2>
    <div style="overflow-x:auto"><table><tr><th></th><th>Демо</th><th>Рабочая система</th></tr>
      <tr><td>Данные</td><td>Имитация</td><td>Реальные датчики и приборы через шлюз</td></tr>
      <tr><td>Прогноз отклонений</td><td>Статистика: тренд и отклонение от обычного поведения</td><td>Нейросети, обученные на данных вашего производства</td></tr>
      <tr><td>Нейросеть цвета</td><td>Малая учебная сеть, порядка 700 параметров (вкладка «Цвет»)</td><td>Набор моделей: прикладные сети (от ≈ 0,05 до 0,5 млн и выше), модели свойств, языковая модель (миллиарды параметров)</td></tr>
      <tr><td>Помощник</td><td>Ответы по правилам и базе знаний</td><td>Локальная языковая модель и ваши регламенты</td></tr>
      <tr><td>Где работает</td><td>В браузере</td><td>На вашем сервере</td></tr>
      <tr><td>Эффект</td><td>Не измеряется</td><td>Оценивается на пилоте по вашим данным</td></tr></table></div>

    <h2>Настройки демо</h2>
    <div class="row" style="margin-bottom:8px"><button class="btn" id="rst">Сбросить демо-данные заявок и смен</button></div>
    <div class="card"><label style="max-width:240px;display:block"><small>Допуск ΔE*ab</small><input id="tol" type="number" step="0.1" min="0.2" max="3" value="${plant.settings.tol}"></label></div>`;
  v.querySelectorAll('[data-tier]').forEach((b) => (b.onclick = () => { st.tier = b.dataset.tier; viewSystem(v); }));
  $('#rst').onclick = () => { ops.reset(); initWho(); toast('Демо-данные сброшены'); };
  $('#tol').onchange = (e) => { const x = parseFloat(e.target.value); if (x > 0) { plant.settings.tol = x; } };
}

/* ---------- Роли ---------- */
function initWho() {
  const sel = $('#who');
  sel.innerHTML = ops.staff.map((u) => `<option value="${u.id}" ${u.id === ops.me ? 'selected' : ''}>${esc(u.name)} · ${ROLES[u.role]}</option>`).join('');
  sel.onchange = () => { ops.setMe(sel.value); st.sig = {}; go(st.tab); };
}

/* ---------- Заявки ---------- */
const COLS = ['Белый', 'Чёрный', 'Красный', 'Жёлтый', 'Синий', 'Зелёный'];
const stClass = (s) => (s === 'done' ? 'g' : s === 'correction' ? 'w' : s === 'cancel' ? 'd' : '');

function viewOrders(v) {
  const me = ops.user(ops.me);
  const mine = ops.inbox();
  const f = st.of || (me.role === 'admin' ? 'all' : 'mine');
  const list = ops.orders.filter((o) => (f === 'all' ? true : f === 'mine' ? mine.includes(o) : f === 'active' ? !['done', 'cancel'].includes(o.status) : o.status === 'done'));
  const cnt = (s) => ops.orders.filter((o) => o.status === s).length;
  v.innerHTML = `
    <h2>Путь заявки</h2>
    <div class="flowbar">${STAGE_ORDER.map((s) => `<div class="fb ${cnt(s) ? 'on' : ''}"><b>${cnt(s)}</b>${ST[s].label}<br><span class="note">${ST[s].role ? ops.stageRoles(s) : ''}</span></div>`).join('')}</div>
    <p class="note" style="margin-top:6px">Заявка → обработка → задача технологу → рецепт → премикс (малый или большой) → проверка и корректировки → запуск на линии → контроль → готово. Этапы и роли настраиваются под предприятие.</p>
    ${ops.has('orders.create') ? `
    <h2>Новая заявка</h2><div class="card"><div class="form">
      <label><small>Заказчик</small><input id="ncCust" placeholder="Название"></label>
      <label><small>Цвет (RAL)</small><input id="ncRal" placeholder="RAL 9010"></label>
      <label><small>Объём, кг</small><input id="ncKg" type="number" inputmode="decimal" placeholder="500"></label>
      <label><small>Срок, дней</small><input id="ncDue" type="number" inputmode="numeric" placeholder="5"></label>
      <label><small>Приоритет</small><select id="ncPrio"><option>обычный</option><option>срочный</option></select></label>
    </div><button class="btn pri" id="ncAdd">Создать заявку</button></div>` : ''}
    <h2>Заявки</h2>
    <div class="row" style="margin-bottom:10px">${[['mine', 'Ждут меня (' + mine.length + ')'], ['active', 'В работе'], ['done', 'Готово'], ['all', 'Все']].map(([k, n]) => `<button class="chip" data-of="${k}" aria-pressed="${f === k}">${n}</button>`).join('')}</div>
    <div class="bl">${list.map((o) => orderCard(o, mine.includes(o))).join('') || '<div class="empty">Для вашей роли сейчас нет задач.</div>'}</div>`;
  const add = $('#ncAdd');
  if (add) add.onclick = () => { ops.createOrder({ customer: $('#ncCust').value.trim(), ral: $('#ncRal').value.trim(), kg: $('#ncKg').value, dueDays: $('#ncDue').value, prio: $('#ncPrio').value }); st.of = 'all'; toast('Заявка создана'); viewOrders(v); };
  v.querySelectorAll('[data-of]').forEach((b) => (b.onclick = () => { st.of = b.dataset.of; viewOrders(v); }));
  bindOrderActions(v, () => viewOrders(v));
}

function orderActions(o) {
  const s = ST[o.status], can = ops.canAct(o);
  let act = '';
  if (can) {
    if (o.status === 'ready') {
      act = `<div class="form" style="margin:0"><select id="ln-${o.id}">${ops.lines.map((l) => `<option value="${l.id}" ${l.orderId ? 'disabled' : ''}>${l.name}${l.orderId ? ' (занята)' : ''}</option>`).join('')}</select>
        <select id="op-${o.id}">${ops.staff.filter((u) => ops.has('lines.enter', u.id) && !ops.has('lines.enterAny', u.id) && u.role !== 'admin').map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>`;
    }
    act += `<div class="btns" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri" data-adv="${o.id}">${s.btn}</button>${s.alt ? `<button class="btn" data-adv="${o.id}" data-alt="1">${s.altBtn}</button>` : ''}</div>`;
  }
  return act;
}

function orderCard(o, isMine) {
  const s = ST[o.status];
  const can = ops.canAct(o);
  const tt = ops.totals(o.id);
  const act = orderActions(o);
  return `<div class="oc ${isMine ? 'mine' : ''}"><div class="hd"><div><b>${esc(o.no)} · ${esc(o.customer)}</b><div class="m"><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${swatch(o.ral)};vertical-align:-1px;border:1px solid var(--line)"></span> ${esc(o.ral)} · ${o.kg} кг · срок ${dt(o.due)}</div></div><span class="pill ${stClass(o.status)}">${s.label}</span></div>
    <div class="pills">${o.prio === 'срочный' ? '<span class="pill d">срочный</span>' : ''}${o.recipe ? `<span class="pill">премикс ${o.premixSize} ${o.premixKg} кг</span>` : ''}${o.corrections.length ? `<span class="pill w">корректировок: ${o.corrections.length}</span>` : ''}${o.lineId ? `<span class="pill">${ops.line(o.lineId).name} · ${esc(ops.name(o.opId))}</span>` : ''}${tt.output ? `<span class="pill g">выпуск ${tt.output} кг${tt.waste ? ', отход ' + tt.waste : ''}</span>` : ''}</div>
    <div class="m">${s.role ? 'Ждёт: ' + ops.stageRoles(o.status) : '—'}${o.techId ? ' · технолог ' + esc(ops.name(o.techId)) : ''}</div>
    ${act}<div><button class="btn" data-open="${o.id}">Подробнее: рецепт, история, комментарии</button></div></div>`;
}

function bindOrderActions(root, refresh) {
  root.querySelectorAll('[data-adv]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.adv, alt = !!b.dataset.alt, o = ops.order(id);
    const payload = {};
    if (o.status === 'ready' && !alt) { payload.lineId = $('#ln-' + id)?.value; payload.opId = $('#op-' + id)?.value; }
    if (o.status === 'check' && alt) { const n = prompt('Что скорректировать? (например: +0,2% жёлтого)', ''); if (n === null) return; payload.note = n; }
    if (o.status === 'qc' && !alt) { const x = prompt('ΔE по замеру (можно оставить пустым):', '0,6'); if (x === null) return; const f = parseFloat(x.replace(',', '.')); if (f >= 0) payload.dE = f; }
    const r = ops.advance(id, alt, payload);
    if (!r.ok) toast(r.err); else toast('Статус: ' + ST[ops.order(id).status].label);
    refresh();
  }));
  root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openOrder(b.dataset.open)));
}

function openOrder(id) {
  const o = ops.order(id), s = ST[o.status];
  const canRecipe = ['tech', 'check', 'correction'].includes(o.status) && ops.has('recipe.edit');
  const it = o.recipe?.items || {};
  const sum = Object.values(it).reduce((a, b) => a + b, 0);
  $('#dlg').innerHTML = `
    <h3>${esc(o.no)} · ${esc(o.customer)}</h3>
    <p class="note">${esc(o.ral)} · ${o.kg} кг · срок ${dt(o.due)} · <b>${s.label}</b></p>
    <h2 style="margin-top:12px">Рецепт ${o.recipe ? 'v' + o.recipe.ver : '(не составлен)'}</h2>
    ${canRecipe ? `<div class="rt">${COLS.map((c) => `<label><small>${c}, %</small><input data-col="${c}" type="number" step="0.01" min="0" inputmode="decimal" value="${it[c] ?? ''}"></label>`).join('')}</div>
      <div class="form"><label><small>Премикс</small><select id="pmSize"><option ${o.premixSize === 'малый' ? 'selected' : ''}>малый</option><option ${o.premixSize === 'большой' ? 'selected' : ''}>большой</option></select></label>
      <label><small>Масса премикса, кг</small><input id="pmKg" type="number" value="${o.premixKg || ''}"></label>
      <label><small>Печь по задаче, °C</small><input id="rgOven" type="number" value="${o.regime.oven}"></label>
      <label><small>Конвейер, м/мин</small><input id="rgBelt" type="number" step="0.1" value="${o.regime.belt}"></label></div>
      <button class="btn pri" id="saveRec">Сохранить рецепт</button>`
    : o.recipe ? `<table><tr>${Object.keys(it).map((c) => `<th>${esc(c)}</th>`).join('')}<th>Премикс</th><th>Режим</th></tr><tr>${Object.values(it).map((x) => `<td>${fmt(x, 2)} %</td>`).join('')}<td>${o.premixSize}, ${o.premixKg} кг</td><td>печь ${o.regime.oven} °C, ${fmt(o.regime.belt, 1)} м/мин</td></tr></table>` : '<p class="note">Рецепт составляет технолог.</p>'}
    ${o.corrections.length ? `<h2>Корректировки (${o.corrections.length})</h2><div class="log" style="border:0;padding:0">${o.corrections.map((c) => `<div>№${c.n} · ${dt(c.ts)} · ${esc(ops.name(c.by))}: ${esc(c.note)}</div>`).join('')}</div>` : ''}
    <h2>История</h2><div class="log" style="border:0;padding:0">${o.history.map((h) => `<div>${dt(h.ts)} ${new Date(h.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ${esc(ops.name(h.by))}: ${esc(h.text)}</div>`).join('') || '<div>—</div>'}</div>
    <h2>Комментарии</h2><div class="log" style="border:0;padding:0">${o.comments.map((c) => `<div><b>${esc(ops.name(c.by))}</b>: ${esc(c.text)}</div>`).join('') || '<div>Пока нет</div>'}</div>
    <div class="ask"><input id="cmt" placeholder="Комментарий для участников заявки"><button class="btn" id="cmtAdd">Отправить</button></div>
    <div class="row" style="margin-top:12px"><button class="btn pri" id="dlgClose">Закрыть</button></div>`;
  $('#dlg').showModal();
  $('#dlgClose').onclick = () => { $('#dlg').close(); go(st.tab); };
  $('#cmtAdd').onclick = () => { ops.comment(id, $('#cmt').value); openOrder(id); };
  const sv = $('#saveRec');
  if (sv) sv.onclick = () => {
    const items = {}; $('#dlg').querySelectorAll('[data-col]').forEach((i) => { const x = parseFloat(i.value); if (x > 0) items[i.dataset.col] = x; });
    ops.setRecipe(id, { items, premixSize: $('#pmSize').value, premixKg: $('#pmKg').value, oven: $('#rgOven').value, belt: $('#rgBelt').value });
    toast('Рецепт сохранён'); openOrder(id);
  };
}

/* ---------- Линии ---------- */
function viewLines(v) {
  v.innerHTML = `<h2>Линии и операторы</h2>
    <p class="note">Все видят, какая линия работает, какая в процессе, какие установки выставил оператор и какая температура сейчас. Отклонения от задачи выделяются сразу.</p>
    <div class="two-col" style="margin-top:8px">${ops.lines.map((l) => `<div class="lc ${l.state}" id="lc-${l.id}"></div>`).join('')}</div>`;
  st.sig = {};
  paintLines();
  v.querySelectorAll('[data-entry]').forEach(() => {});
}
function paintLines() {
  if (st.tab !== 'lines') return;
  const items = ops.lineItems();
  for (const l of ops.lines) {
    const el = $('#lc-' + l.id); if (!el) continue;
    const o = ops.order(l.orderId), a = ops.actual(l), tt = o ? ops.totals(o.id) : null;
    const devs = items.filter((i) => i.lineId === l.id);
    const sig = [l.state, l.orderId, l.sp.oven, l.sp.belt, ops.entries.length, devs.map((d) => d.key + d.level).join(), ops.me].join('|');
    if (st.sig[l.id] !== sig) {
      st.sig[l.id] = sig;
      const r = o?.regime, tol = ops.settings;
      const ent = ops.entries.filter((e) => e.lineId === l.id).slice(0, 4);
      const can = ops.canEnter(l.id);
      el.className = 'lc ' + l.state;
      el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${l.name}</b><span class="pill ${l.state === 'work' ? (devs.some((d) => d.level === 'act') ? 'd' : 'g') : l.state === 'stop' ? 'w' : ''}">${l.state === 'work' ? (devs.some((d) => d.level === 'act') ? 'работает, есть отклонения' : 'работает') : l.state === 'stop' ? 'простой' : 'свободна'}</span></div>
      ${o ? `<div class="m">${esc(o.no)} · ${esc(o.ral)} · ${o.kg} кг · оператор ${esc(ops.name(l.opId))}</div>
      <div class="kv"><span>По задаче: печь</span><b>${fmt(r.oven - tol.ovenTol, 0)}…${fmt(r.oven + tol.ovenTol, 0)} °C</b>
        <span>По задаче: конвейер</span><b>${fmt(r.belt - tol.beltTol, 1)}…${fmt(r.belt + tol.beltTol, 1)} м/мин</b>
        <span>Установка оператора: печь</span><b class="${Math.abs(l.sp.oven - r.oven) > tol.ovenTol ? 'bad' : ''}">${fmt(l.sp.oven, 0)} °C</b>
        <span>Установка оператора: конвейер</span><b class="${Math.abs(l.sp.belt - r.belt) > tol.beltTol ? 'bad' : ''}">${fmt(l.sp.belt, 2)} м/мин</b>
        <span>Реальная температура сейчас</span><b class="live" data-live="${l.id}:oven">—</b>
        <span>Реальная скорость сейчас</span><b class="live" data-live="${l.id}:belt">—</b>
        <span>Выпуск / отход</span><b>${tt.output} кг / ${tt.waste} кг${tt.output ? ' (' + fmt((tt.waste / (tt.output + tt.waste)) * 100, 1) + ' %)' : ''}</b>
        <span>Простои и замены</span><b>${tt.downtime} мин</b></div>`
        : '<div class="m">Линия свободна, ожидает задачу от начальника смены.</div>'}
      ${devs.map((d) => `<div class="al ${d.level}" style="margin-top:2px"><div class="t" style="font-size:13.5px">${esc(d.text)}</div>${d.advice ? `<div class="a"><b>Что сделать:</b> ${esc(d.advice)}</div>` : ''}</div>`).join('')}
      <div class="btns" style="display:flex;gap:6px;flex-wrap:wrap">${o && can ? `<button class="btn pri" data-entry="${l.id}">Внести данные</button>` : ''}${l.state === 'stop' && can ? `<button class="btn" data-resume="${l.id}">Возобновить работу</button>` : ''}${o && !can ? '<span class="note">Вносить данные может оператор линии или начальник смены</span>' : ''}</div>
      ${ent.length ? `<div class="log">${ent.map((e) => `<div>${hm(e.ts)} · ${ops.name(e.userId)}: <b>${ENTRY[e.type]}</b> ${e.kg != null ? e.kg + ' кг' : ''}${e.minutes ? e.minutes + ' мин' : ''} ${esc(e.reason || '')} ${esc(e.type === 'setpoints' ? e.text : '')}</div>`).join('')}</div>` : ''}`;
      el.querySelectorAll('[data-entry]').forEach((b) => (b.onclick = () => openEntry(b.dataset.entry)));
      el.querySelectorAll('[data-resume]').forEach((b) => (b.onclick = () => { ops.resume(b.dataset.resume); st.sig = {}; paintLines(); }));
    }
    const ac = ops.actual(l);
    const set = (k, t, bad) => { const e = el.querySelector(`[data-live="${l.id}:${k}"]`); if (e) { e.textContent = t; e.classList.toggle('bad', !!bad); } };
    if (ac) { set('oven', fmt(ac.oven, 1) + ' °C', Math.abs(ac.oven - l.sp.oven) > 6); set('belt', fmt(ac.belt, 2) + ' м/мин', false); }
  }
}

function openEntry(lineId) {
  const l = ops.line(lineId);
  const typeOpts = Object.entries(ENTRY).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  $('#dlg').innerHTML = `<h3>${l.name}: внести данные</h3><p class="note">Запись сохранится в журнале с вашим именем и временем.</p>
    <div class="form"><label><small>Тип записи</small><select id="enType">${typeOpts}</select></label></div>
    <div id="enFields"></div>
    <div class="row" style="margin-top:12px"><button class="btn pri" id="enSave">Сохранить</button><button class="btn" id="enCancel">Отмена</button></div>`;
  const fields = () => {
    const t = $('#enType').value;
    const opt = (a) => a.map((x) => `<option>${x}</option>`).join('');
    $('#enFields').innerHTML = {
      output: '<div class="form"><label><small>Выпущено, кг</small><input id="enKg" type="number" inputmode="decimal"></label></div>',
      waste: `<div class="form"><label><small>Отход, кг</small><input id="enKg" type="number" inputmode="decimal"></label><label><small>Причина</small><select id="enReason">${opt(WASTE_REASONS)}</select></label></div>`,
      downtime: '<div class="form"><label><small>Минут</small><input id="enMin" type="number" inputmode="numeric"></label><label><small>Причина</small><input id="enText" placeholder="Что случилось"></label></div>',
      replacement: `<div class="form"><label><small>Что заменено</small><select id="enReason">${opt(REPL)}</select></label><label><small>Минут</small><input id="enMin" type="number" inputmode="numeric"></label></div>`,
      setpoints: `<div class="form"><label><small>Печь, °C</small><input id="enOven" type="number" value="${l.sp.oven}"></label><label><small>Конвейер, м/мин</small><input id="enBelt" type="number" step="0.05" value="${l.sp.belt}"></label></div>`,
      note: '<label><small>Заметка</small><textarea id="enText"></textarea></label>',
    }[t];
  };
  fields();
  $('#enType').onchange = fields;
  $('#enCancel').onclick = () => $('#dlg').close();
  $('#enSave').onclick = () => {
    const t = $('#enType').value, g = (i) => $('#' + i)?.value;
    const r = ops.addEntry({ lineId, type: t, kg: g('enKg') || undefined, minutes: g('enMin') || undefined, reason: g('enReason'), text: g('enText'), sp: { oven: g('enOven'), belt: g('enBelt') } });
    if (!r.ok) return toast(r.err);
    $('#dlg').close(); toast('Запись сохранена в журнале'); st.sig = {}; paintLines();
  };
  $('#dlg').showModal();
}

/* ---------- Смена и персонал ---------- */
function viewShift(v) {
  const me = ops.user(ops.me), mine = ops.inbox();
  const sumE = (t) => ops.entries.filter((e) => e.type === t).reduce((a, e) => a + (e.kg || e.minutes || 0), 0);
  const out = sumE('output'), waste = sumE('waste'), down = sumE('downtime') + sumE('replacement');
  v.innerHTML = `
    <h2>Смена</h2>
    <div class="kpis">
      <div class="kpi"><small>На смене</small><b>${ops.staff.filter((u) => u.on).length}/${ops.staff.length}</b></div>
      <div class="kpi"><small>Выпуск, кг</small><b>${out}</b></div>
      <div class="kpi ${waste ? 'w' : ''}"><small>Отходы, кг</small><b>${waste}</b></div>
      <div class="kpi"><small>Простои, мин</small><b>${down}</b></div></div>
    <div class="row" style="margin-top:10px"><button class="btn ${me.on ? '' : 'pri'}" id="clk">${me.on ? 'Закончить смену' : 'Начать смену'}</button><span class="note" style="align-self:center">${esc(me.name)} · ${ROLES[me.role]}${me.on && me.since ? ' · на смене с ' + hm(me.since) : ''}</span></div>
    <h2>Мои задачи</h2>
    <div class="attn">${mine.map((o) => `<div class="al" style="border-left-color:var(--accent)"><div class="t">${esc(o.no)} · ${esc(o.ral)} · ${o.kg} кг</div><div class="m">${ST[o.status].label}</div><div class="btns"><button class="btn pri" data-go="orders">Открыть в «Заявках»</button></div></div>`).join('') || '<div class="empty">Задач для вашей роли сейчас нет.</div>'}</div>
    <h2>Персонал смены</h2>
    <div style="overflow-x:auto"><table><tr><th>Сотрудник</th><th>Роль</th><th>Линия</th><th>Смена</th><th>Статус</th><th>Часов за месяц</th></tr>
      ${ops.staff.filter((u) => u.role !== 'admin').map((u) => { const ln = ops.lines.find((l) => l.opId === u.id); return `<tr><td>${esc(u.name)}</td><td>${ROLES[u.role]}</td><td>${ln ? ln.name : '—'}</td><td>${u.shift}</td><td>${u.on ? '<span class="pill g">на смене' + (u.since ? ' с ' + hm(u.since) : '') + '</span>' : '<span class="pill">нет</span>'}</td><td>${fmt(u.hours, 0)}</td></tr>`; }).join('')}</table></div>
    <h2>Табель за 14 дней</h2>${tabelHtml()}
    ${ops.has('shift.handover') ? `<h2>Передача смены</h2><div class="card"><p class="note">В записи автоматически указывается число открытых отклонений: ${allItems().length}.</p><textarea id="hoNote" placeholder="Замечания следующей смене"></textarea><div style="margin-top:8px"><button class="btn pri" id="hoSend">Передать смену</button></div></div>` : ''}`;
  $('#clk').onclick = () => { ops.clock(ops.me); viewShift(v); };
  v.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
  const hs = $('#hoSend'); if (hs) hs.onclick = () => { ops.handover(ops.me, $('#hoNote').value, allItems().length); toast('Смена передана, запись в журнале'); $('#hoNote').value = ''; };
}

/* ---------- Ещё и журнал ---------- */
function viewMore(v) {
  const m = [['premix', 'Премиксы', 'Очередь малых и больших премиксов, корректировки'], ['color', 'Цвет', 'Коррекция цвета: график a*b*, колорант и % добавки'], ['chem', 'Состав и нагрев', 'Опционально: прогноз результата при смещении ингредиентов и нагреве'], ['batches', 'Партии', 'Готовая продукция, паспорт качества и этикетка'], ['analytics', 'Аналитика', 'Выпуск, отходы, простои и корректировки по линиям'], ['journal', 'Журнал', 'Все действия людей и отклонения, выгрузка в CSV'], ['roles', 'Роли и доступ', 'Права каждой роли настраиваются индивидуально'], ['helper', 'Помощник', 'Подсказки технологу по текущему состоянию'], ['system', 'Система', 'Модули, масштаб нейросети, схема, демо и рабочая версия']].filter(([k]) => tabOk(k));
  v.innerHTML = `<h2>Разделы</h2><div class="menu">${m.map(([k, n, d]) => `<button data-go="${k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>`;
  v.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
}

function viewJournal(v) {
  const f = st.jf || 'all';
  const all = [...ops.journal.map((j) => ({ ts: j.ts, kind: j.kind, text: j.text, by: j.by })), ...plant.events.map((e) => ({ ts: e.ts, kind: 'alarm', text: e.text, by: null }))].sort((a, b) => b.ts - a.ts);
  const list = all.filter((x) => f === 'all' || x.kind === f).slice(0, 80);
  const KL = { order: 'заявка', op: 'оператор', shift: 'смена', alarm: 'тревога', role: 'доступ' };
  v.innerHTML = `<h2>Журнал</h2>
    <p class="note">Все записи сохраняются: кто, когда и что сделал, а также отклонения датчиков. Журнал выгружается в CSV для проверки и отчётов.</p>
    <div class="row" style="margin:8px 0">${[['all', 'Все'], ['order', 'Заявки'], ['op', 'Операторы'], ['shift', 'Смены'], ['role', 'Доступ'], ['alarm', 'Тревоги']].map(([k, n]) => `<button class="chip" data-jf="${k}" aria-pressed="${f === k}">${n}</button>`).join('')}${ops.has('journal.export') ? '<button class="btn" id="csv" style="margin-left:auto">Выгрузить CSV</button>' : ''}</div>
    <div class="jr">${list.map((x) => `<div><time>${hm(x.ts)}</time><span>${esc(x.text)}<br><span class="note">${x.by ? esc(ops.name(x.by)) + ' · ' + ROLES[ops.user(x.by)?.role] : 'система'}</span></span><span class="tag ${x.kind === 'alarm' ? 'act' : 'open'}">${KL[x.kind]}</span></div>`).join('')}</div>`;
  v.querySelectorAll('[data-jf]').forEach((b) => (b.onclick = () => { st.jf = b.dataset.jf; viewJournal(v); }));
  if ($('#csv')) $('#csv').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ops.csv(plant.events)], { type: 'text/csv;charset=utf-8' })); a.download = 'zhurnal.csv'; a.click(); };
}

/* ---------- Роли и доступ ---------- */
function viewRoles(v) {
  const rid = st.rid && ops.roles[st.rid] ? st.rid : 'tech';
  const r = ops.roles[rid], adm = rid === 'admin';
  v.innerHTML = `<h2>Роли и доступ</h2>
    <p class="note">Права каждой роли настраиваются индивидуально: можно включать и отключать доступ к разделам и действиям, назначать этапы заявки, добавлять свои роли. Итоговый состав ролей и прав согласуется при составлении технического задания.</p>
    <div class="row" style="margin:8px 0">${Object.entries(ops.roles).map(([k, x]) => `<button class="chip" data-rid="${k}" aria-pressed="${k === rid}">${esc(x.name)}</button>`).join('')}<button class="chip" id="addRole">+ Новая роль</button></div>
    <div class="two-col">
      <div class="card"><h3>${esc(r.name)}</h3><p class="note">${adm ? 'Администратор имеет полный доступ, его права не редактируются.' : r.custom ? 'Индивидуальная роль предприятия.' : 'Базовая роль: права можно изменить.'}</p>
        <b>Доступ к разделам и действиям</b>
        <div class="perms">${PERMS.map(([k, n]) => `<label class="tg"><input type="checkbox" data-perm="${k}" ${adm || r.perms.includes(k) ? 'checked' : ''} ${adm ? 'disabled' : ''}> ${n}</label>`).join('')}</div></div>
      <div class="card"><b>Какие этапы заявки ведёт роль</b>
        <div class="perms">${STAGE_ORDER.filter((x) => ST[x].role).map((x) => `<label class="tg"><input type="checkbox" data-stage="${x}" ${adm || r.stages.includes(x) ? 'checked' : ''} ${adm ? 'disabled' : ''}> ${ST[x].label}</label>`).join('')}</div>
        ${r.custom ? '<div class="row" style="margin-top:10px"><button class="btn" id="renRole">Переименовать</button><button class="btn" id="delRole">Удалить роль</button></div>' : ''}</div>
    </div>
    <h2>Сотрудники и их роли</h2>
    <div style="overflow-x:auto"><table><tr><th>Сотрудник</th><th>Роль</th></tr>${ops.staff.map((u) => `<tr><td>${esc(u.name)}</td><td><select data-ur="${u.id}" ${u.role === 'admin' ? 'disabled' : ''}>${Object.entries(ops.roles).filter(([k]) => k !== 'admin' || u.role === 'admin').map(([k, x]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
    <h2>Кого уведомлять</h2>
    <div class="card"><p class="note">Уведомления получает роль, на чьём этапе находится заявка (в приложении, в Telegram или по почте, по темам: заявки, ожидание, согласования, история).</p>
      <ul class="l">${STAGE_ORDER.filter((x) => ST[x].role).map((x) => `<li><b>${ST[x].label}</b> → ${esc(ops.stageRoles(x))}</li>`).join('')}</ul></div>`;
  v.querySelectorAll('[data-rid]').forEach((b) => (b.onclick = () => { st.rid = b.dataset.rid; viewRoles(v); }));
  v.querySelectorAll('[data-perm]').forEach((c) => (c.onchange = () => { ops.setPerm(rid, c.dataset.perm, c.checked); renderTabs(); toast('Доступ обновлён, запись в журнале'); }));
  v.querySelectorAll('[data-stage]').forEach((c) => (c.onchange = () => { ops.setStage(rid, c.dataset.stage, c.checked); toast('Этапы роли обновлены'); }));
  v.querySelectorAll('[data-ur]').forEach((x) => (x.onchange = () => { ops.setUserRole(x.dataset.ur, x.value); initWho(); renderTabs(); toast('Роль назначена'); }));
  $('#addRole').onclick = () => { const n = prompt('Название новой роли (например, «Лаборант»):', ''); if (!n || !n.trim()) return; st.rid = ops.addRole(n.trim(), rid); viewRoles(v); };
  const rn = $('#renRole'); if (rn) rn.onclick = () => { const n = prompt('Новое название роли:', r.name); if (n && n.trim()) { ops.renameRole(rid, n.trim()); initWho(); viewRoles(v); } };
  const dl = $('#delRole'); if (dl) dl.onclick = () => { if (!ops.deleteRole(rid)) return toast('Нельзя удалить: роль назначена сотрудникам'); st.rid = 'tech'; initWho(); viewRoles(v); };
}

/* ---------- Премиксы ---------- */
function viewPremix(v) {
  const q = ops.orders.filter((o) => ['premix', 'correction'].includes(o.status));
  const big = q.filter((o) => o.premixSize === 'большой'), small = q.filter((o) => o.premixSize !== 'большой');
  const wait = ops.orders.filter((o) => o.status === 'check'), soon = ops.orders.filter((o) => o.status === 'tech');
  const recipe = (o) => o.recipe ? Object.entries(o.recipe.items).map(([c, x]) => `${esc(c)} ${fmt(x, 2)} %`).join(' · ') : '—';
  const card = (o) => {
    const lastC = o.status === 'correction' ? o.corrections[o.corrections.length - 1] : null;
    return `<div class="oc ${ops.canAct(o) ? 'mine' : ''}"><div class="hd"><div><b>${esc(o.no)} · ${esc(o.ral)}</b><div class="m">${esc(o.customer)} · заказ ${o.kg} кг · срок ${dt(o.due)}</div></div><span class="pill ${o.premixSize === 'большой' ? '' : 'g'}">${o.premixSize} · ${o.premixKg} кг</span></div>
      <div class="m"><b>Рецепт v${o.recipe?.ver ?? '—'}:</b> ${recipe(o)}</div>
      ${lastC ? `<div class="al act" style="border-left-color:var(--warn-dot)"><div class="t" style="font-size:13.5px">Корректировка №${lastC.n}: ${esc(lastC.note)}</div><div class="m">${esc(ops.name(lastC.by))}</div></div>` : ''}
      ${orderActions(o)}<div><button class="btn" data-open="${o.id}">Подробнее</button></div></div>`;
  };
  v.innerHTML = `<h2>Премиксы</h2>
    <div class="kpis"><div class="kpi"><small>Большие в очереди</small><b>${big.length}</b></div><div class="kpi"><small>Малые в очереди</small><b>${small.length}</b></div>
      <div class="kpi ${wait.length ? 'w' : ''}"><small>Ждут проверки технолога</small><b>${wait.length}</b></div><div class="kpi"><small>Рецепты в подготовке</small><b>${soon.length}</b></div></div>
    <h2>Большие премиксы</h2><div class="bl">${big.map(card).join('') || '<div class="empty">Очередь пуста.</div>'}</div>
    <h2>Малые премиксы</h2><div class="bl">${small.map(card).join('') || '<div class="empty">Очередь пуста.</div>'}</div>
    <h2>Готовы, ждут проверки цвета у технолога</h2><div class="bl">${wait.map((o) => `<div class="oc"><div class="hd"><div><b>${esc(o.no)} · ${esc(o.ral)}</b><div class="m">${esc(o.customer)} · ${recipe(o)}</div></div><span class="pill w">проверка</span></div><div class="m">Премикс ${o.premixSize}, ${o.premixKg} кг · технолог ${esc(ops.name(o.techId))}</div></div>`).join('') || '<div class="empty">Нет.</div>'}</div>`;
  bindOrderActions(v, () => viewPremix(v));
}

/* ---------- Аналитика ---------- */
function viewAnalytics(v) {
  const sum = (arr, f) => arr.reduce((a, e) => a + f(e), 0);
  const per = ops.lines.map((l) => { const e = ops.entries.filter((x) => x.lineId === l.id); return { name: l.name, out: sum(e.filter((x) => x.type === 'output'), (x) => x.kg || 0), waste: sum(e.filter((x) => x.type === 'waste'), (x) => x.kg || 0), down: sum(e.filter((x) => x.type === 'downtime' || x.type === 'replacement'), (x) => x.minutes || 0) }; });
  const by = (type, key) => { const m = {}; ops.entries.filter((x) => x.type === type).forEach((x) => { const k = x.reason || x.text || 'Прочее'; m[k] = (m[k] || 0) + (key === 'kg' ? x.kg || 0 : x.minutes || 0); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const wr = by('waste', 'kg'), dr = [...by('downtime', 'min'), ...by('replacement', 'min')].sort((a, b) => b[1] - a[1]);
  const out = sum(per, (p) => p.out), waste = sum(per, (p) => p.waste), down = sum(per, (p) => p.down);
  const ords = ops.orders.filter((o) => o.recipe);
  const bar = (name, val, max, unit, cls = '') => `<div class="barrow"><span>${esc(name)}</span><div class="bt"><i class="${cls}" style="width:${max ? Math.max(3, (val / max) * 100) : 0}%"></i></div><b>${fmt(val, 0)} ${unit}</b></div>`;
  const mo = Math.max(1, ...per.map((p) => p.out)), mw = Math.max(1, ...wr.map((x) => x[1])), md = Math.max(1, ...dr.map((x) => x[1]));
  v.innerHTML = `<h2>Аналитика производства</h2>
    <p class="note">Данные собираются из записей операторов, заявок и датчиков. В рабочей системе набор отчётов и показателей согласуется при составлении ТЗ.</p>
    <div class="kpis"><div class="kpi"><small>Выпуск, кг</small><b>${out}</b></div><div class="kpi ${waste ? 'w' : ''}"><small>Отходы, кг</small><b>${waste}</b></div>
      <div class="kpi"><small>Доля отходов</small><b>${out + waste ? fmt((waste / (out + waste)) * 100, 1) : '0'} %</b></div><div class="kpi"><small>Простои и замены, мин</small><b>${down}</b></div>
      <div class="kpi"><small>Корректировок на заявку</small><b>${fmt(ops.kpi().corr, 1)}</b></div></div>
    <div class="two-col">
      <div class="card"><h3>Выпуск по линиям</h3>${per.map((p) => bar(p.name, p.out, mo, 'кг')).join('')}<h3 style="margin-top:14px">Отходы по линиям</h3>${per.map((p) => bar(p.name, p.waste, Math.max(1, ...per.map((x) => x.waste)), 'кг', 'w')).join('')}</div>
      <div class="card"><h3>Причины отходов</h3>${wr.map(([n, x]) => bar(n, x, mw, 'кг', 'w')).join('') || '<p class="note">Записей нет.</p>'}<h3 style="margin-top:14px">Простои и замены</h3>${dr.map(([n, x]) => bar(n, x, md, 'мин', 'd')).join('') || '<p class="note">Записей нет.</p>'}</div>
    </div>
    <h2>Корректировки по заявкам</h2>
    <div class="card">${ords.map((o) => bar(o.no + ' · ' + o.ral, o.corrections.length, Math.max(1, ...ords.map((x) => x.corrections.length)), 'корр.', o.corrections.length > 1 ? 'w' : '')).join('')}<p class="note" style="margin-top:8px">Цель системы: уменьшить число корректировок на заявку, быстрее выходить на цвет и сокращать отходы.</p></div>`;
}

/* ---------- Табель ---------- */
function tabelHtml() {
  const days = [...Array(14)].map((_, i) => new Date(plant.t - (13 - i) * 86400000));
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const rows = ops.staff.filter((u) => u.role !== 'admin').map((u, ix) => {
    let tot = 0;
    const cells = days.map((d, i) => {
      const w = d.getDay(); let c = 'В', h = 0;
      if ((ix * 5 + i * 3) % 17 === 0 && i < 13) { c = 'О'; }
      else if (u.shift === 'ночь') { if ((i + ix) % 4 < 2) { c = 'Н'; h = 12; } }
      else if (w !== 0 && w !== 6) { c = 'Д'; h = 8; }
      if (i === 13 && !u.on && c !== 'В') { c = 'В'; h = 0; }
      tot += h;
      return `<td class="tc ${c}">${c}</td>`;
    }).join('');
    return `<tr><td class="nm">${esc(u.name)}<br><span class="note">${esc(ROLES[u.role])}</span></td>${cells}<td class="tt">${tot}</td></tr>`;
  }).join('');
  return `<div class="tw"><table class="tab"><tr><th class="nm">Сотрудник</th>${days.map((d, i) => `<th class="${i === 13 ? 'today' : ''}">${d.getDate()}<br><span>${wd[d.getDay()]}</span></th>`).join('')}<th>Часов</th></tr>${rows}</table></div>
    <p class="note" style="margin-top:6px">Д — день (8 ч), Н — ночь (12 ч), В — выходной, О — отгул или отпуск. В рабочей системе табель формируется автоматически из отметок «Начать/закончить смену» и согласуется начальником смены.</p>`;
}

/* ---------- Состав и нагрев (опциональный химический модуль, демо) ---------- */
const CH = { c: { ...BASE }, T: BASE_PROC.T, t: BASE_PROC.t };
const RNG = { resin: [52, 64], hard: [3.7, 6.7], fill: [11, 23], pig: [12, 24], add: [0.3, 3.3] };
const SC = { ok: ['var(--ok-dot)', 'в рабочем окне'], edge: ['#e9b8a8', 'на грани'], under: ['#e8c36a', 'недоотверждение'], burn: ['var(--danger-dot)', 'риск пригорания'] };
const pc = (x, d = 1) => fmt(x, d);

function viewChem(v) {
  v.innerHTML = `<h2>Состав и нагрев</h2>
    <p class="note">Опциональный модуль. Нейросеть сравнивает рецептуру с эталонной и считает результат при смещении ингредиентов и нагреве: цвет, блеск, степень отверждения, риск пригорания. В демо работает учебная модель с условными коэффициентами. В рабочей версии прогноз строится по данным ваших рецептур, режимов и результатов и проверяется на пилоте.</p>
    <div class="two-col" style="margin-top:8px">
      <div class="card"><h3>Рецептура, % масс.</h3>
        ${Object.keys(BASE).map((k) => `<div class="sl"><div class="sh"><span>${NAMES[k]}</span><b id="cv-${k}"></b></div><input type="range" data-ing="${k}" min="${RNG[k][0]}" max="${RNG[k][1]}" step="0.1" value="${CH.c[k]}" aria-label="${NAMES[k]}"><small class="note">эталон ${pc(BASE[k])} %</small></div>`).join('')}
        <h3 style="margin-top:12px">Нагрев</h3>
        <div class="sl"><div class="sh"><span>Температура отверждения</span><b id="cv-T"></b></div><input type="range" id="chT" min="160" max="230" step="1" value="${CH.T}"></div>
        <div class="sl"><div class="sh"><span>Время в печи</span><b id="cv-t"></b></div><input type="range" id="cht" min="5" max="25" step="0.5" value="${CH.t}"></div>
        <button class="btn" id="chReset" style="margin-top:6px">Вернуть эталон</button></div>
      <div class="card" id="chRes"></div>
    </div>
    <div class="two-col" style="margin-top:12px">
      <div class="card"><h3>Карта режимов</h3><p class="note">Температура и время при текущей рецептуре. Зелёное: рабочее окно, жёлтое: недоотверждение, красное: риск пригорания.</p><div id="chMap"></div></div>
      <div class="card"><h3>Рекомендации нейросети</h3><ul class="l" id="chAdv"></ul><p class="note" style="margin-top:10px">Состав: расчёт химического состава и подбор ингредиентов подключаются, если модуль добавлен в проект.</p></div>
    </div>`;
  v.querySelectorAll('[data-ing]').forEach((i) => i.oninput = () => { CH.c[i.dataset.ing] = parseFloat(i.value); paintChem(); });
  $('#chT').oninput = (e) => { CH.T = parseFloat(e.target.value); paintChem(); };
  $('#cht').oninput = (e) => { CH.t = parseFloat(e.target.value); paintChem(); };
  $('#chReset').onclick = () => { CH.c = { ...BASE }; CH.T = BASE_PROC.T; CH.t = BASE_PROC.t; viewChem(v); };
  paintChem();
}

function paintChem() {
  if (!$('#chRes')) return;
  const p = predict(CH.c, CH.T, CH.t), b = predict(BASE, BASE_PROC.T, BASE_PROC.t);
  for (const k of Object.keys(BASE)) { const d = CH.c[k] - BASE[k]; $('#cv-' + k).textContent = `${pc(CH.c[k])} %${Math.abs(d) > 0.04 ? ` (${d > 0 ? '+' : ''}${pc(d)})` : ''}`; }
  $('#cv-T').textContent = `${CH.T} °C${CH.T !== BASE_PROC.T ? ` (${CH.T > BASE_PROC.T ? '+' : ''}${CH.T - BASE_PROC.T})` : ''}`;
  $('#cv-t').textContent = `${pc(CH.t)} мин`;
  const [col, label] = SC[p.status];
  const row = (n, a, c, d, bad) => `<tr><td>${n}</td><td>${a}</td><td><b>${c}</b></td><td class="${bad ? 'bad' : ''}">${d}</td></tr>`;
  const sg = (x, dd = 1) => (x > 0 ? '+' : '') + pc(x, dd);
  $('#chRes').innerHTML = `<div class="verdict" style="border-left:6px solid ${col}"><b>${label[0].toUpperCase() + label.slice(1)}</b><span class="note">Расчёт нейросети по текущей рецептуре и режиму</span></div>
    <div class="stack">${Object.keys(BASE).map((k, i) => `<i style="width:${p.f[k]}%;background:${['#0c5c38', '#3dbe86', '#9bb8a8', '#e9b94a', '#6c8cbf'][i]}" title="${NAMES[k]} ${pc(p.f[k])} %"></i>`).join('')}</div>
    <p class="note" style="margin:4px 0 10px">${Object.keys(BASE).map((k, i) => `<span style="color:${['#0c5c38', '#3dbe86', '#9bb8a8', '#b8860b', '#6c8cbf'][i]}">■</span> ${NAMES[k]} ${pc(p.f[k])}%`).join(' · ')}</p>
    <div style="overflow-x:auto"><table class="cmpt"><tr><th>Показатель</th><th>Эталон</th><th>Ваш вариант</th><th>Разница</th></tr>
      ${row('Степень отверждения', pc(b.alpha * 100, 0) + ' %', pc(p.alpha * 100, 0) + ' %', sg((p.alpha - b.alpha) * 100, 0) + ' п.п.', p.alpha < 0.9)}
      ${row('Риск пригорания', pc(b.risk * 100, 0) + ' %', pc(p.risk * 100, 0) + ' %', sg((p.risk - b.risk) * 100, 0) + ' п.п.', p.risk > 0.25)}
      ${row('Цвет, ΔE к эталону', '0,0', pc(p.dE, 1), 'ΔL ' + sg(p.dL) + ', Δb ' + sg(p.db), p.dE > 1)}
      ${row('Блеск, GU', pc(b.gloss, 0), pc(p.gloss, 0), sg(p.gloss - b.gloss, 0), Math.abs(p.gloss - b.gloss) > 5)}
      ${row('Стойкость плёнки, индекс', pc(b.resist, 0), pc(p.resist, 0), sg(p.resist - b.resist, 0), p.resist < b.resist - 8)}
      ${row('Смола : отвердитель', pc(b.ratio, 1), pc(p.ratio, 1), sg(p.ratio - b.ratio), Math.abs(p.ratio / p.ideal - 1) > 0.06)}</table></div>`;
  const w = window_(CH.c), cw = 28, ch = 22, ox = 44, oy = 8;
  const cx = ox + ((CH.T - 160) / 5) * cw + cw / 2, cy = oy + ((CH.t - 5) / 2.5) * ch + ch / 2;
  $('#chMap').innerHTML = `<svg viewBox="0 0 ${ox + w.Ts.length * cw + 6} ${oy + w.ts.length * ch + 34}" style="width:100%;height:auto;display:block">
    ${w.cells.map((r, j) => r.map((s, i) => `<rect x="${ox + i * cw}" y="${oy + j * ch}" width="${cw - 1}" height="${ch - 1}" rx="3" fill="${SC[s][0]}" opacity="${s === 'ok' ? 0.85 : 0.9}"/>`).join('')).join('')}
    ${w.Ts.filter((_, i) => i % 2 === 0).map((T) => `<text x="${ox + ((T - 160) / 5) * cw + cw / 2}" y="${oy + w.ts.length * ch + 14}" font-size="10" text-anchor="middle" fill="currentColor">${T}</text>`).join('')}
    ${w.ts.filter((_, j) => j % 2 === 0).map((t, j) => `<text x="${ox - 6}" y="${oy + j * 2 * ch + ch / 2 + 3}" font-size="10" text-anchor="end" fill="currentColor">${t}</text>`).join('')}
    <text x="${ox + (w.Ts.length * cw) / 2}" y="${oy + w.ts.length * ch + 29}" font-size="10.5" text-anchor="middle" fill="currentColor" opacity=".7">температура, °C</text>
    <text x="8" y="${oy + 10}" font-size="10.5" fill="currentColor" opacity=".7">мин</text>
    <circle cx="${cx}" cy="${cy}" r="9" fill="#fff" stroke="#14202e" stroke-width="2.5"/></svg>`;
  $('#chAdv').innerHTML = advice(CH.c, CH.T, CH.t).map((x) => `<li>${esc(x)}</li>`).join('');
}

/* ---------- цикл ---------- */
function tick() {
  plant.step(Date.now());
  const n = allItems().filter((i) => !ackOf(i.key)).length;
  const b = $('#bellN'); b.hidden = !n; b.textContent = n;
  paintCenter();
  paintLines();
}
setInterval(tick, plant.settings.tickSec * 1000);
initWho();
go('center');
tick();
