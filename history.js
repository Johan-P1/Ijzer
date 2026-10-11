// Historie van trainingen.
import { state } from './store.js';
import { ui, go, openSheet, registerActions, toast, btn } from './core.js';
import { EX } from './data.js';
import { workoutSummary, computePRs } from './engine.js';
import { esc, icon, fmtKg, fmtDate, fmtDateLong, fmtCompact, fmtMinutes, parseDate, MONTH_LONG } from './util.js';

export function view() {
  const prCount = {};
  for (const e of computePRs(state).events) prCount[e.workoutId] = (prCount[e.workoutId] || 0) + 1;
  const items = [...state.workouts].sort((x, y) => (x.date === y.date ? (y.startedAt || 0) - (x.startedAt || 0) : x.date < y.date ? 1 : -1));

  let html = '';
  let month = '';
  for (const w of items) {
    const m = w.date.slice(0, 7);
    if (m !== month) {
      if (month) html += '</section>';
      month = m;
      const d = parseDate(w.date);
      html += `<div class="sub-h month">${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}</div><section class="card list-card">`;
    }
    html += workoutRow(w, prCount[w.id] || 0);
  }
  if (month) html += '</section>';

  return `
    <h1 class="title">Historie</h1>
    ${html || '<p class="empty">Nog niets gelogd. Je eerste training verschijnt hier.</p>'}
  `;
}

function workoutRow(w, prs) {
  const sm = workoutSummary(state, w);
  return `<button class="row row-btn" data-act="open-workout" data-id="${w.id}">
    <span class="row-ic train">${icon('dumbbell')}</span>
    <div class="grow">
      <div class="row-t">${esc(w.dayName)}${w.deload ? ' <span class="pill">Deload</span>' : ''}</div>
      <div class="row-s">${esc(fmtDate(w.date))} · ${sm.sets} sets · ${fmtCompact(sm.volume)} kg${sm.minutes ? ' · ' + fmtMinutes(sm.minutes) : ''}</div>
    </div>
    ${prs ? `<span class="pr-badge">${icon('trophy')}${prs}</span>` : ''}
    ${icon('right', 'chev')}
  </button>`;
}

export const sheets = {
  'workout-detail'(sh) {
    const w = state.workouts.find((x) => x.id === sh.id);
    if (!w) return { title: 'Training', body: '<p class="empty">Niet gevonden.</p>' };
    const sm = workoutSummary(state, w);
    const prIds = new Set(computePRs(state).events.filter((e) => e.workoutId === w.id).map((p) => p.exId));
    return {
      title: w.dayName,
      body: `
        <p class="muted small">${esc(fmtDateLong(w.date))}${w.deload ? ' · deload' : ''}</p>
        <div class="stats3">
          <div><span class="tile-v">${sm.minutes ? fmtMinutes(sm.minutes) : '–'}</span><span class="tile-l">Duur</span></div>
          <div><span class="tile-v">${sm.sets}</span><span class="tile-l">Sets</span></div>
          <div><span class="tile-v">${fmtCompact(sm.volume)}</span><span class="tile-l">kg volume</span></div>
        </div>
        ${w.exercises
          .map((e) => {
            const ex = EX[e.exId];
            if (!ex) return '';
            return `<div class="detail-ex">
              <div class="row-t">${esc(ex.name)}${prIds.has(e.exId) ? ` <span class="pr-badge">${icon('trophy')}PR</span>` : ''}</div>
              <div class="set-chips">${e.sets.map((s) => `<span>${ex.noLoad ? '' : fmtKg(s.w) + ' × '}${s.r}</span>`).join('')}</div>
            </div>`;
          })
          .join('')}
        ${w.notes ? `<div class="sub-h">Notities</div><p class="notes">${esc(w.notes)}</p>` : ''}
      `,
      foot: `<div class="btn-row">${btn('Verwijderen', 'delete-workout', { cls: 'ghost danger', data: { id: w.id } })}${btn('Bewerken', 'edit-workout', { cls: 'primary grow', data: { id: w.id }, ic: 'edit' })}</div>`,
    };
  },
};

registerActions({
  'open-workout'({ id }) {
    openSheet('workout-detail', { id });
  },
  'edit-workout'({ id }) {
    const w = state.workouts.find((x) => x.id === id);
    if (!w) return;
    if (state.active) return toast('Rond eerst je lopende training af');
    ui.edit = JSON.parse(JSON.stringify(w));
    for (const e of ui.edit.exercises) {
      e.target ||= { sets: e.sets.length, lo: 8, hi: 12 };
      e.sets.forEach((s) => (s.done = true));
    }
    go('train');
  },
});
