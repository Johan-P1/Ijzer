// Schermen voor de circuitmodus: dashboard, training (voorbeeld + timer), voortgang en schema.
import { state, save } from './store.js';
import { ui, go, openSheet, closeSheet, registerActions, rerender, toast, btn, seg, chips, confirmSheet } from './core.js';
import { CX, WX, PHASES, KNEE_LABEL, FEELING, COOLDOWN, CIRCUIT_GOALS } from './cdata.js';
import { GOALS } from './data.js';
import {
  phaseInfo, nextCircuitDay, estCircuitMinutes, startCircuit, stepOf, remaining, catchUp, goStep, togglePause,
  finishCircuit, unlockAudio, beep, keepAwake, suggestWeight, bodyHint, allowed, generateCircuitProgram, warmupList, awakeSupported,
} from './circuit.js';
import { animSVG } from './anim.js';
import { installBanner, backupBanner, weekCard, consistencyCard, bodyweightCard } from './home.js';
import { weekStreak, bodyweightStats, thisWeek, workoutsBetween } from './stats.js';
import { columnChart, lineChart, chartWidth } from './charts.js';
import { esc, icon, fmt0, fmt1, fmtKg, fmtMinutes, fmtClock, fmtDay, fmtDateLong, todayISO, addDaysISO, signed, isoWeekNumber, parseDate, toISO, addDays, startOfWeek, dayStyle } from './util.js';

const info = (id) => CX[id] || WX[id] || { name: id, cues: [] };
const exName = (id) => info(id).name;
const minutesOf = (w) => (w.finishedAt && w.startedAt ? (w.finishedAt - w.startedAt) / 60000 : 0);

function loadLabel(id, w) {
  const ex = CX[id];
  if (!ex || ex.load === 'bw') return 'Lichaamsgewicht';
  if (w == null) return '';
  return ex.load === 'db2' ? `2 × ${fmtKg(w)} kg` : `${fmtKg(w)} kg`;
}

function greet() {
  const h = new Date().getHours();
  return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
}

// ==================== HOME ====================
export function homeView() {
  const name = state.profile.name?.trim();
  return `
    <header class="topbar">
      <span class="eyebrow">${esc(fmtDateLong(todayISO()))}</span>
      <button class="icon-btn" data-act="go" data-tab="settings" aria-label="Instellingen">${icon('sliders')}</button>
    </header>
    <h1 class="title greet">${greet()}${name ? ', ' + esc(name) : ''}&nbsp;<span class="wave" aria-hidden="true">👋</span></h1>
    <p class="greet-sub">${state.active ? 'Je training loopt nog. Even afmaken?' : 'Klaar om lekker te bewegen?'}</p>
    ${installBanner()}
    ${backupBanner()}
    ${heroCard()}
    ${weekCard()}
    ${tiles()}
    ${bodyweightCard()}
    ${phaseCard()}
    ${consistencyCard()}
  `;
}

function heroCard() {
  const a = state.active;
  if (a?.style === 'circuit') {
    const done = Math.round((a.i / (a.steps.length - 1)) * 100);
    return `<section class="card hero" style="${dayStyle(a.dayId)}">
      <div class="hero-top"><span class="pill live"><i></i>Bezig</span><span class="muted small">${done}% gedaan</span></div>
      <div class="hero-main"><span class="day-badge">${icon('bolt')}</span><div class="grow"><h2 class="hero-title">${esc(a.dayName)}</h2></div></div>
      <div class="progress hero-progress"><span style="width:${done}%"></span></div>
      <div class="hero-actions">${btn('Ga verder', 'go', { cls: 'primary grow', data: { tab: 'train' }, ic: 'bolt' })}</div>
    </section>`;
  }
  const day = nextCircuitDay(state);
  const pi = phaseInfo(state);
  return `<section class="card hero" style="${dayStyle(day.id)}">
    <div class="hero-top"><span class="eyebrow">Volgende training</span><span class="pill">Fase ${pi.phase.n} · week ${Math.min(pi.week, 12)}</span></div>
    <div class="hero-main">
      <span class="day-badge">${icon('bolt')}</span>
      <div class="grow">
        <h2 class="hero-title">${esc(day.name)}</h2>
        <p class="muted small">${esc(day.focus)} · ~${estCircuitMinutes(state, day, pi)} min · ${pi.rounds} rondes</p>
      </div>
    </div>
    <p class="hero-ex">${esc(day.circuit.map(exName).join(' · '))}</p>
    <div class="hero-actions">
      ${btn('Start training', 'c-start', { cls: 'primary grow', data: { day: day.id }, ic: 'bolt' })}
      ${btn('Bekijk', 'c-preview', { data: { day: day.id } })}
    </div>
  </section>`;
}

function tiles() {
  const { start, end } = thisWeek();
  const target = state.settings.trainingDays.length;
  const n = workoutsBetween(state, start, end).length;
  const today = todayISO();
  const mins = workoutsBetween(state, addDaysISO(today, -6), today).reduce((s, w) => s + minutesOf(w), 0);
  const bw = bodyweightStats(state);
  const lost = bw && bw.series.length > 1 ? bw.latest.kg - bw.series[0].y : null;
  return `<div class="tiles">
    <div class="tile"><span class="tile-l">Trainingen</span><span class="tile-v">${n}<small>/${target}</small></span><span class="tile-d muted">deze week</span></div>
    <div class="tile"><span class="tile-l">Actief · 7 dagen</span><span class="tile-v">${fmt0(mins)}<small> min</small></span><span class="tile-d muted">training</span></div>
    <div class="tile"><span class="tile-l">Weekreeks</span><span class="tile-v">${weekStreak(state)}<small> wk</small></span><span class="tile-d muted">weekdoel gehaald</span></div>
    <div class="tile"><span class="tile-l">Gewicht</span><span class="tile-v">${lost == null ? '–' : signed(lost, fmt1)}<small> kg</small></span><span class="tile-d muted">sinds start</span></div>
  </div>`;
}

function phaseCard() {
  const pi = phaseInfo(state);
  const ph = pi.phase;
  if (pi.done) {
    return `<section class="card">
      <div class="card-h"><h3>12 weken afgerond!</h3></div>
      <p>Je hebt alle drie de fases doorlopen. Tijd voor een nieuw blok met andere oefeningen, zodat je lichaam een nieuwe prikkel krijgt.</p>
      ${btn('Start nieuw blok', 'c-newblock', { cls: 'primary block', ic: 'layers' })}
    </section>`;
  }
  const bars = PHASES.map((p) => {
    const pct = pi.week > p.to ? 100 : pi.week < p.from ? 0 : ((pi.week - p.from + 0.5) / 4) * 100;
    return `<div class="ph${p.n === ph.n ? ' cur' : ''}"><span style="width:${pct}%"></span></div>`;
  }).join('');
  const next = PHASES.find((p) => p.n === ph.n + 1);
  return `<section class="card">
    <div class="card-h"><h3>Fase ${ph.n} · ${esc(ph.name)}</h3><span class="muted small">week ${pi.week} van 12</span></div>
    <div class="phases">${bars}</div>
    <div class="ph-l">${PHASES.map((p) => `<span>${esc(p.name)}</span>`).join('')}</div>
    <p class="small">${esc(ph.focus)}</p>
    <p class="foot">Nu: ${ph.work} sec werken / ${ph.rest} sec rust · ${pi.rounds} rondes${pi.light ? ' · lichtere week om te herstellen' : ''}.${next ? ` Vanaf week ${next.from}: ${next.work}/${next.rest} sec.` : ''}</p>
  </section>`;
}

// ==================== TRAINING ====================
export function trainView() {
  const a = state.active;
  if (a?.style === 'circuit') return runner(a);
  return preview();
}

function preview() {
  const pi = phaseInfo(state);
  const days = state.program.days;
  const next = nextCircuitDay(state);
  const day = days.find((d) => d.id === ui.cday) || next;
  const ph = pi.phase;
  const warm = warmupList(state);
  const fin = day.finisher;
  const finText = fin.type === 'tabata'
    ? `Tabata · ${ph.fin} min: 20 sec vol gas, 10 sec rust, afwisselend ${fin.items.map(exName).join(' en ')}.`
    : `AMRAP · ${ph.fin} min: zoveel mogelijk rondes van ${fin.items.map((x) => `${x.dose} ${exName(x.ex).toLowerCase()}`).join(', ')}.`;
  return `
    <h1 class="title">Training</h1>
    ${chips(days.map((d) => [d.id, d.id === next.id ? `${d.name} · volgende` : d.name]), day.id, 'c-pick-day')}
    <div class="gap-s"></div>
    <section class="card">
      <h2 class="h2">${esc(day.name)}</h2>
      <p class="muted small nomt">${esc(day.focus)} · ~${estCircuitMinutes(state, day, pi)} min · fase ${ph.n} (${esc(ph.name)})</p>
      <div class="pills"><span class="pill">${ph.work} s werken</span><span class="pill">${ph.rest} s rust</span><span class="pill">${pi.rounds} rondes</span></div>
      <div class="sub-h nomt">Warming-up · ${Math.round(warm.reduce((s, [, d]) => s + d, 0) / 60)} min</div>
      <p class="small muted">${esc(warm.map(([id]) => exName(id)).join(' · '))}</p>
      <div class="sub-h">Circuit</div>
      ${day.circuit.map((id) => exRow(id, suggestWeight(state, id), bodyHint(state, id))).join('')}
      <div class="sub-h">Finisher</div>
      <p class="small">${esc(finText)}</p>
      <div class="sub-h">Cooling-down · ${Math.round(COOLDOWN.reduce((s, [, d]) => s + d, 0) / 60)} min</div>
      <p class="small muted">${esc(COOLDOWN.map(([id]) => exName(id)).join(' · '))}</p>
    </section>
    ${btn('Start training', 'c-start', { cls: 'primary block', data: { day: day.id }, ic: 'bolt' })}
    <p class="foot center">Zet je telefoon niet op stil, dan hoor je de piepjes. ${awakeSupported() ? 'Het scherm blijft aan tijdens de training.' : 'Tip: zet automatische vergrendeling tijdelijk uit (Instellingen → Beeldscherm en helderheid), anders gaat je scherm uit.'}</p>
  `;
}

function exRow(id, w, hint) {
  return `<button class="row row-btn ex-row" data-act="cx-info" data-id="${id}">
    <span class="mini">${animSVG(id, 'mini-anim')}</span>
    <div class="grow"><div class="row-t">${esc(exName(id))}</div><div class="row-s">${esc(loadLabel(id, w))}${hint ? ' · ' + esc(hint) : ''}</div></div>
    ${icon('info', 'chev')}
  </button>`;
}

// ---------- de timer tijdens de training ----------
const RING = 2 * Math.PI * 54;

function stepLabel(s) {
  switch (s.k) {
    case 'warm': return `Warming-up · ${s.n}/${s.of}`;
    case 'ready': return 'Klaar voor het circuit';
    case 'work': return s.fin ? `Finisher · ${s.n}/${s.of}` : `Ronde ${s.round}/${s.rounds} · oefening ${s.n}/${s.of}`;
    case 'rest': return s.fin ? 'Finisher · rust' : s.roundBreak ? `Rust · daarna ronde ${s.round}` : `Rust · ronde ${s.round}/${s.rounds}`;
    case 'finready': return 'Finisher';
    case 'amrap': return 'Finisher · zoveel mogelijk rondes';
    case 'cool': return `Cooling-down · ${s.n}/${s.of}`;
    default: return 'Klaar!';
  }
}

function weightCtl(a, id) {
  const ex = CX[id];
  if (!ex) return '';
  if (ex.load === 'bw') {
    const h = bodyHint(state, id);
    return h ? `<p class="r-hint">${icon('info')}${esc(h)}</p>` : '';
  }
  return `<div class="r-weight">
    <button data-act="c-w" data-id="${id}" data-d="-1" aria-label="Lichter">${icon('minus')}</button>
    <span>${esc(loadLabel(id, a.weights[id]))}</span>
    <button data-act="c-w" data-id="${id}" data-d="1" aria-label="Zwaarder">${icon('plus')}</button>
  </div>`;
}

function ring(a, s, word) {
  const rem = remaining(a) ?? 0;
  const off = RING * (1 - rem / s.dur);
  return `<div class="r-ring">
    <svg viewBox="0 0 120 120"><circle class="r-track" cx="60" cy="60" r="54"/><circle class="r-prog" cx="60" cy="60" r="54" stroke-dasharray="${RING.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" data-ring-prog/></svg>
    <div class="r-time"><span data-remaining>${fmtRem(rem)}</span><small>${word}</small></div>
  </div>`;
}
const fmtRem = (rem) => (rem >= 60 ? fmtClock(Math.ceil(rem)) : String(Math.ceil(rem)));

function runner(a) {
  catchUp(a);
  const s = stepOf(a);
  const pct = (a.i / (a.steps.length - 1)) * 100;
  const top = `<div class="r-top">
    <button class="icon-btn" data-act="c-stop" aria-label="Stoppen">${icon('x')}</button>
    <div class="r-label">${esc(stepLabel(s))}</div>
    <button class="icon-btn" data-act="c-sound" aria-label="Geluid">${state.settings.sound === false ? icon('x') : icon('sound')}</button>
  </div>
  <div class="r-all"><span style="width:${pct.toFixed(1)}%"></span></div>`;
  const ctl = `<div class="r-ctrl">
    <button class="icon-btn lg" data-act="c-step" data-d="-1" aria-label="Vorige">${icon('back')}</button>
    <button class="r-main${a.paused ? ' paused' : ''}" data-act="c-pause">${icon(a.paused ? 'play' : 'pause')}<span>${a.paused ? 'Verder' : 'Pauze'}</span></button>
    <button class="icon-btn lg" data-act="c-step" data-d="1" aria-label="Volgende">${icon('skip')}</button>
  </div>`;
  let body = '';

  if (s.k === 'warm' || s.k === 'cool' || s.k === 'work') {
    const ex = info(s.ex);
    body = `${ring(a, s, s.k === 'work' ? 'werken' : 'sec')}
      <button class="r-name" data-act="cx-info" data-id="${s.ex}">${esc(ex.name)} ${icon('info')}</button>
      ${animSVG(s.ex, 'r-anim')}
      ${s.k === 'work' ? weightCtl(a, s.ex) : ''}
      <ul class="r-cues">${(ex.cues || []).slice(0, 2).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`;
  } else if (s.k === 'rest') {
    body = `${ring(a, s, 'rust')}
      <div class="r-next">Hierna</div>
      <button class="r-name" data-act="cx-info" data-id="${s.next}">${esc(exName(s.next))} ${icon('info')}</button>
      ${animSVG(s.next, 'r-anim small')}
      ${weightCtl(a, s.next)}
      <p class="r-sub">${s.roundBreak ? 'Even op adem komen. Drink wat water.' : 'Adem rustig door en pak alvast je spullen.'}</p>`;
  } else if (s.k === 'amrap') {
    body = `${ring(a, s, 'AMRAP')}
      <div class="r-amrap">${s.items.map((x) => `<div class="row"><span class="r-dose">${esc(x.dose)}</span><span class="grow">${esc(exName(x.ex))}</span>${CX[x.ex]?.load !== 'bw' ? `<span class="muted small">${esc(loadLabel(x.ex, a.weights[x.ex]))}</span>` : ''}</div>`).join('')}</div>
      <div class="r-score"><button class="icon-btn" data-act="c-score" data-d="-1" aria-label="Min">${icon('minus')}</button><div><b>${a.score}</b><small>rondes</small></div><button class="btn primary" data-act="c-score" data-d="1">${icon('plus')}<span>Ronde</span></button></div>`;
  } else if (s.k === 'ready') {
    const first = a.steps.find((x) => x.k === 'work');
    const list = [...new Set(a.steps.filter((x) => x.k === 'work' && !x.fin).map((x) => x.ex))];
    body = `<div class="r-intro">
        <h2>Pak je gewichten</h2>
        <p class="muted">${a.rounds} rondes · ${first.dur} sec werken / ${a.rest} sec rust. Pas het gewicht aan als dat nodig is.</p>
      </div>
      <div class="r-list">${list.map((id) => `<div class="row"><span class="mini">${animSVG(id, 'mini-anim')}</span><div class="grow"><div class="row-t">${esc(exName(id))}</div>${CX[id]?.load === 'bw' ? `<div class="row-s">${esc(bodyHint(state, id) || 'Lichaamsgewicht')}</div>` : ''}</div>${CX[id]?.load !== 'bw' ? weightCtl(a, id) : ''}</div>`).join('')}</div>
      ${btn('Start circuit', 'c-next', { cls: 'primary block big', ic: 'play' })}`;
    return `<div class="runner">${top}${body}</div>`;
  } else if (s.k === 'finready') {
    const fs = a.steps.slice(a.i + 1).filter((x) => x.fin || x.k === 'amrap');
    const isT = a.finType === 'tabata';
    const mins = isT ? Math.round(fs.reduce((t, x) => t + x.dur, 0) / 60) : Math.round(fs[0].dur / 60);
    const items = isT ? [...new Set(fs.filter((x) => x.k === 'work').map((x) => x.ex))] : fs[0].items.map((x) => x.ex);
    body = `<div class="r-intro">
        <span class="eyebrow">Finisher · ${mins} min</span>
        <h2>${isT ? 'Tabata: 20 sec vol gas, 10 sec rust' : 'Zoveel mogelijk rondes'}</h2>
        <p class="muted">${isT ? 'Afwisselend deze oefeningen. Hier mag je kapot gaan, maar houd je techniek netjes.' : 'Werk de lijst steeds af en tik na elke ronde op +1. Hier mag je kapot gaan, maar houd je techniek netjes.'}</p>
      </div>
      <div class="r-list">${items.map((id) => `<div class="row"><span class="mini">${animSVG(id, 'mini-anim')}</span><div class="grow"><div class="row-t">${esc(exName(id))}</div></div>${CX[id]?.load !== 'bw' ? weightCtl(a, id) : ''}</div>`).join('')}</div>
      ${btn('Start finisher', 'c-next', { cls: 'primary block big', ic: 'play' })}`;
    return `<div class="runner">${top}${body}</div>`;
  } else {
    return `<div class="runner done">${doneView(a)}</div>`;
  }
  return `<div class="runner${a.paused ? ' is-paused' : ''} k-${s.k}">${top}<div class="r-body">${body}</div>${ctl}</div>`;
}

function doneView(a) {
  const mins = Math.round((Date.now() - a.startedAt) / 60000);
  const list = [...new Set(a.steps.filter((x) => x.k === 'work' && !x.fin).map((x) => x.ex))];
  const fbOpts = [['light', 'Te licht'], ['ok', 'Goed'], ['heavy', 'Te zwaar']];
  return `<div class="r-intro">
      <h2>Goed gedaan!</h2>
      <p class="muted">${mins} ${mins === 1 ? 'minuut' : 'minuten'} getraind${a.finType === 'amrap' ? ` · finisher: ${a.score} ${a.score === 1 ? 'ronde' : 'rondes'}` : ''}.</p>
    </div>
    <section class="card">
      <div class="card-h"><h3>Hoe voelde het?</h3></div>
      ${seg(FEELING.map((l, i) => [i + 1, l]), a.rpe ?? '', 'c-rpe')}
    </section>
    <section class="card">
      <div class="card-h"><h3>Per oefening</h3><span class="muted small">bepaalt de volgende keer</span></div>
      ${list.map((id) => `<div class="fb-row"><div class="row-t">${esc(exName(id))} <span class="muted small">${esc(loadLabel(id, a.weights[id]))}</span></div>${seg(fbOpts, a.feedback[id] || '', 'c-fb', { id })}</div>`).join('')}
    </section>
    <section class="card">
      <label class="field nomb"><span>Notitie (optioneel)</span><textarea class="input" rows="2" data-input="c-notes" placeholder="Hoe ging het? Pijntjes?">${esc(a.notes || '')}</textarea></label>
    </section>
    ${btn('Opslaan', 'c-save', { cls: 'primary block big', ic: 'check' })}
    <div class="gap-s"></div>
    ${btn('Training weggooien', 'c-discard', { cls: 'ghost danger block' })}`;
}

// Timer: elke 250 ms bijwerken zonder het hele scherm te hertekenen.
let lastSec = null;
function onStep(a) {
  if (state.settings.sound === false) return;
  const k = stepOf(a).k;
  if (k === 'work' || k === 'amrap') beep(990, 380);
  else if (k === 'rest') beep(520, 380);
  else if (k === 'ready' || k === 'finready' || k === 'done') {
    beep(880, 150);
    setTimeout(() => beep(1180, 260), 180);
  } else beep(760, 260);
}
function runnerTick() {
  const a = state.active;
  if (!a || a.style !== 'circuit' || ui.tab !== 'train') return;
  const before = a.i;
  catchUp(a);
  if (a.i !== before) {
    onStep(a);
    lastSec = null;
    save();
    rerender();
    return;
  }
  const s = stepOf(a);
  const rem = remaining(a);
  if (rem == null) return;
  const el = document.querySelector('[data-remaining]');
  if (el) el.textContent = fmtRem(rem);
  const prog = document.querySelector('[data-ring-prog]');
  if (prog) prog.setAttribute('stroke-dashoffset', (RING * (1 - rem / s.dur)).toFixed(1));
  const sec = Math.ceil(rem);
  if (!a.paused && sec !== lastSec && sec >= 1 && sec <= 3 && state.settings.sound !== false) beep(660, 90, 0.22);
  lastSec = sec;
}
setInterval(runnerTick, 250);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.active?.style === 'circuit') keepAwake(true);
});

// ==================== VOORTGANG ====================
export function progressView() {
  const cw = state.workouts.filter((w) => w.style === 'circuit');
  const cur = startOfWeek(new Date());
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const s = toISO(addDays(cur, -7 * i));
    const e = toISO(addDays(cur, -7 * i + 6));
    const m = cw.filter((w) => w.date >= s && w.date <= e).reduce((t, w) => t + minutesOf(w), 0);
    const wk = isoWeekNumber(parseDate(s));
    weeks.push({ label: String(wk), title: `Week ${wk} · ${fmtDay(s)}`, value: Math.round(m), current: i === 0 });
  }
  const avg = weeks.slice(0, -1).reduce((t, w) => t + w.value, 0) / 11;

  // finisher-scores (AMRAP) per trainingsdag
  const fin = state.program.days.filter((d) => d.finisher.type === 'amrap').map((d) => {
    const pts = cw.filter((w) => w.dayId === d.id && w.circuit?.finisher?.type === 'amrap' && w.circuit.finisher.score > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((w) => ({ t: parseDate(w.date).getTime(), y: w.circuit.finisher.score, sub: `fase ${w.circuit.phase}` }));
    return { d, pts };
  });

  // gewichten per oefening: eerste en laatste keer
  const wmap = {};
  for (const w of [...cw].sort((a, b) => (a.date < b.date ? -1 : 1)))
    for (const [id, kg] of Object.entries(w.circuit?.weights || {})) {
      wmap[id] ||= { first: kg, last: kg, date: w.date };
      wmap[id].last = kg;
      wmap[id].date = w.date;
    }

  const rpe = cw.filter((w) => w.circuit?.rpe).slice(-8);
  return `
    <h1 class="title">Voortgang</h1>
    <section class="card">
      <div class="card-h"><h3>Minuten per week</h3><span class="muted small">12 weken</span></div>
      <div class="figure"><span class="fig-v">${fmt0(avg)}<small> min</small></span><span class="fig-d muted">gemiddeld per week</span></div>
      ${columnChart(weeks, { w: chartWidth(), h: 150, fmt: fmt0, unit: 'min', name: 'Training', labelEvery: 2, emptyText: 'Je trainingsminuten verschijnen hier na je eerste training.' })}
    </section>
    ${fin.map(({ d, pts }) => `<section class="card">
      <div class="card-h"><h3>Finisher ${esc(d.name.replace('Training ', ''))}</h3><span class="muted small">rondes in ${'AMRAP'}</span></div>
      ${pts.length ? `<div class="figure"><span class="fig-v">${pts[pts.length - 1].y}<small> rondes</small></span>${pts.length > 1 ? `<span class="fig-d ${pts[pts.length - 1].y >= pts[0].y ? 'up' : 'down'}">${signed(pts[pts.length - 1].y - pts[0].y, fmt0)} sinds de eerste keer</span>` : ''}</div>` : ''}
      ${lineChart(pts, { w: chartWidth(), h: 140, fmt: fmt0, unit: 'rondes', name: 'Rondes', emptyText: 'Na twee keer deze finisher zie je hier of je fitter wordt.' })}
    </section>`).join('')}
    <section class="card list-card">
      <div class="card-h pad"><h3>Gewichten</h3><span class="muted small">eerste → nu</span></div>
      ${Object.keys(wmap).length ? Object.entries(wmap).map(([id, x]) => `<div class="row">
        <span class="mini">${animSVG(id, 'mini-anim')}</span>
        <div class="grow"><div class="row-t">${esc(exName(id))}</div><div class="row-s">${esc(loadLabel(id, x.first))} → ${esc(loadLabel(id, x.last))}</div></div>
        ${x.last !== x.first ? `<span class="trend ${x.last > x.first ? 'up' : 'down'}">${icon(x.last > x.first ? 'up' : 'down')}${fmtKg(Math.abs(x.last - x.first))}</span>` : ''}
      </div>`).join('') : '<p class="empty">Nog geen trainingen.</p>'}
    </section>
    ${rpe.length ? `<section class="card">
      <div class="card-h"><h3>Hoe het voelde</h3><span class="muted small">laatste ${rpe.length}</span></div>
      <div class="feel">${rpe.map((w) => `<div class="feel-c"><span class="feel-b" style="height:${w.circuit.rpe * 20}%"></span><small>${esc(fmtDay(w.date))}</small></div>`).join('')}</div>
      <p class="foot">Hoger = zwaarder. ${esc(FEELING[0])} → ${esc(FEELING[4])}.</p>
    </section>` : ''}
  `;
}

// ==================== SCHEMA ====================
export function programView() {
  const p = state.program;
  const pi = phaseInfo(state);
  const s = state.settings;
  const goal = CIRCUIT_GOALS[s.goal] || GOALS[s.goal];
  const warm = warmupList(state);
  return `
    <h1 class="title">Schema</h1>
    <section class="card">
      <span class="eyebrow">Circuit · blok ${(p.block || 0) + 1}</span>
      <h2 class="h2">3 trainingen per week</h2>
      <div class="pills">
        <span class="pill accent">${esc(goal?.label || '')}</span>
        <span class="pill">Fase ${pi.phase.n} · ${esc(pi.phase.name)}</span>
        <span class="pill">Week ${Math.min(pi.week, 12)} van 12</span>
      </div>
      <dl class="facts">
        <div><dt>Opbouw</dt><dd>Warming-up → circuit van 5 oefeningen → finisher → cooling-down</dd></div>
        <div><dt>Nu</dt><dd>${pi.phase.work} sec werken / ${pi.phase.rest} sec rust · ${pi.rounds} rondes</dd></div>
        <div><dt>Gewicht</dt><dd>Kies het zo dat de laatste 5–10 seconden zwaar zijn. Na elke training geef je per oefening aan: te licht, goed of te zwaar.</dd></div>
        <div><dt>Knieën</dt><dd>${esc(KNEE_LABEL[s.knees || 'ok'])}${(s.knees || 'ok') === 'pain' ? ': geen oefeningen met diepe kniebuiging' : ''}</dd></div>
        <div><dt>Springen</dt><dd>${s.jumping ? 'Toegestaan' : 'Nee, alleen varianten zonder sprong'}</dd></div>
      </dl>
      <div class="btn-row">${btn('Uitleg', 'help-open', { ic: 'info' })}${btn('Nieuw blok', 'c-newblock', { cls: 'grow', ic: 'layers' })}</div>
    </section>
    ${s.postpartum ? `<section class="card banner warn"><div class="banner-ic">${icon('info')}</div><div class="grow"><div class="row-t">Herstel na de zwangerschap</div>
      <div class="row-s">Stop of maak de oefening lichter bij urineverlies, een zwaar gevoel onderin, een bolling midden op je buik, pijn of bloedverlies. Adem uit op het zware moment.</div></div></section>` : ''}
    ${p.days.map((d) => `<section class="card list-card">
      <div class="card-h pad"><h3>${esc(d.name)}</h3><span class="muted small">${esc(d.focus)} · ~${estCircuitMinutes(state, d, pi)} min</span></div>
      ${d.circuit.map((id, idx) => `<button class="row row-btn ex-row" data-act="cx-info" data-id="${id}" data-day="${d.id}" data-idx="${idx}">
        <span class="mini">${animSVG(id, 'mini-anim')}</span>
        <div class="grow"><div class="row-t">${esc(exName(id))}</div><div class="row-s">${esc(loadLabel(id, suggestWeight(state, id)))}</div></div>${icon('right', 'chev')}
      </button>`).join('')}
      <div class="row pad-row"><div class="grow"><div class="row-t">Finisher</div><div class="row-s">${d.finisher.type === 'tabata' ? 'Tabata: ' + esc(d.finisher.items.map(exName).join(' + ')) : 'AMRAP: ' + esc(d.finisher.items.map((x) => `${x.dose} ${exName(x.ex).toLowerCase()}`).join(', '))}</div></div></div>
    </section>`).join('')}
    <section class="card list-card">
      <div class="card-h pad"><h3>Warming-up</h3><span class="muted small">elke training</span></div>
      ${warm.map(([id, dur]) => `<button class="row row-btn ex-row" data-act="cx-info" data-id="${id}"><span class="mini">${animSVG(id, 'mini-anim')}</span><div class="grow"><div class="row-t">${esc(exName(id))}</div><div class="row-s">${dur} sec</div></div>${icon('info', 'chev')}</button>`).join('')}
    </section>
  `;
}

// ==================== SHEETS ====================
export const sheets = {
  'cx-info'(sh) {
    const ex = info(sh.id);
    const s = state.settings;
    const q = encodeURIComponent(ex.yt || ex.name);
    return {
      title: ex.name,
      body: `${animSVG(sh.id, 'big-anim')}
        <ol class="cues">${(ex.cues || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
        ${ex.kneeTip && (s.knees || 'ok') !== 'ok' ? `<p class="status">${icon('info')}<span><b>Knieën:</b> ${esc(ex.kneeTip)}</span></p>` : ''}
        ${ex.pp && s.postpartum ? `<p class="status low">${icon('info')}<span>${esc(ex.pp)}</span></p>` : ''}
        ${ex.easier || ex.harder ? `<p class="small muted">${ex.easier ? `Makkelijker: ${esc(ex.easier)}. ` : ''}${ex.harder ? `Zwaarder: ${esc(ex.harder)}.` : ''}</p>` : ''}
        <a class="btn block" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">${icon('video')}<span>Bekijk video's op YouTube</span></a>
        <p class="foot center">Opent YouTube (internet nodig). Kies een korte video waarin de techniek rustig wordt voorgedaan.</p>`,
      foot: sh.day && !state.active ? `<div class="btn-row">${btn('Vervangen', 'cx-swap', { data: { day: sh.day, idx: sh.idx }, ic: 'swap' })}${btn('Sluiten', 'sheet-close', { cls: 'primary grow' })}</div>` : btn('Sluiten', 'sheet-close', { cls: 'block' }),
    };
  },
  'cx-pick'(sh) {
    const day = state.program.days.find((d) => d.id === sh.day);
    const list = Object.keys(CX).filter((id) => allowed(id, state) && !day.circuit.includes(id)).sort((a, b) => CX[a].name.localeCompare(CX[b].name, 'nl'));
    return {
      title: 'Oefening vervangen',
      body: `<p class="small muted">Alleen oefeningen die passen bij je knieën, springen en apparatuur.</p>
        ${list.map((id) => `<button class="row row-btn ex-row" data-act="cx-pick-ex" data-id="${id}"><span class="mini">${animSVG(id, 'mini-anim')}</span><div class="grow"><div class="row-t">${esc(CX[id].name)}</div></div>${icon('plus', 'chev')}</button>`).join('')}`,
    };
  },
  'c-stop'() {
    return {
      title: 'Training stoppen?',
      body: '<p>Je kunt afronden en opslaan wat je tot nu toe gedaan hebt, of de training weggooien.</p>',
      foot: `<div class="btn-row">${btn('Verder', 'sheet-close')}${btn('Afronden', 'c-tofinish', { cls: 'primary grow' })}</div><div class="gap-s"></div>${btn('Weggooien', 'c-discard', { cls: 'ghost danger block' })}`,
    };
  },
};

// ==================== ACTIES ====================
const act = () => (state.active?.style === 'circuit' ? state.active : null);

registerActions({
  'c-start'({ day }) {
    unlockAudio();
    if (state.active) return go('train');
    state.active = startCircuit(state, day);
    ui.cday = null;
    save();
    keepAwake(true);
    if (state.settings.sound !== false) beep(880, 160);
    go('train');
  },
  'c-preview'({ day }) {
    ui.cday = day;
    go('train');
  },
  'c-pick-day'({ v }) {
    ui.cday = v;
    rerender();
  },
  'c-pause'() {
    const a = act();
    if (!a) return;
    unlockAudio();
    togglePause(a);
    save();
    rerender();
  },
  'c-step'({ d }) {
    const a = act();
    if (!a) return;
    unlockAudio();
    goStep(a, Number(d));
    onStep(a);
    save();
    rerender();
  },
  'c-next'() {
    const a = act();
    if (!a) return;
    unlockAudio();
    keepAwake(true);
    goStep(a, 1);
    onStep(a);
    save();
    rerender();
  },
  'c-sound'() {
    state.settings.sound = state.settings.sound === false;
    if (state.settings.sound) {
      unlockAudio();
      beep(880, 120);
    }
    save();
    rerender();
    toast(state.settings.sound ? 'Geluid aan' : 'Geluid uit');
  },
  'c-w'({ id, d }) {
    const a = act();
    if (!a) return;
    const st = state.equipment.dbStep || 2.5;
    const cur = a.weights[id] ?? suggestWeight(state, id) ?? st;
    a.weights[id] = Math.min(state.equipment.dbMax || 15, Math.max(st, cur + Number(d) * st));
    save();
    rerender();
  },
  'c-score'({ d }) {
    const a = act();
    if (!a) return;
    a.score = Math.max(0, a.score + Number(d));
    if (Number(d) > 0 && state.settings.sound !== false) beep(1040, 80);
    save();
    rerender();
  },
  'c-fb'({ id, v }) {
    const a = act();
    if (!a) return;
    a.feedback[id] = v;
    save();
    rerender();
  },
  'c-rpe'({ v }) {
    const a = act();
    if (!a) return;
    a.rpe = Number(v);
    save();
    rerender();
  },
  'c-notes'(_, el) {
    const a = act();
    if (!a) return;
    a.notes = el.value;
    save();
  },
  'c-stop'() {
    openSheet('c-stop');
  },
  'c-tofinish'() {
    const a = act();
    if (!a) return closeSheet();
    a.i = a.steps.length - 1;
    a.t0 = Date.now();
    a.paused = false;
    save();
    closeSheet();
  },
  'c-discard'() {
    confirmSheet({
      title: 'Training weggooien?',
      text: 'Deze training wordt niet opgeslagen.',
      ok: 'Weggooien',
      danger: true,
      onOk: () => {
        state.active = null;
        keepAwake(false);
        save();
        go('home');
      },
    });
  },
  'c-save'() {
    const a = act();
    if (!a) return;
    state.workouts.push(finishCircuit(a));
    state.active = null;
    keepAwake(false);
    save();
    go('home');
    toast('Training opgeslagen. Goed gedaan!');
  },
  'cx-info'({ id, day, idx }) {
    openSheet('cx-info', { id, day: day || null, idx: idx != null ? Number(idx) : null });
  },
  'cx-swap'({ day, idx }) {
    openSheet('cx-pick', { day, idx: Number(idx) });
  },
  'cx-pick-ex'({ id }) {
    const sh = ui.sheet;
    const day = state.program.days.find((d) => d.id === sh.day);
    if (day) day.circuit[sh.idx] = id;
    save();
    closeSheet();
    toast(`${CX[id].name} staat in je schema`);
  },
  'c-newblock'() {
    if (state.active) return toast('Rond eerst je training af');
    confirmSheet({
      title: 'Nieuw blok starten?',
      text: 'Je krijgt waar mogelijk andere oefeningen en begint weer bij fase 1. Je historie blijft bewaard.',
      ok: 'Start nieuw blok',
      onOk: () => {
        state.program = generateCircuitProgram(state, (state.program.block || 0) + 1);
        save();
        rerender();
        toast('Nieuw blok staat klaar');
      },
    });
  },
});
