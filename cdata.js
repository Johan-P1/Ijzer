// Circuitmodus: oefeningen, warming-up, cooling-down, fases en schema-sjablonen.
//
// knee: belasting van de knie (0 = geen, 1 = licht/kleine buiging, 2 = gemiddeld, 3 = diepe buiging onder gewicht)
// impact: springen · kneel: op de knieën · load: db2 (2 dumbbells) | db1 (1 dumbbell) | bw (lichaamsgewicht)
// start: startgewicht per dumbbell voor [weinig ervaring, wat ervaring, ervaren]
// harder/easier: tip als het te licht/te zwaar was bij oefeningen zonder gewicht

export const CX = {
  // ---------- heupen & billen (knievriendelijk) ----------
  glute_bridge: {
    name: 'Glute bridge', knee: 1, load: 'db1', start: [5, 7.5, 12.5], needs: [],
    cues: ['Op je rug, voeten heupbreed plat op de grond', 'Adem uit en duw je heupen omhoog tot een rechte lijn', 'Knijp bovenin 1 tel je billen samen', 'Ribben omlaag: geen holle onderrug'],
    kneeTip: 'Zet je voeten iets verder van je billen af: dan werken je hamstrings meer en je knieën minder.',
    yt: 'glute bridge dumbbell techniek', easier: 'Zonder dumbbell', harder: 'Zwaardere dumbbell op je heupen',
  },
  hip_thrust_bench: {
    name: 'Hip thrust op de bank', knee: 1, load: 'db1', start: [7.5, 10, 15], needs: ['bench'],
    cues: ['Schouderbladen tegen de rand van de bank', 'Dumbbell op je heupen, vasthouden met twee handen', 'Duw je heupen omhoog tot je romp horizontaal is', 'Kin licht naar je borst, kijk naar voren'],
    kneeTip: 'Je knieën blijven stil staan: de beweging zit helemaal in je heupen.',
    yt: 'hip thrust bench dumbbell uitleg',
  },
  db_rdl: {
    name: 'Romanian deadlift', knee: 1, load: 'db2', start: [5, 7.5, 12.5], needs: [],
    cues: ['Knieën licht gebogen en stil houden', 'Duw je billen naar achteren, rug blijft recht', 'Dumbbells langs je benen tot net onder de knie', 'Adem uit en kom omhoog door je billen aan te spannen'],
    kneeTip: 'Je knieën buigen nauwelijks: denk aan een deur dichtduwen met je billen.',
    yt: 'romanian deadlift dumbbell beginners',
  },
  db_swing: {
    name: 'Dumbbell swing', knee: 1, load: 'db1', start: [5, 7.5, 12.5], needs: [],
    cues: ['Dumbbell met twee handen aan één kant vast', 'Billen naar achteren, dumbbell tussen je benen door', 'Explosief je heupen naar voren: de dumbbell zweeft tot borsthoogte', 'Armen ontspannen, de kracht komt uit je billen'],
    kneeTip: 'Niet squatten: buig je knieën maar een klein beetje en scharnier in je heupen.',
    yt: 'dumbbell swing hip hinge uitleg',
  },
  kickback: {
    name: 'Standing kickback', knee: 0, load: 'bw', needs: ['rack'],
    cues: ['Handen aan het rack, rechtop staan', 'Gestrekt been rustig naar achteren', 'Knijp je bil aan, rug blijft recht', 'Wissel halverwege van been'],
    kneeTip: 'Houd beide knieën gestrekt: je billen doen het werk.',
    yt: 'standing glute kickback uitleg', harder: 'Langzamer en 2 tellen vasthouden bovenin',
  },
  calf_raise: {
    name: 'Kuitheffen', knee: 0, load: 'db1', start: [5, 7.5, 10], needs: ['rack'],
    cues: ['Eén hand aan het rack voor balans', 'Kom rustig op je tenen', '1 tel vasthouden bovenin', 'Langzaam weer zakken'],
    kneeTip: 'Knieën gestrekt houden.', yt: 'standing calf raise dumbbell',
  },

  // ---------- duwen ----------
  pushup_bar: {
    name: 'Push-up tegen de stang', knee: 0, load: 'bw', needs: ['rack'],
    cues: ['Stang in het rack op heuphoogte', 'Lichaam één rechte plank van hoofd tot hielen', 'Borst naar de stang, ellebogen schuin naar achteren', 'Adem uit bij het wegduwen'],
    kneeTip: 'Je benen blijven gestrekt: geen belasting op je knieën.',
    yt: 'incline push up barbell rack beginner', harder: 'Zet de stang een gaatje lager', easier: 'Zet de stang een gaatje hoger',
  },
  db_ohp_stand: {
    name: 'Shoulder press', knee: 0, load: 'db2', start: [2.5, 5, 7.5], needs: [],
    cues: ['Rechtop, buik licht aangespannen', 'Dumbbells op schouderhoogte', 'Adem uit en druk ze recht omhoog', 'Rustig terug naar je schouders'],
    kneeTip: 'Knieën zacht maar niet gebogen.', yt: 'standing dumbbell shoulder press beginner',
  },
  db_bench_press: {
    name: 'Dumbbell bankdrukken', knee: 1, load: 'db2', start: [5, 7.5, 10], needs: ['bench'],
    cues: ['Op je rug op de bank, voeten plat op de grond', 'Dumbbells boven je borst', 'Rustig zakken tot je ellebogen net onder de bank zijn', 'Adem uit en druk omhoog'],
    kneeTip: 'Ga zitten en leg je dan op de bank, zoals op een stoel.', yt: 'dumbbell bench press beginner',
  },

  // ---------- trekken ----------
  inverted_row: {
    name: 'Inverted row', knee: 0, load: 'bw', needs: ['rack'],
    cues: ['Stang op borsthoogte in het rack: hoe hoger, hoe makkelijker', 'Hielen op de grond, lichaam recht', 'Trek je borst naar de stang', 'Knijp je schouderbladen samen'],
    kneeTip: 'Benen gestrekt: je knieën doen niets.',
    yt: 'inverted row beginner barbell rack', harder: 'Zet de stang een gaatje lager', easier: 'Zet de stang een gaatje hoger',
  },
  db_row_stand: {
    name: 'Eenarmige row (staand)', knee: 1, load: 'db1', start: [5, 7.5, 10], needs: ['bench'],
    cues: ['Eén hand op de bank, beide voeten op de grond', 'Rug plat, kijk naar de grond', 'Trek de dumbbell naar je heup', 'Wissel halverwege van arm'],
    kneeTip: 'Niet knielen op de bank: blijf staan met zachte knieën.', yt: 'one arm dumbbell row standing',
  },
  db_bent_row: {
    name: 'Voorovergebogen row', knee: 1, load: 'db2', start: [5, 5, 7.5], needs: [],
    cues: ['Knieën licht gebogen, heupen naar achteren', 'Rug recht, schuin voorover', 'Trek de dumbbells naar je ribben', 'Schouderbladen samen'],
    kneeTip: 'Zelfde houding als de romanian deadlift: knieën bijna gestrekt.', yt: 'bent over dumbbell row form',
  },

  // ---------- core ----------
  dead_bug: {
    name: 'Dead bug', knee: 0, load: 'bw', needs: [],
    cues: ['Op je rug, armen omhoog, knieën boven je heupen', 'Onderrug zacht tegen de grond', 'Adem uit en strek tegenovergestelde arm en been', 'Langzaam! Stop voordat je rug hol wordt'],
    kneeTip: 'Je benen hangen in de lucht: geen druk op je knieën.',
    pp: 'Zie je een bolling midden op je buik? Maak de beweging kleiner.',
    yt: 'dead bug exercise postpartum', easier: 'Beweeg alleen je armen', harder: 'Langzamer, 3 tellen per kant',
  },
  plank_bench: {
    name: 'Plank tegen de bank', knee: 0, load: 'bw', needs: ['bench'],
    cues: ['Handen op de bank, lichaam één rechte lijn', 'Buik zacht intrekken, rustig doorademen', 'Billen niet omhoog en niet laten hangen'],
    kneeTip: 'Benen gestrekt.', pp: 'Bolt je buik op in het midden? Kies een hogere steun.',
    yt: 'incline plank bench beginner', harder: 'Handen op een lagere steun', easier: 'Handen op het rack, hoger',
  },
  side_plank_bench: {
    name: 'Side plank tegen de bank', knee: 0, load: 'bw', needs: ['bench'],
    cues: ['Onderarm op de bank, elleboog onder je schouder', 'Benen gestrekt, voeten achter elkaar', 'Heupen omhoog tot een rechte lijn', 'Wissel halverwege van kant'],
    kneeTip: 'Gestrekte benen: je steunt op je voeten, niet op je knieën.', yt: 'incline side plank bench',
  },
  farmer_carry: {
    name: 'Farmer carry', knee: 1, load: 'db2', start: [7.5, 10, 15], needs: [],
    cues: ['Zware dumbbell in elke hand', 'Rechtop, schouders laag en naar achteren', 'Kleine rustige stappen, heen en weer lopen', 'Buik licht aangespannen'],
    kneeTip: 'Gewoon wandelen: kleine stappen houden je knieën rustig.', yt: 'farmers carry dumbbell uitleg',
  },
  suitcase_carry: {
    name: 'Suitcase carry', knee: 1, load: 'db1', start: [7.5, 10, 12.5], needs: [],
    cues: ['Eén dumbbell in één hand', 'Blijf recht: niet scheef hangen', 'Rustige stappen, heen en weer', 'Wissel halverwege van hand'],
    kneeTip: 'Gewoon wandelen met kleine stappen.', yt: 'suitcase carry core exercise',
  },

  // ---------- conditie zonder springen ----------
  march_fast: {
    name: 'Marcheren (hoog tempo)', knee: 1, load: 'bw', needs: [],
    cues: ['Knieën om de beurt omhoog', 'Armen actief meebewegen', 'Rechtop blijven, tempo hoog'],
    kneeTip: 'Til je knie zo hoog als prettig voelt, zonder gewicht erop.', yt: 'high knee march low impact',
  },
  step_jacks: {
    name: 'Step jacks', knee: 1, load: 'bw', needs: [],
    cues: ['Stap om en om opzij terwijl je armen omhoog gaan', 'Geen sprong: altijd één voet aan de grond', 'Hoger tempo = zwaarder'],
    kneeTip: 'Kleine stapjes, knieën zacht.', yt: 'low impact jumping jacks step jacks',
  },
  shadow_box: {
    name: 'Schaduwboksen', knee: 0, load: 'bw', needs: [],
    cues: ['Lichte stand, één voet iets voor', 'Om en om snel stoten', 'Adem uit bij elke stoot', 'Handen terug naar je gezicht'],
    kneeTip: 'Voeten blijven staan, knieën zacht.', yt: 'shadow boxing workout beginners',
  },

  // ---------- kniebelastend (alleen bij gezonde knieën) ----------
  goblet_squat: {
    name: 'Goblet squat', knee: 3, load: 'db1', start: [5, 7.5, 12.5], needs: [],
    cues: ['Dumbbell rechtop voor je borst', 'Zak tussen je hielen, borst omhoog', 'Knieën in de richting van je tenen', 'Adem uit bij het omhoog komen'],
    kneeTip: 'Zak alleen zo diep als pijnvrij voelt.', yt: 'goblet squat beginner uitleg',
  },
  box_squat: {
    name: 'Squat naar de bank', knee: 2, load: 'db1', start: [5, 7.5, 10], needs: ['bench'],
    cues: ['Bank achter je, dumbbell voor je borst', 'Billen naar achteren tot je de bank raakt', 'Niet ploffen: tik de bank aan', 'Adem uit en sta op'],
    kneeTip: 'De bank bepaalt hoe diep je gaat: veilig en altijd hetzelfde.', yt: 'box squat dumbbell beginner',
  },
  step_up: {
    name: 'Step-up', knee: 2, load: 'bw', needs: [],
    cues: ['Lage traptrede of verhoging', 'Hele voet op de trede', 'Duw jezelf omhoog via je hiel', 'Rustig weer naar beneden, wissel van been'],
    kneeTip: 'Hoe lager de trede, hoe minder je knie hoeft te buigen.', yt: 'step up exercise beginner low step',
  },
  reverse_lunge: {
    name: 'Lunge naar achteren', knee: 3, load: 'db2', start: [2.5, 5, 7.5], needs: [],
    cues: ['Stap groot naar achteren', 'Zak tot beide knieën ongeveer 90 graden zijn', 'Voorste knie boven je enkel', 'Duw terug via je voorste hiel'],
    kneeTip: 'Maak de stap kleiner of zak minder diep als het zeurt.', yt: 'reverse lunge dumbbell beginner',
  },
  thruster: {
    name: 'Thruster', knee: 3, load: 'db2', start: [2.5, 5, 7.5], needs: [],
    cues: ['Dumbbells op je schouders', 'Squat', 'Kom krachtig omhoog en druk de dumbbells in één beweging boven je hoofd'],
    kneeTip: 'Alleen met gezonde knieën.', yt: 'dumbbell thruster form',
  },
  jumping_jacks: {
    name: 'Jumping jacks', knee: 2, impact: true, load: 'bw', needs: [],
    cues: ['Spring met je benen uit elkaar terwijl je armen omhoog gaan', 'Licht landen op je voorvoet', 'Ritme vasthouden'],
    kneeTip: 'Land zacht met licht gebogen knieën.', yt: 'jumping jacks proper form',
  },
};

// Warming-up en cooling-down: rustige bewegingen op tijd.
export const WX = {
  breathing: { name: 'Ademhaling', cues: ['Handen op je ribben', 'Adem diep in naar je handen', 'Bij het uitademen: bekkenbodem en onderbuik licht ophijsen', '5 rustige ademhalingen'], yt: '360 breathing core connection postpartum' },
  cat_cow_stand: { name: 'Kat-koe (staand)', cues: ['Handen op je dijen, knieën zacht', 'Rug hol en borst open, kijk omhoog', 'Rug bol, kin naar je borst', 'Rustig wisselen op je ademhaling'], yt: 'standing cat cow stretch' },
  arm_circles: { name: 'Armcirkels', cues: ['Armen opzij', 'Kleine cirkels die steeds groter worden', 'Halverwege de andere kant op'], yt: 'arm circles warm up' },
  good_morning: { name: 'Heupscharnier', cues: ['Handen op je borst', 'Billen naar achteren, rug recht', 'Voel de rek achter in je benen', 'Terug omhoog door je billen aan te spannen'], yt: 'bodyweight good morning hip hinge' },
  bridge_warm: { name: 'Glute bridge (zonder gewicht)', cues: ['Op je rug, voeten plat', 'Adem uit en heupen omhoog', 'Rustig tempo'], yt: 'glute bridge beginner' },
  march: { name: 'Marcheren', cues: ['Rustig op de plaats lopen', 'Knieën om de beurt omhoog', 'Armen mee'], yt: 'marching in place warm up' },
  step_jacks: { name: 'Step jacks', cues: ['Om en om opzij stappen, armen omhoog', 'Geen sprong'], yt: 'low impact jumping jacks step jacks' },
  bird_dog: { name: 'Bird dog', kneel: true, cues: ['Op handen en knieën', 'Strek tegenovergestelde arm en been', 'Rug blijft plat'], yt: 'bird dog exercise' },
  hamstring_stretch: { name: 'Rek achterkant been', cues: ['Hiel op een lage verhoging, been gestrekt', 'Rug recht, buig voorover vanuit je heupen', 'Wissel halverwege'], yt: 'standing hamstring stretch' },
  chest_stretch: { name: 'Borst openen', cues: ['Hand tegen het rack op schouderhoogte', 'Draai rustig van je arm weg', 'Wissel halverwege'], yt: 'doorway chest stretch' },
  hip_flexor_stand: { name: 'Heup openen (staand)', cues: ['Grote stap, achterste been gestrekt', 'Kantel je bekken naar voren, billen aanspannen', 'Wissel halverwege'], yt: 'standing hip flexor stretch' },
};

export const WARMUP = [
  ['breathing', 60], ['cat_cow_stand', 40], ['arm_circles', 40], ['good_morning', 40],
  ['bridge_warm', 40], ['bird_dog', 40], ['march', 40], ['step_jacks', 40],
];
export const COOLDOWN = [['hamstring_stretch', 40], ['chest_stretch', 40], ['hip_flexor_stand', 40], ['breathing', 60]];

// Fases van 4 weken. Week 4 en 8 zijn lichter (één ronde minder).
export const PHASES = [
  { n: 1, name: 'Basis', from: 1, to: 4, work: 30, rest: 30, rounds: 3, roundRest: 60, fin: 4, focus: 'Techniek en ademhaling. Rustig leren bewegen.' },
  { n: 2, name: 'Opbouw', from: 5, to: 8, work: 40, rest: 20, rounds: 3, roundRest: 60, fin: 5, focus: 'Zwaardere gewichten, langer doorwerken.' },
  { n: 3, name: 'Pittig', from: 9, to: 12, work: 45, rest: 15, rounds: 4, roundRest: 60, fin: 6, focus: 'Korte rust, vol gas. Hier mag je kapot gaan.' },
];

// Schema: per positie een voorkeurslijst; de eerste die bij knieën/springen/apparatuur past wordt gekozen.
export const CIRCUIT_TEMPLATE = [
  {
    name: 'Training A', focus: 'Onderlichaam & duwen',
    slots: [['goblet_squat', 'box_squat', 'glute_bridge'], ['pushup_bar', 'db_ohp_stand'], ['db_rdl'], ['db_row_stand', 'db_bent_row'], ['dead_bug']],
    finisher: { type: 'tabata', items: [['jumping_jacks', 'step_jacks', 'march_fast'], ['shadow_box']] },
  },
  {
    name: 'Training B', focus: 'Heupen & trekken',
    slots: [['db_swing', 'db_rdl'], ['inverted_row', 'db_bent_row'], ['reverse_lunge', 'step_up', 'kickback'], ['db_ohp_stand'], ['suitcase_carry']],
    finisher: { type: 'amrap', items: [[['db_swing', 'db_rdl'], '8×'], [['pushup_bar', 'db_ohp_stand'], '6×'], [['march_fast'], '20 sec']] },
  },
  {
    name: 'Training C', focus: 'Full body',
    slots: [['thruster', 'hip_thrust_bench', 'glute_bridge'], ['db_bent_row', 'db_row_stand'], ['db_bench_press', 'pushup_bar'], ['step_up', 'farmer_carry'], ['plank_bench', 'side_plank_bench']],
    finisher: { type: 'amrap', items: [[['db_rdl'], '10×'], [['db_ohp_stand'], '8×'], [['farmer_carry'], '30 sec']] },
  },
];

// Doelen in circuitmodus (eigen tekst; de rest van de doel-instellingen komt uit GOALS).
export const CIRCUIT_GOALS = {
  cut: { label: 'Afvallen', desc: 'Vet verbranden met pittige circuits, kracht behouden en rustig richting je streefgewicht.' },
  health: { label: 'Fitter worden', desc: 'Conditie en kracht opbouwen, zonder focus op de weegschaal.' },
};

export const KNEE_MAX = { ok: 3, sensitive: 2, pain: 1 };
export const KNEE_LABEL = { ok: 'Geen klachten', sensitive: 'Gevoelig', pain: 'Pijn bij buigen' };
export const EXPERIENCE = ['Weinig of geen', 'Wat ervaring', 'Ervaren'];
export const FEELING = ['Rustig', 'Goed te doen', 'Pittig', 'Zwaar', 'Kapot'];
