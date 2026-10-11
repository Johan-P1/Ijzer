// Schema bekijken, aanpassen en nieuwe schema's genereren.
import { state, save } from './store.js';
import { ui, openSheet, closeSheet, registerActions, rerender, toast, btn, stepper, seg, confirmSheet } from './core.js';
import { EX, GOALS, GOAL_ORDER, SPLITS, SPLITS_BY_DAYS, MUSCLES, MUSCLE_ORDER, ROLE_LABEL } from './data.js';
import { generateProgram, cycleInfo, estMinutes, plannedMuscleSets, barStep, schemeFor, defaultRoleFor, isAvailable } from './engine.js';
import { hbarChart, chartWidth } from './charts.js';
import { programReview, applyChanges } from './review.js';
import { setProgramPick } from './train.js';
import { esc, icon, fmtKg, fmt0, todayISO, addDaysISO } from './util.js';

const REVIEW_TITLE = { ok: 'Alles op koers', tweak: 'Kleine aanpassing aanbevolen', change: 'Tijd voor een nieuw trainingsblok' };

function reviewCard() {
  const r = programReview(state);
  if (!r) return '';
  const up = r.trends.filter((t) => t.status === 'up').length;
  return `<section class="card review ${r.level}">
    <div class="review-h"><span class="banner-ic">${icon(r.level === 'ok' ? 'check' : 'layers')}</span>
      <div class="grow"><span class="eyebrow">Schema-check</span><div class="row-t">${esc(REVIEW_TITLE[r.level])}</div></div></div>
    <p class="row-s">${r.tracked.length ? `${up} van ${r.tracked.length} oefeningen gaan vooruit` : 'Na een paar weken trainen beoordeelt IJzer hier je voortgang'} · ${r.weeks} ${r.weeks === 1 ? 'week' : 'weken'} op dit schema</p>
    ${r.level !== 'ok' ? `<p class="review-reason">${esc(r.reasons[0])}</p>` : '<div class="gap-s"></div>'}
    ${btn(r.level === 'ok' ? 'Details' : 'Bekijk voorstel', 'review-open', { cls: (r.level === 'ok' ? '' : 'primary ') + 'sm block' })}
  </section>`;
}

// Compacte melding voor het dashboard (alleen als er iets te doen is).
export function reviewBanner() {
  const r = programReview(state);
  if (!r || r.level === 'ok' || (state.reviewSnooze && state.reviewSnooze > todayISO())) return '';
  return `<section class="card review ${r.level}">
    <div class="review-h"><span class="banner-ic">${icon('layers')}</span>
      <div class="grow"><span class="eyebrow">Schema-check</span><div class="row-t">${esc(REVIEW_TITLE[r.level])}</div></div></div>
    <p class="review-reason">${esc(r.reasons[0])}</p>
    <div class="btn-row">${btn('Later', 'review-snooze', { cls: 'sm' })}${btn('Bekijk voorstel', 'review-open', { cls: 'primary sm' })}</div>
  </section>`;
}

export function view() {
  const p = state.program;
  if (!p) {
    return `<h1 class="title">Schema</h1>
      <section class="card"><p>Je hebt nog geen schema.</p>${btn('Schema maken', 'gen-open', { cls: 'primary block', ic: 'layers' })}</section>`;
  }
  const g = GOALS[p.goal] || GOALS.hypertrophy;
  const cyc = cycleInfo(state);
  const planned = plannedMuscleSets(p);
  const rows = MUSCLE_ORDER.map((m) => ({ label: MUSCLES[m], value: planned[m] || 0 }));
  const eq = state.equipment;
  const step = barStep(eq);
  const missing = p.days.flatMap((d) => d.items).filter((it) => !isAvailable(it.exId, eq));

  return `
    <h1 class="title">Schema</h1>
    ${reviewCard()}
    <section class="card">
      <span class="eyebrow">Huidig schema</span>
      <h2 class="h2">${esc(p.name)}</h2>
      <div class="pills">
        <span class="pill accent">${esc(g.label)}</span>
        <span class="pill">${p.days.length}× per week</span>
        ${cyc.deload ? '<span class="pill warn">Deload-week</span>' : `<span class="pill">Week ${cyc.week} van ${cyc.every}</span>`}
      </div>
      <dl class="facts">
        <div><dt>Hoofdoefeningen</dt><dd>${g.main.sets} × ${g.main.lo}–${g.main.hi} reps · rust ${g.rest.main}</dd></div>
        <div><dt>Compound</dt><dd>${g.secondary.sets} × ${g.secondary.lo}–${g.secondary.hi} reps · rust ${g.rest.secondary}</dd></div>
        <div><dt>Accessoires</dt><dd>${g.accessory.sets} × ${g.accessory.lo}–${g.accessory.hi} reps · rust ${g.rest.accessory}</dd></div>
        <div><dt>Intensiteit</dt><dd>Stop elke set met ${g.rir} reps in reserve</dd></div>
        <div><dt>Progressie</dt><dd>Haal je bij alle sets de bovenkant van het bereik? Dan gaat het gewicht omhoog.</dd></div>
        <div><dt>Deload</dt><dd>Elke ${cyc.every}e week: ~10% lichter en de helft van de sets</dd></div>
        <div><dt>Wisselen</dt><dd>Na ${2 * cyc.every} weken of bij stilstand stelt de schema-check varianten voor</dd></div>
      </dl>
      <div class="btn-row">${btn('Uitleg', 'help-open', { ic: 'info' })}${btn('Nieuw schema', 'gen-open', { cls: 'grow', ic: 'layers' })}</div>
    </section>

    ${missing.length ? `<section class="card banner warn"><div class="banner-ic">${icon('info')}</div><div class="grow"><div class="row-t">Niet alles past bij je apparatuur</div><div class="row-s">${esc(missing.map((m) => EX[m.exId].name).join(', '))}. Vervang ze of pas je apparatuur aan.</div></div></section>` : ''}

    ${step >= 5 ? `<section class="card banner"><div class="banner-ic">${icon('info')}</div><div class="grow"><div class="row-t">Tip: kleinere schijfjes</div><div class="row-s">Je kleinste stap op de stang is nu ${fmtKg(step)} kg. Met 2× 1,25 kg schijfjes maak je stappen van 2,5 kg. Dan gaat progressie op bankdrukken en shoulder press een stuk soepeler.</div></div></section>` : ''}

    ${p.days.map((d) => dayCard(d)).join('')}

    <section class="card">
      <div class="card-h"><h3>Weekvolume volgens schema</h3><span class="muted small">sets per week</span></div>
      ${hbarChart(rows, { w: chartWidth(), band: g.weekly })}
      <p class="foot"><span class="key band"></span>Advies voor ${esc(g.label.toLowerCase())}: ${g.weekly[0]}–${g.weekly[1]} sets. Secundaire spieren tellen half.</p>
    </section>
  `;
}

function dayCard(d) {
  return `<section class="card list-card">
    <div class="card-h pad"><h3>${esc(d.name)}</h3><span class="muted small">~${estMinutes(d)} min</span></div>
    ${d.items
      .map((it, idx) => {
        const ex = EX[it.exId];
        return `<button class="row row-btn" data-act="pi-open" data-day="${d.id}" data-idx="${idx}">
          <div class="grow"><div class="row-t">${esc(ex?.name || it.exId)}</div><div class="row-s">${esc(ROLE_LABEL[it.role] || '')}</div></div>
          <span class="tnum nowrap">${it.sets} × ${it.lo}–${it.hi}</span>${icon('right', 'chev')}
        </button>`;
      })
      .join('')}
    <div class="pad-x">${btn('Oefening', 'pi-add', { cls: 'sm ghost', data: { day: d.id }, ic: 'plus' })}</div>
  </section>`;
}

const itemOf = (sh) => state.program?.days.find((d) => d.id === sh.day)?.items[sh.idx];

export const sheets = {
  review() {
    const r = programReview(state);
    if (!r) return { title: 'Schema-check', body: '' };
    const up = r.trends.filter((t) => t.status === 'up').length;
    const trendRow = (t) => {
      const s = t.status === 'up'
        ? `<span class="trend up">${icon('up')}${fmt0(t.change * 100)}%</span>`
        : t.status === 'stalled' ? '<span class="trend stall">Staat stil</span>' : '<span class="muted small">te weinig data</span>';
      return `<div class="row"><div class="grow"><div class="row-t">${esc(EX[t.exId].name)}</div><div class="row-s">${t.n} ${t.n === 1 ? 'sessie' : 'sessies'} in dit schema</div></div>${s}</div>`;
    };
    return {
      title: 'Schema-check',
      body: `
        <div class="stats3">
          <div><span class="tile-v">${r.weeks}</span><span class="tile-l">weken op schema</span></div>
          <div><span class="tile-v">${up}/${r.tracked.length}</span><span class="tile-l">gaan vooruit</span></div>
          <div><span class="tile-v">${r.stalled.length}</span><span class="tile-l">staan stil</span></div>
        </div>
        ${r.reasons.length
          ? r.reasons.map((x) => `<p class="status low">${icon('info')}<span>${esc(x)}</span></p>`).join('')
          : `<p class="status ok">${icon('check')}<span>Je schema werkt. Blijf het volgen; IJzer meldt zich als het tijd is voor iets nieuws.</span></p>`}
        ${r.level !== 'ok' ? `<p class="status">${icon('calendar')}<span>${esc(r.timing)}</span></p>` : ''}
        ${r.changes.length
          ? `<div class="sub-h">Voorstel voor je nieuwe blok</div>
             ${r.changes.map((c) => `<div class="row"><span class="row-ic train">${icon('swap')}</span><div class="grow"><div class="row-t">${esc(EX[c.from].name)} → ${esc(EX[c.to].name)}</div><div class="row-s">${esc(c.dayName)} · ${c.reason === 'stalled' ? 'staat stil' : 'variatie'}</div></div></div>`).join('')}
             <p class="foot">Sets, reps en volgorde blijven gelijk. Startgewichten voor de nieuwe oefeningen worden geschat uit je huidige lifts. Je historie blijft bewaard.</p>`
          : r.level !== 'ok' && r.stalled.length ? '<p class="foot">Voor deze oefeningen is geen goede variant met jouw apparatuur. Maak een nieuw schema of pas het zelf aan.</p>' : ''}
        <div class="sub-h">Per oefening</div>
        ${r.trends.map(trendRow).join('')}
        <p class="foot">Stilstand = 3 sessies op rij geen hoger geschat 1RM dan daarvoor. Deload-weken tellen niet mee.</p>
      `,
      foot: r.changes.length
        ? `<div class="btn-row">${btn('Zelf kiezen', 'gen-open')}${btn('Start nieuw blok', 'review-apply', { cls: 'primary grow' })}</div>`
        : btn('Sluiten', 'sheet-close', { cls: 'block' }),
    };
  },
  'prog-item'(sh) {
    const it = itemOf(sh);
    if (!it) return { title: '', body: '' };
    const ex = EX[it.exId];
    const day = state.program.days.find((d) => d.id === sh.day);
    return {
      title: ex.name,
      body: `
        <div class="field"><span>Rol</span>${seg(Object.entries(ROLE_LABEL), it.role, 'pi-role')}</div>
        <div class="grid2">
          <div class="field"><span>Sets</span>${stepper(it.sets, { act: 'pi-num', data: { k: 'sets' } })}</div>
          <div class="field"><span>Reps min – max</span><div class="pair">${stepper(it.lo, { act: 'pi-num', data: { k: 'lo' }, small: true })}${stepper(it.hi, { act: 'pi-num', data: { k: 'hi' }, small: true })}</div></div>
        </div>
        <div class="menu">
          <button class="row row-btn" data-act="pi-replace">${icon('swap')}<span class="grow">Vervangen</span></button>
          <button class="row row-btn" data-act="pi-move" data-d="-1"${sh.idx === 0 ? ' disabled' : ''}>${icon('up')}<span class="grow">Omhoog</span></button>
          <button class="row row-btn" data-act="pi-move" data-d="1"${sh.idx === day.items.length - 1 ? ' disabled' : ''}>${icon('down')}<span class="grow">Omlaag</span></button>
          <button class="row row-btn danger" data-act="pi-del">${icon('trash')}<span class="grow">Verwijderen uit schema</span></button>
        </div>`,
      foot: btn('Klaar', 'sheet-close', { cls: 'primary block' }),
    };
  },
  gen(sh) {
    const f = sh.form;
    const prev = generateProgram(f, state.equipment);
    const planned = plannedMuscleSets(prev);
    const g = GOALS[f.goal];
    const splits = SPLITS_BY_DAYS[f.days];
    return {
      title: 'Nieuw schema',
      body: `
        <div class="sub-h">Doel</div>
        <div class="options">${GOAL_ORDER.map((k) => `<button class="option${f.goal === k ? ' on' : ''}" data-act="gen-goal" data-v="${k}">
          <span class="opt-t">${esc(GOALS[k].label)}</span><span class="opt-s">${esc(GOALS[k].desc)}</span></button>`).join('')}</div>
        <div class="sub-h">Trainingen per week</div>
        ${seg([[2, '2×'], [3, '3×'], [4, '4×']], f.days, 'gen-days')}
        <div class="sub-h">Indeling</div>
        <div class="options">${splits.map((k) => `<button class="option${f.split === k ? ' on' : ''}" data-act="gen-split" data-v="${k}">
          <span class="opt-t">${esc(SPLITS[k].label)}${k === 'fullbody3' && f.goal === 'hypertrophy' ? ' <span class="pill accent">Aanrader</span>' : ''}</span><span class="opt-s">${esc(SPLITS[k].desc)}</span></button>`).join('')}</div>
        <div class="sub-h">Voorbeeld</div>
        ${prev.days.map((d) => `<div class="preview-day"><div class="row-t">${esc(d.name)} <span class="muted small">~${estMinutes(d)} min</span></div>
          ${d.items.map((it) => `<div class="preview-ex"><span>${esc(EX[it.exId].name)}</span><span class="tnum muted">${it.sets} × ${it.lo}–${it.hi}</span></div>`).join('')}</div>`).join('')}
        <div class="sub-h">Sets per spiergroep per week</div>
        ${hbarChart(MUSCLE_ORDER.map((m) => ({ label: MUSCLES[m], value: planned[m] || 0 })), { w: chartWidth() - 2, band: g.weekly })}
        <p class="foot">Gewichten worden afgestemd op je apparatuur. Je historie blijft bewaard.</p>
      `,
      foot: btn('Gebruik dit schema', 'gen-use', { cls: 'primary block' }),
    };
  },
};

registerActions({
  'review-open'() {
    openSheet('review');
  },
  'review-snooze'() {
    state.reviewSnooze = addDaysISO(todayISO(), 14);
    save();
    rerender();
    toast('Over 2 weken kijkt IJzer opnieuw');
  },
  'review-apply'() {
    if (state.active) return toast('Rond eerst je lopende training af');
    const r = programReview(state);
    if (!r?.changes.length) return closeSheet();
    applyChanges(state, r.changes);
    save();
    closeSheet();
    toast(`Nieuw blok gestart · ${r.changes.length} ${r.changes.length === 1 ? 'oefening' : 'oefeningen'} gewisseld`);
  },
  'gen-open'(data) {
    const goal = data.goal || state.settings.goal;
    const days = Math.min(4, Math.max(2, state.program?.days.length || 3));
    const split = state.program && SPLITS_BY_DAYS[days].includes(state.program.split) ? state.program.split : SPLITS_BY_DAYS[days][0];
    openSheet('gen', { form: { goal, days, split } });
  },
  'gen-goal'({ v }) {
    ui.sheet.form.goal = v;
    rerender();
  },
  'gen-days'({ v }) {
    const f = ui.sheet.form;
    f.days = Number(v);
    if (!SPLITS_BY_DAYS[f.days].includes(f.split)) f.split = SPLITS_BY_DAYS[f.days][0];
    rerender();
  },
  'gen-split'({ v }) {
    ui.sheet.form.split = v;
    rerender();
  },
  'gen-use'() {
    const f = ui.sheet.form;
    const apply = () => {
      const prevId = state.program?.id;
      state.program = generateProgram(f, state.equipment);
      if (prevId && state.program.split === f.split && SPLITS[f.split]) state.program.prevId = prevId;
      if (state.settings.goal !== f.goal) state.settings.goalSince = todayISO();
      state.settings.goal = f.goal;
      state.reviewSnooze = null;
      save();
      closeSheet();
      toast('Nieuw schema actief');
    };
    if (state.active) {
      confirmSheet({ title: 'Training loopt nog', text: 'Je lopende training blijft staan, maar hoort bij het oude schema. Toch wisselen?', ok: 'Wisselen', onOk: apply });
    } else apply();
  },
  'pi-open'({ day, idx }) {
    openSheet('prog-item', { day, idx: Number(idx) });
  },
  'pi-add'({ day }) {
    openSheet('picker', { ctx: 'prog-add', day });
  },
  'pi-role'({ v }) {
    const it = itemOf(ui.sheet);
    if (!it) return;
    it.role = v;
    Object.assign(it, schemeFor(state.program.goal, v, it.exId));
    save();
    rerender();
  },
  'pi-num'({ k, d }) {
    const it = itemOf(ui.sheet);
    if (!it) return;
    d = Number(d);
    if (k === 'sets') it.sets = Math.max(1, Math.min(10, it.sets + d));
    if (k === 'lo') it.lo = Math.max(1, Math.min(it.hi, it.lo + d));
    if (k === 'hi') it.hi = Math.max(it.lo, Math.min(30, it.hi + d));
    save();
    rerender();
  },
  'pi-replace'() {
    const sh = ui.sheet;
    openSheet('picker', { ctx: 'prog-replace', day: sh.day, idx: sh.idx });
  },
  'pi-move'({ d }) {
    const sh = ui.sheet;
    const day = state.program.days.find((x) => x.id === sh.day);
    const a = sh.idx;
    const b = a + Number(d);
    if (b < 0 || b >= day.items.length) return;
    [day.items[a], day.items[b]] = [day.items[b], day.items[a]];
    save();
    closeSheet();
  },
  'pi-del'() {
    const sh = ui.sheet;
    const day = state.program.days.find((x) => x.id === sh.day);
    day.items.splice(sh.idx, 1);
    save();
    closeSheet();
  },
});

setProgramPick((exId) => {
  const sh = ui.sheet;
  const day = state.program?.days.find((d) => d.id === sh?.day);
  if (!day) return closeSheet();
  if (sh.ctx === 'prog-add') {
    const role = defaultRoleFor(exId);
    day.items.push({ exId, role, ...schemeFor(state.program.goal, role, exId) });
  } else if (sh.ctx === 'prog-replace') {
    day.items[sh.idx].exId = exId;
  }
  save();
  closeSheet();
});
