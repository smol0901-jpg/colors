/**
 * NAP Paint — оборудование в разрезе: порошковая и жидкая линии с датчиками на рабочих местах.
 * Датчики на схеме «живые»: цвет и значение берутся из имитатора, клик открывает график.
 * Устройство и ориентиры по параметрам — типовые для отрасли; в рабочей системе схема рисуется под ваше оборудование.
 */
import { fmt } from './core.js';

const W = 1400, H = 560;

/* ---------- общие элементы чертежа ---------- */
const DEFS = `<defs>
  <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#e3e9ed"/><line x1="0" y1="0" x2="0" y2="7" stroke="#71828f" stroke-width="1.3"/></pattern>
  <pattern id="flights" width="26" height="24" patternUnits="userSpaceOnUse"><rect width="26" height="24" fill="#c3ccd3"/><path d="M0 24L13 0M13 24L26 0" stroke="#5d6e7b" stroke-width="3.2" fill="none"/><animateTransform attributeName="patternTransform" type="translate" from="0 0" to="26 0" dur="1.3s" repeatCount="indefinite"/></pattern>
  <pattern id="flights2" width="26" height="24" patternUnits="userSpaceOnUse"><rect width="26" height="24" fill="#c3ccd3"/><path d="M0 0L13 24M13 0L26 24" stroke="#5d6e7b" stroke-width="3.2" fill="none"/><animateTransform attributeName="patternTransform" type="translate" from="0 0" to="26 0" dur="1.3s" repeatCount="indefinite"/></pattern>
  <pattern id="beads" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#cfe0f2" opacity=".0"/><circle cx="4" cy="4" r="3.1" fill="#f4f7fa" stroke="#8aa0b3" stroke-width=".8"/><circle cx="11" cy="10" r="3.1" fill="#eef3f8" stroke="#8aa0b3" stroke-width=".8"/></pattern>
  <pattern id="bags" width="26" height="40" patternUnits="userSpaceOnUse"><rect width="26" height="40" fill="none"/><rect x="5" y="2" width="16" height="36" rx="6" fill="#f3f0e6" stroke="#8a8f77" stroke-width="1.2"/></pattern>
  <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f9fb"/><stop offset=".55" stop-color="#cdd7de"/><stop offset="1" stop-color="#9eafba"/></linearGradient>
  <linearGradient id="steelV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#aebcc6"/><stop offset=".45" stop-color="#f4f8fa"/><stop offset="1" stop-color="#9aabb6"/></linearGradient>
  <linearGradient id="melt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3ecd6"/><stop offset=".35" stop-color="#e8cf95"/><stop offset="1" stop-color="#d9893a"/></linearGradient>
  <linearGradient id="hot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb26b"/><stop offset="1" stop-color="#e8590c"/></linearGradient>
  <linearGradient id="cold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8cc4f5"/><stop offset="1" stop-color="#1c7ed6"/></linearGradient>
  <linearGradient id="pigm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e7d5b"/><stop offset="1" stop-color="#1f9d5c"/></linearGradient>
  <linearGradient id="paint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f8f64"/><stop offset="1" stop-color="#1d6b49"/></linearGradient>
  <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dff0fa" stop-opacity=".9"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#cfe6f4" stop-opacity=".9"/></linearGradient>
  <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0c5c38"/></marker>
  <filter id="sh" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#10211799"/></filter>
</defs>
<style>
  .eqsvg text{font-family:Manrope,system-ui,sans-serif}
  .cap{font-size:15px;font-weight:800;fill:#14352a}
  .sub{font-size:12px;fill:#4a5f55}
  .wall{fill:url(#hatch);stroke:#52626e;stroke-width:1.4}
  .mach{fill:url(#steel);stroke:#52626e;stroke-width:1.4}
  .pipe{fill:none;stroke:#7d8e9a;stroke-width:9;stroke-linecap:round}
  .pipeW{fill:none;stroke:#1c7ed6;stroke-width:6;stroke-linecap:round;opacity:.85}
  .pipeP{fill:none;stroke:#1d6b49;stroke-width:6;stroke-linecap:round}
  .flow{fill:none;stroke:#0c5c38;stroke-width:3;stroke-dasharray:3 11;stroke-linecap:round;animation:eqfl 1.1s linear infinite}
  .flowW{stroke:#fff;stroke-width:2.4;stroke-dasharray:2 12;animation:eqfl .9s linear infinite;fill:none;stroke-linecap:round}
  .air{fill:none;stroke:#5f93c0;stroke-width:2.4;stroke-dasharray:10 9;animation:eqfl 1s linear infinite;marker-end:url(#arr)}
  @keyframes eqfl{to{stroke-dashoffset:-28}}
  .spin{transform-box:fill-box;transform-origin:center;animation:eqsp 1.4s linear infinite}
  .spinS{animation-duration:3s}
  @keyframes eqsp{to{transform:rotate(360deg)}}
  .blade{transform-box:fill-box;transform-origin:center;animation:eqbl 1.2s ease-in-out infinite alternate}
  @keyframes eqbl{from{transform:scaleX(1)}to{transform:scaleX(.18)}}
  .vib{animation:eqvb .12s linear infinite alternate}
  @keyframes eqvb{from{transform:translateX(-1px)}to{transform:translateX(1px)}}
  .belt{fill:none;stroke:#3b4650;stroke-width:5;stroke-dasharray:14 8;animation:eqfl 1.6s linear infinite}
  .hs{cursor:pointer}
  .hs .ring{fill:none;stroke-width:2;opacity:0}
  .hs .dot{stroke:#fff;stroke-width:2.2}
  .hs .lead{stroke:#34483e;stroke-width:1.2}
  .hs .tg{fill:#fff;stroke:#34483e;stroke-width:1.2}
  .hs .t1{font-size:11.5px;font-weight:700;fill:#27403a}
  .hs .t2{font-size:14px;font-weight:800;fill:#102117}
  .hs.ok .dot{fill:#1f9d5c}.hs.ok .ring{stroke:#1f9d5c}
  .hs.watch .dot{fill:#e29a12}.hs.watch .ring{stroke:#e29a12;opacity:.9}
  .hs.watch .tg{stroke:#e29a12;stroke-width:2}
  .hs.act .dot{fill:#c9342b}.hs.act .ring{stroke:#c9342b;opacity:1;animation:eqpl 1s ease-out infinite}
  .hs.act .tg{stroke:#c9342b;stroke-width:2.4;fill:#fff1ef}
  @keyframes eqpl{from{r:8;opacity:1}to{r:22;opacity:0}}
  .hs:hover .tg{fill:#eaf6ef}
</style>`;

const arrow = (d, cls = 'flow') => `<path class="${cls}" d="${d}"/>`;
const hatchR = (x, y, w, h, extra = '') => `<rect class="wall" x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
const text = (x, y, t, cls = 'sub', anchor = 'start') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
const motor = (x, y, w = 70, h = 46, label = 'M') => `<g filter="url(#sh)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#1d6b49" stroke="#0c3a26" stroke-width="1.4"/>${Array.from({ length: 5 }, (_, i) => `<line x1="${x + 10 + i * ((w - 20) / 4)}" y1="${y + 5}" x2="${x + 10 + i * ((w - 20) / 4)}" y2="${y + h - 5}" stroke="#0c3a26" stroke-width="1.3" opacity=".5"/>`).join('')}<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="#e8fff2">${label}</text></g>`;
const gear = (cx, cy, r) => `<g class="spin spinS"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#cbd5db" stroke="#52626e" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="#8fa0ac"/>${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.283; return `<rect x="${cx - 3}" y="${cy - r - 4}" width="6" height="8" fill="#52626e" transform="rotate(${(a * 180) / Math.PI} ${cx} ${cy})"/>`; }).join('')}</g>`;
const powderDots = (x, y, w, h, n, seed = 1, col = '#e0b24a') => {
  let s = seed, out = '';
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) out += `<circle cx="${(x + r() * w).toFixed(1)}" cy="${(y + r() * h).toFixed(1)}" r="${(1.3 + r() * 1.5).toFixed(1)}" fill="${col}" opacity="${(0.55 + r() * 0.4).toFixed(2)}"/>`;
  return out;
};

/* ---------- сцена П1: предсмесь и экструдер ---------- */
function sceneP1(z) {
  const bx = 330, bw = 640, by = 372, bh = 76;
  const zw = bw / z;
  let zones = '', hs = [];
  for (let i = 0; i < z; i++) {
    const x = bx + i * zw;
    zones += `<rect x="${x + 2}" y="${by - 16}" width="${zw - 4}" height="12" rx="3" fill="url(#hot)" stroke="#a63d05" stroke-width="1"/>
      <rect x="${x + 2}" y="${by + bh + 4}" width="${zw - 4}" height="9" rx="3" fill="url(#cold)" stroke="#155f9e" stroke-width="1"/>
      ${i ? `<line x1="${x}" y1="${by - 20}" x2="${x}" y2="${by + bh + 16}" stroke="#52626e" stroke-dasharray="3 3"/>` : ''}
      ${text(x + zw / 2, by - 24, 'Z' + (i + 1), 'sub', 'middle')}`;
    const tw = Math.min(zw - 6, 118);
    hs.push([`ext${i + 1}`, x + zw / 2, by + bh + 13, -tw / 2, 40, 'Зона ' + (i + 1), tw]);
  }
  const svg = `
    ${text(80, 128, 'Предсмесь', 'cap')}${text(80, 144, 'в разрезе', 'sub')}
    <!-- смеситель -->
    ${hatchR(62, 100, 12, 232)}${hatchR(236, 100, 12, 232)}${hatchR(62, 322, 186, 12)}
    <rect x="74" y="168" width="162" height="154" fill="#f6e7b8"/>${powderDots(78, 172, 154, 146, 70, 5, '#d9a63a')}${powderDots(78, 172, 154, 146, 26, 9, '#2f8f64')}
    <path d="M74 168 Q155 150 236 168" fill="#f6e7b8" stroke="#c99a2e" stroke-width="1"/>
    <rect x="152" y="70" width="6" height="236" fill="#6d7e8a"/>
    <rect class="blade" x="98" y="238" width="114" height="9" rx="3" fill="#53636e"/><rect class="blade" x="98" y="292" width="114" height="9" rx="3" fill="#53636e" style="animation-delay:-.6s"/>
    <rect x="132" y="56" width="46" height="18" fill="#9fb0bb" stroke="#52626e"/>${motor(110, 12, 90, 44, 'M')}
    <path d="M248 300 C300 300 292 250 352 252" class="pipe"/><circle cx="294" cy="282" r="12" fill="none" stroke="#e8590c" stroke-width="3"/>${text(256, 244, 'металлодетектор', 'sub')}
    ${arrow('M250 300 C300 300 292 250 350 252')}
    <!-- питатель -->
    <path d="M345 252 L428 252 L408 330 L365 330 Z" class="wall"/><path d="M356 262 L418 262 L402 322 L371 322 Z" fill="#f6e7b8"/>
    <rect x="368" y="330" width="36" height="${by - 330}" class="wall"/>
    ${text(432, 276, 'питатель', 'sub')}
    <!-- редуктор и привод -->
    <rect x="184" y="352" width="132" height="110" rx="8" class="wall"/><rect x="198" y="366" width="104" height="82" rx="6" fill="#f2f6f8" stroke="#52626e"/>
    ${gear(230, 407, 22)}${gear(272, 407, 17)}
    ${motor(96, 384, 88, 52, 'M')}
    ${text(118, 470, 'Привод и редуктор', 'sub')}
    <!-- цилиндр -->
    <rect x="${bx}" y="${by - 8}" width="${bw}" height="8" class="wall"/><rect x="${bx}" y="${by + bh}" width="${bw}" height="8" class="wall"/>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#melt)"/>
    <rect x="${bx}" y="${by + 6}" width="${bw}" height="26" fill="url(#flights)" opacity=".92"/>
    <rect x="${bx}" y="${by + 40}" width="${bw}" height="26" fill="url(#flights2)" opacity=".92"/>
    <rect x="${bx + bw * 0.36}" y="${by + 6}" width="${bw * 0.14}" height="60" rx="3" fill="#3b4c58" opacity=".85"/>${text(bx + bw * 0.43, by + 38, 'месильный', 'sub', 'middle').replace('class="sub"', 'class="sub" fill="#fff" style="fill:#fff"')}
    ${zones}
    ${text(462, 296, 'Двухшнековый экструдер: 2 вала-шнека, зон цилиндра ' + z, 'cap')}${text(462, 312, 'нагрев сверху, охлаждение снизу', 'sub')}
    <!-- головка -->
    <path d="M${bx + bw} ${by - 8} h54 l16 30 v26 l-16 28 h-54 z" class="wall"/><rect x="${bx + bw}" y="${by + 14}" width="62" height="48" fill="#e29a3c"/>
    <path d="M${bx + bw + 62} ${by + 38} q60 4 70 60" fill="none" stroke="#d9893a" stroke-width="12" stroke-linecap="round"/>
    ${text(bx + bw - 4, by + bh + 22, 'головка', 'sub')}
    <!-- вода -->
    <rect x="1090" y="292" width="140" height="84" rx="8" class="wall"/><rect x="1102" y="304" width="116" height="60" fill="url(#cold)" opacity=".75"/>${text(1160, 344, 'Чиллер', 'cap', 'middle').replace('class="cap"', 'class="cap" style="fill:#fff"')}
    <path class="pipeW" d="M1090 336 H448 V${by - 20}"/><path class="flowW" d="M1090 336 H448 V${by - 20}"/>
    ${text(780, 326, 'охлаждающая вода к зонам цилиндра', 'sub', 'middle')}
        ${text(60, 548, 'Расплав из головки уходит на охлаждающий валок (следующий этап). Нажмите на любой датчик, чтобы открыть график.', 'sub')}`;
  hs = hs.concat([
    ['mix', 200, 34, 18, -14, 'Смеситель'], ['mixT', 242, 196, 16, -10, 'Темп. смеси'],
    ['feed', 386, 262, 16, -76, 'Подача'], ['vibExt', 250, 358, -20, -46, 'Вибрация'],
    ['srew', 140, 438, -24, 44, 'Обороты шнеков'], ['extl', 184, 406, -112, -54, 'Момент'],
    ['extp', bx + bw + 34, by + 10, -52, -92, 'Давление'], ['melt', bx + bw + 62, by + 40, 30, 8, 'Расплав'],
    ['cwat', 1160, 292, -30, -52, 'Вода'],
  ]);
  return { svg, hs };
}

/* ---------- сцена П2: охлаждение, чипсы, помол ACM ---------- */
function sceneP2() {
  const svg = `
    ${text(40, 36, 'Охлаждение и чипсы', 'cap')}${text(40, 52, 'расплав → лента 1–2 мм → дробление в чипсы 5–10 мм', 'sub')}
    <path d="M118 40 q-4 60 -8 130" fill="none" stroke="#d9893a" stroke-width="14" stroke-linecap="round"/>
    <!-- валки -->
    <g><circle cx="86" cy="206" r="40" fill="url(#steelV)" stroke="#52626e" stroke-width="1.6"/><circle cx="86" cy="206" r="28" fill="url(#cold)" opacity=".8"/><circle cx="86" cy="206" r="9" fill="#52626e"/>
    <circle cx="148" cy="206" r="40" fill="url(#steelV)" stroke="#52626e" stroke-width="1.6"/><circle cx="148" cy="206" r="28" fill="url(#cold)" opacity=".8"/><circle cx="148" cy="206" r="9" fill="#52626e"/></g>
    <path d="M117 246 L150 262 L240 304" fill="none" stroke="#e8a64e" stroke-width="6"/>
    ${text(30, 268, 'охлаждающие валки', 'sub')}
    <!-- лента -->
    <rect x="228" y="318" width="360" height="12" rx="6" class="wall"/><circle cx="228" cy="324" r="22" class="wall"/><circle cx="588" cy="324" r="22" class="wall"/>
    <path class="belt" d="M228 302 H588 M228 346 H588"/>
    <path d="M228 310 H570" stroke="#c6d6e6" stroke-width="9" opacity=".9"/><path d="M236 303 H574" stroke="#8cc4f5" stroke-width="3" stroke-dasharray="14 10"/>
    <rect x="230" y="288" width="344" height="8" rx="3" fill="#f0c98a"/>
    <path d="M280 360 v22 M360 360 v22 M440 360 v22 M520 360 v22" stroke="#5f93c0" stroke-width="2.4" marker-end="url(#arr)"/>${text(400, 402, 'обдув / вода под лентой', 'sub', 'middle')}
    <!-- дробилка -->
    <path d="M620 270 L714 270 L690 330 L644 330 Z" class="wall"/>
    <g class="spin"><circle cx="656" cy="312" r="15" fill="#6d7e8a"/>${Array.from({ length: 6 }, (_, i) => `<rect x="653" y="294" width="6" height="9" fill="#2f3b44" transform="rotate(${i * 60} 656 312)"/>`).join('')}</g>
    <g class="spin" style="animation-direction:reverse"><circle cx="684" cy="312" r="15" fill="#6d7e8a"/>${Array.from({ length: 6 }, (_, i) => `<rect x="681" y="294" width="6" height="9" fill="#2f3b44" transform="rotate(${i * 60} 684 312)"/>`).join('')}</g>
    ${text(602, 262, 'Дробилка', 'sub')}
    <path d="M656 336 v36" stroke="#d9a63a" stroke-width="6" stroke-dasharray="3 7" class="flow" style="stroke:#d9a63a"/>
    ${powderDots(640, 372, 56, 22, 18, 3, '#d9a63a')}
    ${text(618, 420, 'чипсы 5–10 мм', 'sub')}
    <!-- ACM -->
    ${text(760, 36, 'Помол ACM и классификация', 'cap')}${text(760, 52, 'мельница с классификатором, циклон, рукавный фильтр', 'sub')}
    <path d="M730 396 H800 V344" class="pipe" style="stroke-width:7"/><path d="M730 396 H800 V344" class="flow"/>
    ${hatchR(780, 200, 12, 160)}${hatchR(912, 200, 12, 160)}${hatchR(780, 350, 144, 12)}
    <rect x="792" y="212" width="120" height="138" fill="#fbf3dc"/>
    <g><circle cx="852" cy="300" r="46" fill="#d5dde3" stroke="#52626e" stroke-width="1.5" class="spin"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${852 + 38 * Math.cos((i / 12) * 6.283)}" cy="${300 + 38 * Math.sin((i / 12) * 6.283)}" r="3.5" fill="#37444e" class="spin" style="transform-origin:852px 300px"/>`).join('')}</g>
    <circle cx="852" cy="300" r="8" fill="#52626e"/>${powderDots(796, 216, 112, 126, 50, 7, '#c9b27a')}
    <g class="vib"><rect x="800" y="232" width="104" height="20" rx="5" fill="#a6b6c1" stroke="#52626e"/>${Array.from({ length: 9 }, (_, i) => `<line x1="${808 + i * 11.5}" y1="234" x2="${808 + i * 11.5}" y2="250" stroke="#52626e" stroke-width="1.5"/>`).join('')}</g>
    ${text(800, 268, 'классификатор', 'sub')}
    ${motor(824, 150, 56, 38, 'M')}<rect x="846" y="188" width="10" height="26" fill="#6d7e8a"/>
    <path d="M924 240 H1010 V170" class="air"/>
    ${text(926, 262, 'воздух с пылью', 'sub')}
    <!-- циклон -->
    <path d="M980 170 h60 v70 l-30 70 l-30 -70 z" class="mach"/><path d="M1010 310 v28" stroke="#3b4650" stroke-width="7"/><rect x="996" y="338" width="28" height="18" rx="4" fill="#6d7e8a"/>${text(982, 160, 'Циклон', 'sub')}
    <path d="M1040 190 H1130 V130" class="air"/>
    <!-- рукавный фильтр -->
    <rect x="1100" y="60" width="200" height="150" rx="8" class="wall"/><rect x="1112" y="72" width="176" height="126" fill="#f6f9fb"/>
    <rect x="1118" y="84" width="164" height="104" fill="url(#bags)"/>
    ${text(1112, 54, 'Рукавный фильтр', 'sub')}
    <rect x="1100" y="210" width="200" height="36" class="mach"/>
    <path d="M1300 100 H1350 V30 H1290" class="air"/><circle cx="1350" cy="64" r="20" fill="#d5dde3" stroke="#52626e" stroke-width="1.5"/><g class="spin" ><path d="M1350 50 v28 M1336 64 h28" stroke="#37444e" stroke-width="4"/></g>${text(1312, 112, 'вентилятор', 'sub')}
    <!-- сито и фасовка -->
    <path d="M1010 356 V400" class="pipe" style="stroke-width:7"/>
    <g class="vib"><rect x="962" y="400" width="108" height="26" rx="6" class="wall"/><path d="M968 413 h96" stroke="#4a5b67" stroke-dasharray="2 3" stroke-width="2"/></g>${text(976, 444, 'Сито 125 мкм', 'sub')}
    <path d="M1016 428 V470" class="pipe" style="stroke-width:7"/><path d="M1016 428 V470" class="flow"/>
    <rect x="1110" y="430" width="170" height="14" rx="3" fill="#6d7e8a"/><rect x="1130" y="444" width="130" height="68" fill="#f3f0e6" stroke="#8a8f77" stroke-width="1.5" rx="6"/><text x="1195" y="486" text-anchor="middle" font-size="20" font-weight="800" fill="#2f3b44">20 кг</text>
    <path d="M1016 470 H1195 V446" class="pipe" style="stroke-width:6"/><path d="M1016 470 H1195 V446" class="flow"/>${text(1110, 526, 'весы и упаковка', 'sub')}
    ${text(40, 526, 'Чипсы с ленты идут в дробилку, далее в мельницу ACM. Рекуперация порошка в рукавном фильтре ≥ 98 %.', 'sub')}`;
  const hs = [
    ['chill', 86, 168, 52, -86, 'Валок'], ['chipSz', 396, 292, -50, -48, 'Толщина ленты'], ['chipT', 590, 280, -30, -130, 'Чипсы'],
    ['mill', 912, 330, 28, 18, 'Темп. мельницы'], ['cls', 880, 168, 28, -52, 'Классификатор'], ['d50', 1016, 450, -180, 14, 'D50'],
    ['vibMill', 790, 230, -160, -22, 'Вибрация'], ['brgT', 852, 372, -130, 50, 'Подшипник'],
    ['filt', 1200, 210, -54, 44, 'Фильтр ΔP'], ['asp', 1130, 100, -130, -42, 'Аспирация'],
    ['resid', 1066, 413, 70, -52, 'Остаток на сите'], ['bag', 1260, 480, 24, -6, 'Мешок'],
  ];
  return { svg, hs };
}

export const _h = { DEFS, W, H, arrow, hatchR, text, motor, gear, powderDots };
export { sceneP1, sceneP2 };

/* ---------- сцена П3: нанесение и печь ---------- */
function sceneP3() {
  const cloud = (x, y, dir) => powderDots(dir > 0 ? x : x - 90, y - 34, 90, 68, 46, dir > 0 ? 11 : 12, '#2f8f64');
  const part = (x, y, ph = 0, h = 150) => `<g class="vib" style="animation:none"><rect x="${x - 2}" y="${y - 42}" width="4" height="42" fill="#59686f"/><rect x="${x - 11}" y="${y}" width="22" height="${h}" rx="3" fill="${ph ? '#2f8f64' : '#9fb0bb'}" stroke="#2d6a4c" stroke-width="1.2"/></g>`;
  const svg = `
    ${text(50, 36, 'Камера нанесения', 'cap')}${text(50, 52, 'электростатические пистолеты, рекуперация порошка', 'sub')}
    <!-- конвейер -->
    <path d="M30 96 H1370" stroke="#3b4650" stroke-width="5" class="belt" style="stroke-dasharray:16 9"/><path d="M30 96 H1370" stroke="#8fa0ac" stroke-width="2" fill="none"/>
    <!-- камера -->
    ${hatchR(70, 112, 470, 12)}${hatchR(70, 372, 470, 12)}${hatchR(70, 112, 12, 90)}${hatchR(70, 300, 12, 84)}${hatchR(528, 112, 12, 90)}${hatchR(528, 300, 12, 84)}
    <rect x="82" y="124" width="446" height="248" fill="#f6faf7" opacity=".7"/>
    ${part(200, 100, 0, 200)}${part(310, 100, 1, 200)}${part(420, 100, 1, 200)}
    <!-- пистолеты -->
    <g filter="url(#sh)"><rect x="100" y="222" width="62" height="22" rx="8" fill="#3b4c58"/><rect x="156" y="228" width="26" height="10" rx="3" fill="#6d7e8a"/><circle cx="186" cy="233" r="4" fill="#f2b705"/></g>${cloud(190, 233, 1)}
    <g filter="url(#sh)"><rect x="448" y="222" width="62" height="22" rx="8" fill="#3b4c58"/><rect x="428" y="228" width="26" height="10" rx="3" fill="#6d7e8a"/><circle cx="424" cy="233" r="4" fill="#f2b705"/></g>${cloud(424, 233, -1)}
    ${text(100, 268, 'пистолет', 'sub')}
    <path d="M110 244 v20 M110 264 H74" stroke="#1d6b49" stroke-width="3" fill="none"/><path d="M114 222 V150 H70" stroke="#6d7e8a" stroke-width="5" fill="none"/>
    <!-- рекуперация -->
    <path d="M170 384 L440 384 L350 440 L260 440 Z" class="wall"/><path d="M305 440 v26 H470 v-30" class="pipe" style="stroke-width:6"/>
    <path d="M470 436 h56 v40 h-56 z" class="mach"/>${text(448, 494, 'рекуперация порошка', 'sub')}
    ${text(380, 100, '', 'sub')}
    <!-- толщиномер -->
    <rect x="552" y="236" width="6" height="140" fill="#6d7e8a"/><rect x="558" y="236" width="34" height="16" rx="4" fill="#3b4c58"/><circle cx="598" cy="244" r="5" fill="#f2b705"/>${text(530, 392, 'толщиномер плёнки', 'sub')}
    <!-- печь -->
    ${text(640, 36, 'Печь полимеризации', 'cap')}${text(640, 52, 'туннель с рециркуляцией воздуха: до 175–205 °C', 'sub')}
    ${hatchR(620, 112, 640, 14)}${hatchR(620, 360, 640, 14)}${hatchR(620, 112, 12, 90)}${hatchR(620, 290, 12, 84)}${hatchR(1248, 112, 12, 90)}${hatchR(1248, 290, 12, 84)}
    <rect x="632" y="126" width="616" height="234" fill="#ffe9d1" opacity=".75"/>
    <path d="M650 150 q22 -20 44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0" fill="none" stroke="#e8590c" stroke-width="3.2"/>
    <path d="M650 336 q22 20 44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0" fill="none" stroke="#e8590c" stroke-width="3.2"/>
    <path d="M700 200 H1200" class="air" style="stroke:#e8590c"/><path d="M1200 280 H700" class="air" style="stroke:#e8590c"/>
    ${part(720, 100, 1, 160)}${part(860, 100, 1, 160)}${part(1000, 100, 1, 160)}${part(1140, 100, 1, 160)}
    <rect x="1020" y="390" width="150" height="62" rx="8" class="wall"/><path d="M1066 440 q9 -30 -4 -42 q22 6 20 24 q10 -14 6 -26 q22 22 4 44 z" fill="#f2711c"/>${text(1032, 470, 'горелка / ТЭНы', 'sub')}
    <path d="M1095 390 V374" class="pipe" style="stroke-width:7"/>
    <rect x="1190" y="90" width="38" height="24" rx="3" class="mach"/>${text(1168, 80, 'вытяжка', 'sub')}
    <g filter="url(#sh)"><rect x="820" y="372" width="90" height="34" rx="6" fill="#2f3b44"/><text x="865" y="394" font-size="12" font-weight="800" text-anchor="middle" fill="#cfe9dc">лог PMT</text></g>
    <!-- привод конвейера -->
    ${motor(1290, 128, 72, 40, 'M')}<circle cx="1326" cy="96" r="18" class="mach"/>
    <!-- контроль цвета -->
    <g filter="url(#sh)"><rect x="1284" y="270" width="86" height="34" rx="6" fill="#2f3b44"/><path d="M1327 304 l-16 30 h32 z" fill="#f4f7f9" stroke="#52626e"/><circle cx="1327" cy="340" r="5" fill="#2f8f64"/></g>
    ${text(1262, 262, 'спектрофотометр', 'sub')}
    ${text(50, 526, 'Деталь на подвеске проходит камеру нанесения, печь и пост контроля цвета и блеска. Температуру металла (PMT) измеряет логгер на изделии.', 'sub')}`;
  const hs = [
    ['boothH', 76, 160, -4, 150, 'Влажность'], ['boothT', 76, 330, -2, 62, 'Темп. камеры'],
    ['volt', 150, 224, -20, -88, 'Напряжение'], ['pflow', 480, 224, -30, -92, 'Расход'],
    ['film', 578, 248, -20, 40, 'Толщина'],
    ['oven', 900, 218, -50, -100, 'Печь'], ['pmt', 866, 372, -50, 60, 'PMT'],
    ['belt', 1326, 118, -58, -46, 'Скорость'], ['dwell', 1180, 150, -92, 52, 'Время в печи'],
    ['dE', 1327, 334, -112, 66, 'ΔE'], ['gloss', 1370, 288, -104, -96, 'Блеск'],
  ];
  return { svg, hs };
}

/* ---------- сцена Ж1: диссольвер ---------- */
function sceneL1() {
  const svg = `
    ${text(60, 36, 'Диссольвер', 'cap')}${text(60, 52, 'смачивание и диспергирование пигментов и наполнителей', 'sub')}
    <!-- ёмкость -->
    ${hatchR(360, 130, 14, 320)}${hatchR(690, 130, 14, 320)}${hatchR(360, 438, 344, 14)}
    <rect x="374" y="150" width="14" height="290" fill="url(#cold)" opacity=".65"/><rect x="676" y="150" width="14" height="290" fill="url(#cold)" opacity=".65"/>${text(402, 468, 'рубашка охлаждения', 'sub')}
    <path d="M388 250 C440 250 450 322 532 322 C614 322 624 250 676 250 V438 H388 Z" fill="url(#paint)"/>
    <path d="M388 250 C440 250 450 322 532 322 C614 322 624 250 676 250" fill="none" stroke="#9fe3bf" stroke-width="2.4"/>
    ${powderDots(392, 340, 280, 94, 40, 4, '#bfeed5')}
    <!-- вал и диск -->
    <rect x="528" y="76" width="8" height="300" fill="#6d7e8a"/><rect x="530" y="76" width="3" height="300" fill="#c9d4dc"/>
    <g class="blade"><rect x="466" y="372" width="132" height="8" rx="2" fill="#37444e"/>${Array.from({ length: 11 }, (_, i) => `<path d="M${470 + i * 12} 372 l4 -8 l4 8 z M${474 + i * 12} 380 l4 8 l4 -8 z" fill="#37444e"/>`).join('')}</g>
    ${text(604, 396, 'диск диссольвера', 'sub').replace('class="sub"', 'class="sub" style="fill:#fff"')}
    <rect x="490" y="52" width="82" height="28" fill="#9fb0bb" stroke="#52626e"/>${motor(472, 6, 118, 46, 'M')}
    <!-- зонд -->
    <rect x="652" y="82" width="7" height="236" fill="#6d7e8a"/><circle cx="655" cy="324" r="6" fill="#e8590c"/>${text(600, 72, 'термозонд', 'sub')}
    <!-- бункер порошков -->
    <path d="M130 70 L270 70 L240 150 L160 150 Z" class="wall"/><path d="M142 80 L258 80 L234 142 L166 142 Z" fill="#f4efe0"/>${powderDots(150, 84, 100, 54, 34, 8, '#b9a97a')}
    <rect x="190" y="150" width="20" height="26" class="wall"/><path d="M200 176 V204 H368 V240" class="pipe" style="stroke-width:7"/><path d="M200 176 V204 H368 V240" class="flow"/>
    ${text(100, 176, 'Порошки: TiO₂, наполнитель, пигмент', 'sub')}
    <!-- сырьё -->
    <rect x="70" y="300" width="150" height="130" rx="10" class="wall"/><rect x="82" y="330" width="126" height="88" fill="#cfe4f4"/>${text(145, 322, 'Связующее, вода', 'sub', 'middle')}
    <path d="M220 400 H300 V270 H366" class="pipeP" style="stroke:#3b7fb5"/><path class="flowW" d="M220 400 H300 V270 H366"/>
    <!-- выход -->
    <path d="M532 452 V500 H760" class="pipe"/><path d="M532 452 V500 H760" class="flow"/>
    <g class="spin"><circle cx="640" cy="500" r="20" fill="#cbd5db" stroke="#52626e" stroke-width="1.6"/><path d="M640 482 v36 M622 500 h36" stroke="#52626e" stroke-width="3"/></g>${text(606, 538, 'насос', 'sub')}
    <path d="M760 500 H1000" class="pipe"/><path d="M760 500 H1000" class="flow"/><path d="M1000 500 h40" stroke="#0c5c38" stroke-width="4" marker-end="url(#arr)"/>${text(1000, 520, 'в бисерную мельницу', 'sub')}
    <rect x="800" y="478" width="82" height="44" rx="7" fill="#2f3b44"/><circle cx="822" cy="500" r="10" fill="#f2f6f8"/><path d="M822 500 l7 -6" stroke="#c9342b" stroke-width="2"/>${text(830, 470, 'вискозиметр', 'sub')}
    ${text(780, 120, 'Скорость диска 18–26 м/с. Время диспергирования 15–20 мин,', 'sub')}${text(780, 138, 'затем контроль тонкости помола.', 'sub')}
    ${text(780, 170, 'Вязкость растёт при добавлении порошков:', 'sub')}${text(780, 188, 'обороты и мощность подбираются под неё.', 'sub')}`;
  const hs = [
    ['dtip', 532, 100, -170, -48, 'Скорость диска'], ['dkw', 590, 28, 24, -4, 'Мощность'],
    ['dT', 655, 200, 30, -10, 'Температура базы'], ['visc', 841, 500, -50, -100, 'Вязкость'],
  ];
  return { svg, hs };
}

/* ---------- сцена Ж2: бисерная мельница ---------- */
function sceneL2() {
  const svg = `
    ${text(60, 36, 'Бисерная мельница', 'cap')}${text(60, 52, 'тонкий помол: бисер 0,3–0,8 мм, циркуляция или несколько проходов', 'sub')}
    <!-- камера -->
    ${hatchR(480, 200, 400, 12)}${hatchR(480, 336, 400, 12)}${hatchR(480, 200, 12, 148)}${hatchR(868, 200, 12, 148)}
    <rect x="492" y="168" width="376" height="24" fill="url(#cold)" opacity=".7"/><rect x="492" y="356" width="376" height="24" fill="url(#cold)" opacity=".7"/>${text(510, 162, 'охлаждающая рубашка', 'sub')}
    <rect x="492" y="212" width="376" height="124" fill="url(#paint)"/><rect x="492" y="212" width="376" height="124" fill="url(#beads)" opacity=".95"/>
    <rect x="404" y="270" width="456" height="12" fill="#6d7e8a"/>
    ${Array.from({ length: 8 }, (_, i) => `<g class="blade" style="animation-delay:${-i * 0.13}s"><rect x="${510 + i * 44}" y="222" width="9" height="104" rx="2" fill="#37444e"/></g>`).join('')}
    <!-- сепаратор -->
    <rect x="840" y="218" width="22" height="112" fill="#a6b6c1" stroke="#37444e"/>${Array.from({ length: 8 }, (_, i) => `<line x1="840" y1="${226 + i * 13}" x2="862" y2="${226 + i * 13}" stroke="#37444e" stroke-width="2.5"/>`).join('')}${text(792, 192, 'сепаратор бисера', 'sub')}
    <!-- привод -->
    <rect x="404" y="214" width="80" height="120" rx="6" class="wall"/>${motor(300, 250, 92, 56, 'M')}<path d="M392 266 H404 M392 292 H404" stroke="#37444e" stroke-width="5"/>
    <!-- подача -->
    <rect x="60" y="360" width="150" height="120" rx="10" class="wall"/><rect x="72" y="392" width="126" height="76" fill="url(#paint)"/>${text(135, 382, 'Премикс из диссольвера', 'sub', 'middle')}
    <g class="spin"><circle cx="270" cy="440" r="22" fill="#cbd5db" stroke="#52626e" stroke-width="1.6"/><path d="M270 420 v40 M250 440 h40" stroke="#52626e" stroke-width="3"/></g>${text(246, 482, 'насос', 'sub')}
    <path d="M210 440 H248 M292 440 H500 V348" class="pipe" style="stroke:#2f8f64;stroke-width:8"/><path d="M292 440 H500 V348" class="flow" style="stroke:#fff"/>
    <!-- выход и грайндометр -->
    <path d="M862 226 H930 V150 H1010" class="pipe" style="stroke:#2f8f64;stroke-width:8"/><path d="M862 226 H930 V150 H1010" class="flow" style="stroke:#fff"/>
    <g filter="url(#sh)"><rect x="960" y="170" width="120" height="48" rx="7" fill="#2f3b44"/><rect x="972" y="182" width="96" height="10" rx="2" fill="#2f8f64"/><path d="M976 202 h88" stroke="#cfe9dc" stroke-width="2" stroke-dasharray="4 3"/></g>${text(956, 244, 'поточный грайндометр', 'sub')}
    <path d="M1080 150 H1215 V172" class="pipe" style="stroke:#2f8f64;stroke-width:8"/><path d="M1080 150 H1215 V172" class="flow" style="stroke:#fff"/>
    <rect x="1130" y="170" width="170" height="220" rx="12" class="wall"/><rect x="1142" y="220" width="146" height="158" fill="url(#paint)"/>${text(1215, 210, 'Готовая паста', 'sub', 'middle')}
    <path d="M1215 390 V500 H292 V464" class="pipe" style="stroke:#8ab8a0;stroke-dasharray:10 8;stroke-width:6"/>${text(740, 520, 'циркуляция: паста возвращается на повторный проход до нужной тонкости', 'sub', 'middle')}
    ${text(60, 120, 'Продукт нагревается от трения бисера: температура на выходе', 'sub')}${text(60, 138, 'до ~55 °C. Мощность привода показывает износ бисера и вязкость.', 'sub')}`;
  const hs = [
    ['bmP', 790, 270, -40, -150, 'Давление'], ['bmT', 930, 226, 6, 30, 'Темп. на выходе'],
    ['bmKw', 346, 250, -60, -52, 'Мощность'], ['grind', 1020, 170, -26, -62, 'Хегман'],
  ];
  return { svg, hs };
}

/* ---------- сцена Ж3: долив, фильтрация, налив ---------- */
function sceneL3() {
  const can = (x, y, w = 70, h = 82, fill = true) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#dfe6ea" stroke="#52626e" stroke-width="1.6"/>${fill ? `<rect x="${x + 4}" y="${y + h * 0.22}" width="${w - 8}" height="${h * 0.74}" rx="3" fill="url(#paint)"/>` : ''}<rect x="${x + w / 2 - 12}" y="${y - 7}" width="24" height="8" rx="2" fill="#6d7e8a"/></g>`;
  const svg = `
    ${text(50, 36, 'Долив и тонировка', 'cap')}${text(50, 52, 'pH, плотность, сух. остаток', 'sub')}
    <!-- ёмкость долива -->
    ${hatchR(150, 120, 12, 290)}${hatchR(370, 120, 12, 290)}${hatchR(150, 400, 232, 12)}
    <rect x="162" y="210" width="208" height="190" fill="url(#paint)"/><path d="M162 210 q104 -10 208 0" fill="none" stroke="#9fe3bf" stroke-width="2.4"/>
    <rect x="262" y="60" width="8" height="300" fill="#6d7e8a"/>
    <g class="blade"><path d="M200 340 q60 -20 130 0 v10 q-70 -16 -130 0 z" fill="#37444e"/></g><path d="M200 350 v-60 M330 350 v-60" stroke="#37444e" stroke-width="3" fill="none" class="vib"/>
    ${motor(224, 14, 84, 44, 'M')}
    <rect x="320" y="70" width="6" height="150" fill="#6d7e8a"/><circle cx="323" cy="226" r="6" fill="#2f6bd9"/>
    <path d="M359 78 v128" stroke="#9fb0bb" stroke-width="3" stroke-dasharray="4 4"/><rect x="344" y="62" width="30" height="16" rx="3" fill="#2f3b44"/>
    <!-- добавки -->
    <rect x="40" y="130" width="70" height="90" rx="8" class="wall"/><rect x="50" y="160" width="50" height="50" fill="#cfe4f4"/>${text(40, 124, 'Добавки', 'sub')}<path d="M110 176 H150 V200 H164" class="pipeP" style="stroke:#3b7fb5"/><path class="flowW" d="M110 176 H150 V200 H164"/>
    <rect x="40" y="250" width="70" height="90" rx="8" class="wall"/><rect x="50" y="280" width="50" height="50" fill="#e9c46a"/>${text(40, 244, 'Колеровочная паста', 'sub')}<path d="M110 296 H150 V250 H164" class="pipeP" style="stroke:#c9a23a"/>
    <!-- откачка -->
    <path d="M266 412 V470 H470" class="pipe"/><path d="M266 412 V470 H470" class="flow"/>
    <g class="spin"><circle cx="360" cy="470" r="20" fill="#cbd5db" stroke="#52626e" stroke-width="1.6"/><path d="M360 452 v36 M342 470 h36" stroke="#52626e" stroke-width="3"/></g>
    <rect x="410" y="450" width="40" height="40" rx="4" fill="#2f3b44"/><circle cx="430" cy="470" r="9" fill="#e6eef3"/>${text(396, 504, 'плотномер', 'sub')}
    <!-- фильтр -->
    ${text(530, 36, 'Фильтрация', 'cap')}${text(530, 52, 'мешочный фильтр', 'sub')}
    <path d="M470 470 H540 V420" class="pipe"/><path d="M470 470 H540 V420" class="flow"/>
    ${hatchR(500, 190, 12, 230)}${hatchR(620, 190, 12, 230)}${hatchR(500, 410, 132, 12)}${hatchR(500, 190, 132, 12)}
    <rect x="512" y="202" width="108" height="208" fill="#eff4f7"/>
    <path d="M530 210 v180 q36 26 72 0 v-180" fill="#f4f0e2" stroke="#8a8f77" stroke-width="2"/><path d="M536 220 v160 M548 220 v168 M560 220 v172 M572 220 v168 M584 220 v160 M596 220 v152" stroke="#c6c2ac" stroke-width="1.3"/>${powderDots(534, 300, 62, 84, 22, 3, '#8ac9a5')}
    <path d="M632 232 H700 V420" class="pipe"/><path d="M632 232 H700 V420" class="flow"/>
    <g filter="url(#sh)"><circle cx="560" cy="178" r="22" fill="#fff" stroke="#52626e" stroke-width="2"/><path d="M560 178 l12 -10" stroke="#c9342b" stroke-width="3"/></g>${text(500, 150, 'манометры до и после', 'sub')}
    <!-- налив -->
    ${text(820, 36, 'Налив и упаковка', 'cap')}${text(820, 52, 'дозатор с весами: контроль массы налива', 'sub')}
    <path d="M700 420 V300 H900" class="pipe"/><path d="M700 420 V300 H900" class="flow"/>
    <path d="M880 300 h40 v34 l-12 16 h-16 l-12 -16 z" class="mach"/><path d="M900 350 v30" stroke="#2f8f64" stroke-width="5" stroke-dasharray="4 4" class="flow" style="stroke:#2f8f64"/>
    <rect x="740" y="470" width="620" height="16" rx="4" class="wall"/><path d="M750 478 H1350" class="belt" style="stroke-width:3;stroke-dasharray:12 12"/>
    ${can(770, 388)}${can(864, 382)}${can(980, 388, 70, 82, true)}${can(1090, 388, 70, 82, true)}
    <rect x="850" y="470" width="100" height="22" rx="4" fill="#2f3b44"/><text x="900" y="486" font-size="12" font-weight="800" text-anchor="middle" fill="#cfe9dc">весы</text>
    <g transform="translate(1210 372)"><rect width="90" height="98" rx="8" fill="#f2f6f8" stroke="#52626e" stroke-width="1.6"/><rect x="12" y="12" width="66" height="30" fill="#dbe6ef" stroke="#52626e"/><path d="M20 24 h50 M20 32 h36" stroke="#52626e" stroke-width="2"/><rect x="12" y="54" width="66" height="32" rx="3" fill="#fff" stroke="#52626e"/><text x="45" y="76" font-size="11" font-weight="800" text-anchor="middle" fill="#14352a">этикетка</text></g>
    ${text(50, 526, 'Готовая краска проходит фильтр и разливается в тару. Налив контролируется весами, партия получает номер и паспорт качества.', 'sub')}`;
  const hs = [
    ['lvl', 359, 70, 26, -56, 'Уровень (радар)', 128], ['ph', 323, 226, 40, -24, 'pH'],
    ['dens', 430, 450, -40, -62, 'Плотность'], ['solid', 322, 296, 62, 14, 'Сух. остаток'],
    ['lfdp', 560, 178, 36, -84, 'ΔP фильтра'], ['fillW', 900, 470, -50, 44, 'Масса налива'],
  ];
  return { svg, hs };
}

/* ---------- описание устройства (ориентиры по параметрам) ---------- */
const INFO = {
  p1: [
    ['Премиксер', 'Контейнерный или высокоскоростной смеситель. Смесь смолы, отвердителя, наполнителей и пигментов. Цикл около 1–3 мин, температура смеси не выше 45 °C.'],
    ['Двухшнековый экструдер', 'Два вала-шнека в обогреваемом цилиндре, зон 2–6. Ориентир по зонам 70–130 °C, точность поддержания ±2 °C, момент 30–60 %, обороты 300–600 об/мин, L/D 20–30. Смола только плавится, а не отверждается.'],
    ['Головка и расплав', 'Давление перед головкой 5–25 бар, температура расплава 100–125 °C. Рост давления говорит о засоре или постороннем предмете.'],
    ['Редуктор', 'Вибрация редуктора по ISO 10816 в норме до 4,5 мм/с. Рост вибрации и температуры за часы и дни предупреждает о поломке.'],
  ],
  p2: [
    ['Охлаждающие валки и лента', 'Расплав катается в ленту 1–2 мм и охлаждается до комнатной температуры. Валок 5–20 °C: если он теплее, расплав липнет.'],
    ['Дробилка', 'Ломает ленту на чипсы 5–10 мм для подачи в мельницу. Тёплые чипсы не ломаются, а деформируются.'],
    ['Мельница ACM', 'Ударная мельница с воздушным классификатором: цель D50 около 30–45 мкм (в диапазоне 20–40 мкм для тонких систем). Температура воздуха в мельнице низкая, иначе частицы налипают на циклон.'],
    ['Циклон, фильтр, сито', 'Рекуперация ≥ 98 %. Сито 120–125 мкм отсекает грубые частицы. Перепад на фильтре показывает забивание, мешок 20 кг фасуется на весах.'],
  ],
  p3: [
    ['Камера нанесения', 'Электростатические пистолеты, 60–90 кВ. Температура 18–28 °C и влажность 40–60 % в камере: порошок не должен слипаться. Рекуперация возвращает неиспользованный порошок.'],
    ['Конвейер и подвески', 'Скорость 1,5–3 м/мин задаёт время в печи и расход. Заземление подвески влияет на осаждение.'],
    ['Печь полимеризации', 'Конвекционная печь 175–205 °C. Важна температура металла (PMT) и время при ней, а не только воздух. Недо- и пережог меняют блеск, цвет и стойкость.'],
    ['Пост контроля', 'Спектрофотометр сравнивает цвет с эталоном (ΔE ≤ 1,0), блескомер 60° проверяет блеск.'],
  ],
  l1: [
    ['Диссольвер', 'Диск с зубьями на валу, окружная скорость 18–26 м/с (около 4800–5200 футов/мин). Смачивает порошки и разбивает агломераты. После 15–20 мин проверяют тонкость помола, дальше по времени улучшения нет.'],
    ['Ёмкость с рубашкой', 'Охлаждающая рубашка держит температуру базы до 50 °C. Мощность двигателя ориентировочно 1 л.с. на 10 галлонов (около 4 л) продукта.'],
    ['Загрузка', 'Порошки подаются постепенно с вихрем, а не одной порцией. Вязкость растёт, обороты поднимают, чтобы вихрь не пропадал.'],
  ],
  l2: [
    ['Горизонтальная бисерная мельница', 'Камера с бисером 0,3–0,8 мм и вращающимся ротором. Бисер бьёт и растирает агломераты пигмента. Режимы: проход несколько раз или циркуляция. Типичная окружная скорость ротора около 10–14 м/с.'],
    ['Охлаждение и сепаратор', 'Рубашка охлаждает продукт (на выходе до ~55 °C). Динамический сепаратор не пускает бисер на выход.'],
    ['Контроль помола', 'Тонкость определяют по Хегману (ГОСТ или DIN 53203): цель обычно 6,5 и выше. Поточный грайндометр показывает её без остановки.'],
  ],
  l3: [
    ['Долив и тонировка', 'Добавление связующего, воды и добавок под перемешиванием. Контроль pH до добавления сырья, плотности и сухого остатка. Колеровочные пасты добавляются по рецепту и корректируются по цвету.'],
    ['Фильтрация', 'Мешочный или корзинчатый фильтр. Перепад давления растёт по мере забивания: сигнал на замену элемента.'],
    ['Налив', 'Дозатор на весах: допуск налива обычно доли процента. Партия получает номер и паспорт качества.'],
  ],
};

export const SCENES = {
  p: [
    { id: 'p1', name: 'Предсмесь и экструдер', fn: (s) => sceneP1(s.zones), info: INFO.p1 },
    { id: 'p2', name: 'Охлаждение и помол', fn: () => sceneP2(), info: INFO.p2 },
    { id: 'p3', name: 'Нанесение и печь', fn: () => sceneP3(), info: INFO.p3 },
  ],
  l: [
    { id: 'l1', name: 'Диссольвер', fn: () => sceneL1(), info: INFO.l1 },
    { id: 'l2', name: 'Бисерная мельница', fn: () => sceneL2(), info: INFO.l2 },
    { id: 'l3', name: 'Долив, фильтр, налив', fn: () => sceneL3(), info: INFO.l3 },
  ],
};

/* ---------- датчики на чертеже ---------- */
function hotspot([id, x, y, dx, dy, name, tw]) {
  const w = tw || Math.max(104, name.length * 7.3 + 24);
  const tx = x + dx, ty = y + dy;
  const cx = Math.max(6, Math.min(W - w - 6, tx)), cy = Math.max(4, Math.min(H - 40, ty));
  const ax = Math.max(cx, Math.min(cx + w, x)), ay = cy + 17 > y ? cy : cy + 36;
  return `<g class="hs ok" data-sens="${id}" id="hs-${id}" tabindex="0" role="button" aria-label="${name}">
    <line class="lead" x1="${x}" y1="${y}" x2="${ax}" y2="${ay > y ? cy : cy + 36}"/>
    <g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)})"><rect class="tg" width="${w}" height="36" rx="7"/><text class="t1" x="8" y="14">${name}</text><text class="t2" x="8" y="30"><tspan class="val">—</tspan></text></g>
    <circle class="ring" cx="${x}" cy="${y}" r="10"/><circle class="dot" cx="${x}" cy="${y}" r="7"/></g>`;
}

export function equipSvg(scene, plant) {
  const { svg, hs } = scene.fn(plant);
  return `<svg class="eqsvg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${scene.name}: оборудование в разрезе с датчиками">${DEFS}<rect width="${W}" height="${H}" fill="#f4f8f5"/><rect x="0" y="${H - 34}" width="${W}" height="1" fill="#c5d5cb"/>${svg}${hs.map(hotspot).join('')}</svg>`;
}

export function paintEquip(root, plant) {
  root.querySelectorAll('.hs').forEach((g) => {
    const s = plant.sensors.find((x) => x.id === g.dataset.sens);
    if (!s) return;
    const lv = plant.status(s);
    g.setAttribute('class', 'hs ' + lv);
    const v = g.querySelector('.val');
    const t = fmt(s.value, s.dec) + (s.unit ? ' ' + s.unit : '');
    if (v && v.textContent !== t) v.textContent = t;
  });
}
