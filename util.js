// Kleine hulpfuncties: escapen, getallen, datums, iconen.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- getallen ----------
const nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });

export const fmt0 = (v) => (v == null || !isFinite(v) ? '–' : nf0.format(v));
export const fmt1 = (v) => (v == null || !isFinite(v) ? '–' : nf1.format(v));
export const fmtKg = (v) => (v == null || !isFinite(v) ? '–' : nf2.format(v));

export function fmtCompact(v) {
  if (v == null || !isFinite(v)) return '–';
  const a = Math.abs(v);
  if (a >= 1e6) return nf1.format(v / 1e6) + 'M';
  if (a >= 1e4) return nf1.format(v / 1e3) + 'k';
  return nf0.format(v);
}

export function parseNum(s) {
  if (s == null) return null;
  const t = String(s).replace(',', '.').replace(/[^\d.\-]/g, '').trim();
  if (t === '' || t === '.' || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function signed(v, f = fmt1) {
  if (v == null || !isFinite(v)) return '–';
  if (Math.abs(v) < 1e-9) return '±0';
  return (v > 0 ? '+' : '−') + f(Math.abs(v));
}

// ---------- datums (lokale tijd, ISO 'YYYY-MM-DD') ----------
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
export const addDaysISO = (iso, n) => toISO(addDays(parseDate(iso), n));
// maandag = 0 ... zondag = 6
export const weekdayIdx = (d) => (d.getDay() + 6) % 7;
export function startOfWeek(d) {
  return addDays(d, -weekdayIdx(d));
}
export const weekKey = (iso) => toISO(startOfWeek(parseDate(iso)));
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

export function isoWeekNumber(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

export const DAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const DAY_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const MONTH_LONG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function fmtDate(iso) {
  const d = parseDate(iso);
  return `${DAY_SHORT[weekdayIdx(d)]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
export function fmtDay(iso) {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
export function fmtDateLong(iso) {
  const d = parseDate(iso);
  return `${DAY_LONG[weekdayIdx(d)]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
}
export function relDay(iso) {
  const diff = daysBetween(iso, todayISO());
  if (diff === 0) return 'Vandaag';
  if (diff === 1) return 'Gisteren';
  return fmtDate(iso);
}
export function fmtMinutes(min) {
  if (min == null || !isFinite(min)) return '–';
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} u ${pad(m)}` : `${h} u`;
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// ---------- iconen (24×24, lijn) ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  dumbbell: '<path d="M6.5 6.5v11M3.5 9.5v5M17.5 6.5v11M20.5 9.5v5M6.5 12h11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<rect x="4.5" y="4" width="15" height="17" rx="2.5"/><path d="M9 3v2h6V3"/><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.2"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4"/><path d="M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  flame: '<path d="M12 3c1 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2-4.6.2 1.9 1 3 2 3.1 0-3.1-.9-5.2 1-8.5z"/>',
  pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7.5h14V12"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19.5h14"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 10a5 5 0 0 1 8 0"/><path d="M12 10l1.5-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
