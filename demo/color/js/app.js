/** Логика приложения: касание графика → разница → дозировки. */
const $ = (id) => document.getElementById(id);
const state = { range: 20, fraction: 'auto', colorants: [], strengths: {}, pending: null, stepNo: 1, obsCount: 0, deltaMode: false, lastPlan: null, lastDelta: null, ttk: {}, doseUnit: 'ttk' };

function num(id, def = 0) {
  const v = parseFloat(String($(id).value).replace(',', '.'));
  return Number.isFinite(v) ? v : def;
}
function getValues() {
  return {
    std: { L: num('stdL'), a: num('stdA'), b: num('stdB'), name: $('stdName').value || 'Эталон' },
    sam: { L: num('samL'), a: num('samA'), b: num('samB'), name: $('samName').value || 'Образец' },
  };
}
const r2 = (v) => { const k = state.range < 1 ? 1000 : 100; return Math.round(v * k) / k; };
function setSample(p) {
  if (p.L != null) $('samL').value = r2(Math.max(0, Math.min(100, p.L)));
  if (p.a != null) $('samA').value = r2(p.a);
  if (p.b != null) $('samB').value = r2(p.b);
  update();
}
const sign = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',');
const css = (L, a, b) => rgbCss(...labToRgb(L, a, b));

const METRICS = { dE: 'ΔE*ab', dE00: 'ΔE00', dCMC: 'ΔE CMC 2:1' };
const r3 = (v) => Math.round(v * 1000) / 1000;
const fmt2 = (v) => v.toFixed(2).replace('.', ',');
const INSTR_KEY = 'asv_instrument_v1';
const TTK_KEY = 'asv_ttk_v1';
function loadTtk() { try { return JSON.parse(localStorage.getItem(TTK_KEY) || '{}'); } catch { return {}; } }
function saveTtk() { try { localStorage.setItem(TTK_KEY, JSON.stringify(state.ttk)); } catch {} }
const fmtNum = (v) => String(+Number(v).toPrecision(6)).replace('.', ',');

/** Расчёт как на калькуляторе: масса × % пигмента в ТТК × % добавки. val — число в выбранных единицах дозы. */
function doseCalc(id, val, kg) {
  const p = state.ttk[id] > 0 ? state.ttk[id] : 0;
  const ttk = state.doseUnit === 'ttk' && p > 0 && id !== 'base';
  const abs = ttk ? (p * val) / 100 : val; // доля от массы, %
  const gramsTxt = fmtMass(abs, kg);
  const massG = fmtNum(kg * 1000) + ' г';
  return { ttk, p, abs, gramsTxt, formula: ttk ? `${massG} × ${fmtNum(p)} % × ${fmtNum(val)} % = ${gramsTxt}` : `${massG} × ${fmtNum(val)} % = ${gramsTxt}` };
}
function relOf(id, absPct) {
  const p = state.ttk[id] > 0 ? state.ttk[id] : 0;
  return state.doseUnit === 'ttk' && p > 0 && id !== 'base' ? Number(((absPct / p) * 100).toPrecision(4)) : absPct;
}

function numOrNull(id) {
  const raw = String($(id).value).trim();
  if (!raw) return null;
  const v = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function applyDeltaInputs() {
  const { std } = getValues();
  $('samL').value = r3(Math.max(0, Math.min(100, std.L + num('dsL'))));
  $('samA').value = r3(std.a + num('dsA'));
  $('samB').value = r3(std.b + num('dsB'));
}
function syncDeltaFields() {
  const { std, sam } = getValues();
  $('dsL').value = r3(sam.L - std.L);
  $('dsA').value = r3(sam.a - std.a);
  $('dsB').value = r3(sam.b - std.b);
}
function setMode(delta) {
  state.deltaMode = delta;
  $('modeAbs').classList.toggle('active', !delta);
  $('modeDelta').classList.toggle('active', delta);
  $('absRow').hidden = delta;
  $('deltaRow').hidden = !delta;
  if (delta) syncDeltaFields();
}

function currentMeta() {
  return { instrument: $('instModel').value, illuminant: $('instIllum').value, stdG: numOrNull('stdG'), samG: numOrNull('samG') };
}

const ruPlural = (n, one, few, many) => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? many : k === 1 ? one : k > 1 && k < 5 ? few : many; };

function update(saveHistory) {
  const { std, sam } = getValues();
  const dl = deltaLab(std, sam);
  const tol = num('tol', 1);
  const key = $('tolFormula').value;
  const metric = dl[key];

  const put = (id, v, thr = 0.15) => {
    const el = $(id);
    el.textContent = sign(v);
    el.className = 'val ' + (Math.abs(v) < thr ? 'neutral' : v > 0 ? 'positive' : 'negative');
  };
  put('dL', dl.dL); put('dA', dl.dA); put('dB', dl.dB); put('dC', dl.dC); put('dH', dl.dH);
  const putE = (id, v, k) => {
    $(id).textContent = fmt2(v);
    $(id).className = 'val ' + (k === key ? (v <= tol ? 'neutral' : 'positive') : '');
  };
  putE('dE', dl.dE, 'dE'); putE('dE00', dl.dE00, 'dE00'); putE('dCMC', dl.dCMC, 'dCMC');
  $('descr').textContent = describeDelta(dl);

  const sg = numOrNull('stdG'), mg = numOrNull('samG');
  $('tileG').hidden = sg == null || mg == null;
  if (sg != null && mg != null) put('dG', mg - sg, 0.5);

  const within = metric <= tol;
  let plan = null;
  if (!within && !state.pending) {
    plan = planCorrection({ std, sam, colorants: state.colorants, strengths: state.strengths, tol, mode: state.fraction });
  }
  state.lastPlan = plan; state.lastDelta = dl;
  const pred = plan && plan.items && plan.items.length ? plan.nominal : null;

  $('swatchStd').style.background = css(std.L, std.a, std.b);
  $('swatchSam').style.background = css(sam.L, sam.a, sam.b);
  $('swatchPred').style.background = pred ? css(pred.L, pred.a, pred.b) : css(sam.L, sam.a, sam.b);
  $('swatchStd').firstChild.textContent = std.name;
  $('swatchSam').firstChild.textContent = sam.name;

  drawPlot($('plot'), std, sam, state.range, pred);
  drawLStrip($('lstrip'), std, sam, state.range);
  renderAdvice(metric, key, plan, tol);

  if (state.deltaMode && !(document.activeElement && /^ds[LAB]$/.test(document.activeElement.id))) syncDeltaFields();
  if (saveHistory) { saveHistoryEntry(std, sam, dl, currentMeta()); renderHistory(); }
}

function renderAdvice(metric, key, plan, tol) {
  const kg = num('batchKg', 1);
  const name = METRICS[key];
  const kgs = String(kg).replace('.', ',');
  let html = '';
  if (state.pending) {
    const list = Object.entries(state.pending.doses).map(([id, v]) => { const nm = state.colorants.find((c) => c.id === id).name; return `${nm} ${fmtMass(v, state.pending.kg)}`; }).join(', ');
    html = `<div class="pending"><b>Корректировка №${state.pending.step}: добавлено ${list}.</b><br>
      Перемешайте/выкрасьте, измерьте образец на приборе и введите новый замер (график, цифры или Δ). Затем нажмите кнопку — программа сверит результат с прогнозом и уточнит силу красок.
      <div class="btn-row"><button id="btnLearn">Замер введён — обучить и пересчитать</button><button class="secondary" id="btnCancelPending">Отмена</button></div></div>`;
  } else if (metric <= tol) {
    const done = state.stepNo - 1;
    html = `<p class="verdict ok"><b>${name} = ${fmt2(metric)}</b> — в допуске (≤ ${String(tol).replace('.', ',')}).${done > 0 ? ` Готово за ${done} ${ruPlural(done, 'корректировку', 'корректировки', 'корректировок')}.` : ' Добавлять ничего не нужно.'}</p>
      <div class="btn-row"><button class="secondary" id="btnNewBatch">Новая партия</button></div>`;
  } else if (!plan || !plan.items.length) {
    html = `<p class="warn">Не удалось подобрать добавку из включённых колорантов. Включите больше колорантов в блоке настроек.</p>`;
  } else {
    const lo = Math.min(plan.dENominal, plan.dEWeak, plan.dEStrong), hi = Math.max(plan.dENominal, plan.dEWeak, plan.dEStrong);
    html += `<p class="note">Режим: <b>только добавление</b> — партия готова, убрать краску нельзя; перебор гасится добавлением противоположной краски (насыщенность при этом чуть падает). Масса для коррекции: ${kgs} кг.</p>`;
    html += `<p class="verdict"><b>Корректировка №${state.stepNo}.</b> ΔE*ab ${fmt2(plan.dE0)} → ожидаемо <b>≈ ${fmt2(plan.dENominal)}</b> <span class="note">(диапазон ${fmt2(lo)}–${fmt2(hi)})</span></p>`;
    html += plan.items.map((it) => {
      const v = relOf(it.id, it.pct), d = doseCalc(it.id, v, kg);
      return `<div class="dose"><span class="dot" style="background:${it.css}"></span>
        <div class="dmain"><span class="name">${it.name}</span>
          <div class="dline">добавить <input class="dose-in" type="number" step="any" inputmode="decimal" data-id="${it.id}" data-p="${d.ttk ? d.p : 0}" value="${v}" aria-label="Доза ${it.name}" /> <span>${d.ttk ? '% от пигмента ТТК' : (state.doseUnit === 'ttk' && it.id !== 'base' ? '% от массы (нет в ТТК)' : '% от массы')}</span></div>
          <div class="formula">${d.formula}</div></div>
        <div class="grams">${d.gramsTxt}</div></div>`;
    }).join('');
    const why = state.fraction === 'auto'
      ? `Беру ${Math.round(plan.alpha * 100)} % от полной дозы: ${plan.uncal ? 'сила красок ещё не откалибрована, поэтому шаг осторожный — убрать краску нельзя' : 'сила красок уже уточнена по вашим замерам'}.`
      : `Выбрана доля ${Math.round(plan.alpha * 100)} % от полной дозы (вручную).`;
    html += `<p class="note">${why} Полная доза: ${plan.fullItems.map((i) => `${i.name} ${fmtPct(i.pct)} %`).join(', ')}.</p>`;
    html += `<p class="note">Прогноз: ≈ <b>${plan.steps} ${ruPlural(plan.steps, 'корректировка', 'корректировки', 'корректировок')}</b> до допуска (оценка). Дозы можно поправить вручную — программа учтёт то, что вы реально добавили.</p>`;
    if (plan.items.some((i) => i.pct > 2)) html += `<p class="warn">Доза больше 2 % — отклик нелинейный и менее предсказуем. Добавляйте частями и замеряйте после каждой.</p>`;
    if (plan.items.some((i) => i.id === 'base')) html += `<p class="note">Основа разбавляет цвет: снижает насыщенность и поднимает светлоту. Масса партии вырастет на ${fmt2(plan.items.reduce((s, i) => s + i.pct, 0))} %.</p>`;
    if (plan.dEStrong > tol) html += `<p class="warn">Если краска окажется сильнее табличной, возможен перебор — поэтому шаг неполный.</p>`;
    const gs = numOrNull('stdG'), gm = numOrNull('samG');
    if (gs != null && gm != null && Math.abs(gm - gs) > 3) html += `<p class="warn">Блеск отличается на ${fmt2(Math.abs(gm - gs))} GU — часть разницы даёт блеск, колорантами его не поправить.</p>`;
    html += `<div class="btn-row"><button id="btnAdded">✔ Добавил — жду замер</button><button class="secondary" id="btnNewBatch">Новая партия</button></div>`;
  }
  $('advice').innerHTML = html;
}

function updateBrainText() {
  const el = $('brainStatus'); if (!el) return;
  const cal = state.obsCount ? ` · замеров для калибровки: ${state.obsCount}` : ' · красок пока не калибровали';
  el.textContent = Brain.status === 'ready' ? `🧠 нейросеть обучена (ошибка ≈ ${fmt2(Brain.mae)} ед. L*a*b*)${cal}`
    : Brain.status === 'training' ? `🧠 нейросеть обучается… ${Math.round(Brain.progress * 100)} % (пока расчёт по физической модели)`
    : '🧠 нейросеть не готова — расчёт по физической модели';
}

let retrainTimer = null;
function scheduleRetrain(force) {
  clearTimeout(retrainTimer);
  retrainTimer = setTimeout(() => {
    ensureBrain(state.colorants, () => updateBrainText(), force).then(() => { updateBrainText(); update(); });
  }, 800);
  updateBrainText();
}

function markAdded() {
  const doses = {};
  document.querySelectorAll('.dose-in').forEach((inp) => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    const p = parseFloat(inp.dataset.p) || 0;
    const abs = p > 0 ? (p * v) / 100 : v;
    if (abs > 0) doses[inp.dataset.id] = abs;
  });
  if (!Object.keys(doses).length) return;
  const kg0 = num('batchKg', 1);
  const add = Object.values(doses).reduce((s, v) => s + v, 0);
  state.pending = { before: { ...getValues().sam }, doses, step: state.stepNo, kg: kg0, prevKg: null };
  $('learnStatus').textContent = '';
  if ($('growMass').checked) {
    state.pending.prevKg = kg0;
    $('batchKg').value = Math.round(kg0 * (1 + add / 100) * 10000) / 10000;
    $('learnStatus').textContent = `Масса партии теперь ${fmtNum($('batchKg').value)} кг (добавлено ${fmtPct(add)} % от массы).`;
  }
  update();
}

function learnFromMeasurement() {
  const p = state.pending; if (!p) return;
  const { sam } = getValues();
  const active = state.colorants;
  const obs = { before: p.before, after: { L: sam.L, a: sam.a, b: sam.b }, doses: active.map((c) => p.doses[c.id] || 0) };
  const res = fitStrengths(active, state.strengths, obs);
  const st = $('learnStatus');
  if (res.skipped) {
    st.textContent = res.skipped;
  } else {
    const list = loadObs(); list.push({ ts: Date.now(), before: obs.before, after: obs.after, doses: p.doses }); saveObs(list);
    state.obsCount = list.length;
    saveStrengths(state.strengths);
    st.textContent = 'Калибровка: ' + res.changes.map((c) => `${c.name} ×${c.from.toFixed(2).replace('.', ',')} → ×${c.to.toFixed(2).replace('.', ',')} (замеров ${c.n})`).join('; ');
    state.stepNo = p.step + 1;
  }
  state.pending = null;
  renderColorants(); updateBrainText(); update();
}

function newBatch() { state.pending = null; state.stepNo = 1; $('learnStatus').textContent = ''; update(); }

function copyLLM() {
  const { std, sam } = getValues();
  const dl = state.lastDelta || deltaLab(std, sam);
  const ctx = {
    app: APP.title, instrument: currentMeta(), standard: std, sample: sam,
    delta: { dL: r3(dl.dL), dA: r3(dl.dA), dB: r3(dl.dB), dE_ab: r3(dl.dE), dE00: r3(dl.dE00) },
    tolerance: { metric: METRICS[$('tolFormula').value], value: num('tol', 1) },
    batch_kg: num('batchKg', 1), correction_no: state.stepNo,
    colorants: state.colorants.filter((c) => c.on).map((c) => (c.id === 'base' ? { id: c.id, name: c.name, base_lab: { L: c.dL, a: c.dA, b: c.dB }, note: 'добавление разбавляет цвет' } : { id: c.id, name: c.name, per_1pct: { dL: c.dL, dA: c.dA, dB: c.dB }, strength: state.strengths[c.id]?.s ?? 1, trials: state.strengths[c.id]?.n ?? 0 })),
    journal_last: loadObs().slice(-5),
    mode: 'only_additions', recipe_ttk_pct: state.ttk, dose_formula: 'граммы = масса_коррекции × %_пигмента_в_ТТК × %_добавки', local_nn_suggestion: state.lastPlan && state.lastPlan.items ? state.lastPlan.items.map((i) => ({ colorant: i.id, pct: i.pct })) : null,
  };
  const req = buildLLMRequest(ctx);
  const text = `${req.system}\n\nДанные:\n${req.user}`;
  const done = () => { $('llmStatus').textContent = 'Скопировано. Вставьте в чат с LLM (Claude, Grok, Qwen, DeepSeek, Kimi, GigaChat).'; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => { $('llmStatus').textContent = 'Не удалось скопировать автоматически.'; });
  else { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch {} t.remove(); }
}

function initInstrument() {
  try {
    const s = JSON.parse(localStorage.getItem(INSTR_KEY) || '{}');
    if (s.model) $('instModel').value = s.model;
    if (s.illum) $('instIllum').value = s.illum;
  } catch {}
  const save = () => { try { localStorage.setItem(INSTR_KEY, JSON.stringify({ model: $('instModel').value, illum: $('instIllum').value })); } catch {} };
  $('instModel').addEventListener('change', save);
  $('instIllum').addEventListener('change', save);
}

function pasteValues(target) {
  const nums = ($('pasteBox').value.match(/-?\d+(?:[.,]\d+)?/g) || []).map((s) => parseFloat(s.replace(',', '.')));
  const st = $('pasteStatus');
  if (nums.length < 3) { st.textContent = 'Не нашёл три числа. Пример: 43,36  44,41  25,67'; return; }
  const [L, a, b] = nums;
  if (target === 'std') {
    $('stdL').value = L; $('stdA').value = a; $('stdB').value = b;
    if (state.deltaMode) applyDeltaInputs();
  } else if (target === 'sam') {
    setMode(false);
    $('samL').value = L; $('samA').value = a; $('samB').value = b;
  } else {
    setMode(true);
    $('dsL').value = L; $('dsA').value = a; $('dsB').value = b;
    applyDeltaInputs();
  }
  st.textContent = `Принято: ${L} / ${a} / ${b} → ${target === 'std' ? 'эталон' : target === 'sam' ? 'образец' : 'Δ образца'}`;
  update();
}

/* ---------- касание ---------- */
function bindDrag(canvas, handler) {
  const go = (e) => {
    const rect = canvas.getBoundingClientRect();
    handler(e.clientX - rect.left, e.clientY - rect.top);
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    canvas.setPointerCapture(e.pointerId); go(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (e.buttons || e.pressure > 0) go(e); });
}

/* ---------- таблицы ---------- */
let ralGroup = '';
const ralLabel = (r) => `RAL ${r.code}${r.est ? ' ≈' : ''}`;
function ralMatches(q) {
  q = q.trim().toLowerCase().replace(/^ral\s*/, '');
  if (!q) return [];
  return RAL_DATA.filter((r) => r.code.startsWith(q) || r.name.toLowerCase().includes(q));
}
function renderRalGrid() {
  const grid = $('ralGrid');
  const list = RAL_DATA.filter((r) => !ralGroup || r.code[0] === ralGroup);
  grid.innerHTML = '';
  list.forEach((r) => {
    const el = document.createElement('div');
    el.className = 'ral-item';
    el.innerHTML = `<div class="chip" style="background:${css(r.L, r.a, r.b)}"></div>${ralLabel(r)}`;
    el.title = `${r.name}\nL*${r.L} a*${r.a} b*${r.b}`;
    el.onclick = () => setStd(r);
    grid.appendChild(el);
  });
  $('ralCount').textContent = `· показано ${list.length} из ${RAL_DATA.length}`;
}
function ralSearch(pick) {
  const q = $('ralSearch').value;
  const res = ralMatches(q);
  const box = $('ralResults');
  const st = $('ralStatus');
  box.innerHTML = '';
  if (!q.trim()) { st.textContent = ''; return; }
  const exact = res.find((r) => r.code === q.trim().replace(/\D/g, ''));
  if (pick && (exact || res.length === 1)) { setStd(exact || res[0]); return; }
  if (!res.length) {
    const code = q.replace(/\D/g, '');
    st.textContent = code.length === 4
      ? `RAL ${code} нет в справочнике (нет надёжных данных L*a*b*). Введите замер прибора в поля эталона.`
      : 'Ничего не найдено.';
    return;
  }
  st.textContent = res.length > 12 ? `Найдено ${res.length}, показаны первые 12 — уточните код.` : '';
  res.slice(0, 12).forEach((r) => {
    const b = document.createElement('div');
    b.className = 'ral-chip';
    b.innerHTML = `<i style="background:${css(r.L, r.a, r.b)}"></i>${ralLabel(r)} · ${r.name}`;
    b.onclick = () => setStd(r);
    box.appendChild(b);
  });
}
function initRal() {
  renderRalGrid();
  $('ralSearch').addEventListener('input', () => ralSearch(false));
  $('ralSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ralSearch(true); } });
  $('ralBtn').addEventListener('click', () => ralSearch(true));
  $('ralFilter').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    ralGroup = b.dataset.g;
    $('ralFilter').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    renderRalGrid();
  });
}
function setStd(r) {
  $('stdL').value = r.L; $('stdA').value = r.a; $('stdB').value = r.b;
  $('stdName').value = `RAL ${r.code}`;
  $('ralSearch').value = `RAL ${r.code}`;
  $('ralResults').innerHTML = '';
  $('ralStatus').textContent = `${r.name}: L* ${r.L}, a* ${r.a}, b* ${r.b}${r.est ? ' (оценка по sRGB)' : ''}`;
  if (state.deltaMode) applyDeltaInputs();
  update();
}

function renderColorants() {
  const t = $('colorantTable');
  t.innerHTML = `<div class="row hd"><span>Колорант</span><span>ΔL*</span><span>Δa*</span><span>Δb*</span><span>× сила</span></div>` +
    state.colorants.map((c) => {
      const s = state.strengths[c.id] || { s: 1, n: 0 };
      return `<div class="row" data-id="${c.id}">
      <label class="cn"><input type="checkbox" ${c.on ? 'checked' : ''} data-k="on" aria-label="${c.name}" /><span class="dot" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c.css}"></span>${c.name}<span class="sub">${c.id === 'base' ? 'L*a*b* самой основы' : 'замеров: ' + s.n}</span></label>
      <input type="number" step="any" data-k="dL" value="${c.dL}" />
      <input type="number" step="any" data-k="dA" value="${c.dA}" />
      <input type="number" step="any" data-k="dB" value="${c.dB}" />
      <input type="number" step="0.01" min="0.2" max="5" data-k="s" value="${s.s}" /></div>`;
    }).join('');
  t.querySelectorAll('input').forEach((inp) => inp.addEventListener('change', () => {
    const id = inp.closest('.row').dataset.id;
    const c = state.colorants.find((x) => x.id === id);
    const k = inp.dataset.k;
    if (k === 's') {
      const v = Math.min(5, Math.max(0.2, parseFloat(inp.value) || 1));
      state.strengths[id] = { s: v, n: state.strengths[id]?.n || 0 };
      saveStrengths(state.strengths);
    } else {
      c[k] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value) || 0;
      saveColorants(state.colorants);
      if (k !== 'on') scheduleRetrain(true);
    }
    update();
  }));
}

function renderTtk() {
  $('ttkTable').innerHTML = state.colorants.filter((c) => c.id !== 'base').map((c) => `<label class="trow"><span class="nm"><span class="dot" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c.css}"></span>${c.name}</span><input type="number" step="any" inputmode="decimal" min="0" data-id="${c.id}" value="${state.ttk[c.id] > 0 ? state.ttk[c.id] : ''}" placeholder="—" aria-label="${c.name}, % в ТТК" /> %</label>`).join('');
  $('ttkTable').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (v > 0) state.ttk[inp.dataset.id] = v; else delete state.ttk[inp.dataset.id];
    saveTtk(); update();
  }));
}
function setDoseUnit(u) {
  state.doseUnit = u;
  $('unitTtk').classList.toggle('active', u === 'ttk');
  $('unitMass').classList.toggle('active', u === 'mass');
  update();
}

function renderHistory() {
  const box = $('historyList');
  const list = loadHistory();
  if (!list.length) { box.innerHTML = '<p class="note">История пуста</p>'; return; }
  box.innerHTML = list.map((h, i) => `<div class="history-item" data-i="${i}"><span>${formatHistoryTime(h.ts)} · ΔE ${h.dE.toFixed(2)}${h.dE00 != null ? ' · ΔE00 ' + h.dE00.toFixed(2) : ''}</span><span style="color:var(--muted)">${h.std.name} → ${h.sam.name}</span></div>`).join('');
  box.querySelectorAll('.history-item').forEach((el) => el.onclick = () => {
    const h = list[+el.dataset.i];
    ['L', 'a', 'b'].forEach((k) => { $('std' + k.toUpperCase()).value = h.std[k]; $('sam' + k.toUpperCase()).value = h.sam[k]; });
    $('stdName').value = h.std.name; $('samName').value = h.sam.name;
    update();
  });
}

function setRange(r, from) {
  r = Math.min(100, Math.max(0.1, r));
  state.range = r;
  if (from !== 'num') $('rangeNum').value = +r.toFixed(2);
  if (from !== 'slider') $('rangeSlider').value = Math.round(Math.log10(r / 0.1) * 1000);
  $('zoom').querySelectorAll('button').forEach((x) => x.classList.toggle('active', parseFloat(x.dataset.r) === r));
  update();
}

function init() {
  state.colorants = loadColorants();
  state.strengths = loadStrengths(state.colorants);
  state.obsCount = loadObs().length;
  state.ttk = loadTtk();
  document.title = APP.title;
  $('appName').textContent = APP.name; $('appBadge').textContent = APP.label;
  $('footer').textContent = `${APP.title} · сборка ${APP.build} · демо: расчёт локальный (малая нейросеть), в продукте — LLM · проверяйте замером`;
  $('llmList').innerHTML = LLM_PROVIDERS.map((p) => `<div class="ral-chip">${p.name} · <span class="note">${p.status}</span></div>`).join('');
  initRal(); renderColorants(); renderTtk(); renderHistory();
  $('unitTtk').addEventListener('click', () => setDoseUnit('ttk'));
  $('unitMass').addEventListener('click', () => setDoseUnit('mass'));
  $('advice').addEventListener('input', (e) => {
    const inp = e.target.closest && e.target.closest('.dose-in'); if (!inp) return;
    const v = parseFloat(String(inp.value).replace(',', '.')) || 0;
    const p = parseFloat(inp.dataset.p) || 0;
    const id = inp.dataset.id;
    const saved = state.ttk[id]; if (p > 0) state.ttk[id] = p;
    const d = doseCalc(id, v, num('batchKg', 1));
    if (p > 0) { if (saved > 0) state.ttk[id] = saved; }
    const row = inp.closest('.dose'); row.querySelector('.formula').textContent = d.formula; row.querySelector('.grams').textContent = d.gramsTxt;
  });

  ['stdL', 'stdA', 'stdB'].forEach((id) => $(id).addEventListener('input', () => { if (state.deltaMode) applyDeltaInputs(); update(); }));
  ['samL', 'samA', 'samB', 'stdG', 'samG', 'batchKg', 'tol'].forEach((id) => $(id).addEventListener('input', () => update()));
  $('tolFormula').addEventListener('change', () => update());
  ['dsL', 'dsA', 'dsB'].forEach((id) => $(id).addEventListener('input', () => { applyDeltaInputs(); update(); }));
  $('modeAbs').addEventListener('click', () => setMode(false));
  $('modeDelta').addEventListener('click', () => setMode(true));
  document.querySelectorAll('[data-paste]').forEach((b) => b.addEventListener('click', () => pasteValues(b.dataset.paste)));
  initInstrument();
  ['stdName', 'samName'].forEach((id) => $(id).addEventListener('input', () => update()));

  const plot = $('plot'), strip = $('lstrip');
  bindDrag(plot, (x, y) => {
    const { std } = getValues();
    const m = plotMap(std, state.range, plot.clientWidth, plot.clientHeight);
    setSample({ a: m.toA(x), b: m.toB(y) });
  });
  bindDrag(strip, (x, y) => {
    const { std } = getValues();
    setSample({ L: lStripToL(strip, y, std, state.range) });
  });

  $('zoom').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    setRange(parseFloat(b.dataset.r));
  });
  $('rangeSlider').addEventListener('input', (e) => {
    const r = 0.1 * Math.pow(10, parseFloat(e.target.value) / 1000);
    setRange(r < 1 ? Math.round(r * 100) / 100 : r < 10 ? Math.round(r * 10) / 10 : Math.round(r), 'slider');
  });
  $('rangeNum').addEventListener('input', (e) => {
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    if (Number.isFinite(v) && v >= 0.1 && v <= 100) setRange(v, 'num');
  });
  $('rangeNum').addEventListener('change', (e) => setRange(parseFloat(String(e.target.value).replace(',', '.')) || state.range));
  $('fracBtns').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.fraction = b.dataset.f === 'auto' ? 'auto' : parseFloat(b.dataset.f);
    $('fracBtns').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    update();
  });

  $('btnHistory').addEventListener('click', () => update(true));
  $('btnSwap').addEventListener('click', () => {
    ['L', 'A', 'B', 'Name'].forEach((k) => { const s = $('std' + k), m = $('sam' + k); [s.value, m.value] = [m.value, s.value]; });
    update();
  });
  $('btnClearHistory').addEventListener('click', () => { clearHistory(); renderHistory(); });
  $('advice').addEventListener('click', (e) => {
    const id = e.target.id;
    if (id === 'btnAdded') markAdded();
    else if (id === 'btnLearn') learnFromMeasurement();
    else if (id === 'btnCancelPending') { if (state.pending && state.pending.prevKg) $('batchKg').value = state.pending.prevKg; state.pending = null; $('learnStatus').textContent = ''; update(); }
    else if (id === 'btnNewBatch') newBatch();
  });
  $('btnCopyLLM').addEventListener('click', copyLLM);
  $('btnResetColorants').addEventListener('click', () => { state.colorants = resetColorants(); renderColorants(); scheduleRetrain(true); update(); });
  $('btnResetStrength').addEventListener('click', () => { try { localStorage.removeItem(STRENGTH_KEY); localStorage.removeItem(OBS_KEY); } catch {} state.strengths = loadStrengths(state.colorants); state.obsCount = 0; state.pending = null; state.stepNo = 1; $('learnStatus').textContent = 'Калибровка силы красок сброшена.'; renderColorants(); updateBrainText(); update(); });
  $('btnRetrain').addEventListener('click', () => scheduleRetrain(true));

  window.addEventListener('resize', () => update());
  update();
  scheduleRetrain(false);
}
document.addEventListener('DOMContentLoaded', init);
