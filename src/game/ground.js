import * as THREE from 'three';
import { T } from './i18n.js';
import { STAGE_WAVES, goldReady, groundDifficulty, scaleCount, stageWaveStep } from './groundTuning.js';

/** A beat stays up long enough to read, even if the army clears it early. */
const PHASE_MIN = {
  artillery: 4.5,
  armor: 5,
  infantry: 5,
  special: 4.5,
};

/** Toy commander. Hits are gated so the army cannot melt him in a second. */
const BOSS_HP = 240;
const BOSS_HIT_GAP = 0.36;
/** משמיד battle scale. Original was 3.15; this is 0.85× so the hull reads smaller. */
const DESTROYER_POP = 2.6775;
/** Body reach for barricades (original 8) and warriors (original 3.5), both 0.85×. */
const DESTROYER_REACH = 6.8;
const DESTROYER_ROLL = 2.975;
/** How far ahead of the hull center a barricade still counts as in front. Original offset was 1.5. */
const DESTROYER_NOSE = 1.275;
/** Hold drained by one full destroyer volley, matching the old seven-shot barrage. */
const DESTROYER_HOLD_BUDGET = 10.6;

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
  {
    id: 'haunt',
    name: 'יער מחושף',
    blurb: 'יער סגול. הלוחמים שממול הם רוחות רפאים.',
    sky: 0x241438,
    skyTop: 0x0c0618,
    skyHorizon: 0x3a2060,
    fog: 0x2a1848,
    cloud: 'rgba(176, 140, 220, 0.38)',
    ground: 0x1c1230,
    lane: 0x7a48b8,
    accent: 0xc9a0ff,
    prop: 0x4a2080,
    glow: 0xe0b0ff,
    enemy: 0xd070ff,
    special: 'wisp',
    specialName: 'מנורת הרוחות',
  },
  {
    id: 'sea',
    name: 'ים',
    blurb: 'ים כחול, גלים, סירות ומגדלור.',
    sky: 0x7ec8ff,
    skyTop: 0x1a4a9a,
    skyHorizon: 0xb7e4ff,
    fog: 0x9fd4f0,
    ground: 0x1a6a9a,
    lane: 0xe6c07a,
    accent: 0x7dffd4,
    prop: 0xf4f7fb,
    glow: 0xfff3a0,
    enemy: 0xff5a3a,
    special: 'lighthouse',
    specialName: 'מגדלור',
  },
];

const FRIENDLY = 0xf4f7fb;

function hexCss(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function skyTexture(top, horizon, warm, cloud = 'rgba(255, 252, 245, 0.62)') {
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
  ctx.fillStyle = cloud;
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

const shellGeos = new Map();
const missilePuffGeo = new THREE.SphereGeometry(0.22, 6, 5);

/** Gold body, magenta nose, bright plume. Nose points along local −Z. */
function makeSalvoMissile() {
  const root = new THREE.Group();
  const gold = mat(0xffe14a, 0xffb000, 0.95);
  const noseMat = mat(0xff4ad8, 0xff1490, 1);
  const finMat = mat(0xfff6d0, 0xffc24a, 0.55);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xfff3a0,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.78, 3, 8), gold);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 8), noseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.66;
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.52, 8), plumeMat);
  plume.rotation.x = Math.PI / 2;
  plume.position.z = 0.62;
  plume.userData.noShadow = true;
  const fins = [];
  for (let i = 0; i < 3; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.22), finMat);
    const ang = (i / 3) * Math.PI * 2;
    fin.position.set(Math.cos(ang) * 0.18, Math.sin(ang) * 0.18, 0.32);
    fin.lookAt(fin.position.x * 2, fin.position.y * 2, 0.32);
    fins.push(fin);
  }
  root.add(body, nose, plume, ...fins);
  root.scale.setScalar(1.85);
  root.userData.plume = plume;
  return root;
}

function shellGeometry(radius) {
  const key = Math.round(radius * 100);
  let geo = shellGeos.get(key);
  if (!geo) {
    geo = new THREE.SphereGeometry(key / 100, 10, 8);
    shellGeos.set(key, geo);
  }
  return geo;
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
  const muzzle = new THREE.Object3D();
  muzzle.position.z = -length - Math.max(0.08, radius * 0.35);
  muzzle.rotation.y = Math.PI;
  mount.add(muzzle);
  mount.userData.muzzle = muzzle;
  mount.userData.radius = radius;
  parent.add(mount);
  return mount;
}

function makeArtillery(accent) {
  const root = new THREE.Group();
  const dark = mat(0x243044, 0x101820, 0.3);
  const hot = mat(accent, accent, 0.55);
  addBox(root, 1.5, 0.45, 2.2, dark, 0, 0.35, 0);
  const tube = addCyl(root, 0.18, 0.22, 2.4, hot, 0, 0.85, -0.6);
  // Cylinder +Y is the bore. Negative pitch lifts it along −Z, toward the enemy line.
  tube.rotation.x = -Math.PI / 2.4;
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
 * Heavy cannons, an artillery rack, fat nuclear tubes, and a belt aimed
 * front, back, left, right, and on the diagonals. Each barrel lobs along its bore.
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
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfff6c8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const nukeFlashMat = new THREE.MeshBasicMaterial({
    color: 0xffb060,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const cores = [];
  const guns = [];

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
    mount.userData.nuclear = Boolean(nuclear);
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.2, radius * 1.85), 8, 6),
      nuclear ? nukeFlashMat : flashMat,
    );
    flash.position.z = -length - 0.06;
    flash.userData.noShadow = true;
    mount.add(flash);
    mount.userData.flash = flash;
    guns.push(mount);
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

  const hullRim = (yaw) => {
    const sx = Math.sin(yaw);
    const cx = Math.cos(yaw);
    const ax = Math.abs(sx);
    const az = Math.abs(cx);
    const tx = ax < 1e-3 ? 40 : 1.88 / ax;
    const tz = az < 1e-3 ? 40 : 2.48 / az;
    const t = Math.min(tx, tz) + 0.12;
    return [-sx * t, -cx * t];
  };
  const compass = [
    { yaw: 0, pitch: 0.05, radius: 0.2, length: 1.85, nuclear: false, material: steel },
    { yaw: Math.PI, pitch: 0.07, radius: 0.26, length: 1.9, nuclear: true, material: nuke },
    { yaw: Math.PI / 2, pitch: 0.04, radius: 0.26, length: 1.9, nuclear: true, material: nuke },
    { yaw: -Math.PI / 2, pitch: 0.04, radius: 0.26, length: 1.9, nuclear: true, material: nuke },
    { yaw: Math.PI / 4, pitch: 0.06, radius: 0.16, length: 1.6, nuclear: false, material: brass },
    { yaw: -Math.PI / 4, pitch: 0.06, radius: 0.16, length: 1.6, nuclear: false, material: brass },
    { yaw: (3 * Math.PI) / 4, pitch: 0.06, radius: 0.16, length: 1.6, nuclear: false, material: brass },
    { yaw: (-3 * Math.PI) / 4, pitch: 0.06, radius: 0.16, length: 1.6, nuclear: false, material: brass },
  ];
  for (const spec of compass) {
    const [x, z] = hullRim(spec.yaw);
    const mount = gun(spec.radius, spec.length, spec.material, x, 1.28, z, spec.yaw, spec.pitch, spec.nuclear);
    mount.userData.salvo = true;
  }

  addBox(root, 0.85, 0.4, 0.7, dark, 1.15, 1.55, 1.35);
  addBox(root, 0.6, 0.32, 0.55, white, -1.2, 1.5, 1.15);

  root.userData.cores = cores;
  root.userData.guns = guns;
  root.userData.flashMats = [flashMat, nukeFlashMat];
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
    barrel.rotation.x = -1.15;
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

/** Service rifle. Local −Z is the muzzle. Both hands stay on the weapon. */
function makeToyRifle(foe) {
  const rifle = new THREE.Group();
  const paint = foe ? 0xff4ad8 : 0xffe14a;
  const bright = new THREE.MeshBasicMaterial({ color: paint, fog: false });
  const stockMat = mat(foe ? 0x3a2434 : 0x3a3428, foe ? 0x1a1018 : 0x1a140e, 0.2);
  const glove = mat(foe ? 0x2a1824 : 0x2c2418, 0x100c08, 0.16);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.36), stockMat);
  stock.position.set(0, 0.01, 0.3);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.2), stockMat);
  comb.position.set(0, 0.11, 0.24);
  const pistol = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), stockMat);
  pistol.position.set(0, -0.1, 0.08);
  pistol.rotation.x = -0.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.34), bright);
  body.position.set(0, 0.05, -0.06);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.09), bright);
  mag.position.set(0, -0.1, -0.02);
  const fore = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.36), stockMat);
  fore.position.set(0, 0.03, -0.36);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.78, 8), bright);
  barrel.rotation.x = -Math.PI / 2;
  barrel.position.set(0, 0.055, -0.78);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.034, 0.1, 8), bright);
  tip.rotation.x = -Math.PI / 2;
  tip.position.set(0, 0.055, -1.16);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), bright);
  sight.position.set(0, 0.11, -1.05);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.02), bright);
  rear.position.set(0, 0.11, 0.02);
  const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.1), glove);
  support.position.set(0.01, -0.02, -0.34);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({
      color: foe ? 0xffd0ea : 0xfff6c8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    }),
  );
  flash.position.set(0, 0.055, -1.24);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.055, -1.28);
  rifle.add(stock, comb, pistol, body, mag, fore, barrel, tip, sight, rear, support, flash, muzzle);
  rifle.scale.setScalar(1.72);
  rifle.userData.flash = flash;
  rifle.userData.muzzle = muzzle;
  return rifle;
}

function squadTint(accent, foe) {
  const color = new THREE.Color(accent);
  if (foe && color.r + color.g + color.b < 1.15) color.offsetHSL(0, 0.08, 0.2);
  return color;
}

/**
 * Eyes, rifles, and gun barrels point along local −Z.
 * Object3D.lookAt aims +Z, which turned both lines around to face the camera.
 */
function faceNegZ(mesh, x, z) {
  const dx = x - mesh.position.x;
  const dz = z - mesh.position.z;
  if (dx * dx + dz * dz < 1e-8) return;
  mesh.rotation.x = 0;
  mesh.rotation.z = 0;
  mesh.rotation.y = Math.atan2(-dx, -dz);
}

/** Arcade soldier: helmet, vest, boots, and a rifle, still smiling. */
function makeInfantry(accent, foe = false) {
  const root = new THREE.Group();
  const tunicColor = squadTint(accent, foe);
  const cloth = mat(tunicColor, tunicColor, foe ? 0.28 : 0.42);
  const pants = mat(foe ? 0x241820 : 0x3c4632, foe ? 0x120c14 : 0x1c2418, 0.14);
  const skin = mat(0xffd2b0, 0x5a3020, 0.1);
  const boot = mat(foe ? 0x1a121c : 0x241810, 0x080604, 0.18);
  const sole = mat(0x3a3028, 0x100c08, 0.1);
  const glove = mat(foe ? 0x2a1824 : 0x2c2418, 0x100c08, 0.16);
  const vestMat = mat(foe ? 0x1a1218 : 0x6e6248, foe ? 0x3a1830 : 0x3a3420, foe ? 0.35 : 0.28);
  const pouchMat = mat(foe ? 0x120c12 : 0x4a4030, 0x080604, 0.12);
  const helm = foe
    ? new THREE.MeshBasicMaterial({ color: 0x5a1844, fog: false })
    : new THREE.MeshBasicMaterial({ color: 0xff2d35, fog: false });
  const teamMark = new THREE.MeshBasicMaterial({ color: foe ? 0xff4ad8 : 0xff2d35, fog: false });
  const headY = 1.64;

  const pivotLimb = (x, y, material, radius, length) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const limbMesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 3, 8), material);
    limbMesh.position.y = -(length * 0.5 + radius * 0.2);
    pivot.add(limbMesh);
    root.add(pivot);
    return pivot;
  };

  const legL = pivotLimb(-0.14, 0.7, pants, 0.095, 0.4);
  const legR = pivotLimb(0.14, 0.7, pants, 0.095, 0.4);
  for (const leg of [legL, legR]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.26), boot);
    shoe.position.set(0, -0.5, 0.04);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.09), pouchMat);
    pad.position.set(0, -0.2, -0.08);
    const soleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.28), sole);
    soleMesh.position.set(0, -0.59, 0.05);
    leg.add(shoe, pad, soleMesh);
  }
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), pants);
  hips.scale.set(1.35, 0.62, 0.95);
  hips.position.set(0, 0.72, 0);
  root.add(hips);

  const chest = new THREE.Group();
  chest.position.set(0, 1.16, 0);
  chest.userData.baseY = 1.16;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.34, 4, 10), cloth);
  chest.add(torso);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.12), vestMat);
  vest.position.set(0, 0.02, -0.16);
  chest.add(vest);
  for (const x of [-0.08, 0.08]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.06), pouchMat);
    pouch.position.set(x, -0.08, -0.2);
    chest.add(pouch);
  }
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), teamMark);
  buckle.position.set(0, -0.2, -0.18);
  chest.add(buckle);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.1), pouchMat);
  pack.position.set(0, 0.04, 0.16);
  chest.add(pack);
  root.add(chest);

  const armL = pivotLimb(-0.36, 1.32, cloth, 0.068, 0.3);
  const armR = pivotLimb(0.36, 1.32, cloth, 0.068, 0.28);
  const gripHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.09), glove);
  gripHand.position.set(0, -0.36, -0.02);
  armR.add(gripHand);
  const rifle = makeToyRifle(foe);
  gripHand.add(rifle);
  armR.rotation.set(1.08, 0.18, -0.18);
  armL.rotation.set(0.86, 0.55, 0.72);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), skin);
  neck.position.set(0, headY - 0.16, 0);
  root.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin);
  head.position.set(0, headY, 0);
  root.add(head);
  const eyeWhite = mat(0xfff8f2, 0x000000, 0);
  const pupil = mat(0x2a211c, 0x000000, 0);
  for (const x of [-0.055, 0.055]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeWhite);
    white.position.set(x, headY + 0.02, -0.145);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), pupil);
    dot.position.set(x, headY + 0.02, -0.168);
    root.add(white, dot);
  }
  const cheekMat = mat(0xff9a8a, 0xff9a8a, 0.28);
  for (const x of [-0.09, 0.09]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), cheekMat);
    cheek.position.set(x, headY - 0.04, -0.13);
    root.add(cheek);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.009, 6, 10, Math.PI),
    mat(0x6a3030, 0x000000, 0),
  );
  smile.position.set(0, headY - 0.07, -0.14);
  smile.rotation.z = Math.PI;
  root.add(smile);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), helm);
  cap.scale.set(1.12, 0.7, 1.16);
  cap.position.set(0, headY + 0.1, 0.01);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.12), helm);
  brim.position.set(0, headY + 0.02, -0.14);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.04), teamMark);
  band.position.set(0, headY + 0.02, -0.16);
  root.add(cap, brim, band);

  if (foe) {
    for (const x of [-0.32, 0.32]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), helm);
      pad.scale.set(1.1, 0.45, 0.9);
      pad.position.set(x, 1.36, 0);
      root.add(pad);
    }
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), teamMark);
    crest.position.set(0, headY + 0.26, 0);
    root.add(crest);
  } else {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03), teamMark);
    tab.position.set(-0.2, 1.28, -0.08);
    root.add(tab);
    root.userData.flag = tab;
  }
  root.userData.swing = { legL, legR, armL, armR, chest, rifle };
  root.userData.flash = rifle.userData.flash;
  root.userData.muzzle = rifle.userData.muzzle;
  return root;
}

const ghostVeil = new THREE.MeshStandardMaterial({
  color: 0xd8b4ff,
  emissive: 0xb060ff,
  emissiveIntensity: 0.9,
  roughness: 0.4,
  metalness: 0.04,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});
const ghostGlow = new THREE.MeshBasicMaterial({
  color: 0xf0dcff,
  transparent: true,
  opacity: 0.74,
  depthWrite: false,
  fog: false,
});

/** Defender for יער מחושף. Same rifle and swing as a warrior, drawn as a glowing ghost. */
function makeGhost() {
  const root = makeInfantry(0xd070ff, true);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    if (obj.material.transparent && obj.material.opacity === 0) return;
    obj.material = obj.material.isMeshBasicMaterial ? ghostGlow : ghostVeil;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.userData.noShadow = true;
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), ghostGlow);
  orb.position.set(0, 2.18, 0);
  orb.userData.noShadow = true;
  root.add(orb);
  root.userData.wisp = orb;
  root.userData.ghost = true;
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
  } else if (kind === 'wisp') {
    const trunk = addCyl(root, 0.16, 0.28, 2.4, mat(0x2a1840, 0x120818, 0.2), 0, 1.2, 0);
    trunk.rotation.z = 0.18;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 10),
      new THREE.MeshBasicMaterial({
        color: world.glow,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        fog: false,
      }),
    );
    lamp.position.set(0.15, 2.55, 0);
    lamp.userData.noShadow = true;
    root.add(lamp);
    root.userData.lamp = lamp;
    for (let i = 0; i < 5; i += 1) {
      const mote = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 6),
        new THREE.MeshBasicMaterial({
          color: 0xf4e4ff,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          fog: false,
        }),
      );
      const angle = (i / 5) * Math.PI * 2;
      mote.position.set(Math.cos(angle) * 0.7, 2.2 + (i % 2) * 0.35, Math.sin(angle) * 0.7);
      mote.userData.noShadow = true;
      root.add(mote);
    }
  } else if (kind === 'lighthouse') {
    addCyl(root, 0.7, 0.9, 0.4, mat(0xe6c07a, 0xc49a58, 0.2), 0, 0.2, 0);
    addCyl(root, 0.38, 0.48, 2.6, mat(0xf7f4ee, 0xd7d0c4, 0.15), 0, 1.6, 0);
    const lamp = addCyl(root, 0.42, 0.42, 0.45, glow, 0, 3.15, 0);
    root.userData.lamp = lamp;
    addCyl(root, 0.55, 0.55, 0.18, accent, 0, 3.45, 0);
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
  } else if (world.id === 'haunt') {
    const bark = mat(0x2a1838, 0x100818, 0.15);
    const leaf = mat(0x4a2080, 0xc45cff, 0.55);
    const lite = mat(0x9a58d0, 0xe0b0ff, 0.7);
    const wisp = mat(0xf0dcff, 0xe0b0ff, 0.95);
    const h = 2.5 + (i % 3) * 0.35;
    const trunk = addCyl(root, 0.16, 0.32, h, bark, 0, h * 0.48, 0);
    trunk.rotation.z = i % 2 === 0 ? 0.22 : -0.18;
    blob(root, 1.15, leaf, 0.1, h * 0.78, 0, 0.72);
    blob(root, 0.78, lite, 0.55, h * 1.02, 0.18, 0.8);
    blob(root, 0.7, leaf, -0.5, h * 1.08, -0.12, 0.76);
    blob(root, 0.18, wisp, 0.2, h * 1.28, 0.05, 1);
    blob(root, 0.12, wisp, -0.62, h * 0.55, 0.2, 1);
  } else if (world.id === 'sea') {
    const wood = mat(0x8a5a32, 0x3a2414, 0.15);
    const sail = mat(0xf7fbff, 0xd7eaff, 0.35);
    const buoy = mat(i % 2 ? 0xff5a3a : 0xfff3a0, 0xfff3a0, 0.45);
    if (i % 2 === 0) {
      addCyl(root, 0.08, 0.1, 1.6, wood, 0, 0.8, 0);
      const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.15, 3), sail);
      cloth.position.set(0.28, 1.35, 0);
      cloth.rotation.z = 0.4;
      root.add(cloth);
      blob(root, 0.16, buoy, 0, 1.85, 0, 0.8);
    } else {
      addCyl(root, 0.1, 0.14, 0.9, wood, 0, 0.45, 0);
      blob(root, 0.42, buoy, 0, 1.15, 0, 0.85);
      blob(root, 0.16, mat(0xffffff, 0xd7eaff, 0.5), 0.22, 1.35, 0.1, 0.7);
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
  if (world.id === 'haunt') {
    const cap = mat(i % 2 ? 0xc45cff : 0x7a40c0, 0xe0b0ff, 0.75);
    const stemMat = mat(0x3a2058, 0x180c28, 0.2);
    addCyl(root, 0.06, 0.09, 0.28, stemMat, 0, 0.14, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), cap);
    head.scale.y = 0.55;
    head.position.y = 0.34;
    root.add(head);
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 5),
      new THREE.MeshBasicMaterial({
        color: 0xf4e4ff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        fog: false,
      }),
    );
    mote.position.y = 0.52;
    mote.userData.noShadow = true;
    root.add(mote);
    return root;
  }
  if (world.id === 'sea') {
    const shell = mat(i % 2 ? 0xfff3a0 : 0xff8a5a, 0xfff6d0, 0.45);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), shell);
    body.scale.set(1.3, 0.45, 0.9);
    body.position.y = 0.08;
    root.add(body);
    return root;
  }
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
  } else if (world.id === 'haunt') {
    scatterBlades(root, world, 0x3a2060, 220, 0.58);
    scatterBlades(root, world, 0x8a50c8, 90, 0.85, 40, -6, 28);
  } else if (world.id === 'sea') {
    scatterBlades(root, world, 0x2ea87a, 140, 0.7, 70, -20, 50);
    scatterBlades(root, world, 0xf7fbff, 80, 0.35, 36, -4, 24);
  } else {
    scatterBlades(root, world, 0x2ea85a, 260, 0.62);
    scatterBlades(root, world, 0x8ae07a, 120, 0.95, 34, -4, 26);
  }
}

function addHills(root, world) {
  const color = world.id === 'forest' ? 0x2c8a4c : world.id === 'desert' ? 0xd08948 : world.id === 'haunt' ? 0x2a1848 : world.id === 'sea' ? 0x2a8a55 : 0xd7eaff;
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
  if (world.id === 'haunt') {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xd8c4ff, fog: false, depthWrite: false }),
    );
    moon.position.set(-28, 36, -70);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(10, 14, 10),
      new THREE.MeshBasicMaterial({
        color: world.glow,
        transparent: true,
        opacity: 0.28,
        fog: false,
        depthWrite: false,
      }),
    );
    halo.position.copy(moon.position);
    root.add(moon, halo);
    const mist = new THREE.MeshBasicMaterial({
      color: 0xc9a0ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      fog: false,
    });
    const spots = [
      [-24, 8, -18, 6], [18, 6, -30, 7], [-8, 5, -48, 6.4],
      [30, 7, -12, 4.6], [-36, 9, -40, 6.8], [8, 4, -6, 4],
    ];
    for (const [x, y, z, s] of spots) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mist);
      puff.scale.set(s, s * 0.45, s);
      puff.position.set(x, y, z);
      root.add(puff);
    }
    return;
  }
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
      : world.id === 'haunt'
        ? [0xc45cff, 0xe0b0ff, 0x7a40c0]
        : world.id === 'sea'
          ? [0xfff3a0, 0xff8a5a, 0xf7fbff]
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
  } else if (world.id === 'haunt') {
    const stone = addCyl(root, 0.28, 0.42, 0.7, mat(0x2a1840, world.glow, 0.25), 0, 0.35, 0);
    stone.rotation.z = ((i % 5) - 2) * 0.08;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({
        color: world.glow,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        fog: false,
      }),
    );
    lamp.position.y = 0.85;
    lamp.userData.noShadow = true;
    root.add(lamp);
  } else if (world.id === 'sea') {
    const barrel = addCyl(root, 0.28, 0.32, 0.7, mat(0x8a5a32, 0x3a2414, 0.2), 0, 0.35, 0);
    barrel.rotation.z = Math.PI / 2;
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(world.enemy, world.glow, 0.4));
    buoy.position.set(0.55, 0.55, 0);
    root.add(buoy);
  } else {
    const crystal = addCyl(root, 0.02, 0.45, 1.6 + (i % 3) * 0.4, mat(world.prop, world.glow, 0.55), 0, 0.9, 0);
    crystal.rotation.z = ((i % 5) - 2) * 0.12;
  }
  return root;
}

/** Round toy commander. Face looks toward +Z, at the friendly line. No gore. */
function makeBoss(world) {
  const root = new THREE.Group();
  const cloth = mat(world.enemy, world.enemy, 0.45);
  const gold = mat(world.glow, world.glow, 0.85);
  const cream = mat(0xfff6ea, 0xf0d0b0, 0.22);
  const blush = mat(0xff8aa0, 0xff8aa0, 0.4);
  const dark = mat(0x241824, 0x100810, 0.2);
  const ink = mat(0x1a1a22, 0x1a1a22, 0.15);

  addCyl(root, 0.55, 0.72, 0.38, dark, -0.4, 0.22, 0);
  addCyl(root, 0.55, 0.72, 0.38, dark, 0.4, 0.22, 0);
  addCyl(root, 0.95, 1.15, 1.45, cloth, 0, 1.28, 0);
  addBox(root, 0.28, 0.95, 0.16, gold, 0, 1.4, 0.58);
  addCyl(root, 0.7, 0.76, 0.72, cream, 0, 2.32, 0.04);
  const leftPad = addCyl(root, 0.28, 0.28, 0.72, cloth, -0.95, 1.85, 0);
  leftPad.rotation.z = Math.PI / 2;
  const rightPad = addCyl(root, 0.28, 0.28, 0.72, cloth, 0.95, 1.85, 0);
  rightPad.rotation.z = Math.PI / 2;
  for (const x of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), ink);
    eye.position.set(x, 2.4, 0.7);
    root.add(eye);
  }
  for (const x of [-0.36, 0.36]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), blush);
    cheek.position.set(x, 2.26, 0.62);
    root.add(cheek);
  }
  for (const [x, y] of [[-0.12, 2.14], [0, 2.08], [0.12, 2.14]]) {
    const smile = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), gold);
    smile.position.set(x, y, 0.72);
    root.add(smile);
  }
  addCyl(root, 0.46, 0.52, 0.12, gold, 0, 2.72, 0);
  for (const x of [-0.28, 0, 0.28]) addCyl(root, 0.02, 0.12, 0.36, gold, x, 2.92, 0);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 16), gold);
  shield.rotation.z = Math.PI / 2;
  shield.position.set(-1.2, 1.45, 0.25);
  root.add(shield);
  const bossMark = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    mat(0xfff6ea, world.glow, 0.95),
  );
  bossMark.position.set(-1.2, 1.45, 0.38);
  root.add(bossMark);
  return root;
}

export class GroundBattle {
  constructor(sfx) {
    this.sfx = sfx;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 640);
    this.look = new THREE.Vector3(0, 1.2, -20);
    this.camera.position.set(0, 38, 56);
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
    this.mode = 'regular';
    this.perks = {};
    this.phase = 'artillery';
    this.phaseT = 0;
    this.hold = 100;
    this.capture = 0;
    this.lane = 0;
    this.retreating = false;
    this.outcome = null;
    this.reported = false;
    this.onResolved = null;
    this.marchLabel = '';
    this.bossHitCd = 0;
    this.voiceClock = 0;
    this.voiceNext = { friend: 0, foe: 0 };
    this.voiceOnce = {};
    this.pendingVoices = [];
    this.bark = '';
    this.barkT = 0;
    this.barkSide = '';
    this.shellCd = 1;
    this.destroyerCd = 1;
    this.shake = 0;
    this.active = false;
    this.flagCloth = null;
    this.deployCd = { infantry: 0, tank: 0, destroyer: 0 };
    this.salvoCd = 0;
    this.deployNote = '';
    this.deployNoteT = 0;
    this.aiming = false;
    this.grenadeCd = 0;
    this.difficulty = groundDifficulty('medium');
    this.resetBattleScore();
    const q = (id) => (typeof document === 'undefined' ? null : document.querySelector(id));
    this.dom = {
      phase: q('#ground-phase'),
      world: q('#ground-world'),
      hold: q('#ground-hold-bar'),
      capture: q('#ground-capture-bar'),
      note: q('#ground-note'),
      march: q('#ground-march'),
      bark: q('#ground-bark'),
      holdLabel: q('#ground-hold-label'),
      captureLabel: q('#ground-capture-label'),
      score: q('#ground-score'),
      stars: q('#ground-stars'),
      soldierBtn: q('#ground-soldier'),
      tankBtn: q('#ground-tank'),
      destroyerBtn: q('#ground-destroyer'),
      salvoBtn: q('#ground-salvo'),
    };
  }

  start(worldId, opts = {}) {
    this.mode = opts.boss ? 'boss' : 'regular';
    this.perks = {
      shield: 0,
      company: 0,
      cannon: 0,
      banner: 0,
      destroyer: 0,
      ...(opts.perks || {}),
    };
    this.marchLabel = opts.marchLabel || '';
    this.world = GROUND_WORLDS.find((item) => item.id === worldId) || GROUND_WORLDS[0];
    this.scene.background = new THREE.Color(this.world.skyHorizon);
    const haunt = this.world.id === 'haunt';
    this.scene.fog = new THREE.FogExp2(this.world.fog, haunt ? 0.0042 : 0.00215);
    this.sun.castShadow = true;
    this.hemi.color.setHex(this.world.skyHorizon);
    this.hemi.groundColor.setHex(this.world.ground);
    this.hemi.intensity = haunt ? 0.72 : 1.05;
    this.sun.color.setHex(haunt ? 0xcbb0ff : this.world.id === 'ice' ? 0xfff6fb : 0xffe0a8);
    this.sun.intensity = haunt ? 0.62 : this.world.id === 'desert' ? 1.75 : 1.5;
    this.fill.color.setHex(haunt ? 0x8a4ad8 : this.world.id === 'ice' ? 0xffd0ea : 0xffc2a8);
    this.fill.intensity = haunt ? 0.85 : 0.45;
    this.scene.remove(this.root);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.units = [];
    this.shells = [];
    this.bits = [];
    this.barricades = [];
    this.tubes = [];
    this.phase = this.mode === 'boss' ? 'boss' : 'artillery';
    this.wave = this.mode === 'boss' ? 0 : 1;
    this.waveSquad = [];
    this.phaseT = 0;
    this.hold = 100;
    this.capture = 0;
    this.lane = 0;
    this.retreating = false;
    this.outcome = null;
    this.reported = false;
    this.bossHitCd = 0;
    this.voiceClock = 0;
    this.voiceNext = { friend: 0, foe: 0 };
    this.voiceOnce = {};
    this.pendingVoices = [];
    this.bark = '';
    this.barkT = 0;
    this.barkSide = '';
    this.shellCd = 1.05;
    this.destroyerCd = 1;
    this.shake = 0;
    this.deployCd = { infantry: 0, tank: 0, destroyer: 0 };
    this.salvoCd = 0;
    this.deployNote = '';
    this.deployNoteT = 0;
    this.grenadeCd = 0;
    this.difficulty = groundDifficulty(opts.difficulty);
    this.resetBattleScore();
    this.playerGrace = 0;
    this.playerOut = false;
    this.livesLeft = this.difficulty.lives;
    this.phaseLock = 0;
    this.salvoLanded = false;
    this.phaseMark = { hold: 100, capture: 0 };
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
    const foeSlots = [[-9.5, -14.2], [-3.2, -12.6], [3.4, -13.5], [9.6, -12.2]];
    const foeCount = this.difficulty.id === 'easy' ? 3 : foeSlots.length;
    foeSlots.slice(0, foeCount).forEach(([x, z], i) => this.spawn('foeCar', x, 0.1 + i * 0.06, {
      z,
      speed: -2.1,
      shotCd: (0.12 + i * 0.1) * this.difficulty.cadence,
      gun: foeGuns[i],
    }));
    if (this.difficulty.id === 'hard') {
      this.spawn('foeCar', 0.4, 0.25, {
        z: -16.4,
        speed: -2.4,
        shotCd: 0.18 * this.difficulty.cadence,
        gun: 'cannon',
      });
    }
    for (let i = 0; i < 36; i += 1) {
      const col = (i % 12) - 5.5;
      const row = Math.floor(i / 12);
      this.spawn('infantry', col * 1.65, 0.02 * (i % 6), {
        z: 0.2 + row * 2.05,
        speed: 2.6,
        shotCd: 0.05 + (i % 8) * 0.08,
      });
    }
    const defenders = scaleCount(30, this.difficulty.spawn, 12);
    for (let i = 0; i < defenders; i += 1) {
      const col = (i % 10) - 4.5;
      const row = Math.floor(i / 10);
      this.spawn('defender', col * 1.8, 0.02 * (i % 5), {
        z: -11.2 - row * 1.55,
        shotCd: (0.08 + (i % 7) * 0.1) * this.difficulty.cadence,
      });
    }
    const extra = (this.perks.company || 0) * 8;
    for (let i = 0; i < extra; i += 1) {
      const col = (i % 8) - 3.5;
      const row = Math.floor(i / 8);
      this.spawn('infantry', col * 1.7, 0.04 * i, {
        z: 8.2 + row * 1.45,
        speed: 4.4,
        shotCd: 0.18 + (i % 4) * 0.05,
      });
    }
    if (this.mode === 'boss') {
      this.spawn('boss', 0, 0.28, { z: -12.5, speed: -0.72, shotCd: 1.55 });
      this.pendingVoices.push(
        { side: 'friend', cue: 'engage', at: 0.45 },
        { side: 'foe', cue: 'engage', at: 1.7 },
      );
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
        map: skyTexture(world.skyTop, world.skyHorizon, world.fog, world.cloud),
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
        : world.id === 'haunt'
          ? [0x1a1028, 0x6a3a9a, 0x120818]
          : world.id === 'sea'
            ? [0x1a6a9a, 0x7ec8ff, 0x0e3a66]
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
        : world.id === 'haunt'
          ? [0x4a2878, 0xc9a0ff, 0x2a1848]
          : world.id === 'sea'
            ? [0xe6c07a, 0xfff1c2, 0xc49a58]
            : [0xd5e4f4, 0xffffff, 0xb7c8dc];
    const laneMat = mat(0xffffff, world.lane, 0.05);
    laneMat.map = fieldTexture(path[0], path[1], path[2]);
    laneMat.map.repeat.set(3.2, 5);
    laneMat.roughness = 0.9;
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(36, 150), laneMat);
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
      tree.position.set(side * (22 + (i % 5) * 4.4), 0, -46 + (i % 9) * 7);
      tree.scale.setScalar(1.35 + (i % 4) * 0.28);
      this.root.add(tree);
    }
    for (const [x, z, s, n] of [[-22, 5, 1.65, 1], [22, 4, 1.5, 2], [-23, -12, 1.85, 4], [22.4, -14, 1.7, 5]]) {
      const tree = makeTree(world, n);
      tree.position.set(x, 0, z);
      tree.scale.setScalar(s);
      this.root.add(tree);
    }
    for (let i = 0; i < 28; i += 1) {
      const plant = makePlant(world, i);
      const side = i % 2 === 0 ? -1 : 1;
      plant.position.set(side * (16 + (i % 4) * 1.05), 0, 8 - i * 1.7);
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
    else if (kind === 'defender') mesh = this.world.id === 'haunt' ? makeGhost() : makeInfantry(this.world.enemy, true);
    else if (kind === 'destroyer') mesh = makeDestroyer();
    else if (kind === 'boss') mesh = makeBoss(this.world);
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
      if ((this.perks.shield || 0) > 0) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.045, 6, 16),
          new THREE.MeshBasicMaterial({ color: 0xfff1a8 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.9;
        mesh.add(ring);
      }
    } else if (kind === 'boss') {
      mesh.rotation.y = 0;
    }
    mesh.traverse((obj) => {
      if (obj.isMesh && !obj.userData.noShadow) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.root.add(mesh);
    const speeds = { artillery: 0, tank: 8, gunCar: 13, foeCar: -2.6, infantry: 12, defender: 0, lantern: 9, drum: 9, crown: 9, wisp: 9, lighthouse: 9, destroyer: 7, boss: -0.72 };
    const bobs = { artillery: 0, tank: 0.03, gunCar: 0.05, foeCar: 0.05, infantry: 0.08, defender: 0.04, lantern: 0.08, drum: 0.04, crown: 0.05, wisp: 0.08, lighthouse: 0.04, destroyer: 0.05, boss: 0.05 };
    const follows = { artillery: 0.15, tank: 1, gunCar: 1, foeCar: 0.35, infantry: 1, defender: 0.15, lantern: 0.35, drum: 0.35, crown: 0.35, wisp: 0.35, lighthouse: 0.35, destroyer: 0.45, boss: 0.15 };
    const unit = {
      kind,
      mesh,
      x,
      z: extra.z ?? (kind === 'boss' ? -12.5 : kind === 'defender' ? -20 : kind === 'infantry' ? 14 : kind === 'artillery' ? 18 : kind === 'destroyer' ? 6 : 12),
      garrison: Boolean(extra.garrison),
      delay,
      age: 0,
      speed: extra.speed ?? speeds[kind] ?? 8,
      bob: extra.bob ?? bobs[kind] ?? 0.04,
      laneFollow: extra.laneFollow ?? follows[kind] ?? 1,
      special: kind === 'destroyer' || kind === 'boss' || kind === 'lantern' || kind === 'drum' || kind === 'crown' || kind === 'wisp' || kind === 'lighthouse',
      shotCd: extra.shotCd ?? 0.4 + Math.random() * 0.5,
      gun: extra.gun || mesh.userData.gun || 'machine',
      attackT: 0,
      hp: kind === 'player' ? this.playerMaxHp() : kind === 'boss' ? BOSS_HP : kind === 'defender' ? 6 : kind === 'infantry' ? 6 : kind === 'foeCar' ? (extra.gun === 'cannon' ? 10 : extra.gun === 'mortar' ? 8 : 7) : kind === 'tank' ? 22 : kind === 'gunCar' ? 14 : 0,
      maxHp: kind === 'boss' ? BOSS_HP : kind === 'player' ? this.playerMaxHp() : kind === 'foeCar' ? (extra.gun === 'cannon' ? 10 : extra.gun === 'mortar' ? 8 : 7) : kind === 'tank' ? 22 : kind === 'gunCar' ? 14 : 0,
      wrecked: false,
      wreckT: 0,
      duel: null,
      down: false,
      downT: 0,
      meleeCd: 0.35 + Math.random() * 0.25,
      stagger: 0,
      stars: null,
      focus: null,
    };
    this.units.push(unit);
    if (kind === 'artillery' && mesh.userData.tube) this.tubes.push(mesh.userData.tube);
    return unit;
  }

  beginPhase(id) {
    this.phase = id;
    this.phaseT = 0;
    this.phaseLock = 0;
    this.phaseMark = { hold: this.hold, capture: this.capture };
    if (id !== 'resolve' && this.mode !== 'boss' && this.wave >= 5) {
      this.spawnStageWave();
      this.sfx.wave?.();
      return;
    }
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
      const wave = scaleCount(18, this.difficulty.spawn, 8);
      for (let i = 0; i < wave; i += 1) {
        const col = (i % 9) - 4;
        const row = Math.floor(i / 9);
        this.spawn('defender', col * 1.9, 0.06, {
          z: -16 - row * 1.4,
          shotCd: 0.2 * this.difficulty.cadence,
        });
      }
    } else if (id === 'special') {
      this.spawn('destroyer', 0, 0.18);
      this.spawn(this.world.special, 20, 0.45);
      this.splash(0, 6, 0x1ad4c8, 15.3);
      this.shake = Math.min(1.6, this.shake + 0.9);
      this.destroyerCd = 0.85;
      this.phaseMark = { hold: this.hold, capture: this.capture };
      this.sfx.wave?.();
    } else if (id === 'resolve') {
      if (!this.retreating) {
        this.outcome = 'win';
        this.gold = goldReady({
          win: true,
          fullForce: this.fullForce,
          balanced: this.balanced,
          bestStreak: this.bestStreak,
        });
      }
      this.sfx.wave?.();
      this.reportResolved();
    } else {
      this.sfx.ui?.();
    }
  }

  reportResolved() {
    if (this.reported) return;
    this.reported = true;
    this.onResolved?.({
      win: this.outcome === 'win',
      boss: this.mode === 'boss',
      worldId: this.world.id,
      score: this.score,
      bestStreak: this.bestStreak,
      fullForce: this.fullForce,
      balanced: this.balanced,
      gold: Boolean(this.gold),
    });
  }

  playerMaxHp() {
    const base = 8 + (this.perks?.shield || 0) * 6;
    return Math.max(3, Math.round(base * (this.difficulty?.playerHp || 1)));
  }

  scaledCd(base, perk, gain) {
    const tier = this.perks?.[perk] || 0;
    return base / (1 + gain * tier);
  }

  captureRate() {
    return 1 + (this.perks?.banner || 0) * 0.35;
  }

  nextPhase() {
    if (this.mode === 'boss' || this.phase === 'boss' || this.phase === 'resolve') return;
    const step = stageWaveStep(this.wave);
    if (step.done) {
      this.beginPhase('resolve');
      return;
    }
    this.wave = step.wave;
    this.waveSquad = [];
    if (this.wave === STAGE_WAVES) this.flashDeploy(T.groundLastWave);
    this.beginPhase(step.beat);
  }

  /** Waves 5–10 are one squad. The next squad waits until this one is down. */
  spawnStageWave() {
    this.waveSquad = [];
    const base = this.wave === STAGE_WAVES ? 8 : 6;
    const count = scaleCount(base, this.difficulty?.spawn || 1, 4);
    for (let i = 0; i < count; i += 1) {
      const unit = this.spawn('defender', (i - (count - 1) / 2) * 1.7, 0.05, {
        z: -13.5 - (i % 2) * 1.35,
        shotCd: 0.22 * (this.difficulty?.cadence || 1),
      });
      this.waveSquad.push(unit);
    }
    if (this.wave === STAGE_WAVES && this.countKind('destroyer') < 1) {
      this.spawn('destroyer', 0, 0.12);
    }
  }

  retreat() {
    if (!this.active || this.phase === 'resolve') return;
    this.retreating = true;
    this.outcome = 'retreat';
    this.beginPhase('resolve');
  }

  countKind(kind) {
    let n = 0;
    for (const unit of this.units) {
      if (unit.kind === kind && !unit.down) n += 1;
    }
    return n;
  }

  rearAnchor() {
    const player = this.playerUnit();
    return {
      x: player ? player.x : 0,
      z: Math.min(18, (player ? player.z : 6) + 3.4),
    };
  }

  flashDeploy(text) {
    this.deployNote = text;
    this.deployNoteT = 1.7;
  }

  /** One press streams a force in from the friendly rear. */
  deploy(kind) {
    if (!this.active || this.phase === 'resolve' || this.retreating) return false;
    if (kind === 'infantry') return this.deployInfantry();
    if (kind === 'tank') return this.deployTank();
    if (kind === 'destroyer') return this.deployDestroyer();
    return false;
  }

  deployInfantry() {
    if (this.deployCd.infantry > 0 || this.countKind('infantry') >= 88) return false;
    this.deployCd.infantry = 0.48;
    const { x, z } = this.rearAnchor();
    for (let i = 0; i < 4; i += 1) {
      this.spawn('infantry', x + (i - 1.5) * 1.28, 0.07 * i, {
        z: z + (i % 2) * 0.75,
        speed: 7.6,
        shotCd: 0.15 + i * 0.08,
      });
    }
    const crowned = this.noteDeploy('infantry');
    this.flashDeploy(crowned ? T.groundFullForce : T.groundSoldierIn);
    this.sfx.ui?.();
    return true;
  }

  deployTank() {
    if (this.deployCd.tank > 0 || this.countKind('tank') >= 12) return false;
    this.deployCd.tank = this.scaledCd(0.85, 'cannon', 0.75);
    const { x, z } = this.rearAnchor();
    this.spawn('tank', THREE.MathUtils.clamp(x, -14, 14), 0, {
      z: z + 0.3,
      speed: 8.6,
      shotCd: 0.2,
    });
    const crowned = this.noteDeploy('tank');
    this.flashDeploy(crowned ? T.groundFullForce : T.groundTankIn);
    this.sfx.wave?.();
    return true;
  }

  deployDestroyer() {
    if (this.deployCd.destroyer > 0 || this.countKind('destroyer') >= 3) return false;
    this.deployCd.destroyer = this.scaledCd(1.35, 'destroyer', 0.85);
    const { x, z } = this.rearAnchor();
    const unit = this.spawn('destroyer', THREE.MathUtils.clamp(x, -10, 10), 0.05, {
      z: Math.min(z, 8),
      speed: 6.2,
      shotCd: 0.45,
    });
    this.splash(unit.x, unit.z, 0x1ad4c8, 11.9);
    this.shake = Math.min(1.6, this.shake + 0.7);
    const crowned = this.noteDeploy('destroyer');
    this.flashDeploy(crowned ? T.groundFullForce : T.groundDestroyerIn);
    this.sfx.wave?.();
    return true;
  }

  playerUnit() {
    return this.units.find((unit) => unit.kind === 'player') || null;
  }

  drivePlayer(dt, input) {
    const player = this.playerUnit();
    if (!player || player.down || this.phase === 'resolve') return;
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
    if (player.shotCd > 0 || player.down || player.duel) return;
    player.shotCd = 0.22;
    player.attackT = 0.2;
    this.fireRifle(player);
  }

  /** Lobs a toy grenade. The bloom covers a patch of the line, not one soldier. */
  throwGrenade() {
    const player = this.playerUnit();
    if (!this.active || this.phase === 'resolve' || this.grenadeCd > 0) return false;
    if (!player || player.down || player.delay > 0) return false;
    this.grenadeCd = 1.15;
    player.attackT = 0.32;
    const foe = this.aiming && player.focus && this.troopAlive(player.focus)
      ? player.focus
      : this.nearestEnemy(player, this.aiming ? 24 : 16);
    const reach = this.aiming ? 16 : 12;
    const from = new THREE.Vector3();
    const muzzle = player.mesh.userData.muzzle;
    if (muzzle) {
      player.mesh.updateMatrixWorld(true);
      muzzle.getWorldPosition(from);
    } else {
      from.set(player.mesh.position.x, 2.4, player.mesh.position.z);
    }
    const to = foe
      ? new THREE.Vector3(foe.x, 0.45, foe.z)
      : new THREE.Vector3(player.x, 0.45, player.z - reach);
    this.launchShell({
      from,
      to,
      color: 0xffd27a,
      radius: 0.36,
      dur: 0.58,
      holdHit: 0.7,
      splash: 8,
      arc: 4.6,
      silentTubes: true,
      team: 'friend',
      soldierHit: this.aiming ? 4.8 : 3.6,
      troopDamage: 6,
      grenade: true,
      role: 'soldier',
    });
    this.sfx.blip?.({ freq: 260, dur: 0.09, type: 'triangle', vol: 0.06, slide: 160 });
    return true;
  }

  update(dt, input) {
    if (!this.active) return;
    this.deployCd.infantry = Math.max(0, this.deployCd.infantry - dt);
    this.deployCd.tank = Math.max(0, this.deployCd.tank - dt);
    this.deployCd.destroyer = Math.max(0, this.deployCd.destroyer - dt);
    this.salvoCd = Math.max(0, this.salvoCd - dt);
    this.deployNoteT = Math.max(0, this.deployNoteT - dt);
    this.grenadeCd = Math.max(0, this.grenadeCd - dt);
    this.streakT = Math.max(0, this.streakT - dt);
    if (this.streakT <= 0) this.streak = 0;
    this.playerGrace = Math.max(0, this.playerGrace - dt);
    this.drivePlayer(dt, input);
    this.lane = THREE.MathUtils.damp(this.lane, 0, 4, dt);

    this.voiceClock += dt;
    this.barkT = Math.max(0, this.barkT - dt);
    this.bossHitCd = Math.max(0, this.bossHitCd - dt);
    if (this.pendingVoices.length) {
      const waiting = [];
      for (const item of this.pendingVoices) {
        item.at -= dt;
        if (item.at > 0) waiting.push(item);
        else this.voiceLine(item.side, item.cue);
      }
      this.pendingVoices = waiting;
    }
    if (this.phase !== 'resolve' && this.phase !== 'boss') {
      this.phaseT += dt;
      if (this.phaseLock > 0) {
        this.phaseLock -= dt;
        if (this.phaseLock <= 0) this.nextPhase();
      } else if (this.phaseT >= (PHASE_MIN[this.phase] || 0) && this.beatEarned()) {
        this.awardBeatStar();
        this.flashDeploy(T.groundBeatClear);
        this.sfx.ui?.();
        this.phaseLock = 0.9;
      }
    }

    this.pairSoldiers();
    this.updatePhase(dt);
    this.updateUnits(dt);
    this.updateDestroyer(dt);
    this.updateBoss(dt);
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
    const foe = unit.focus && this.troopAlive(unit.focus) ? unit.focus : this.nearestEnemy(unit, 20);
    let to = new THREE.Vector3(
      foe ? foe.x : unit.x + this.lane * unit.laneFollow + (Math.random() - 0.5) * 3.2,
      1.05,
      foe ? foe.z : unit.z + forward * (8 + Math.random() * 5),
    );
    if (unit.kind !== 'defender') to = this.bossTarget(to);
    this.launchShell({
      from,
      to,
      color,
      radius: 0.14,
      dur: 0.34,
      holdHit: unit.kind === 'defender' ? 0 : 0.12,
      splash: 2.4,
      arc: 0.85,
      silentTubes: true,
      team: unit.kind === 'defender' ? 'foe' : 'friend',
      soldierHit: unit.kind === 'player' ? 1.8 : unit.kind === 'defender' ? this.defenderReach() : 0,
      troopDamage: unit.kind === 'player' ? 1 : this.defenderChip(),
      role: unit.kind === 'player' ? 'soldier' : undefined,
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
    const prey = unit.kind === 'foeCar' ? this.armorPrey(unit) : this.friendArmor(unit);
    let to = prey
      ? new THREE.Vector3(prey.x + (Math.random() - 0.5) * gun.spread * 0.35, unit.gun === 'mortar' ? 0.6 : 0.9, prey.z)
      : new THREE.Vector3(
        unit.x + this.lane * unit.laneFollow + (Math.random() - 0.5) * gun.spread,
        unit.gun === 'mortar' ? 0.4 : 0.95,
        unit.z + forward * (gun.range + Math.random() * 4),
      );
    if (unit.kind !== 'foeCar') to = this.bossTarget(to);
    const foe = unit.kind === 'foeCar';
    const chip = foe
      ? (unit.gun === 'machine' ? (this.difficulty.id === 'hard' ? 1 : 0) : 1)
      : (unit.gun === 'machine' ? 0 : 1);
    this.launchShell({
      from,
      to,
      color,
      radius: gun.radius,
      dur: gun.dur,
      holdHit: foe ? 0 : gun.hold,
      splash: gun.splash,
      arc: gun.arc,
      silentTubes: true,
      team: foe ? 'foe' : 'friend',
      soldierHit: chip > 0 ? (unit.gun === 'mortar' ? 2.35 : 2.05) : 0,
      troopDamage: chip > 0 ? Math.max(1, Math.round(chip)) : 0,
      vehicleHit: unit.gun === 'machine' ? 0 : foe ? 2.4 : 3.2,
      vehicleRadius: 3.1,
      role: !foe && unit.gun !== 'machine' ? 'tank' : undefined,
    });
    const flash = unit.mesh.userData.flash;
    if (flash) flash.material.opacity = 1;
    const turret = unit.mesh.userData.turret;
    if (turret) {
      turret.rotation.x = gun.kick;
      if (prey) {
        const dx = prey.x - unit.x;
        const dz = prey.z - unit.z;
        turret.rotation.y = Math.atan2(-dx, -dz) - unit.mesh.rotation.y;
      }
    }
    if (Math.random() < 0.45) {
      this.sfx.blip?.({ freq: unit.kind === 'foeCar' ? 160 : 240, dur: 0.06, type: 'square', vol: 0.04, slide: -30 });
    }
  }

  resetBattleScore() {
    this.score = 0;
    this.streak = 0;
    this.streakT = 0;
    this.bestStreak = 0;
    this.sent = { infantry: false, tank: false, destroyer: false };
    this.roleHits = { soldier: 0, tank: 0, destroyer: 0 };
    this.fullForce = false;
    this.balanced = false;
    this.gold = false;
    this.stars = { tank: false, soldier: false, destroyer: false };
    this.playerGrace = 0;
    this.playerOut = false;
    this.livesLeft = 0;
  }

  addBattleScore(amount) {
    if (!(amount > 0) || this.outcome === 'retreat') return;
    if (this.streakT > 0) this.streak = Math.min(4, this.streak + 1);
    else this.streak = 1;
    this.streakT = 2.8;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    this.score += Math.round(amount * this.streak);
  }

  creditRole(role) {
    if (!role || !this.roleHits) return;
    this.roleHits[role] += 1;
    if (this.balanced) return;
    if (this.roleHits.soldier > 0 && this.roleHits.tank > 0 && this.roleHits.destroyer > 0) {
      this.balanced = true;
      this.addBattleScore(80);
      this.flashDeploy(T.groundBalanced);
    }
  }

  noteDeploy(kind) {
    if (!this.sent || this.sent[kind]) return false;
    this.sent[kind] = true;
    if (this.fullForce) return false;
    if (this.sent.infantry && this.sent.tank && this.sent.destroyer) {
      this.fullForce = true;
      this.addBattleScore(50);
      return true;
    }
    return false;
  }

  barricadesPopped() {
    let n = 0;
    for (const block of this.barricades) if (block.popped) n += 1;
    return n;
  }

  beatEarned() {
    if (this.mode !== 'boss' && this.wave >= 5) {
      return this.waveSquad.length > 0 && this.waveSquad.every((unit) => unit.down || unit.wrecked);
    }
    if (this.phase === 'artillery') return this.hold <= 68;
    if (this.phase === 'armor') return this.barricadesPopped() >= 4;
    if (this.phase === 'infantry') return this.capture >= 74;
    if (this.phase === 'special') {
      const mark = this.phaseMark || { hold: this.hold, capture: this.capture };
      const lineClear = this.hold <= 18 || this.capture >= 92;
      const pushed = this.hold <= mark.hold - 18 || this.capture >= Math.min(100, mark.capture + 12);
      return lineClear || pushed || this.salvoLanded;
    }
    return false;
  }

  awardBeatStar() {
    if (this.phase === 'armor') this.stars.tank = true;
    else if (this.phase === 'infantry') this.stars.soldier = true;
    else if (this.phase === 'special') this.stars.destroyer = true;
  }

  defenderChip() {
    return this.difficulty?.id === 'hard' ? 1 : 0;
  }

  defenderReach() {
    return this.difficulty?.id === 'hard' ? 1.7 : 0;
  }

  /** The blue soldier draws fire by stepping ahead of the friendly line. */
  playerExposed() {
    const player = this.playerUnit();
    if (!player || player.down) return false;
    const front = this.friendlyFront();
    if (front == null) return true;
    return player.z < front - 0.35;
  }

  reaches(unit, x, z, radius) {
    let scale = unit.kind === 'player' ? (this.difficulty?.playerHit || 1) : 1;
    if (unit.kind === 'player' && this.difficulty?.id === 'hard' && !this.playerExposed()) scale *= 0.42;
    return Math.hypot(unit.x - x, unit.z - z) <= radius * scale;
  }

  tankWall(unit) {
    let best = null;
    let bestD = 48;
    for (const block of this.barricades) {
      if (block.popped) continue;
      const dist = Math.hypot(block.x - unit.x, block.z - unit.z);
      let claimed = false;
      for (const other of this.units) {
        if (other === unit || other.kind !== 'tank' || other.wrecked || other.delay > 0) continue;
        if (other._aim?.kind === 'wall' && Math.abs((other._aim.x || 0) - block.x) < 0.5) {
          if (Math.hypot(other.x - block.x, other.z - block.z) + 0.4 < dist) claimed = true;
        }
      }
      if (claimed) continue;
      if (dist < bestD) {
        best = block;
        bestD = dist;
      }
    }
    if (best) return best;
    let fallback = null;
    let fallbackD = 48;
    for (const block of this.barricades) {
      if (block.popped) continue;
      const dist = Math.hypot(block.x - unit.x, block.z - unit.z);
      if (dist < fallbackD) {
        fallback = block;
        fallbackD = dist;
      }
    }
    return fallback;
  }

  tankAim(unit) {
    let bestCar = null;
    let bestScore = 30;
    for (const other of this.units) {
      if (other.kind !== 'foeCar' || other.wrecked || other.delay > 0 || !other.mesh.visible) continue;
      const dist = Math.hypot(other.x - unit.x, other.z - unit.z);
      if (dist > 26) continue;
      let score = dist;
      if (other.hp < other.maxHp) score -= 3;
      if (score < bestScore) {
        bestCar = other;
        bestScore = score;
      }
    }
    const wallsDown = this.barricadesPopped() >= 4;
    if (bestCar && (this.phase === 'armor' || wallsDown || bestScore < 15)) {
      return { kind: 'armor', x: bestCar.x, z: bestCar.z, unit: bestCar };
    }
    if (unit.z > -18) {
      const wall = this.tankWall(unit);
      if (wall) return { kind: 'wall', x: wall.x, z: wall.z };
    }
    const troop = this.openEnemy(unit, 30) || this.nearestEnemy(unit, 30);
    if (troop) return { kind: 'troop', x: troop.x, z: troop.z, unit: troop };
    return { kind: 'push', x: unit.x * 0.35, z: -26 };
  }

  steerTank(unit, dt) {
    if (unit.wrecked) return;
    const aim = this.tankAim(unit);
    unit._aim = aim;
    unit.focus = aim?.unit && this.troopAlive(aim.unit) ? aim.unit : null;
    let desired = aim ? aim.x : unit.x;
    if ((unit._coverT || 0) > 0) {
      unit._coverT -= dt;
      desired = unit._coverX;
    }
    let spacing = 0;
    for (const other of this.units) {
      if (other === unit || other.kind !== 'tank' || other.wrecked || other.delay > 0) continue;
      const dx = unit.x - other.x;
      if (Math.abs(unit.z - other.z) < 3.6 && Math.abs(dx) < 2.7) {
        spacing += Math.sign(dx || (unit.x >= 0 ? 1 : -1)) * 2.4;
      }
    }
    unit.x = THREE.MathUtils.clamp(
      unit.x + THREE.MathUtils.clamp(desired - unit.x, -1, 1) * 5.4 * dt + spacing * dt,
      -16,
      16,
    );
    const lining = aim && (aim.kind === 'armor' || aim.kind === 'wall') && Math.abs(desired - unit.x) > 1.5;
    unit._slow = lining ? 0.62 : 1;
  }

  vehicleAlive(unit) {
    return Boolean(unit) && !unit.wrecked && unit.delay <= 0 && (unit.kind === 'tank' || unit.kind === 'gunCar' || unit.kind === 'foeCar' || unit.kind === 'destroyer');
  }

  armorPrey(unit) {
    let best = null;
    let bestD = 24;
    const player = this.playerUnit();
    const pool = [];
    for (const other of this.units) {
      if (other.wrecked || other.delay > 0 || other.down) continue;
      if (other.kind === 'tank' || other.kind === 'gunCar' || other.kind === 'destroyer') pool.push(other);
    }
    if (player && !player.down && player.delay <= 0) pool.push(player);
    for (const other of pool) {
      const dist = Math.hypot(other.x - unit.x, other.z - unit.z);
      const hard = this.difficulty?.id === 'hard';
      const exposed = other.kind === 'player' && this.playerExposed();
      const bias = other.kind === 'tank'
        ? -1.2
        : other.kind === 'player'
          ? (hard && exposed ? -0.85 : hard ? 4.5 : 0.5)
          : other.kind === 'destroyer'
            ? -0.3
            : 0.8;
      if (dist + bias < bestD) {
        best = other;
        bestD = dist + bias;
      }
    }
    return best;
  }

  friendArmor(unit) {
    let best = null;
    let bestD = 22;
    for (const other of this.units) {
      if (other.kind !== 'foeCar' || other.wrecked || other.delay > 0) continue;
      const dist = Math.hypot(other.x - unit.x, other.z - unit.z);
      if (dist < bestD) {
        best = other;
        bestD = dist;
      }
    }
    return best;
  }

  steerFoeCar(unit, dt) {
    if (unit.wrecked) return;
    const prey = this.armorPrey(unit);
    if (!prey) return;
    unit.x = THREE.MathUtils.clamp(
      unit.x + THREE.MathUtils.clamp(prey.x - unit.x, -1, 1) * 1.7 * dt,
      -16,
      16,
    );
  }

  destroyerSpot() {
    const boss = this.bossUnit();
    if (this.mode === 'boss' && boss && !boss.down) {
      return { x: boss.x, z: Math.min(-4, boss.z + 8.5), kind: 'boss' };
    }
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (const foe of this.units) {
      if (!this.troopAlive(foe) || foe.kind !== 'defender') continue;
      sx += foe.x;
      sz += foe.z;
      n += 1;
    }
    if (n >= 3) return { x: THREE.MathUtils.clamp(sx / n, -12, 12), z: sz / n + 7.5, kind: 'crowd' };
    for (const block of this.barricades) {
      if (!block.popped) return { x: block.x, z: block.z + 6, kind: 'wall' };
    }
    return { x: 0, z: -16, kind: 'push' };
  }

  steerDestroyer(unit, dt) {
    const spot = this.destroyerSpot();
    unit._aim = spot;
    let spacing = 0;
    for (const other of this.units) {
      if (other === unit || other.kind !== 'destroyer' || other.delay > 0) continue;
      const dx = unit.x - other.x;
      if (Math.abs(dx) < 4.2 && Math.abs(unit.z - other.z) < 4) spacing += Math.sign(dx || 1) * 1.8;
    }
    unit.x = THREE.MathUtils.clamp(
      unit.x + THREE.MathUtils.clamp(spot.x - unit.x, -1, 1) * 3.6 * dt + spacing * dt,
      -14,
      14,
    );
    unit._slow = unit.z - spot.z > 3 ? 1 : 0.4;
    const dx = spot.x - unit.x;
    unit.mesh.rotation.y = THREE.MathUtils.clamp(-dx * 0.05, -0.35, 0.35);
  }

  threatAlong(from, dir, reach) {
    let best = null;
    let bestScore = reach;
    const consider = (x, z, kind, bias = 0) => {
      const dx = x - from.x;
      const dz = z - from.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.1 || dist > reach) return;
      const dot = (dx / dist) * dir.x + (dz / dist) * dir.z;
      if (dot < 0.62) return;
      const score = dist - bias;
      if (score < bestScore) {
        best = { x, z, kind };
        bestScore = score;
      }
    };
    const boss = this.bossUnit();
    if (this.mode === 'boss' && boss && !boss.down) consider(boss.x, boss.z, 'boss', 6);
    for (const other of this.units) {
      if (other.kind === 'foeCar' && !other.wrecked && other.delay <= 0 && other.mesh.visible) {
        consider(other.x, other.z, 'armor', 3.5);
      }
      if (this.troopAlive(other) && other.kind === 'defender') consider(other.x, other.z, 'troop', 0);
    }
    for (const block of this.barricades) {
      if (!block.popped) consider(block.x, block.z, 'wall', 1.2);
    }
    return best;
  }

  salvoWorth(unit) {
    const boss = this.bossUnit();
    if (this.mode === 'boss' && boss && !boss.down && Math.hypot(boss.x - unit.x, boss.z - unit.z) < 16) return true;
    let troops = 0;
    let cars = 0;
    for (const other of this.units) {
      const dist = Math.hypot(other.x - unit.x, other.z - unit.z);
      if (dist > 14) continue;
      if (this.troopAlive(other) && other.kind === 'defender') troops += 1;
      if (other.kind === 'foeCar' && !other.wrecked && other.delay <= 0) cars += 1;
    }
    return troops >= 6 || cars >= 2;
  }

  hurtVehicles(x, z, amount, team, radius, role) {
    let best = null;
    let bestD = radius;
    for (const unit of this.units) {
      if (!this.vehicleAlive(unit) || unit.kind === 'destroyer') continue;
      if (team === 'friend' && unit.kind !== 'foeCar') continue;
      if (team === 'foe' && unit.kind === 'foeCar') continue;
      if (team !== 'foe' && team !== 'friend') continue;
      const dist = Math.hypot(unit.x - x, unit.z - z);
      if (dist < bestD) {
        best = unit;
        bestD = dist;
      }
    }
    if (!best) return;
    const dealt = team === 'foe' ? amount * (this.difficulty?.foeDamage || 1) : amount;
    best.hp -= dealt;
    if (best.kind === 'tank' && team === 'foe') {
      const flank = best.x >= 0 ? 1 : -1;
      best._coverX = THREE.MathUtils.clamp(best.x + flank * 5.5, -15, 15);
      best._coverT = 0.85;
    }
    if (best.hp > 0) return;
    best.wrecked = true;
    best.wreckT = 0;
    best.speed = 0;
    this.splash(best.x, best.z, team === 'foe' ? this.world.enemy : 0xffd56a, 6);
    if (best.kind === 'foeCar') {
      this.addBattleScore(40);
      this.hold = Math.max(0, this.hold - 4);
      this.capture = Math.min(100, this.capture + 3);
      if (role) this.creditRole(role);
    }
  }

  openEnemy(unit, range) {
    let best = null;
    let bestScore = range * 2;
    for (const other of this.units) {
      if (!this.troopAlive(other) || other.kind !== 'defender') continue;
      const dist = Math.hypot(unit.x - other.x, unit.z - other.z);
      if (dist > range) continue;
      let crowd = other.duel ? 2 : 0;
      for (const mate of this.units) {
        if (mate === unit || !this.troopAlive(mate) || mate.kind === 'defender') continue;
        if (mate.focus === other || mate.duel === other) crowd += 1;
      }
      const score = dist + crowd * 3.2 + Math.abs(unit.x - other.x) * 0.35;
      if (score < bestScore) {
        best = other;
        bestScore = score;
      }
    }
    return best;
  }

  updatePhase(dt) {
    if (this.phase === 'artillery' || this.phase === 'armor') {
      this.hold = Math.max(0, this.hold - (this.phase === 'artillery' ? 4.2 : 3.2) * dt);
      this.shellCd -= dt;
      if (this.shellCd <= 0) {
        this.shellCd = 0.62;
        const guns = this.units.filter((unit) => unit.kind === 'artillery' && unit.mesh.visible);
        const gun = guns[Math.floor(Math.random() * guns.length)];
        this.launchShell(gun ? {
          from: new THREE.Vector3(gun.mesh.position.x, 2.4, gun.mesh.position.z - 0.6),
          to: new THREE.Vector3((Math.random() - 0.5) * 12, 0.4, -14 - Math.random() * 8),
          arc: 6,
        } : { arc: 6 });
      }
    } else if (this.phase === 'infantry') {
      this.capture = Math.min(100, this.capture + 7 * this.captureRate() * dt);
      this.hold = Math.max(0, this.hold - 1.4 * dt);
    } else if (this.phase === 'special') {
      this.capture = Math.min(100, this.capture + 3.5 * this.captureRate() * dt);
      this.hold = Math.max(0, this.hold - 3.5 * dt);
    } else if (this.phase === 'boss') {
      this.shellCd -= dt;
      if (this.shellCd <= 0) {
        this.shellCd = 0.9;
        const boss = this.bossUnit();
        const guns = this.units.filter((unit) => unit.kind === 'artillery' && unit.mesh.visible);
        const gun = guns[Math.floor(Math.random() * Math.max(1, guns.length))];
        const aim = boss && !boss.down ? boss : null;
        this.launchShell(gun ? {
          from: new THREE.Vector3(gun.mesh.position.x, 2.4, gun.mesh.position.z - 0.6),
          to: new THREE.Vector3(
            (aim ? aim.x : 0) + (Math.random() - 0.5) * 2.4,
            1.3,
            (aim ? aim.z : -14) + (Math.random() - 0.5) * 1.6,
          ),
          arc: 5.5,
          team: 'friend',
          splash: 6.5,
        } : { arc: 5.5, team: 'friend', splash: 6.5 });
      }
    } else if (this.outcome === 'win') {
      this.capture = 100;
      this.hold = 0;
    }
  }

  launchShell(spec = {}) {
    const from = spec.from || new THREE.Vector3((Math.random() - 0.5) * 10, 1.4, 18);
    const to = spec.to || new THREE.Vector3(this.lane + (Math.random() - 0.5) * 16, 0.4, -26 - Math.random() * 14);
    const color = spec.color ?? this.world.glow;
    const radius = spec.radius ?? 0.35;
    const mesh = spec.mesh || new THREE.Mesh(
      shellGeometry(radius),
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
      team: spec.team || null,
      soldierHit: spec.soldierHit || 0,
      troopDamage: spec.troopDamage || 0,
      vehicleHit: spec.vehicleHit || 0,
      vehicleRadius: spec.vehicleRadius || 0,
      role: spec.role || null,
      grenade: Boolean(spec.grenade),
      bits: spec.bits,
      shake: spec.shake,
      quiet: Boolean(spec.quiet),
      missile: Boolean(spec.missile),
      area: spec.area || 0,
      areaDamage: spec.areaDamage || 0,
      trail: 0,
    });
    if (spec.silentTubes) return;
    for (const tube of this.tubes) {
      tube.material.emissiveIntensity = 1.4;
    }
    this.sfx.blip?.({ freq: 220, dur: 0.09, type: 'sine', vol: 0.05, slide: -80 });
  }

  fireDestroyer(unit) {
    const guns = unit.mesh.userData.guns || [];
    if (!guns.length) return;
    unit.mesh.updateMatrixWorld(true);
    const from = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const scale = unit.mesh.scale.x || DESTROYER_POP;
    let weight = 0;
    for (const mount of guns) {
      const radius = mount.userData.radius || 0.1;
      weight += mount.userData.nuclear ? 2.2 : Math.max(0.45, radius * 4);
    }
    for (const mount of guns) {
      const muzzle = mount.userData.muzzle;
      if (!muzzle) continue;
      muzzle.getWorldPosition(from);
      muzzle.getWorldDirection(dir);
      if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1);
      else dir.normalize();
      const nuclear = Boolean(mount.userData.nuclear);
      const localR = mount.userData.radius || 0.1;
      const share = (nuclear ? 2.2 : Math.max(0.45, localR * 4)) / weight;
      const travel = nuclear ? 15 : localR >= 0.1 ? 12 : 9;
      const impact = new THREE.Vector3(from.x + dir.x * travel, 0.45, from.z + dir.z * travel);
      const threat = this.threatAlong(from, dir, travel + 8);
      const deltaY = (threat ? 0.45 : impact.y) - from.y;
      const arc = Math.max(0.2, (travel * dir.y - deltaY) / Math.PI);
      // Each barrel still lobs along its bore. A threat in that arc is preferred.
      // Front guns with an empty lane still hunt the commander.
      const aimed = threat
        ? new THREE.Vector3(threat.x, threat.kind === 'boss' ? 1.5 : 0.45, threat.z)
        : impact;
      const to = !threat && dir.z < -0.35 ? this.bossTarget(aimed, 0.85) : aimed;
      const connected = Boolean(threat) || dir.z < -0.35;
      const heavy = nuclear || localR >= 0.1;
      this.launchShell({
        from: from.clone(),
        to,
        color: nuclear ? 0xff7a1c : 0x7af6ee,
        radius: THREE.MathUtils.clamp(localR * scale * 0.32, 0.12, nuclear ? 0.62 : 0.4),
        dur: THREE.MathUtils.clamp(0.32 + travel * 0.015, 0.34, 0.72),
        holdHit: DESTROYER_HOLD_BUDGET * share * (connected ? 1 : 0.35),
        splash: nuclear ? 5.5 : heavy ? 3.2 : 1.6,
        arc,
        silentTubes: true,
        team: 'friend',
        soldierHit: connected ? (nuclear ? 3.2 : heavy ? 2.4 : 1.6) : 0,
        troopDamage: connected ? (nuclear ? 3 : heavy ? 2 : 1) : 0,
        vehicleHit: threat?.kind === 'armor' || nuclear ? (nuclear ? 3.4 : 1.8) : 0,
        vehicleRadius: nuclear ? 4.2 : 2.8,
        role: 'destroyer',
        bits: nuclear ? 3 : heavy ? 2 : 1,
        shake: nuclear ? 0.06 : 0.02,
        quiet: !nuclear,
      });
      const flash = mount.userData.flash;
      if (flash) flash.material.opacity = 1;
    }
    this.shake = Math.min(1.3, this.shake + 0.24);
    this.sfx.blip?.({ freq: 130, dur: 0.12, type: 'sawtooth', vol: 0.06, slide: -60 });
    this.sfx.noise?.(0.14, 0.16, 380);
  }

  readyDestroyers() {
    return this.units.filter((unit) => (
      unit.kind === 'destroyer' && unit.mesh.visible && unit.delay <= 0 && unit.age >= 0.45
    ));
  }

  /** One press: a missile leaves every compass barrel at once. */
  salvo(opts = {}) {
    if (!this.active || this.phase === 'resolve' || this.retreating) return false;
    if (this.salvoCd > 0) return false;
    const units = this.readyDestroyers();
    if (!units.length) {
      if (!opts.auto) {
        this.flashDeploy(T.groundSalvoNeed);
        this.sfx.ui?.();
      }
      return false;
    }
    this.salvoCd = opts.auto ? 4.8 : 3.4;
    if (opts.auto) {
      for (const unit of units) unit.autoSalvo = true;
    }
    for (const unit of units) this.fireSalvo(unit);
    this.salvoLanded = true;
    this.flashDeploy(opts.auto ? T.groundSalvoAuto : T.groundSalvoIn);
    this.shake = Math.min(1.6, this.shake + 0.55);
    this.sfx.blip?.({ freq: 96, dur: 0.2, type: 'sawtooth', vol: 0.07, slide: -50 });
    this.sfx.noise?.(0.22, 0.24, 220);
    return true;
  }

  fireSalvo(unit) {
    const guns = (unit.mesh.userData.guns || []).filter((mount) => mount.userData.salvo && mount.userData.muzzle);
    if (!guns.length) return;
    unit.mesh.updateMatrixWorld(true);
    const from = new THREE.Vector3();
    const dir = new THREE.Vector3();
    guns.forEach((mount, index) => {
      mount.userData.muzzle.getWorldPosition(from);
      mount.userData.muzzle.getWorldDirection(dir);
      if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1);
      else dir.normalize();
      const travel = 20;
      const threat = this.threatAlong(from, dir, 26);
      const to = threat
        ? new THREE.Vector3(threat.x, 0.55, threat.z)
        : new THREE.Vector3(from.x + dir.x * travel, 0.55, from.z + dir.z * travel);
      const deltaY = to.y - from.y;
      const arc = Math.max(0.35, (travel * dir.y - deltaY) / Math.PI);
      const missile = makeSalvoMissile();
      missile.position.copy(from);
      missile.lookAt(from.x + dir.x, from.y + dir.y, from.z + dir.z);
      this.launchShell({
        mesh: missile,
        missile: true,
        from: from.clone(),
        to,
        color: 0xff4ad8,
        dur: 0.95,
        holdHit: 2.4,
        splash: 18,
        arc,
        silentTubes: true,
        team: 'friend',
        area: 6.4,
        areaDamage: 6,
        vehicleHit: 9,
        vehicleRadius: 6.2,
        role: 'destroyer',
        bits: 8,
        shake: index === 0 ? 0.28 : 0.05,
        quiet: index !== 0,
      });
      const flash = mount.userData.flash;
      if (flash) flash.material.opacity = 1;
    });
  }

  missilePuff(position) {
    const puff = new THREE.Mesh(
      missilePuffGeo,
      new THREE.MeshBasicMaterial({
        color: Math.random() < 0.45 ? 0xff4ad8 : 0xffe14a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    puff.position.copy(position);
    puff.scale.setScalar(0.55 + Math.random() * 0.45);
    this.root.add(puff);
    this.bits.push({
      mesh: puff,
      life: 0.38,
      max: 0.38,
      grow: 2.4,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.1 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8),
    });
  }

  updateDestroyer(dt) {
    for (const unit of this.units) {
      if (unit.kind !== 'destroyer' || !unit.mesh.visible || unit.delay > 0) continue;
      const pulse = 0.7 + Math.sin(unit.age * 10) * 0.35;
      for (const core of unit.mesh.userData.cores || []) {
        core.material.emissiveIntensity = pulse;
        core.scale.setScalar(0.9 + Math.sin(unit.age * 10) * 0.18);
      }
      for (const material of unit.mesh.userData.flashMats || []) {
        material.opacity = Math.max(0, material.opacity - dt * 4.8);
      }
      if (this.phase === 'resolve' || this.outcome === 'retreat' || unit.age < 0.7) continue;
      if (!unit.autoSalvo && unit.age > 1.35 && this.salvoCd <= 0 && this.salvoWorth(unit)) {
        this.salvo({ auto: true });
      }
      unit.shotCd -= dt;
      if (unit.shotCd > 0) continue;
      unit.shotCd = 1.2;
      this.fireDestroyer(unit);
    }
  }

  updateShells(dt) {
    for (const tube of this.tubes) {
      tube.material.emissiveIntensity = THREE.MathUtils.damp(tube.material.emissiveIntensity, 0.55, 6, dt);
    }
    for (let i = this.shells.length - 1; i >= 0; i -= 1) {
      const shell = this.shells[i];
      shell.t += dt / shell.dur;
      const p = Math.min(1, shell.t);
      const prev = shell.mesh.position.clone();
      shell.mesh.position.lerpVectors(shell.from, shell.to, p);
      shell.mesh.position.y += Math.sin(p * Math.PI) * (shell.arc ?? 9);
      if (shell.missile) {
        const step = shell.mesh.position.clone().sub(prev);
        if (step.lengthSq() > 1e-6) {
          const aim = shell.mesh.position.clone().add(step);
          shell.mesh.lookAt(aim);
        }
        const plume = shell.mesh.userData.plume;
        if (plume) plume.scale.setScalar(0.75 + Math.sin(shell.t * 40) * 0.28);
        shell.trail -= dt;
        if (shell.trail <= 0 && p < 1) {
          shell.trail = 0.045;
          const tail = new THREE.Vector3();
          if (plume) plume.getWorldPosition(tail);
          else tail.copy(shell.mesh.position);
          this.missilePuff(tail);
        }
      }
      if (p < 1) continue;
      if (shell.grenade) {
        this.splash(shell.to.x, shell.to.z, 0xffd27a, 22);
        this.splash(shell.to.x, shell.to.z, 0x7af6ee, 13);
        this.blastSoldiers(shell.to.x, shell.to.z, shell.soldierHit || 3.6, shell.team);
      } else {
        this.splash(shell.to.x, shell.to.z, shell.color ?? this.world.glow, shell.splash ?? 7, shell.bits ?? 5);
        if (shell.area) this.hurtSoldiersArea(shell.to.x, shell.to.z, shell.area, shell.team, shell.areaDamage || 2, shell.role);
        else if (shell.team && shell.soldierHit) {
          this.hurtSoldiers(shell.to.x, shell.to.z, shell.soldierHit, shell.team, shell.troopDamage || 1, shell.role);
        }
      }
      if (shell.vehicleHit) {
        this.hurtVehicles(shell.to.x, shell.to.z, shell.vehicleHit, shell.team, shell.vehicleRadius || 3, shell.role);
      }
      if (this.mode === 'boss' && shell.team !== 'foe') {
        if (shell.grenade) {
          const boss = this.bossUnit();
          const reach = shell.soldierHit || 3.6;
          if (boss && !boss.down && Math.hypot(shell.to.x - boss.x, shell.to.z - boss.z) <= reach) {
            this.hurtBoss(4);
          }
        } else this.splashHitsBoss(shell);
      }
      this.hold = Math.max(0, this.hold - (shell.holdHit ?? 3.1));
      this.crackNearest(shell.to.x, shell.to.z);
      this.shake = Math.min(0.8, this.shake + (shell.shake ?? 0.18));
      this.root.remove(shell.mesh);
      this.shells.splice(i, 1);
      if (!shell.quiet) this.sfx.noise?.(0.12, 0.18, 700);
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

  isTroop(unit) {
    return Boolean(unit) && (unit.kind === 'infantry' || unit.kind === 'defender' || unit.kind === 'player');
  }

  troopAlive(unit) {
    return this.isTroop(unit) && !unit.down && unit.delay <= 0;
  }

  friendlyFront() {
    let front = null;
    for (const unit of this.units) {
      if (!this.troopAlive(unit) || unit.kind !== 'infantry') continue;
      if (front == null || unit.z < front) front = unit.z;
    }
    return front;
  }

  nearestEnemy(unit, range) {
    const wantDefender = unit.kind !== 'defender';
    let best = null;
    let bestScore = range * 1.7;
    for (const other of this.units) {
      if (!this.troopAlive(other)) continue;
      if (wantDefender ? other.kind !== 'defender' : other.kind === 'defender') continue;
      const dx = Math.abs(unit.x - other.x);
      const dz = Math.abs(unit.z - other.z);
      const dist = Math.hypot(dx, dz);
      if (dist > range) continue;
      let score = dist + dx * 0.85;
      if (other.duel && other.duel !== unit) score += 5;
      // Warriors shoot the line. The player draws fire by stepping out ahead of it.
      if (other.kind === 'player' && unit.kind === 'defender') {
        const front = this.friendlyFront();
        if (front == null || other.z > front - 0.35) score += 9;
      }
      if (score < bestScore) {
        best = other;
        bestScore = score;
      }
    }
    return best;
  }

  breakDuel(unit) {
    if (!unit?.duel) return;
    const foe = unit.duel;
    unit.duel = null;
    if (foe.duel === unit) foe.duel = null;
  }

  pairSoldiers() {
    for (const unit of this.units) {
      if (!this.troopAlive(unit)) {
        if (unit.duel) this.breakDuel(unit);
        continue;
      }
      const foe = unit.duel;
      if (!foe) continue;
      const dist = Math.hypot(unit.x - foe.x, unit.z - foe.z);
      if (!this.troopAlive(foe) || foe.duel !== unit || dist > 4.8) this.breakDuel(unit);
    }
    for (const unit of this.units) {
      if (!this.troopAlive(unit) || unit.duel || unit.kind === 'defender') continue;
      let best = null;
      let bestD = 3.15;
      for (const other of this.units) {
        if (!this.troopAlive(other) || other.kind !== 'defender' || other.duel) continue;
        const dist = Math.hypot(unit.x - other.x, unit.z - other.z);
        if (dist < bestD) {
          best = other;
          bestD = dist;
        }
      }
      if (!best) continue;
      unit.duel = best;
      best.duel = unit;
      unit.meleeCd = Math.min(unit.meleeCd, 0.32);
      unit.attackT = 0.24;
      best.attackT = 0.24;
      this.clashSpark((unit.x + best.x) * 0.5, (unit.z + best.z) * 0.5, this.world.accent);
    }
  }

  steerTroop(unit, dt) {
    unit._slow = 1;
    unit._step = 0;
    if (!this.troopAlive(unit)) {
      unit.focus = null;
      return;
    }
    if (unit.duel) {
      unit.focus = unit.duel;
      return;
    }
    const foe = unit.kind === 'defender'
      ? this.nearestEnemy(unit, 16)
      : (this.openEnemy(unit, 28) || this.nearestEnemy(unit, 28));
    unit.focus = foe;
    if (unit.kind === 'player') return;
    if (!foe) {
      if (unit.kind !== 'defender') {
        for (const other of this.units) {
          if (!this.troopAlive(other) || other.kind !== 'defender') continue;
          const dz = unit.z - other.z;
          const dx = unit.x - other.x;
          if (dz > 0 && dz < 3.2 && Math.abs(dx) < 1.45) {
            unit._slow = 0.04;
            unit.x += Math.sign(dx || (unit.x >= 0 ? 1 : -1)) * 2.4 * dt;
            break;
          }
        }
      }
      return;
    }
    const dx = foe.x - unit.x;
    const closing = unit.kind === 'defender' ? foe.z - unit.z : unit.z - foe.z;
    unit.x += THREE.MathUtils.clamp(dx, -1, 1) * (unit.kind === 'defender' ? 2.5 : 3.6) * dt;
    if (unit.kind === 'defender') {
      const press = this.difficulty?.id === 'hard' ? 1.28 : this.difficulty?.id === 'easy' ? 0.82 : 1;
      if (closing > 0.45 && closing < 12) unit._step = 2.3 * press;
    } else if (closing < 5.5 && Math.abs(dx) > 1.05) unit._slow = 0.72;
    else if (closing < 2.2) unit._slow = 0.4;
  }

  separateTroops() {
    const troops = [];
    for (const unit of this.units) {
      if (this.troopAlive(unit)) troops.push(unit);
    }
    for (let i = 0; i < troops.length; i += 1) {
      for (let j = i + 1; j < troops.length; j += 1) {
        const a = troops[i];
        const b = troops[j];
        if (a.duel === b) continue;
        let dx = a.x - b.x;
        let dz = a.z - b.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.9 || dist < 0.0001) continue;
        const push = (0.9 - dist) * 0.45;
        dx /= dist;
        dz /= dist;
        a.x += dx * push;
        a.z += dz * push;
        b.x -= dx * push;
        b.z -= dz * push;
      }
    }
  }

  exchange(a, b) {
    if (!this.troopAlive(a) || !this.troopAlive(b)) return;
    const attacker = Math.random() < 0.56 ? a : b;
    const victim = attacker === a ? b : a;
    attacker.attackT = 0.32;
    victim.stagger = 0.24;
    this.clashSpark((a.x + b.x) * 0.5, (a.z + b.z) * 0.5, attacker.kind === 'defender' ? this.world.enemy : this.world.accent);
    const foeHit = attacker.kind === 'defender';
    this.strike(victim, 1, { foe: foeHit, role: foeHit ? null : 'soldier' });
    if (Math.random() < 0.4) {
      this.sfx.blip?.({ freq: 150 + Math.random() * 70, dur: 0.05, type: 'square', vol: 0.03, slide: -24 });
    }
  }

  strike(unit, amount, meta = {}) {
    if (!this.troopAlive(unit)) return;
    let dealt = amount;
    if (unit.kind === 'player' && meta.foe) {
      if (this.playerGrace > 0) return;
      dealt *= this.difficulty?.foeDamage || 1;
      this.playerGrace = this.difficulty?.grace || 0;
    }
    unit.hp -= dealt;
    unit.stagger = Math.max(unit.stagger || 0, 0.16);
    if (unit.hp > 0) return;
    this.knockOut(unit, meta);
  }

  knockOut(unit, meta = {}) {
    if (!unit || unit.down || !this.isTroop(unit)) return;
    unit.down = true;
    unit.downT = 0;
    unit.speed = 0;
    this.breakDuel(unit);
    if (!unit.stars) unit.stars = this.attachStars(unit.mesh);
    unit.stars.visible = true;
    const foe = unit.kind === 'defender';
    if (foe) {
      this.hold = Math.max(0, this.hold - 0.85);
      this.capture = Math.min(100, this.capture + 1);
      this.addBattleScore(10);
      if (meta.role) this.creditRole(meta.role);
    } else if (unit.kind === 'player' && (this.difficulty?.lives || 0) > 0) {
      this.livesLeft -= 1;
      if (this.livesLeft <= 0) {
        this.playerOut = true;
        this.flashDeploy(T.groundLivesOut);
      }
    } else if (unit.kind !== 'player') {
      this.hold = Math.min(100, this.hold + 0.4);
      this.capture = Math.max(0, this.capture - 0.25);
    }
    this.splash(unit.x, unit.z, foe ? this.world.enemy : this.world.accent, 2.1);
    this.sfx.blip?.({ freq: foe ? 92 : 120, dur: 0.08, type: 'triangle', vol: 0.05, slide: -46 });
  }

  attachStars(mesh) {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i += 1) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), material);
      const angle = (i / 3) * Math.PI * 2;
      star.position.set(Math.cos(angle) * 0.32, 0, Math.sin(angle) * 0.32);
      group.add(star);
    }
    group.position.y = 1.15;
    mesh.add(group);
    return group;
  }

  updateDowned(unit, dt) {
    unit.downT += dt;
    const flop = Math.min(1, unit.downT / 0.32);
    const yaw = unit.mesh.rotation.y;
    unit.mesh.rotation.set(-1.4 * flop, yaw, Math.sin(unit.downT * 10) * (1 - flop) * 0.55);
    const hop = Math.sin(Math.min(1, unit.downT) * Math.PI) * 0.42;
    unit.mesh.position.set(unit.x, Math.max(0.02, (1 - flop) * 0.3 + hop), unit.z);
    unit.mesh.scale.setScalar(unit.kind === 'player' ? 2.8 : 2.5);
    if (unit.stars) {
      unit.stars.visible = unit.downT < 4.2;
      unit.stars.rotation.y += dt * 5.5;
      unit.stars.position.y = 1.02 + Math.sin(unit.age * 8) * 0.06;
      const fade = unit.downT > 1.4 ? Math.max(0, 1 - (unit.downT - 1.4) / 1.1) : 1;
      for (const star of unit.stars.children) star.material.opacity = fade;
    }
    if (unit.kind === 'player' && unit.downT > 1.15 && !this.playerOut) {
      unit.down = false;
      unit.hp = this.playerMaxHp();
      unit.downT = 0;
      unit.stagger = 0;
      unit.mesh.rotation.x = 0;
      unit.mesh.rotation.z = 0;
      if (unit.stars) unit.stars.visible = false;
    }
  }

  hurtSoldiers(x, z, radius, team, damage = 1, role = null) {
    const foeScale = team === 'foe' ? (this.difficulty?.playerHit || 1) : 1;
    let best = null;
    let bestD = radius * Math.max(1, foeScale);
    for (const unit of this.units) {
      if (!this.troopAlive(unit)) continue;
      if (team === 'friend' && unit.kind !== 'defender') continue;
      if (team === 'foe' && unit.kind === 'defender') continue;
      if (!this.reaches(unit, x, z, radius)) continue;
      const dist = Math.hypot(unit.x - x, unit.z - z);
      if (dist < bestD) {
        best = unit;
        bestD = dist;
      }
    }
    if (best) {
      this.strike(best, damage, { foe: team === 'foe', role: team === 'friend' ? role : null });
      if (this.mode === 'boss' && team === 'foe') this.voiceLine('foe', 'hit');
    }
  }

  blastSoldiers(x, z, radius, team, role = 'soldier') {
    for (const unit of this.units) {
      if (!this.troopAlive(unit)) continue;
      if (team === 'friend' && unit.kind !== 'defender') continue;
      if (team === 'foe' && unit.kind === 'defender') continue;
      if (!this.reaches(unit, x, z, radius)) continue;
      this.strike(unit, 6, { foe: team === 'foe', role: team === 'friend' ? role : null });
      this.clashSpark(unit.x, unit.z, 0xffd27a);
    }
  }

  hurtSoldiersArea(x, z, radius, team, amount, role = null) {
    for (const unit of this.units) {
      if (!this.troopAlive(unit)) continue;
      if (team === 'friend' && unit.kind !== 'defender') continue;
      if (team === 'foe' && unit.kind === 'defender') continue;
      if (!this.reaches(unit, x, z, radius)) continue;
      this.strike(unit, amount, { foe: team === 'foe', role: team === 'friend' ? role : null });
    }
  }

  clashSpark(x, z, color) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.38, 14),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.35, z);
    this.root.add(ring);
    this.bits.push({ mesh: ring, life: 0.28, max: 0.28, grow: 1.4 });
    for (let i = 0; i < 3; i += 1) {
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat(color, color, 0.8));
      bit.position.set(x, 0.9, z);
      this.root.add(bit);
      this.bits.push({
        mesh: bit,
        life: 0.32,
        max: 0.32,
        grow: 0,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3.5, 2.2 + Math.random() * 1.6, (Math.random() - 0.5) * 3.5),
      });
    }
  }

  rollThrough(unit) {
    const reach = unit.kind === 'destroyer' ? DESTROYER_ROLL : unit.kind === 'tank' ? 2.05 : 0;
    if (!reach) return;
    for (const foe of this.units) {
      if (!this.troopAlive(foe) || foe.kind !== 'defender') continue;
      if (Math.hypot(foe.x - unit.x, foe.z - unit.z) > reach) continue;
      if (!foe._bumps) foe._bumps = [];
      if (foe._bumps.includes(unit)) continue;
      foe._bumps.push(unit);
      foe.x += Math.sign(foe.x - unit.x || (foe.x >= 0 ? 1 : -1)) * 0.45;
      foe.z -= 0.55;
      foe.stagger = 0.28;
      this.clashSpark(foe.x, foe.z, unit.kind === 'destroyer' ? 0x7af6ee : 0xffd56a);
      this.strike(foe, unit.kind === 'destroyer' ? 2 : 1, {
        role: unit.kind === 'destroyer' ? 'destroyer' : 'tank',
      });
    }
    this.bumpBoss(unit);
  }

  fireTank(unit) {
    const aim = unit._aim;
    const from = new THREE.Vector3(unit.mesh.position.x, 1.45, unit.mesh.position.z - 1.1);
    if (aim?.kind === 'armor' && aim.unit && !aim.unit.wrecked) {
      this.launchShell({
        from,
        to: new THREE.Vector3(aim.unit.x, 0.8, aim.unit.z),
        color: 0xffd56a,
        radius: 0.32,
        dur: 0.36,
        holdHit: 0.45,
        splash: 4.2,
        arc: 0.7,
        silentTubes: true,
        team: 'friend',
        soldierHit: 1.6,
        troopDamage: 1,
        vehicleHit: 4.6,
        vehicleRadius: 2.8,
        role: 'tank',
      });
    } else if (aim?.kind === 'wall') {
      this.launchShell({
        from,
        to: new THREE.Vector3(aim.x, 0.55, aim.z),
        color: 0xffd56a,
        radius: 0.3,
        dur: 0.38,
        holdHit: 0.2,
        splash: 3.6,
        arc: 1.05,
        silentTubes: true,
        team: 'friend',
        role: 'tank',
      });
    } else {
      const foe = aim?.unit && this.troopAlive(aim.unit) ? aim.unit : this.nearestEnemy(unit, 26);
      this.launchShell({
        from,
        to: this.bossTarget(foe
          ? new THREE.Vector3(foe.x, 0.7, foe.z)
          : new THREE.Vector3(unit.x + (Math.random() - 0.5) * 3, 0.45, unit.z - 12)),
        color: 0xffd56a,
        radius: 0.28,
        dur: 0.4,
        holdHit: 0.32,
        splash: 3.4,
        arc: 1.15,
        silentTubes: true,
        team: 'friend',
        soldierHit: 2.6,
        troopDamage: 3,
        role: 'tank',
      });
    }
    if (Math.random() < 0.5) {
      this.sfx.blip?.({ freq: 180, dur: 0.07, type: 'square', vol: 0.04, slide: -50 });
    }
  }

  updateUnits(dt) {
    const fallingBack = this.outcome === 'retreat';
    this.separateTroops();
    for (const unit of this.units) {
      if (unit.delay > 0) {
        unit.delay -= dt;
        unit.mesh.visible = false;
        continue;
      }
      unit.mesh.visible = true;
      unit.age += dt;
      if (unit.wrecked) {
        unit.wreckT += dt;
        const sink = Math.min(0.45, unit.wreckT * 0.18);
        unit.mesh.position.set(unit.x, Math.max(-0.15, 0.2 - sink), unit.z);
        unit.mesh.rotation.z = unit.kind === 'foeCar' ? 0.55 : -0.4;
        unit.mesh.scale.setScalar(unit.kind === 'tank' ? 1.25 : 1.15);
        continue;
      }
      if (unit.stagger > 0) unit.stagger -= dt;
      if (unit.down) {
        if (unit.kind === 'boss') this.updateBossDown(unit, dt);
        else this.updateDowned(unit, dt);
        continue;
      }
      this.steerTroop(unit, dt);
      if (unit.kind === 'tank') this.steerTank(unit, dt);
      if (unit.kind === 'destroyer') this.steerDestroyer(unit, dt);
      if (unit.kind === 'foeCar') this.steerFoeCar(unit, dt);
      const intro = Math.min(1, unit.age / (unit.special ? 0.7 : 0.4));
      const pop = unit.kind === 'boss' ? 3.35 : unit.kind === 'player' ? 2.8 : unit.kind === 'destroyer' ? DESTROYER_POP : unit.special ? 2.5 : unit.kind === 'tank' ? 1.25 : (unit.kind === 'gunCar' || unit.kind === 'foeCar') ? 1.15 : unit.kind === 'artillery' ? 1.15 : (unit.kind === 'infantry' || unit.kind === 'defender') ? 2.5 : 0.85;
      unit.mesh.scale.setScalar(pop * (0.2 + 0.8 * intro) * (unit.stagger > 0.1 ? 1.08 : 1));
      if (unit.kind !== 'player' && fallingBack && unit.kind !== 'artillery') unit.z += 11 * dt;
      else if (unit.kind !== 'player' && this.phase !== 'resolve') {
        if (unit.duel && unit.kind !== 'player') {
          const foe = unit.duel;
          const dx = foe.x - unit.x;
          const dz = foe.z - unit.z;
          const dist = Math.hypot(dx, dz) || 1;
          const push = (dist - 1.9) * 2.6;
          unit.x += (dx / dist) * push * dt;
          unit.z += (dz / dist) * push * dt;
        } else if (unit.kind === 'defender') {
          unit.z += (unit._step || 0) * dt;
          if (this.capture > 82 && this.hold < 18) unit.z += 6.5 * dt;
        } else unit.z -= unit.speed * (unit._slow ?? 1) * dt;
      }
      if (unit.kind === 'foeCar' && !fallingBack) unit.z = Math.min(unit.z, -6.5);
      unit.z = THREE.MathUtils.clamp(unit.z, -50, 22);
      if (unit.kind === 'boss' && !fallingBack) {
        unit.z = Math.min(unit.z, -6.2);
        unit.x = Math.sin(unit.age * 0.65) * 2.8;
        unit.mesh.rotation.y = 0;
      }
      if (this.isTroop(unit)) unit.x = THREE.MathUtils.clamp(unit.x, -18, 18);
      const yBob = Math.sin(unit.age * ((unit.kind === 'infantry' || unit.kind === 'defender') ? 10 : 4)) * unit.bob;
      const drop = unit.special ? (1 - intro) * 14 : (1 - intro) * 0.8;
      const hop = unit.duel ? Math.abs(Math.sin(unit.age * 16)) * 0.14 : 0;
      unit.mesh.position.set(unit.x + this.lane * unit.laneFollow, yBob + drop + hop, unit.z);
      if (unit.kind === 'tank' && unit._aim) faceNegZ(unit.mesh, unit._aim.x, unit._aim.z);
      if (this.isTroop(unit)) {
        const focus = unit.duel || unit.focus;
        if (focus && !focus.down) faceNegZ(unit.mesh, focus.x, focus.z);
        else {
          const ahead = unit.kind === 'defender' || (fallingBack && unit.kind !== 'player') ? 1 : -1;
          faceNegZ(unit.mesh, unit.x, unit.z + ahead);
        }
      }
      const swing = unit.mesh.userData.swing;
      const flash = unit.mesh.userData.flash;
      if (flash) flash.material.opacity = Math.max(0, flash.material.opacity - dt * 5);
      const wisp = unit.mesh.userData.wisp;
      if (wisp) {
        const pulse = 0.75 + Math.sin(unit.age * 6) * 0.25;
        wisp.scale.setScalar(pulse);
        wisp.position.y = 2.15 + Math.sin(unit.age * 3) * 0.08;
      }
      if ((unit.kind === 'wisp' || unit.kind === 'lighthouse') && unit.mesh.userData.lamp) {
        const pulse = 0.82 + Math.sin(unit.age * 3.2) * 0.18;
        unit.mesh.userData.lamp.scale.setScalar(pulse);
      }
      const car = unit.kind === 'gunCar' || unit.kind === 'foeCar';
      if (car && this.outcome !== 'retreat' && unit.age > 0.3) {
        unit.shotCd -= dt;
        if (unit.shotCd <= 0) {
          const gun = CAR_GUNS[unit.gun] || CAR_GUNS.machine;
          const pace = unit.kind === 'foeCar' ? this.difficulty.cadence : 1;
          unit.shotCd = (gun.cd + (Math.abs(unit.x) % 0.12)) * pace;
          this.fireCar(unit);
        }
        const turret = unit.mesh.userData.turret;
        if (turret) turret.rotation.x = THREE.MathUtils.damp(turret.rotation.x, 0, 8, dt);
        const wheels = unit.mesh.userData.wheels;
        if (wheels && Math.abs(unit.speed) > 0.4) {
          for (const wheel of wheels) wheel.rotation.x += unit.speed * dt * 1.6;
        }
      }
      if (unit.kind === 'tank' && this.outcome !== 'retreat' && unit.age > 0.35) {
        unit.shotCd -= dt;
        if (unit.shotCd <= 0) {
          const aimingArmor = unit._aim?.kind === 'armor';
          unit.shotCd = aimingArmor ? 0.95 : 1.15;
          this.fireTank(unit);
        }
        this.rollThrough(unit);
      }
      if (unit.kind === 'destroyer' && this.outcome !== 'retreat' && unit.age > 0.55) this.rollThrough(unit);
      const dueling = Boolean(unit.duel) && this.troopAlive(unit.duel);
      if (dueling && unit.kind !== 'defender' && this.outcome !== 'retreat') {
        unit.meleeCd -= dt;
        if (unit.meleeCd <= 0 && unit.duel && !unit.duel.down) {
          unit.meleeCd = 0.64;
          this.exchange(unit, unit.duel);
        }
      } else if ((unit.kind === 'infantry' || unit.kind === 'defender') && !unit.duel && this.outcome !== 'retreat' && unit.age > 0.25) {
        const focus = unit.focus;
        const dist = focus ? Math.hypot(unit.x - focus.x, unit.z - focus.z) : 99;
        if (dist > 6.5) {
          unit.shotCd -= dt;
          if (unit.shotCd <= 0) {
            const pace = unit.kind === 'defender' ? this.difficulty.cadence : 1;
            unit.shotCd = ((unit.kind === 'defender' ? 1.55 : 0.9) + (Math.abs(unit.x) % 0.35)) * pace;
            unit.attackT = 0.34;
            this.fireRifle(unit);
          }
        }
      }
      if (unit.attackT > 0) unit.attackT -= dt;
      if (swing) {
        const moving = !unit.duel && this.phase !== 'resolve' && (Math.abs(unit.speed) > 0.4 || (unit._step || 0) > 0.2);
        const attacking = unit.attackT > 0 && !unit.duel;
        const step = Math.sin(unit.age * (moving ? 9 : 1.7) + unit.x);
        const melee = Boolean(unit.duel);
        const carry = attacking ? 1.32 : 1.08;
        if (melee) {
          const sw = Math.sin(unit.age * 16 + unit.x);
          swing.legL.rotation.x = 0.28;
          swing.legR.rotation.x = -0.12;
          swing.armR.rotation.set(0.72, 0.2, sw * 0.9);
          swing.armL.rotation.set(0.48, 0.2, 0.28 - sw * 0.3);
          if (swing.rifle) swing.rifle.rotation.x = 0.12;
        } else {
          const bob = moving ? step * 0.1 : 0;
          const legAmp = moving ? 0.95 : 0.05;
          swing.legL.rotation.x = step * legAmp;
          swing.legR.rotation.x = -step * legAmp;
          swing.armR.rotation.set(carry + bob, 0.18, -0.18);
          swing.armL.rotation.set(Math.max(0.35, carry - 0.22 - bob), 0.55, 0.72);
          if (swing.rifle) swing.rifle.rotation.x = attacking ? -0.1 : 0.02;
        }
        if (swing.chest) {
          swing.chest.rotation.x = unit.stagger > 0 ? -0.42 : melee ? 0.3 : 0;
          swing.chest.position.y = swing.chest.userData.baseY + Math.sin(unit.age * 1.7) * (moving ? 0.012 : 0.028);
        }
      }
      if (unit.kind === 'infantry' && unit.z < -32 && !unit.scored && !fallingBack && !unit.down) {
        unit.scored = true;
        this.capture = Math.min(100, this.capture + 3.5);
        this.addBattleScore(8);
        this.creditRole('soldier');
      }
      if (unit.kind === 'destroyer' && !unit.boomed && unit.age >= 0.62 && !fallingBack) {
        unit.boomed = true;
        this.splash(unit.mesh.position.x, unit.mesh.position.z, 0x1ad4c8, 13.6);
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
      const nose = unit.kind === 'destroyer' ? DESTROYER_NOSE : 1.5;
      if (unit.z > block.z + nose) continue;
      const reach = unit.kind === 'destroyer' ? DESTROYER_REACH : 3.4;
      if (Math.abs(x - block.x) > reach) continue;
      block.popped = true;
      this.splash(block.x, block.z, unit.kind === 'destroyer' ? 0x1ad4c8 : this.world.enemy, unit.kind === 'destroyer' ? 12 : 9);
      this.root.remove(block.mesh);
      this.hold = Math.max(0, this.hold - (unit.kind === 'destroyer' ? 10 : 6));
      this.capture = Math.min(100, this.capture + 4);
      if (unit.kind === 'tank' || unit.kind === 'destroyer' || unit.kind === 'gunCar') {
        this.addBattleScore(unit.kind === 'destroyer' ? 20 : 15);
        this.creditRole(unit.kind === 'destroyer' ? 'destroyer' : 'tank');
      }
      this.shake = Math.min(1, this.shake + 0.28);
    }
  }

  splash(x, z, color, grow, bits = 5) {
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
    for (let i = 0; i < bits; i += 1) {
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

  bossUnit() {
    return this.units.find((unit) => unit.kind === 'boss') || null;
  }

  /** Aim some friendly shots at the commander so the army visibly fights him. */
  bossTarget(fallback, chance = 0.75) {
    const boss = this.bossUnit();
    if (this.mode !== 'boss' || !boss || boss.down || Math.random() > chance) return fallback;
    return new THREE.Vector3(
      boss.x + (Math.random() - 0.5) * 1.8,
      1.6,
      boss.z + (Math.random() - 0.5) * 1.2,
    );
  }

  voiceLine(side, cue) {
    const lines = T.voiceLines?.[side];
    const text = lines?.[cue];
    if (!text) return;
    if (cue === 'hit') {
      if (this.voiceClock < (this.voiceNext[side] || 0)) return;
      this.voiceNext[side] = this.voiceClock + 1.15;
    } else {
      const key = `${side}:${cue}`;
      if (this.voiceOnce[key]) return;
      this.voiceOnce[key] = true;
    }
    const who = side === 'foe' ? T.voiceFoe : T.voiceFriend;
    this.bark = `${who}: ${text}`;
    this.barkSide = side;
    this.barkT = cue === 'hit' ? 1.15 : 1.7;
    this.sfx.voiceCue?.(side, cue);
  }

  splashHitsBoss(shell) {
    const boss = this.bossUnit();
    if (!boss || boss.down) return;
    const dist = Math.hypot(shell.to.x - boss.x, shell.to.z - boss.z);
    if (dist > 6.4) return;
    const raw = shell.soldierHit > 0 ? shell.soldierHit : (shell.splash > 5 ? 2.2 : 1.15);
    this.hurtBoss(raw);
  }

  hurtBoss(amount) {
    const boss = this.bossUnit();
    if (!boss || boss.down || this.phase === 'resolve') return false;
    if (this.bossHitCd > 0) return false;
    this.bossHitCd = BOSS_HIT_GAP;
    const scale = 1 + (this.perks.banner || 0) * 0.15;
    const chunk = THREE.MathUtils.clamp(amount * 2.2, 3, 11) * scale;
    boss.hp -= chunk;
    this.voiceLine('friend', 'hit');
    this.shake = Math.min(0.8, this.shake + 0.16);
    if (boss.hp > 0) return true;
    this.defeatBoss(boss);
    return true;
  }

  defeatBoss(boss) {
    boss.hp = 0;
    boss.down = true;
    boss.downT = 0;
    boss.speed = 0;
    if (!boss.stars) boss.stars = this.attachStars(boss.mesh);
    boss.stars.visible = true;
    boss.stars.scale.setScalar(1.8);
    this.voiceLine('friend', 'defeat');
    this.pendingVoices.push({ side: 'foe', cue: 'defeat', at: 0.85 });
    this.splash(boss.x, boss.z, this.world.glow, 14);
    this.shake = 1.2;
    this.sfx.bigBoom?.();
    this.beginPhase('resolve');
  }

  bumpBoss(unit) {
    if (this.mode !== 'boss') return;
    const reach = unit.kind === 'destroyer' ? 5.2 : unit.kind === 'tank' ? 3.3 : 0;
    if (!reach) return;
    const boss = this.bossUnit();
    if (!boss || boss.down) return;
    if (Math.hypot(boss.x - unit.x, boss.z - unit.z) > reach) return;
    this.hurtBoss(unit.kind === 'destroyer' ? 5.5 : 3.4);
  }

  updateBoss(dt) {
    const unit = this.bossUnit();
    if (!unit || !unit.mesh.visible || unit.down || unit.delay > 0) return;
    if (this.phase === 'resolve' || this.outcome === 'retreat') return;
    unit.shotCd -= dt;
    if (unit.shotCd > 0) return;
    unit.shotCd = 1.4 * (this.difficulty?.cadence || 1);
    this.fireBoss(unit);
  }

  fireBoss(unit) {
    let target = this.playerUnit();
    if (!target || target.down) {
      target = this.units.find((other) => (other.kind === 'infantry' || other.kind === 'player') && !other.down) || null;
    }
    const tx = target ? target.x : (Math.random() - 0.5) * 8;
    const tz = target ? target.z : 4;
    this.launchShell({
      from: new THREE.Vector3(unit.x, 3.1, unit.z + 1.1),
      to: new THREE.Vector3(tx + (Math.random() - 0.5) * 1.4, 1.05, tz),
      color: this.world.enemy,
      radius: 0.42,
      dur: 0.55,
      holdHit: 0,
      splash: 3.2,
      arc: 2.2,
      silentTubes: true,
      team: 'foe',
      soldierHit: 2.6,
      troopDamage: 1,
    });
    this.sfx.enemyShot?.();
  }

  updateBossDown(unit, dt) {
    unit.downT += dt;
    const flop = Math.min(1, unit.downT / 0.45);
    unit.mesh.rotation.x = -1.15 * flop;
    unit.mesh.position.set(unit.x, 0.35 * (1 - flop), unit.z);
    unit.mesh.scale.setScalar(3.35);
    if (unit.stars) {
      unit.stars.visible = true;
      unit.stars.rotation.y += dt * 4.2;
      unit.stars.position.y = 2.2;
    }
  }

  updateCamera(dt) {
    const aims = {
      artillery: { pos: [0, 42, 62], look: [0, 1.2, -18] },
      armor: { pos: [10, 38, 56], look: [0, 1.4, -16] },
      infantry: { pos: [0, 36, 52], look: [0, 1.2, -16] },
      special: { pos: [-14, 44, 64], look: [0, 2.2, -14] },
      resolve: { pos: [0, 48, 70], look: [0, 2, -18] },
    };
    const player = this.playerUnit();
    let aim = aims[this.phase] || aims.artillery;
    const spotOf = (unit) => unit?.mesh?.position;
    if (player && player.mesh.visible && this.phase !== 'resolve') {
      const spot = spotOf(player);
      if (this.aiming) {
        // Aim window is only a gentle push-in. It still covers most of the valley.
        aim = {
          pos: [spot.x * 0.28, 36, spot.z + 48],
          look: [spot.x * 0.18, 1.5, spot.z - 28],
        };
      } else {
        aim = {
          pos: [spot.x * 0.22, 40, spot.z + 54],
          look: [spot.x * 0.12, 1.2, spot.z - 30],
        };
      }
    }
    if (this.mode === 'boss' && this.phase !== 'resolve' && !this.aiming) {
      const boss = this.bossUnit();
      const spot = player && player.mesh.visible ? player.mesh.position : null;
      const sx = spot ? spot.x : 0;
      const sz = spot ? spot.z : 4;
      aim = {
        pos: [sx * 0.2, 38, sz + 50],
        look: [boss ? boss.x : sx * 0.1, 2.2, boss ? boss.z : -16],
      };
    }
    if (this.phase === 'special' && !this.aiming) {
      const hero = this.units.find((unit) => unit.kind === 'destroyer' && unit.mesh.visible);
      if (hero) {
        const spot = spotOf(hero);
        aim = {
          pos: [spot.x - 18, 36, spot.z + 42],
          look: [spot.x + 2, 2.4, spot.z - 22],
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
    const fov = this.aiming ? 74 : 78;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-2.4 * dt));
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(this.look);
  }

  goalNote() {
    const hold = Math.max(0, Math.round(this.hold));
    const capture = Math.min(100, Math.round(this.capture));
    if (this.mode !== 'boss' && this.wave >= 5 && this.phase !== 'resolve') {
      const left = this.waveSquad.filter((unit) => !unit.down && !unit.wrecked).length;
      const last = this.wave === STAGE_WAVES ? T.groundLastWave : T.groundGoalWave;
      return `${last} · ${left}`;
    }
    if (this.phase === 'artillery') return `${T.groundGoalArtillery} · ${hold}`;
    if (this.phase === 'armor') return `${T.groundGoalArmor} · ${this.barricadesPopped()}/4`;
    if (this.phase === 'infantry') return `${T.groundGoalInfantry} · ${capture}`;
    if (this.phase === 'special') return T.groundGoalSpecial;
    if (this.phase === 'boss') return T.bossNote;
    if (this.phase === 'resolve') {
      if (this.outcome === 'retreat') return T.groundRetreatNote;
      if (this.mode === 'boss') return T.bossWinNote;
      const streak = this.bestStreak >= 2 ? `${T.groundStreak} ×${this.bestStreak}` : '';
      const stage = this.wave >= STAGE_WAVES ? T.groundStageClear : '';
      const gold = this.gold ? `${T.groundGold} · ${T.groundGoldWait}` : '';
      return [T.groundWinNote, stage, `${T.groundScore} ${this.score}`, streak, gold].filter(Boolean).join(' · ');
    }
    return '';
  }

  phaseLabel() {
    if (this.phase === 'resolve') return this.outcome === 'retreat' ? T.groundRetreat : T.groundWin;
    return {
      artillery: T.groundArtillery,
      armor: T.groundArmor,
      infantry: T.groundInfantry,
      special: T.groundSpecial,
      boss: T.bossPhase,
    }[this.phase] || '';
  }

  syncHud() {
    const { dom, world } = this;
    if (!dom.phase) return;
    const bossFight = this.mode === 'boss' && this.phase === 'boss';
    dom.world.textContent = this.mode === 'boss' ? `${T.bossName} · ${world.name}` : world.name;
    const waveTag = this.mode === 'boss' ? '' : `${T.wave} ${Math.max(1, this.wave)} ${T.groundWaveOf} · `;
    dom.phase.textContent = this.phase === 'boss'
      ? `${T.bossPhase} · ${T.bossName}`
      : this.phase === 'special'
        ? `${waveTag}${T.groundSpecial} · ${T.groundDestroyer}`
        : `${waveTag}${this.phaseLabel()}`;
    if (bossFight) {
      const boss = this.bossUnit();
      const ratio = boss && boss.maxHp ? Math.max(0, boss.hp) / boss.maxHp : 0;
      if (dom.hold) dom.hold.style.width = `${ratio * 100}%`;
      if (dom.capture) dom.capture.style.width = `${(1 - ratio) * 100}%`;
      if (dom.holdLabel) dom.holdLabel.textContent = T.bossHp;
      if (dom.captureLabel) dom.captureLabel.textContent = T.bossHits;
    } else {
      if (dom.hold) dom.hold.style.width = `${Math.max(0, this.hold)}%`;
      if (dom.capture) dom.capture.style.width = `${Math.min(100, this.capture)}%`;
      if (dom.holdLabel) dom.holdLabel.textContent = T.groundHold;
      if (dom.captureLabel) dom.captureLabel.textContent = T.groundCapture;
    }
    if (dom.march) dom.march.textContent = this.marchLabel || '';
    if (dom.bark) {
      dom.bark.hidden = this.barkT <= 0;
      dom.bark.dataset.side = this.barkSide || '';
      dom.bark.textContent = this.barkT > 0 ? this.bark : '';
    }
    if (dom.score) {
      const streak = this.streak > 1 ? ` · ${T.groundStreak} ×${this.streak}` : '';
      const lives = (this.difficulty?.lives || 0) > 0
        ? ` · ${T.groundLives} ${Math.max(0, this.livesLeft)}`
        : '';
      const force = this.fullForce ? ` · ${T.groundFullForceShort}` : '';
      dom.score.textContent = `${T.groundScore} ${this.score}${streak}${lives}${force}`;
    }
    if (dom.stars) {
      if (bossFight) dom.stars.textContent = '';
      else {
        const mark = (on) => (on ? '★' : '☆');
        dom.stars.textContent = `${T.groundTank} ${mark(this.stars?.tank)}   ${T.groundSoldier} ${mark(this.stars?.soldier)}   ${T.groundDeployDestroyer} ${mark(this.stars?.destroyer)}`;
      }
    }
    if (dom.note) {
      dom.note.textContent = this.deployNoteT > 0 ? this.deployNote : this.goalNote();
    }
    const locked = !this.active || this.phase === 'resolve';
    if (dom.soldierBtn) dom.soldierBtn.disabled = locked || this.deployCd.infantry > 0 || this.countKind('infantry') >= 88;
    if (dom.tankBtn) dom.tankBtn.disabled = locked || this.deployCd.tank > 0 || this.countKind('tank') >= 12;
    if (dom.destroyerBtn) dom.destroyerBtn.disabled = locked || this.deployCd.destroyer > 0 || this.countKind('destroyer') >= 3;
    if (dom.salvoBtn) dom.salvoBtn.disabled = locked || this.salvoCd > 0 || this.readyDestroyers().length === 0;
  }
}
