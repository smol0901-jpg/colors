/**
 * Демо-модуль «Состав и нагрев» (опциональный).
 * Учебная модель: показывает принцип, как нейросеть сравнивает рецептуры и считает результат
 * при смещении ингредиентов и нагреве. Коэффициенты условные. В рабочей версии прогноз строится
 * по данным рецептур, режимов и результатов конкретного предприятия.
 */
export const BASE = { resin: 58, hard: 5.2, fill: 17, pig: 18, add: 1.8 };
export const NAMES = { resin: 'Смола', hard: 'Отвердитель', fill: 'Наполнитель', pig: 'Пигмент', add: 'Добавки' };
export const BASE_PROC = { T: 190, t: 10 };

export function predict(c, T, t) {
  const sum = Object.values(c).reduce((a, b) => a + b, 0) || 1;
  const f = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (v / sum) * 100]));
  const ideal = BASE.resin / BASE.hard;
  const ratio = f.resin / Math.max(0.01, f.hard);
  const stoich = Math.max(0, 1 - Math.abs(ratio / ideal - 1) * 1.5);
  const k = 0.45 * Math.exp(-9600 * (1 / (T + 273.15) - 1 / 463.15));
  const aInf = 0.55 + 0.45 * stoich;
  const alpha = aInf * (1 - Math.exp(-k * t));
  const D = t * Math.exp((T - 190) / 10);
  const risk = 1 / (1 + Math.exp(-(D - 45) / 12));
  let dL = 0.55 * (f.pig - 18) - 0.12 * (f.fill - 17) - Math.max(0, D - 30) * 0.02;
  const db = 0.03 * (f.fill - 17) + Math.max(0, D - 20) * 0.045;
  const da = 0.01 * (f.add - 1.8);
  const dE = Math.sqrt(dL * dL + da * da + db * db);
  let gloss = 86 - 0.9 * (f.fill - 17) - 0.5 * (f.pig - 18) - Math.max(0, 0.97 - alpha) * 30 - Math.max(0, D - 30) * 0.1;
  gloss = Math.max(5, Math.min(98, gloss));
  const resist = Math.round(alpha * 100 * (0.7 + 0.3 * stoich));
  const status = risk > 0.5 ? 'burn' : alpha < 0.9 ? 'under' : risk > 0.25 ? 'edge' : 'ok';
  return { f, ratio, ideal, stoich, alpha, risk, D, dL, da, db, dE, gloss, resist, status };
}

export function advice(c, T, t) {
  const p = predict(c, T, t), out = [];
  const sum = Object.values(c).reduce((a, b) => a + b, 0) || 1;
  if (Math.abs(p.ratio / p.ideal - 1) > 0.06) {
    const need = (p.f.resin / p.ideal) * (sum / 100);
    out.push(`Соотношение смола : отвердитель отклонилось от расчётного. Ориентир по отвердителю: около ${need.toFixed(1).replace('.', ',')} % (сейчас ${c.hard.toFixed(1).replace('.', ',')} %).`);
  }
  if (p.status === 'burn') out.push('Высокий риск пригорания: снизить температуру или время отверждения, проверить скорость конвейера.');
  else if (p.status === 'edge') out.push('Режим на грани: запас до пригорания небольшой, следить за температурой печи.');
  if (p.status === 'under') out.push('Недоотверждение: поднять температуру или увеличить время в печи, проверить отвердитель.');
  if (p.dE > 1) out.push(`Цвет уйдёт на ΔE ${p.dE.toFixed(1).replace('.', ',')}: вернуть долю пигмента и наполнителя ближе к эталону или подготовить корректировку.`);
  if (!out.length) out.push('Рецептура и режим в рабочем окне: заметных рисков не видно.');
  return out;
}

/** Карта режимов: температура x время */
export function window_(c) {
  const Ts = [], ts = [];
  for (let T = 160; T <= 230; T += 5) Ts.push(T);
  for (let t = 5; t <= 25; t += 2.5) ts.push(t);
  return { Ts, ts, cells: ts.map((t) => Ts.map((T) => predict(c, T, t).status)) };
}
