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
 * Shomeret (playerShip) — original chunky freighter.
 * Blunt nose, cockpit blister offset to port, a cargo drum bolted to
 * starboard, one oversized engine and one stub engine, uneven fins.
 * The nose points down local -Z. Game.js scales the whole mesh by PLAYER.visualScale.
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

  addMesh(root, box(1.7, 0.72, 2.7), turquoise, 0.05, 0, 0.05);
  addMesh(root, box(1.15, 0.5, 0.7), white, 0.02, -0.02, -1.55);

  const cockpit = addMesh(
    root,
    geo('cockpit', () => new THREE.SphereGeometry(0.38, 18, 14)),
    glass,
    -0.48,
    0.4,
    -0.55,
  );
  cockpit.scale.set(1.15, 0.72, 1.45);

  const pod = addMesh(root, cyl(0.42, 0.42, 1.35, 14), green, 1.2, -0.02, 0.15);
  pod.rotation.z = Math.PI / 2;
  addMesh(root, box(0.95, 0.1, 0.16), red, 1.2, 0.28, 0.15);
  addMesh(root, box(0.12, 0.16, 1.2), white, 1.2, -0.05, 0.15);

  const finL = addMesh(root, box(1.45, 0.08, 0.62), blue, -1.25, 0.08, 0.7);
  finL.rotation.z = 0.28;
  finL.rotation.y = 0.15;
  const finR = addMesh(root, box(0.62, 0.08, 0.95), red, 0.85, 0.22, 0.95);
  finR.rotation.z = -0.55;

  addMesh(root, box(0.12, 0.74, 2.15), red, 0.32, 0, 0.05);
  addMesh(root, box(0.55, 0.05, 0.7), green, 0.05, 0.4, 0.35);
  addMesh(root, box(0.72, 0.06, 1.15), white, -0.22, 0.4, -0.2);

  const bigEngine = addMesh(root, cyl(0.34, 0.42, 0.85, 14), dark, 0.46, -0.05, 1.55);
  bigEngine.rotation.x = Math.PI / 2;
  const bigRing = addMesh(root, cyl(0.46, 0.46, 0.12, 14), blue, 0.46, -0.05, 1.12);
  bigRing.rotation.x = Math.PI / 2;
  const smallEngine = addMesh(root, cyl(0.18, 0.24, 0.5, 12), dark, -0.5, 0.05, 1.35);
  smallEngine.rotation.x = Math.PI / 2;
  const smallRing = addMesh(root, cyl(0.28, 0.28, 0.1, 12), green, -0.5, 0.05, 1.1);
  smallRing.rotation.x = Math.PI / 2;

  const glowMat = (color, opacity) => new THREE.SpriteMaterial({
    map: softMap,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const bigGlow = new THREE.Sprite(glowMat(0x7af6ee, 0.95));
  bigGlow.position.set(0.46, -0.05, 2.02);
  bigGlow.scale.set(1.35, 1.35, 1);
  root.add(bigGlow);
  const smallGlow = new THREE.Sprite(glowMat(0x8dffb0, 0.9));
  smallGlow.position.set(-0.5, 0.05, 1.66);
  smallGlow.scale.set(0.62, 0.62, 1);
  root.add(smallGlow);

  const muzzleFlash = new THREE.Sprite(glowMat(0xe8fff8, 0.95));
  muzzleFlash.position.set(0, 0.05, -2.05);
  muzzleFlash.scale.setScalar(0.001);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);
  root.userData.muzzleFlash = muzzleFlash;

  const mast = addMesh(root, cyl(0.035, 0.035, 0.85, 6), white, 0.42, 0.78, 0.25);
  mast.rotation.z = -0.4;
  const dish = addMesh(root, geo('dish', () => new THREE.ConeGeometry(0.16, 0.14, 8)), red, 0.58, 1.12, 0.22);
  dish.rotation.z = 0.5;

  const chin = addMesh(root, box(0.4, 0.16, 0.55), blue, -0.15, -0.38, -1.2);
  chin.rotation.x = 0.2;

  const light = new THREE.PointLight(0x3ee0d4, 1.6, 9, 2);
  light.position.set(0.2, 0, 1.8);
  root.add(light);

  root.userData.glows = [bigGlow, smallGlow];
  root.userData.engineLight = light;
  root.userData.mats = captureMaterials(root);
  return root;
}

/** Three-sided wedge. Tip points down local −Z so the ship reads as a triangle. */
function addWedge(parent, radius, length, material, z = 0) {
  const mesh = addMesh(
    parent,
    geo(`wedge:${radius}:${length}`, () => new THREE.ConeGeometry(radius, length, 3)),
    material,
    0,
    0,
    z,
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createEnemy(type) {
  const root = new THREE.Group();
  root.name = `enemy-${type}`;

  const kinds = {
    nib: { color: 0xc084fc, emissive: 0x4c1d95, radius: 0.62, length: 1.95, scale: 2.35, bar: 1.15 },
    glint: { color: 0xff4d8d, emissive: 0x6a1238, radius: 0.82, length: 2.25, scale: 2.55, bar: 1.25 },
    howler: { color: 0xff5a36, emissive: 0x6a1c0c, radius: 1.05, length: 2.55, scale: 2.75, bar: 1.45, wing: 1.7 },
    slab: { color: 0x7c5cbf, emissive: 0x2a1860, radius: 1.28, length: 2.9, scale: 2.65, bar: 2.15 },
    vorak: { color: 0x4e5b54, emissive: 0x14201c, radius: 1.55, length: 3.7, scale: 3.35, bar: 2.7, bone: true },
  };
  const kind = kinds[type] || kinds.glint;
  const hull = makeStandard(kind.color, { emissive: kind.emissive, emissiveIntensity: 0.55, roughness: 0.36 });
  addWedge(root, kind.radius, kind.length, hull);
  const edge = makeStandard(0xfff6ea, { emissive: kind.emissive, emissiveIntensity: 0.7, roughness: 0.3 });
  const nose = addWedge(root, kind.radius * 0.38, kind.length * 0.72, edge, -kind.length * 0.22);
  nose.scale.set(1, 0.55, 1);
  if (kind.wing) {
    const wing = addWedge(
      root,
      kind.wing,
      kind.length * 0.42,
      makeStandard(0xffe08a, { emissive: 0x8a5a10, emissiveIntensity: 0.45 }),
      kind.length * 0.12,
    );
    wing.scale.set(1, 0.28, 1);
  }
  if (kind.bone) {
    const plate = addWedge(
      root,
      kind.radius * 0.72,
      kind.length * 0.55,
      makeStandard(0xe7d8c4, { emissive: 0x3a3024, emissiveIntensity: 0.2, roughness: 0.5 }),
      kind.length * 0.08,
    );
    plate.scale.set(1.15, 0.35, 1);
  }

  root.scale.setScalar(kind.scale);
  root.userData.bar = attachHealthBar(root, kind.bar);
  if (type === 'vorak') root.userData.bar.group.scale.set(1.6, 1.2, 1);
  root.userData.mats = captureMaterials(root);
  return root;
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
    root.userData.lamp = lamp;
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

/** Fat rocket. Local −Z is the nose, matching the player ship. */
export function createMissile() {
  const root = new THREE.Group();
  const hull = new THREE.MeshBasicMaterial({ color: 0xfff4d2, fog: false, toneMapped: false });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff4d12, fog: false, toneMapped: false });
  const finMat = new THREE.MeshBasicMaterial({ color: 0xffb020, fog: false, toneMapped: false });
  const flameMat = new THREE.SpriteMaterial({
    color: 0xff6a1a,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 7.6, 12), hull);
  body.rotation.x = -Math.PI / 2;
  root.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.74, 2.4, 12), hot);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.8;
  root.add(nose);

  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.7, 1.5), finMat);
    const angle = (i / 4) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 1.25, Math.sin(angle) * 1.25, 3.15);
    root.add(blade);
  }

  const flame = new THREE.Sprite(flameMat);
  flame.position.z = 4.8;
  flame.scale.set(5.2, 8.4, 1);
  root.add(flame);

  const halo = new THREE.Sprite(flameMat.clone());
  halo.material.color.setHex(0xffe08a);
  halo.position.z = -5.1;
  halo.scale.setScalar(3.6);
  root.add(halo);

  root.scale.setScalar(2.8);
  root.frustumCulled = false;
  root.traverse((obj) => {
    obj.frustumCulled = false;
  });
  return root;
}
