// Instellingen: profiel, doel, weekplanning, apparatuur en gegevens.
import { state, save, replaceState, resetState, validateBackup } from './store.js';
import { ui, go, openSheet, closeSheet, registerActions, rerender, toast, btn, stepper, confirmSheet, actions } from './core.js';
import { GOALS, GOAL_ORDER } from './data.js';
import { applyGoal, barStep, barMax, platesTotal } from './engine.js';
import { esc, icon, fmtKg, parseNum, DAY_SHORT, fmtDate, toISO, todayISO } from './util.js';

const PLATE_SIZES = ['25', '20', '15', '10', '5', '2.5', '1.25'];

export function view() {
  const s = state.settings;
  const eq = state.equipment;
  return `
    <header class="topbar"><button class="btn sm ghost back" data-act="go" data-tab="home">${icon('left')}<span>Home</span></button></header>
    <h1 class="title">Instellingen</h1>

    <div class="sub-h">Profiel</div>
    <section class="card">
      <label class="field"><span>Naam (optioneel)</span><input class="input" value="${esc(state.profile.name)}" data-input="pf-name" placeholder="Je voornaam" autocomplete="given-name"></label>
      <label class="field nomb"><span>Leeftijd</span><input class="input" inputmode="numeric" value="${esc(state.profile.age ?? '')}" data-change="pf-age"></label>
    </section>

    <div class="sub-h">Doel</div>
    <section class="card">
      <div class="options">${GOAL_ORDER.map((k) => `<button class="option${s.goal === k ? ' on' : ''}" data-act="goal-pick" data-v="${k}">
        <span class="opt-t">${esc(GOALS[k].label)}</span><span class="opt-s">${esc(GOALS[k].desc)}</span></button>`).join('')}</div>
    </section>

    <div class="sub-h">Weekplanning</div>
    <section class="card">
      <div class="field nomb"><span>Trainingsdagen</span>
        <div class="daypick">${DAY_SHORT.map((d, i) => `<button class="${s.trainingDays.includes(i) ? 'on' : ''}" data-act="day-toggle" data-v="${i}">${d}</button>`).join('')}</div>
      </div>
    </section>

    <div class="sub-h">Apparatuur</div>
    <section class="card">
      <label class="field"><span>Gewicht van de stang (kg)</span><input class="input" inputmode="decimal" value="${fmtKg(eq.barWeight)}" data-change="eq-bar"></label>
      <div class="field"><span>Schijven (aantal stuks)</span>
        <div class="plates">${PLATE_SIZES.map((kg) => `<div class="plate-row"><span class="plate-kg">${fmtKg(Number(kg))} kg</span>${stepper(eq.plates[kg] || 0, { act: 'eq-plate', data: { kg }, small: true })}</div>`).join('')}</div>
      </div>
      <p class="foot nomt spaced">Totaal ${fmtKg(platesTotal(eq))} kg aan schijven · max ${fmtKg(barMax(eq))} kg op de stang · kleinste stap ${fmtKg(barStep(eq))} kg</p>
      <div class="grid2">
        <label class="field"><span>Dumbbell max (kg p/st)</span><input class="input" inputmode="decimal" value="${fmtKg(eq.dbMax)}" data-change="eq-dbmax"></label>
        <label class="field"><span>Dumbbell stap (kg)</span>
          <select class="input" data-change="eq-dbstep">${[0.5, 1, 1.25, 2, 2.5, 5].map((v) => `<option value="${v}"${eq.dbStep === v ? ' selected' : ''}>${fmtKg(v)}</option>`).join('')}</select>
        </label>
      </div>
      ${[['bench', 'Bank'], ['incline', 'Bank kan hellen (incline)'], ['rack', 'Powerrack'], ['pullup', 'Pull-up bar']]
        .map(([k, l]) => `<button class="toggle-row" data-act="eq-toggle" data-k="${k}"><span>${l}</span><span class="switch${eq[k] !== false ? ' on' : ''}"><i></i></span></button>`)
        .join('')}
    </section>

    <div class="sub-h">Gegevens</div>
    <section class="card">
      <p class="muted small nomt">${state.workouts.length} trainingen · ${state.bodyweight.length} wegingen. Alles staat alleen op dit toestel.</p>
      <p class="small">Laatste back-up: <b>${state.lastBackup ? esc(fmtDate(toISO(new Date(state.lastBackup)))) : 'nog nooit'}</b></p>
      <div class="btn-row">
        ${btn('Back-up maken', 'backup', { cls: 'grow', ic: 'share' })}
        <label class="btn grow">${icon('download')}<span>Terugzetten</span><input type="file" accept="application/json,.json" data-change="import-file" hidden></label>
      </div>
      <div class="gap-s"></div>
      ${btn('Alles wissen', 'reset-all', { cls: 'ghost danger block', ic: 'trash' })}
    </section>

    <div class="sub-h">App</div>
    <section class="card">
      <button class="toggle-row" data-act="help-open"><span>Uitleg & begrippen</span>${icon('right', 'chev')}</button>
      <button class="toggle-row" data-act="install-help"><span>Installeren op iPhone</span>${icon('right', 'chev')}</button>
      <button class="toggle-row" data-act="check-update"><span>Zoeken naar updates</span>${icon('right', 'chev')}</button>
      <p class="foot">IJzer · versie ${esc(window.IJZER_VERSION || '')}</p>
    </section>
  `;
}

const HELP = [
  ['Hoe werken de suggesties?', 'IJzer gebruikt dubbele progressie. Je traint binnen een rep-bereik, bijvoorbeeld 6–10. Elke training probeer je 1 rep meer. Haal je bij álle sets de bovenkant (10), dan gaat het gewicht omhoog en begin je weer onderaan (6).'],
  ['Labels bij een oefening', '<b>Zwaarder</b>: gewicht omhoog. <b>+1 rep</b>: zelfde gewicht, 1 herhaling meer. <b>Vasthouden</b>: zelfde gewicht, eerst het bereik halen. <b>Terugschakelen</b>: twee keer te weinig reps, dus 10% lichter en opnieuw opbouwen. <b>Nieuw</b>: eerste keer; kies zelf of neem het geschatte gewicht. <b>Max gewicht</b>: je apparatuur gaat niet zwaarder, dus meer reps of langzamer.'],
  ['Reps in reserve', 'Hoeveel herhalingen je nog had kunnen doen. "1–2 in reserve" betekent: stop net voordat het echt niet meer gaat. Zo train je zwaar genoeg zonder op te branden.'],
  ['Geschat 1RM', 'Het gewicht dat je naar schatting precies 1× kunt tillen, berekend uit je sets. Zo kun je 80 kg × 10 en 90 kg × 6 eerlijk vergelijken. Je hoeft nooit echt een 1RM te testen.'],
  ['Deload', 'Na elk blok (bij bulk elke 6e week) een lichtere week: ~10% minder gewicht en de helft van de sets. Je lichaam herstelt en je gaat daarna sterker verder. Zet hem aan of uit met de Deload-knop in je training.'],
  ['Schema-check', 'IJzer houdt bij of je oefeningen vooruitgaan. Staat een oefening 3 sessies stil, of volg je je schema al 2 blokken, dan stelt hij varianten voor (bijv. squat → pause squat). Je kiest zelf of je wisselt.'],
  ['Volume en sets per spiergroep', 'Volume = gewicht × reps, opgeteld. Sets per spiergroep zijn je zware sets per week; voor spiergroei is 10–20 per spiergroep een goed doel. Oefeningen die een spier indirect raken tellen half.'],
];

export const sheets = {
  help() {
    return {
      title: 'Uitleg & begrippen',
      body: HELP.map(([t, d]) => `<div class="help-item"><div class="row-t">${esc(t)}</div><p>${d}</p></div>`).join(''),
      foot: btn('Sluiten', 'sheet-close', { cls: 'block' }),
    };
  },
  'goal-change'(sh) {
    const g = GOALS[sh.goal];
    return {
      title: `Doel: ${g.label}`,
      body: `<p>${esc(g.desc)}</p>
        <p class="muted small">Nieuw rep-bereik: hoofdoefeningen ${g.main.sets} × ${g.main.lo}–${g.main.hi}, compound ${g.secondary.sets} × ${g.secondary.lo}–${g.secondary.hi}, accessoires ${g.accessory.sets} × ${g.accessory.lo}–${g.accessory.hi}.</p>
        <div class="menu">
          <button class="row row-btn" data-act="goal-apply" data-mode="adapt">${icon('check')}<div class="grow"><div class="row-t">Schema aanpassen</div><div class="row-s">Zelfde oefeningen, nieuwe sets en reps</div></div></button>
          <button class="row row-btn" data-act="goal-apply" data-mode="new">${icon('layers')}<div class="grow"><div class="row-t">Nieuw schema maken</div><div class="row-s">Kies opnieuw je indeling en dagen</div></div></button>
          <button class="row row-btn" data-act="goal-apply" data-mode="only">${icon('x')}<div class="grow"><div class="row-t">Alleen doel wijzigen</div><div class="row-s">Schema blijft zoals het is</div></div></button>
        </div>`,
    };
  },
  confirm(sh) {
    return {
      title: sh.title,
      body: `<p>${esc(sh.text)}</p>`,
      foot: `<div class="btn-row">${btn('Annuleren', 'sheet-close', { cls: 'grow' })}${btn(sh.ok, 'confirm-ok', { cls: (sh.danger ? 'danger-fill' : 'primary') + ' grow' })}</div>`,
    };
  },
};

registerActions({
  'help-open'() {
    openSheet('help');
  },
  'pf-name'(_, el) {
    state.profile.name = el.value.slice(0, 40);
    save();
  },
  'pf-age'(_, el) {
    const n = parseNum(el.value);
    state.profile.age = n ? Math.round(n) : null;
    save();
  },
  'goal-pick'({ v }) {
    if (v === state.settings.goal) return;
    openSheet('goal-change', { goal: v });
  },
  'goal-apply'({ mode }) {
    const goal = ui.sheet.goal;
    state.settings.goal = goal;
    state.settings.goalSince = todayISO();
    if (mode === 'adapt' && state.program) applyGoal(state.program, goal);
    save();
    if (mode === 'new') {
      actions['gen-open']({ goal });
      return;
    }
    closeSheet();
    toast(mode === 'adapt' ? 'Doel en schema aangepast' : 'Doel aangepast');
  },
  'day-toggle'({ v }) {
    const i = Number(v);
    const d = state.settings.trainingDays;
    state.settings.trainingDays = d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort();
    if (!state.settings.trainingDays.length) state.settings.trainingDays = [i];
    save();
    rerender();
  },
  'eq-bar'(_, el) {
    const n = parseNum(el.value);
    if (n != null && n >= 0 && n <= 50) state.equipment.barWeight = n;
    save();
    rerender();
  },
  'eq-plate'({ kg, d }) {
    const p = state.equipment.plates;
    p[kg] = Math.max(0, Math.min(20, (p[kg] || 0) + Number(d)));
    save();
    rerender();
  },
  'eq-dbmax'(_, el) {
    const n = parseNum(el.value);
    if (n != null && n >= 0 && n <= 100) state.equipment.dbMax = n;
    save();
    rerender();
  },
  'eq-dbstep'(_, el) {
    state.equipment.dbStep = Number(el.value);
    save();
  },
  'eq-toggle'({ k }) {
    state.equipment[k] = state.equipment[k] === false;
    save();
    rerender();
  },
  async 'import-file'(_, el) {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!validateBackup(obj)) throw new Error('ongeldig');
      confirmSheet({
        title: 'Back-up terugzetten?',
        text: `Deze back-up bevat ${obj.workouts.length} trainingen. Je huidige gegevens op dit toestel worden vervangen.`,
        ok: 'Terugzetten',
        danger: true,
        onOk: () => {
          replaceState(obj);
          ui.edit = null;
          go('home');
          toast('Back-up teruggezet');
        },
      });
    } catch {
      toast('Dit is geen geldig IJzer-back-upbestand');
    }
  },
  'reset-all'() {
    confirmSheet({
      title: 'Alles wissen?',
      text: 'Al je trainingen, wegingen en instellingen worden van dit toestel verwijderd. Maak eerst een back-up als je twijfelt.',
      ok: 'Alles wissen',
      danger: true,
      onOk: () => {
        resetState();
        ui.edit = null;
        go('home');
        toast('Alles gewist');
      },
    });
  },
  async 'check-update'() {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) return toast('Updates werken alleen in de geïnstalleerde app');
      await reg.update();
      if (reg.installing || reg.waiting) {
        toast('Update gevonden, even herladen…');
        setTimeout(() => location.reload(), 1200);
      } else toast('Je hebt de nieuwste versie');
    } catch {
      toast('Kon niet op updates controleren');
    }
  },
});
