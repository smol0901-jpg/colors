import { fmt } from './core.js';
import { frameRGB, frameInclusions, frameThermal, frameLaser, LIM } from './vision-frames.js';

const KEY = 'nap.vision.ctrl';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { log: [], off: 0 }; } catch { return { log: [], off: 0 }; } };
const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* демо */ } };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let tab = 'rgb';
const cnt = { ok: 0, bad: 0, inc: 0 };
const FR = { rgb: frameRGB, inc: frameInclusions, therm: frameThermal, laser: frameLaser };
const NM = { rgb: 'Камера: излом', inc: 'Вкрапления', therm: 'Тепловизор и пирометры', laser: 'Лазер: толщина' };

export function viewVision(v, plant, ops) {
  const d = load();
  const s = (id) => plant.sensors.find((x) => x.id === id);
  const can = ops.has('color.use');
  v.innerHTML = `
    <h2>Визуальный контроль ленты и чипсов</h2>
    <p class="note">Камера, тепловизор и лазерные датчики смотрят на ленту после охлаждающего валка. Кадры строятся по текущим показаниям имитируемых датчиков. Размер чипсов не важен: важны толщина ленты, чистый излом, отсутствие вкраплений и температура по длине.</p>
    <div class="row" id="vtabs" style="margin:10px 0">${Object.keys(NM).map((k) => `<button class="chip" data-t="${k}" aria-pressed="${k === tab}">${NM[k]}</button>`).join('')}</div>
    <div id="vframe" class="vframe"></div>
    <div class="vcards" id="vcards"></div>
    <h2>Контрольный замер технолога</h2>
    <p class="note">Лазер измеряет толщину постоянно. Технолог выборочно проверяет её микрометром или штангенциркулем и вносит результат сам. По расхождению видно, можно ли доверять датчику.</p>
    <div id="vctl"></div>
    <h2>Показать на демо</h2>
    <div class="row" id="vsc">
      <button class="chip" data-sc="stretch">Чипсы тянутся (лента не остыла)</button>
      <button class="chip" data-sc="thick">Лента толще нормы</button>
      <button class="chip" data-sc="burn">Пригорание на шнеке: вкрапления</button>
      <button class="chip" data-sc="reset">Сбросить</button>
    </div>
    <h2>Как это распознаётся</h2>
    <ul class="vlist">
      <li><b>Излом или тянучка.</b> Камера смотрит на форму края: у остывшей ленты грани острые, у тёплой края вытянуты. Доля чистых изломов должна быть не ниже ${LIM.brMin} %.</li>
      <li><b>Вкрапления.</b> Тёмные пятна на светлом чипсе находятся по контрасту, считаются по размеру и числу в минуту. Рост говорит о пригорании на шнеке или в зоне.</li>
      <li><b>Температура.</b> Тепловизор видит всю ленту, лазерные пирометры проверяют три точки: вход, середину и выход. На выходе чипсы должны остыть до ${LIM.tOutMax} °C.</li>
      <li><b>Толщина.</b> Лазер измеряет её по ширине ленты. Допуск ${LIM.thMin}–${LIM.thMax} мм, итог перепроверяет технолог.</li>
    </ul>`;
  const lvl = (x) => { const l = plant.status(x); return l === 'ok' ? 'ok' : (l === 'watch' ? 'warn' : 'bad'); };
  const vals = () => ({ t0: s('cT0').value, t1: s('cT1').value, t2: s('cT2').value, th: s('cTh').value + d.off, br: Math.min(100, s('cBr').value), inc: Math.max(0, s('cInc').value) });
  const ctl = () => {
    const avg = d.log.length ? d.log.reduce((a, r) => a + (r.m - r.l), 0) / d.log.length : 0;
    $c.innerHTML = `${can ? `<div class="row" style="align-items:flex-end"><label style="display:block"><span class="note">Замер, мм</span><input id="vm" type="number" step="0.01" min="0" max="5" placeholder="например 1,48" style="width:150px"></label><button class="chip" id="vadd">Внести контрольный замер</button></div>` : '<p class="note">Вносить замеры может технолог. Сейчас у вас режим просмотра.</p>'}
      ${d.log.length ? `<table class="vtab"><thead><tr><th>Время</th><th>Лазер</th><th>Замер</th><th>Разница</th><th>Кто</th></tr></thead><tbody>${d.log.slice(-5).reverse().map((r) => `<tr><td>${esc(r.t)}</td><td>${fmt(r.l, 2)}</td><td>${fmt(r.m, 2)}</td><td style="color:${Math.abs(r.m - r.l) > 0.1 ? 'var(--danger)' : 'var(--ok)'}">${r.m - r.l > 0 ? '+' : ''}${fmt(r.m - r.l, 2)}</td><td>${esc(r.w)}</td></tr>`).join('')}</tbody></table>
      <p class="note">Средняя разница ${avg > 0 ? '+' : ''}${fmt(avg, 2)} мм. Поправка лазера сейчас ${d.off > 0 ? '+' : ''}${fmt(d.off, 2)} мм.${Math.abs(avg) > 0.1 ? ' Расхождение больше 0,10 мм: проверьте чистоту окна и калибровку датчика.' : ''}</p>
      ${can ? '<div class="row"><button class="chip" id="vapp">Применить поправку</button><button class="chip" id="vrst">Сбросить поправку и замеры</button></div>' : ''}` : '<p class="note">Замеров пока нет.</p>'}`;
  };
  const $c = v.querySelector('#vctl');
  const draw = () => {
    if (!v.querySelector('#vframe')) return false;
    const x = vals();
    v.querySelector('#vframe').innerHTML = FR[tab](x);
    const C = (id, label, val) => { const q = s(id); const L = id === 'cTh' ? 'лазер' : ''; return `<div class="vc ${lvl(q)}"><span>${label}</span><b>${fmt(val, q.dec)} <small>${q.unit}</small></b><em>${q.one === 'hi' ? 'до ' + fmt(q.max, q.dec) : q.one === 'lo' ? 'от ' + fmt(q.min, q.dec) : fmt(q.min, q.dec) + '…' + fmt(q.max, q.dec)} ${L}</em></div>`; };
    v.querySelector('#vcards').innerHTML = C('cT0', 'Температура на входе', x.t0) + C('cT1', 'В середине ленты', x.t1) + C('cT2', 'На выходе', x.t2) + C('cTh', 'Толщина ленты', x.th) + C('cBr', 'Чистые изломы', x.br) + C('cInc', 'Вкрапления', x.inc) +
      `<div class="vc"><span>Чипсов за смену</span><b>${cnt.ok + cnt.bad}</b><em>тянучка ${cnt.bad} · вкраплений ${Math.floor(cnt.inc)}</em></div>`;
    cnt.ok += Math.round(8 * x.br / 100); cnt.bad += 8 - Math.round(8 * x.br / 100); cnt.inc += x.inc * 1.5 / 60;
    return true;
  };
  v.querySelector('#vtabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; v.querySelectorAll('#vtabs .chip').forEach((q) => q.setAttribute('aria-pressed', q === b)); draw(); });
  v.querySelector('#vsc').addEventListener('click', (e) => { const b = e.target.closest('[data-sc]'); if (b) plant.inject(b.dataset.sc); });
  $c.addEventListener('click', (e) => {
    if (e.target.id === 'vadd') { const m = parseFloat(String(v.querySelector('#vm').value).replace(',', '.')); if (!(m > 0)) return; d.log.push({ t: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), l: s('cTh').value, m, w: ops.user(ops.me).name }); save(d); ctl(); }
    if (e.target.id === 'vapp') { d.off = d.log.length ? d.log.reduce((a, r) => a + (r.m - r.l), 0) / d.log.length : 0; save(d); ctl(); draw(); }
    if (e.target.id === 'vrst') { d.log = []; d.off = 0; save(d); ctl(); draw(); }
  });
  ctl(); draw();
  const timer = setInterval(() => { if (!draw()) clearInterval(timer); }, 1500);
}
