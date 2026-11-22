// Historie van trainingen.
import { state } from './store.js';
import { ui, go, openSheet, registerActions, toast, btn } from './core.js';
import { EX } from './data.js';
import { CX, FEELING } from './cdata.js';
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
  if (w.style === 'circuit') {
    const c = w.circuit || {};
    return `<button class="row row-btn" data-act="open-workout" data-id="${w.id}">
      <span class="row-ic train">${icon('bolt')}</span>
      <div class="grow">
        <div class="row-t">${esc(w.dayName)}</div>
        <div class="row-s">${esc(fmtDate(w.date))} · ${sm.minutes ? fmtMinutes(sm.minutes) : '–'} · ${c.roundsDone ?? 0}/${c.roundsPlanned ?? 0} rondes${c.rpe ? ' · ' + esc(FEELING[c.rpe - 1]) : ''}</div>
      </div>
      ${icon('right', 'chev')}
    </button>`;
  }
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

const FB = { light: 'te licht', ok: 'goed', heavy: 'te zwaar' };

function circuitDetail(w, sm) {
  const c = w.circuit || {};
  const ids = c.list || Object.keys(c.weights || {});
  return {
    title: w.dayName,
    body: `
      <p class="muted small">${esc(fmtDateLong(w.date))} · fase ${c.phase ?? '–'} · ${c.work ?? '–'}/${c.rest ?? '–'} sec</p>
      <div class="stats3">
        <div><span class="tile-v">${sm.minutes ? fmtMinutes(sm.minutes) : '–'}</span><span class="tile-l">Duur</span></div>
        <div><span class="tile-v">${c.roundsDone ?? 0}/${c.roundsPlanned ?? 0}</span><span class="tile-l">Rondes</span></div>
        <div><span class="tile-v">${c.finisher?.type === 'amrap' ? c.finisher.score : c.rpe ? esc(FEELING[c.rpe - 1]) : '–'}</span><span class="tile-l">${c.finisher?.type === 'amrap' ? 'Finisher-rondes' : 'Gevoel'}</span></div>
      </div>
      ${ids.map((id) => {
        const ex = CX[id];
        if (!ex) return '';
        const kg = c.weights?.[id];
        const load = ex.load === 'bw' ? 'lichaamsgewicht' : kg != null ? (ex.load === 'db2' ? `2 × ${fmtKg(kg)} kg` : `${fmtKg(kg)} kg`) : '';
        return `<div class="detail-ex"><div class="row-t">${esc(ex.name)}</div><div class="row-s">${esc(load)}${c.feedback?.[id] ? ' · ' + FB[c.feedback[id]] : ''}</div></div>`;
      }).join('')}
      ${c.rpe && c.finisher?.type === 'amrap' ? `<p class="small">Gevoel: <b>${esc(FEELING[c.rpe - 1])}</b></p>` : ''}
      ${w.notes ? `<div class="sub-h">Notities</div><p class="notes">${esc(w.notes)}</p>` : ''}
    `,
    foot: btn('Verwijderen', 'delete-workout', { cls: 'ghost danger block', data: { id: w.id } }),
  };
}

export const sheets = {
  'workout-detail'(sh) {
    const w = state.workouts.find((x) => x.id === sh.id);
    if (!w) return { title: 'Training', body: '<p class="empty">Niet gevonden.</p>' };
    const sm = workoutSummary(state, w);
    if (w.style === 'circuit') return circuitDetail(w, sm);
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
