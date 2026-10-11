// Dashboard
import { state, save, setBodyweight, backupBlob } from './store.js';
import { ui, go, openSheet, closeSheet, registerActions, rerender, toast, btn, chips, seg } from './core.js';
import { EX, GOALS, MUSCLES, MUSCLE_ORDER } from './data.js';
import { nextDay, cycleInfo, estMinutes, startWorkout } from './engine.js';
import {
  thisWeek, muscleSets, volumeBetween, weekStreak, prsSince, prEvents, exerciseSeries,
  calendar, bodyweightStats, weekDots, workoutsBetween,
} from './stats.js';
import { lineChart, hbarChart, heatmap, chartWidth } from './charts.js';
import { reviewBanner } from './program.js';
import {
  esc, icon, fmt1, fmtKg, fmtCompact, signed, todayISO, addDaysISO, fmtDateLong, relDay,
  DAY_SHORT, parseNum, fmtDay, daysBetween,
} from './util.js';

export function view() {
  const h = new Date().getHours();
  const greet = h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
  const name = state.profile.name?.trim();
  return `
    <header class="topbar">
      <span class="eyebrow">${esc(fmtDateLong(todayISO()))}</span>
      <button class="icon-btn" data-act="go" data-tab="settings" aria-label="Instellingen">${icon('sliders')}</button>
    </header>
    <h1 class="title">${greet}${name ? ', ' + esc(name) : ''}</h1>
    ${installBanner()}
    ${backupBanner()}
    ${heroCard()}
    ${reviewBanner()}
    ${weekCard()}
    ${kpiTiles()}
    ${strengthCard()}
    ${muscleCard()}
    ${consistencyCard()}
    ${bodyweightCard()}
    ${prCard()}
  `;
}

const isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

function installBanner() {
  if (isStandalone() || state.hideInstall) return '';
  return `<section class="card banner">
    <div class="banner-ic">${icon('download')}</div>
    <div class="grow"><div class="row-t">Zet IJzer op je beginscherm</div><div class="row-s">Dan werkt hij als een echte app, ook offline.</div></div>
    <button class="btn sm" data-act="install-help">Hoe?</button>
    <button class="icon-btn sm" data-act="hide-install" aria-label="Verbergen">${icon('x')}</button>
  </section>`;
}

function backupBanner() {
  if (state.workouts.length < 5) return '';
  const age = state.lastBackup ? (Date.now() - state.lastBackup) / 86400000 : Infinity;
  if (age < 30) return '';
  return `<section class="card banner">
    <div class="banner-ic">${icon('share')}</div>
    <div class="grow"><div class="row-t">Tijd voor een back-up</div><div class="row-s">${state.lastBackup ? 'Je laatste back-up is meer dan 30 dagen oud.' : 'Je hebt nog geen back-up gemaakt.'}</div></div>
    <button class="btn sm" data-act="backup">Back-up</button>
  </section>`;
}

function heroCard() {
  const a = state.active;
  if (a) {
    const total = a.exercises.reduce((s, e) => s + e.sets.length, 0);
    const done = a.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
    return `<section class="card hero">
      <div class="hero-top"><span class="pill live"><i></i>Bezig</span><span class="muted tnum" data-clock="elapsed"></span></div>
      <h2 class="hero-title">${esc(a.dayName)}</h2>
      <p class="muted">${done} van ${total} sets afgevinkt</p>
      <div class="hero-actions">${btn('Ga verder', 'go', { cls: 'primary grow', data: { tab: 'train' }, ic: 'bolt' })}</div>
    </section>`;
  }
  const day = nextDay(state);
  if (!day) {
    return `<section class="card hero"><h2 class="hero-title">Nog geen schema</h2>
      <p class="muted">Maak een schema op basis van je doel en apparatuur.</p>
      <div class="hero-actions">${btn('Schema maken', 'go', { cls: 'primary grow', data: { tab: 'program' } })}</div></section>`;
  }
  const cyc = cycleInfo(state);
  const names = day.items.map((it) => EX[it.exId]?.name).filter(Boolean).join(' · ');
  return `<section class="card hero">
    <div class="hero-top"><span class="eyebrow">Volgende training</span>${cyc.deload ? '<span class="pill warn">Deload-week</span>' : `<span class="pill">Week ${cyc.week} van ${cyc.every}</span>`}</div>
    <h2 class="hero-title">${esc(day.name)}</h2>
    <p class="muted small">${day.items.length} oefeningen · ~${estMinutes(day)} min · ${esc(GOALS[state.program.goal]?.label || '')}</p>
    <p class="hero-ex">${esc(names)}</p>
    <div class="hero-actions">
      ${btn('Start training', 'start', { cls: 'primary grow', data: { day: day.id }, ic: 'bolt' })}
      ${btn('Andere', 'go', { data: { tab: 'train' } })}
    </div>
  </section>`;
}

function weekCard() {
  const days = weekDots(state);
  const { start, end } = thisWeek();
  const n = workoutsBetween(state, start, end).length;
  const target = state.settings.trainingDays.length;
  const dots = days
    .map((d) => {
      let cls = 'wd';
      let inner = '';
      if (d.train) { cls += ' train'; inner = icon('check'); }
      else if (!d.past && d.plannedTrain) cls += ' plan';
      else if (d.past && d.plannedTrain) cls += ' missed';
      return `<div class="wd-col${d.today ? ' today' : ''}"><span class="wd-l">${DAY_SHORT[d.idx]}</span><span class="${cls}">${inner}</span></div>`;
    })
    .join('');
  return `<section class="card">
    <div class="card-h"><h3>Deze week</h3><span class="muted small">${n} van ${target} trainingen</span></div>
    <div class="week">${dots}</div>
  </section>`;
}

function kpiTiles() {
  const { start, end } = thisWeek();
  const target = state.settings.trainingDays.length;
  const n = workoutsBetween(state, start, end).length;
  const today = todayISO();
  const v7 = volumeBetween(state, addDaysISO(today, -6), today);
  const v14 = volumeBetween(state, addDaysISO(today, -13), addDaysISO(today, -7));
  const dv = v14 > 0 ? ((v7 - v14) / v14) * 100 : null;
  const streak = weekStreak(state);
  const prs = prsSince(state, 30).length;
  const delta = dv == null
    ? '<span class="tile-d muted">vs vorige 7 dagen</span>'
    : `<span class="tile-d ${dv >= 0 ? 'up' : 'down'}">${dv >= 0 ? '▲' : '▼'} ${fmt1(Math.abs(dv))}% <span class="muted">vs vorige 7 d</span></span>`;
  return `<div class="tiles">
    <div class="tile"><span class="tile-l">Trainingen</span><span class="tile-v">${n}<small>/${target}</small></span><span class="tile-d muted">deze week</span></div>
    <div class="tile"><span class="tile-l">Volume · 7 dagen</span><span class="tile-v">${fmtCompact(v7)}<small> kg</small></span>${delta}</div>
    <div class="tile"><span class="tile-l">Weekreeks</span><span class="tile-v">${streak}<small> wk</small></span><span class="tile-d muted">weekdoel gehaald</span></div>
    <div class="tile"><span class="tile-l">Records</span><span class="tile-v">${prs}</span><span class="tile-d muted">laatste 30 dagen</span></div>
  </div>`;
}

function strengthOptions() {
  const ids = [];
  for (const d of state.program?.days || []) for (const it of d.items) if ((EX[it.exId]?.key || it.role === 'main') && !ids.includes(it.exId)) ids.push(it.exId);
  for (const e of Object.values(EX)) if (e.key && !ids.includes(e.id) && state.workouts.some((w) => w.exercises.some((x) => x.exId === e.id))) ids.push(e.id);
  return ids;
}

function strengthCard() {
  const ids = strengthOptions();
  if (!ids.length) return '';
  const cur = ids.includes(ui.chartEx) ? ui.chartEx : ids[0];
  const from = addDaysISO(todayISO(), -182);
  const series = exerciseSeries(state, cur, 'e1rm').filter((p) => p.date >= from);
  const last = series[series.length - 1];
  const base = series.find((p) => p.date >= addDaysISO(todayISO(), -84)) || series[0];
  const d = last && base && last !== base ? last.y - base.y : null;
  const pts = series.map((p) => ({ ...p, sub: p.set ? `${fmtKg(p.set.w)} kg × ${p.set.r}` : '' }));
  return `<section class="card">
    <div class="card-h"><h3>Kracht</h3><span class="muted small">geschat 1RM · 6 mnd</span></div>
    ${chips(ids.map((id) => [id, EX[id].name]), cur, 'chart-ex')}
    <div class="figure">
      <span class="fig-v">${last ? fmt1(last.y) : '–'}<small> kg</small></span>
      ${d != null ? `<span class="fig-d ${d >= 0 ? 'up' : 'down'}">${signed(d)} kg <span class="muted">sinds ${fmtDay(base.date)}</span></span>` : '<span class="fig-d muted">nog geen trend</span>'}
    </div>
    ${lineChart(pts, { w: chartWidth(), h: 170, name: 'Geschat 1RM', emptyText: 'Na twee trainingen met deze oefening zie je hier je lijn.' })}
  </section>`;
}

function muscleCard() {
  const goal = GOALS[state.settings.goal];
  const range = ui.muscleRange || 'week';
  let data;
  if (range === 'week') {
    const { start, end } = thisWeek();
    data = muscleSets(state, start, end);
  } else {
    const today = todayISO();
    const raw = muscleSets(state, addDaysISO(today, -27), today);
    data = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / 4]));
  }
  const rows = MUSCLE_ORDER.map((m) => ({ label: MUSCLES[m], value: data[m] || 0 }));
  return `<section class="card">
    <div class="card-h"><h3>Sets per spiergroep</h3></div>
    ${seg([['week', 'Deze week'], ['avg', 'Gem. 4 weken']], range, 'muscle-range')}
    <div class="gap-s"></div>
    ${hbarChart(rows, { w: chartWidth(), band: goal.weekly })}
    <p class="foot"><span class="key band"></span>Advies voor ${esc(goal.label.toLowerCase())}: ${goal.weekly[0]}–${goal.weekly[1]} sets per week. Donkere balk = nog onder het advies. Secundaire spieren tellen half.</p>
  </section>`;
}

function consistencyCard() {
  const cal = calendar(state, 16);
  const t = Object.values(cal.map).reduce((s, m) => s + m.train, 0);
  // gemiddelde over de weken sinds je eerste training (max 16)
  const first = state.workouts.reduce((m, w) => (!m || w.date < m ? w.date : m), null);
  const weeks = first ? Math.min(16, Math.max(1, Math.ceil((daysBetween(first, todayISO()) + 1) / 7))) : 16;
  return `<section class="card">
    <div class="card-h"><h3>Consistentie</h3><span class="muted small">16 weken</span></div>
    ${heatmap(cal, { w: chartWidth() })}
    <p class="foot">${t} trainingen · gemiddeld ${fmt1(t / weeks)} per week</p>
  </section>`;
}

const BW_MSG = {
  hypertrophy: { ok: 'Precies goed voor een schone bulk.', low: 'Je komt langzamer aan dan gepland. Eet ~200 kcal per dag extra.', high: 'Je komt sneller aan dan nodig. Een kleiner overschot voorkomt extra vet.' },
  cut: { ok: 'Mooi tempo: vet eraf, kracht behouden.', low: 'Je valt snel af. Eet iets meer om je kracht te beschermen.', high: 'Je valt langzamer af dan gepland.' },
  strength: { ok: 'Stabiel gewicht.', low: 'Je valt wat af. Let op voldoende eten voor je kracht.', high: 'Je komt wat aan.' },
  health: { ok: 'Stabiel gewicht.', low: 'Je valt wat af.', high: 'Je komt wat aan.' },
};

function bodyweightCard() {
  const s = bodyweightStats(state);
  const goalKey = state.settings.goal;
  const from = addDaysISO(todayISO(), -120);
  const pts = s ? s.series.filter((p) => p.date >= from) : [];
  let status = '<p class="foot">Weeg jezelf 1–2× per week, \'s ochtends na het opstaan. Na een paar wegingen zie je je tempo.</p>';
  if (s?.rate != null) {
    const msg = BW_MSG[goalKey][s.verdict];
    status = `<p class="status ${s.verdict}">${icon(s.verdict === 'ok' ? 'check' : 'info')}<span><b>${signed(s.rate, fmtKg)} kg/week.</b> ${esc(msg)}<br><span class="muted">Doel: ${signed(s.target[0], fmt1)} tot ${signed(s.target[1], fmt1)} kg per week</span></span></p>`;
  }
  return `<section class="card">
    <div class="card-h"><h3>Lichaamsgewicht</h3><button class="btn sm" data-act="add-weight">${icon('plus')}<span>Weging</span></button></div>
    <div class="figure">
      <span class="fig-v">${s ? fmt1(s.latest.kg) : '–'}<small> kg</small></span>
      ${s ? `<span class="fig-d muted">${esc(relDay(s.latest.date))}</span>` : ''}
    </div>
    ${pts.length >= 2 ? lineChart(pts, { w: chartWidth(), h: 140, name: 'Lichaamsgewicht' }) : ''}
    ${status}
  </section>`;
}

function prCard() {
  const ev = prEvents(state).slice(-5).reverse();
  if (!ev.length) return '';
  return `<section class="card">
    <div class="card-h"><h3>Recente records</h3></div>
    ${ev.map((e) => `<div class="row">
      <span class="row-ic pr">${icon('trophy')}</span>
      <div class="grow"><div class="row-t">${esc(EX[e.exId]?.name || '')}</div>
      <div class="row-s">${EX[e.exId]?.noLoad ? `${e.set.r} reps` : `${fmtKg(e.set.w)} kg × ${e.set.r} · 1RM ≈ ${fmt1(e.value)} kg`}</div></div>
      <span class="muted small">${esc(relDay(e.date))}</span>
    </div>`).join('')}
  </section>`;
}

// ---------- sheets ----------
export const sheets = {
  weight(sh) {
    const latest = state.bodyweight[state.bodyweight.length - 1];
    const recent = [...state.bodyweight].reverse().slice(0, 5);
    return {
      title: 'Weging toevoegen',
      body: `
        <label class="field"><span>Datum</span><input type="date" class="input" id="bw-date" value="${todayISO()}" max="${todayISO()}"></label>
        <label class="field"><span>Gewicht (kg)</span><input class="input big" id="bw-kg" inputmode="decimal" value="${latest ? fmtKg(latest.kg) : ''}" placeholder="85,0"></label>
        ${recent.length ? `<div class="sub-h">Recent</div>${recent.map((b) => `<div class="row"><div class="grow"><div class="row-t">${fmt1(b.kg)} kg</div><div class="row-s">${esc(relDay(b.date))}</div></div><button class="icon-btn sm" data-act="bw-del" data-date="${b.date}" aria-label="Verwijderen">${icon('trash')}</button></div>`).join('')}` : ''}
      `,
      foot: btn('Opslaan', 'bw-save', { cls: 'primary block' }),
    };
  },
  install() {
    return {
      title: 'Installeren op je iPhone',
      body: `<ol class="steps">
        <li>Open deze pagina in <b>Safari</b>.</li>
        <li>Tik onderin op de <b>Deel-knop</b> ${icon('share')}.</li>
        <li>Kies <b>Zet op beginscherm</b> en tik op <b>Voeg toe</b>.</li>
        <li>Open IJzer voortaan via het icoon op je beginscherm.</li>
      </ol>
      <p class="foot">Je trainingen worden op je iPhone bewaard. Maak af en toe een back-up via Instellingen.</p>`,
      foot: btn('Begrepen', 'sheet-close', { cls: 'primary block' }),
    };
  },
  welcome() {
    return {
      title: 'Welkom bij IJzer',
      body: `<p>Je schema staat klaar: <b>Benen / Duwen / Trekken</b>, afgestemd op <b>spiermassa (bulk)</b> en je thuisgym.</p>
      <ol class="steps">
        <li>Tik op <b>Start training</b>. Gewicht en reps staan al ingevuld zodra je historie hebt.</li>
        <li>Pas aan wat je echt deed en <b>vink elke set af</b>.</li>
        <li>De volgende keer stelt IJzer het gewicht voor: zwaarder, 1 rep meer of even vasthouden.</li>
        <li>Sta je stil of volg je je schema lang genoeg, dan stelt de <b>schema-check</b> een nieuw blok voor.</li>
      </ol>
      <p class="foot">Check eerst je apparatuur en trainingsdagen in Instellingen. Je kunt je doel en schema altijd wijzigen.</p>`,
      foot: `<div class="btn-row">${btn('Instellingen', 'welcome-settings')}${btn('Aan de slag', 'welcome-done', { cls: 'primary grow' })}</div>`,
    };
  },
};

registerActions({
  start({ day }) {
    if (state.active) {
      toast('Je hebt al een training lopen');
      go('train');
      return;
    }
    state.active = startWorkout(state, day || null);
    save();
    go('train');
  },
  'chart-ex'({ v }) {
    ui.chartEx = v;
    rerender();
  },
  'muscle-range'({ v }) {
    ui.muscleRange = v;
    rerender();
  },
  'add-weight'() {
    openSheet('weight');
  },
  'bw-save'() {
    const kg = parseNum(document.getElementById('bw-kg')?.value);
    const date = document.getElementById('bw-date')?.value || todayISO();
    if (!kg || kg < 30 || kg > 250) {
      toast('Vul een geldig gewicht in');
      return;
    }
    setBodyweight(date, kg);
    save();
    closeSheet();
    toast('Weging opgeslagen');
  },
  'bw-del'({ date }) {
    state.bodyweight = state.bodyweight.filter((b) => b.date !== date);
    save();
    rerender();
  },
  'install-help'() {
    openSheet('install');
  },
  'hide-install'() {
    state.hideInstall = true;
    save();
    rerender();
  },
  'welcome-done'() {
    state.seenWelcome = true;
    save();
    closeSheet();
  },
  'welcome-settings'() {
    state.seenWelcome = true;
    save();
    go('settings');
  },
  async backup() {
    const file = backupBlob();
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'IJzer back-up' });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      state.lastBackup = Date.now();
      save();
      rerender();
      toast('Back-up gemaakt');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Back-up mislukt');
    }
  },
});
