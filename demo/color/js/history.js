/**
 * Simple localStorage history of measurements.
 */

const HISTORY_KEY = 'primatek_lab_history';
const MAX_HISTORY = 30;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(std, sam, deltas, meta) {
  const list = loadHistory();
  list.unshift({
    ts: Date.now(),
    std: { ...std },
    sam: { ...sam },
    dL: deltas.dL,
    dA: deltas.dA,
    dB: deltas.dB,
    dE: deltas.dE,
    dE00: deltas.dE00,
    meta: meta || null,
  });
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  return list;
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

function formatHistoryTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
