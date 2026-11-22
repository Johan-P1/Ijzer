// Opslag op het toestel (localStorage) + back-up export/import.
import { generateProgram } from './engine.js';
import { todayISO } from './util.js';

const KEY = 'ijzer:v1';
export const VERSION = 1;

export function defaultState() {
  const equipment = {
    barWeight: 20,
    plates: { '25': 2, '20': 2, '15': 0, '10': 2, '5': 2, '2.5': 4, '1.25': 0 },
    dbMax: 15,
    dbStep: 2.5,
    bench: true,
    incline: true,
    rack: true,
    pullup: true,
  };
  return {
    version: VERSION,
    createdAt: Date.now(),
    profile: { name: '', age: 39, targetWeight: null },
    // mode: 'strength' (sets × reps) of 'circuit' (op tijd). Knieën/springen/zwangerschap/ervaring sturen het circuitschema.
    settings: {
      mode: 'strength', goal: 'hypertrophy', goalSince: todayISO(), trainingDays: [0, 2, 4],
      knees: 'ok', jumping: false, postpartum: false, experience: 1, sound: true,
    },
    equipment,
    program: generateProgram({ goal: 'hypertrophy', split: 'ppl' }, equipment),
    workouts: [],
    bodyweight: [{ date: todayISO(), kg: 85 }],
    active: null,
    lastBackup: null,
    seenWelcome: false,
  };
}

function migrate(s) {
  const d = defaultState();
  const out = { ...d, ...s };
  out.profile = { ...d.profile, ...(s.profile || {}) };
  out.settings = { ...d.settings, ...(s.settings || {}) };
  out.equipment = { ...d.equipment, ...(s.equipment || {}), plates: { ...(s.equipment?.plates || d.equipment.plates) } };
  out.workouts = Array.isArray(s.workouts) ? s.workouts : [];
  out.bodyweight = Array.isArray(s.bodyweight) ? s.bodyweight : [];
  // activiteiten (BJJ) worden niet meer bijgehouden
  delete out.activities;
  delete out.settings.bjjDay;
  if (!s.settings?.goalSince) out.settings.goalSince = s.program?.startDate || todayISO();
  out.version = VERSION;
  return out;
}

// Kan de opgeslagen data niet worden gelezen (bijv. een fout na een update), dan bewaren we
// een kopie en schrijven we NIETS over de bestaande data heen.
let loadFailed = false;
export const loadError = () => loadFailed;

export let state = load();

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw) {
    try {
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.error('Kon data niet laden', e);
      loadFailed = true;
      try {
        localStorage.setItem(`${KEY}:herstel-${Date.now()}`, raw);
      } catch {}
    }
  }
  return defaultState();
}

let saveError = null;
export function save() {
  if (loadFailed) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = null;
  } catch (e) {
    saveError = e;
    console.error('Opslaan mislukt', e);
  }
  return !saveError;
}

export function replaceState(next) {
  state = migrate(next);
  loadFailed = false;
  save();
}

// Alles wissen: daarna start het welkomstscherm opnieuw.
export function resetState() {
  state = defaultState();
  loadFailed = false;
  save();
}

// Vraag iOS/Safari om de opslag niet op te ruimen.
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}

export function validateBackup(obj) {
  return obj && typeof obj === 'object' && Array.isArray(obj.workouts) && obj.equipment && obj.settings;
}

export function backupBlob() {
  const json = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  return new File([json], `ijzer-backup-${todayISO()}.json`, { type: 'application/json' });
}

export function setBodyweight(date, kg) {
  state.bodyweight = state.bodyweight.filter((b) => b.date !== date);
  state.bodyweight.push({ date, kg });
  state.bodyweight.sort((a, b) => (a.date < b.date ? -1 : 1));
}
