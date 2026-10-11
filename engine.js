// Trainingslogica: schema's genereren, gewichten afronden op jouw apparatuur,
// progressiesuggesties (dubbele progressie), opwarmsets, 1RM en records.
import { EX, GOALS, SPLITS } from './data.js';
import { uid, todayISO, parseDate, weekKey, fmtKg, daysBetween } from './util.js';

const EPS = 1e-6;

// ---------- apparatuur ----------
export function isAvailable(exId, eq) {
  const ex = EX[exId];
  if (!ex) return false;
  if (!(ex.needs || []).every((n) => eq[n] !== false)) return false;
  if (ex.equip === 'dumbbell' && !(eq.dbMax > 0)) return false;
  if (ex.equip === 'plate' && plateSizes(eq).length === 0) return false;
  return true;
}

function pickAvailable(exId, eq) {
  if (isAvailable(exId, eq)) return exId;
  for (const a of EX[exId]?.alt || []) if (isAvailable(a, eq)) return a;
  return null;
}

export function plateSizes(eq) {
  return Object.entries(eq.plates || {})
    .filter(([, n]) => n > 0)
    .map(([kg]) => Number(kg))
    .sort((a, b) => a - b);
}

// Gewichten die je met 1 of 2 schijven in je handen kunt houden (bijv. 10 + 2,5).
export function plateOptions(eq) {
  const inv = Object.entries(eq.plates || {}).filter(([, n]) => n > 0).map(([kg, n]) => [Number(kg), n]);
  const set = new Set();
  for (const [a, na] of inv) {
    set.add(a);
    for (const [b] of inv) if (b < a || (b === a && na >= 2)) set.add(+(a + b).toFixed(3));
  }
  return [...set].sort((a, b) => a - b);
}

// Welke schijven pak je voor een plate-oefening? [10, 2.5] of [10]
export function plateCombo(w, eq) {
  const inv = Object.entries(eq.plates || {}).filter(([, n]) => n > 0).map(([kg, n]) => [Number(kg), n]).sort((a, b) => b[0] - a[0]);
  for (const [a] of inv) if (Math.abs(a - w) < EPS) return [a];
  for (const [a, na] of inv) for (const [b] of inv) if ((b < a || (b === a && na >= 2)) && Math.abs(a + b - w) < EPS) return [a, b];
  return null;
}

// Kleinste stap op de stang = kleinste schijf waarvan je een paar hebt, × 2.
export function barStep(eq) {
  const pairs = Object.entries(eq.plates || {})
    .filter(([, n]) => n >= 2)
    .map(([kg]) => Number(kg));
  return pairs.length ? Math.min(...pairs) * 2 : 5;
}

export function barMax(eq) {
  const total = Object.entries(eq.plates || {}).reduce((s, [kg, n]) => s + Number(kg) * (n - (n % 2)), 0);
  return eq.barWeight + total;
}

export function platesTotal(eq) {
  return Object.entries(eq.plates || {}).reduce((s, [kg, n]) => s + Number(kg) * n, 0);
}

function roundTo(v, step, dir) {
  const k = v / step;
  const r = dir === 'down' ? Math.floor(k + EPS) : dir === 'up' ? Math.ceil(k - EPS) : Math.round(k);
  return +(r * step).toFixed(3);
}

// Rond een gewicht af naar iets wat je met jouw spullen écht kunt laden.
export function roundLoad(ex, w, eq, dir = 'nearest') {
  if (w == null) return null;
  switch (ex.equip) {
    case 'barbell': {
      const bar = eq.barWeight;
      const v = bar + roundTo(Math.max(0, w - bar), barStep(eq), dir);
      return Math.min(v, barMax(eq));
    }
    case 'dumbbell': {
      const st = eq.dbStep || 2.5;
      return Math.min(Math.max(roundTo(w, st, dir), st), eq.dbMax);
    }
    case 'plate': {
      const sizes = plateOptions(eq);
      if (!sizes.length) return w;
      if (dir === 'down') return [...sizes].reverse().find((s) => s <= w + EPS) ?? sizes[0];
      if (dir === 'up') return sizes.find((s) => s >= w - EPS) ?? sizes[sizes.length - 1];
      return sizes.reduce((best, s) => (Math.abs(s - w) < Math.abs(best - w) ? s : best), sizes[0]);
    }
    default: {
      if (ex.noLoad) return 0;
      return Math.max(0, roundTo(w, eq.dbStep || 2.5, dir));
    }
  }
}

// Eén stap zwaarder, of null als je aan het maximum van je apparatuur zit.
export function nextLoad(ex, w, eq) {
  switch (ex.equip) {
    case 'barbell': {
      const n = w + barStep(eq);
      return n <= barMax(eq) + EPS ? n : null;
    }
    case 'dumbbell': {
      const n = w + (eq.dbStep || 2.5);
      return n <= eq.dbMax + EPS ? n : null;
    }
    case 'plate':
      return plateOptions(eq).find((s) => s > w + EPS) ?? null;
    default:
      return ex.noLoad ? null : w + (eq.dbStep || 2.5);
  }
}

// Welke schijven per kant? Geeft null als het niet exact kan.
export function plateBreakdown(w, eq) {
  let per = (w - eq.barWeight) / 2;
  if (per < -EPS) return null;
  const out = [];
  const sizes = Object.entries(eq.plates || {})
    .map(([kg, n]) => ({ kg: Number(kg), pairs: Math.floor(n / 2) }))
    .filter((p) => p.pairs > 0)
    .sort((a, b) => b.kg - a.kg);
  for (const p of sizes) {
    let n = p.pairs;
    while (n > 0 && per >= p.kg - EPS) {
      out.push(p.kg);
      per -= p.kg;
      n--;
    }
  }
  return Math.abs(per) < EPS ? out : null;
}

export function warmups(ex, w, eq) {
  if (ex.equip !== 'barbell' || !w) return [];
  const bar = eq.barWeight;
  if (w < bar + 20) return [];
  const out = [];
  for (const [p, r] of [[0, 10], [0.5, 5], [0.7, 3], [0.85, 1]]) {
    const x = p === 0 ? bar : roundLoad(ex, w * p, eq, 'down');
    if (x < w - EPS && !out.some((o) => Math.abs(o.w - x) < EPS)) out.push({ w: x, r });
  }
  return out;
}

// ---------- belasting, 1RM, volume ----------
// Effectieve belasting van één set (dumbbell = per dumbbell).
export function loadOf(ex, w, bw) {
  if (ex.equip === 'bodyweight') return (ex.bw || 0) * (bw || 0) + (w || 0);
  return w || 0;
}
export function e1rm(load, reps) {
  if (!reps || reps <= 0 || !load) return 0;
  if (reps === 1) return load;
  return load * (1 + Math.min(reps, 12) / 30); // Epley
}
// Totaal verplaatst gewicht van een set (beide dumbbells tellen mee).
export function setTonnage(ex, s, bw) {
  if (!s.r) return 0;
  const mult = ex.equip === 'dumbbell' ? 2 : 1;
  return loadOf(ex, s.w, bw) * mult * s.r;
}

export function bodyweightAt(state, iso) {
  const list = state.bodyweight || [];
  let best = null;
  for (const b of list) if (b.date <= iso && (!best || b.date > best.date)) best = b;
  return (best || list[list.length - 1])?.kg ?? 80;
}

// ---------- schema's ----------
export function schemeFor(goal, role, exId) {
  const g = GOALS[goal] || GOALS.hypertrophy;
  const s = { ...(g[role] || g.accessory) };
  // Deadlift is zwaar voor je herstel: één set minder dan andere hoofdoefeningen.
  if (exId === 'deadlift' && role === 'main') s.sets = Math.max(2, s.sets - 1);
  return s;
}

export function generateProgram({ goal, split }, eq) {
  const sp = SPLITS[split];
  const days = sp.template.map((d, i) => {
    const items = [];
    for (const [exId, role] of d.ex) {
      const id = pickAvailable(exId, eq);
      if (!id || items.some((it) => it.exId === id)) continue;
      const s = schemeFor(goal, role, id);
      items.push({ exId: id, role, sets: s.sets, lo: s.lo, hi: s.hi });
    }
    return { id: 'd' + (i + 1), name: d.name, items };
  });
  return {
    id: uid(),
    name: sp.label,
    split,
    goal,
    createdAt: Date.now(),
    startDate: todayISO(),
    deloadEvery: GOALS[goal].deloadEvery,
    days,
  };
}

// Doel wisselen maar je oefeningen houden: sets/reps opnieuw instellen per rol.
export function applyGoal(program, goal) {
  program.goal = goal;
  program.deloadEvery = GOALS[goal].deloadEvery;
  for (const d of program.days)
    for (const it of d.items) {
      const s = schemeFor(goal, it.role, it.exId);
      Object.assign(it, { sets: s.sets, lo: s.lo, hi: s.hi });
    }
}

export function defaultRoleFor(exId) {
  return EX[exId]?.compound ? 'secondary' : 'accessory';
}

export function estMinutes(day) {
  const per = { main: 3.5, secondary: 2.5, accessory: 2 };
  const m = day.items.reduce((s, it) => s + it.sets * (per[it.role] || 2.5), 0) + 6;
  return Math.round(m / 5) * 5;
}

export function plannedMuscleSets(program) {
  const out = {};
  for (const d of program.days)
    for (const it of d.items) {
      const ex = EX[it.exId];
      if (!ex) continue;
      for (const m of ex.primary) out[m] = (out[m] || 0) + it.sets;
      for (const m of ex.secondary) out[m] = (out[m] || 0) + it.sets * 0.5;
    }
  return out;
}

// ---------- geschiedenis per oefening ----------
function sortedWorkouts(state, dir = -1) {
  return [...state.workouts].sort((a, b) =>
    a.date === b.date ? dir * ((a.startedAt || 0) - (b.startedAt || 0)) : a.date < b.date ? -dir : dir
  );
}

// Sessies (nieuwste eerst) met alleen de afgeronde sets.
export function exerciseSessions(state, exId, { excludeId = null, beforeDate = null } = {}) {
  const out = [];
  for (const w of sortedWorkouts(state, -1)) {
    if (w.id === excludeId) continue;
    if (beforeDate && w.date > beforeDate) continue;
    for (const e of w.exercises) {
      if (e.exId !== exId) continue;
      const sets = e.sets.filter((s) => s.done !== false && s.r > 0);
      if (sets.length) out.push({ workoutId: w.id, date: w.date, deload: !!w.deload, sets });
    }
  }
  return out;
}

// ---------- programma-cyclus ----------
export function nextDay(state) {
  const p = state.program;
  if (!p || !p.days.length) return null;
  // bij een nieuw blok (prevId) loopt de rotatie gewoon door
  const ids = [p.id, p.prevId].filter(Boolean);
  const last = sortedWorkouts(state, -1).find((w) => ids.includes(w.programId) && w.dayId && p.days.some((d) => d.id === w.dayId));
  if (!last) return p.days[0];
  const i = p.days.findIndex((d) => d.id === last.dayId);
  return p.days[(i + 1) % p.days.length];
}

export function cycleInfo(state) {
  const p = state.program;
  if (!p) return { week: 1, every: 6, deload: false };
  const every = p.deloadEvery || 6;
  const thisWeek = weekKey(todayISO());
  const weeks = new Set(
    state.workouts.filter((w) => w.programId === p.id && weekKey(w.date) < thisWeek).map((w) => weekKey(w.date))
  );
  const week = (weeks.size % every) + 1;
  return { week, every, deload: week === every };
}

// ---------- slimme suggesties (dubbele progressie) ----------
// Zit je bij alle sets aan de bovenkant van je rep-bereik → zwaarder.
// Zit je ertussen → zelfde gewicht, +1 rep. Twee keer onder het bereik → 10% terug.
export function suggest(state, item, { deload = false, excludeId = null, beforeDate = null } = {}) {
  const ex = EX[item.exId];
  const eq = state.equipment;
  const sessions = exerciseSessions(state, item.exId, { excludeId, beforeDate }).filter((s) => !s.deload);
  const sets = deload ? Math.max(2, Math.ceil(item.sets / 2)) : item.sets;
  const fill = (r) => Array(sets).fill(r);
  const last = sessions[0];

  if (!last) {
    const est = estimateStart(state, ex, { excludeId, beforeDate });
    if (est) {
      return {
        kind: 'new',
        w: est.w,
        reps: fill(item.lo),
        sets,
        note: `Nieuw: startgewicht geschat op basis van je ${EX[est.from].name} (${fmtKg(est.base)} kg). Voelt het te licht of te zwaar? Pas het aan.`,
      };
    }
    return {
      kind: 'new',
      w: ex.equip === 'bodyweight' ? 0 : null,
      reps: fill(item.lo),
      sets,
      note: ex.equip === 'bodyweight'
        ? `Eerste keer: doe ${item.lo}–${item.hi} reps per set, met nog 1–2 reps over.`
        : `Eerste keer: kies een gewicht waarmee je ${item.lo}–${item.hi} reps haalt, met nog 1–2 reps over.`,
    };
  }

  const W = Math.max(...last.sets.map((s) => s.w || 0));
  const work = last.sets.filter((s) => (s.w || 0) >= W - EPS);
  const top = work.slice(0, item.sets);
  const hitTop = work.length >= item.sets && top.every((s) => s.r >= item.hi);
  const missed = work.some((s) => s.r < item.lo);

  if (deload) {
    const w = ex.equip === 'bodyweight' ? W : roundLoad(ex, W * 0.9, eq, 'down');
    return { kind: 'deload', w, reps: fill(item.lo), sets, note: 'Deload: lichter en minder sets. Laat je lichaam herstellen, dan ga je er straks harder doorheen.' };
  }

  if (hitTop) {
    const nw = nextLoad(ex, W, eq);
    if (nw == null) {
      const r = item.hi + 2;
      return { kind: 'max', w: W, reps: fill(r), sets, note: ex.noLoad
        ? `Alle reps gehaald. Ga voor ${r} reps of maak het zwaarder met een langzamer tempo.`
        : `Je zit op het maximum van je apparatuur (${fmtKg(W)} kg). Ga voor ${r} reps, of laat het gewicht in 3 tellen zakken.` };
    }
    // Is de volgende stap een grote sprong (>20%)? Eerst verder opbouwen in reps.
    const jump = (nw - W) / Math.max(W, 1);
    const ext = item.hi + 3;
    if (jump > 0.2 && W > 0 && !top.every((s) => s.r >= ext)) {
      const reps = Array.from({ length: sets }, (_, i) => Math.min(ext, ((work[i] || work[work.length - 1]).r || item.hi) + 1));
      return { kind: 'reps', w: W, reps, sets, note: `De volgende stap (+${fmtKg(nw - W)} kg) is een grote sprong. Bouw eerst op naar ${ext} reps per set.` };
    }
    return { kind: 'up', w: nw, reps: fill(item.lo), sets, delta: nw - W, note: `Vorige keer alle sets op ${item.hi} reps of meer. Tijd voor +${fmtKg(nw - W)} kg.` };
  }

  if (missed) {
    const prev = sessions[1];
    const prevW = prev ? Math.max(...prev.sets.map((s) => s.w || 0)) : null;
    const prevMissed = prev && Math.abs(prevW - W) < EPS && prev.sets.some((s) => (s.w || 0) >= W - EPS && s.r < item.lo);
    if (prevMissed && ex.equip !== 'bodyweight') {
      const dw = roundLoad(ex, W * 0.9, eq, 'down');
      if (dw < W - EPS) {
        return { kind: 'down', w: dw, reps: fill(item.lo + 1), sets, note: `Twee keer onder de ${item.lo} reps op ${fmtKg(W)} kg. Even terug naar ${fmtKg(dw)} kg en opnieuw opbouwen.` };
      }
    }
    const reps = Array.from({ length: sets }, (_, i) => Math.max(item.lo, ((work[i] || work[work.length - 1]).r || 0) + 1));
    return { kind: 'same', w: W, reps: reps.map((r) => Math.min(r, item.hi)), sets, note: `Zelfde gewicht. Doel: in elke set minstens ${item.lo} reps.` };
  }

  const reps = Array.from({ length: sets }, (_, i) => Math.min(item.hi, ((work[i] || work[work.length - 1]).r || item.lo) + 1));
  return { kind: 'reps', w: W, reps, sets, note: `Zelfde gewicht, probeer per set 1 rep meer (tot ${item.hi}).` };
}

// Laatste werkgewicht (zwaarste set van de laatste normale sessie).
export function workingWeight(state, exId, opts = {}) {
  const s = exerciseSessions(state, exId, opts).find((x) => !x.deload);
  return s ? Math.max(...s.sets.map((x) => x.w || 0)) : null;
}

// Startgewicht voor een oefening die je nog nooit deed, afgeleid van een verwante lift.
function estimateStart(state, ex, opts) {
  for (const [from, factor] of ex.est || []) {
    const base = workingWeight(state, from, opts);
    if (base == null || (!base && ex.equip !== 'bodyweight')) continue;
    return { w: roundLoad(ex, base * factor, state.equipment, 'down'), from, base };
  }
  return null;
}

export const KIND_LABEL = {
  new: 'Nieuw',
  up: 'Zwaarder',
  reps: '+1 rep',
  same: 'Vasthouden',
  down: 'Terugschakelen',
  max: 'Max gewicht',
  deload: 'Deload',
};

// ---------- trainingen opbouwen ----------
export function makeEntry(state, item, opts = {}) {
  const sg = suggest(state, item, opts);
  return {
    key: uid(),
    exId: item.exId,
    target: { sets: sg.sets, lo: item.lo, hi: item.hi },
    sg: { kind: sg.kind, note: sg.note, w: sg.w },
    sets: Array.from({ length: sg.sets }, (_, i) => ({ w: sg.w, r: sg.reps[i], done: false })),
  };
}

export function startWorkout(state, dayId) {
  const p = state.program;
  const day = p?.days.find((d) => d.id === dayId) || null;
  const deload = !!(day && cycleInfo(state).deload);
  return {
    id: uid(),
    programId: day ? p.id : null,
    dayId: day ? day.id : null,
    dayName: day ? day.name : 'Vrije training',
    date: todayISO(),
    startedAt: Date.now(),
    lastSetAt: null,
    deload,
    notes: '',
    exercises: day ? day.items.map((it) => makeEntry(state, it, { deload })) : [],
  };
}

// Pas suggesties opnieuw toe (bijv. als je de deload-schakelaar omzet). Afgevinkte sets blijven staan.
export function refreshSuggestions(state, workout) {
  for (const e of workout.exercises) {
    if (e.sets.some((s) => s.done)) continue;
    const item = { exId: e.exId, sets: itemSetsFor(state, workout, e), lo: e.target.lo, hi: e.target.hi };
    const fresh = makeEntry(state, item, { deload: workout.deload, excludeId: workout.id });
    Object.assign(e, { target: fresh.target, sg: fresh.sg, sets: fresh.sets });
  }
}
function itemSetsFor(state, workout, e) {
  const day = state.program?.days.find((d) => d.id === workout.dayId);
  const it = day?.items.find((i) => i.exId === e.exId);
  return it ? it.sets : e.target.sets;
}

// ---------- records ----------
// Loopt chronologisch door alle trainingen; een record = hoger geschat 1RM dan ooit.
export function computePRs(state, extraWorkout = null) {
  const all = extraWorkout ? [...state.workouts.filter((w) => w.id !== extraWorkout.id), extraWorkout] : state.workouts;
  const ws = [...all].sort((a, b) => (a.date === b.date ? (a.startedAt || 0) - (b.startedAt || 0) : a.date < b.date ? -1 : 1));
  const best = {};
  const events = [];
  for (const w of ws) {
    const bw = bodyweightAt(state, w.date);
    for (const e of w.exercises) {
      const ex = EX[e.exId];
      if (!ex) continue;
      let be = 0;
      let bset = null;
      for (const s of e.sets) {
        if (s.done === false || !s.r) continue;
        const v = ex.noLoad ? s.r : e1rm(loadOf(ex, s.w, bw), s.r);
        if (v > be) { be = v; bset = s; }
      }
      if (!bset) continue;
      const b = best[e.exId];
      if (b && be > b.value + 0.05) {
        events.push({ workoutId: w.id, date: w.date, exId: e.exId, value: be, prev: b.value, set: { w: bset.w, r: bset.r } });
      }
      if (!b || be > b.value) best[e.exId] = { value: be, date: w.date, set: { w: bset.w, r: bset.r } };
    }
  }
  return { events, best };
}

export function workoutSummary(state, w) {
  const bw = bodyweightAt(state, w.date);
  let sets = 0;
  let volume = 0;
  for (const e of w.exercises) {
    const ex = EX[e.exId];
    if (!ex) continue;
    for (const s of e.sets) {
      if (s.done === false || !s.r) continue;
      sets++;
      volume += setTonnage(ex, s, bw);
    }
  }
  const minutes = w.finishedAt && w.startedAt ? (w.finishedAt - w.startedAt) / 60000 : null;
  return { sets, volume, minutes };
}

export function daysSince(iso) {
  return daysBetween(iso, todayISO());
}
