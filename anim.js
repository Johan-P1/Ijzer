// Bewegende stokfiguren per oefening (SVG, werkt offline).
// Elke animatie = een paar houdingen (keyframes). Een houding = heuppositie + romphoek + armen/benen.
// Ledematen: [hoek bovenste deel, hoek onderste deel] of { to: [x, y] } (hand/voet staat op een vast punt).
// Hoeken in graden: 0 = recht omlaag, 90 = naar voren (rechts), 180 = omhoog, -90 = naar achteren.

const L = { torso: 46, neck: 6, head: 9, ua: 25, fa: 23, th: 38, sh: 37, foot: 11 };
const G = 181; // enkelhoogte bij staan
const RAD = Math.PI / 180;
const dir = (a) => [Math.sin(a * RAD), Math.cos(a * RAD)];
const angTo = (dx, dy) => Math.atan2(dx, dy) / RAD;
const go = (p, a, l) => [p[0] + Math.sin(a * RAD) * l, p[1] + Math.cos(a * RAD) * l];
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAng = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

function ik(root, target, a, b, bend) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(a - b) + 0.01), a + b - 0.01);
  const cos = (a * a + d * d - b * b) / (2 * a * d);
  const first = angTo(dx, dy) + bend * (Math.acos(Math.min(1, Math.max(-1, cos))) / RAD);
  const mid = go(root, first, a);
  return [first, angTo(target[0] - mid[0], target[1] - mid[1])];
}

// Houding → hoeken (zodat we soepel kunnen interpoleren).
function resolve(p, view) {
  const hip = p.hip;
  const torso = p.torsoTo ? angTo(p.torsoTo[0] - hip[0], p.torsoTo[1] - hip[1]) : p.torso;
  const sh = go(hip, torso, L.torso);
  const off = view === 'front' ? 1 : 0;
  const roots = {
    ra: [sh[0] + 12 * off, sh[1]], la: [sh[0] - 12 * off, sh[1]],
    rl: [hip[0] + 7 * off, hip[1]], ll: [hip[0] - 7 * off, hip[1]],
  };
  const limbs = {};
  for (const k of ['ra', 'la', 'rl', 'll']) {
    const spec = p[k] ?? (k === 'la' ? p.ra : k === 'll' ? p.rl : null);
    const arm = k[1] === 'a';
    const [a, b] = arm ? [L.ua, L.fa] : [L.th, L.sh];
    if (!spec) limbs[k] = { ang: arm ? [0, 0] : [0, 0] };
    else if (Array.isArray(spec)) limbs[k] = { ang: spec };
    else {
      const bend = spec.bend ?? (arm ? -1 : 1);
      limbs[k] = { to: spec.to, bend, ang: ik(roots[k], spec.to, a, b, bend) };
    }
  }
  const footDef = view === 'front' ? { rf: 70, lf: -70 } : { rf: 90, lf: 90 };
  return {
    hip, torso, head: p.head ?? torso, curve: p.curve || 0, pulse: p.pulse || 0, limbs,
    rf: p.rf ?? footDef.rf, lf: p.lf ?? (p.rf ?? footDef.lf),
  };
}

function mix(A, B, t, view, pin) {
  let hip = [lerp(A.hip[0], B.hip[0], t), lerp(A.hip[1], B.hip[1], t)];
  const torso = lerpAng(A.torso, B.torso, t);
  const out = {
    hip, torso, head: lerpAng(A.head, B.head, t), curve: lerp(A.curve, B.curve, t), pulse: lerp(A.pulse, B.pulse, t),
    rf: lerpAng(A.rf, B.rf, t), lf: lerpAng(A.lf, B.lf, t), limbs: {},
  };
  const off = view === 'front' ? 1 : 0;
  // Vast scharnierpunt (bijv. de enkel): het lichaam draait er stijf omheen.
  if (pin) {
    const rl = [lerpAng(A.limbs.rl.ang[0], B.limbs.rl.ang[0], t), lerpAng(A.limbs.rl.ang[1], B.limbs.rl.ang[1], t)];
    const ankle = go(go([hip[0] + 7 * off, hip[1]], rl[0], L.th), rl[1], L.sh);
    hip = [hip[0] + pin[0] - ankle[0], hip[1] + pin[1] - ankle[1]];
    out.hip = hip;
  }
  const sh = go(hip, torso, L.torso);
  const roots = { ra: [sh[0] + 12 * off, sh[1]], la: [sh[0] - 12 * off, sh[1]], rl: [hip[0] + 7 * off, hip[1]], ll: [hip[0] - 7 * off, hip[1]] };
  for (const k of ['ra', 'la', 'rl', 'll']) {
    const a = A.limbs[k];
    const b = B.limbs[k];
    const arm = k[1] === 'a';
    if (a.to && b.to) {
      // beide keyframes op een vast punt: punt interpoleren en opnieuw oplossen (voeten blijven staan)
      const to = [lerp(a.to[0], b.to[0], t), lerp(a.to[1], b.to[1], t)];
      out.limbs[k] = ik(roots[k], to, arm ? L.ua : L.th, arm ? L.fa : L.sh, a.bend);
    } else {
      out.limbs[k] = [lerpAng(a.ang[0], b.ang[0], t), lerpAng(a.ang[1], b.ang[1], t)];
    }
  }
  out.sh = sh;
  out.roots = roots;
  return out;
}

const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

// ---------- rekwisieten ----------
const bench = (x, y, w) => ({ type: 'bench', x, y, w });
const bar = (x, y) => ({ type: 'bar', x, y });
const step = (x, y, w) => ({ type: 'step', x, y, w });

// ---------- animaties ----------
const STAND = { hip: [100, 106], torso: 180, ra: [8, 4], la: [-4, -2], rl: { to: [100, G] }, ll: { to: [100, G] } };
const S = (o) => ({ ...STAND, ...o });
const FRONT = { hip: [100, 106], torso: 180, ra: [14, 8], la: [-14, -8], rl: { to: [106, G] }, ll: { to: [94, G] } };
const F = (o) => ({ ...FRONT, ...o });

const bridgeA = { hip: [104, 180], torso: -90, head: -90, ra: [90, 90], rl: { to: [137, G] } };
const bridgeB = { hip: [99, 160], torsoTo: [58, 180], head: -90, ra: [90, 90], rl: { to: [137, G] } };
const marchA = S({ ra: [-35, -20], la: [45, 110], rl: [100, 4], ll: { to: [100, G] } });
const marchB = S({ ra: [45, 110], la: [-35, -20], rl: { to: [100, G] }, ll: [100, 4] });
const walkA = { hip: [100, 107], torso: 180, ra: [4, 0], la: [-4, 0], rl: [22, 8], ll: [-18, -28], rf: 90, lf: 120 };
const walkB = { ...walkA, rl: [-18, -28], ll: [22, 8], rf: 120, lf: 90 };
const stepJ = [
  F({}),
  F({ hip: [100, 107], ra: [150, 165], la: [-150, -165], rl: { to: [128, G] } }),
  F({}),
  F({ hip: [100, 107], ra: [150, 165], la: [-150, -165], ll: { to: [72, G] } }),
];
const deadA = { hip: [112, 180], torso: -90, head: -90, ra: [180, 180], la: [180, 180], rl: [180, 90], ll: [180, 90], rf: 180, lf: 180 };
const birdA = { hip: [80, 143], torsoTo: [126, 133], head: 100, ra: { to: [126, G] }, la: { to: [126, G] }, rl: [0, -90], ll: [0, -90], rf: -90, lf: -90 };

export const ANIMS = {
  glute_bridge: { frames: [bridgeA, bridgeB], dur: 2600, db: 'hip' },
  bridge_warm: { frames: [bridgeA, bridgeB], dur: 2600 },
  hip_thrust_bench: {
    props: [bench(22, 150, 46)], db: 'hip', dur: 2600,
    frames: [
      { hip: [98, 176], torsoTo: [64, 146], head: -125, ra: { to: [100, 169] }, rl: { to: [136, G] } },
      { hip: [108, 146], torsoTo: [64, 146], head: -100, ra: { to: [110, 139] }, rl: { to: [136, G] } },
    ],
  },
  db_rdl: {
    db: 'hands', dur: 3000,
    frames: [S({ hip: [100, 108], ra: [4, 2], la: [2, 0] }), S({ hip: [84, 114], torso: 102, head: 110, ra: [2, 0], la: [0, -2] })],
  },
  good_morning: {
    dur: 3000,
    frames: [S({ hip: [100, 108], ra: [30, 165], la: [28, 165] }), S({ hip: [86, 113], torso: 104, head: 110, ra: [-46, 89], la: [-48, 89] })],
  },
  db_swing: {
    db: 'r', dur: 1400, hold: 0.06,
    frames: [S({ hip: [86, 112], torso: 108, head: 112, ra: [-28, -28], la: [-28, -28] }), S({ ra: [92, 92], la: [92, 92] })],
  },
  kickback: {
    props: [bar(140, 97)], dur: 2200,
    frames: [
      { hip: [98, 107], torso: 174, head: 176, ra: { to: [138, 97] }, la: { to: [138, 97] }, rl: { to: [99, G] }, ll: { to: [96, G] } },
      { hip: [98, 107], torso: 166, head: 170, ra: { to: [138, 97] }, la: { to: [138, 97] }, rl: [-40, -42], ll: { to: [96, G] }, rf: 170 },
    ],
  },
  calf_raise: {
    props: [bar(136, 98)], db: 'r', dur: 2000,
    frames: [
      S({ ra: [4, 2], la: { to: [136, 98] } }),
      S({ hip: [100, 98], ra: [4, 2], la: { to: [136, 98] }, rl: { to: [100, 173] }, ll: { to: [100, 173] }, rf: 45, lf: 45 }),
    ],
  },
  pushup_bar: {
    props: [bar(164, 100)], dur: 2600, pin: [62, G],
    frames: [
      { hip: [99.5, 116], torso: 150, head: 150, ra: { to: [164, 100] }, rl: [-30, -30] },
      { hip: [115, 128], torso: 135, head: 138, ra: { to: [164, 100] }, rl: [-45, -45] },
    ],
  },
  inverted_row: {
    props: [bar(149, 73)], dur: 2600, pin: [40, G],
    frames: [
      { hip: [105, 143.5], torso: 120, head: 125, ra: { to: [149, 73] }, rl: [-60, -60], rf: 160 },
      { hip: [99, 135], torso: 136, head: 142, ra: { to: [149, 73] }, rl: [-44, -44], rf: 160 },
    ],
  },
  db_ohp_stand: {
    db: 'hands', dur: 2400,
    frames: [S({ ra: { to: [108, 58] }, la: { to: [106, 58] } }), S({ ra: [178, 178], la: [176, 176] })],
  },
  db_bench_press: {
    props: [bench(36, 140, 104)], db: 'hands', dur: 2600,
    frames: [
      { hip: [118, 134], torso: -90, head: -90, ra: [180, 180], la: [180, 180], rl: { to: [150, G] } },
      { hip: [118, 134], torso: -90, head: -90, ra: { to: [78, 124] }, la: { to: [76, 124] }, rl: { to: [150, G] } },
    ],
  },
  db_row_stand: {
    props: [bench(136, 146, 54)], db: 'r', dur: 2400,
    frames: [
      { hip: [86, 112], torso: 100, head: 105, ra: [2, 2], la: { to: [150, 143] }, rl: { to: [108, G] }, ll: { to: [72, G] } },
      { hip: [86, 112], torso: 100, head: 105, ra: { to: [116, 110] }, la: { to: [150, 143] }, rl: { to: [108, G] }, ll: { to: [72, G] } },
    ],
  },
  db_bent_row: {
    db: 'hands', dur: 2400,
    frames: [S({ hip: [88, 110], torso: 110, head: 112, ra: [0, 0], la: [0, 0] }), S({ hip: [88, 110], torso: 110, head: 112, ra: { to: [118, 112] }, la: { to: [116, 112] } })],
  },
  dead_bug: {
    dur: 4400, hold: 0.2,
    frames: [deadA, { ...deadA, ra: [-95, -95], ll: [95, 95], lf: 100 }, deadA, { ...deadA, la: [-95, -95], rl: [95, 95], rf: 100 }],
  },
  plank_bench: {
    props: [bench(128, 140, 60)], dur: 3000, pin: [70, G],
    frames: [
      { hip: [119, 125], torso: 139, head: 140, ra: { to: [150, 138] }, rl: [-41, -41] },
      { hip: [119, 123], torso: 141, head: 143, ra: { to: [150, 138] }, rl: [-39, -39] },
    ],
  },
  side_plank_bench: {
    props: [bench(30, 140, 64)], dur: 3200, hold: 0.25,
    frames: [
      { hip: [104.6, 148], torsoTo: [70, 112], head: -124, la: [0, 90], ra: [150, 150], rl: { to: [172, G] }, ll: { to: [168, G] } },
      { hip: [109, 141], torsoTo: [70, 112], head: -124, la: [0, 90], ra: [176, 176], rl: { to: [172, G] }, ll: { to: [168, G] } },
    ],
  },
  farmer_carry: { db: 'hands', dur: 1100, hold: 0, frames: [walkA, walkB] },
  suitcase_carry: { db: 'r', dur: 1100, hold: 0, frames: [{ ...walkA, la: [-8, -8] }, { ...walkB, la: [-8, -8] }] },
  march_fast: { dur: 900, hold: 0.05, frames: [marchA, marchB] },
  march: { dur: 1600, hold: 0.1, frames: [marchA, marchB] },
  shadow_box: {
    dur: 800, hold: 0.1,
    frames: [
      S({ hip: [100, 108], torso: 175, head: 178, ra: [95, 92], la: { to: [116, 58] }, rl: { to: [110, G] }, ll: { to: [86, G] } }),
      S({ hip: [100, 108], torso: 175, head: 178, ra: { to: [118, 60] }, la: [95, 92], rl: { to: [110, G] }, ll: { to: [86, G] } }),
    ],
  },
  step_jacks: { view: 'front', dur: 2000, frames: stepJ },
  jumping_jacks: {
    view: 'front', dur: 900, hold: 0.05,
    frames: [F({}), F({ hip: [100, 100], ra: [150, 165], la: [-150, -165], rl: { to: [126, 176] }, ll: { to: [74, 176] } })],
  },
  goblet_squat: {
    db: 'chest', dur: 2800,
    frames: [
      S({ ra: { to: [112, 82] }, la: { to: [110, 82] } }),
      S({ hip: [84, 146], torso: 158, head: 165, ra: { to: [110, 118] }, la: { to: [108, 118] } }),
    ],
  },
  box_squat: {
    props: [bench(30, 148, 54)], db: 'chest', dur: 2800,
    frames: [
      S({ ra: { to: [112, 82] }, la: { to: [110, 82] } }),
      S({ hip: [82, 142], torso: 160, head: 166, ra: { to: [108, 114] }, la: { to: [106, 114] } }),
    ],
  },
  step_up: {
    props: [step(112, 166, 40)], dur: 2400,
    frames: [
      { hip: [100, 107], torso: 178, ra: [6, 2], la: [-6, -2], rl: { to: [124, 160] }, ll: { to: [96, G] } },
      { hip: [122, 86], torso: 180, ra: [6, 2], la: [-6, -2], rl: { to: [124, 160] }, ll: [20, -10] },
    ],
  },
  reverse_lunge: {
    db: 'hands', dur: 2600,
    frames: [
      S({ ra: [2, 0], la: [2, 0], rl: { to: [104, G] }, ll: { to: [100, G] } }),
      S({ hip: [94, 140], torso: 178, ra: [2, 0], la: [2, 0], rl: { to: [112, G] }, ll: { to: [58, G] }, lf: 150 }),
    ],
  },
  thruster: {
    db: 'hands', dur: 2000, hold: 0.1,
    frames: [
      S({ hip: [84, 146], torso: 158, head: 165, ra: { to: [112, 106] }, la: { to: [110, 106] } }),
      S({ ra: [178, 178], la: [176, 176] }),
    ],
  },
  bird_dog: {
    dur: 4000, hold: 0.2,
    frames: [birdA, { ...birdA, ra: [95, 95], ll: [-92, -92], lf: -100 }, birdA, { ...birdA, la: [95, 95], rl: [-92, -92], rf: -100 }],
  },
  breathing: {
    dur: 5000, hold: 0.15,
    frames: [S({ ra: { to: [110, 86] }, la: { to: [107, 86] }, pulse: 4 }), S({ ra: { to: [113, 84] }, la: { to: [110, 84] }, pulse: 14 })],
  },
  cat_cow_stand: {
    dur: 4000, hold: 0.2,
    frames: [
      S({ hip: [90, 112], torso: 118, head: 140, curve: -0.8, ra: { to: [116, 140] }, la: { to: [114, 140] } }),
      S({ hip: [90, 112], torso: 120, head: 75, curve: 0.9, ra: { to: [116, 140] }, la: { to: [114, 140] } }),
    ],
  },
  arm_circles: {
    view: 'front', dur: 1600, hold: 0,
    frames: [
      F({ rl: { to: [112, G] }, ll: { to: [88, G] }, ra: [90, 90], la: [-90, -90] }),
      F({ rl: { to: [112, G] }, ll: { to: [88, G] }, ra: [108, 108], la: [-108, -108] }),
      F({ rl: { to: [112, G] }, ll: { to: [88, G] }, ra: [90, 90], la: [-90, -90] }),
      F({ rl: { to: [112, G] }, ll: { to: [88, G] }, ra: [72, 72], la: [-72, -72] }),
    ],
  },
  hamstring_stretch: {
    props: [step(124, 168, 34)], dur: 4000, hold: 0.25,
    frames: [
      { hip: [96, 108], torso: 176, ra: [10, 10], la: [8, 8], rl: { to: [140, 164] }, ll: { to: [94, G] }, rf: 160 },
      { hip: [90, 110], torso: 132, head: 138, ra: { to: [132, 150] }, la: { to: [130, 150] }, rl: { to: [140, 164] }, ll: { to: [94, G] }, rf: 160 },
    ],
  },
  chest_stretch: {
    props: [bar(54, 66)], dur: 4000, hold: 0.25,
    frames: [S({ la: { to: [56, 66] } }), S({ hip: [103, 106], torso: 184, la: { to: [56, 66] } })],
  },
  hip_flexor_stand: {
    dur: 4000, hold: 0.25,
    frames: [
      { hip: [96, 110], torso: 180, ra: { to: [104, 108] }, la: { to: [100, 108] }, rl: { to: [122, G] }, ll: { to: [62, G] }, lf: 120 },
      { hip: [101, 113], torso: 184, ra: { to: [109, 111] }, la: { to: [105, 111] }, rl: { to: [122, G] }, ll: { to: [62, G] }, lf: 120 },
    ],
  },
};

// ---------- tekenen ----------
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};
const pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

function drawProps(svg, props) {
  el('line', { x1: 8, x2: 192, y1: 186, y2: 186, class: 'a-floor' }, svg);
  for (const p of props || []) {
    if (p.type === 'bench') {
      el('rect', { x: p.x, y: p.y, width: p.w, height: 7, rx: 2, class: 'a-prop' }, svg);
      el('line', { x1: p.x + 6, x2: p.x + 6, y1: p.y + 7, y2: 186, class: 'a-leg' }, svg);
      el('line', { x1: p.x + p.w - 6, x2: p.x + p.w - 6, y1: p.y + 7, y2: 186, class: 'a-leg' }, svg);
    } else if (p.type === 'step') {
      el('rect', { x: p.x, y: p.y, width: p.w, height: 186 - p.y, rx: 2, class: 'a-prop' }, svg);
    } else if (p.type === 'bar') {
      el('line', { x1: p.x + 18, x2: p.x + 18, y1: 28, y2: 186, class: 'a-rack' }, svg);
      el('line', { x1: p.x, x2: p.x + 18, y1: p.y, y2: p.y, class: 'a-rack' }, svg);
      el('circle', { cx: p.x, cy: p.y, r: 4.5, class: 'a-bar' }, svg);
    }
  }
}

function setup(svg) {
  const spec = ANIMS[svg.dataset.anim];
  if (!spec) return null;
  const view = spec.view || 'side';
  const frames = spec.frames.map((f) => resolve(f, view));
  drawProps(svg, spec.props);
  const g = el('g', { class: 'a-fig' + (view === 'front' ? ' front' : '') }, svg);
  const far = 'a-limb' + (view === 'front' ? '' : ' far');
  const E = {
    pulse: el('circle', { class: 'a-pulse', r: 0, cx: 0, cy: 0 }, g),
    ll: el('polyline', { class: far }, g),
    la: el('polyline', { class: far }, g),
    dbL: spec.db === 'hands' ? el('circle', { class: 'a-db' + (view === 'front' ? '' : ' far'), r: 5.5 }, g) : null,
    torso: el('path', { class: 'a-limb' }, g),
    neck: el('line', { class: 'a-limb' }, g),
    head: el('circle', { class: 'a-head', r: L.head }, g),
    dbHip: spec.db === 'hip' ? el('circle', { class: 'a-db', r: 6.5 }, g) : null,
    rl: el('polyline', { class: 'a-limb' }, g),
    ra: el('polyline', { class: 'a-limb' }, g),
    dbR: ['hands', 'r', 'chest'].includes(spec.db) ? el('circle', { class: 'a-db', r: 5.5 }, g) : null,
  };
  svg.__fig = { spec, view, frames, E, t0: performance.now() };
  svg.dataset.ready = '1';
  return svg.__fig;
}

function render(fig, P) {
  const { E, view } = fig;
  const { hip, sh, roots } = P;
  const neck = go(sh, P.head, L.neck);
  const head = go(neck, P.head, L.head);
  const limb = (k, a, b) => {
    const r = roots[k];
    const m = go(r, P.limbs[k][0], a);
    return [r, m, go(m, P.limbs[k][1], b)];
  };
  const ra = limb('ra', L.ua, L.fa);
  const la = limb('la', L.ua, L.fa);
  const rl = limb('rl', L.th, L.sh);
  const ll = limb('ll', L.th, L.sh);
  rl.push(go(rl[2], P.rf, L.foot));
  ll.push(go(ll[2], P.lf, L.foot));
  if (view === 'front') {
    ra.unshift(sh);
    la.unshift(sh);
    rl.unshift(hip);
    ll.unshift(hip);
  }
  E.ra.setAttribute('points', pts(ra));
  E.la.setAttribute('points', pts(la));
  E.rl.setAttribute('points', pts(rl));
  E.ll.setAttribute('points', pts(ll));
  // romp: licht gebogen als curve ≠ 0 (kat-koe)
  const mx = (hip[0] + sh[0]) / 2;
  const my = (hip[1] + sh[1]) / 2;
  const d = dir(P.torso);
  const c = [mx - d[1] * P.curve * 14, my + d[0] * P.curve * 14];
  E.torso.setAttribute('d', `M${hip[0].toFixed(1)},${hip[1].toFixed(1)} Q${c[0].toFixed(1)},${c[1].toFixed(1)} ${sh[0].toFixed(1)},${sh[1].toFixed(1)}`);
  E.neck.setAttribute('x1', sh[0]);
  E.neck.setAttribute('y1', sh[1]);
  E.neck.setAttribute('x2', neck[0]);
  E.neck.setAttribute('y2', neck[1]);
  E.head.setAttribute('cx', head[0]);
  E.head.setAttribute('cy', head[1]);
  const put = (e, p) => {
    if (!e) return;
    e.setAttribute('cx', p[0]);
    e.setAttribute('cy', p[1]);
  };
  put(E.dbR, ra[ra.length - 1]);
  put(E.dbL, la[la.length - 1]);
  if (E.dbHip) put(E.dbHip, [hip[0], hip[1] - 8]);
  if (P.pulse) {
    const ch = [lerp(hip[0], sh[0], 0.7) + 6, lerp(hip[1], sh[1], 0.7)];
    put(E.pulse, ch);
    E.pulse.setAttribute('r', P.pulse);
    E.pulse.setAttribute('opacity', Math.min(1, P.pulse / 14));
  }
}

function poseAt(fig, now) {
  const { spec, frames, view } = fig;
  const n = frames.length;
  const seg = (spec.dur || 2400) / n;
  const hold = spec.hold ?? 0.18;
  const cycle = seg * n;
  const t = (((now - fig.t0) % cycle) + cycle) % cycle; // rAF-tijd kan net vóór t0 liggen
  const i = Math.min(n - 1, Math.floor(t / seg));
  const local = (t - i * seg) / seg;
  const k = local < hold ? 0 : ease((local - hold) / (1 - hold));
  return mix(frames[i], frames[(i + 1) % n], k, view, spec.pin);
}

const live = new Set();
let raf = 0;
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(now) {
  raf = 0;
  for (const svg of live) {
    if (!svg.isConnected) {
      live.delete(svg);
      continue;
    }
    render(svg.__fig, poseAt(svg.__fig, now));
  }
  if (live.size && !reduced) raf = requestAnimationFrame(loop);
}

export const hasAnim = (id) => !!ANIMS[id];

// Testhulp: toon een animatie stilstaand op een fractie (0–1) van de cyclus.
export function freezeAt(svg, frac) {
  const fig = svg.__fig || setup(svg);
  if (!fig) return;
  live.delete(svg);
  render(fig, poseAt(fig, fig.t0 + (fig.spec.dur || 2400) * frac));
}

// Liggende oefeningen gebruiken alleen de onderkant van het beeld: inzoomen.
const VB = {
  glute_bridge: '14 112 182 84', bridge_warm: '14 112 182 84', dead_bug: '6 104 190 92',
  hip_thrust_bench: '14 96 176 100', db_bench_press: '20 60 170 136', side_plank_bench: '20 70 170 126',
};

export function animSVG(id, cls = '') {
  if (!ANIMS[id]) return '';
  return `<svg class="anim ${cls}" viewBox="${VB[id] || '0 0 200 200'}" data-anim="${id}" aria-hidden="true"></svg>`;
}

export function mountAnims(root = document) {
  root.querySelectorAll('svg[data-anim]:not([data-ready])').forEach((svg) => {
    const fig = setup(svg);
    if (!fig) return;
    render(fig, poseAt(fig, reduced ? fig.t0 + (fig.spec.dur || 2400) / 2 : performance.now()));
    live.add(svg);
  });
  if (live.size && !raf && !reduced) raf = requestAnimationFrame(loop);
}
