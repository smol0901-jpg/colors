/**
 * NAP Paint — операции: заявки → задачи → рецепты → премиксы → корректировки → линии,
 * записи операторов, смены, журнал. Процесс обобщённый: статусы, роли и поля настраиваются
 * под конкретное предприятие. Данные демо хранятся в браузере (localStorage).
 */
import { fmt } from './core.js';

export const ROLES = {}; // id -> название; обновляется при изменении ролей

// Каталог прав. Набор расширяется под предприятие при составлении ТЗ.
export const PERMS = [
  ['orders.view', 'Заявки: просмотр'], ['orders.create', 'Заявки: создание'], ['recipe.edit', 'Рецепт и режим: редактирование'],
  ['premix.view', 'Премиксы: очередь'], ['lines.view', 'Линии: просмотр'], ['lines.enter', 'Линии: ввод данных по своей линии'],
  ['lines.enterAny', 'Линии: ввод данных по любой линии'], ['shift.view', 'Смена, персонал и табель'], ['shift.handover', 'Передача смены'],
  ['journal.view', 'Журнал: просмотр'], ['journal.export', 'Журнал: выгрузка CSV'], ['analytics.view', 'Аналитика производства'],
  ['color.use', 'Коррекция цвета'], ['chem.use', 'Состав и нагрев (химический модуль)'], ['batches.view', 'Партии и паспорта'], ['roles.manage', 'Роли и доступ'],
];
const ALL = PERMS.map((p) => p[0]);
const defaultRoles = () => ({
  admin: { name: 'Администратор', perms: [...ALL], stages: [] },
  manager: { name: 'Менеджер (заявки)', perms: ['orders.view', 'orders.create', 'lines.view', 'shift.view', 'journal.view', 'analytics.view', 'batches.view'], stages: ['new', 'review'] },
  tech: { name: 'Технолог', perms: ['orders.view', 'recipe.edit', 'premix.view', 'lines.view', 'shift.view', 'journal.view', 'analytics.view', 'color.use', 'chem.use', 'batches.view'], stages: ['tech', 'check'] },
  premix: { name: 'Оператор премиксов', perms: ['orders.view', 'premix.view', 'journal.view'], stages: ['premix', 'correction'] },
  lead: { name: 'Начальник смены', perms: ['orders.view', 'premix.view', 'lines.view', 'lines.enter', 'lines.enterAny', 'shift.view', 'shift.handover', 'journal.view', 'journal.export', 'analytics.view', 'batches.view'], stages: ['ready', 'run'] },
  op: { name: 'Оператор линии', perms: ['orders.view', 'lines.view', 'lines.enter', 'journal.view'], stages: ['run'] },
  qc: { name: 'Контролёр качества (ОТК)', perms: ['orders.view', 'lines.view', 'color.use', 'batches.view', 'journal.view'], stages: ['qc'], custom: true },
});

// Статусы заявки: кто отвечает на этапе и какое действие двигает заявку дальше.
export const ST = {
  new: { label: 'Новая заявка', role: 'manager', next: 'review', btn: 'Принять в обработку' },
  review: { label: 'В обработке', role: 'manager', next: 'tech', btn: 'Передать задачу технологу' },
  tech: { label: 'Рецепт (технолог)', role: 'tech', next: 'premix', btn: 'Рецепт готов, на премикс' },
  premix: { label: 'Премикс в работе', role: 'premix', next: 'check', btn: 'Премикс готов, сообщить технологу' },
  check: { label: 'Проверка у технолога', role: 'tech', next: 'ready', btn: 'Цвет принят, готово к запуску', alt: 'correction', altBtn: 'Нужна корректировка' },
  correction: { label: 'Корректировка', role: 'premix', next: 'check', btn: 'Корректировка внесена' },
  ready: { label: 'Готово к запуску', role: 'lead', next: 'run', btn: 'Назначить линию и оператора' },
  run: { label: 'В производстве', role: 'op', next: 'qc', btn: 'Выпуск завершён, на контроль' },
  qc: { label: 'Контроль качества', role: 'tech', next: 'done', btn: 'Принять партию', alt: 'run', altBtn: 'Вернуть на линию' },
  done: { label: 'Готово', role: null },
  cancel: { label: 'Отменена', role: null },
};
export const STAGE_ORDER = ['new', 'review', 'tech', 'premix', 'check', 'correction', 'ready', 'run', 'qc', 'done'];
export const ENTRY = { output: 'Выпуск', waste: 'Отход', downtime: 'Простой', replacement: 'Замена', setpoints: 'Установки', note: 'Заметка' };
export const WASTE_REASONS = ['Брак по цвету', 'Переналадка', 'Очистка линии', 'Нарушение режима', 'Прочее'];
export const REPL = ['Замена расходников', 'Замена оснастки', 'Смена цвета на линии', 'Замена фильтра', 'Прочее'];

const KEY = 'nap-paint-ops-v3';
const H = 3600000, D = 86400000;

export class Ops {
  constructor(plant) {
    this.plant = plant;
    this.ack = {};
    this.me = 'u_t1';
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { d = null; }
    if (d && d.v === 3) Object.assign(this, d.data); else this.seed();
    this.syncRoles();
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify({ v: 3, data: { roles: this.roles, orders: this.orders, lines: this.lines, staff: this.staff, entries: this.entries, journal: this.journal, seq: this.seq, me: this.me, settings: this.settings } })); } catch { /* демо работает и без сохранения */ } }
  reset() { try { localStorage.removeItem(KEY); } catch { /* */ } this.seed(); }

  seed() {
    const now = this.plant.t;
    this.seq = 150;
    this.settings = { ovenTol: 5, beltTol: 0.2 };
    this.roles = defaultRoles();
    this.staff = [
      { id: 'u_admin', name: 'Администратор', role: 'admin', shift: 'день', on: true, since: now - 5 * H, hours: 120 },
      { id: 'u_mgr', name: 'Сидорова М.', role: 'manager', shift: 'день', on: true, since: now - 4 * H, hours: 142 },
      { id: 'u_t1', name: 'Козлов А.', role: 'tech', shift: 'день', on: true, since: now - 4 * H, hours: 151 },
      { id: 'u_t2', name: 'Орлова Е.', role: 'tech', shift: 'день', on: false, since: null, hours: 138 },
      { id: 'u_pm1', name: 'Громов Д.', role: 'premix', shift: 'день', on: true, since: now - 4 * H, hours: 147 },
      { id: 'u_pm2', name: 'Белов С.', role: 'premix', shift: 'ночь', on: false, since: null, hours: 96 },
      { id: 'u_lead', name: 'Тимофеев П.', role: 'lead', shift: 'день', on: true, since: now - 4.5 * H, hours: 160 },
      { id: 'u_op1', name: 'Иванов И.', role: 'op', shift: 'день', on: true, since: now - 4 * H, hours: 149 },
      { id: 'u_op2', name: 'Петрова А.', role: 'op', shift: 'день', on: true, since: now - 4 * H, hours: 153 },
      { id: 'u_qc', name: 'Морозова Н.', role: 'qc', shift: 'день', on: true, since: now - 4 * H, hours: 140 },
      { id: 'u_op3', name: 'Алексеев В.', role: 'op', shift: 'день', on: true, since: now - 3.5 * H, hours: 144 },
    ];
    const rec = (parts, ver = 1) => ({ ver, items: parts, note: '' });
    const reg = (oven, belt) => ({ oven, belt });
    const o = (no, customer, ral, kg, dueD, status, extra = {}) => ({
      id: no, no, customer, ral, kg, due: now + dueD * D, prio: 'обычный', status, comment: '', premixSize: 'малый', premixKg: 0,
      techId: null, recipe: null, regime: reg(190, 2.2), corrections: [], comments: [], history: [], lineId: null, opId: null, created: now - 2 * D, ...extra,
    });
    const h = (ts, by, text) => ({ ts, by, text });
    this.orders = [
      o('ZK-0146', 'Заказчик Д', 'RAL 1003', 90, 6, 'new', { created: now - 0.4 * H }),
      o('ZK-0145', 'Заказчик Г', 'RAL 6005', 150, 5, 'tech', { prio: 'срочный', techId: 'u_t1', history: [h(now - 2 * H, 'u_mgr', 'Задача передана технологу')] }),
      o('ZK-0144', 'Заказчик В', 'RAL 5010', 200, 4, 'premix', { techId: 'u_t2', premixSize: 'большой', premixKg: 60, recipe: rec({ Синий: 3.2, Белый: 1.1, Чёрный: 0.2 }), history: [h(now - 3 * H, 'u_t2', 'Рецепт составлен, передан на премикс')] }),
      o('ZK-0143', 'Заказчик Б', 'RAL 3020', 120, 3, 'check', { techId: 'u_t1', premixSize: 'малый', premixKg: 8, recipe: rec({ Красный: 6.5, Жёлтый: 0.8, Белый: 0.3 }), history: [h(now - 1.2 * H, 'u_pm1', 'Премикс готов, замер цвета у технолога')] }),
      o('ZK-0142', 'Заказчик Б', 'RAL 7016', 300, 2, 'run', { techId: 'u_t1', premixSize: 'малый', premixKg: 12, recipe: rec({ Чёрный: 2.1, Синий: 0.6, Белый: 1.4 }, 2), regime: reg(190, 2.2), lineId: 'L2', opId: 'u_op2', corrections: [{ n: 1, ts: now - 6 * H, by: 'u_t1', note: '+0,35% чёрного' }, { n: 2, ts: now - 4 * H, by: 'u_t1', note: '+0,10% синего' }], history: [h(now - 1.5 * H, 'u_lead', 'Назначена Линия 2, оператор Петрова А.')] }),
      o('ZK-0141', 'Заказчик А', 'RAL 9010', 800, 2, 'run', { prio: 'срочный', techId: 'u_t1', premixSize: 'большой', premixKg: 80, recipe: rec({ Белый: 8.5, Жёлтый: 0.12, Синий: 0.04 }), regime: reg(190, 2.2), lineId: 'L1', opId: 'u_op1', corrections: [{ n: 1, ts: now - 7 * H, by: 'u_t1', note: '+0,12% жёлтого' }], history: [h(now - 3 * H, 'u_lead', 'Назначена Линия 1, оператор Иванов И.')] }),
      o('ZK-0140', 'Заказчик А', 'RAL 9005', 400, -1, 'done', { techId: 'u_t2', premixSize: 'большой', premixKg: 50, recipe: rec({ Чёрный: 7.5 }), history: [h(now - 20 * H, 'u_t2', 'Партия принята')] }),
    ];
    this.lines = [
      { id: 'L1', name: 'Линия 1', state: 'work', orderId: 'ZK-0141', opId: 'u_op1', sp: { oven: 190, belt: 2.2 } },
      { id: 'L2', name: 'Линия 2', state: 'work', orderId: 'ZK-0142', opId: 'u_op2', sp: { oven: 199, belt: 2.2 } },
      { id: 'L3', name: 'Линия 3', state: 'idle', orderId: null, opId: null, sp: { oven: 190, belt: 2.2 } },
    ];
    this.entries = [
      { id: 1, ts: now - 3 * H, userId: 'u_op1', lineId: 'L1', orderId: 'ZK-0141', type: 'setpoints', text: 'Печь 190 °C, конвейер 2,2 м/мин', sp: { oven: 190, belt: 2.2 } },
      { id: 2, ts: now - 2 * H, userId: 'u_op1', lineId: 'L1', orderId: 'ZK-0141', type: 'output', kg: 320, text: '' },
      { id: 3, ts: now - 1.9 * H, userId: 'u_op1', lineId: 'L1', orderId: 'ZK-0141', type: 'waste', kg: 6, reason: 'Переналадка', text: '' },
      { id: 4, ts: now - 1.4 * H, userId: 'u_op2', lineId: 'L2', orderId: 'ZK-0142', type: 'setpoints', text: 'Печь 199 °C, конвейер 2,2 м/мин', sp: { oven: 199, belt: 2.2 } },
      { id: 5, ts: now - 1 * H, userId: 'u_op2', lineId: 'L2', orderId: 'ZK-0142', type: 'output', kg: 110, text: '' },
      { id: 6, ts: now - 0.6 * H, userId: 'u_op2', lineId: 'L2', orderId: 'ZK-0142', type: 'replacement', minutes: 12, reason: 'Замена расходников', text: '' },
    ];
    this.journal = [
      { id: 1, ts: now - 3 * H, kind: 'order', by: 'u_lead', text: 'ZK-0141: назначена Линия 1, оператор Иванов И.', orderId: 'ZK-0141', lineId: 'L1' },
      { id: 2, ts: now - 1.5 * H, kind: 'order', by: 'u_lead', text: 'ZK-0142: назначена Линия 2, оператор Петрова А.', orderId: 'ZK-0142', lineId: 'L2' },
      { id: 3, ts: now - 1.4 * H, kind: 'op', by: 'u_op2', text: 'Линия 2: установки печь 199 °C, конвейер 2,2 м/мин', orderId: 'ZK-0142', lineId: 'L2' },
      { id: 4, ts: now - 1.2 * H, kind: 'order', by: 'u_pm1', text: 'ZK-0143: премикс готов, замер цвета у технолога', orderId: 'ZK-0143' },
      { id: 5, ts: now - 0.4 * H, kind: 'order', by: 'u_mgr', text: 'ZK-0146: новая заявка, Заказчик Д, RAL 1003, 90 кг', orderId: 'ZK-0146' },
    ];
    this.save();
  }

  user(id) { return this.staff.find((u) => u.id === id); }
  name(id) { return this.user(id)?.name || '—'; }
  order(id) { return this.orders.find((o) => o.id === id); }
  line(id) { return this.lines.find((l) => l.id === id); }
  setMe(id) { this.me = id; this.save(); }
  get role() { return this.user(this.me).role; }

  j(kind, by, text, extra = {}) {
    this.journal.unshift({ id: ++this.seq, ts: this.plant.t, kind, by, text, ...extra });
    if (this.journal.length > 500) this.journal.length = 500;
  }
  hist(o, by, text) { o.history.unshift({ ts: this.plant.t, by, text }); }

  syncRoles() { for (const k of Object.keys(ROLES)) delete ROLES[k]; for (const [k, r] of Object.entries(this.roles)) ROLES[k] = r.name; }
  has(perm, uid = this.me) { const u = this.user(uid); return !!u && (u.role === 'admin' || !!this.roles[u.role]?.perms.includes(perm)); }
  stageRoles(status) { return Object.entries(this.roles).filter(([, r]) => r.stages.includes(status)).map(([, r]) => r.name).join(' / ') || '—'; }

  canAct(o, uid = this.me) {
    const u = this.user(uid); const r = this.roles[u.role];
    if (!ST[o.status].role) return false;
    if (u.role === 'admin') return true;
    if (!r?.stages.includes(o.status)) return false;
    if (o.status === 'run' && !this.has('lines.enterAny', uid)) return o.opId === uid;
    return true;
  }

  // права и роли
  setPerm(role, perm, on) { const p = this.roles[role].perms; const i = p.indexOf(perm); if (on && i < 0) p.push(perm); if (!on && i >= 0) p.splice(i, 1); this.j('role', this.me, `Роль «${this.roles[role].name}»: право «${PERMS.find((x) => x[0] === perm)[1]}» ${on ? 'включено' : 'отключено'}`); this.save(); }
  setStage(role, stage, on) { const p = this.roles[role].stages; const i = p.indexOf(stage); if (on && i < 0) p.push(stage); if (!on && i >= 0) p.splice(i, 1); this.j('role', this.me, `Роль «${this.roles[role].name}»: этап «${ST[stage].label}» ${on ? 'добавлен' : 'снят'}`); this.save(); }
  addRole(name, copyFrom) {
    const id = 'r' + Date.now().toString(36);
    const base = this.roles[copyFrom] || { perms: ['orders.view'], stages: [] };
    this.roles[id] = { name, perms: [...base.perms], stages: [], custom: true };
    this.syncRoles(); this.j('role', this.me, `Создана роль «${name}»`); this.save(); return id;
  }
  renameRole(id, name) { this.roles[id].name = name; this.syncRoles(); this.save(); }
  deleteRole(id) {
    if (!this.roles[id]?.custom || this.staff.some((u) => u.role === id)) return false;
    this.j('role', this.me, `Удалена роль «${this.roles[id].name}»`); delete this.roles[id]; this.syncRoles(); this.save(); return true;
  }
  setUserRole(uid, role) { const u = this.user(uid); u.role = role; this.j('role', this.me, `${u.name}: назначена роль «${this.roles[role].name}»`); this.save(); }

  /* ---------- заявки ---------- */
  createOrder({ customer, ral, kg, dueDays, prio, comment }) {
    const d = new Date(this.plant.t); const p = (n) => String(n).padStart(2, '0');
    const n = Math.max(0, ...this.orders.map((x) => parseInt(x.no.slice(3), 10) || 0)) + 1;
    const no = 'ZK-' + String(n).padStart(4, '0');
    const o = { id: no, no, customer: customer || 'Заказчик', ral: ral || 'RAL', kg: Number(kg) || 0, due: this.plant.t + (Number(dueDays) || 5) * D, prio: prio || 'обычный', status: 'new', comment: comment || '', premixSize: 'малый', premixKg: 0, techId: null, recipe: null, regime: { oven: 190, belt: 2.2 }, corrections: [], comments: [], history: [], lineId: null, opId: null, created: this.plant.t };
    this.hist(o, this.me, 'Заявка создана');
    this.orders.unshift(o);
    this.j('order', this.me, `${no}: новая заявка, ${o.customer}, ${o.ral}, ${o.kg} кг`, { orderId: no });
    this.save(); return o;
  }

  setRecipe(id, { items, premixSize, premixKg, oven, belt, note }) {
    const o = this.order(id);
    const prev = o.recipe;
    o.recipe = { ver: prev ? prev.ver + 1 : 1, items, note: note || '' };
    o.premixSize = premixSize; o.premixKg = Number(premixKg) || 0;
    o.regime = { oven: Number(oven) || 190, belt: Number(belt) || 2.2 };
    if (!o.techId) o.techId = this.me;
    this.hist(o, this.me, `Рецепт v${o.recipe.ver}, премикс ${premixSize} ${o.premixKg} кг, режим: печь ${o.regime.oven} °C, конвейер ${fmt(o.regime.belt, 1)}`);
    this.j('order', this.me, `${o.no}: рецепт v${o.recipe.ver} сохранён`, { orderId: id });
    this.save();
  }

  advance(id, alt = false, payload = {}) {
    const o = this.order(id); const s = ST[o.status];
    if (!this.canAct(o)) return { ok: false, err: 'Этот этап ведёт другая роль: ' + ROLES[s.role] };
    const to = alt ? s.alt : s.next;
    if (o.status === 'tech' && !alt) {
      if (!o.recipe || !Object.values(o.recipe.items).some((v) => v > 0)) return { ok: false, err: 'Сначала составьте рецепт' };
    }
    if (o.status === 'ready' && !alt) {
      const ln = this.line(payload.lineId); const op = this.user(payload.opId);
      if (!ln || !op) return { ok: false, err: 'Выберите линию и оператора' };
      if (ln.orderId) return { ok: false, err: `${ln.name} занята заявкой ${ln.orderId}` };
      o.lineId = ln.id; o.opId = op.id;
      ln.orderId = o.id; ln.opId = op.id; ln.state = 'work'; ln.sp = { oven: o.regime.oven, belt: o.regime.belt };
      this.hist(o, this.me, `Назначена ${ln.name}, оператор ${op.name}`);
      this.j('order', this.me, `${o.no}: назначена ${ln.name}, оператор ${op.name}`, { orderId: id, lineId: ln.id });
    }
    if (o.status === 'check' && alt) {
      const note = (payload.note || '').trim() || 'без пояснения';
      o.corrections.push({ n: o.corrections.length + 1, ts: this.plant.t, by: this.me, note });
      this.hist(o, this.me, `Корректировка №${o.corrections.length}: ${note}`);
      this.j('order', this.me, `${o.no}: корректировка №${o.corrections.length}: ${note}`, { orderId: id });
    }
    if (o.status === 'run' && !alt) { const ln = this.line(o.lineId); if (ln) { ln.orderId = null; ln.opId = null; ln.state = 'idle'; } }
    if (o.status === 'qc' && alt) {
      const ln = this.line(o.lineId);
      if (ln && !ln.orderId) { ln.orderId = o.id; ln.opId = o.opId; ln.state = 'work'; }
    }
    if (o.status === 'qc' && !alt) {
      const made = this.totals(o.id).output || o.kg;
      const b = this.plant.addBatch({ ral: o.ral, name: o.customer, kg: made, line: this.line(o.lineId)?.name || '', emp: this.name(o.opId) });
      this.plant.setBatch(b.id, { status: 'done', dE: payload.dE ?? null });
      this.hist(o, this.me, `Партия ${b.no} принята`);
    }
    o.status = to;
    if (!(o.status === 'run' && alt) ) this.hist(o, this.me, `Статус: ${ST[to].label}`);
    this.j('order', this.me, `${o.no}: ${ST[to].label}`, { orderId: id, lineId: o.lineId });
    this.save(); return { ok: true };
  }

  comment(id, text) {
    const o = this.order(id); if (!text.trim()) return;
    o.comments.unshift({ ts: this.plant.t, by: this.me, text: text.trim() });
    this.j('order', this.me, `${o.no}: комментарий: ${text.trim()}`, { orderId: id });
    this.save();
  }

  inbox(uid = this.me) {
    const u = this.user(uid);
    if (u.role === 'admin') return [];
    return this.orders.filter((o) => ST[o.status].role && this.canAct(o, uid));
  }

  /* ---------- линии и записи операторов ---------- */
  totals(orderId) {
    const t = { output: 0, waste: 0, downtime: 0 };
    for (const e of this.entries) {
      if (e.orderId !== orderId) continue;
      if (e.type === 'output') t.output += e.kg || 0;
      if (e.type === 'waste') t.waste += e.kg || 0;
      if (e.type === 'downtime' || e.type === 'replacement') t.downtime += e.minutes || 0;
    }
    return t;
  }

  canEnter(lineId, uid = this.me) {
    const l = this.line(lineId);
    return this.has('lines.enterAny', uid) || (this.has('lines.enter', uid) && l.opId === uid);
  }

  addEntry({ lineId, type, kg, minutes, reason, text, sp }) {
    const l = this.line(lineId);
    if (!this.canEnter(lineId)) return { ok: false, err: 'Вы не назначены на эту линию' };
    const e = { id: ++this.seq, ts: this.plant.t, userId: this.me, lineId, orderId: l.orderId, type };
    if (kg != null) e.kg = Number(kg);
    if (minutes != null) e.minutes = Number(minutes);
    if (reason) e.reason = reason;
    if (type === 'setpoints') {
      e.sp = { oven: Number(sp.oven), belt: Number(sp.belt) };
      l.sp = { ...e.sp };
      e.text = `Печь ${e.sp.oven} °C, конвейер ${fmt(e.sp.belt, 2)} м/мин`;
    } else e.text = text || '';
    if (type === 'downtime') l.state = 'stop';
    this.entries.unshift(e);
    const label = ENTRY[type];
    const detail = type === 'output' || type === 'waste' ? `${e.kg} кг${reason ? ', ' + reason : ''}` : type === 'setpoints' ? e.text : `${minutes ? minutes + ' мин, ' : ''}${reason || ''} ${text || ''}`.trim();
    this.j('op', this.me, `${l.name}: ${label.toLowerCase()}: ${detail}`, { orderId: l.orderId, lineId });
    this.save(); return { ok: true };
  }

  resume(lineId) {
    const l = this.line(lineId);
    l.state = l.orderId ? 'work' : 'idle';
    this.j('op', this.me, `${l.name}: работа возобновлена`, { orderId: l.orderId, lineId });
    this.save();
  }

  /** Реальные значения «в моменте» (в демо считаются от имитатора, в рабочей системе приходят с датчиков линии) */
  actual(l) {
    if (l.state === 'idle') return null;
    const ps = (id) => this.plant.sensors.find((s) => s.id === id).value;
    const t = this.plant.t / 1000;
    if (l.id === 'L1') return { oven: l.sp.oven + (ps('oven') - 190), belt: l.sp.belt + (ps('belt') - 2.2) };
    return { oven: l.sp.oven + 1.1 * Math.sin(t / 37) + 0.4 * Math.sin(t / 11), belt: l.sp.belt + 0.03 * Math.sin(t / 23) };
  }

  lineItems() {
    const items = [];
    const { ovenTol, beltTol } = this.settings;
    for (const l of this.lines) {
      if (l.state === 'idle') continue;
      const o = this.order(l.orderId);
      const a = this.actual(l);
      if (o) {
        const r = o.regime;
        if (Math.abs(l.sp.oven - r.oven) > ovenTol) items.push({ key: `ln:${l.id}:sp`, level: 'act', core: 'Линия: установки', text: `${l.name}: оператор выставил печь ${fmt(l.sp.oven, 0)} °C, по задаче ${fmt(r.oven - ovenTol, 0)}…${fmt(r.oven + ovenTol, 0)} °C (${o.no})`, advice: 'Согласовать с технологом или вернуть установку по задаче', lineId: l.id });
        if (Math.abs(l.sp.belt - r.belt) > beltTol) items.push({ key: `ln:${l.id}:spb`, level: 'act', core: 'Линия: установки', text: `${l.name}: скорость конвейера ${fmt(l.sp.belt, 2)} м/мин, по задаче ${fmt(r.belt - beltTol, 1)}…${fmt(r.belt + beltTol, 1)} (${o.no})`, advice: 'Проверить время в печи и согласовать с технологом', lineId: l.id });
      }
      if (a) {
        const d = a.oven - l.sp.oven;
        if (Math.abs(d) > 6) items.push({ key: `ln:${l.id}:act`, level: 'act', core: 'Линия: факт и установка', text: `${l.name}: реальная температура печи ${fmt(a.oven, 0)} °C при установке ${fmt(l.sp.oven, 0)} °C`, advice: 'Проверить горелки или ТЭНы и термопары', lineId: l.id });
        else if (Math.abs(d) > 3.5) items.push({ key: `ln:${l.id}:act`, level: 'watch', core: 'Линия: факт и установка', text: `${l.name}: температура печи ${fmt(a.oven, 0)} °C расходится с установкой ${fmt(l.sp.oven, 0)} °C`, advice: 'Следить за трендом, при росте проверить регулятор', lineId: l.id });
      }
      if (l.state === 'stop') items.push({ key: `ln:${l.id}:stop`, level: 'watch', core: 'Линия: простой', text: `${l.name} стоит (простой или замена)`, advice: 'Возобновить работу после завершения', lineId: l.id });
    }
    for (const k of Object.keys(this.ack)) if (!items.some((i) => i.key === k)) delete this.ack[k];
    return items;
  }
  acknowledge(key, how) { this.ack[key] = { ts: this.plant.t, how }; }

  /* ---------- смены ---------- */
  clock(uid) {
    const u = this.user(uid);
    u.on = !u.on;
    if (u.on) u.since = this.plant.t; else { u.hours += Math.round(((this.plant.t - u.since) / H) * 10) / 10; u.since = null; }
    this.j('shift', uid, `${u.name}: ${u.on ? 'начал смену' : 'закончил смену'}`);
    this.save();
  }
  handover(uid, note, openCount) {
    this.j('shift', uid, `Передача смены. Открытых отклонений: ${openCount}. ${note || 'Без замечаний.'}`);
    this.save();
  }

  kpi() {
    const active = this.orders.filter((o) => !['done', 'cancel'].includes(o.status));
    const withTech = this.orders.filter((o) => o.recipe);
    const corr = withTech.length ? this.orders.reduce((a, o) => a + o.corrections.length, 0) / withTech.length : 0;
    return { active: active.length, linesWork: this.lines.filter((l) => l.state === 'work').length, lines: this.lines.length, corr };
  }

  csv(extra = []) {
    const rows = [['Время', 'Тип', 'Кто', 'Роль', 'Событие', 'Заявка', 'Линия']];
    const all = [...this.journal.map((j) => ({ ts: j.ts, kind: j.kind, by: j.by, text: j.text, orderId: j.orderId, lineId: j.lineId })), ...extra.map((e) => ({ ts: e.ts, kind: 'alarm', by: null, text: e.text, orderId: '', lineId: '' }))].sort((a, b) => b.ts - a.ts);
    for (const r of all) rows.push([new Date(r.ts).toLocaleString('ru-RU'), { order: 'заявка', op: 'оператор', shift: 'смена', alarm: 'тревога', role: 'доступ' }[r.kind] || r.kind, r.by ? this.name(r.by) : 'система', r.by ? this.roles[this.user(r.by)?.role]?.name || '' : '', r.text, r.orderId || '', r.lineId || '']);
    return '\ufeff' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  }
}
