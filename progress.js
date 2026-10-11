// Voortgang: weekvolume, spiergroepen en details per oefening.
import { state } from './store.js';
import { ui, registerActions, rerender, chips, seg } from './core.js';
import { EX, GOALS, MUSCLES, MUSCLE_ORDER } from './data.js';
import { weeklySeries, muscleSets, exerciseSeries, repRecords, trainedExercises } from './stats.js';
import { lineChart, columnChart, hbarChart, chartWidth } from './charts.js';
import { esc, icon, fmt0, fmt1, fmtKg, fmtCompact, fmtDay, fmtDate, signed, todayISO, addDaysISO, isoWeekNumber, parseDate, relDay } from './util.js';

export function view() {
  return ui.progressEx && EX[ui.progressEx] ? detail(ui.progressEx) : overview();
}

function overview() {
  const weeks = weeklySeries(state, 12);
  const avg = weeks.slice(0, -1).reduce((s, w) => s + w.volume, 0) / Math.max(1, weeks.length - 1);
  const cols = weeks.map((w) => ({
    label: String(isoWeekNumber(parseDate(w.start))),
    title: `Week ${isoWeekNumber(parseDate(w.start))} · ${fmtDay(w.start)} – ${fmtDay(w.end)}`,
    value: w.volume,
    current: w.current,
  }));
  const goal = GOALS[state.settings.goal];
  const today = todayISO();
  const ms = muscleSets(state, addDaysISO(today, -27), today);
  const rows = MUSCLE_ORDER.map((m) => ({ label: MUSCLES[m], value: (ms[m] || 0) / 4 }));
  const list = trainedExercises(state);

  return `
    <h1 class="title">Voortgang</h1>
    <section class="card">
      <div class="card-h"><h3>Weekvolume</h3><span class="muted small">kg · 12 weken</span></div>
      <div class="figure"><span class="fig-v">${fmtCompact(avg)}<small> kg</small></span><span class="fig-d muted">gemiddeld per week</span></div>
      ${columnChart(cols, { w: chartWidth(), h: 160, fmt: fmtCompact, unit: 'kg', name: 'Volume', labelEvery: 2, emptyText: 'Je weekvolume verschijnt hier na je eerste training.' })}
      <p class="foot">Volume = gewicht × reps, opgeteld over alle sets (dumbbells tellen dubbel).</p>
    </section>

    <section class="card">
      <div class="card-h"><h3>Sets per spiergroep</h3><span class="muted small">gem. per week · 4 wk</span></div>
      ${hbarChart(rows, { w: chartWidth(), band: goal.weekly })}
      <p class="foot"><span class="key band"></span>Advies voor ${esc(goal.label.toLowerCase())}: ${goal.weekly[0]}–${goal.weekly[1]} sets per spiergroep per week.</p>
    </section>

    <section class="card list-card">
      <div class="card-h pad"><h3>Oefeningen</h3><span class="muted small">tik voor details</span></div>
      ${list.length ? list.map((x) => exRow(x)).join('') : '<p class="empty">Nog geen oefeningen gelogd.</p>'}
    </section>
  `;
}

function exRow({ exId, date }) {
  const ex = EX[exId];
  const metric = ex.equip === 'bodyweight' ? 'reps' : 'e1rm';
  const s = exerciseSeries(state, exId, metric);
  const last = s[s.length - 1];
  const base = s.find((p) => p.date >= addDaysISO(todayISO(), -56)) || s[0];
  const d = last && base && last !== base ? last.y - base.y : null;
  const val = last ? (metric === 'reps' ? `${fmt0(last.y)} reps` : `${fmt1(last.y)} kg`) : '–';
  return `<button class="row row-btn" data-act="progress-open" data-id="${exId}">
    <div class="grow"><div class="row-t">${esc(ex.name)}</div><div class="row-s">${esc(relDay(date))} · ${metric === 'reps' ? 'max reps' : '1RM'} ${val}</div></div>
    ${d != null && Math.abs(d) > 0.05 ? `<span class="trend ${d > 0 ? 'up' : 'down'}">${icon(d > 0 ? 'up' : 'down')}${fmt1(Math.abs(d))}</span>` : ''}
    ${icon('right', 'chev')}
  </button>`;
}

const METRICS = {
  e1rm: { label: '1RM', name: 'Geschat 1RM', unit: 'kg', fmt: fmt1 },
  top: { label: 'Zwaarste set', name: 'Zwaarste set', unit: 'kg', fmt: fmtKg },
  volume: { label: 'Volume', name: 'Volume', unit: 'kg', fmt: fmtCompact },
  reps: { label: 'Reps', name: 'Max reps', unit: 'reps', fmt: fmt0 },
};

function detail(exId) {
  const ex = EX[exId];
  const opts = ex.noLoad ? ['reps', 'volume'] : ex.equip === 'bodyweight' ? ['reps', 'e1rm', 'top'] : ['e1rm', 'top', 'volume'];
  const metric = opts.includes(ui.progressMetric) ? ui.progressMetric : opts[0];
  const M = METRICS[metric];
  const range = ui.progressRange;
  const from = range ? addDaysISO(todayISO(), -range) : '0000';
  const all = exerciseSeries(state, exId, metric);
  const series = all.filter((p) => p.date >= from);
  const first = series[0];
  const last = series[series.length - 1];
  const pts = series.map((p) => ({ ...p, sub: p.set ? (ex.noLoad ? `${p.set.r} reps` : `${fmtKg(p.set.w)} kg × ${p.set.r}`) : '' }));
  const rr = repRecords(state, exId);
  const sessions = [...all].reverse().slice(0, 12);
  const bestEver = all.reduce((m, p) => Math.max(m, p.y), 0);

  return `
    <header class="topbar"><button class="btn sm ghost back" data-act="progress-back">${icon('left')}<span>Voortgang</span></button></header>
    <h1 class="title tight">${esc(ex.name)}</h1>
    <p class="muted small mb">${esc(ex.primary.map((m) => MUSCLES[m]).join(', '))}${ex.secondary.length ? ' · ' + esc(ex.secondary.map((m) => MUSCLES[m]).join(', ')) : ''}</p>
    <div class="filters">
      ${seg(opts.map((k) => [k, METRICS[k].label]), metric, 'progress-metric')}
      ${chips([[90, '3 mnd'], [182, '6 mnd'], [365, '1 jaar'], [0, 'Alles']], range, 'progress-range')}
    </div>
    <section class="card">
      <div class="figure">
        <span class="fig-v">${last ? M.fmt(last.y) : '–'}<small> ${M.unit}</small></span>
        ${first && last && first !== last ? `<span class="fig-d ${last.y >= first.y ? 'up' : 'down'}">${signed(last.y - first.y, M.fmt)} ${M.unit} <span class="muted">sinds ${fmtDay(first.date)}</span></span>` : ''}
      </div>
      ${lineChart(pts, { w: chartWidth(), h: 190, fmt: M.fmt, unit: M.unit, name: M.name, emptyText: 'Minimaal twee sessies nodig in deze periode.' })}
      ${bestEver ? `<p class="foot">Beste ooit: ${M.fmt(bestEver)} ${M.unit}${metric === 'e1rm' ? ' · 1RM geschat met de Epley-formule' : ''}</p>` : ''}
    </section>
    ${rr.length ? `<section class="card">
      <div class="card-h"><h3>Rep-records</h3><span class="muted small">zwaarste gewicht per aantal reps</span></div>
      <table class="tbl"><thead><tr><th>Reps</th><th>Gewicht</th><th>Datum</th></tr></thead><tbody>
      ${rr.map((r) => `<tr><td>${r.reps}+</td><td class="tnum">${fmtKg(r.w)} kg</td><td class="muted">${esc(fmtDay(r.date))}</td></tr>`).join('')}
      </tbody></table>
    </section>` : ''}
    <section class="card list-card">
      <div class="card-h pad"><h3>Sessies</h3></div>
      ${sessions.length ? sessions.map((s) => `<div class="row">
        <div class="grow"><div class="row-t">${esc(fmtDate(s.date))}</div>
        <div class="set-chips">${s.sets.map((x) => `<span>${ex.noLoad ? '' : fmtKg(x.w) + ' × '}${x.r}</span>`).join('')}</div></div>
        <span class="muted small tnum nowrap">${M.fmt(s.y)} ${M.unit}</span>
      </div>`).join('') : '<p class="empty">Nog geen sessies.</p>'}
    </section>
  `;
}

registerActions({
  'progress-open'({ id }) {
    ui.progressEx = id;
    rerender();
    window.scrollTo(0, 0);
  },
  'progress-back'() {
    ui.progressEx = null;
    rerender();
    window.scrollTo(0, 0);
  },
  'progress-metric'({ v }) {
    ui.progressMetric = v;
    rerender();
  },
  'progress-range'({ v }) {
    ui.progressRange = Number(v);
    rerender();
  },
});
