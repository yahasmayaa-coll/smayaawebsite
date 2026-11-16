/* SMAYAA platform screens drawn in HTML inside a laptop photo (modules.html, index.html).
   Any element <div class="lap-scr" data-screen="thermal"> inside a .lapx laptop gets a static screen of the SMAYAA
   platform for that module: the SMAYAA logo bar, four readings, a 14-day reading against its healthy band,
   predicted issues and the recommended action. Nothing is clickable. A small synthetic cooling-tower model gives
   every screen consistent, illustrative numbers. window.SMYScreens.show(host, slug) switches a screen (home tabs). */
(() => {
  'use strict';
  const f = (v, n = 1) => (+v).toLocaleString('en-IN', { minimumFractionDigits: n, maximumFractionDigits: n });
  const pct = v => Math.round(v * 100) + '%';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOGO = (document.getElementById('sx-logo') || {}).content;
  const NAMES = { thermal: 'Cooling Tower Thermal', 'water-balance': 'Water Balance', coc: 'Cycles of Concentration', chemistry: 'Chemistry & Scaling',
    filtration: 'Filtration', biological: 'Biological Fouling', energy: 'Heat Transfer & Energy', 'predictive-maintenance': 'Predictive Maintenance',
    optimization: 'Multi-Objective Optimization', validation: 'Engineering Validation' };

  /* ---------------- modules and the 30 SMAYAA rules ---------------- */
  // code | issue | severity | trend/step | base risk %
  const RULES = `TH-01|Cooling performance declining|H|t|7
TH-02|Nozzle / fill clogging risk|H|t|12
TH-03|Airflow or water distribution problem|H|s|3
TH-04|Low circulation / hydraulic restriction|H|s|1
TH-05|Excess circulation or bypassing|M|s|2
WB-01|Leakage suspicion|H|t|0
WB-02|Passing make-up valve / basin overflow|H|s|0
WB-03|Passing blowdown valve|H|s|8
WB-04|Water balance mismatch|H|t|3
COC-01|Opportunity: increase cycles of concentration|M|s|17
COC-02|High conductivity, blowdown needed|H|t|0
COC-03|Blowdown restriction|H|t|7
SC-01|High scaling risk|C|t|0
SC-02|Acid overdose / corrosion risk|C|s|1
SC-03|Heat exchanger fouling|H|t|4
BIO-01|Biocide delivery failure|H|t|6
BIO-02|Biocide overdosing|H|s|4
BIO-03|Biological fouling developing|H|t|9
FLT-01|Filter cleaning due|M|t|6
FLT-02|Filter bypass or media damage|H|s|3
FLT-03|Rising filter load / cleaning frequency|M|t|6
FLT-04|Inefficient backwash|M|s|8
CON-01|Process solids ingress|H|t|9
CON-02|Process chemical leak|H|s|4
CON-03|Oil ingress|C|s|6
ENG-01|Fan performance degrading|M|t|1
ENG-02|Pump inefficiency|M|t|1
SEN-01|Supply temperature sensor frozen|H|s|1
SEN-02|Wet-bulb sensor drift|M|s|2
CTRL-01|Opportunity: multi-objective optimisation|M|s|16`.split('\n').map((l, i) => {
    const [code, name, sev, kind, base] = l.split('|');
    return { i, code, name, sev: { H: 'High', M: 'Medium', C: 'Critical' }[sev], sc: { H: 'hi', M: 'md', C: 'cr' }[sev],
      trend: kind === 't', base: base / 100, mod: code.split('-')[0], opp: name.startsWith('Opportunity') };
  });
  const ACTS = { // action, tags, colour (g green, p purple, o orange, b blue)
    'TH-01': ['Compare approach with the healthy reference; inspect fill and airflow', ['Approach', 'Cooling Performance'], 'o'],
    'TH-02': ['Increase side-stream filtration; inspect fill/nozzles', ['Approach', 'Fouling Risk'], 'o'],
    'TH-03': ['Check fan pitch and hot-deck water distribution', ['Airflow', 'Distribution'], 'b'],
    'TH-04': ['Check strainers and pump suction for restriction', ['Circulation', 'Hydraulics'], 'b'],
    'TH-05': ['Review circulation set-point and bypass valve position', ['Circulation', 'Pump Energy'], 'b'],
    'WB-01': ['Walk the basin and lines for leaks; compare meter totals', ['Make-up', 'Water Loss'], 'g'],
    'WB-02': ['Inspect make-up valve seat and basin overflow', ['Make-up', 'Basin Level'], 'g'],
    'WB-03': ['Inspect blowdown valve for passing', ['Blowdown', 'Water Loss'], 'g'],
    'WB-04': ['Validate flowmeters and EC; inspect overflow/leaks', ['CoC', 'Water Balance'], 'g'],
    'COC-01': ['Increase conductivity setpoint gradually by approved step', ['CoC', 'Blowdown', 'Water Saving'], 'g'],
    'COC-02': ['Increase blowdown until conductivity is back in band', ['Conductivity', 'Blowdown'], 'g'],
    'COC-03': ['Inspect blowdown valve and line for restriction', ['Blowdown', 'Conductivity'], 'g'],
    'SC-01': ['Lower CoC; verify inhibitor and acid dosing', ['Scale Risk', 'Heat Transfer'], 'o'],
    'SC-02': ['Check acid dosing pump calibration and pH probe', ['pH', 'Corrosion'], 'o'],
    'SC-03': ['Plan exchanger inspection; trend heat-transfer coefficient', ['Heat Transfer', 'Fouling'], 'o'],
    'BIO-01': ['Check biocide pump, tank level and injection line', ['ORP', 'Free Chlorine'], 'o'],
    'BIO-02': ['Reduce biocide dose to the validated programme', ['Chemicals', 'Corrosion'], 'p'],
    'BIO-03': ['Verify biocide programme; shock-dose and re-test', ['ORP', 'Free Chlorine'], 'o'],
    'FLT-01': ['Schedule filter backwash and check media', ['Filter ΔP', 'Turbidity'], 'b'],
    'FLT-02': ['Inspect filter media and bypass valve', ['Turbidity', 'Filter Media'], 'b'],
    'FLT-03': ['Review solids load upstream and backwash frequency', ['Filter Load', 'Turbidity'], 'b'],
    'FLT-04': ['Extend backwash duration; check media level', ['Backwash', 'Filter ΔP'], 'b'],
    'CON-01': ['Check the process side for solids carry-over', ['Turbidity', 'Filter Load'], 'o'],
    'CON-02': ['Sample basin water; check exchangers for process leaks', ['Conductivity', 'Contamination'], 'o'],
    'CON-03': ['Skim basin and trace the oil source', ['Oil', 'Fouling'], 'o'],
    'ENG-01': ['Inspect fan blades, gearbox and motor current', ['Fan Energy', 'Airflow'], 'b'],
    'ENG-02': ['Check pump curve against flow and head; inspect impeller', ['Pump Energy', 'Efficiency'], 'b'],
    'SEN-01': ['Check the supply temperature transmitter and its wiring', ['Sensor Health', 'Data Quality'], 'b'],
    'SEN-02': ['Calibrate the wet-bulb sensor against the weather station', ['Sensor Health', 'Wet Bulb'], 'b'],
    'CTRL-01': ['Approve staged optimization change and validation period', ['Water / Chemical / Energy Saving'], 'p']
  };

  /* ---------------- a year of synthetic plant behaviour ---------------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const when = d => { let day = Math.floor(d), m = 0; while (day >= DIM[m]) day -= DIM[m++]; return { m, day: day + 1 }; };
  const stamp = d => { const w = when(d); return `${w.day} ${MON[w.m]} 2026, ${String(Math.round((d % 1) * 6) * 4 % 24).padStart(2, '0')}:00`; };
  // labelled fault episodes: day of peak, peak risk, width in days
  const EVENTS = { 'FLT-01': [75, .58, 5], 'CON-01': [120, .41, 3], 'BIO-03': [170, .63, 6], 'TH-02': [228, .47, 5], 'WB-04': [279, .56, 4], 'COC-03': [290, .54, 4], 'SC-01': [338, .44, 5], 'SEN-02': [157, .46, 7] };
  const ev = (code, d) => { const e = EVENTS[code]; return e ? Math.exp(-(((d - e[0]) / e[2]) ** 2)) : 0; };
  const risk = (r, d) => {
    let v = r.base * (1 + .35 * Math.sin(d * .21 + r.i * 1.7)) + .004 * (1 + Math.sin(d * .9 + r.i));
    if (EVENTS[r.code]) v += (EVENTS[r.code][1] - r.base) * ev(r.code, d);
    return Math.min(.99, Math.max(0, v));
  };
  const season = d => Math.sin((d - 110) / 365 * 2 * Math.PI);
  const PV = d => {
    const wb = 21.8 + 3.2 * season(d) + .4 * Math.sin(d * 1.3);
    const appr = 4.02 + .12 * Math.sin(d * .8) + .1 * Math.sin(d * 5.3) * Math.sin(d * 1.7) + 1.1 * ev('TH-02', d) + .7 * ev('SC-01', d);
    const range = 7.1 + .25 * Math.sin(d * .6 + 1), cold = wb + appr, flow = 5890 + 60 * Math.sin(d * .4 + 1);
    return {
      wb, appr, range, cold, flow, hot: cold + range, load: 48.6 + 1.8 * Math.sin(d * .5 + 2), evap: .00153 * flow * range,
      fan: 25.5 + 2.6 * Math.sin(d * .7 + .5) + 4 * ev('TH-02', d), fanPct: 67 + 6 * Math.sin(d * .7 + .5) + 9 * ev('TH-02', d),
      pump: 102 + 3 * Math.sin(d * .4 + 1),
      dp: 46 + 6 * Math.sin(d * .3) + 30 * ev('FLT-01', d) + 14 * ev('CON-01', d), ff: 520 + 12 * Math.sin(d * .35),
      rec: 74 + 2 * Math.sin(d * .5) - 22 * ev('FLT-01', d) - 10 * ev('CON-01', d),
      makeup: 94.2 + 3 * Math.sin(d * .5) + 16 * ev('WB-04', d), blow: 17.9 + .8 * Math.sin(d * .45) - 9 * ev('COC-03', d),
      basin: 70 + 3 * Math.sin(d * .9) + 9 * ev('WB-04', d), acid: .29 + .03 * Math.sin(d), bio: .7 - .45 * ev('BIO-03', d),
      coc: 4.78 + .06 * Math.sin(d * .7) + 1.6 * ev('COC-03', d)
    };
  };
  const P = k => d => PV(d)[k];
  const CH = {
    ph: d => 8.04 + .06 * Math.sin(d * 1.1),
    ec: d => 1039 + 40 * Math.sin(d * .6) + 780 * ev('COC-03', d),
    hard: d => 503 + 20 * Math.sin(d * .5) + 290 * ev('SC-01', d),
    alk: d => 361 + 14 * Math.sin(d * .7),
    orp: d => 645 + 12 * Math.sin(d * .9) - 95 * ev('BIO-03', d),
    cl: d => .58 + .05 * Math.sin(d * 1.3) - .38 * ev('BIO-03', d),
    turb: d => 5.6 + .6 * Math.sin(d * .8) + 4 * ev('FLT-01', d) + 3.5 * ev('CON-01', d),
    iron: d => .15 + .02 * Math.sin(d * .3),
    lsi: d => 1.41 + .08 * Math.sin(d * .6) + .9 * ev('SC-01', d) + .35 * ev('COC-03', d),
    muec: d => 217 + 9 * Math.sin(d * .5),
    wbs: d => PV(d).wb + .25 * Math.sin(d * 2.1) + .9 * Math.max(0, Math.sin((d - 140) / 9)) * (d > 140 && d < 168)
  };

  /* ---------------- one screen per module ---------------- */
  // tiles: [name, value(d), unit, decimals, good low, good high]
  // ref: the 14-day reading against its healthy band: [actual, expected] at day d
  const T = {
    range: ['Cooling range', P('range'), '°C', 1, 6.5, 9], appr: ['Approach', P('appr'), '°C', 1, 0, 4.8], wb: ['Wet bulb', P('wb'), '°C', 1, 0, 30],
    load: ['Heat load', P('load'), 'MW', 1, 40, 55], mu: ['Make-up water', P('makeup'), 'm³/h', 1, 80, 105], evap: ['Evaporation', P('evap'), 'm³/h', 1, 55, 75],
    bd: ['Blowdown', P('blow'), 'm³/h', 1, 13, 25], basin: ['Basin level', P('basin'), '%', 0, 60, 80], coc: ['Cycles (CoC)', P('coc'), '×', 1, 4, 6.5],
    ec: ['Conductivity', CH.ec, 'µS/cm', 0, 900, 1600], muec: ['Make-up EC', CH.muec, 'µS/cm', 0, 150, 260], lsi: ['LSI', CH.lsi, '', 2, .5, 2],
    hard: ['Hardness', CH.hard, 'mg/L', 0, 400, 750], ph: ['pH', CH.ph, '', 2, 7.8, 8.3], alk: ['Alkalinity', CH.alk, 'mg/L', 0, 300, 650],
    dp: ['Filter ΔP', P('dp'), 'kPa', 0, 0, 60], turb: ['Turbidity', CH.turb, 'NTU', 1, 0, 7], ff: ['Filter flow', P('ff'), 'm³/h', 0, 480, 560],
    rec: ['Backwash recovery', P('rec'), '%', 0, 68, 100], orp: ['ORP', CH.orp, 'mV', 0, 600, 720], cl: ['Free chlorine', CH.cl, 'mg/L', 2, .3, .8],
    bio: ['Biocide dosing', P('bio'), 'L/h', 2, .5, 1], iron: ['Iron', CH.iron, 'mg/L', 2, 0, .3], fan: ['Fan energy', P('fan'), 'kW', 1, 0, 30],
    pump: ['Pump energy', P('pump'), 'kW', 0, 0, 125], fanPct: ['Fan speed', P('fanPct'), '%', 0, 0, 80], acid: ['Acid dosing', P('acid'), 'L/h', 2, .2, .4],
    hot: ['Hot water in', P('hot'), '°C', 1, 0, 42], cold: ['Cold water out', P('cold'), '°C', 1, 0, 33], flow: ['Circulation', P('flow'), 'm³/h', 0, 5500, 6300]
  };
  const SCREENS = {
    thermal: { tab: 'intelligence', day: 226.4, rules: ['TH'], tiles: ['range', 'appr', 'wb', 'load'],
      ref: { labels: ['Actual approach', 'Expected healthy approach'], unit: '°C', dec: 2, band: .53, at: d => [PV(d).appr, 3.94 + .05 * Math.sin(d * .8)],
        judge: r => r > .53 ? ['a', 'High thermal residual: inspect fill, nozzles and airflow'] : ['', 'Approach is inside the healthy band'] } },
    'water-balance': { tab: 'plant', day: 278.3, rules: ['WB'], tiles: ['mu', 'evap', 'bd', 'basin'],
      ref: { labels: ['Measured make-up', 'Expected make-up'], unit: 'm³/h', dec: 1, band: 5, at: d => [PV(d).makeup, 94.2 + 3 * Math.sin(d * .5)],
        judge: r => r > 5 ? ['a', `${f(r * 24, 0)} m³/day more make-up than evaporation, blowdown and drift explain`] : ['', 'Make-up matches evaporation, blowdown and drift'] } },
    coc: { tab: 'intelligence', day: 288.6, rules: ['COC'], tiles: ['coc', 'ec', 'bd', 'muec'],
      ref: { labels: ['Operating CoC', 'Safe CoC limit'], unit: '×', dec: 2, band: .35, at: d => [PV(d).coc, 5.6 - .8 * ev('SC-01', d)],
        judge: r => r > .35 ? ['a', 'Above safe cycles: blowdown is restricted'] : r < -.35 ? ['w', 'Opportunity: raise cycles by an approved step'] : ['', 'Operating at the safe limit'] } },
    chemistry: { tab: 'plant', day: 336.8, rules: ['SC'], tiles: ['lsi', 'hard', 'ph', 'alk'],
      ref: { labels: ['LSI', 'Scaling limit'], unit: '', dec: 2, band: .45, at: d => [CH.lsi(d), 1.45],
        judge: r => r > .45 ? ['a', 'LSI above the scaling limit: lower cycles, check inhibitor'] : ['', 'LSI inside the scaling limit'] } },
    filtration: { tab: 'intelligence', day: 73.6, rules: ['FLT'], tiles: ['dp', 'turb', 'ff', 'rec'],
      ref: { labels: ['Backwash ΔP recovery', 'Expected healthy recovery'], unit: '%', dec: 0, band: 6, at: d => [PV(d).rec, 78],
        judge: r => r < -6 ? ['a', 'Backwash is not recovering ΔP: clean and check media'] : ['', 'Backwash recovering normally'] } },
    biological: { tab: 'issues', day: 168.5, rules: ['BIO'], tiles: ['orp', 'cl', 'bio', 'iron'],
      ref: { labels: ['ORP', 'Programme target'], unit: 'mV', dec: 0, band: 45, at: d => [CH.orp(d), 655],
        judge: r => r < -45 ? ['a', 'ORP below programme: biofouling conditions developing'] : ['', 'ORP inside the biocide programme band'] } },
    energy: { tab: 'gains', day: 227.2, rules: ['ENG', 'SC-03', 'TH-01'], tiles: ['fan', 'pump', 'appr', 'load'],
      ref: { labels: ['Fan energy', 'Expected for heat load'], unit: 'kW', dec: 1, band: 2.2, at: d => [PV(d).fan, 25.5 + 2.6 * Math.sin(d * .7 + .5)],
        judge: r => r > 2.2 ? ['a', 'Fans working harder than the heat load needs'] : ['', 'Fan energy matches the heat load'] } },
    'predictive-maintenance': { tab: 'issues', day: 119.3, rules: ['CON', 'ENG', 'TH-04'], tiles: ['dp', 'turb', 'fanPct', 'pump'],
      ref: { labels: ['Filter ΔP', 'Expected from flow'], unit: 'kPa', dec: 0, band: 8, at: d => [PV(d).dp, 46 + 6 * Math.sin(d * .3)],
        judge: r => r > 8 ? ['a', 'Anomaly: ΔP rising faster than flow explains'] : ['', 'No anomaly in the multivariable model'] } },
    optimization: { tab: 'simulate', day: 205.5, rules: ['CTRL', 'COC-01', 'ENG-01'], tiles: ['coc', 'mu', 'fan', 'acid'],
      ref: { labels: ['Operating CoC', 'Optimised CoC'], unit: '×', dec: 2, band: .25, at: d => [PV(d).coc, 5.5],
        judge: r => r < -.25 ? ['w', 'Opportunity: optimised cycles save water and chemicals'] : ['', 'Operating at the optimised point'] } },
    validation: { tab: 'evaluation', day: 158.2, rules: ['SEN', 'WB-04'], tiles: ['hot', 'cold', 'wb', 'flow'],
      ref: { labels: ['Wet-bulb sensor', 'Weather-station reference'], unit: '°C', dec: 1, band: .6, at: d => [CH.wbs(d), PV(d).wb],
        judge: r => Math.abs(r) > .6 ? ['a', 'Sensor drift: calibrate before using its readings'] : ['', 'Sensor agrees with the reference'] } }
  };

  /* ---------------- pieces ---------------- */
  const band = (v, lo, hi) => { const m = (hi - lo) * .12; return v >= lo && v <= hi ? 'g' : v >= lo - m && v <= hi + m ? 'w' : 'a'; };
  const spark = arr => {
    const lo = Math.min(...arr), hi = Math.max(...arr), k = hi - lo || 1;
    return 'M' + arr.map((v, i) => (i / (arr.length - 1) * 100).toFixed(1) + ' ' + (20 - (v - lo) / k * 18).toFixed(1)).join('L');
  };
  const STATE = { g: '', w: 'w', a: 'a' };
  const kpi = ([n, fn, u, dec, lo, hi], d) => {
    const v = fn(d), s = STATE[band(v, lo, hi)];
    const h = Array.from({ length: 42 }, (_, i) => fn(d - 7 + 7 * i / 41));
    return `<div class="k${s ? ' ' + s : ''}"><dt>${n}</dt><dd><b>${f(v, dec)}</b>${u ? `<small>${u}</small>` : ''}</dd>` +
      `<svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path d="${spark(h)}" vector-effect="non-scaling-stroke"/></svg>` +
      `<span class="rg">${s ? `<span class="lw">${s === 'a' ? 'Out of range' : 'Near limit'} · </span>` : ''}${lo ? f(lo, dec) + '–' : '≤ '}${f(hi, dec)}</span></div>`;
  };
  const issue = ([r, v]) => {
    const s = r.opp ? 'op' : v >= .5 ? 'a' : v >= .3 ? 'w' : '';
    const word = r.opp ? 'Opportunity' : v >= .5 ? 'Active now' : v >= .3 ? (r.trend ? 'Building · under 12 h' : 'Elevated') : 'Watching';
    return `<li class="${s}"><div><b>${r.name}</b><small>${r.code} · ${r.sev} · ${word}</small></div><span class="pc">${pct(v)}</span><i style="--r:${Math.max(.02, v).toFixed(3)}"></i></li>`;
  };
  const chart = (R, d0, cls) => {
    const W = 460, H = 190, L = 34, B = 20, n = 84, pts = Array.from({ length: n }, (_, i) => d0 - 14 + 14 * i / (n - 1)).map(d => [d, ...R.at(d)]);
    const vals = pts.flatMap(([, a, e]) => [a, e + 2.4 * R.band, e - 2.4 * R.band]);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * .1; lo -= pad; hi += pad;
    const x = i => L + i / (n - 1) * (W - L - 4), y = v => 4 + (1 - (v - lo) / (hi - lo)) * (H - B - 8);
    const P = (i, v) => x(i).toFixed(1) + ' ' + y(v).toFixed(1);
    const line = k => pts.map((p, i) => (i ? 'L' : 'M') + P(i, p[k])).join('');
    const area = pts.map((p, i) => (i ? 'L' : 'M') + P(i, p[2] + R.band)).join('') + pts.slice().reverse().map((p, j) => 'L' + P(n - 1 - j, p[2] - R.band)).join('') + 'Z';
    // the stretches of the reading that leave the band are redrawn in the alert colour
    let out = '', prev = false;
    pts.forEach((p, i) => { const o = Math.abs(p[1] - p[2]) > R.band; if (o) out += (prev ? 'L' : 'M') + P(i, p[1]); prev = o; });
    const ticks = [lo + pad, hi - pad], dec = R.dec ? 1 : 0;
    const days = [6, 27, 48, 69].map(i => { const w = when(pts[i][0]); return [i, `${w.day} ${MON[w.m]}`]; });
    return `<svg viewBox="0 0 ${W} ${H}" class="${cls}" role="img" aria-label="${R.labels[0]} against the healthy band over the last 14 days">
      ${ticks.map(v => `<line x1="${L}" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="gl"/><text x="${L - 7}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${f(v, dec)}</text>`).join('')}
      <path d="${area}" class="bd"/><path d="${line(2)}" class="ex"/><path d="${line(1)}" class="ac"/>${out ? `<path d="${out}" class="ou"/>` : ''}
      <circle cx="${x(n - 1).toFixed(1)}" cy="${y(pts[n - 1][1]).toFixed(1)}" r="3.5" class="${Math.abs(pts[n - 1][1] - pts[n - 1][2]) > R.band ? 'nw o' : 'nw'}"/>
      ${days.map(([i, s]) => `<text x="${x(i).toFixed(1)}" y="${H - 3}" text-anchor="middle">${s}</text>`).join('')}</svg>`;
  };

  /* ---------------- build one screen ---------------- */
  const W0 = 1180;
  function build(slug) {
    const C = SCREENS[slug]; if (!C) return null;
    const d = C.day, v = RULES.map(r => risk(r, d));
    const health = Math.round(Math.max(38, 100 - 95 * Math.max(...RULES.filter(r => !r.opp).map(r => v[r.i]))));
    const mine = RULES.filter(r => C.rules.some(k => r.code === k || r.mod === k)).map(r => [r, v[r.i]]).sort((a, b) => b[1] - a[1]);
    const R = C.ref, [a, e] = R.at(d), [cls, verdict] = R.judge(a - e), u = R.unit ? ' ' + R.unit : '';
    const act = mine.find(([r]) => ACTS[r.code]);
    const st = health >= 80 ? ['', 'Running normally'] : health >= 60 ? ['w', 'Needs attention'] : ['a', 'Issue active'];
    const [txt] = act ? ACTS[act[0].code] : [''];
    const pri = !act ? '' : act[0].opp ? 'Opportunity' : act[1] >= .5 ? 'High priority' : act[1] >= .3 ? 'Medium priority' : 'Preventive';
    const el = document.createElement('div');
    el.className = 'sx';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="sx-bar"><i></i><i></i><i></i><span>app.smayaa.ai</span></div>
      <div class="sx-top"><span class="sx-logo"></span><span class="sx-mod">${NAMES[slug] || ''}</span><span class="sx-site">Cooling tower CT-01</span>
        <span class="sx-date">${stamp(d)}</span><span class="sx-st ${st[0]}">${st[1]}<em>Health ${health}</em></span></div>
      <div class="sx-body">
        <dl class="sx-k sx-card">${C.tiles.map(k => kpi(T[k], d)).join('')}</dl>
        <div class="sx-m">
          <figure class="sx-c sx-card"><figcaption><b>${R.labels[0]}</b> against ${R.labels[1].charAt(0).toLowerCase() + R.labels[1].slice(1)}<span>Last 14 days</span></figcaption>
            ${chart(R, d, cls)}
            <p class="sx-v ${cls}"><b>${f(a, R.dec)}${u}</b> now, ${f(e, R.dec)}${u} expected. ${verdict}.</p></figure>
          <div class="sx-i sx-card"><h3>Predicted issues <span>${mine.length} rule${mine.length === 1 ? '' : 's'} watched</span></h3><ol>${mine.slice(0, 3).map(issue).join('')}</ol></div>
        </div>
        ${act ? `<div class="sx-a sx-card"><span>Recommended action</span><b>${txt}</b><em>${pri} · ${act[0].code}</em></div>` : ''}
      </div>`;
    const lg = el.querySelector('.sx-logo');
    if (LOGO) lg.append(LOGO.cloneNode(true));
    return el;
  }

  // the screen is designed at 1180 px wide and scaled to the laptop's opening
  const fit = host => host.style.setProperty('--k', (host.clientWidth / W0).toFixed(4));
  const ro = new ResizeObserver(es => es.forEach(e => fit(e.target)));

  // lines and bars draw in once the screen has been seen (and again on each new screen after that)
  const play = el => requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('seen')));
  function show(host, slug) {
    if (host.dataset.shown === slug) return;
    const el = build(slug); if (!el) return;
    host.dataset.shown = slug;
    const old = [...host.querySelectorAll('.sx')];
    if (!old.length || reduced) { old.forEach(o => o.remove()); host.append(el); }
    else {
      el.classList.add('out'); host.append(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('out')));
      setTimeout(() => old.forEach(o => o.remove()), 500);
    }
    if (host.classList.contains('seen')) play(el);
  }

  const hosts = [...document.querySelectorAll('.lap-scr[data-screen]')];
  hosts.forEach(h => { fit(h); ro.observe(h); });
  // draw each screen a little before it scrolls into view, and animate it in once it is seen
  const near = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { show(x.target, x.target.dataset.screen); near.unobserve(x.target); } }), { rootMargin: '900px 0px' });
  const seen = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('seen'); x.target.querySelectorAll('.sx').forEach(play); seen.unobserve(x.target); } }), { threshold: .25 });
  hosts.forEach(h => { near.observe(h); seen.observe(h); });

  window.SMYScreens = { show: (host, slug) => { host.dataset.screen = slug; show(host, slug); } };
})();
