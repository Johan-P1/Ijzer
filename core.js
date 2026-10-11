// Gedeelde UI-staat, acties en kleine UI-helpers.
import { uid, esc, icon } from './util.js';

export const ui = {
  tab: 'home',
  sheet: null,
  edit: null, // training uit de historie die je bewerkt
  progressEx: null,
  progressMetric: 'e1rm',
  progressRange: 90,
  chartEx: null,
};

let renderFn = () => {};
export const setRenderer = (fn) => (renderFn = fn);
export const rerender = () => renderFn();

export const actions = {};
export const registerActions = (obj) => Object.assign(actions, obj);

export function go(tab, extra = {}) {
  Object.assign(ui, { tab, sheet: null }, extra);
  rerender();
  window.scrollTo(0, 0);
}

export function openSheet(name, params = {}) {
  ui.sheet = { name, _k: uid(), ...params };
  rerender();
}
export function closeSheet() {
  ui.sheet = null;
  rerender();
}

let toastTimer = null;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

export function confirmSheet({ title, text, ok = 'OK', danger = false, onOk }) {
  openSheet('confirm', { title, text, ok, danger, onOk });
}

// ---------- kleine bouwstenen ----------
export const btn = (label, act, { cls = '', data = {}, ic = null } = {}) =>
  `<button class="btn ${cls}" data-act="${act}"${dataAttrs(data)}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`;

export function dataAttrs(data) {
  return Object.entries(data)
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
}

export function stepper(value, { act, data = {}, input = null, mode = 'numeric', small = false, placeholder = '' }) {
  return `<div class="stepper${small ? ' sm' : ''}">
    <button data-act="${act}" data-d="-1"${dataAttrs(data)} aria-label="min">${icon('minus')}</button>
    ${input
      ? `<input class="num" inputmode="${mode}" enterkeyhint="done" autocomplete="off" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" data-input="${input}" data-change="${input}-commit"${dataAttrs(data)}>`
      : `<span class="num">${esc(value)}</span>`}
    <button data-act="${act}" data-d="1"${dataAttrs(data)} aria-label="plus">${icon('plus')}</button>
  </div>`;
}

export function seg(options, current, act, data = {}) {
  return `<div class="seg">${options
    .map(([v, l]) => `<button class="${String(v) === String(current) ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}"${dataAttrs(data)}>${esc(l)}</button>`)
    .join('')}</div>`;
}

export function chips(options, current, act, data = {}) {
  return `<div class="chips">${options
    .map(([v, l]) => `<button class="chip${String(v) === String(current) ? ' on' : ''}" data-act="${act}" data-v="${esc(v)}"${dataAttrs(data)}>${esc(l)}</button>`)
    .join('')}</div>`;
}
