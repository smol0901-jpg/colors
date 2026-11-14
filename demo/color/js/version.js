/** Версия и стадия продукта — показываются в названии страницы, шапке и подвале. */
const APP = {
  name: 'Коррекция цвета',
  stage: 'DEMO',
  version: '0.4.0',
  build: '2026-11-13',
};
APP.label = `${APP.stage} v${APP.version}`;
APP.title = `${APP.name} · ${APP.label}`;
if (typeof module !== 'undefined') module.exports = { APP };
