import * as THREE from 'three';

const geos = new Map();

function geo(key, build) {
  if (!geos.has(key)) geos.set(key, build());
  return geos.get(key);
}

function box(w, h, d) {
  return geo(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}

function cyl(rt, rb, h, n = 12) {
  return geo(`cyl:${rt}:${rb}:${h}:${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
}

export function makeStandard(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.42,
    roughness: 0.46,
    emissive: extras.emissive ?? 0x000000,
    emissiveIntensity: extras.emissiveIntensity ?? 0.25,
    ...extras,
  });
}

export function captureMaterials(root) {
  const mats = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.emissive) {
      mats.push({
        mat: obj.material,
        em: obj.material.emissive.clone(),
        intensity: obj.material.emissiveIntensity,
      });
    }
  });
  return mats;
}

export function flashMaterials(mats) {
  for (const entry of mats) {
    entry.mat.emissive.setHex(0xffffff);
    entry.mat.emissiveIntensity = 1;
  }
}

export function restoreMaterials(mats) {
  for (const entry of mats) {
    entry.mat.emissive.copy(entry.em);
    entry.mat.emissiveIntensity = entry.intensity;
  }
}

export function attachHealthBar(parent, y) {
  const group = new THREE.Group();
  group.position.y = y;
  const bg = new THREE.Mesh(
    geo('bar-bg', () => new THREE.PlaneGeometry(2.1, 0.18)),
    new THREE.MeshBasicMaterial({
      color: 0x14080c,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const fgMat = new THREE.MeshBasicMaterial({
    color: 0x5ee08a,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fg = new THREE.Mesh(geo('bar-fg', () => new THREE.PlaneGeometry(2, 0.1)), fgMat);
  fg.position.z = 0.02;
  group.add(bg, fg);
  group.visible = false;
  parent.add(group);
  return { group, fg, fgMat };
}

function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/**
 * Shomeret (playerShip) — plow-jaw guardian freighter.
 * Wide white plow, an open cargo jaw (port prong longer), a centered
 * bridge, a green cargo train, unequal twin tails, and three rear bells.
 * The nose points down local -Z. Game.js scales the mesh by PLAYER.visualScale.
 * Original silhouette: not a sleek fighter and not the old side-drum tug.
 */
export function createPlayerShip(softMap) {
  const root = new THREE.Group();
  root.name = 'playerShip';

  const turquoise = makeStandard(0x1ad4c8, { emissive: 0x084240, emissiveIntensity: 0.42, roughness: 0.38 });
  const white = makeStandard(0xffffff, { emissive: 0xc5ccd2, emissiveIntensity: 0.55, roughness: 0.32 });
  const blue = makeStandard(0x2f6dff, { emissive: 0x10215f, emissiveIntensity: 0.38, roughness: 0.4 });
  const green = makeStandard(0x2fce55, { emissive: 0x0d3d1a, emissiveIntensity: 0.38, roughness: 0.42 });
  const red = makeStandard(0xe4313a, { emissive: 0x5a1218, emissiveIntensity: 0.36, roughness: 0.4 });
  const dark = makeStandard(0x1b2430, { emissive: 0x05070c, metalness: 0.7, roughness: 0.35 });
  const glass = makeStandard(0xb9dcff, {
    emissive: 0x1a4ea8,
    emissiveIntensity: 0.75,
    metalness: 0.85,
    roughness: 0.12,
  });
  const glowMat = (color, opacity) => new THREE.SpriteMaterial({
    map: softMap,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  addMesh(root, box(1.15, 0.42, 3.35), turquoise, 0, -0.08, 0.15);
  addMesh(root, box(0.85, 0.22, 2.4), turquoise, 0, 0.22, 0.35);

  const plow = addMesh(root, box(3.15, 0.2, 0.72), white, 0, 0.02, -1.55);
  plow.rotation.x = -0.2;
  addMesh(root, box(0.22, 0.48, 0.62), white, -1.48, 0.08, -1.42);
  addMesh(root, box(0.22, 0.42, 0.55), white, 1.48, 0.04, -1.32);
  const chevL = addMesh(root, box(0.78, 0.05, 0.12), red, -0.48, 0.16, -1.72);
  chevL.rotation.y = 0.55;
  const chevR = addMesh(root, box(0.78, 0.05, 0.12), red, 0.48, 0.16, -1.72);
  chevR.rotation.y = -0.55;

  const jawL = addMesh(root, box(0.28, 0.32, 1.7), blue, -0.62, -0.2, -2.05);
  jawL.rotation.y = 0.07;
  const jawR = addMesh(root, box(0.26, 0.28, 1.28), turquoise, 0.66, -0.24, -1.82);
  jawR.rotation.y = -0.1;
  addMesh(root, box(0.32, 0.1, 0.2), white, -0.66, -0.2, -2.82);
  addMesh(root, box(0.3, 0.1, 0.18), red, 0.7, -0.24, -2.4);
  const ram = addMesh(root, box(0.28, 0.2, 0.85), turquoise, 0, -0.32, -2.05);
  ram.rotation.x = 0.18;

  addMesh(root, box(0.1, 0.06, 3.5), red, 0, 0.36, 0.2);

  addMesh(root, box(1.15, 0.42, 0.95), white, 0, 0.58, -0.35);
  const canopy = addMesh(
    root,
    geo('canopy', () => new THREE.SphereGeometry(0.38, 16, 12)),
    glass,
    0,
    0.78,
    -0.62,
  );
  canopy.scale.set(1.45, 0.55, 0.85);
  addMesh(root, box(1.35, 0.07, 0.14), blue, 0, 0.86, -0.95);

  addMesh(root, box(0.92, 0.4, 0.72), green, 0, 0.58, 0.55);
  addMesh(root, box(0.78, 0.34, 0.58), green, 0.04, 0.52, 1.15);
  addMesh(root, box(0.62, 0.28, 0.48), green, -0.03, 0.46, 1.62);
  addMesh(root, box(1.0, 0.05, 0.07), white, 0, 0.8, 0.55);
  addMesh(root, box(0.86, 0.05, 0.07), white, 0.04, 0.71, 1.15);

  const sponL = addMesh(root, box(0.72, 0.22, 1.25), blue, -1.05, -0.02, 0.15);
  sponL.rotation.z = 0.15;
  const sponR = addMesh(root, box(0.62, 0.24, 1.05), red, 1.02, 0.02, 0.4);
  sponR.rotation.z = -0.2;

  const tailL = addMesh(root, box(0.08, 1.25, 0.55), blue, -0.72, 0.85, 1.55);
  tailL.rotation.z = 0.16;
  tailL.rotation.x = -0.12;
  const tailR = addMesh(root, box(0.08, 1.02, 0.62), red, 0.74, 0.72, 1.42);
  tailR.rotation.z = -0.2;
  addMesh(root, box(1.55, 0.07, 0.12), green, 0, 1.22, 1.5);
  addMesh(root, box(0.32, 0.14, 0.36), blue, 0, -0.36, -1.15);
  addMesh(root, cyl(0.03, 0.03, 0.48, 6), white, -0.32, 1.05, -0.15);
  addMesh(root, geo('mast-tip', () => new THREE.SphereGeometry(0.07, 8, 6)), red, -0.32, 1.32, -0.15);

  const engines = [
    { x: -0.78, y: -0.12, z: 1.95, r: 0.3, glow: 0x7af6ee, base: 1.15, ring: blue },
    { x: 0.78, y: -0.08, z: 1.82, r: 0.24, glow: 0xff5a6a, base: 0.85, ring: red },
    { x: 0.02, y: 0.28, z: 2.05, r: 0.2, glow: 0x8dffb0, base: 0.72, ring: green },
  ];
  const glows = [];
  for (const eng of engines) {
    const bell = addMesh(root, cyl(eng.r * 0.82, eng.r, 0.62, 14), dark, eng.x, eng.y, eng.z);
    bell.rotation.x = Math.PI / 2;
    const ring = addMesh(root, cyl(eng.r * 1.22, eng.r * 1.22, 0.08, 14), eng.ring, eng.x, eng.y, eng.z - 0.28);
    ring.rotation.x = Math.PI / 2;
    const glow = new THREE.Sprite(glowMat(eng.glow, 0.95));
    glow.position.set(eng.x, eng.y, eng.z + 0.42);
    glow.scale.setScalar(eng.base);
    glow.userData.base = eng.base;
    root.add(glow);
    glows.push(glow);
  }

  const muzzleFlash = new THREE.Sprite(glowMat(0xe8fff8, 0.95));
  muzzleFlash.position.set(0, 0.02, -2.95);
  muzzleFlash.scale.setScalar(0.001);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, -0.02, -2.95);
  root.add(muzzlePoint);

  const light = new THREE.PointLight(0x3ee0d4, 1.6, 12, 2);
  light.position.set(0, 0.1, 2.3);
  root.add(light);

  root.userData.glows = glows;
  root.userData.engineLight = light;
  root.userData.muzzleFlash = muzzleFlash;
  root.userData.muzzlePoint = muzzlePoint;
  root.userData.mats = captureMaterials(root);
  return root;
}

function glowSprite(softMap, color, opacity = 0.9) {
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: softMap,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
}

/** Wing helpers. Nose is local -Z, same convention as Shomeret. */
export function createAlly(type, softMap) {
  const root = new THREE.Group();
  root.name = `ally-${type}`;
  if (type === 'escort') buildEscort(root, softMap);
  else if (type === 'drone') buildDrone(root, softMap);
  else if (type === 'mend') buildMend(root, softMap);
  else buildWard(root, softMap);
  const scale = { escort: 1.35, drone: 1.2, mend: 1.2, ward: 1.25 }[type] ?? 1;
  root.scale.setScalar(scale);
  const barY = type === 'drone' ? 1.05 : type === 'ward' ? 1.2 : 1.4;
  root.userData.bar = attachHealthBar(root, barY);
  root.userData.mats = captureMaterials(root);
  return root;
}

function buildEscort(root, softMap) {
  const blue = makeStandard(0x2f6dff, { emissive: 0x10215f, emissiveIntensity: 0.5 });
  const white = makeStandard(0xf4f7fb, { emissive: 0x9aa4b0, emissiveIntensity: 0.35 });
  const red = makeStandard(0xe4313a, { emissive: 0x5a1218, emissiveIntensity: 0.4 });
  const dark = makeStandard(0x1b2430, { metalness: 0.7, roughness: 0.35 });
  addMesh(root, box(0.62, 0.26, 1.65), blue, 0, 0, 0.05);
  addMesh(root, box(0.4, 0.18, 0.48), white, 0, 0.02, -0.82);
  const wing = addMesh(root, box(1.65, 0.06, 0.38), white, 0, 0, 0.12);
  wing.rotation.z = 0.06;
  addMesh(root, box(0.08, 0.06, 1.15), red, 0, 0.16, 0.02);
  addMesh(root, box(0.06, 0.42, 0.26), blue, 0, 0.28, 0.78);
  const engine = addMesh(root, cyl(0.11, 0.16, 0.32, 10), dark, 0, 0, 0.92);
  engine.rotation.x = Math.PI / 2;
  const glow = glowSprite(softMap, 0x9ec2ff, 0.9);
  glow.position.set(0, 0, 1.15);
  glow.scale.setScalar(0.7);
  root.add(glow);
}

function buildDrone(root, softMap) {
  const mat = makeStandard(0x1ad4c8, { emissive: 0x084240, emissiveIntensity: 0.65, roughness: 0.28 });
  const core = addMesh(root, geo('drone-core', () => new THREE.OctahedronGeometry(0.36, 0)), mat, 0, 0, 0);
  core.scale.set(1, 0.62, 1);
  root.userData.spinner = core;
  const ring = addMesh(
    root,
    geo('drone-ring', () => new THREE.TorusGeometry(0.62, 0.045, 8, 18)),
    makeStandard(0xffffff, { emissive: 0xc5ccd2, emissiveIntensity: 0.45 }),
    0,
    0,
    0,
  );
  ring.rotation.x = Math.PI / 2;
  const glow = glowSprite(softMap, 0x7af6ee, 0.75);
  glow.scale.setScalar(1.15);
  root.add(glow);
}

function buildMend(root, softMap) {
  const green = makeStandard(0x2fce55, { emissive: 0x0d3d1a, emissiveIntensity: 0.5 });
  const white = makeStandard(0xffffff, { emissive: 0xc5ccd2, emissiveIntensity: 0.4 });
  const body = addMesh(root, cyl(0.3, 0.34, 1.1, 10), green, 0, 0, 0.08);
  body.rotation.x = Math.PI / 2;
  addMesh(root, box(0.52, 0.07, 0.14), white, 0, 0.32, 0.05);
  addMesh(root, box(0.12, 0.07, 0.48), white, 0, 0.32, 0.05);
  addMesh(root, box(0.4, 0.08, 0.12), white, -0.42, 0.02, -0.1);
  addMesh(root, box(0.4, 0.08, 0.12), white, 0.42, 0.02, -0.1);
  const glow = glowSprite(softMap, 0x8dffb0, 0.85);
  glow.position.set(0, 0, 0.72);
  glow.scale.setScalar(0.7);
  root.add(glow);
}

function buildWard(root, softMap) {
  const plate = makeStandard(0xdffcf6, { emissive: 0x14514c, emissiveIntensity: 0.45, roughness: 0.28, metalness: 0.4 });
  const blue = makeStandard(0x2f6dff, { emissive: 0x10215f, emissiveIntensity: 0.5 });
  const disc = addMesh(root, cyl(0.7, 0.7, 0.12, 16), plate, 0, 0, 0);
  disc.rotation.x = Math.PI / 2;
  root.userData.spinner = disc;
  const ring = addMesh(root, geo('ward-ring', () => new THREE.TorusGeometry(0.84, 0.045, 8, 20)), blue, 0, 0, 0);
  ring.rotation.x = Math.PI / 2;
  const glow = glowSprite(softMap, 0xc8fff4, 0.7);
  glow.scale.set(1.7, 1.7, 1);
  root.add(glow);
}

export function createEnemy(type) {
  const root = new THREE.Group();
  root.name = `enemy-${type}`;

  if (type === 'glint') {
    const mat = makeStandard(0xff4d8d, { emissive: 0x6a1238, emissiveIntensity: 0.5 });
    const body = addMesh(root, geo('glint-cone', () => new THREE.ConeGeometry(0.55, 2.1, 4)), mat, 0, 0, 0);
    body.rotation.x = -Math.PI / 2;
    const wing = addMesh(root, box(1.5, 0.06, 0.4), makeStandard(0xffd0e4, { emissive: 0x552038, emissiveIntensity: 0.3 }), 0, 0, 0.2);
    wing.rotation.z = 0.2;
  } else if (type === 'nib') {
    const mat = makeStandard(0xc084fc, { emissive: 0x4c1d95, emissiveIntensity: 0.55 });
    const body = addMesh(root, geo('nib', () => new THREE.OctahedronGeometry(0.62, 0)), mat, 0, 0, 0);
    body.scale.set(0.8, 0.55, 1.15);
  } else if (type === 'howler') {
    const mat = makeStandard(0xff5a36, { emissive: 0x6a1c0c, emissiveIntensity: 0.4 });
    addMesh(root, box(1.5, 0.55, 2.2), mat, 0, 0, 0);
    addMesh(root, box(2.1, 0.1, 0.7), makeStandard(0x2a1a22, { emissive: 0x1a0a10, emissiveIntensity: 0.2 }), 0, -0.05, 0.1);
    const cannonMat = makeStandard(0x2c2428, { metalness: 0.7, roughness: 0.3 });
    const left = addMesh(root, cyl(0.1, 0.12, 0.9, 8), cannonMat, -0.45, -0.15, -0.9);
    const right = addMesh(root, cyl(0.1, 0.12, 0.9, 8), cannonMat, 0.45, -0.15, -0.9);
    left.rotation.x = -Math.PI / 2;
    right.rotation.x = -Math.PI / 2;
    addMesh(root, geo('howler-cab', () => new THREE.SphereGeometry(0.28, 12, 10)), makeStandard(0xffe08a, { emissive: 0x8a5a10, emissiveIntensity: 0.4 }), 0, 0.32, -0.35);
  } else if (type === 'vorak') {
    buildVorak(root);
  } else {
    const mat = makeStandard(0x7c5cbf, { emissive: 0x2a1860, emissiveIntensity: 0.45 });
    const body = addMesh(root, geo('slab', () => new THREE.DodecahedronGeometry(1.15, 0)), mat, 0, 0, 0);
    body.scale.set(1.35, 0.85, 1.6);
    addMesh(root, box(2.4, 0.18, 0.55), makeStandard(0xd6c7ff, { emissive: 0x3a2870, emissiveIntensity: 0.35 }), 0, 0.55, 0.1);
    addMesh(root, box(0.7, 0.7, 0.7), makeStandard(0x3a2a55, { metalness: 0.6, roughness: 0.4 }), 0, 0.1, -1.15);
  }

  const barY = type === 'vorak' ? 2.9 : type === 'slab' ? 2.3 : type === 'nib' ? 1.1 : 1.6;
  root.userData.bar = attachHealthBar(root, barY);
  if (type === 'vorak') root.userData.bar.group.scale.set(2.5, 1.7, 1);
  root.userData.mats = captureMaterials(root);
  return root;
}

function buildVorak(root) {
  const hull = makeStandard(0x4e5b54, { emissive: 0x14201c, emissiveIntensity: 0.32, metalness: 0.62, roughness: 0.38 });
  const plate = makeStandard(0xe7d8c4, { emissive: 0x3a3024, emissiveIntensity: 0.12, roughness: 0.55, metalness: 0.2 });
  const rust = makeStandard(0xc45132, { emissive: 0x5a2010, emissiveIntensity: 0.45, metalness: 0.35, roughness: 0.42 });
  const dark = makeStandard(0x1b2420, { metalness: 0.72, roughness: 0.3 });

  addMesh(root, box(2.35, 1.05, 5.4), hull, 0, 0, 0.55);
  addMesh(root, box(3.7, 0.38, 2.8), plate, 0, 0.48, 0.7);
  addMesh(root, box(1.15, 0.72, 1.45), plate, 0.28, 0.95, 0.15);
  addMesh(root, box(0.55, 0.28, 0.4), rust, 0.42, 1.38, -0.15);
  addMesh(root, box(0.9, 0.55, 2.2), dark, 1.35, -0.15, 0.4);
  addMesh(root, box(0.9, 0.55, 2.2), dark, -1.35, -0.15, 0.85);

  const bellMat = makeStandard(0x2a221c, { emissive: 0x4a2810, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.35 });
  const leftBell = addMesh(root, cyl(0.28, 0.42, 0.7, 10), bellMat, 0.55, 0, 3.15);
  const rightBell = addMesh(root, cyl(0.18, 0.28, 0.5, 8), bellMat, -0.48, 0.05, 2.85);
  leftBell.rotation.x = Math.PI / 2;
  rightBell.rotation.x = Math.PI / 2;

  const maul = new THREE.Group();
  maul.position.set(0, 0.12, -2.15);
  addMesh(maul, box(0.26, 0.26, 2.05), dark, 0, 0, -0.85);
  const head = addMesh(maul, cyl(0.62, 0.62, 1.35, 12), rust, 0, 0, -1.95);
  head.rotation.z = Math.PI / 2;
  addMesh(maul, cyl(0.22, 0.22, 1.55, 8), plate, 0, 0, -1.95).rotation.z = Math.PI / 2;
  const core = addMesh(
    maul,
    geo('vorak-core', () => new THREE.SphereGeometry(0.26, 12, 10)),
    new THREE.MeshBasicMaterial({ color: 0xffc56a }),
    0,
    0,
    -1.95,
  );
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, -2.15);
  maul.add(tip);
  root.add(maul);
  root.userData.maul = maul;
  root.userData.maulCore = core;
  root.userData.maulTip = tip;
}

export function createTower(type) {
  const root = new THREE.Group();
  root.name = `tower-${type}`;

  if (type === 'crate') {
    const a = makeStandard(0xd8a15a, { emissive: 0x4a2e10, emissiveIntensity: 0.2, roughness: 0.75 });
    const b = makeStandard(0x8d97a5, { emissive: 0x1c2430, emissiveIntensity: 0.15, roughness: 0.6 });
    const c = makeStandard(0xe23d6a, { emissive: 0x4a1024, emissiveIntensity: 0.25 });
    addMesh(root, box(1.5, 1.5, 1.5), a, -0.3, -0.2, 0.1);
    addMesh(root, box(1.1, 1.1, 1.1), b, 0.55, 0.35, -0.25);
    addMesh(root, box(0.7, 0.7, 0.7), c, -0.15, 0.85, 0.35);
    root.userData.bar = attachHealthBar(root, 1.8);
  } else if (type === 'spire') {
    const metal = makeStandard(0xb9e6ff, { emissive: 0x123848, emissiveIntensity: 0.35, metalness: 0.75, roughness: 0.28 });
    const mast = addMesh(root, cyl(0.16, 0.28, 7.2, 8), metal, 0, 0, 0);
    mast.rotation.x = 0;
    addMesh(root, geo('ring', () => new THREE.TorusGeometry(0.55, 0.05, 8, 16)), makeStandard(0x49d6ff, { emissive: 0x0c4a66, emissiveIntensity: 0.7 }), 0, 1.2, 0);
    addMesh(root, geo('ring', () => new THREE.TorusGeometry(0.55, 0.05, 8, 16)), makeStandard(0xff7ab6, { emissive: 0x6a2048, emissiveIntensity: 0.5 }), 0, -0.8, 0).rotation.x = Math.PI / 2;
    const lamp = addMesh(
      root,
      geo('lamp', () => new THREE.SphereGeometry(0.22, 12, 10)),
      new THREE.MeshBasicMaterial({ color: 0xd8f6ff }),
      0,
      3.7,
      0,
    );
    const aim = new THREE.Group();
    aim.position.set(0, 2.55, 0);
    const barrelMat = makeStandard(0x163846, { emissive: 0x0c4a66, emissiveIntensity: 0.45, metalness: 0.6, roughness: 0.32 });
    const barrel = addMesh(aim, cyl(0.07, 0.11, 0.85, 8), barrelMat, 0, 0, -0.32);
    barrel.rotation.x = -Math.PI / 2;
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -0.85);
    aim.add(muzzle);
    root.add(aim);
    root.userData.lamp = lamp;
    root.userData.aim = aim;
    root.userData.muzzle = muzzle;
    root.userData.bar = attachHealthBar(root, 4.3);
  } else if (type === 'silo') {
    const tank = makeStandard(0xf0b429, { emissive: 0x6a3a08, emissiveIntensity: 0.35, roughness: 0.55, metalness: 0.35 });
    const band = makeStandard(0x24160c, { roughness: 0.7 });
    addMesh(root, cyl(1.45, 1.45, 3.4, 16), tank, 0, 0, 0);
    addMesh(root, cyl(1.5, 1.5, 0.28, 16), band, 0, 0.7, 0);
    addMesh(root, cyl(1.5, 1.5, 0.28, 16), makeStandard(0xe23d4a, { emissive: 0x5a1020, emissiveIntensity: 0.4 }), 0, -0.55, 0);
    addMesh(root, geo('dome', () => new THREE.SphereGeometry(1.15, 16, 12)), tank, 0, 1.7, 0).scale.y = 0.7;
    const lamp = addMesh(
      root,
      geo('lamp', () => new THREE.SphereGeometry(0.18, 10, 8)),
      new THREE.MeshBasicMaterial({ color: 0xffe08a }),
      0,
      2.55,
      0,
    );
    root.userData.lamp = lamp;
    root.userData.bar = attachHealthBar(root, 3.1);
  } else {
    const baseMat = makeStandard(0xc43b52, { emissive: 0x4a1020, emissiveIntensity: 0.35 });
    const dark = makeStandard(0x241018, { metalness: 0.55, roughness: 0.4 });
    addMesh(root, cyl(1.35, 1.6, 0.8, 8), baseMat, 0, -0.3, 0);
    addMesh(root, box(1.6, 0.35, 1.6), dark, 0, 0.2, 0);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.55, 0);
    const barrel = addMesh(pivot, cyl(0.16, 0.22, 1.5, 10), dark, 0, 0, -0.55);
    barrel.rotation.x = -Math.PI / 2;
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -1.45);
    pivot.add(muzzle);
    root.add(pivot);
    root.userData.barrel = pivot;
    root.userData.muzzle = muzzle;
    root.userData.bar = attachHealthBar(root, 1.8);
  }

  root.userData.mats = captureMaterials(root);
  return root;
}

export function createPickup(type, softMap) {
  const colors = {
    rapid: 0x7af0ff,
    spread: 0xff8ad4,
    shield: 0x8ef6c8,
    repair: 0xffd36a,
  };
  const color = colors[type];
  const root = new THREE.Group();
  const core = new THREE.Mesh(
    geo('pickup', () => new THREE.IcosahedronGeometry(0.55, 0)),
    makeStandard(color, { emissive: color, emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.4 }),
  );
  root.add(core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softMap,
    color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  glow.scale.set(2.2, 2.2, 1);
  root.add(glow);
  root.userData.spin = core;
  return root;
}

export const boltGeometry = geo('bolt', () => new THREE.BoxGeometry(0.34, 0.34, 3.4));
