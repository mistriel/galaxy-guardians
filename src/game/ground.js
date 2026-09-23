import * as THREE from 'three';
import { T } from './i18n.js';

/** Easy arcade timings. A full push resolves in about half a minute. */
const PHASE_LEN = {
  artillery: 9,
  armor: 10,
  infantry: 9,
  special: 8,
  resolve: 99,
};

const PHASE_ORDER = ['artillery', 'armor', 'infantry', 'special', 'resolve'];

export const GROUND_WORLDS = [
  {
    id: 'forest',
    name: 'יער זוהר',
    blurb: 'שחר זהוב בין עצים מאירים.',
    sky: 0x7ec8e3,
    skyTop: 0x2f6f9a,
    skyHorizon: 0xffe0a8,
    fog: 0xffe0a8,
    ground: 0x3c9a55,
    lane: 0xd7b56a,
    accent: 0x7dffb2,
    prop: 0x1f8f4a,
    glow: 0xfff1a8,
    enemy: 0xc45cff,
    special: 'lantern',
    specialName: 'אורן הנוצץ',
  },
  {
    id: 'desert',
    name: 'מדבר אדום',
    blurb: 'שקיעה חמה, שיחים ופרחים.',
    sky: 0xffb07a,
    skyTop: 0x6a3a78,
    skyHorizon: 0xffb07a,
    fog: 0xffb07a,
    ground: 0xe2b06a,
    lane: 0xc98448,
    accent: 0xff8a5a,
    prop: 0xc45a3a,
    glow: 0xffe08a,
    enemy: 0x6a1a3a,
    special: 'drum',
    specialName: 'תוף המדבר',
  },
  {
    id: 'ice',
    name: 'קרח כחול',
    blurb: 'שמי ורוד־כחול, שלג וגבישים.',
    sky: 0xf8c6de,
    skyTop: 0x3a4a9a,
    skyHorizon: 0xf8c6de,
    fog: 0xe7f4ff,
    ground: 0xe7f6ff,
    lane: 0xc5d8ee,
    accent: 0x7ec8ff,
    prop: 0x9ad0f0,
    glow: 0xffd0ea,
    enemy: 0xff6b9a,
    special: 'crown',
    specialName: 'כתר הקרח',
  },
];

const FRIENDLY = 0xf4f7fb;

function hexCss(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function skyTexture(top, horizon, warm) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const paint = ctx.createLinearGradient(0, 0, 0, 512);
  paint.addColorStop(0, hexCss(top));
  paint.addColorStop(0.34, hexCss(top));
  paint.addColorStop(0.55, hexCss(horizon));
  paint.addColorStop(0.74, hexCss(warm));
  paint.addColorStop(1, hexCss(warm));
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = 'rgba(255, 252, 245, 0.62)';
  const clouds = [
    [120, 110, 110, 28], [340, 78, 140, 32], [560, 130, 90, 24],
    [760, 96, 120, 30], [920, 150, 80, 22], [250, 168, 70, 18],
    [480, 54, 60, 16], [680, 170, 100, 22],
  ];
  for (const [x, y, rx, ry] of clouds) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.45, y + 4, rx * 0.55, ry * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fieldTexture(base, lite, speck) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hexCss(base);
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80; i += 1) {
    ctx.globalAlpha = 0.16 + (i % 5) * 0.05;
    ctx.fillStyle = hexCss(i % 3 === 0 ? lite : speck);
    ctx.beginPath();
    ctx.ellipse(
      (i * 97) % 512,
      (i * 53) % 512,
      16 + (i % 7) * 8,
      10 + (i % 5) * 7,
      i * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mat(color, emissive = 0x000000, intensity = 0.2) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.48,
    metalness: 0.18,
  });
}

function addBox(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, rt, rb, h, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** Barrel points down local −Z. pitch > 0 raises the muzzle. yaw > 0 swings toward −X. */
function addGun(parent, radius, length, material, x, y, z, yaw = 0, pitch = 0) {
  const mount = new THREE.Group();
  mount.position.set(x, y, z);
  mount.rotation.order = 'YXZ';
  mount.rotation.y = yaw;
  mount.rotation.x = pitch;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, length, 8), material);
  tube.rotation.x = Math.PI / 2;
  tube.position.z = -length * 0.5;
  mount.add(tube);
  const lip = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.35, radius * 0.9, Math.max(0.12, length * 0.14), 8),
    material,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.z = -length;
  mount.add(lip);
  parent.add(mount);
  return mount;
}

function makeArtillery(accent) {
  const root = new THREE.Group();
  const dark = mat(0x243044, 0x101820, 0.3);
  const hot = mat(accent, accent, 0.55);
  addBox(root, 1.5, 0.45, 2.2, dark, 0, 0.35, 0);
  const tube = addCyl(root, 0.18, 0.22, 2.4, hot, 0, 0.85, -0.6);
  tube.rotation.x = Math.PI / 2.4;
  addCyl(root, 0.38, 0.38, 0.28, dark, -0.7, 0.38, 0).rotation.z = Math.PI / 2;
  addCyl(root, 0.38, 0.38, 0.28, dark, 0.7, 0.38, 0).rotation.z = Math.PI / 2;
  root.userData.tube = tube;
  return root;
}

function makeTank(accent) {
  const root = new THREE.Group();
  const body = mat(FRIENDLY, 0x243040, 0.25);
  const trim = mat(accent, accent, 0.45);
  addBox(root, 2.5, 0.7, 3.3, body, 0, 0.55, 0);
  addBox(root, 2.7, 0.28, 3.5, trim, 0, 0.22, 0);
  const turret = addBox(root, 1.15, 0.55, 1.35, trim, 0, 1.15, 0.1);
  const barrel = addCyl(root, 0.1, 0.12, 1.7, body, 0, 1.2, -1.35);
  barrel.rotation.x = Math.PI / 2;
  root.userData.turret = turret;
  return root;
}

/**
 * משמיד — one turquoise hull wearing every gun.
 * Heavy cannons, an artillery rack, and fat nuclear tubes. Ground lob only.
 */
function makeDestroyer() {
  const root = new THREE.Group();
  const hull = mat(0x1ad4c8, 0x0a4e48, 0.48);
  const dark = mat(0x102028, 0x041014, 0.2);
  const white = mat(0xf7fbff, 0x9aabba, 0.28);
  const steel = mat(0x2a3644, 0x121820, 0.4);
  const brass = mat(0xd4a017, 0x6a4808, 0.45);
  const nuke = mat(0xff7a1c, 0xff4a00, 0.85);
  const coreMat = mat(0xfff1b0, 0xff6a00, 1.15);
  const cores = [];

  const track = (x) => {
    addBox(root, 0.78, 0.58, 5.6, dark, x, 0.34, 0);
    for (let i = 0; i < 6; i += 1) {
      const wheel = addCyl(root, 0.26, 0.26, 0.2, steel, x, 0.26, -2.15 + i * 0.86);
      wheel.rotation.z = Math.PI / 2;
    }
  };
  track(-2.05);
  track(2.05);

  addBox(root, 3.5, 0.95, 4.7, hull, 0, 0.95, 0.05);
  addBox(root, 3.7, 0.16, 4.95, white, 0, 0.52, 0.05);
  addBox(root, 2.4, 0.38, 2.2, hull, 0, 1.58, 0.2);
  addBox(root, 1.5, 0.62, 1.7, hull, 0, 2.05, -0.2);
  addCyl(root, 0.78, 0.9, 0.22, steel, 0, 1.78, -0.15);

  const gun = (radius, length, material, x, y, z, yaw, pitch, nuclear) => {
    const mount = addGun(root, radius, length, material, x, y, z, yaw, pitch);
    if (!nuclear) return mount;
    const core = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.12, radius * 0.55), 8, 8), coreMat);
    core.position.z = -length - 0.08;
    mount.add(core);
    cores.push(core);
    return mount;
  };

  gun(0.22, 3.3, steel, 0, 2.15, -1.15, 0, 0.05, false);
  gun(0.13, 2.5, steel, -0.48, 2.28, -1.05, 0, 0.08, false);
  gun(0.13, 2.5, steel, 0.48, 2.28, -1.05, 0, 0.02, false);
  gun(0.32, 1.7, nuke, -1.15, 1.25, -1.7, 0.12, 0.04, true);
  gun(0.32, 1.7, nuke, 1.15, 1.25, -1.7, -0.12, 0.04, true);
  gun(0.16, 2.05, brass, -1.7, 1.05, -0.4, 0.55, 0.05, false);
  gun(0.16, 2.05, brass, 1.7, 1.05, -0.4, -0.55, 0.05, false);
  for (let i = 0; i < 10; i += 1) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    gun(0.08, 1.55, brass, -0.72 + col * 0.36, 2.45 + row * 0.28, 0.85, 0, 0.85 + (i % 2) * 0.12, false);
  }
  for (let i = 0; i < 6; i += 1) {
    gun(0.045, 0.85, white, -0.75 + i * 0.3, 2.55, -0.55, (i - 2.5) * 0.08, 0.2, false);
  }
  gun(0.07, 1.15, steel, -1.85, 1.55, 0.4, 1.15, 0.1, false);
  gun(0.07, 1.15, steel, 1.85, 1.55, 0.4, -1.15, 0.1, false);
  gun(0.07, 1.05, steel, -1.85, 0.95, 1.1, 1.35, 0, false);
  gun(0.07, 1.05, steel, 1.85, 0.95, 1.1, -1.35, 0, false);
  gun(0.1, 1.25, steel, -0.45, 1.45, 2.15, Math.PI, 0.12, false);
  gun(0.1, 1.25, steel, 0.45, 1.45, 2.15, Math.PI, 0.2, false);
  gun(0.26, 1.15, nuke, 0.15, 2.7, 0.15, 0, 1.15, true);

  addBox(root, 0.85, 0.4, 0.7, dark, 1.15, 1.55, 1.35);
  addBox(root, 0.6, 0.32, 0.55, white, -1.2, 1.5, 1.15);

  root.userData.cores = cores;
  return root;
}

const CAR_GUNS = {
  machine: { cd: 0.2, radius: 0.1, dur: 0.18, arc: 0.15, range: 9, spread: 1.1, hold: 0.08, splash: 1.6, kick: -0.06 },
  cannon: { cd: 0.78, radius: 0.34, dur: 0.4, arc: 1.5, range: 14, spread: 1.8, hold: 0.4, splash: 4.4, kick: -0.22 },
  mortar: { cd: 1.05, radius: 0.28, dur: 0.72, arc: 5.4, range: 16, spread: 3.2, hold: 0.28, splash: 4.6, kick: -0.42 },
};

/** Combat car: cabin, four wheels, and a mounted gun — machine, cannon, or mortar. */
function makeGunCar(accent, foe = false, gun = 'machine') {
  const root = new THREE.Group();
  const paint = foe ? squadTint(accent, true) : accent;
  const bed = mat(paint, paint, foe ? 0.28 : 0.42);
  const cab = mat(foe ? 0x2a2236 : FRIENDLY, foe ? 0x120c18 : 0x243040, 0.22);
  const dark = mat(0x1b2430, 0x080c12, 0.15);
  const glass = mat(0xc5dcff, 0x1a4ea8, 0.55);
  const brass = mat(0xffd56a, 0x8a5a10, 0.45);
  addBox(root, 1.85, 0.28, 3.15, bed, 0, 0.36, 0);
  addBox(root, 1.2, 0.62, 1.05, cab, 0, 0.78, 0.72);
  addBox(root, 0.72, 0.26, 0.5, glass, 0, 0.96, 0.28);
  const turret = new THREE.Group();
  turret.position.set(0, 0.7, -0.45);
  root.add(turret);
  const muzzle = new THREE.Object3D();
  if (gun === 'cannon') {
    const barrel = addCyl(turret, 0.14, 0.18, 1.55, brass, 0, 0.18, -0.55);
    barrel.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.18, -1.45);
  } else if (gun === 'mortar') {
    const barrel = addCyl(turret, 0.16, 0.2, 0.9, brass, 0, 0.32, -0.1);
    barrel.rotation.x = 1.15;
    muzzle.position.set(0, 0.62, -0.62);
  } else {
    for (const x of [-0.11, 0.11]) {
      const barrel = addCyl(turret, 0.045, 0.06, 1.2, cab, x, 0.14, -0.45);
      barrel.rotation.x = Math.PI / 2;
    }
    muzzle.position.set(0, 0.14, -1.15);
  }
  turret.add(muzzle);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(gun === 'machine' ? 0.14 : 0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: gun === 'mortar' ? 0xffb0e0 : gun === 'cannon' ? 0xffd56a : (foe ? paint : 0xfff1b8), transparent: true, opacity: 0 }),
  );
  flash.position.copy(muzzle.position);
  turret.add(flash);
  const wheels = [];
  for (const [x, z] of [[-0.78, 1.05], [0.78, 1.05], [-0.78, -1.05], [0.78, -1.05]]) {
    const wheel = addCyl(root, 0.32, 0.32, 0.2, dark, x, 0.32, z);
    wheel.rotation.z = Math.PI / 2;
    wheels.push(wheel);
  }
  root.userData.turret = turret;
  root.userData.muzzle = muzzle;
  root.userData.flash = flash;
  root.userData.wheels = wheels;
  root.userData.gun = gun;
  return root;
}

function squadTint(accent, foe) {
  const color = new THREE.Color(accent);
  if (foe && color.r + color.g + color.b < 1.15) color.offsetHSL(0, 0.08, 0.2);
  return color;
}

/** Original toy soldier. Tunic, pants, and a rifle read at battle distance. */
function makeInfantry(accent, foe = false) {
  const root = new THREE.Group();
  const tunicColor = squadTint(accent, foe);
  const cloth = mat(tunicColor, tunicColor, foe ? 0.32 : 0.5);
  const pants = mat(foe ? 0x2a2236 : 0xf4efe2, foe ? 0x120c18 : 0xc8b89a, 0.12);
  const skin = mat(0xffd2b0, 0x5a3020, 0.1);
  const boot = mat(foe ? 0x1a1422 : 0x3a2a22, 0x100c0a, 0.16);
  const helm = mat(foe ? 0x4a2848 : 0xf7fbff, accent, 0.42);
  const sashMat = mat(foe ? 0xff8ab8 : 0xffd56a, foe ? 0xff8ab8 : 0xffe08a, 0.6);
  const steel = mat(0x2a3442, 0x101820, 0.35);

  const pivotLimb = (x, y, material, radius, length) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const limbMesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 3, 8), material);
    limbMesh.position.y = -(length * 0.5 + radius * 0.2);
    pivot.add(limbMesh);
    root.add(pivot);
    return pivot;
  };

  const legL = pivotLimb(-0.14, 0.64, pants, 0.08, 0.36);
  const legR = pivotLimb(0.14, 0.64, pants, 0.08, 0.36);
  for (const x of [-0.14, 0.14]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), boot);
    foot.scale.set(1, 0.5, 1.35);
    foot.position.set(x, 0.05, 0.03);
    root.add(foot);
  }
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), pants);
  hips.scale.set(1.25, 0.7, 0.9);
  hips.position.set(0, 0.66, 0);
  root.add(hips);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 10), cloth);
  chest.position.set(0, 1.08, 0);
  chest.userData.baseY = 1.08;
  root.add(chest);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), sashMat);
  stripe.position.set(0, 1.12, -0.16);
  root.add(stripe);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 6, 14), sashMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, 0.9, 0);
  root.add(belt);
  const cape = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.32, 3, 6), sashMat);
  cape.scale.set(1.6, 1, 0.28);
  cape.position.set(0, 1.05, 0.16);
  root.add(cape);

  const armL = pivotLimb(-0.32, 1.22, cloth, 0.055, 0.28);
  const armR = pivotLimb(0.32, 1.22, cloth, 0.055, 0.26);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin);
  hand.position.set(0, -0.36, 0);
  armL.add(hand);
  const rifle = new THREE.Group();
  rifle.position.set(0.02, -0.4, -0.02);
  const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.72, 3, 6), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.22;
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 6, 5),
    mat(foe ? 0xffd0ea : 0xfff1a8, foe ? 0xffd0ea : 0xffe08a, 0.9),
  );
  tip.position.z = -0.58;
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshBasicMaterial({
      color: foe ? 0xffd0ea : 0xfff6c8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  flash.position.z = -0.64;
  const muzzle = new THREE.Object3D();
  muzzle.position.z = -0.68;
  rifle.add(barrel, tip, flash, muzzle);
  armR.add(rifle);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skin);
  head.position.set(0, 1.52, 0);
  root.add(head);
  const eyeWhite = mat(0xfff8f2, 0x000000, 0);
  const pupil = mat(0x2a211c, 0x000000, 0);
  for (const x of [-0.075, 0.075]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), eyeWhite);
    white.position.set(x, 1.55, -0.19);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), pupil);
    dot.position.set(x, 1.55, -0.22);
    root.add(white, dot);
  }
  const cheekMat = mat(0xff9a8a, 0xff9a8a, 0.28);
  for (const x of [-0.11, 0.11]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), cheekMat);
    cheek.position.set(x, 1.46, -0.17);
    root.add(cheek);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.011, 6, 10, Math.PI),
    mat(0x6a3030, 0x000000, 0),
  );
  smile.position.set(0, 1.42, -0.19);
  smile.rotation.z = Math.PI;
  root.add(smile);

  if (foe) {
    for (const x of [-0.3, 0.3]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), helm);
      pad.scale.y = 0.5;
      pad.position.set(x, 1.26, 0);
      root.add(pad);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8), helm);
    cap.scale.set(1.05, 0.45, 1.05);
    cap.position.set(0, 1.66, 0);
    root.add(cap);
    const crest = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 2, 6), sashMat);
    crest.position.set(0, 1.8, 0);
    root.add(crest);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), helm);
    cap.scale.y = 0.48;
    cap.position.set(0, 1.66, 0.01);
    root.add(cap);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 6), boot);
    pole.position.set(0.3, 1.35, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.02), mat(0xf7fbff, accent, 0.5));
    flag.position.set(0.42, 1.5, 0);
    root.add(pole, flag);
    root.userData.flag = flag;
  }
  root.userData.swing = { legL, legR, armL, armR, chest, rifle };
  root.userData.flash = flash;
  root.userData.muzzle = muzzle;
  return root;
}

function makeSpecial(kind, world) {
  const root = new THREE.Group();
  const glow = mat(world.glow, world.glow, 0.85);
  const accent = mat(world.accent, world.accent, 0.5);
  if (kind === 'lantern') {
    for (let i = 0; i < 3; i += 1) {
      const leg = addCyl(root, 0.08, 0.12, 2.2, accent, Math.cos((i / 3) * Math.PI * 2) * 0.45, 1.1, Math.sin((i / 3) * Math.PI * 2) * 0.45);
      leg.rotation.z = 0.18 * (i - 1);
    }
    const lamp = addCyl(root, 0.55, 0.55, 0.55, glow, 0, 2.35, 0);
    lamp.scale.y = 0.8;
    root.userData.lamp = lamp;
  } else if (kind === 'drum') {
    const drum = addCyl(root, 1.35, 1.35, 1.6, accent, 0, 1.35, 0);
    drum.rotation.z = Math.PI / 2;
    addCyl(root, 1.45, 1.45, 0.28, glow, 0.7, 1.35, 0).rotation.z = Math.PI / 2;
    addCyl(root, 1.45, 1.45, 0.28, glow, -0.7, 1.35, 0).rotation.z = Math.PI / 2;
  } else {
    addBox(root, 2.4, 0.35, 3.2, accent, 0, 0.4, 0);
    for (let i = 0; i < 5; i += 1) {
      const crystal = addCyl(root, 0.02, 0.28, 1.4 + (i % 2) * 0.6, glow, (i - 2) * 0.42, 1.3, 0);
      crystal.rotation.z = (i - 2) * 0.08;
    }
  }
  return root;
}

function blob(parent, r, material, x, y, z, sy = 0.8) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), material);
  mesh.position.set(x, y, z);
  mesh.scale.y = sy;
  parent.add(mesh);
  return mesh;
}

function shadeMesh(root) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return root;
}

function makeTree(world, i) {
  const root = new THREE.Group();
  const trunkMat = mat(0x6b3a22, 0x2a1408, 0.12);
  if (world.id === 'desert') {
    if (i % 3 === 0) {
      for (let s = 0; s < 4; s += 1) {
        const seg = addCyl(root, 0.13, 0.2, 0.72, trunkMat, Math.sin(s * 0.8) * 0.08, 0.36 + s * 0.55, 0);
        seg.rotation.z = 0.07;
      }
      const leafMat = mat(0x3fbf6a, 0x146b32, 0.25);
      const crown = new THREE.Group();
      crown.position.y = 2.55;
      root.add(crown);
      for (let arm = 0; arm < 7; arm += 1) {
        const a = (arm / 7) * Math.PI * 2 + i * 0.4;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 1.45), leafMat);
        leaf.position.set(Math.sin(a) * 0.72, 0.02, Math.cos(a) * 0.72);
        leaf.rotation.y = -a;
        leaf.rotation.x = 0.62;
        crown.add(leaf);
      }
      blob(root, 0.2, mat(0xffe08a, 0xffe08a, 0.85), 0.15, 2.45, 0.1, 0.7);
    } else {
      const coral = mat(i % 2 ? 0xff8a5a : 0xd4653a, 0xff7a4a, 0.32);
      const gold = mat(0xffe08a, 0xffe08a, 0.7);
      blob(root, 0.9, coral, 0, 0.72, 0, 0.7);
      blob(root, 0.58, coral, 0.72, 0.9, 0.18, 0.78);
      blob(root, 0.5, gold, -0.58, 0.98, -0.12, 0.74);
      blob(root, 0.28, mat(0xffd0ea, 0xffd0ea, 0.6), 0.18, 1.28, 0.32, 0.9);
    }
  } else if (world.id === 'ice') {
    const snow = mat(0xf7fbff, 0xd7f4ff, 0.4);
    const ice = mat(0x9ad7ff, 0x7ec8ff, 0.45);
    const pink = mat(0xffb7d8, 0xffd0ea, 0.7);
    if (i % 2 === 0) {
      blob(root, 1.05, snow, 0, 1.2, 0, 1.2);
      blob(root, 0.72, ice, 0.04, 2.2, 0, 1.15);
      blob(root, 0.4, snow, 0, 3.1, 0, 1.1);
      const shard = addCyl(root, 0.02, 0.16, 1.05, pink, 0.55, 1.35, 0.15);
      shard.rotation.z = -0.4;
    } else {
      blob(root, 0.95, ice, 0, 0.62, 0, 0.5);
      blob(root, 0.55, snow, 0, 1.28, 0, 0.7);
      addCyl(root, 0.02, 0.2, 1.45, pink, -0.38, 1.05, 0).rotation.z = 0.28;
      addCyl(root, 0.02, 0.14, 1.1, mat(0xfff6fb, 0xffd0ea, 0.85), 0.42, 1.2, 0.08).rotation.z = -0.32;
      blob(root, 0.16, mat(0xffffff, 0xffd0ea, 0.95), 0, 1.85, 0, 1);
    }
  } else {
    const deep = mat(i % 2 ? 0x1f9a48 : 0x147a38, 0x0d4a28, 0.2);
    const lite = mat(0x8dffb8, 0x1f8f4a, 0.28);
    const gold = mat(0xfff1a8, 0xffe08a, 0.8);
    const h = 2.35 + (i % 3) * 0.4;
    addCyl(root, 0.18, 0.36, h, trunkMat, 0, h * 0.5, 0);
    blob(root, 1.2, deep, 0, h * 0.7, 0, 0.7);
    blob(root, 0.82, lite, 0.62, h * 0.95, 0.22, 0.78);
    blob(root, 0.74, deep, -0.55, h * 1.02, -0.16, 0.76);
    blob(root, 0.5, lite, 0.08, h * 1.28, 0.04, 0.82);
    blob(root, 0.16, gold, 0.9, h * 0.5, 0.4, 1);
    blob(root, 0.12, gold, -0.72, h * 0.42, -0.2, 1);
    blob(root, 0.32, deep, 0.85, 0.32, 0.35, 0.55);
  }
  return shadeMesh(root);
}

function makePlant(world, i) {
  const root = new THREE.Group();
  const petalColor = world.id === 'desert'
    ? (i % 2 ? 0xff8a5a : 0xffe08a)
    : world.id === 'ice'
      ? (i % 2 ? 0xffb7d8 : 0xd7f2ff)
      : (i % 2 ? 0xffb7d8 : 0xfff1a8);
  const stemColor = world.id === 'desert' ? 0x8a5a28 : world.id === 'ice' ? 0x7eb6dd : 0x1f8a4c;
  const stem = mat(stemColor, 0x000000, 0.08);
  const petal = mat(petalColor, petalColor, 0.4);
  addCyl(root, 0.03, 0.045, 0.36, stem, 0, 0.18, 0);
  for (let p = 0; p < 5; p += 1) {
    const a = (p / 5) * Math.PI * 2 + i;
    const petalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), petal);
    petalMesh.position.set(Math.cos(a) * 0.11, 0.42, Math.sin(a) * 0.11);
    petalMesh.scale.set(1.15, 0.5, 0.8);
    root.add(petalMesh);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(0xfff6d0, 0xffe08a, 0.85));
  core.position.y = 0.44;
  root.add(core);
  return root;
}

function scatterBlades(root, world, color, count, height, spread = 160, z0 = -78, zLen = 130) {
  const geo = new THREE.ConeGeometry(0.08, height, 4);
  geo.translate(0, height * 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, mat(color, world.glow, 0.18), count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    dummy.position.set((Math.random() - 0.5) * spread, 0, z0 + Math.random() * zLen);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.75 + Math.random() * 1.15;
    dummy.scale.set(s, 0.7 + Math.random() * 1.05, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
}

function addGrass(root, world) {
  if (world.id === 'desert') {
    scatterBlades(root, world, 0xc98448, 220, 0.55);
    scatterBlades(root, world, 0xe7c07a, 90, 0.85, 34, -6, 26);
  } else if (world.id === 'ice') {
    scatterBlades(root, world, 0xf7fbff, 240, 0.5);
    scatterBlades(root, world, 0xb7e4ff, 110, 0.9, 32, -4, 24);
  } else {
    scatterBlades(root, world, 0x2ea85a, 260, 0.62);
    scatterBlades(root, world, 0x8ae07a, 120, 0.95, 34, -4, 26);
  }
}

function addHills(root, world) {
  const color = world.id === 'forest' ? 0x2c8a4c : world.id === 'desert' ? 0xd08948 : 0xd7eaff;
  const hillMat = mat(color, color, 0.04);
  hillMat.roughness = 1;
  const spots = [[-62, -78, 22], [70, -70, 18], [-16, -104, 26], [28, -98, 20], [-80, -12, 14], [82, 4, 13]];
  for (const [x, z, r] of spots) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), hillMat);
    hill.scale.y = 0.3;
    hill.position.set(x, -r * 0.18, z);
    hill.receiveShadow = true;
    root.add(hill);
  }
}

function addSkyDress(root, world) {
  const sunColor = world.id === 'ice' ? 0xfff0f6 : 0xfff3c4;
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: sunColor, fog: false, depthWrite: false }),
  );
  sun.position.set(46, 32, -58);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(13, 14, 10),
    new THREE.MeshBasicMaterial({
      color: world.glow,
      transparent: true,
      opacity: 0.32,
      fog: false,
      depthWrite: false,
    }),
  );
  halo.position.copy(sun.position);
  root.add(sun, halo);
  const puff = new THREE.MeshBasicMaterial({
    color: world.id === 'desert' ? 0xffe4cc : 0xfffaf4,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const spots = [
    [-30, 24, -22, 4.4], [16, 28, -36, 5.4], [-6, 22, -58, 4.6],
    [34, 26, -16, 3.4], [-40, 30, -46, 5], [6, 34, -74, 5.8],
    [50, 20, -32, 3], [-14, 18, -6, 2.6],
  ];
  for (const [x, y, z, s] of spots) {
    const cloud = new THREE.Group();
    [[0, 0, 0, 1], [0.85, 0.08, 0.12, 0.7], [-0.75, 0.04, 0.06, 0.62], [0.28, 0.26, -0.08, 0.48]].forEach(([dx, dy, dz, r]) => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), puff);
      ball.position.set(dx, dy, dz);
      cloud.add(ball);
    });
    cloud.position.set(x, y, z);
    cloud.scale.setScalar(s);
    root.add(cloud);
  }
}

function addFlowers(root, world) {
  const colors = world.id === 'desert'
    ? [0xfff1a8, 0xff8a5a, 0xffd0ea]
    : world.id === 'ice'
      ? [0xffd0ea, 0xffffff, 0xb7e4ff]
      : [0xffd0ea, 0xfff1a8, 0xffffff];
  const geo = new THREE.SphereGeometry(0.13, 8, 6);
  for (const color of colors) {
    const mesh = new THREE.InstancedMesh(geo, mat(color, color, 0.55), 36);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i += 1) {
      dummy.position.set((Math.random() - 0.5) * 140, 0.16, -70 + Math.random() * 120);
      dummy.scale.setScalar(0.7 + Math.random() * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }
}

function makeProp(world, i) {
  const root = new THREE.Group();
  if (world.id === 'forest') {
    const trunk = addCyl(root, 0.12, 0.18, 1.1, mat(0x3a2414), 0, 0.55, 0);
    const crown = addCyl(root, 0.05, 0.9, 1.8, mat(world.prop, world.glow, 0.35), 0, 1.8, 0);
    crown.rotation.y = i;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(world.glow, world.glow, 0.9));
    lamp.position.y = 0.35;
    root.add(lamp);
    trunk.position.y = 0.55;
  } else if (world.id === 'desert') {
    addBox(root, 1.2 + (i % 3) * 0.3, 0.7 + (i % 2) * 0.5, 1.1, mat(world.prop, 0x4a2010, 0.2), 0, 0.5, 0);
    addBox(root, 0.7, 0.45, 0.6, mat(world.glow, world.glow, 0.25), 0.2, 1.05, 0.1);
  } else {
    const crystal = addCyl(root, 0.02, 0.45, 1.6 + (i % 3) * 0.4, mat(world.prop, world.glow, 0.55), 0, 0.9, 0);
    crystal.rotation.z = ((i % 5) - 2) * 0.12;
  }
  return root;
}

export class GroundBattle {
  constructor(sfx) {
    this.sfx = sfx;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 420);
    this.look = new THREE.Vector3(0, 1, -12);
    this.camera.position.set(0, 24, 34);
    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x1a2838, 0.95);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.55);
    this.sun.position.set(30, 48, 18);
    this.fill = new THREE.DirectionalLight(0xffc2d8, 0.45);
    this.fill.position.set(-28, 16, -12);
    this.sun.castShadow = false;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 180;
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.045;
    this.sun.target.position.set(0, 0, -8);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.fill);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.units = [];
    this.shells = [];
    this.bits = [];
    this.barricades = [];
    this.tubes = [];
    this.world = GROUND_WORLDS[0];
    this.phase = 'artillery';
    this.phaseT = 0;
    this.hold = 100;
    this.capture = 0;
    this.lane = 0;
    this.retreating = false;
    this.outcome = null;
    this.shellCd = 1;
    this.destroyerCd = 1;
    this.shake = 0;
    this.active = false;
    this.flagCloth = null;
    const q = (id) => (typeof document === 'undefined' ? null : document.querySelector(id));
    this.dom = {
      phase: q('#ground-phase'),
      world: q('#ground-world'),
      hold: q('#ground-hold-bar'),
      capture: q('#ground-capture-bar'),
      note: q('#ground-note'),
    };
  }

  start(worldId) {
    this.world = GROUND_WORLDS.find((item) => item.id === worldId) || GROUND_WORLDS[0];
    this.scene.background = new THREE.Color(this.world.skyHorizon);
    this.scene.fog = new THREE.FogExp2(this.world.fog, 0.0048);
    this.sun.castShadow = true;
    this.hemi.color.setHex(this.world.skyHorizon);
    this.hemi.groundColor.setHex(this.world.ground);
    this.hemi.intensity = 1.05;
    this.sun.color.setHex(this.world.id === 'ice' ? 0xfff6fb : 0xffe0a8);
    this.sun.intensity = this.world.id === 'desert' ? 1.75 : 1.5;
    this.fill.color.setHex(this.world.id === 'ice' ? 0xffd0ea : 0xffc2a8);
    this.scene.remove(this.root);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.units = [];
    this.shells = [];
    this.bits = [];
    this.barricades = [];
    this.tubes = [];
    this.phase = 'artillery';
    this.phaseT = 0;
    this.hold = 100;
    this.capture = 0;
    this.lane = 0;
    this.retreating = false;
    this.outcome = null;
    this.shellCd = 1.05;
    this.destroyerCd = 1;
    this.shake = 0;
    this.active = true;
    this.buildField();
    [-12, 0, 12].forEach((x, i) => this.spawn('artillery', x, 0.05 + i * 0.08, { speed: 0, laneFollow: 0.15, bob: 0, z: 10 }));
    [[-9, 9.2], [-3, 10.4], [3.2, 9.6], [9, 8.8]].forEach(([x, z], i) => this.spawn('tank', x, 0, { z, speed: 5.8 }));
    this.spawn('player', 0, 0, { z: 4.2, speed: 0, laneFollow: 0 });
    const friendGuns = ['machine', 'cannon', 'mortar', 'machine', 'cannon', 'machine'];
    [[-11, 5.2], [-6.5, 6.4], [-2, 7.2], [2.4, 6.8], [6.6, 5.6], [11, 4.8]].forEach(([x, z], i) => this.spawn('gunCar', x, 0.05 + i * 0.05, {
      z,
      speed: 6.2,
      shotCd: 0.08 + i * 0.1,
      gun: friendGuns[i],
    }));
    const foeGuns = ['cannon', 'machine', 'mortar', 'machine'];
    [[-9.5, -14.2], [-3.2, -12.6], [3.4, -13.5], [9.6, -12.2]].forEach(([x, z], i) => this.spawn('foeCar', x, 0.1 + i * 0.06, {
      z,
      speed: -2.1,
      shotCd: 0.12 + i * 0.1,
      gun: foeGuns[i],
    }));
    for (let i = 0; i < 36; i += 1) {
      const col = (i % 12) - 5.5;
      const row = Math.floor(i / 12);
      this.spawn('infantry', col * 1.65, 0.02 * (i % 6), {
        z: 0.2 + row * 2.05,
        speed: 2.6,
        shotCd: 0.05 + (i % 8) * 0.08,
      });
    }
    for (let i = 0; i < 30; i += 1) {
      const col = (i % 10) - 4.5;
      const row = Math.floor(i / 10);
      this.spawn('defender', col * 1.8, 0.02 * (i % 5), {
        z: -11.2 - row * 1.55,
        shotCd: 0.08 + (i % 7) * 0.1,
      });
    }
    this.syncHud();
    this.sfx.wave?.();
  }

  stop() {
    this.active = false;
    this.sun.castShadow = false;
  }

  buildField() {
    const world = this.world;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(260, 28, 18),
      new THREE.MeshBasicMaterial({
        map: skyTexture(world.skyTop, world.skyHorizon, world.fog),
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    );
    this.root.add(sky);
    const meadow = world.id === 'forest'
      ? [0x3c9a55, 0x8dffb8, 0x1d6a38]
      : world.id === 'desert'
        ? [0xe2b06a, 0xffe0a8, 0xc45a3a]
        : [0xf3f9ff, 0xffffff, 0xb7d4ee];
    const groundMat = mat(0xffffff, world.ground, 0.03);
    groundMat.map = fieldTexture(meadow[0], meadow[1], meadow[2]);
    groundMat.roughness = 0.94;
    groundMat.metalness = 0.02;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);
    const path = world.id === 'forest'
      ? [0xd7b56a, 0xf3ddb0, 0xa67c45]
      : world.id === 'desert'
        ? [0xc98448, 0xe7b07a, 0x8a4a32]
        : [0xd5e4f4, 0xffffff, 0xb7c8dc];
    const laneMat = mat(0xffffff, world.lane, 0.05);
    laneMat.map = fieldTexture(path[0], path[1], path[2]);
    laneMat.map.repeat.set(1.4, 4);
    laneMat.roughness = 0.9;
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), laneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.y = 0.03;
    lane.position.z = -8;
    lane.receiveShadow = true;
    this.root.add(lane);

    addHills(this.root, world);
    addSkyDress(this.root, world);
    addGrass(this.root, world);
    addFlowers(this.root, world);
    for (let i = 0; i < 18; i += 1) {
      const tree = makeTree(world, i);
      const side = i % 2 === 0 ? -1 : 1;
      tree.position.set(side * (13 + (i % 5) * 5.2), 0, -46 + (i % 9) * 7);
      tree.scale.setScalar(1.35 + (i % 4) * 0.28);
      this.root.add(tree);
    }
    for (const [x, z, s, n] of [[-14, 5, 1.65, 1], [14, 4, 1.5, 2], [-13.5, -12, 1.85, 4], [13.2, -14, 1.7, 5]]) {
      const tree = makeTree(world, n);
      tree.position.set(x, 0, z);
      tree.scale.setScalar(s);
      this.root.add(tree);
    }
    for (let i = 0; i < 28; i += 1) {
      const plant = makePlant(world, i);
      const side = i % 2 === 0 ? -1 : 1;
      plant.position.set(side * (5.4 + (i % 4) * 1.15), 0, 8 - i * 1.7);
      plant.scale.setScalar(1.2 + (i % 3) * 0.28);
      this.root.add(plant);
    }
    for (let i = 0; i < 10; i += 1) {
      const prop = makeProp(world, i);
      const side = i % 2 === 0 ? -1 : 1;
      prop.position.set(side * (20 + (i % 4) * 3.4), 0, -18 + (i % 6) * 7);
      prop.scale.setScalar(1.2 + (i % 3) * 0.28);
      shadeMesh(prop);
      this.root.add(prop);
    }

    for (let i = 0; i < 7; i += 1) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.3, 1.2),
        mat(0xc48a55, world.accent, 0.2),
      );
      const x = (i - 3) * 4.2;
      box.position.set(x, 0.65, -20);
      box.castShadow = true;
      box.receiveShadow = true;
      this.root.add(box);
      this.barricades.push({ mesh: box, x, z: -20, popped: false, crack: 0 });
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), mat(FRIENDLY));
    pole.position.set(0, 1.6, -52);
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.1, 1.6),
      mat(world.enemy, world.enemy, 0.4),
    );
    cloth.position.set(0.7, 2.4, -52);
    this.root.add(pole, cloth);
    this.flagCloth = cloth;
  }

  spawn(kind, x, delay, extra = {}) {
    let mesh;
    if (kind === 'artillery') mesh = makeArtillery(this.world.accent);
    else if (kind === 'tank') mesh = makeTank(this.world.accent);
    else if (kind === 'gunCar') mesh = makeGunCar(this.world.accent, false, extra.gun || 'machine');
    else if (kind === 'foeCar') mesh = makeGunCar(this.world.enemy, true, extra.gun || 'machine');
    else if (kind === 'infantry') mesh = makeInfantry(this.world.accent, false);
    else if (kind === 'player') mesh = makeInfantry(0x2a62f0, false);
    else if (kind === 'defender') mesh = makeInfantry(this.world.enemy, true);
    else if (kind === 'destroyer') mesh = makeDestroyer();
    else mesh = makeSpecial(kind, this.world);
    mesh.visible = false;
    if (kind === 'defender') mesh.rotation.y = Math.PI - 0.42;
    else if (kind === 'foeCar') mesh.rotation.y = Math.PI;
    else if (kind === 'infantry') mesh.rotation.y = 0.48;
    else if (kind === 'player') {
      mesh.rotation.y = 0;
      const mark = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.05, 6, 14),
        new THREE.MeshBasicMaterial({ color: 0x8eb6ff }),
      );
      mark.rotation.x = Math.PI / 2;
      mark.position.y = 0.06;
      mesh.add(mark);
    }
    mesh.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.root.add(mesh);
    const speeds = { artillery: 0, tank: 8, gunCar: 13, foeCar: -2.6, infantry: 12, defender: 0, lantern: 9, drum: 9, crown: 9, destroyer: 7 };
    const bobs = { artillery: 0, tank: 0.03, gunCar: 0.05, foeCar: 0.05, infantry: 0.08, defender: 0.04, lantern: 0.08, drum: 0.04, crown: 0.05, destroyer: 0.05 };
    const follows = { artillery: 0.15, tank: 1, gunCar: 1, foeCar: 0.35, infantry: 1, defender: 0.15, lantern: 0.35, drum: 0.35, crown: 0.35, destroyer: 0.45 };
    const unit = {
      kind,
      mesh,
      x,
      z: extra.z ?? (kind === 'defender' ? -20 : kind === 'infantry' ? 14 : kind === 'artillery' ? 18 : kind === 'destroyer' ? 6 : 12),
      garrison: Boolean(extra.garrison),
      delay,
      age: 0,
      speed: extra.speed ?? speeds[kind] ?? 8,
      bob: extra.bob ?? bobs[kind] ?? 0.04,
      laneFollow: extra.laneFollow ?? follows[kind] ?? 1,
      special: kind === 'destroyer' || kind === 'lantern' || kind === 'drum' || kind === 'crown',
      shotCd: extra.shotCd ?? 0.4 + Math.random() * 0.5,
      gun: extra.gun || mesh.userData.gun || 'machine',
      attackT: 0,
    };
    this.units.push(unit);
    if (kind === 'artillery' && mesh.userData.tube) this.tubes.push(mesh.userData.tube);
    return unit;
  }

  beginPhase(id) {
    this.phase = id;
    this.phaseT = 0;
    if (id === 'armor') {
      [-12, -2, 8].forEach((x, i) => this.spawn('tank', x, 0.15 + i * 0.45));
      ['machine', 'cannon', 'mortar'].forEach((gun, i) => this.spawn('gunCar', -8 + i * 8, 0.22 + i * 0.2, { gun }));
    } else if (id === 'infantry') {
      for (const unit of this.units) {
        if (unit.garrison && unit.kind === 'infantry') unit.speed = 12;
      }
      for (let i = 0; i < 24; i += 1) {
        const col = (i % 8) - 3.5;
        const row = Math.floor(i / 8);
        this.spawn('infantry', col * 2.1, row * 0.12, { z: 12 + row * 1.8, speed: 5.4 });
      }
      for (let i = 0; i < 18; i += 1) {
        const col = (i % 9) - 4;
        const row = Math.floor(i / 9);
        this.spawn('defender', col * 1.9, 0.06, { z: -16 - row * 1.4 });
      }
    } else if (id === 'special') {
      this.spawn('destroyer', 0, 0.18);
      this.spawn(this.world.special, 20, 0.45);
      this.splash(0, 6, 0x1ad4c8, 18);
      this.shake = Math.min(1.6, this.shake + 0.9);
      this.destroyerCd = 0.85;
      this.sfx.wave?.();
    } else if (id === 'resolve') {
      if (!this.retreating) this.outcome = 'win';
      this.sfx.wave?.();
    } else {
      this.sfx.ui?.();
    }
  }

  nextPhase() {
    const index = PHASE_ORDER.indexOf(this.phase);
    if (index < 0 || index >= PHASE_ORDER.length - 1) return;
    this.beginPhase(PHASE_ORDER[index + 1]);
  }

  retreat() {
    if (!this.active || this.phase === 'resolve') return;
    this.retreating = true;
    this.outcome = 'retreat';
    this.beginPhase('resolve');
  }

  boostPush() {
    this.pushPulse = 0.35;
  }

  playerUnit() {
    return this.units.find((unit) => unit.kind === 'player') || null;
  }

  drivePlayer(dt, input) {
    const player = this.playerUnit();
    if (!player || this.phase === 'resolve') return;
    player.shotCd = Math.max(0, (player.shotCd || 0) - dt);
    const step = 11 * dt;
    let x = 0;
    let z = 0;
    if (input?.left) x -= 1;
    if (input?.right) x += 1;
    x += input?.stick || 0;
    if (input?.forward) z -= 1;
    if (input?.back) z += 1;
    if (x || z) {
      const len = Math.hypot(x, z) || 1;
      player.x += (x / len) * step;
      player.z += (z / len) * step;
    }
    player.x = THREE.MathUtils.clamp(player.x, -16, 16);
    player.z = THREE.MathUtils.clamp(player.z, -36, 16);
    if (input?.fire) this.firePlayer(player);
  }

  firePlayer(player) {
    if (player.shotCd > 0) return;
    player.shotCd = 0.22;
    player.attackT = 0.2;
    this.fireRifle(player);
  }

  update(dt, input) {
    if (!this.active) return;
    const pushing = Boolean(input?.push) || this.pushPulse > 0;
    this.pushPulse = Math.max(0, this.pushPulse - dt);
    this.drivePlayer(dt, input);
    this.lane = THREE.MathUtils.damp(this.lane, 0, 4, dt);

    if (this.phase !== 'resolve') {
      this.phaseT += dt * (pushing ? 1.28 : 1);
      if (this.phaseT >= PHASE_LEN[this.phase]) this.nextPhase();
    }

    this.updatePhase(dt, pushing);
    this.updateUnits(dt, pushing);
    this.updateDestroyer(dt, pushing);
    this.updateShells(dt);
    this.updateBits(dt);
    this.updateCamera(dt);
    if (this.flagCloth) {
      const color = new THREE.Color(this.world.enemy).lerp(new THREE.Color(this.world.accent), this.capture / 100);
      this.flagCloth.material.color.copy(color);
      this.flagCloth.material.emissive.copy(color);
    }
    this.syncHud();
  }

  fireRifle(unit) {
    const muzzle = unit.mesh.userData.muzzle;
    const from = new THREE.Vector3();
    if (muzzle) {
      unit.mesh.updateMatrixWorld(true);
      muzzle.getWorldPosition(from);
    } else {
      from.set(unit.mesh.position.x, 2.2, unit.mesh.position.z);
    }
    const forward = unit.kind === 'defender' ? 1 : -1;
    const color = unit.kind === 'defender' ? this.world.enemy : this.world.accent;
    this.launchShell({
      from,
      to: new THREE.Vector3(
        unit.x + this.lane * unit.laneFollow + (Math.random() - 0.5) * 3.2,
        1.15,
        unit.z + forward * (8 + Math.random() * 5),
      ),
      color,
      radius: 0.14,
      dur: 0.34,
      holdHit: unit.kind === 'defender' ? 0 : 0.12,
      splash: 2.4,
      arc: 0.85,
      silentTubes: true,
    });
    const flash = unit.mesh.userData.flash;
    if (flash) flash.material.opacity = 1;
    if (Math.random() < 0.22) {
      this.sfx.blip?.({ freq: unit.kind === 'defender' ? 180 : 320, dur: 0.05, type: 'square', vol: 0.03, slide: -40 });
    }
  }

  fireCar(unit) {
    const muzzle = unit.mesh.userData.muzzle;
    const from = new THREE.Vector3();
    if (muzzle) {
      unit.mesh.updateMatrixWorld(true);
      muzzle.getWorldPosition(from);
    } else {
      from.set(unit.mesh.position.x, 1.2, unit.mesh.position.z);
    }
    const forward = unit.kind === 'foeCar' ? 1 : -1;
    const gun = CAR_GUNS[unit.gun] || CAR_GUNS.machine;
    const color = unit.gun === 'cannon'
      ? 0xffd56a
      : unit.gun === 'mortar'
        ? 0xffb0e0
        : (unit.kind === 'foeCar' ? this.world.enemy : this.world.accent);
    this.launchShell({
      from,
      to: new THREE.Vector3(
        unit.x + this.lane * unit.laneFollow + (Math.random() - 0.5) * gun.spread,
        unit.gun === 'mortar' ? 0.4 : 0.95,
        unit.z + forward * (gun.range + Math.random() * 4),
      ),
      color,
      radius: gun.radius,
      dur: gun.dur,
      holdHit: unit.kind === 'foeCar' ? 0 : gun.hold,
      splash: gun.splash,
      arc: gun.arc,
      silentTubes: true,
    });
    const flash = unit.mesh.userData.flash;
    if (flash) flash.material.opacity = 1;
    const turret = unit.mesh.userData.turret;
    if (turret) turret.rotation.x = gun.kick;
    if (Math.random() < 0.45) {
      this.sfx.blip?.({ freq: unit.kind === 'foeCar' ? 160 : 240, dur: 0.06, type: 'square', vol: 0.04, slide: -30 });
    }
  }

  updatePhase(dt, pushing) {
    const pace = pushing ? 1.35 : 1;
    if (this.phase === 'artillery' || this.phase === 'armor') {
      this.hold = Math.max(0, this.hold - (this.phase === 'artillery' ? 4.2 : 3.2) * pace * dt);
      this.shellCd -= dt * pace;
      if (this.shellCd <= 0) {
        this.shellCd = pushing ? 0.38 : 0.62;
        const guns = this.units.filter((unit) => unit.kind === 'artillery' && unit.mesh.visible);
        const gun = guns[Math.floor(Math.random() * guns.length)];
        this.launchShell(gun ? {
          from: new THREE.Vector3(gun.mesh.position.x, 2.4, gun.mesh.position.z - 0.6),
          to: new THREE.Vector3((Math.random() - 0.5) * 12, 0.4, -14 - Math.random() * 8),
          arc: 6,
        } : { arc: 6 });
      }
    } else if (this.phase === 'infantry') {
      this.capture = Math.min(100, this.capture + 7 * pace * dt);
      this.hold = Math.max(0, this.hold - 1.4 * pace * dt);
    } else if (this.phase === 'special') {
      this.capture = Math.min(100, this.capture + 10 * pace * dt);
      this.hold = Math.max(0, this.hold - 14 * pace * dt);
    } else if (this.outcome === 'win') {
      this.capture = 100;
      this.hold = 0;
    }
  }

  launchShell(spec = {}) {
    const from = spec.from || new THREE.Vector3((Math.random() - 0.5) * 10, 1.4, 18);
    const to = spec.to || new THREE.Vector3(this.lane + (Math.random() - 0.5) * 16, 0.4, -26 - Math.random() * 14);
    const color = spec.color ?? this.world.glow;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(spec.radius ?? 0.35, 10, 8),
      mat(color, color, 0.9),
    );
    mesh.position.copy(from);
    this.root.add(mesh);
    this.shells.push({
      mesh,
      from,
      to,
      t: 0,
      dur: spec.dur ?? 0.7,
      color,
      holdHit: spec.holdHit ?? 3.1,
      splash: spec.splash ?? 7,
      arc: spec.arc ?? 9,
    });
    if (spec.silentTubes) return;
    for (const tube of this.tubes) {
      tube.material.emissiveIntensity = 1.4;
    }
    this.sfx.blip?.({ freq: 220, dur: 0.09, type: 'sine', vol: 0.05, slide: -80 });
  }

  fireDestroyer(unit) {
    const origin = unit.mesh.position;
    const shots = 7;
    for (let i = 0; i < shots; i += 1) {
      const nuclear = i % 3 === 0;
      const spread = (i - (shots - 1) / 2) * 2.4;
      this.launchShell({
        from: new THREE.Vector3(origin.x + spread * 0.28, 3.4, origin.z - 2.2),
        to: new THREE.Vector3(origin.x + spread, 0.4, origin.z - 16 - (i % 3) * 3.5),
        color: nuclear ? 0xff7a1c : 0x7af6ee,
        radius: nuclear ? 0.58 : 0.26,
        dur: nuclear ? 0.58 : 0.46,
        holdHit: nuclear ? 2.2 : 1,
        splash: nuclear ? 10 : 5.5,
        silentTubes: true,
      });
    }
    this.shake = Math.min(1.3, this.shake + 0.24);
    this.sfx.blip?.({ freq: 130, dur: 0.12, type: 'sawtooth', vol: 0.06, slide: -60 });
    this.sfx.noise?.(0.14, 0.16, 380);
  }

  updateDestroyer(dt, pushing) {
    const unit = this.units.find((item) => item.kind === 'destroyer' && item.mesh.visible);
    if (!unit) return;
    const pulse = 0.7 + Math.sin(unit.age * 10) * 0.35;
    for (const core of unit.mesh.userData.cores || []) {
      core.material.emissiveIntensity = pulse;
      core.scale.setScalar(0.9 + Math.sin(unit.age * 10) * 0.18);
    }
    if (this.phase !== 'special' || this.outcome === 'retreat' || unit.age < 0.7) return;
    this.destroyerCd -= dt * (pushing ? 1.25 : 1);
    if (this.destroyerCd > 0) return;
    this.destroyerCd = 0.72;
    this.fireDestroyer(unit);
  }

  updateShells(dt) {
    for (const tube of this.tubes) {
      tube.material.emissiveIntensity = THREE.MathUtils.damp(tube.material.emissiveIntensity, 0.55, 6, dt);
    }
    for (let i = this.shells.length - 1; i >= 0; i -= 1) {
      const shell = this.shells[i];
      shell.t += dt / shell.dur;
      const p = Math.min(1, shell.t);
      shell.mesh.position.lerpVectors(shell.from, shell.to, p);
      shell.mesh.position.y += Math.sin(p * Math.PI) * (shell.arc ?? 9);
      if (p < 1) continue;
      this.splash(shell.to.x, shell.to.z, shell.color ?? this.world.glow, shell.splash ?? 7);
      this.hold = Math.max(0, this.hold - (shell.holdHit ?? 3.1));
      this.crackNearest(shell.to.x, shell.to.z);
      this.shake = Math.min(0.8, this.shake + 0.18);
      this.root.remove(shell.mesh);
      this.shells.splice(i, 1);
      this.sfx.noise?.(0.12, 0.18, 700);
    }
  }

  crackNearest(x, z) {
    let best = null;
    let bestDist = 8;
    for (const block of this.barricades) {
      if (block.popped) continue;
      const dist = Math.hypot(block.x - x, block.z - z);
      if (dist < bestDist) {
        best = block;
        bestDist = dist;
      }
    }
    if (!best) return;
    best.crack += 1;
    const scale = Math.max(0.45, 1 - best.crack * 0.12);
    best.mesh.scale.setScalar(scale);
  }

  updateUnits(dt, pushing) {
    const pace = pushing ? 1.28 : 1;
    const fallingBack = this.outcome === 'retreat';
    for (const unit of this.units) {
      if (unit.delay > 0) {
        unit.delay -= dt;
        unit.mesh.visible = false;
        continue;
      }
      unit.mesh.visible = true;
      unit.age += dt;
      const intro = Math.min(1, unit.age / (unit.special ? 0.7 : 0.4));
      const people = unit.kind === 'infantry' || unit.kind === 'defender';
      const pop = unit.kind === 'player' ? 2.8 : unit.kind === 'destroyer' ? 3.15 : unit.special ? 2.5 : unit.kind === 'tank' ? 1.25 : (unit.kind === 'gunCar' || unit.kind === 'foeCar') ? 1.15 : unit.kind === 'artillery' ? 1.15 : people ? 2.5 : 0.85;
      unit.mesh.scale.setScalar(pop * (0.2 + 0.8 * intro));
      if (unit.kind !== 'player' && fallingBack && unit.kind !== 'artillery') unit.z += 11 * dt;
      else if (unit.kind !== 'player' && this.phase !== 'resolve') unit.z -= unit.speed * pace * dt;
      if (unit.kind === 'defender' && this.capture > 50 && !fallingBack) unit.z += 8 * dt;
      if (unit.kind === 'foeCar' && !fallingBack) unit.z = Math.min(unit.z, -6.5);
      unit.z = THREE.MathUtils.clamp(unit.z, -50, 22);
      const yBob = Math.sin(unit.age * (unit.kind === 'infantry' ? 10 : 4)) * unit.bob;
      const drop = unit.special ? (1 - intro) * 14 : (1 - intro) * 0.8;
      unit.mesh.position.set(unit.x + this.lane * unit.laneFollow, yBob + drop, unit.z);
      const swing = unit.mesh.userData.swing;
      const flash = unit.mesh.userData.flash;
      if (flash) flash.material.opacity = Math.max(0, flash.material.opacity - dt * 5);
      const car = unit.kind === 'gunCar' || unit.kind === 'foeCar';
      if (car && this.outcome !== 'retreat' && unit.age > 0.3) {
        unit.shotCd -= dt * (pushing ? 1.2 : 1);
        if (unit.shotCd <= 0) {
          const gun = CAR_GUNS[unit.gun] || CAR_GUNS.machine;
          unit.shotCd = gun.cd + (Math.abs(unit.x) % 0.12);
          this.fireCar(unit);
        }
        const turret = unit.mesh.userData.turret;
        if (turret) turret.rotation.x = THREE.MathUtils.damp(turret.rotation.x, 0, 8, dt);
        const wheels = unit.mesh.userData.wheels;
        if (wheels && Math.abs(unit.speed) > 0.4) {
          for (const wheel of wheels) wheel.rotation.x += unit.speed * dt * 1.6;
        }
      }
      if (people && this.outcome !== 'retreat' && unit.age > 0.25) {
        unit.shotCd -= dt * (pushing ? 1.15 : 1);
        if (unit.shotCd <= 0) {
          unit.shotCd = (unit.kind === 'defender' ? 1.7 : 0.85) + (Math.abs(unit.x) % 0.35);
          unit.attackT = 0.34;
          this.fireRifle(unit);
        }
      }
      if (unit.attackT > 0) unit.attackT -= dt;
      if (swing) {
        const moving = Math.abs(unit.speed) > 0.4 && this.phase !== 'resolve';
        const attacking = unit.attackT > 0;
        const step = Math.sin(unit.age * (moving ? 9 : 1.7) + unit.x);
        const legAmp = moving ? 0.95 : 0.05;
        swing.legL.rotation.x = step * legAmp;
        swing.legR.rotation.x = -step * legAmp;
        if (attacking) {
          swing.armR.rotation.x = -0.85;
          swing.armL.rotation.x = -0.28;
          if (swing.rifle) swing.rifle.rotation.x = -0.35;
        } else {
          const armAmp = moving ? 0.62 : 0.1;
          swing.armL.rotation.x = -step * armAmp;
          swing.armR.rotation.x = step * armAmp;
          if (swing.rifle) swing.rifle.rotation.x = 0;
        }
        if (swing.chest) {
          swing.chest.position.y = swing.chest.userData.baseY + Math.sin(unit.age * 1.7) * (moving ? 0.012 : 0.028);
        }
      }
      if (unit.kind === 'infantry' && unit.z < -40 && !unit.scored && !fallingBack) {
        unit.scored = true;
        this.capture = Math.min(100, this.capture + 3.5);
      }
      if (unit.kind === 'destroyer' && !unit.boomed && unit.age >= 0.62 && !fallingBack) {
        unit.boomed = true;
        this.splash(unit.mesh.position.x, unit.mesh.position.z, 0x1ad4c8, 16);
        this.shake = Math.min(1.5, this.shake + 0.85);
        this.sfx.noise?.(0.22, 0.2, 160);
      }
      if ((unit.kind === 'tank' || unit.kind === 'gunCar' || unit.kind === 'foeCar' || unit.kind === 'destroyer') && !fallingBack) this.smashNear(unit);
    }
  }

  smashNear(unit) {
    const x = unit.x + this.lane * unit.laneFollow;
    for (const block of this.barricades) {
      if (block.popped) continue;
      if (unit.z > block.z + 1.5) continue;
      const reach = unit.kind === 'destroyer' ? 8 : 3.4;
      if (Math.abs(x - block.x) > reach) continue;
      block.popped = true;
      this.splash(block.x, block.z, unit.kind === 'destroyer' ? 0x1ad4c8 : this.world.enemy, unit.kind === 'destroyer' ? 12 : 9);
      this.root.remove(block.mesh);
      this.hold = Math.max(0, this.hold - (unit.kind === 'destroyer' ? 10 : 6));
      this.capture = Math.min(100, this.capture + 4);
      this.shake = Math.min(1, this.shake + 0.28);
    }
  }

  splash(x, z, color, grow) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.7, 20),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.3, z);
    this.root.add(ring);
    this.bits.push({ mesh: ring, life: 0.55, max: 0.55, grow });
    for (let i = 0; i < 5; i += 1) {
      const bit = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        mat(color, color, 0.6),
      );
      bit.position.set(x, 0.4, z);
      this.root.add(bit);
      this.bits.push({
        mesh: bit,
        life: 0.5,
        max: 0.5,
        grow: 0,
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6),
      });
    }
  }

  updateBits(dt) {
    for (let i = this.bits.length - 1; i >= 0; i -= 1) {
      const bit = this.bits[i];
      bit.life -= dt;
      if (bit.life <= 0) {
        this.root.remove(bit.mesh);
        this.bits.splice(i, 1);
        continue;
      }
      if (bit.grow) bit.mesh.scale.setScalar(1 + (1 - bit.life / bit.max) * bit.grow);
      if (bit.vel) {
        bit.mesh.position.addScaledVector(bit.vel, dt);
        bit.vel.y -= 12 * dt;
      }
      if (bit.mesh.material?.opacity != null) bit.mesh.material.opacity = Math.max(0, bit.life / bit.max);
    }
  }

  updateCamera(dt) {
    const aims = {
      artillery: { pos: [14, 10.5, 18], look: [0, 1.2, -3] },
      armor: { pos: [7, 7.2, 12], look: [0, 1.5, -10] },
      infantry: { pos: [5, 5.6, 8.5], look: [0, 1.35, -4] },
      special: { pos: [-6, 12, 18], look: [0, 2.2, -6] },
      resolve: { pos: [0, 12, 22], look: [0, 2, -10] },
    };
    const player = this.playerUnit();
    let aim = aims[this.phase] || aims.artillery;
    if (player && player.mesh.visible && this.phase !== 'resolve') {
      const spot = player.mesh.position;
      aim = {
        pos: [spot.x, 6.4, spot.z + 10],
        look: [spot.x, 1.3, spot.z - 9],
      };
    }
    if (this.phase === 'special') {
      const hero = this.units.find((unit) => unit.kind === 'destroyer' && unit.mesh.visible);
      if (hero) {
        const spot = hero.mesh.position;
        aim = {
          pos: [spot.x - 12, 15, spot.z + 18],
          look: [spot.x + 1, 2.8, spot.z - 2],
        };
      }
    }
    const desired = new THREE.Vector3(...aim.pos);
    this.camera.position.lerp(desired, 1 - Math.exp(-1.6 * dt));
    this.look.lerp(new THREE.Vector3(...aim.look), 1 - Math.exp(-1.6 * dt));
    this.shake = Math.max(0, this.shake - dt * 1.4);
    const mag = this.shake * 0.35;
    this.camera.position.x += (Math.random() - 0.5) * mag;
    this.camera.position.y += (Math.random() - 0.5) * mag;
    this.camera.lookAt(this.look);
  }

  phaseLabel() {
    if (this.phase === 'resolve') return this.outcome === 'retreat' ? T.groundRetreat : T.groundWin;
    return {
      artillery: T.groundArtillery,
      armor: T.groundArmor,
      infantry: T.groundInfantry,
      special: T.groundSpecial,
    }[this.phase] || '';
  }

  syncHud() {
    const { dom, world } = this;
    if (!dom.phase) return;
    dom.world.textContent = world.name;
    dom.phase.textContent = this.phase === 'special' ? `${T.groundSpecial} · ${T.groundDestroyer}` : this.phaseLabel();
    if (dom.hold) dom.hold.style.width = `${Math.max(0, this.hold)}%`;
    if (dom.capture) dom.capture.style.width = `${Math.min(100, this.capture)}%`;
    if (dom.note) {
      dom.note.textContent = {
        artillery: T.groundArtilleryNote,
        armor: T.groundArmorNote,
        infantry: T.groundInfantryNote,
        special: T.groundDestroyerNote,
        resolve: this.outcome === 'retreat' ? T.groundRetreatNote : T.groundWinNote,
      }[this.phase] || '';
    }
  }
}
