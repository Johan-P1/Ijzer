// Analyses voor dashboard en voortgang.
import { EX, MUSCLE_ORDER, GOALS } from './data.js';
import { bodyweightAt, setTonnage, e1rm, loadOf, computePRs, workoutSummary } from './engine.js';
import { todayISO, addDaysISO, weekKey, parseDate, toISO, addDays, startOfWeek, daysBetween } from './util.js';

const doneSets = (e) => e.sets.filter((s) => s.done !== false && s.r > 0);

export function workoutsBetween(state, from, to) {
  return state.workouts.filter((w) => w.date >= from && w.date <= to);
}

export function volumeBetween(state, from, to) {
  let v = 0;
  for (const w of workoutsBetween(state, from, to)) v += workoutSummary(state, w).volume;
  return v;
}

// Sets per spiergroep (primair telt 1, secundair 0,5).
export function muscleSets(state, from, to) {
  const out = Object.fromEntries(MUSCLE_ORDER.map((m) => [m, 0]));
  for (const w of workoutsBetween(state, from, to))
    for (const e of w.exercises) {
      const ex = EX[e.exId];
      if (!ex) continue;
      const n = doneSets(e).length;
      for (const m of ex.primary) out[m] += n;
      for (const m of ex.secondary) out[m] += n * 0.5;
    }
  return out;
}

export function thisWeek() {
  const start = toISO(startOfWeek(new Date()));
  return { start, end: addDaysISO(start, 6) };
}

// Laatste n weken, oudste eerst.
export function weeklySeries(state, n = 12) {
  const cur = startOfWeek(new Date());
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = toISO(addDays(cur, -7 * i));
    const e = addDaysISO(s, 6);
    const ws = workoutsBetween(state, s, e);
    let volume = 0;
    let sets = 0;
    for (const w of ws) {
      const sm = workoutSummary(state, w);
      volume += sm.volume;
      sets += sm.sets;
    }
    out.push({ start: s, end: e, volume, sets, workouts: ws.length, current: i === 0 });
  }
  return out;
}

// Aaneengesloten weken (t/m vorige week, plus deze week als hij al gehaald is) waarin je je weekdoel haalde.
export function weekStreak(state) {
  const target = Math.max(1, state.settings.trainingDays.length);
  const counts = {};
  for (const w of state.workouts) counts[weekKey(w.date)] = (counts[weekKey(w.date)] || 0) + 1;
  let wk = startOfWeek(new Date());
  let streak = 0;
  if ((counts[toISO(wk)] || 0) >= target) streak++;
  for (;;) {
    wk = addDays(wk, -7);
    if ((counts[toISO(wk)] || 0) >= target) streak++;
    else break;
  }
  return streak;
}

// Beste waarde per sessie voor één oefening (deloads niet meegeteld).
export function exerciseSeries(state, exId, metric = 'e1rm') {
  const ex = EX[exId];
  const out = [];
  const ws = [...state.workouts].sort((a, b) => (a.date === b.date ? (a.startedAt || 0) - (b.startedAt || 0) : a.date < b.date ? -1 : 1));
  for (const w of ws) {
    if (w.deload) continue;
    const bw = bodyweightAt(state, w.date);
    for (const e of w.exercises) {
      if (e.exId !== exId) continue;
      const sets = doneSets(e);
      if (!sets.length) continue;
      let v = 0;
      let best = null;
      if (metric === 'e1rm') {
        for (const s of sets) {
          const x = ex.noLoad ? s.r : e1rm(loadOf(ex, s.w, bw), s.r);
          if (x > v) { v = x; best = s; }
        }
      } else if (metric === 'top') {
        for (const s of sets) if ((s.w || 0) > v || !best) { v = s.w || 0; best = s; }
      } else if (metric === 'reps') {
        for (const s of sets) if (s.r > v) { v = s.r; best = s; }
      } else {
        for (const s of sets) v += setTonnage(ex, s, bw);
      }
      out.push({ date: w.date, t: parseDate(w.date).getTime(), y: v, set: best, sets, workoutId: w.id });
    }
  }
  return out;
}

// Beste gewicht per aantal reps (rep-records).
export function repRecords(state, exId) {
  const ex = EX[exId];
  const targets = [1, 3, 5, 8, 10, 12];
  const best = {};
  for (const w of state.workouts)
    for (const e of w.exercises) {
      if (e.exId !== exId) continue;
      for (const s of doneSets(e))
        for (const r of targets) {
          if (s.r >= r && (!best[r] || (s.w || 0) > best[r].w)) best[r] = { w: s.w || 0, date: w.date, r: s.r };
        }
    }
  if (ex.noLoad) return [];
  return targets.filter((r) => best[r]).map((r) => ({ reps: r, ...best[r] }));
}

// Oefeningen waarvan je data hebt, laatst gedaan eerst.
export function trainedExercises(state) {
  const last = {};
  for (const w of state.workouts)
    for (const e of w.exercises) if (doneSets(e).length && (!last[e.exId] || w.date > last[e.exId])) last[e.exId] = w.date;
  return Object.entries(last)
    .filter(([id]) => EX[id])
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .map(([id, date]) => ({ exId: id, date }));
}

export function prEvents(state) {
  return computePRs(state).events;
}

export function prsSince(state, days) {
  const from = addDaysISO(todayISO(), -days);
  return prEvents(state).filter((e) => e.date >= from);
}

// Kalender: { iso: { train, names } } voor de laatste n weken.
export function calendar(state, weeks = 16) {
  const end = addDays(startOfWeek(new Date()), 6);
  const start = addDays(startOfWeek(new Date()), -7 * (weeks - 1));
  const map = {};
  for (const w of workoutsBetween(state, toISO(start), toISO(end))) {
    const m = (map[w.date] ||= { train: 0, names: [] });
    m.train++;
    m.names.push(w.dayName);
  }
  return { start, weeks, map };
}

// Lichaamsgewicht: laatste waarde, tempo per week (lineaire trend over 28 dagen) en oordeel t.o.v. doel.
export function bodyweightStats(state) {
  const list = [...(state.bodyweight || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!list.length) return null;
  const latest = list[list.length - 1];
  const from = addDaysISO(latest.date, -28);
  const recent = list.filter((b) => b.date >= from);
  let rate = null;
  if (recent.length >= 2 && daysBetween(recent[0].date, latest.date) >= 7) {
    const xs = recent.map((b) => daysBetween(recent[0].date, b.date));
    const ys = recent.map((b) => b.kg);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    rate = den ? (num / den) * 7 : null;
  }
  const goal = GOALS[state.settings.goal];
  const [lo, hi] = goal.bwRate.map((p) => (p / 100) * latest.kg);
  let verdict = null;
  if (rate != null) verdict = rate < lo - 0.05 ? 'low' : rate > hi + 0.05 ? 'high' : 'ok';
  return { latest, rate, target: [lo, hi], verdict, series: list.map((b) => ({ date: b.date, t: parseDate(b.date).getTime(), y: b.kg })) };
}

export function weekDots(state) {
  const start = startOfWeek(new Date());
  const today = todayISO();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const iso = toISO(addDays(start, i));
    days.push({
      iso,
      idx: i,
      today: iso === today,
      past: iso < today,
      train: state.workouts.some((w) => w.date === iso),
      plannedTrain: state.settings.trainingDays.includes(i),
    });
  }
  return days;
}
