/**
 * Подготовка к LLM-версии продукта.
 * В демо расчёт делает локальная малая нейросеть. В продукте советы будут идти через LLM
 * с серверным шлюзом (ключи API нельзя хранить в браузере/на GitHub Pages).
 * Здесь — реестр провайдеров (адаптеры пока не подключены) и сборка запроса,
 * который уже сейчас можно вставить в любой чат-LLM.
 */
const LLM_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', status: 'план' },
  { id: 'xai', name: 'xAI (Grok)', status: 'план' },
  { id: 'qwen', name: 'Alibaba (Qwen)', status: 'план' },
  { id: 'deepseek', name: 'DeepSeek', status: 'план' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', status: 'план' },
  { id: 'sber', name: 'Сбер (GigaChat)', status: 'план' },
];

/** Контракт адаптера провайдера (для продукта): ({system, user}) → Promise<{steps:[{colorant,pct}], expected_dE, reasoning}> */
const LLM_SYSTEM_PROMPT = [
  'Ты технолог по колеровке порошковых красок и спектрофотометрии (CIELAB).',
  'По эталону, образцу, набору колорантов и журналу прошлых корректировок предложи, какие колоранты и в каком количестве (% от массы базы) добавить.',
  'Правила: дозы только положительные; убрать краску нельзя, поэтому перебор хуже недобора — первый шаг неполный;',
  'учитывай, что каждая краска может быть сильнее или слабее табличной (поле strength) и действует нелинейно;',
  'цель — уложиться в 1–2 корректировки, максимум 3; после шага рекомендуется замер и пересчёт.',
  'Ответ — только JSON: {"steps":[{"colorant":"id","pct":число}],"expected_dE":число,"reasoning":"кратко"}.',
].join(' ');

function buildLLMRequest(ctx) {
  return { system: LLM_SYSTEM_PROMPT, user: JSON.stringify(ctx, null, 2) };
}

if (typeof module !== 'undefined') module.exports = { LLM_PROVIDERS, buildLLMRequest };
