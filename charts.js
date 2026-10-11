// Lichtgewicht SVG-grafieken met tooltips (geen externe libraries, werkt offline).
import { esc, fmt1, fmtDay, DAY_SHORT, MONTH_SHORT, toISO, addDays, todayISO, fmtDate } from './util.js';

const registry = new Map();
let seq = 0;
export function resetCharts() {
  registry.clear();
  seq = 0;
}
function register(spec) {
  const id = 'c' + ++seq;
  registry.set(id, spec);
  return id;
}
export function mountCharts(root) {
  root.querySelectorAll('[data-chart]').forEach((el) => {
    const spec = registry.get(el.dataset.chart);
    if (spec?.mount) spec.mount(el, spec);
  });
}

// ---------- tooltip ----------
let tipEl = null;
function tip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tip';
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
// rows: [{value, label}] — waarde is leidend, label secundair
function showTip(x, y, title, rows) {
  const t = tip();
  t.replaceChildren();
  const h = document.createElement('div');
  h.className = 'tip-t';
  h.textContent = title;
  t.appendChild(h);
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'tip-r';
    const v = document.createElement('strong');
    v.textContent = r.value;
    row.appendChild(v);
    if (r.label) {
      const l = document.createElement('span');
      l.textContent = r.label;
      row.appendChild(l);
    }
    t.appendChild(row);
  }
  t.hidden = false;
  const tw = t.offsetWidth;
  const th = t.offsetHeight;
  const left = Math.min(window.innerWidth - tw - 8, Math.max(8, x - tw / 2));
  const top = y - th - 14 < 8 ? y + 18 : y - th - 14;
  t.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
export function hideTip() {
  if (tipEl) tipEl.hidden = true;
}
window.addEventListener('scroll', hideTip, { passive: true });

// ---------- helpers ----------
function niceStep(range, count) {
  const raw = range / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return s * mag;
}
function niceDomain(min, max, count = 3, zero = false) {
  if (zero) min = Math.min(0, min);
  if (max - min < 1e-9) {
    const pad = Math.max(1, Math.abs(max) * 0.05);
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}
const r1 = (v) => Math.round(v * 10) / 10;

// Kolom met afgeronde bovenkant (4px), vlak bij de basislijn.
function colPath(x, y, w, h) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${r1(x)},${r1(y + h)}V${r1(y + r)}A${r},${r} 0 0 1 ${r1(x + r)},${r1(y)}H${r1(x + w - r)}A${r},${r} 0 0 1 ${r1(x + w)},${r1(y + r)}V${r1(y + h)}Z`;
}
// Horizontale balk met afgerond einde rechts.
function barPath(x, y, w, h) {
  if (w <= 0) return '';
  const r = Math.min(4, h / 2, w);
  return `M${r1(x)},${r1(y)}H${r1(x + w - r)}A${r},${r} 0 0 1 ${r1(x + w)},${r1(y + r)}V${r1(y + h - r)}A${r},${r} 0 0 1 ${r1(x + w - r)},${r1(y + h)}H${r1(x)}Z`;
}

function svgPoint(svg, evt) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return { x: ((evt.clientX - rect.left) / rect.width) * vb.width, y: ((evt.clientY - rect.top) / rect.height) * vb.height, rect };
}

function empty(w, h, text) {
  return `<div class="chart-empty" style="height:${h}px">${esc(text)}</div>`;
}

// ---------- lijngrafiek ----------
// points: [{t, y, date}] oplopend. opts: { w, h, fmt, unit, name, band:[lo,hi]? }
export function lineChart(points, opts) {
  const { w, h = 180, fmt = fmt1, unit = 'kg', name = '', emptyText = 'Nog te weinig data.' } = opts;
  if (!points || points.length < 2) return empty(w, h, emptyText);
  const padL = 34;
  const padR = 52;
  const padT = 12;
  const padB = 24;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const ys = points.map((p) => p.y);
  const dom = niceDomain(Math.min(...ys), Math.max(...ys), 3);
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const X = (t) => padL + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw);
  const Y = (v) => padT + ih - ((v - dom.lo) / (dom.hi - dom.lo)) * ih;
  const xy = points.map((p) => [r1(X(p.t)), r1(Y(p.y))]);
  const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join('');
  const area = `${line}L${xy[xy.length - 1][0]},${padT + ih}L${xy[0][0]},${padT + ih}Z`;

  const grid = dom.ticks
    .map((v) => `<line x1="${padL}" x2="${padL + iw}" y1="${r1(Y(v))}" y2="${r1(Y(v))}" class="grid"/><text x="${padL - 6}" y="${r1(Y(v)) + 4}" class="ax" text-anchor="end">${esc(fmt(v))}</text>`)
    .join('');
  // 3–4 datumlabels gelijkmatig verdeeld
  const nx = Math.min(4, points.length);
  const xt = [];
  for (let i = 0; i < nx; i++) xt.push(t0 + ((t1 - t0) * i) / (nx - 1 || 1));
  const xlabels = xt
    .map((t, i) => {
      const anchor = i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle';
      return `<text x="${r1(X(t))}" y="${h - 6}" class="ax" text-anchor="${anchor}">${esc(fmtDay(toISO(new Date(t))))}</text>`;
    })
    .join('');
  const last = xy[xy.length - 1];
  const lastV = points[points.length - 1].y;
  const id = register({
    mount(el) {
      const svg = el.querySelector('svg');
      const cross = svg.querySelector('.cross');
      const dot = svg.querySelector('.hdot');
      const move = (evt) => {
        const { x, rect } = svgPoint(svg, evt);
        let bi = 0;
        let bd = Infinity;
        xy.forEach((p, i) => {
          const d = Math.abs(p[0] - x);
          if (d < bd) { bd = d; bi = i; }
        });
        const [px, py] = xy[bi];
        cross.setAttribute('x1', px);
        cross.setAttribute('x2', px);
        cross.style.opacity = 1;
        dot.setAttribute('cx', px);
        dot.setAttribute('cy', py);
        dot.style.opacity = 1;
        const p = points[bi];
        const vb = svg.viewBox.baseVal;
        const sx = rect.left + (px / vb.width) * rect.width;
        const sy = rect.top + (py / vb.height) * rect.height;
        showTip(sx, sy, fmtDate(toISO(new Date(p.t))), [{ value: `${fmt(p.y)} ${unit}`, label: p.sub || name }]);
      };
      const leave = () => {
        cross.style.opacity = 0;
        dot.style.opacity = 0;
        hideTip();
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerdown', move);
      svg.addEventListener('pointerleave', leave);
      svg.addEventListener('pointercancel', leave);
    },
  });
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(name)}">
    ${grid}${xlabels}
    <path d="${area}" class="area"/>
    <path d="${line}" class="line"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4.5" class="dot"/>
    <text x="${last[0] + 9}" y="${last[1] + 4}" class="endlbl">${esc(fmt(lastV))}</text>
    <line class="cross" y1="${padT}" y2="${padT + ih}" x1="0" x2="0" style="opacity:0"/>
    <circle class="hdot dot" r="5" cx="0" cy="0" style="opacity:0"/>
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>
  </svg></div>`;
}

// ---------- kolommen ----------
// items: [{label, value, title, current}]
export function columnChart(items, opts) {
  const { w, h = 150, fmt = fmt1, unit = '', name = '', labelEvery = 1 } = opts;
  if (!items.length || items.every((i) => !i.value)) return empty(w, h, opts.emptyText || 'Nog geen data.');
  const padL = 34;
  const padR = 6;
  const padT = 18;
  const padB = 22;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const dom = niceDomain(0, Math.max(...items.map((i) => i.value)), 3, true);
  const slot = iw / items.length;
  const bw = Math.min(24, Math.max(4, slot - 6));
  const Y = (v) => padT + ih - (v / dom.hi) * ih;
  const grid = dom.ticks
    .map((v) => `<line x1="${padL}" x2="${padL + iw}" y1="${r1(Y(v))}" y2="${r1(Y(v))}" class="${v === 0 ? 'base' : 'grid'}"/><text x="${padL - 6}" y="${r1(Y(v)) + 4}" class="ax" text-anchor="end">${esc(fmt(v))}</text>`)
    .join('');
  let cols = '';
  let labels = '';
  let hits = '';
  items.forEach((it, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const y = Y(it.value);
    cols += `<path d="${colPath(x, y, bw, padT + ih - y)}" class="${it.current ? 'col cur' : 'col'}" data-i="${i}"/>`;
    if (it.current && it.value) labels += `<text x="${r1(x + bw / 2)}" y="${r1(y - 5)}" class="cap" text-anchor="middle">${esc(fmt(it.value))}</text>`;
    if (i % labelEvery === (items.length - 1) % labelEvery) labels += `<text x="${r1(x + bw / 2)}" y="${h - 6}" class="ax" text-anchor="middle">${esc(it.label)}</text>`;
    hits += `<rect x="${r1(padL + slot * i)}" y="${padT}" width="${r1(slot)}" height="${ih}" fill="transparent" data-i="${i}"/>`;
  });
  const id = register({
    mount(el) {
      const svg = el.querySelector('svg');
      const colsEls = svg.querySelectorAll('.col');
      const show = (evt) => {
        const i = Number(evt.target.dataset?.i);
        if (!Number.isFinite(i)) return;
        colsEls.forEach((c, j) => c.classList.toggle('hl', j === i));
        const r = evt.target.getBoundingClientRect();
        showTip(r.left + r.width / 2, svg.getBoundingClientRect().top + 10, items[i].title || items[i].label, [{ value: `${fmt(items[i].value)}${unit ? ' ' + unit : ''}`, label: name }]);
      };
      const leave = () => {
        colsEls.forEach((c) => c.classList.remove('hl'));
        hideTip();
      };
      svg.addEventListener('pointerover', show);
      svg.addEventListener('pointerdown', show);
      svg.addEventListener('pointerleave', leave);
    },
  });
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(name)}">${grid}${cols}${labels}${hits}</svg></div>`;
}

// ---------- horizontale balken met adviesband ----------
// rows: [{label, value}] ; band: [lo, hi]
export function hbarChart(rows, opts) {
  const { w, band = null, fmt = fmt1, unit = 'sets' } = opts;
  const rowH = 26;
  const labW = 86;
  const valW = 34;
  const iw = w - labW - valW;
  const max = Math.max(band ? band[1] * 1.15 : 0, ...rows.map((r) => r.value), 1);
  const X = (v) => labW + (v / max) * iw;
  const h = rows.length * rowH + 4;
  let out = '';
  rows.forEach((r, i) => {
    const y = i * rowH + 4;
    const by = y + 7;
    out += `<text x="0" y="${y + 15}" class="lbl">${esc(r.label)}</text>`;
    out += `<rect x="${labW}" y="${by}" width="${iw}" height="10" rx="5" class="track"/>`;
    if (band) out += `<rect x="${r1(X(band[0]))}" y="${by - 3}" width="${r1(X(band[1]) - X(band[0]))}" height="16" rx="3" class="band"/>`;
    out += `<path d="${barPath(labW, by, Math.max(0, X(r.value) - labW), 10)}" class="bar${band && r.value < band[0] ? ' under' : ''}"/>`;
    out += `<text x="${w}" y="${y + 15}" class="val" text-anchor="end">${esc(fmt(r.value))}</text>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Sets per spiergroep">${out}</svg></div>`;
}

// ---------- kalender-heatmap ----------
export function heatmap(cal, opts) {
  const { w } = opts;
  const labW = 20;
  const gap = 3;
  const cell = Math.min(18, Math.floor((w - labW - gap * (cal.weeks - 1)) / cal.weeks));
  const gridW = cal.weeks * cell + (cal.weeks - 1) * gap;
  const topH = 16;
  const h = topH + 7 * cell + 6 * gap;
  const today = todayISO();
  let out = '';
  [0, 2, 4].forEach((d) => (out += `<text x="0" y="${topH + d * (cell + gap) + cell - 4}" class="ax">${DAY_SHORT[d]}</text>`));
  let lastMonth = -1;
  let lastX = -Infinity;
  const cells = [];
  for (let wk = 0; wk < cal.weeks; wk++) {
    const monday = addDays(cal.start, wk * 7);
    const x = labW + wk * (cell + gap);
    // maandlabel bij de eerste week die in die maand begint (en niet te dicht op het vorige label)
    if (monday.getMonth() !== lastMonth) {
      lastMonth = monday.getMonth();
      if (x - lastX >= 30 && x + 24 <= labW + gridW) {
        out += `<text x="${x}" y="11" class="ax">${MONTH_SHORT[monday.getMonth()]}</text>`;
        lastX = x;
      }
    }
    for (let d = 0; d < 7; d++) {
      const iso = toISO(addDays(monday, d));
      if (iso > today) continue;
      const y = topH + d * (cell + gap);
      const m = cal.map[iso];
      const i = cells.length;
      cells.push({ iso, m });
      out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" class="${m ? 'hm-train' : 'hm-empty'}${iso === today ? ' hm-today' : ''}" data-i="${i}"/>`;
    }
  }
  const id = register({
    mount(el) {
      const svg = el.querySelector('svg');
      const show = (evt) => {
        const i = Number(evt.target.dataset?.i);
        if (!Number.isFinite(i)) return;
        const c = cells[i];
        const r = evt.target.getBoundingClientRect();
        const rows = c.m ? c.m.names.map((n) => ({ value: n })) : [{ value: 'Rustdag' }];
        showTip(r.left + r.width / 2, r.top, fmtDate(c.iso), rows);
      };
      svg.addEventListener('pointerover', show);
      svg.addEventListener('pointerdown', show);
      svg.addEventListener('pointerleave', hideTip);
    },
  });
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${labW + gridW} ${h}" width="${labW + gridW}" style="max-width:100%" role="img" aria-label="Trainingskalender">${out}</svg></div>`;
}

// Breedte die een grafiek in een kaart krijgt.
export function chartWidth() {
  const vw = Math.min(window.innerWidth, 560);
  return Math.max(260, Math.floor(vw - 32 - 34));
}
