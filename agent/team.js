/* Демо «Команда и память агента»: роли, комментарии по линиям, вопросы агента с подтверждением,
   пересчёт прогноза и три уровня памяти. Вход имитирован, данные хранятся только в браузере. */
import { lineById, lineStatus } from './agent-core.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAY = 86400000, KEY = 'cik-team-v1';

const ROLES = {
  op: { n: 'Оператор', who: 'Иванов', can: ['stop', 'quality', 'note'], answer: true, confirm: false, hint: 'Видит свою линию, отмечает остановки и сложности, отвечает на вопросы агента.' },
  tx: { n: 'Техник', who: 'Петров', can: ['repair', 'stop', 'note'], answer: true, confirm: false, hint: 'Фиксирует ремонты и замены, отвечает на технические вопросы агента.' },
  tg: { n: 'Технолог', who: 'Сидорова', can: ['mode', 'quality', 'note'], answer: true, confirm: true, hint: 'Подтверждает причины и режимы. Только после этого они попадают в память.' },
  mg: { n: 'Руководитель', who: 'Кузнецов', can: ['note'], answer: false, confirm: false, hint: 'Смотрит сводки и потери по линиям, оставляет комментарии.' },
};
const KINDS = { stop: 'Остановка', repair: 'Ремонт / замена', mode: 'Смена режима', quality: 'Качество', note: 'Комментарий' };
const CAUSES = {
  filter: { n: 'Забит фильтр мельницы', e: { stop: 0.06, defect: 0.02 }, tip: 'Чаще включать продувку рукавов' },
  water: { n: 'Сбой охлаждающей воды', e: { stop: 0.08, defect: 0.05 }, tip: 'Проверить чиллер и фильтры воды' },
  material: { n: 'Питание: мостообразование смеси', e: { stop: 0.05, defect: 0.03 }, tip: 'Проверить бункер и питатель' },
  operator_error: { n: 'Ошибка настройки', e: { stop: 0.03 }, tip: 'Обновить инструкцию для смены' },
  planned: { n: 'Плановая остановка или чистка', e: {}, tip: 'В статистику сбоев не входит' },
  unknown: { n: 'Причина неизвестна', e: { stop: 0.07 }, tip: 'Неясная причина повышает неопределённость прогноза' },
  bearing_repl: { n: 'Заменили подшипник', e: { bearing: -0.3, stop: -0.08 }, tip: 'Остаточный ресурс узла сброшен' },
  gearbox: { n: 'Обслуживание редуктора', e: { bearing: -0.1, stop: -0.03 }, tip: 'Проверить вибрацию через сутки' },
  mode_change: { n: 'Смена режима по заданию', e: {}, tip: 'Сдвиг D50 ожидаемый, ложные тревоги подавлены' },
  quality_issue: { n: 'Замечание по качеству', e: { defect: 0.04 }, tip: 'Снять пробу и сравнить с эталоном' },
};
const CAUSE_BY_KIND = { stop: ['filter', 'water', 'material', 'operator_error', 'planned', 'unknown'], repair: ['bearing_repl', 'gearbox'], mode: ['mode_change'], quality: ['quality_issue'], note: [] };
const W = { ai: 0.3, pending: 0.6, confirmed: 1 };
const RISK = [{ k: 'stop', n: 'Внеплановая остановка', f: (l) => 0.1 + (100 - l.health) / 220 }, { k: 'defect', n: 'Брак партии', f: (l) => 0.06 + (100 - l.health) / 300 }, { k: 'bearing', n: 'Износ подшипника', f: (l) => 0.08 + (l.vibration.rms - 1.5) / 14 }];

const now = () => Date.now();
let T = { role: 'tg', line: 3, events: [], seq: 1, busy: false };
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.events) { T.events = s.events; T.seq = s.seq; } } catch { /* */ } }
function save() { try { localStorage.setItem(KEY, JSON.stringify({ events: T.events, seq: T.seq })); } catch { /* */ } }
function seed() {
  const ev = (line, d, kind, text, cause, mins, by) => ({ id: T.seq++, ts: now() - d * DAY, line, kind, text, cause, mins, by, status: 'confirmed', confirmedBy: 'tg' });
  T.events = [
    ev(3, 2, 'repair', 'Смазка упорного подшипника, вибрация упала до нормы', 'gearbox', 0, 'tx'),
    ev(3, 9, 'stop', 'Остановка из-за забитого рукавного фильтра', 'filter', 35, 'op'),
    ev(4, 14, 'mode', 'Переход на новый цвет, режим по заданию', 'mode_change', 0, 'tg'),
    ev(3, 40, 'stop', 'Сбой воды: чиллер отключался на 12 минут', 'water', 12, 'tx'),
    ev(5, 70, 'quality', 'Вкрапления на ленте, снята проба', 'quality_issue', 0, 'op'),
    ev(3, 400, 'repair', 'Замена подшипника шнека по состоянию', 'bearing_repl', 180, 'tx'),
    ev(2, 1200, 'stop', 'Остановка по питанию, мостообразование', 'material', 50, 'op'),
    ev(3, 2400, 'repair', 'Капитальная замена месильных элементов', 'gearbox', 480, 'tx'),
    ev(1, 4200, 'quality', 'Серия партий с отклонением цвета, разбор рекламации', 'quality_issue', 0, 'tg'),
  ];
  save();
}
const ago = (ts) => { const d = Math.floor((now() - ts) / DAY); if (d < 1) return 'сегодня'; if (d === 1) return 'вчера'; if (d < 60) return d + ' дн. назад'; if (d < 730) return Math.round(d / 30) + ' мес. назад'; return Math.round(d / 365) + ' лет назад'; };
const tier = (ts) => { const y = (now() - ts) / (365 * DAY); return y < 5 ? 'act' : y < 10 ? 'arc' : 'deep'; };
const who = (r) => (r === 'ai' ? 'Агент' : ROLES[r].n);

/* ---------- прогноз ---------- */
function risks(line) {
  const l = lineById(line);
  return RISK.map((r) => {
    const base = Math.max(0.02, Math.min(0.9, r.f(l)));
    let cur = base;
    T.events.filter((e) => e.line === line && e.cause).forEach((e) => { const eff = CAUSES[e.cause].e[r.k]; if (eff) cur += eff * W[e.status] * (e.status === 'confirmed' && Date.now() - e.ts > 30 * DAY ? 0.4 : 1); });
    return { ...r, base, cur: Math.max(0.01, Math.min(0.95, cur)) };
  });
}
const tone = (p) => (p >= 0.5 ? 'var(--bad)' : p >= 0.25 ? 'var(--warn)' : 'var(--ok)');

/* ---------- отрисовка ---------- */
function pill(st) { const m = { ai: ['warn', 'Агент ждёт ответа'], pending: ['warn', 'Ждёт подтверждения технолога'], confirmed: ['ok', 'В памяти'] }[st]; return `<span class="pill p-${m[0]}"><i></i>${m[1]}</span>`; }
function renderRoles() {
  $('#roleBar').innerHTML = Object.entries(ROLES).map(([k, r]) => `<button type="button" class="rc ${k === T.role ? 'on' : ''}" data-role="${k}" ${T.busy ? 'disabled' : ''}><b>${r.n}</b><span>${r.who} · демо-вход</span></button>`).join('');
  const r = ROLES[T.role];
  $('#acct').innerHTML = `<span class="av2">${r.n[0]}</span><div><b>${r.n} ${r.who}</b><div class="small">${r.hint}</div></div><div class="perm">${['Комментировать', 'Отвечать агенту', 'Подтверждать в память'].map((t, i) => `<span class="${[true, r.answer, r.confirm][i] ? 'y' : 'n'}">${[true, r.answer, r.confirm][i] ? '✓' : '✕'} ${t}</span>`).join('')}</div>`;
  $('#lineBar2').innerHTML = [1, 2, 3, 4, 5].map((n) => { const s = lineStatus(lineById(n)); return `<button type="button" class="pk ${n === T.line ? 'on' : ''}" data-tline="${n}" ${T.busy ? 'disabled' : ''}><i class="bg-${s}"></i>Л${n}</button>`; }).join('');
  const kinds = r.can;
  $('#kind').innerHTML = kinds.map((k) => `<option value="${k}">${KINDS[k]}</option>`).join('');
  fillCauses();
}
function fillCauses() {
  const k = $('#kind').value, list = CAUSE_BY_KIND[k] || [];
  $('#cause').innerHTML = list.length ? list.map((c) => `<option value="${c}">${CAUSES[c].n}</option>`).join('') : '<option value="">без причины</option>';
  $('#cause').disabled = !list.length; $('#mins').disabled = !(k === 'stop' || k === 'repair');
}
function renderJournal() {
  const ev = T.events.filter((e) => e.line === T.line).sort((a, b) => b.ts - a.ts);
  const r = ROLES[T.role];
  $('#tl').innerHTML = ev.length ? ev.map((e) => {
    let act = '';
    if (e.status === 'ai' && r.answer) act = `<div class="chips2">${(CAUSE_BY_KIND.stop).map((c) => `<button type="button" data-ans="${e.id}|${c}">${CAUSES[c].n}</button>`).join('')}</div>`;
    if (e.status === 'pending' && r.confirm) act = `<div class="chips2"><button type="button" class="yes" data-conf="${e.id}">Подтвердить</button><button type="button" data-rej="${e.id}">Отклонить</button></div>`;
    const t = tier(e.ts);
    return `<li class="ev ${e.status}" data-new="${e._new ? 1 : 0}"><span class="dt ${e.status}"></span><div class="eb"><div class="eh"><b>${KINDS[e.kind]}</b><span class="small">${ago(e.ts)} · ${who(e.by)}${e.mins ? ' · ' + e.mins + ' мин' : ''}</span>${pill(e.status)}${t !== 'act' ? `<span class="tierb ${t}">${t === 'arc' ? 'архив' : 'глубокий архив'}</span>` : ''}</div><div>${esc(e.text)}</div>${e.cause ? `<div class="small">Причина: <b>${CAUSES[e.cause].n}</b> · ${CAUSES[e.cause].tip}</div>` : ''}${act}</div></li>`;
  }).join('') : '<li class="empty">По этой линии пока нет записей.</li>';
  T.events.forEach((e) => delete e._new);
}
function renderImpact() {
  const rs = risks(T.line), l = lineById(T.line);
  const c = { ai: 0, pending: 0, confirmed: 0 };
  T.events.filter((e) => e.line === T.line).forEach((e) => c[e.status]++);
  $('#impact').innerHTML = `<div class="ih"><b>Прогноз по линии ${l.id}</b><span class="small">учитывает подтверждённые записи с полным весом, неподтверждённые с меньшим</span></div>`
    + rs.map((r) => `<div class="rk2"><div class="rr"><span>${r.n}</span><b style="color:${tone(r.cur)}">${Math.round(r.cur * 100)} %</b></div><div class="rbar"><i class="mk" style="left:${r.base * 100}%" title="без учёта записей"></i><i class="fl" style="width:${r.cur * 100}%;background:${tone(r.cur)}"></i></div><div class="small">без записей ${Math.round(r.base * 100)} % · ${r.cur > r.base + 0.005 ? 'выше из-за записей' : r.cur < r.base - 0.005 ? 'ниже после ремонта' : 'без изменений'}</div></div>`).join('')
    + `<div class="wts"><span class="p-ok">в памяти: ${c.confirmed}</span><span class="p-warn">ждут технолога: ${c.pending}</span><span class="p-warn">ждут ответа: ${c.ai}</span></div>`;
}
function renderTiers() {
  const y = +$('#age').value, t = y < 5 ? 'act' : y < 10 ? 'arc' : 'deep';
  document.querySelectorAll('.tcard').forEach((el) => el.classList.toggle('on', el.dataset.t === t));
  $('#ageL').textContent = y === 0 ? 'сейчас' : y + ' ' + (y === 1 ? 'год' : y < 5 ? 'года' : 'лет');
  const near = T.events.filter((e) => tier(e.ts) === t).sort((a, b) => Math.abs((now() - a.ts) / (365 * DAY) - y) - Math.abs((now() - b.ts) / (365 * DAY) - y))[0];
  $('#ageEx').innerHTML = near ? `Пример из этого уровня: <b>Линия ${near.line}</b>, ${ago(near.ts)}: ${esc(near.text)}` : 'В этом уровне пока нет демо-записей.';
}
function renderAll() { renderRoles(); renderJournal(); renderImpact(); renderTiers(); }

/* ---------- действия ---------- */
function addEvent(e) { e.id = T.seq++; e.ts = e.ts || now(); e._new = 1; T.events.push(e); save(); renderAll(); return e; }
function answer(id, cause, by = T.role) {
  const e = T.events.find((x) => x.id === +id); if (!e) return;
  e.cause = cause; e.answeredBy = by; e.status = ROLES[by].confirm ? 'confirmed' : 'pending'; if (e.status === 'confirmed') e.confirmedBy = by;
  e.text = e.text.replace(/\s*(Какая причина\?|Причина\?)$/, '') + '.'; save(); renderAll();
}
function confirm(id, by = 'tg') { const e = T.events.find((x) => x.id === +id); if (e) { e.status = 'confirmed'; e.confirmedBy = by; save(); renderAll(); } }
function reject(id) { T.events = T.events.filter((x) => x.id !== +id); save(); renderAll(); }
function agentAsk(line, text, mins) { return addEvent({ line, kind: 'stop', text, by: 'ai', status: 'ai', mins, cause: null }); }

/* ---------- сценарии ---------- */
const SCN = {
  stop: { t: 'Неожиданная остановка', d: 'Агент видит простой и спрашивает причину', steps: [
    [0, null, 'Агент: на линии 3 упал выпуск до нуля на 22 минуты. Что случилось?', () => { T.line = 3; agentAsk(3, 'Линия 3 стояла без выпуска 22 минуты. Какая причина?', 22); }],
    [2600, 'op', 'Оператор Иванов выбирает причину: «Забит фильтр мельницы»', (s) => answer(s.id, 'filter', 'op')],
    [2600, 'tg', 'Агент: ответ получен, но он ещё не в памяти. Ждёт подтверждения технолога', () => {}],
    [2600, 'tg', 'Технолог Сидорова подтверждает. Запись в памяти линии, прогноз пересчитан', (s) => confirm(s.id, 'tg')],
  ] },
  repair: { t: 'Замена подшипника', d: 'Техник фиксирует ремонт, риск снижается', steps: [
    [0, 'tx', 'Техник Петров записывает: заменил подшипник мельницы на линии 3', () => { T.line = 3; addEvent({ line: 3, kind: 'repair', text: 'Заменили подшипник мельницы после роста вибрации', by: 'tx', status: 'pending', cause: 'bearing_repl', mins: 140 }); }],
    [2800, 'tg', 'Агент: запись техника ждёт технолога, пока она учитывается с весом 60 %', () => {}],
    [2800, 'tg', 'Технолог подтверждает. Риск износа подшипника падает, ресурс узла сброшен', () => { const e = [...T.events].reverse().find((x) => x.status === 'pending' && x.cause === 'bearing_repl'); if (e) confirm(e.id, 'tg'); }],
  ] },
  mode: { t: 'Смена режима', d: 'Агент не поднимает ложную тревогу', steps: [
    [0, 'tg', 'Технолог Сидорова фиксирует смену режима на линии 4 под новый цвет', () => { T.line = 4; addEvent({ line: 4, kind: 'mode', text: 'Переход на новый цвет, скорректирована температура зон', by: 'tg', status: 'confirmed', cause: 'mode_change', confirmedBy: 'tg' }); }],
    [2800, null, 'Агент: сдвиг температуры и D50 ожидаемый, ложную тревогу не поднимаю', () => {}],
  ] },
  conflict: { t: 'Спорная причина', d: 'Оператор и датчики расходятся', steps: [
    [0, null, 'Агент: линия 3 остановилась на 15 минут, при этом вода тёплая. Причина?', () => { T.line = 3; agentAsk(3, 'Остановка 15 минут. Датчик воды показывал рост температуры. Какая причина?', 15); }],
    [2800, 'op', 'Оператор Иванов отвечает: «Питание: мостообразование смеси»', (s) => answer(s.id, 'material', 'op')],
    [2800, null, 'Агент: ответ расходится с датчиками (вода тёплая). Прошу технолога проверить', () => {}],
    [2800, 'tg', 'Технолог отклоняет ответ и после проверки записывает: «Сбой охлаждающей воды»', (s) => { reject(s.id); addEvent({ line: 3, kind: 'stop', text: 'Остановка 15 минут, чиллер отключался', by: 'tg', status: 'confirmed', cause: 'water', mins: 15, confirmedBy: 'tg' }); }],
  ] },
};
function runScn(key) {
  if (T.busy) return; const sc = SCN[key]; T.busy = true; renderRoles();
  const st = { id: null }, nar = $('#narr'); nar.hidden = false;
  let i = 0;
  const next = () => {
    if (i >= sc.steps.length) { T.busy = false; nar.querySelector('.np').style.width = '100%'; setTimeout(() => (nar.hidden = true), 2600); renderAll(); return; }
    const [delay, role, text, fn] = sc.steps[i];
    setTimeout(() => {
      if (role) T.role = role;
      const before = T.events.length; fn(st);
      if (T.events.length > before) st.id = T.events[T.events.length - 1].id;
      nar.querySelector('.nt').textContent = text; nar.querySelector('.np').style.width = Math.round(((i + 1) / sc.steps.length) * 100) + '%';
      renderAll(); T.busy = true; renderRoles(); i++; next();
    }, delay);
  };
  nar.querySelector('.nn').textContent = sc.t; next();
}
function resetAll() { T.events = []; T.seq = 1; seed(); T.busy = false; $('#narr').hidden = true; renderAll(); }

/* ---------- события ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.role && !T.busy) { T.role = b.dataset.role; renderAll(); }
  else if (b.dataset.tline && !T.busy) { T.line = +b.dataset.tline; renderAll(); }
  else if (b.dataset.ans && !T.busy) { const [id, c] = b.dataset.ans.split('|'); answer(id, c); }
  else if (b.dataset.conf && !T.busy) confirm(b.dataset.conf);
  else if (b.dataset.rej && !T.busy) reject(b.dataset.rej);
  else if (b.dataset.scn) runScn(b.dataset.scn);
  else if (b.id === 'tReset') resetAll();
});
$('#kind').addEventListener('change', fillCauses);
$('#age').addEventListener('input', renderTiers);
$('#cmtForm').addEventListener('submit', (e) => {
  e.preventDefault(); if (T.busy) return;
  const r = ROLES[T.role], text = $('#cmt').value.trim(), kind = $('#kind').value, cause = $('#cause').value || null, mins = +$('#mins').value || 0;
  if (!text) return;
  addEvent({ line: T.line, kind, text, by: T.role, cause, mins: kind === 'stop' || kind === 'repair' ? mins : 0, status: r.confirm || !cause ? 'confirmed' : 'pending', confirmedBy: r.confirm ? T.role : undefined });
  $('#cmt').value = '';
});
$('#scnBar').innerHTML = Object.entries(SCN).map(([k, s]) => `<button type="button" class="sc" data-scn="${k}"><b>${s.t}</b><span>${s.d}</span></button>`).join('');
load(); if (!T.events.length) seed();
renderAll();
