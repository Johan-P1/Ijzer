// Eerste start voor een nieuwe gebruiker: in een paar stappen naar een eigen schema.
import { state, save, setBodyweight } from './store.js';
import { ui, go, registerActions, rerender, toast, btn, seg } from './core.js';
import { GOALS, GOAL_ORDER } from './data.js';
import { KNEE_LABEL, EXPERIENCE, CIRCUIT_GOALS } from './cdata.js';
import { generateProgram } from './engine.js';
import { generateCircuitProgram } from './circuit.js';
import { esc, icon, parseNum, todayISO, DAY_SHORT } from './util.js';

const STEPS = ['welkom', 'vorm', 'doel', 'jij', 'letop', 'dagen'];

function ob() {
  ui.ob ||= { step: 0, name: '', mode: 'circuit', goal: 'cut', age: '', weight: '', target: '', experience: 0, knees: 'ok', jumping: false, postpartum: false, days: [0, 2, 4] };
  return ui.ob;
}

const option = (act, v, on, title, sub) =>
  `<button class="option${on ? ' on' : ''}" data-act="${act}" data-v="${esc(v)}"><span class="opt-t">${esc(title)}</span>${sub ? `<span class="opt-s">${esc(sub)}</span>` : ''}</button>`;

export function view() {
  const o = ob();
  const key = STEPS[o.step];
  let body = '';
  if (key === 'welkom') {
    body = `<div class="ob-hero">${icon('dumbbell')}</div>
      <h1 class="title">Welkom bij IJzer</h1>
      <p>Een paar korte vragen, dan staat je persoonlijke schema klaar. Alles blijft op deze telefoon.</p>
      <label class="field"><span>Hoe heet je?</span><input class="input" value="${esc(o.name)}" data-input="ob-name" placeholder="Voornaam" autocomplete="given-name"></label>
      <label class="btn ghost sm">${icon('download')}<span>Ik heb al een back-up</span><input type="file" accept="application/json,.json" data-change="import-file" hidden></label>`;
  } else if (key === 'vorm') {
    body = `<h1 class="title">Hoe wil je trainen?</h1>
      <div class="options">
        ${option('ob-mode', 'circuit', o.mode === 'circuit', 'Circuit op tijd', 'Een aftelklok leidt je door warming-up, oefeningen en een pittige finisher. Ideaal om fitter te worden en af te vallen. Met uitleg en animaties.')}
        ${option('ob-mode', 'strength', o.mode === 'strength', 'Krachttraining', 'Sets × reps × gewicht loggen, met slimme suggesties om sterker te worden. Voor wie al wat ervaring heeft.')}
      </div>`;
  } else if (key === 'doel') {
    const goals = o.mode === 'circuit' ? Object.keys(CIRCUIT_GOALS) : GOAL_ORDER;
    const meta = (g) => (o.mode === 'circuit' ? CIRCUIT_GOALS[g] : GOALS[g]);
    body = `<h1 class="title">Wat is je doel?</h1>
      <div class="options">${goals.map((g) => option('ob-goal', g, o.goal === g, meta(g).label, meta(g).desc)).join('')}</div>`;
  } else if (key === 'jij') {
    body = `<h1 class="title">Over jou</h1>
      <div class="grid2">
        <label class="field"><span>Leeftijd</span><input class="input" inputmode="numeric" value="${esc(o.age)}" data-input="ob-age" placeholder="38"></label>
        <label class="field"><span>Gewicht nu (kg)</span><input class="input" inputmode="decimal" value="${esc(o.weight)}" data-input="ob-weight" placeholder="85"></label>
      </div>
      <label class="field"><span>Streefgewicht (kg, optioneel)</span><input class="input" inputmode="decimal" value="${esc(o.target)}" data-input="ob-target" placeholder="75"></label>
      <div class="field"><span>Ervaring met krachttraining</span>${seg(EXPERIENCE.map((l, i) => [i, l]), o.experience, 'ob-exp')}</div>`;
  } else if (key === 'letop') {
    body = `<h1 class="title">Waar moeten we op letten?</h1>
      <div class="field"><span>Knieën</span>${seg(Object.entries(KNEE_LABEL), o.knees, 'ob-knees')}</div>
      <p class="small muted">${o.knees === 'pain' ? 'Dan krijg je geen oefeningen met diepe kniebuiging, zoals squats en lunges. Laat pijn bij elke buiging wel even checken door een fysiotherapeut.' : o.knees === 'sensitive' ? 'Dan krijg je knievriendelijke varianten, zoals squatten naar een bank en lage step-ups.' : 'Alle oefeningen zijn mogelijk.'}</p>
      <button class="toggle-row" data-act="ob-toggle" data-k="postpartum"><span>Herstellend van een zwangerschap (minder dan een jaar geleden)</span><span class="switch${o.postpartum ? ' on' : ''}"><i></i></span></button>
      <button class="toggle-row" data-act="ob-toggle" data-k="jumping"><span>Springen mag (bijv. jumping jacks)</span><span class="switch${o.jumping ? ' on' : ''}"><i></i></span></button>
      ${o.postpartum ? '<p class="small muted">Je krijgt extra tips voor bekkenbodem en buik. Springen pas aanzetten als je arts of bekkenfysio dat goed vindt.</p>' : ''}`;
  } else {
    body = `<h1 class="title">Op welke dagen train je?</h1>
      <div class="daypick">${DAY_SHORT.map((d, i) => `<button class="${o.days.includes(i) ? 'on' : ''}" data-act="ob-day" data-v="${i}">${d}</button>`).join('')}</div>
      <p class="small muted">Liefst met een rustdag ertussen. Je kunt dit later aanpassen.</p>`;
  }
  const last = o.step === STEPS.length - 1;
  return `<div class="ob">
    <div class="ob-dots">${STEPS.map((_, i) => `<span class="${i <= o.step ? 'on' : ''}"></span>`).join('')}</div>
    <div class="ob-body">${body}</div>
    <div class="ob-foot">
      ${o.step > 0 ? btn('Terug', 'ob-back') : '<span></span>'}
      ${btn(last ? 'Maak mijn schema' : 'Volgende', last ? 'ob-done' : 'ob-next', { cls: 'primary grow' })}
    </div>
  </div>`;
}

registerActions({
  'ob-name'(_, el) {
    ob().name = el.value.slice(0, 40);
  },
  'ob-age'(_, el) {
    ob().age = el.value;
  },
  'ob-weight'(_, el) {
    ob().weight = el.value;
  },
  'ob-target'(_, el) {
    ob().target = el.value;
  },
  'ob-mode'({ v }) {
    const o = ob();
    o.mode = v;
    o.goal = v === 'circuit' ? 'cut' : 'hypertrophy';
    rerender();
  },
  'ob-goal'({ v }) {
    ob().goal = v;
    rerender();
  },
  'ob-exp'({ v }) {
    ob().experience = Number(v);
    rerender();
  },
  'ob-knees'({ v }) {
    ob().knees = v;
    rerender();
  },
  'ob-toggle'({ k }) {
    const o = ob();
    o[k] = !o[k];
    if (k === 'postpartum' && o.postpartum) o.jumping = false;
    rerender();
  },
  'ob-day'({ v }) {
    const o = ob();
    const i = Number(v);
    o.days = o.days.includes(i) ? o.days.filter((x) => x !== i) : [...o.days, i].sort();
    rerender();
  },
  'ob-back'() {
    ob().step = Math.max(0, ob().step - 1);
    rerender();
    window.scrollTo(0, 0);
  },
  'ob-next'() {
    const o = ob();
    // in krachtmodus is de knie/zwangerschap-stap niet nodig
    o.step = Math.min(STEPS.length - 1, o.step + 1 + (o.mode === 'strength' && STEPS[o.step + 1] === 'letop' ? 1 : 0));
    rerender();
    window.scrollTo(0, 0);
  },
  'ob-done'() {
    const o = ob();
    if (!o.days.length) return toast('Kies minstens één trainingsdag');
    const s = state.settings;
    state.profile.name = o.name.trim();
    const age = parseNum(o.age);
    state.profile.age = age ? Math.round(age) : null;
    const target = parseNum(o.target);
    state.profile.targetWeight = target && target > 30 ? target : null;
    Object.assign(s, {
      mode: o.mode, goal: o.goal, goalSince: todayISO(), trainingDays: o.days,
      knees: o.knees, jumping: o.jumping, postpartum: o.postpartum, experience: o.experience, sound: true,
    });
    const kg = parseNum(o.weight);
    state.bodyweight = [];
    if (kg && kg > 30) setBodyweight(todayISO(), kg);
    state.program = o.mode === 'circuit'
      ? generateCircuitProgram(state, 0)
      : generateProgram({ goal: o.goal, split: o.days.length >= 4 ? 'upperlower' : o.days.length <= 2 ? 'fullbody2' : 'ppl' }, state.equipment);
    state.seenWelcome = true;
    save();
    ui.ob = null;
    go('home');
    toast('Je schema staat klaar');
  },
});
