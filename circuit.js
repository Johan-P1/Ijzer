// Circuitmodus: schema maken, fases, trainingsstappen, timer, gewichtssuggesties, geluid en scherm-aan.
import { CX, WARMUP, COOLDOWN, PHASES, CIRCUIT_TEMPLATE, KNEE_MAX } from './cdata.js';
import { uid, todayISO, weekKey } from './util.js';

export const isCircuit = (state) => state.settings.mode === 'circuit';

// Past een oefening bij knieën, springen en apparatuur?
export function allowed(id, state) {
  const ex = CX[id];
  if (!ex) return false;
  const s = state.settings;
  const knees = s.knees || 'ok';
  if (ex.knee > KNEE_MAX[knees]) return false;
  if (ex.impact && !s.jumping) return false;
  if (ex.kneel && knees !== 'ok') return false;
  const eq = state.equipment;
  if (!(ex.needs || []).every((n) => eq[n] !== false)) return false;
  if (ex.load !== 'bw' && !(eq.dbMax > 0)) return false;
  return true;
}

function pick(cands, state, used, block) {
  const ok = cands.filter((id) => allowed(id, state) && !used.has(id));
  return ok.length ? ok[block % ok.length] : null;
}

export function generateCircuitProgram(state, block = 0) {
  const days = CIRCUIT_TEMPLATE.map((t, i) => {
    const used = new Set();
    const circuit = [];
    for (const slot of t.slots) {
      const id = pick(slot, state, used, block);
      if (id) {
        used.add(id);
        circuit.push(id);
      }
    }
    const f = t.finisher;
    const finisher = f.type === 'tabata'
      ? { type: 'tabata', items: f.items.map((c) => pick(c, state, new Set(), block)).filter(Boolean) }
      : { type: 'amrap', items: f.items.map(([c, dose]) => ({ ex: pick(c, state, new Set(), block), dose })).filter((x) => x.ex) };
    return { id: 'c' + (i + 1), name: t.name, focus: t.focus, circuit, finisher };
  });
  return { id: uid(), style: 'circuit', name: 'Circuit A / B / C', goal: state.settings.goal, block, createdAt: Date.now(), startDate: todayISO(), deloadEvery: 4, days };
}

// Schema aanpassen aan nieuwe instellingen (knieën/springen) zonder de fase-opbouw kwijt te raken.
export function refreshCircuitProgram(state) {
  const old = state.program;
  const fresh = generateCircuitProgram(state, old?.block || 0);
  state.program = old?.style === 'circuit' ? { ...fresh, id: old.id, startDate: old.startDate, createdAt: old.createdAt } : fresh;
}

export function warmupList(state) {
  const knees = state.settings.knees || 'ok';
  return WARMUP.filter(([id]) => !(id === 'bird_dog' && knees !== 'ok'));
}

// Welke week/fase? Telt trainingsweken met dit schema (vóór deze week) + 1.
export function phaseInfo(state) {
  const p = state.program;
  const thisWeek = weekKey(todayISO());
  const weeks = new Set(state.workouts.filter((w) => w.programId === p.id && weekKey(w.date) < thisWeek).map((w) => weekKey(w.date)));
  const week = weeks.size + 1;
  const phase = PHASES.find((x) => week <= x.to) || PHASES[PHASES.length - 1];
  const light = week === 4 || week === 8;
  // Weinig ervaring: zelfde opbouw, maar lichtere startgewichten (zie suggestWeight).
  const rounds = phase.rounds - (light ? 1 : 0);
  return { week, phase, rounds, light, done: week > 12 };
}

export function estCircuitMinutes(state, day, info = phaseInfo(state)) {
  const ph = info.phase;
  const warm = warmupList(state).reduce((s, [, d]) => s + d, 0);
  const n = day.circuit.length;
  const circ = info.rounds * (n * ph.work + (n - 1) * ph.rest) + (info.rounds - 1) * ph.roundRest;
  const cool = COOLDOWN.reduce((s, [, d]) => s + d, 0);
  return Math.round((warm + circ + ph.fin * 60 + cool + 90) / 60);
}

export function nextCircuitDay(state) {
  const p = state.program;
  const last = [...state.workouts].filter((w) => w.style === 'circuit' && p.days.some((d) => d.id === w.dayId)).sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1))[0];
  if (!last) return p.days[0];
  const i = p.days.findIndex((d) => d.id === last.dayId);
  return p.days[(i + 1) % p.days.length];
}

// ---------- gewichten ----------
function roundDb(state, w) {
  const st = state.equipment.dbStep || 2.5;
  return Math.min(state.equipment.dbMax || 15, Math.max(st, Math.round(w / st) * st));
}

function lastWith(state, exId) {
  return [...state.workouts]
    .filter((w) => w.style === 'circuit' && w.circuit && (w.circuit.weights?.[exId] != null || w.circuit.feedback?.[exId]))
    .sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1))[0];
}

export function suggestWeight(state, exId) {
  const ex = CX[exId];
  if (!ex || ex.load === 'bw') return null;
  const last = lastWith(state, exId);
  const st = state.equipment.dbStep || 2.5;
  if (!last || last.circuit.weights?.[exId] == null) return roundDb(state, ex.start?.[state.settings.experience ?? 0] ?? 5);
  const w = last.circuit.weights[exId];
  const fb = last.circuit.feedback?.[exId];
  return roundDb(state, fb === 'light' ? w + st : fb === 'heavy' ? w - st : w);
}

// Tip voor oefeningen zonder gewicht, op basis van de vorige keer.
export function bodyHint(state, exId) {
  const ex = CX[exId];
  const fb = lastWith(state, exId)?.circuit.feedback?.[exId];
  if (fb === 'light') return ex.harder || null;
  if (fb === 'heavy') return ex.easier || null;
  return null;
}

// ---------- stappen van een training ----------
export function buildSteps(state, day, info) {
  const steps = [];
  const warm = warmupList(state);
  warm.forEach(([id, dur], i) => steps.push({ k: 'warm', ex: id, dur, n: i + 1, of: warm.length }));
  steps.push({ k: 'ready' });
  const ph = info.phase;
  const n = day.circuit.length;
  for (let r = 1; r <= info.rounds; r++) {
    day.circuit.forEach((id, i) => {
      steps.push({ k: 'work', ex: id, dur: ph.work, round: r, rounds: info.rounds, n: i + 1, of: n });
      if (i < n - 1) steps.push({ k: 'rest', dur: ph.rest, next: day.circuit[i + 1], round: r, rounds: info.rounds });
      else if (r < info.rounds) steps.push({ k: 'rest', dur: ph.roundRest, next: day.circuit[0], round: r + 1, rounds: info.rounds, roundBreak: true });
    });
  }
  steps.push({ k: 'finready' });
  const fin = day.finisher;
  const secs = ph.fin * 60;
  if (fin.type === 'tabata') {
    const count = Math.round(secs / 30);
    for (let i = 0; i < count; i++) {
      steps.push({ k: 'work', ex: fin.items[i % fin.items.length], dur: 20, fin: true, n: i + 1, of: count });
      if (i < count - 1) steps.push({ k: 'rest', dur: 10, fin: true, next: fin.items[(i + 1) % fin.items.length] });
    }
  } else {
    steps.push({ k: 'amrap', dur: secs, items: fin.items });
  }
  COOLDOWN.forEach(([id, dur], i) => steps.push({ k: 'cool', ex: id, dur, n: i + 1, of: COOLDOWN.length }));
  steps.push({ k: 'done' });
  return steps;
}

export function startCircuit(state, dayId) {
  const p = state.program;
  const day = p.days.find((d) => d.id === dayId) || nextCircuitDay(state);
  const info = phaseInfo(state);
  const ids = new Set([...day.circuit, ...(day.finisher.type === 'tabata' ? day.finisher.items : day.finisher.items.map((x) => x.ex))]);
  const weights = {};
  for (const id of ids) {
    const w = suggestWeight(state, id);
    if (w != null) weights[id] = w;
  }
  return {
    style: 'circuit', id: uid(), programId: p.id, dayId: day.id, dayName: day.name, date: todayISO(),
    startedAt: Date.now(), phaseN: info.phase.n, week: info.week, rounds: info.rounds, work: info.phase.work, rest: info.phase.rest,
    finType: day.finisher.type, steps: buildSteps(state, day, info), i: 0, t0: Date.now(), paused: false, pausedAt: null,
    weights, score: 0, feedback: {}, rpe: null, notes: '',
  };
}

// ---------- timer ----------
export const stepOf = (a) => a.steps[a.i];

export function remaining(a, now = Date.now()) {
  const s = stepOf(a);
  if (!s?.dur) return null;
  const ref = a.paused ? a.pausedAt : now;
  return Math.max(0, s.dur - (ref - a.t0) / 1000);
}

// Loopt door verlopen stappen heen (ook als de app even op de achtergrond stond).
export function catchUp(a, now = Date.now()) {
  let moved = 0;
  while (!a.paused) {
    const s = stepOf(a);
    if (!s?.dur) break;
    const end = a.t0 + s.dur * 1000;
    if (now < end) break;
    a.i = Math.min(a.i + 1, a.steps.length - 1);
    a.t0 = end;
    moved++;
    if (!stepOf(a).dur) {
      a.t0 = now;
      break;
    }
  }
  return moved;
}

export function goStep(a, delta) {
  a.i = Math.max(0, Math.min(a.steps.length - 1, a.i + delta));
  a.t0 = Date.now();
  if (a.paused) a.pausedAt = a.t0;
}

export function togglePause(a) {
  const now = Date.now();
  if (a.paused) {
    a.t0 += now - a.pausedAt;
    a.paused = false;
    a.pausedAt = null;
  } else {
    a.paused = true;
    a.pausedAt = now;
  }
}

export function finishCircuit(a) {
  const doneWork = a.steps.slice(0, a.i).filter((s) => s.k === 'work' && !s.fin);
  const roundsDone = doneWork.length ? Math.max(...doneWork.map((s) => s.round)) : 0;
  const list = [...new Set(a.steps.filter((s) => s.k === 'work' && !s.fin).map((s) => s.ex))];
  return {
    id: a.id, style: 'circuit', programId: a.programId, dayId: a.dayId, dayName: a.dayName, date: a.date,
    startedAt: a.startedAt, finishedAt: Date.now(), deload: false, notes: (a.notes || '').trim(), exercises: [],
    circuit: {
      phase: a.phaseN, week: a.week, work: a.work, rest: a.rest, roundsPlanned: a.rounds, roundsDone, list,
      weights: a.weights, feedback: a.feedback, finisher: { type: a.finType, score: a.score }, rpe: a.rpe,
      completed: a.steps[a.i]?.k === 'done',
    },
  };
}

// ---------- geluid & scherm ----------
let ctx = null;
export function unlockAudio() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}
export function beep(freq = 880, ms = 140, vol = 0.3) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {}
}

let lock = null;
export async function keepAwake(on) {
  try {
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => (lock = null));
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {}
}
export const awakeSupported = () => 'wakeLock' in navigator;
