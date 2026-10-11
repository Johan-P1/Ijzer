// App-shell: rendering, navigatie, events en timers.
import { state, save, requestPersistence } from './store.js';
import { ui, setRenderer, actions, registerActions, go, openSheet, closeSheet } from './core.js';
import { resetCharts, mountCharts, hideTip } from './charts.js';
import { esc, icon, fmtClock } from './util.js';
import * as home from './home.js';
import * as train from './train.js';
import * as progress from './progress.js';
import * as history from './history.js';
import * as program from './program.js';
import * as settings from './settings.js';

window.IJZER_VERSION = '1.0.0';

const VIEWS = { home: home.view, train: train.view, progress: progress.view, history: history.view, program: program.view, settings: settings.view };
const SHEETS = { ...home.sheets, ...train.sheets, ...history.sheets, ...program.sheets, ...settings.sheets };
const TABS = [
  ['home', 'Home', 'home'],
  ['progress', 'Voortgang', 'trend'],
  ['train', 'Train', 'dumbbell'],
  ['history', 'Historie', 'clock'],
  ['program', 'Schema', 'list'],
];

const $view = document.getElementById('view');
const $tabs = document.getElementById('tabbar');
const $sheet = document.getElementById('sheet');
let lastSheetKey = null;

function tabbar() {
  const live = state.active && !ui.edit;
  return `<nav class="tabbar-in">${TABS.map(([id, label, ic]) => {
    const on = ui.tab === id || (id === 'home' && ui.tab === 'settings');
    if (id === 'train') {
      return `<button class="tab train${on ? ' on' : ''}" data-act="go" data-tab="train" aria-label="${label}"><span class="fab${live ? ' live' : ''}">${icon(ic)}</span><span>${live ? 'Bezig' : label}</span></button>`;
    }
    return `<button class="tab${on ? ' on' : ''}" data-act="go" data-tab="${id}">${icon(ic)}<span>${label}</span></button>`;
  }).join('')}</nav>`;
}

function sheetHTML() {
  const sh = ui.sheet;
  if (!sh || !SHEETS[sh.name]) return '';
  const fresh = sh._k !== lastSheetKey;
  lastSheetKey = sh._k;
  const r = SHEETS[sh.name](sh);
  return `<div class="sheet-wrap${fresh ? ' fresh' : ''}">
    <div class="sheet-backdrop" data-act="sheet-close"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(r.title)}">
      <div class="grabber"></div>
      <div class="sheet-head"><h3>${esc(r.title)}</h3><button class="icon-btn" data-act="sheet-close" aria-label="Sluiten">${icon('x')}</button></div>
      <div class="sheet-body">${r.body}</div>
      ${r.foot ? `<div class="sheet-foot">${r.foot}</div>` : ''}
    </div>
  </div>`;
}

function render() {
  hideTip();
  resetCharts();
  $view.dataset.tab = ui.tab;
  $view.innerHTML = (VIEWS[ui.tab] || VIEWS.home)();
  $tabs.innerHTML = tabbar();
  const body = $sheet.querySelector('.sheet-body');
  const keep = body && ui.sheet && ui.sheet._k === lastSheetKey ? body.scrollTop : 0;
  if (!ui.sheet) lastSheetKey = null;
  $sheet.innerHTML = sheetHTML();
  const nb = $sheet.querySelector('.sheet-body');
  if (nb && keep) nb.scrollTop = keep;
  document.documentElement.classList.toggle('locked', !!ui.sheet);
  mountCharts(document);
  tick();
}
setRenderer(render);

// ---------- klokken (training + rust) ----------
function tick() {
  const a = state.active;
  if (!a) return;
  const now = Date.now();
  document.querySelectorAll('[data-clock="elapsed"]').forEach((el) => (el.textContent = fmtClock((now - a.startedAt) / 1000)));
  document.querySelectorAll('[data-clock="rest"]').forEach((el) => (el.textContent = a.lastSetAt ? fmtClock((now - a.lastSetAt) / 1000) : '–'));
}
setInterval(tick, 1000);

// ---------- events ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn({ ...el.dataset }, el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) actions[el.dataset.input]?.({ ...el.dataset }, el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) actions[el.dataset.change]?.({ ...el.dataset }, el, e);
});
// Enter op het iPhone-toetsenbord = klaar met invullen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('input.num, input.input')) e.target.blur();
});
// Tik op een getalveld = alles selecteren, zodat je direct kunt overtypen
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input.num')) setTimeout(() => e.target.select?.(), 0);
});

registerActions({
  go({ tab }) {
    if (tab === 'progress' && ui.tab === 'progress') ui.progressEx = null;
    go(tab);
  },
  'sheet-close'() {
    closeSheet();
  },
  'confirm-ok'() {
    const fn = ui.sheet?.onOk;
    closeSheet();
    fn?.();
  },
});

let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastW) return; // iOS-toetsenbord verandert alleen de hoogte
  lastW = window.innerWidth;
  clearTimeout(window.__rz);
  window.__rz = setTimeout(render, 150);
});

// Terug in de app na een tijdje: datums/“vandaag” verversen
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !document.activeElement?.matches('input, textarea, select')) render();
});

// ---------- start ----------
if (state.active) ui.tab = 'train';
render();
if (!state.seenWelcome) openSheet('welcome');
save();
requestPersistence();

// Alleen online (https) offline-cache aanzetten; lokaal testen blijft zo altijd vers.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW-registratie mislukt', e));
}
