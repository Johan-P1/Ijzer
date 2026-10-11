// Schema-check: is het tijd om je schema aan te passen?
// Kijkt naar stilstand per oefening, hoe lang je het schema al volgt en hoe lang je al bulkt.
import { EX, VARIANTS } from './data.js';
import { exerciseSessions, cycleInfo, isAvailable, workingWeight, bodyweightAt, loadOf, e1rm } from './engine.js';
import { todayISO, addDaysISO, weekKey, daysBetween, uid } from './util.js';

const STALL_SESSIONS = 3; // zoveel sessies op rij zonder vooruitgang = stilstand
const BLOCKS_BEFORE_CHANGE = 2; // na zoveel blokken (incl. deload) is variatie verstandig
const BULK_WEEKS = 20;

// Beste prestatie per sessie (geschat 1RM; bij oefeningen zonder gewicht: reps).
function sessionScores(state, exId, since) {
  const ex = EX[exId];
  return exerciseSessions(state, exId)
    .filter((s) => !s.deload && s.date >= since)
    .reverse()
    .map((s) => {
      const bw = bodyweightAt(state, s.date);
      return Math.max(...s.sets.map((x) => (ex.noLoad ? x.r : e1rm(loadOf(ex, x.w, bw), x.r))));
    });
}

export function exerciseTrend(state, exId, since) {
  const v = sessionScores(state, exId, since);
  if (v.length < STALL_SESSIONS + 1) return { status: 'unknown', n: v.length };
  const before = Math.max(...v.slice(0, -STALL_SESSIONS));
  const recent = Math.max(...v.slice(-STALL_SESSIONS));
  const change = v[0] ? (v[v.length - 1] - v[0]) / v[0] : 0;
  return { status: recent <= before * 1.005 ? 'stalled' : 'up', n: v.length, change };
}

const names = (list) => {
  const n = list.map((t) => EX[t.exId].name);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' en ' + n[n.length - 1] : n[0];
};

export function programReview(state) {
  const p = state.program;
  if (!p) return null;
  const today = todayISO();
  const every = p.deloadEvery || 6;
  const weeks = new Set(state.workouts.filter((w) => w.programId === p.id).map((w) => weekKey(w.date))).size;
  const since = p.startDate > addDaysISO(today, -70) ? p.startDate : addDaysISO(today, -70);

  const items = [];
  for (const d of p.days) for (const it of d.items) if (!items.some((x) => x.exId === it.exId)) items.push(it);
  const trends = items.map((it) => ({ exId: it.exId, role: it.role, ...exerciseTrend(state, it.exId, since) }));
  const stalled = trends.filter((t) => t.status === 'stalled');
  const tracked = trends.filter((t) => t.status !== 'unknown');
  const stalledMain = stalled.filter((t) => t.role === 'main' || EX[t.exId].key);

  const reasons = [];
  let level = 'ok';
  const longRun = weeks >= BLOCKS_BEFORE_CHANGE * every;
  if (longRun) {
    level = 'change';
    reasons.push(`Je volgt dit schema al ${weeks} trainingsweken. Je lichaam went aan dezelfde oefeningen; nieuwe varianten geven een frisse prikkel.`);
  }
  if (stalled.length) {
    const many = stalledMain.length >= 2 || (tracked.length >= 4 && stalled.length / tracked.length >= 0.4);
    if (many) level = 'change';
    else if (level === 'ok') level = 'tweak';
    reasons.push(`${names(stalled)} ${stalled.length > 1 ? 'gaan' : 'gaat'} al ${STALL_SESSIONS} sessies niet vooruit.`);
  }
  const goalWeeks = state.settings.goalSince ? Math.floor(daysBetween(state.settings.goalSince, today) / 7) : 0;
  if (state.settings.goal === 'hypertrophy' && goalWeeks >= BULK_WEEKS) {
    if (level === 'ok') level = 'tweak';
    reasons.push(`Je bulkt al ${goalWeeks} weken. Een krachtblok of een korte cut kan een goede volgende stap zijn.`);
  }

  const cyc = cycleInfo(state);
  const left = cyc.every - cyc.week;
  const timing = cyc.deload
    ? 'Je zit in je deload-week: ideaal om na deze week met een nieuw blok te beginnen.'
    : `Beste moment: na je deload-week (over ${left} ${left === 1 ? 'week' : 'weken'}). Bij duidelijke stilstand mag het ook eerder.`;

  const review = { level, weeks, every, trends, stalled, tracked, reasons, timing, longRun };
  review.changes = proposeChanges(state, review);
  return review;
}

// Zwaar genoeg voor je dumbbells? (90 kg bankdrukken ≈ 2× 36 kg dumbbells)
function feasible(state, from, to) {
  const a = EX[from];
  const b = EX[to];
  if (b.equip === 'dumbbell' && a.equip === 'barbell') {
    const W = workingWeight(state, from);
    return W == null || W * 0.4 <= state.equipment.dbMax;
  }
  return true;
}

export function proposeChanges(state, review) {
  const p = state.program;
  const stalled = new Set(review.stalled.map((t) => t.exId));
  const used = new Set(p.days.flatMap((d) => d.items.map((i) => i.exId)));
  const changes = [];
  for (const d of p.days)
    for (const it of d.items) {
      // Stilstaande oefeningen altijd; bij een nieuw blok ook de niet-hoofdoefeningen.
      const reason = stalled.has(it.exId) ? 'stalled' : review.longRun && it.role !== 'main' ? 'variation' : null;
      if (!reason) continue;
      const to = (VARIANTS[it.exId] || []).find((v) => !used.has(v) && isAvailable(v, state.equipment) && feasible(state, it.exId, v));
      if (!to) continue;
      used.add(to);
      changes.push({ dayId: d.id, dayName: d.name, from: it.exId, to, reason });
    }
  return changes;
}

// Nieuw blok: zelfde opbouw, gewisselde oefeningen. Historie blijft, de cyclus begint opnieuw.
export function applyChanges(state, changes) {
  const p = JSON.parse(JSON.stringify(state.program));
  for (const c of changes) {
    const it = p.days.find((d) => d.id === c.dayId)?.items.find((i) => i.exId === c.from);
    if (it) it.exId = c.to;
  }
  p.prevId = state.program.id;
  p.id = uid();
  p.createdAt = Date.now();
  p.startDate = todayISO();
  state.program = p;
  state.reviewSnooze = null;
}
