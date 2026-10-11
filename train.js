// Training kiezen, loggen en afronden (ook gebruikt om oude trainingen te bewerken).
import { state, save } from './store.js';
import { ui, go, openSheet, closeSheet, registerActions, rerender, toast, btn, stepper, confirmSheet, chips } from './core.js';
import { EX, MUSCLES, MUSCLE_ORDER, EQUIP_LABEL, GOALS } from './data.js';
import {
  nextDay, estMinutes, exerciseSessions, plateBreakdown, warmups, KIND_LABEL, makeEntry, refreshSuggestions,
  computePRs, workoutSummary, schemeFor, defaultRoleFor, isAvailable, barStep, plateOptions, plateCombo, roundLoad,
} from './engine.js';
import { esc, icon, fmtKg, fmt1, fmtDay, fmtDate, fmtCompact, fmtMinutes, parseNum, todayISO } from './util.js';

const doc = () => ui.edit || state.active;
const persist = () => {
  if (!ui.edit) save();
};

export function view() {
  const d = doc();
  return d ? editor(d, !!ui.edit) : picker();
}

// ---------- training kiezen ----------
function picker() {
  const p = state.program;
  const next = nextDay(state);
  const days = (p?.days || [])
    .map((d) => `<button class="row row-btn" data-act="start" data-day="${d.id}">
      <div class="grow">
        <div class="row-t">${esc(d.name)}${next?.id === d.id ? ' <span class="pill accent">Volgende</span>' : ''}</div>
        <div class="row-s">${esc(d.items.map((it) => EX[it.exId]?.name).filter(Boolean).join(' · '))}</div>
      </div>
      <span class="muted small nowrap">~${estMinutes(d)} min</span>${icon('right', 'chev')}
    </button>`)
    .join('');
  return `
    <h1 class="title">Training</h1>
    <section class="card">
      <div class="card-h"><h3>Kies je training</h3><span class="muted small">${esc(p?.name || '')}</span></div>
      ${days}
      <button class="row row-btn" data-act="start" data-day="">
        <div class="grow"><div class="row-t">Vrije training</div><div class="row-s">Stel zelf je oefeningen samen</div></div>${icon('right', 'chev')}
      </button>
    </section>`;
}

// ---------- logger ----------
function editor(d, editing) {
  const total = d.exercises.reduce((s, e) => s + e.sets.length, 0);
  const done = d.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const head = `<div class="wk-head">
    <button class="icon-btn" data-act="${editing ? 'edit-cancel' : 'go'}" data-tab="home" aria-label="Terug">${icon(editing ? 'x' : 'left')}</button>
    <div class="grow center">
      <div class="wk-title">${esc(d.dayName)}</div>
      <div class="wk-sub">${editing ? 'Bewerken · ' + esc(fmtDate(d.date)) : `${icon('clock')}<span data-clock="elapsed" class="tnum"></span><span class="dot-sep"></span>${icon('timer')}rust <span data-clock="rest" class="tnum"></span>`}</div>
    </div>
    <button class="btn sm primary" data-act="${editing ? 'edit-save' : 'finish'}">${editing ? 'Opslaan' : 'Klaar'}</button>
  </div>`;
  const flags = editing
    ? `<label class="field"><span>Datum</span><input type="date" class="input" value="${d.date}" max="${todayISO()}" data-change="edit-date"></label>`
    : `<div class="wk-flags">
        <button class="chip${d.deload ? ' on' : ''}" data-act="toggle-deload">${d.deload ? icon('check') : ''}Deload</button>
        <div class="progress"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
        <span class="muted small tnum">${done}/${total} sets</span>
      </div>`;
  return `
    ${head}
    ${flags}
    ${d.exercises.map((e, i) => exCard(d, e, i, editing)).join('')}
    ${d.exercises.length ? '' : '<p class="empty">Nog geen oefeningen. Voeg er een toe om te beginnen.</p>'}
    <button class="btn block dashed" data-act="add-ex">${icon('plus')}<span>Oefening toevoegen</span></button>
    <section class="card">
      <label class="field nomb"><span>Notities</span><textarea class="input" rows="3" data-input="wk-notes" placeholder="Hoe voelde het? Slaap, energie, pijntjes…">${esc(d.notes || '')}</textarea></label>
    </section>
    ${editing
      ? btn('Training verwijderen', 'delete-workout', { cls: 'ghost danger block', data: { id: d.id }, ic: 'trash' })
      : `${btn('Training afronden', 'finish', { cls: 'primary block', ic: 'check' })}<div class="gap-s"></div>${btn('Training weggooien', 'discard', { cls: 'ghost danger block' })}`}
  `;
}

function unitLabel(ex) {
  if (ex.equip === 'bodyweight') return ex.noLoad ? '' : '+kg';
  if (ex.equip === 'dumbbell') return 'kg p/st';
  return 'kg';
}

function exCard(d, e, i, editing) {
  const ex = EX[e.exId];
  if (!ex) return '';
  const eq = state.equipment;
  const prev = exerciseSessions(state, e.exId, { excludeId: d.id, beforeDate: d.date })[0];
  const open = e.sets.find((s) => !s.done) || e.sets[e.sets.length - 1];
  const curW = open?.w;
  const plates = ex.equip === 'barbell' && curW ? plateBreakdown(curW, eq) : null;
  const combo = ex.equip === 'plate' && curW ? plateCombo(curW, eq) : null;
  const wu = !editing && ex.compound && !e.sets.some((s) => s.done) ? warmups(ex, curW, eq) : [];
  const allDone = e.sets.length > 0 && e.sets.every((s) => s.done);
  const kind = !editing && e.sg?.kind;
  return `<section class="card ex${allDone ? ' ex-done' : ''}">
    <div class="ex-h">
      <div class="grow">
        <h3 class="ex-name">${esc(ex.name)}</h3>
        <div class="ex-target">${e.target.sets} × ${e.target.lo}–${e.target.hi} reps${kind ? ` <button class="kind k-${kind}" data-act="help-open">${kindIcon(kind)}${esc(KIND_LABEL[kind])}</button>` : ''}</div>
      </div>
      <button class="icon-btn" data-act="ex-menu" data-i="${i}" aria-label="Opties">${icon('more')}</button>
    </div>
    ${kind && e.sg.note ? `<p class="ex-note">${esc(e.sg.note)}</p>` : ''}
    ${prev ? `<p class="ex-meta"><span class="muted">Vorige · ${esc(fmtDay(prev.date))}</span> ${prev.sets.map((s) => `${ex.noLoad ? '' : fmtKg(s.w) + '×'}${s.r}`).join('&nbsp; ')}</p>` : ''}
    ${plates ? `<p class="ex-meta">${icon('layers')}<span class="muted">Per kant</span> ${plates.length ? plates.map(fmtKg).join(' + ') : 'lege stang'}</p>` : ''}
    ${combo && combo.length > 1 ? `<p class="ex-meta">${icon('layers')}<span class="muted">Pak samen</span> ${combo.map(fmtKg).join(' + ')} kg</p>` : ''}
    ${wu.length ? `<p class="ex-meta">${icon('flame')}<span class="muted">Opwarmen</span> ${wu.map((s) => `${fmtKg(s.w)}×${s.r}`).join(' · ')}</p>` : ''}
    <div class="set set-h"><span>Set</span><span>${unitLabel(ex)}</span><span>Reps</span><span></span></div>
    ${e.sets.map((s, j) => setRow(ex, s, i, j)).join('')}
    <div class="ex-foot">
      <button class="btn sm ghost" data-act="add-set" data-i="${i}">${icon('plus')}<span>Set</span></button>
      ${e.sets.length ? `<button class="btn sm ghost subtle" data-act="del-set" data-i="${i}">${icon('minus')}<span>Set</span></button>` : ''}
    </div>
  </section>`;
}

function kindIcon(kind) {
  return kind === 'up' ? icon('up') : kind === 'down' || kind === 'deload' ? icon('down') : '';
}

function setRow(ex, s, i, j) {
  const data = { i, j };
  return `<div class="set${s.done ? ' done' : ''}">
    <span class="set-n">${j + 1}</span>
    ${ex.noLoad ? '<span class="set-na">—</span>' : stepper(s.w == null ? '' : fmtKg(s.w), { act: 'w-step', data, input: 'set-w', mode: 'decimal', placeholder: 'kg' })}
    ${stepper(s.r ?? '', { act: 'r-step', data, input: 'set-r', mode: 'numeric', placeholder: '0' })}
    <button class="check" data-act="set-done" data-i="${i}" data-j="${j}" aria-label="Set ${j + 1} afvinken">${icon('check')}</button>
  </div>`;
}

// Eén stap omhoog/omlaag passend bij de apparatuur.
function stepWeight(ex, w, dir) {
  const eq = state.equipment;
  if (ex.equip === 'plate') {
    const sizes = plateOptions(eq);
    if (w == null) return sizes[0] ?? 5;
    if (dir > 0) return sizes.find((s) => s > w + 1e-6) ?? w;
    return [...sizes].reverse().find((s) => s < w - 1e-6) ?? w;
  }
  const st = ex.equip === 'barbell' ? barStep(eq) : eq.dbStep || 2.5;
  if (w == null) return ex.equip === 'barbell' ? eq.barWeight : ex.equip === 'bodyweight' ? 0 : st;
  const min = ex.equip === 'barbell' ? eq.barWeight : 0;
  return Math.max(min, roundLoad(ex, w + dir * st, eq));
}

// Na een gewichtswijziging: ook de volgende, nog niet afgevinkte sets meenemen.
function propagateWeight(e, j, w) {
  for (let k = j + 1; k < e.sets.length; k++) if (!e.sets[k].done) e.sets[k].w = w;
}

// ---------- afronden ----------
function finishedCopy(d) {
  return {
    id: d.id,
    programId: d.programId,
    dayId: d.dayId,
    dayName: d.dayName,
    date: d.date,
    startedAt: d.startedAt,
    finishedAt: d.finishedAt || Date.now(),
    deload: !!d.deload,
    notes: (d.notes || '').trim(),
    exercises: d.exercises
      .map((e) => ({ exId: e.exId, target: e.target, sets: e.sets.filter((s) => s.done && s.r > 0).map((s) => ({ w: s.w ?? 0, r: s.r })) }))
      .filter((e) => e.sets.length),
  };
}

export const sheets = {
  finish() {
    const d = state.active;
    if (!d) return { title: 'Afronden', body: '' };
    const fin = finishedCopy(d);
    const sm = workoutSummary(state, fin);
    const prs = computePRs(state, fin).events.filter((e) => e.workoutId === fin.id);
    const open = d.exercises.reduce((s, e) => s + e.sets.filter((x) => !x.done).length, 0);
    const fillable = d.exercises.reduce((s, e) => s + e.sets.filter((x) => !x.done && x.r > 0 && (x.w != null || EX[e.exId]?.equip === 'bodyweight')).length, 0);
    const mins = (Date.now() - d.startedAt) / 60000;
    return {
      title: 'Training afronden',
      body: `
        <div class="stats3">
          <div><span class="tile-v">${fmtMinutes(mins)}</span><span class="tile-l">Duur</span></div>
          <div><span class="tile-v">${sm.sets}</span><span class="tile-l">Sets</span></div>
          <div><span class="tile-v">${fmtCompact(sm.volume)}</span><span class="tile-l">kg volume</span></div>
        </div>
        ${prs.length ? `<div class="sub-h">Nieuwe records</div>${prs.map((p) => `<div class="row"><span class="row-ic pr">${icon('trophy')}</span><div class="grow"><div class="row-t">${esc(EX[p.exId].name)}</div><div class="row-s">${EX[p.exId].noLoad ? `${p.set.r} reps` : `${fmtKg(p.set.w)} kg × ${p.set.r} · 1RM ≈ ${fmt1(p.value)} kg (was ${fmt1(p.prev)})`}</div></div></div>`).join('')}` : ''}
        ${open ? `<p class="status low">${icon('info')}<span>${open} set${open > 1 ? 's' : ''} niet afgevinkt. Die worden niet opgeslagen.</span></p>${fillable ? `<div class="gap-s"></div>${btn('Vink open sets af', 'check-all', { cls: 'block sm' })}` : ''}` : ''}
        ${sm.sets === 0 ? '<p class="foot">Vink minstens één set af om de training op te slaan.</p>' : ''}
      `,
      foot: `<div class="btn-row">${btn('Verder trainen', 'sheet-close', { cls: 'grow' })}${sm.sets ? btn('Opslaan', 'save-workout', { cls: 'primary grow' }) : ''}</div>`,
    };
  },
  'ex-menu'(sh) {
    const d = doc();
    const e = d?.exercises[sh.i];
    if (!e) return { title: '', body: '' };
    const ex = EX[e.exId];
    return {
      title: ex.name,
      body: `<p class="muted small">${esc(EQUIP_LABEL[ex.equip])} · ${esc(ex.primary.map((m) => MUSCLES[m]).join(', '))}${ex.secondary.length ? ' (+ ' + esc(ex.secondary.map((m) => MUSCLES[m]).join(', ')) + ')' : ''}</p>
        <div class="menu">
          <button class="row row-btn" data-act="ex-replace" data-i="${sh.i}">${icon('swap')}<span class="grow">Vervangen</span></button>
          <button class="row row-btn" data-act="ex-move" data-i="${sh.i}" data-d="-1"${sh.i === 0 ? ' disabled' : ''}>${icon('up')}<span class="grow">Omhoog</span></button>
          <button class="row row-btn" data-act="ex-move" data-i="${sh.i}" data-d="1"${sh.i === d.exercises.length - 1 ? ' disabled' : ''}>${icon('down')}<span class="grow">Omlaag</span></button>
          <button class="row row-btn danger" data-act="ex-remove" data-i="${sh.i}">${icon('trash')}<span class="grow">Verwijderen uit training</span></button>
        </div>`,
    };
  },
  picker(sh) {
    const m = sh.muscle || 'all';
    const list = Object.values(EX)
      .filter((ex) => isAvailable(ex.id, state.equipment))
      .filter((ex) => m === 'all' || ex.primary.includes(m))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    return {
      title: sh.ctx.endsWith('replace') ? 'Oefening vervangen' : 'Oefening toevoegen',
      body: `${chips([['all', 'Alles'], ...MUSCLE_ORDER.map((k) => [k, MUSCLES[k]])], m, 'picker-muscle')}
        <div class="list">${list
          .map((ex) => `<button class="row row-btn" data-act="pick" data-id="${ex.id}">
            <div class="grow"><div class="row-t">${esc(ex.name)}</div><div class="row-s">${esc(ex.primary.map((k) => MUSCLES[k]).join(', '))} · ${esc(EQUIP_LABEL[ex.equip])}</div></div>${icon('plus', 'chev')}
          </button>`)
          .join('')}</div>`,
    };
  },
};

registerActions({
  'set-w'({ i, j }, el) {
    const s = doc()?.exercises[i]?.sets[j];
    if (!s) return;
    s.w = parseNum(el.value);
    persist();
  },
  'set-w-commit'({ i, j }, el) {
    const e = doc()?.exercises[i];
    if (!e) return;
    const w = parseNum(el.value);
    e.sets[j].w = w;
    if (!e.sets[j].done) {
      propagateWeight(e, Number(j), w);
      // velden van volgende sets direct bijwerken zonder hertekenen (focus blijft)
      document.querySelectorAll(`input[data-input="set-w"][data-i="${i}"]`).forEach((inp) => {
        const k = Number(inp.dataset.j);
        if (k > j && !e.sets[k].done) inp.value = w == null ? '' : fmtKg(w);
      });
    }
    persist();
  },
  'set-r'({ i, j }, el) {
    const s = doc()?.exercises[i]?.sets[j];
    if (!s) return;
    const n = parseNum(el.value);
    s.r = n == null ? null : Math.max(0, Math.round(n));
    persist();
  },
  'set-r-commit'() {
    persist();
  },
  'w-step'({ i, j, d }) {
    const e = doc()?.exercises[i];
    if (!e) return;
    const s = e.sets[j];
    s.w = stepWeight(EX[e.exId], s.w, Number(d));
    if (!s.done) propagateWeight(e, Number(j), s.w);
    persist();
    rerender();
  },
  'r-step'({ i, j, d }) {
    const s = doc()?.exercises[i]?.sets[j];
    if (!s) return;
    s.r = Math.max(0, (s.r || 0) + Number(d));
    persist();
    rerender();
  },
  'set-done'({ i, j }) {
    const d = doc();
    const e = d?.exercises[i];
    if (!e) return;
    const s = e.sets[j];
    const ex = EX[e.exId];
    if (!s.done) {
      if (s.w == null && ex.equip !== 'bodyweight') return toast('Vul eerst het gewicht in');
      if (!s.r) return toast('Vul eerst het aantal reps in');
      s.done = true;
      if (!ui.edit) d.lastSetAt = Date.now();
    } else {
      s.done = false;
    }
    persist();
    rerender();
  },
  'add-set'({ i }) {
    const e = doc()?.exercises[i];
    if (!e) return;
    const last = e.sets[e.sets.length - 1];
    e.sets.push({ w: last?.w ?? e.sg?.w ?? null, r: last?.r ?? e.target.lo, done: !!ui.edit });
    persist();
    rerender();
  },
  'del-set'({ i }) {
    const e = doc()?.exercises[i];
    if (!e || !e.sets.length) return;
    e.sets.pop();
    persist();
    rerender();
  },
  'ex-menu'({ i }) {
    openSheet('ex-menu', { i: Number(i) });
  },
  'ex-move'({ i, d }) {
    const list = doc()?.exercises;
    const a = Number(i);
    const b = a + Number(d);
    if (!list || b < 0 || b >= list.length) return;
    [list[a], list[b]] = [list[b], list[a]];
    persist();
    closeSheet();
  },
  'ex-remove'({ i }) {
    const list = doc()?.exercises;
    if (!list) return;
    list.splice(Number(i), 1);
    persist();
    closeSheet();
  },
  'ex-replace'({ i }) {
    openSheet('picker', { ctx: 'workout-replace', i: Number(i) });
  },
  'add-ex'() {
    openSheet('picker', { ctx: 'workout-add' });
  },
  'picker-muscle'({ v }) {
    ui.sheet.muscle = v;
    rerender();
  },
  'toggle-deload'() {
    const d = state.active;
    if (!d) return;
    d.deload = !d.deload;
    refreshSuggestions(state, d);
    save();
    rerender();
  },
  'wk-notes'(_, el) {
    const d = doc();
    if (!d) return;
    d.notes = el.value;
    persist();
  },
  finish() {
    openSheet('finish');
  },
  'check-all'() {
    const d = state.active;
    for (const e of d.exercises) {
      const ex = EX[e.exId];
      for (const s of e.sets) if (!s.done && s.r > 0 && (s.w != null || ex.equip === 'bodyweight')) s.done = true;
    }
    save();
    rerender();
  },
  'save-workout'() {
    const d = state.active;
    if (!d) return;
    const fin = finishedCopy(d);
    if (!fin.exercises.length) return toast('Nog geen sets afgevinkt');
    const prs = computePRs(state, fin).events.filter((e) => e.workoutId === fin.id).length;
    state.workouts.push(fin);
    state.active = null;
    save();
    go('home');
    toast(prs ? `Opgeslagen · ${prs} nieuw${prs > 1 ? 'e records' : ' record'}` : 'Training opgeslagen');
  },
  discard() {
    confirmSheet({
      title: 'Training weggooien?',
      text: 'Alles wat je in deze training hebt ingevuld gaat verloren.',
      ok: 'Weggooien',
      danger: true,
      onOk: () => {
        state.active = null;
        save();
        go('home');
      },
    });
  },
  pick({ id }) {
    const sh = ui.sheet;
    const ctx = sh?.ctx || '';
    if (ctx.startsWith('workout')) {
      const d = doc();
      if (!d) return;
      const opts = { deload: !!d.deload, excludeId: d.id, beforeDate: d.date };
      if (ctx === 'workout-add') {
        const role = defaultRoleFor(id);
        const sc = schemeFor(state.settings.goal, role, id);
        const entry = makeEntry(state, { exId: id, ...sc }, opts);
        if (ui.edit) entry.sets.forEach((s) => (s.done = false));
        d.exercises.push(entry);
      } else {
        const old = d.exercises[sh.i];
        const entry = makeEntry(state, { exId: id, sets: old.target.sets, lo: old.target.lo, hi: old.target.hi }, opts);
        d.exercises[sh.i] = entry;
      }
      persist();
      closeSheet();
      return;
    }
    // schema-context wordt in program.js afgehandeld
    actions_programPick?.(id);
  },
  // ---------- bewerken uit historie ----------
  'edit-date'(_, el) {
    if (ui.edit && el.value) ui.edit.date = el.value;
  },
  'edit-cancel'() {
    ui.edit = null;
    go('history');
  },
  'edit-save'() {
    const d = ui.edit;
    if (!d) return;
    const fin = finishedCopy(d);
    const idx = state.workouts.findIndex((w) => w.id === d.id);
    if (!fin.exercises.length) return toast('Vink minstens één set af');
    if (idx >= 0) state.workouts[idx] = fin;
    save();
    ui.edit = null;
    go('history');
    toast('Wijzigingen opgeslagen');
  },
  'delete-workout'({ id }) {
    confirmSheet({
      title: 'Training verwijderen?',
      text: 'Deze training verdwijnt uit je historie en analyses.',
      ok: 'Verwijderen',
      danger: true,
      onOk: () => {
        state.workouts = state.workouts.filter((w) => w.id !== id);
        save();
        ui.edit = null;
        go('history');
        toast('Training verwijderd');
      },
    });
  },
});

// program.js registreert hier zijn handler voor 'pick' in schema-context
let actions_programPick = null;
export const setProgramPick = (fn) => (actions_programPick = fn);
