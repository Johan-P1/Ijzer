// Statische kennis: spiergroepen, oefeningen, doelen en schema-sjablonen.

export const MUSCLES = {
  chest: 'Borst',
  back: 'Rug',
  shoulders: 'Schouders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Billen',
  calves: 'Kuiten',
  core: 'Core',
};
export const MUSCLE_ORDER = Object.keys(MUSCLES);

// equip: barbell | dumbbell | plate | bodyweight
// needs: rack | bench | incline | pullup (apparatuur die aanwezig moet zijn)
// bw: aandeel lichaamsgewicht dat je verplaatst (alleen bodyweight)
// key: hoofdoefening, krijgt een eigen krachtgrafiek op het dashboard
// alt: vervangers als de apparatuur ontbreekt
// est: [[oefening, factor]] — startgewicht schatten uit een verwante lift als je de oefening nog nooit deed
export const EXERCISES = [
  // Benen
  { id: 'squat', name: 'Squat', equip: 'barbell', needs: ['rack'], primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'], compound: true, key: true, alt: ['bulgarian'], est: [['pause_squat', 1.15], ['front_squat', 1.25]] },
  { id: 'pause_squat', name: 'Pause squat', equip: 'barbell', needs: ['rack'], primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'], compound: true, alt: ['squat'], est: [['squat', 0.85]] },
  { id: 'front_squat', name: 'Front squat', equip: 'barbell', needs: ['rack'], primary: ['quads'], secondary: ['glutes', 'core'], compound: true, alt: ['squat', 'bulgarian'], est: [['squat', 0.8]] },
  { id: 'reverse_lunge', name: 'Backstep lunge', equip: 'barbell', needs: ['rack'], primary: ['quads', 'glutes'], secondary: ['hamstrings'], compound: true, alt: ['bulgarian'] },
  { id: 'bulgarian', name: 'Bulgarian split squat', equip: 'dumbbell', needs: ['bench'], primary: ['quads', 'glutes'], secondary: [], compound: true, alt: [] },
  { id: 'rdl', name: 'Romanian deadlift', equip: 'barbell', needs: [], primary: ['hamstrings', 'glutes'], secondary: ['back'], compound: true, alt: [] },
  { id: 'deadlift', name: 'Deadlift', equip: 'barbell', needs: [], primary: ['glutes', 'hamstrings', 'back'], secondary: ['quads', 'core'], compound: true, key: true, alt: [], est: [['sumo_deadlift', 1.05]] },
  { id: 'sumo_deadlift', name: 'Sumo deadlift', equip: 'barbell', needs: [], primary: ['glutes', 'hamstrings', 'quads'], secondary: ['back', 'core'], compound: true, alt: ['deadlift'], est: [['deadlift', 0.95]] },
  { id: 'hip_thrust', name: 'Hip thrust', equip: 'barbell', needs: ['bench'], primary: ['glutes'], secondary: ['hamstrings'], compound: true, alt: ['rdl'], est: [['rdl', 1.2]] },
  { id: 'calf_raise', name: 'Calf raise', equip: 'barbell', needs: ['rack'], primary: ['calves'], secondary: [], alt: [] },

  // Duwen
  { id: 'bench', name: 'Bankdrukken', equip: 'barbell', needs: ['rack', 'bench'], primary: ['chest'], secondary: ['triceps', 'shoulders'], compound: true, key: true, alt: ['db_bench', 'pushup'], est: [['pause_bench', 1.1], ['cg_bench', 1.1]] },
  { id: 'pause_bench', name: 'Bankdrukken met pauze', equip: 'barbell', needs: ['rack', 'bench'], primary: ['chest'], secondary: ['triceps', 'shoulders'], compound: true, alt: ['bench'], est: [['bench', 0.9]] },
  { id: 'incline_bench', name: 'Incline bankdrukken', equip: 'barbell', needs: ['rack', 'incline'], primary: ['chest', 'shoulders'], secondary: ['triceps'], compound: true, key: true, alt: ['db_incline', 'bench'], est: [['bench', 0.8]] },
  { id: 'ohp', name: 'Shoulder press', equip: 'barbell', needs: ['rack'], primary: ['shoulders'], secondary: ['triceps', 'core'], compound: true, key: true, alt: ['db_ohp'], est: [['push_press', 0.87]] },
  { id: 'push_press', name: 'Push press', equip: 'barbell', needs: ['rack'], primary: ['shoulders'], secondary: ['triceps', 'quads'], compound: true, alt: ['ohp'], est: [['ohp', 1.15]] },
  { id: 'cg_bench', name: 'Close-grip bankdrukken', equip: 'barbell', needs: ['rack', 'bench'], primary: ['triceps', 'chest'], secondary: ['shoulders'], compound: true, alt: ['pushup'], est: [['bench', 0.9]] },
  { id: 'db_bench', name: 'Dumbbell bankdrukken', equip: 'dumbbell', needs: ['bench'], primary: ['chest'], secondary: ['triceps', 'shoulders'], compound: true, alt: ['pushup'] },
  { id: 'db_incline', name: 'Incline dumbbell press', equip: 'dumbbell', needs: ['incline'], primary: ['chest', 'shoulders'], secondary: ['triceps'], compound: true, alt: ['db_bench'] },
  { id: 'db_ohp', name: 'Dumbbell shoulder press', equip: 'dumbbell', needs: [], primary: ['shoulders'], secondary: ['triceps'], compound: true, alt: [] },
  { id: 'db_fly', name: 'Dumbbell flyes', equip: 'dumbbell', needs: ['bench'], primary: ['chest'], secondary: [], alt: [] },
  { id: 'pushup', name: 'Push-ups', equip: 'bodyweight', bw: 0.65, needs: [], primary: ['chest'], secondary: ['triceps', 'shoulders'], compound: true, alt: [] },
  { id: 'plate_raise', name: 'Plate raise (schuin omhoog)', equip: 'plate', needs: [], primary: ['shoulders'], secondary: [], alt: ['db_lateral'] },
  { id: 'db_lateral', name: 'Lateral raise', equip: 'dumbbell', needs: [], primary: ['shoulders'], secondary: [], alt: [] },
  { id: 'plate_triceps', name: 'Liggende triceps extension (plate)', equip: 'plate', needs: ['bench'], primary: ['triceps'], secondary: [], alt: ['db_triceps'] },
  { id: 'db_triceps', name: 'Overhead triceps extension', equip: 'dumbbell', needs: [], primary: ['triceps'], secondary: [], alt: [] },

  // Trekken
  { id: 'row', name: 'Barbell row', equip: 'barbell', needs: [], primary: ['back'], secondary: ['biceps', 'shoulders'], compound: true, key: true, alt: ['db_row'], est: [['pendlay_row', 1.1]] },
  { id: 'pendlay_row', name: 'Pendlay row', equip: 'barbell', needs: [], primary: ['back'], secondary: ['biceps', 'shoulders'], compound: true, alt: ['row'], est: [['row', 0.9]] },
  { id: 'db_row', name: 'Dumbbell row', equip: 'dumbbell', needs: ['bench'], primary: ['back'], secondary: ['biceps'], compound: true, alt: [] },
  { id: 'pullup', name: 'Pull-ups', equip: 'bodyweight', bw: 1, needs: ['pullup'], primary: ['back'], secondary: ['biceps'], compound: true, alt: ['inverted_row', 'db_row'], est: [['chinup', 1]] },
  { id: 'chinup', name: 'Chin-ups', equip: 'bodyweight', bw: 1, needs: ['pullup'], primary: ['back', 'biceps'], secondary: [], compound: true, alt: ['pullup', 'inverted_row'], est: [['pullup', 1]] },
  { id: 'inverted_row', name: 'Inverted row', equip: 'bodyweight', bw: 0.5, needs: ['rack'], primary: ['back'], secondary: ['biceps'], compound: true, alt: ['db_row'] },
  { id: 'rear_delt', name: 'Rear delt fly', equip: 'dumbbell', needs: [], primary: ['shoulders'], secondary: ['back'], alt: [] },
  { id: 'shrug', name: 'Shrugs', equip: 'barbell', needs: ['rack'], primary: ['back'], secondary: [], alt: [] },
  { id: 'db_curl', name: 'Dumbbell curl', equip: 'dumbbell', needs: [], primary: ['biceps'], secondary: [], alt: [], est: [['hammer_curl', 0.9]] },
  { id: 'hammer_curl', name: 'Hammer curl', equip: 'dumbbell', needs: [], primary: ['biceps'], secondary: [], alt: [], est: [['db_curl', 1.1]] },
  { id: 'bb_curl', name: 'Barbell curl', equip: 'barbell', needs: [], primary: ['biceps'], secondary: [], alt: ['db_curl'], est: [['db_curl', 1.8]] },

  // Core
  { id: 'knee_raise', name: 'Hanging knee raise', equip: 'bodyweight', bw: 0, noLoad: true, needs: ['pullup'], primary: ['core'], secondary: [], alt: ['plate_crunch'] },
  { id: 'plate_crunch', name: 'Crunch met plate', equip: 'plate', needs: [], primary: ['core'], secondary: [], alt: [] },
];

export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const EQUIP_LABEL = { barbell: 'Barbell', dumbbell: 'Dumbbells', plate: 'Plate', bodyweight: 'Lichaamsgewicht' };
export const ROLE_LABEL = { main: 'Hoofdoefening', secondary: 'Compound', accessory: 'Accessoire' };

// Doelen: sets × rep-bereik per rol, intensiteit, rust, deload-ritme,
// weekvolume-advies (sets per spiergroep) en gewenst tempo lichaamsgewicht (% per week).
export const GOALS = {
  hypertrophy: {
    label: 'Spiermassa',
    tag: 'Bulk',
    desc: 'Spiergroei met een licht calorie-overschot. Gemiddeld zwaar, veel kwaliteitsvolume.',
    main: { sets: 4, lo: 6, hi: 10 },
    secondary: { sets: 3, lo: 8, hi: 12 },
    accessory: { sets: 3, lo: 10, hi: 15 },
    rir: '1–2',
    rest: { main: '2–3 min', secondary: '90 s – 2 min', accessory: '60–90 s' },
    deloadEvery: 6,
    weekly: [10, 20],
    bwRate: [0.25, 0.5],
  },
  strength: {
    label: 'Kracht',
    tag: 'Kracht',
    desc: 'Zwaarder tillen met minder herhalingen. Focus op de grote compound lifts.',
    main: { sets: 5, lo: 3, hi: 5 },
    secondary: { sets: 3, lo: 5, hi: 8 },
    accessory: { sets: 3, lo: 8, hi: 12 },
    rir: '1–3',
    rest: { main: '3–4 min', secondary: '2–3 min', accessory: '60–90 s' },
    deloadEvery: 5,
    weekly: [6, 12],
    bwRate: [-0.25, 0.25],
  },
  cut: {
    label: 'Vetverlies',
    tag: 'Cut',
    desc: 'Afvallen en je kracht vasthouden. Zwaar blijven tillen, iets minder volume.',
    main: { sets: 3, lo: 5, hi: 8 },
    secondary: { sets: 3, lo: 6, hi: 10 },
    accessory: { sets: 2, lo: 10, hi: 15 },
    rir: '1–2',
    rest: { main: '2–3 min', secondary: '2 min', accessory: '60–90 s' },
    deloadEvery: 6,
    weekly: [6, 12],
    bwRate: [-1, -0.5],
  },
  health: {
    label: 'Fit & gezond',
    tag: 'Fit',
    desc: 'Consistent, gevarieerd en blessurevrij trainen. Gematigde gewichten.',
    main: { sets: 3, lo: 8, hi: 12 },
    secondary: { sets: 3, lo: 8, hi: 12 },
    accessory: { sets: 2, lo: 12, hi: 15 },
    rir: '2–3',
    rest: { main: '2 min', secondary: '90 s', accessory: '60 s' },
    deloadEvery: 8,
    weekly: [6, 12],
    bwRate: [-0.25, 0.25],
  },
};
export const GOAL_ORDER = ['hypertrophy', 'strength', 'cut', 'health'];

// Schema-sjablonen. Elke regel: [oefening, rol].
export const SPLITS = {
  ppl: {
    label: 'Benen / Duwen / Trekken',
    days: 3,
    desc: 'Jouw huidige indeling. Elke spiergroep één keer per week, flink zwaar.',
    template: [
      { name: 'Benen', ex: [['squat', 'main'], ['reverse_lunge', 'secondary'], ['rdl', 'secondary'], ['calf_raise', 'accessory'], ['knee_raise', 'accessory']] },
      { name: 'Duwen', ex: [['bench', 'main'], ['incline_bench', 'secondary'], ['ohp', 'secondary'], ['plate_raise', 'accessory'], ['plate_triceps', 'accessory']] },
      { name: 'Trekken', ex: [['deadlift', 'main'], ['row', 'secondary'], ['pullup', 'secondary'], ['db_curl', 'accessory'], ['rear_delt', 'accessory']] },
    ],
  },
  fullbody3: {
    label: 'Full body A / B / C',
    days: 3,
    desc: 'Elke spiergroep 2–3× per week. Sterk voor spiergroei bij 3 trainingen.',
    template: [
      { name: 'Full body A', ex: [['squat', 'main'], ['bench', 'main'], ['row', 'secondary'], ['plate_raise', 'accessory'], ['db_curl', 'accessory']] },
      { name: 'Full body B', ex: [['deadlift', 'main'], ['ohp', 'main'], ['pullup', 'secondary'], ['reverse_lunge', 'secondary'], ['plate_triceps', 'accessory']] },
      { name: 'Full body C', ex: [['incline_bench', 'main'], ['rdl', 'secondary'], ['db_row', 'secondary'], ['bulgarian', 'secondary'], ['db_lateral', 'accessory'], ['knee_raise', 'accessory']] },
    ],
  },
  fullbody2: {
    label: 'Full body A / B',
    days: 2,
    desc: 'Twee volledige trainingen per week. Efficiënt als je weinig tijd hebt.',
    template: [
      { name: 'Full body A', ex: [['squat', 'main'], ['bench', 'main'], ['row', 'secondary'], ['plate_raise', 'accessory'], ['db_curl', 'accessory']] },
      { name: 'Full body B', ex: [['deadlift', 'main'], ['ohp', 'main'], ['pullup', 'secondary'], ['reverse_lunge', 'secondary'], ['plate_triceps', 'accessory']] },
    ],
  },
  upperlower: {
    label: 'Upper / Lower',
    days: 4,
    desc: 'Vier trainingen per week, elke spiergroep 2×. Meer volume, kortere sessies.',
    template: [
      { name: 'Upper A', ex: [['bench', 'main'], ['row', 'secondary'], ['ohp', 'secondary'], ['chinup', 'secondary'], ['db_curl', 'accessory'], ['plate_triceps', 'accessory']] },
      { name: 'Lower A', ex: [['squat', 'main'], ['rdl', 'secondary'], ['reverse_lunge', 'secondary'], ['calf_raise', 'accessory'], ['knee_raise', 'accessory']] },
      { name: 'Upper B', ex: [['incline_bench', 'main'], ['pullup', 'secondary'], ['db_row', 'secondary'], ['plate_raise', 'accessory'], ['rear_delt', 'accessory'], ['hammer_curl', 'accessory']] },
      { name: 'Lower B', ex: [['deadlift', 'main'], ['front_squat', 'secondary'], ['hip_thrust', 'secondary'], ['calf_raise', 'accessory'], ['plate_crunch', 'accessory']] },
    ],
  },
};
export const SPLITS_BY_DAYS = { 2: ['fullbody2'], 3: ['ppl', 'fullbody3'], 4: ['upperlower'] };

// Varianten voor een nieuw blok: zelfde bewegingspatroon, andere prikkel.
// Volgorde = voorkeur. Dumbbell-varianten vallen af als je te sterk bent voor je dumbbells.
export const VARIANTS = {
  squat: ['pause_squat', 'front_squat'],
  pause_squat: ['squat', 'front_squat'],
  front_squat: ['squat', 'pause_squat'],
  reverse_lunge: ['bulgarian'],
  bulgarian: ['reverse_lunge'],
  rdl: ['hip_thrust'],
  hip_thrust: ['rdl'],
  deadlift: ['sumo_deadlift'],
  sumo_deadlift: ['deadlift'],
  bench: ['pause_bench', 'cg_bench'],
  pause_bench: ['bench'],
  cg_bench: ['bench', 'pause_bench'],
  incline_bench: ['db_incline'],
  db_incline: ['incline_bench'],
  ohp: ['push_press', 'db_ohp'],
  push_press: ['ohp'],
  db_ohp: ['ohp'],
  row: ['pendlay_row', 'db_row'],
  pendlay_row: ['row', 'db_row'],
  db_row: ['row'],
  pullup: ['chinup'],
  chinup: ['pullup'],
  inverted_row: ['pullup', 'chinup'],
  db_curl: ['hammer_curl', 'bb_curl'],
  hammer_curl: ['db_curl', 'bb_curl'],
  bb_curl: ['db_curl'],
  plate_raise: ['db_lateral'],
  db_lateral: ['plate_raise'],
  plate_triceps: ['db_triceps'],
  db_triceps: ['plate_triceps'],
  knee_raise: ['plate_crunch'],
  plate_crunch: ['knee_raise'],
};
