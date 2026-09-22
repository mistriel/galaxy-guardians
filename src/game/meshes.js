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
 * Shomeret (playerShip) — original cargo freighter, painted entirely blue.
 * Long deck, pale-blue nose, wide shoulders, blue crates to starboard,
 * deep-blue spine. Nose is local −Z. Game.js scales by PLAYER.visualScale.
 */
export function createPlayerShip(softMap) {
  const root = new THREE.Group();
  root.name = 'playerShip';

  const hull = makeStandard(0x2a62f0, { emissive: 0x0c246e, emissiveIntensity: 0.42, roughness: 0.38 });
  const pale = makeStandard(0x8eb6ff, { emissive: 0x3a62c8, emissiveIntensity: 0.45, roughness: 0.32 });
  const deep = makeStandard(0x1636a8, { emissive: 0x081848, emissiveIntensity: 0.4, roughness: 0.4 });
  const accent = makeStandard(0x4d86ff, { emissive: 0x143070, emissiveIntensity: 0.42, roughness: 0.4 });
  const dark = makeStandard(0x102048, { emissive: 0x061028, metalness: 0.7, roughness: 0.35 });
  const glass = makeStandard(0xc5dcff, {
    emissive: 0x1a4ea8,
    emissiveIntensity: 0.75,
    metalness: 0.85,
    roughness: 0.12,
  });

  addMesh(root, box(1.15, 0.38, 4.4), hull, 0, 0, 0.15);
  addMesh(root, box(0.72, 0.28, 1.15), pale, 0, 0.02, -2.35);
  addMesh(root, box(0.42, 0.18, 0.55), pale, 0, 0.02, -3.05);
  addMesh(root, box(0.14, 0.1, 3.5), deep, 0, 0.26, 0.05);

  const wingL = addMesh(root, box(1.55, 0.08, 1.35), accent, -1.25, 0.02, 0.35);
  wingL.rotation.y = 0.22;
  const wingR = addMesh(root, box(1.15, 0.08, 1.05), accent, 1.15, 0.06, 0.85);
  wingR.rotation.y = -0.18;
  wingR.rotation.z = -0.12;

  addMesh(root, box(0.7, 0.42, 0.85), accent, 0.72, 0.38, 0.15);
  addMesh(root, box(0.48, 0.28, 0.55), pale, 0.78, 0.7, 0.55);
  addMesh(root, box(0.55, 0.08, 0.9), deep, 0.72, 0.62, 0.15);

  const cockpit = addMesh(
    root,
    geo('cockpit', () => new THREE.SphereGeometry(0.32, 16, 12)),
    glass,
    -0.38,
    0.32,
    -1.15,
  );
  cockpit.scale.set(1.05, 0.62, 1.35);

  const bigEngine = addMesh(root, cyl(0.28, 0.36, 0.9, 14), dark, 0.38, 0, 2.15);
  bigEngine.rotation.x = Math.PI / 2;
  const bigRing = addMesh(root, cyl(0.4, 0.4, 0.1, 14), accent, 0.38, 0, 1.72);
  bigRing.rotation.x = Math.PI / 2;
  const smallEngine = addMesh(root, cyl(0.16, 0.22, 0.55, 12), dark, -0.42, 0.04, 1.95);
  smallEngine.rotation.x = Math.PI / 2;
  const smallRing = addMesh(root, cyl(0.26, 0.26, 0.08, 12), pale, -0.42, 0.04, 1.68);
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
  const bigGlow = new THREE.Sprite(glowMat(0x7eb6ff, 0.95));
  bigGlow.position.set(0.38, 0, 2.65);
  bigGlow.scale.set(1.05, 1.05, 1);
  root.add(bigGlow);
  const smallGlow = new THREE.Sprite(glowMat(0x7eb6ff, 0.9));
  smallGlow.position.set(-0.42, 0.04, 2.28);
  smallGlow.scale.set(0.55, 0.55, 1);
  root.add(smallGlow);

  const muzzleFlash = new THREE.Sprite(glowMat(0xd6e8ff, 0.95));
  muzzleFlash.position.set(0, 0.04, -3.35);
  muzzleFlash.scale.setScalar(0.001);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);
  root.userData.muzzleFlash = muzzleFlash;

  const mast = addMesh(root, cyl(0.03, 0.03, 0.7, 6), pale, -0.15, 0.62, 0.4);
  mast.rotation.z = 0.25;
  const dish = addMesh(root, geo('dish', () => new THREE.ConeGeometry(0.14, 0.12, 8)), deep, -0.28, 0.95, 0.35);
  dish.rotation.z = -0.4;
  addMesh(root, box(0.32, 0.1, 0.4), hull, 0.05, -0.22, -2.2);

  const light = new THREE.PointLight(0x4d86ff, 1.4, 8, 2);
  light.position.set(0.2, 0, 2.2);
  root.add(light);

  root.userData.glows = [bigGlow, smallGlow];
  root.userData.engineLight = light;
  root.userData.mats = captureMaterials(root);
  return root;
}

function shipPaints() {
  return {
    turquoise: makeStandard(0x1ad4c8, { emissive: 0x084240, emissiveIntensity: 0.42, roughness: 0.38 }),
    white: makeStandard(0xffffff, { emissive: 0xc5ccd2, emissiveIntensity: 0.55, roughness: 0.32 }),
    blue: makeStandard(0x2f6dff, { emissive: 0x10215f, emissiveIntensity: 0.38, roughness: 0.4 }),
    green: makeStandard(0x2fce55, { emissive: 0x0d3d1a, emissiveIntensity: 0.38, roughness: 0.42 }),
    red: makeStandard(0xe4313a, { emissive: 0x5a1218, emissiveIntensity: 0.36, roughness: 0.4 }),
    dark: makeStandard(0x1b2430, { emissive: 0x05070c, metalness: 0.7, roughness: 0.35 }),
    glass: makeStandard(0xb9dcff, {
      emissive: 0x1a4ea8,
      emissiveIntensity: 0.75,
      metalness: 0.85,
      roughness: 0.12,
    }),
  };
}

function addThruster(root, softMap, paints, x, y, z, radius, glowColor, glowScale) {
  const engine = addMesh(root, cyl(radius, radius * 1.25, 0.7, 12), paints.dark, x, y, z);
  engine.rotation.x = Math.PI / 2;
  const ring = addMesh(root, cyl(radius * 1.35, radius * 1.35, 0.08, 12), paints.blue, x, y, z - 0.38);
  ring.rotation.x = Math.PI / 2;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softMap,
    color: glowColor,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  glow.position.set(x, y, z + 0.48);
  glow.scale.setScalar(glowScale);
  root.add(glow);
  return glow;
}

/**
 * Netz (נץ) — a narrow dart. Swept wings, a needle nose, one tall tail.
 * Same five paints as Shomeret, a different silhouette. Nose is local −Z.
 */
export function createNetzShip(softMap) {
  const root = new THREE.Group();
  root.name = 'netz';
  const paints = shipPaints();
  addMesh(root, box(0.42, 0.22, 3.6), paints.turquoise, 0, 0, 0.1);
  addMesh(root, box(0.16, 0.12, 1.4), paints.white, 0, 0.02, -2.35);
  addMesh(root, box(0.08, 0.08, 0.55), paints.white, 0, 0.02, -3.15);
  addMesh(root, box(0.06, 0.08, 2.8), paints.red, 0, 0.16, -0.1);
  const wingL = addMesh(root, box(1.7, 0.05, 0.72), paints.blue, -1.05, 0, 0.55);
  wingL.rotation.y = 0.55;
  wingL.rotation.z = 0.08;
  const wingR = addMesh(root, box(1.15, 0.05, 0.55), paints.green, 0.85, 0.02, 0.15);
  wingR.rotation.y = -0.62;
  const tail = addMesh(root, box(0.08, 0.7, 0.42), paints.red, 0, 0.42, 1.55);
  tail.rotation.x = -0.2;
  const cockpit = addMesh(root, geo('netz-pit', () => new THREE.SphereGeometry(0.2, 14, 10)), paints.glass, 0, 0.18, -0.85);
  cockpit.scale.set(0.7, 0.5, 1.4);
  const bigGlow = addThruster(root, softMap, paints, 0, 0, 1.85, 0.16, 0x7af6ee, 0.7);
  const smallGlow = addThruster(root, softMap, paints, 0.28, -0.02, 1.45, 0.08, 0x8dffb0, 0.32);
  const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softMap,
    color: 0xe8fff8,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  muzzleFlash.position.set(0, 0.02, -3.4);
  muzzleFlash.scale.setScalar(0.001);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);
  const light = new THREE.PointLight(0x3ee0d4, 1.1, 7, 2);
  light.position.set(0, 0, 1.9);
  root.add(light);
  root.userData.glows = [bigGlow, smallGlow];
  root.userData.engineLight = light;
  root.userData.muzzleFlash = muzzleFlash;
  root.userData.mats = captureMaterials(root);
  return root;
}

/**
 * Ogen (עוגן) — a wide flat hauler. Short hull, side pontoons, a bridge tower.
 * Nose is local −Z. Heavier than Shomeret, still an original freighter.
 */
export function createOgenShip(softMap) {
  const root = new THREE.Group();
  root.name = 'ogen';
  const paints = shipPaints();
  addMesh(root, box(2.5, 0.28, 2.15), paints.turquoise, 0, 0, 0.15);
  addMesh(root, box(1.1, 0.22, 0.7), paints.white, 0, 0.04, -1.25);
  addMesh(root, box(2.2, 0.08, 0.16), paints.red, 0, 0.2, -0.15);
  addMesh(root, box(0.16, 0.08, 1.8), paints.red, 0, 0.2, 0.1);
  addMesh(root, box(0.55, 0.4, 1.5), paints.green, -1.35, 0.05, 0.2);
  addMesh(root, box(0.55, 0.4, 1.5), paints.green, 1.35, 0.05, 0.35);
  addMesh(root, box(0.7, 0.45, 0.7), paints.blue, 0, 0.42, 0.15);
  const glass = addMesh(root, box(0.46, 0.18, 0.4), paints.glass, 0, 0.7, -0.05);
  glass.rotation.x = -0.15;
  const bigGlow = addThruster(root, softMap, paints, 0, -0.02, 1.25, 0.22, 0x7af6ee, 0.85);
  const smallGlow = addThruster(root, softMap, paints, -0.7, -0.02, 1.15, 0.14, 0xff8a8a, 0.5);
  addThruster(root, softMap, paints, 0.7, -0.02, 1.2, 0.14, 0x8dffb0, 0.5);
  const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softMap,
    color: 0xe8fff8,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  muzzleFlash.position.set(0, 0.08, -1.7);
  muzzleFlash.scale.setScalar(0.001);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);
  const light = new THREE.PointLight(0x3ee0d4, 1.3, 8, 2);
  light.position.set(0, 0.1, 1.2);
  root.add(light);
  root.userData.glows = [bigGlow, smallGlow];
  root.userData.engineLight = light;
  root.userData.muzzleFlash = muzzleFlash;
  root.userData.mats = captureMaterials(root);
  return root;
}

/** Three-sided wedge. Tip points along local +Z, the axis lookAt aims forward. */
function addWedge(parent, radius, length, material, z = 0) {
  const mesh = addMesh(
    parent,
    geo(`wedge:${radius}:${length}`, () => new THREE.ConeGeometry(radius, length, 3)),
    material,
    0,
    0,
    z,
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

/** Red-team mark. A sphere plus a ring so the silhouette stays a circle. */
function addCircle(parent, radius, material) {
  addMesh(
    parent,
    geo(`circle:${radius}`, () => new THREE.SphereGeometry(radius, 10, 8)),
    material,
    0,
    0,
    0,
  );
  const ring = addMesh(
    parent,
    geo(`halo:${radius}`, () => new THREE.TorusGeometry(radius * 1.28, Math.max(0.05, radius * 0.1), 6, 14)),
    material,
    0,
    0,
    0,
  );
  ring.rotation.y = Math.PI / 2;
  return ring;
}

export function createEnemy(type) {
  const root = new THREE.Group();
  root.name = `enemy-${type}`;

  const kinds = {
    nib: { color: 0xff4a4a, emissive: 0x6a1010, radius: 0.42, scale: 2.15, bar: 0.85 },
    glint: { color: 0xff2d2d, emissive: 0x7a1218, radius: 0.55, scale: 2.35, bar: 1.05 },
    howler: { color: 0xff5a32, emissive: 0x6a1c0c, radius: 0.7, scale: 2.55, bar: 1.25 },
    slab: { color: 0xd01212, emissive: 0x4a0808, radius: 0.95, scale: 2.7, bar: 1.6 },
    vorak: { color: 0xff1f3a, emissive: 0x5a0818, radius: 1.25, scale: 3.15, bar: 2.1 },
  };
  const kind = kinds[type] || kinds.glint;
  const hull = makeStandard(kind.color, { emissive: kind.emissive, emissiveIntensity: 0.55, roughness: 0.36 });
  addCircle(root, kind.radius, hull);
  const core = makeStandard(0xfff1e4, { emissive: kind.emissive, emissiveIntensity: 0.8, roughness: 0.28 });
  addMesh(root, geo(`pupil:${kind.radius}`, () => new THREE.SphereGeometry(kind.radius * 0.38, 8, 6)), core, 0, 0, -kind.radius * 0.2);

  root.scale.setScalar(kind.scale);
  root.userData.bar = attachHealthBar(root, kind.bar);
  if (type === 'vorak') root.userData.bar.group.scale.set(1.6, 1.2, 1);
  root.userData.mats = captureMaterials(root);
  return root;
}

/** Blue-team fighter. A three-sided wedge, tip along local −Z. */
export function createAlly() {
  const root = new THREE.Group();
  root.name = 'ally';
  const blue = makeStandard(0x2f6dff, { emissive: 0x10215f, emissiveIntensity: 0.55, roughness: 0.36 });
  const light = makeStandard(0xd7e4ff, { emissive: 0x1a3a88, emissiveIntensity: 0.45, roughness: 0.32 });
  addWedge(root, 0.72, 2.15, blue);
  const nose = addWedge(root, 0.28, 0.9, light, 0.85);
  nose.scale.set(1, 0.5, 1);
  root.userData.bar = attachHealthBar(root, 1.15);
  root.userData.mats = captureMaterials(root);
  return root;
}

/** Capitals. Friendly side is a giant blue triangle. Enemy side is a giant red circle. */
export function createCarrier(side) {
  const root = new THREE.Group();
  root.name = `carrier-${side}`;
  if (side === 'enemy') {
    const hull = makeStandard(0xe42323, { emissive: 0x5a0c0c, emissiveIntensity: 0.55, roughness: 0.34 });
    addCircle(root, 2.7, hull);
    addMesh(
      root,
      geo('carrier-core', () => new THREE.SphereGeometry(0.9, 10, 8)),
      makeStandard(0xffe08a, { emissive: 0x8a3a10, emissiveIntensity: 0.6 }),
      0,
      0,
      -0.4,
    );
  } else {
    const blue = makeStandard(0x2a62ff, { emissive: 0x0c1e66, emissiveIntensity: 0.5, roughness: 0.36 });
    const light = makeStandard(0xe7f0ff, { emissive: 0x2040a0, emissiveIntensity: 0.4 });
    const body = addMesh(root, geo('ally-carrier', () => new THREE.ConeGeometry(2.6, 8.4, 3)), blue, 0, 0, 0);
    body.rotation.x = Math.PI / 2;
    const nose = addMesh(root, geo('ally-carrier-nose', () => new THREE.ConeGeometry(0.9, 2.8, 3)), light, 0, 0.1, 2.5);
    nose.rotation.x = Math.PI / 2;
  }
  root.userData.bar = attachHealthBar(root, side === 'enemy' ? 3.4 : 2.6);
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
    party: 0xfff1a8,
    wing: 0x6aa2ff,
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

/**
 * Movie-missile needle. Slender body, sharp nose, small tail fins, axial plume.
 * Local −Z is the nose. Body radius stays under 0.08 before MISSILE.visualScale.
 * The plume is a cone, not a billboard, so the chase view stays a thin dart.
 */
export function createMissile() {
  const root = new THREE.Group();
  const hull = new THREE.MeshBasicMaterial({ color: 0xfff6e4, fog: false, toneMapped: false });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff3b12, fog: false, toneMapped: false });
  const finMat = new THREE.MeshBasicMaterial({ color: 0xffc14a, fog: false, toneMapped: false });
  const bandMat = new THREE.MeshBasicMaterial({ color: 0x3a2418, fog: false, toneMapped: false });
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xff6a1a,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });

  const bodyLen = 16;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.034, bodyLen, 8), hull);
  body.rotation.x = Math.PI / 2;
  root.add(body);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.28, 8), bandMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = bodyLen * 0.12;
  root.add(collar);

  const noseLen = 3.8;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.036, noseLen, 8), hot);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -(bodyLen / 2 + noseLen / 2) + 0.02;
  root.add(nose);

  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.85), finMat);
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    blade.position.set(Math.cos(angle) * 0.11, Math.sin(angle) * 0.11, bodyLen / 2 - 0.55);
    blade.rotation.z = angle;
    root.add(blade);
  }

  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.04, 4.8, 6), plumeMat);
  plume.rotation.x = Math.PI / 2;
  plume.position.z = bodyLen / 2 + 2.2;
  root.add(plume);

  root.frustumCulled = false;
  root.traverse((obj) => {
    obj.frustumCulled = false;
  });
  return root;
}

/** Fat gold missile. Local −Z is the nose. Game scales it by GIANT.visualScale. */
export function createGiantMissile() {
  const root = new THREE.Group();
  const hull = new THREE.MeshBasicMaterial({ color: 0xffe7a3, fog: false, toneMapped: false });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff5a12, fog: false, toneMapped: false });
  const finMat = new THREE.MeshBasicMaterial({ color: 0xfff6d2, fog: false, toneMapped: false });
  const bodyLen = 7.2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, bodyLen, 10), hull);
  body.rotation.x = Math.PI / 2;
  root.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.4, 10), hot);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -(bodyLen / 2 + 1.05);
  root.add(nose);
  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 1.5), finMat);
    const angle = (i / 4) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, bodyLen / 2 - 0.8);
    blade.rotation.z = angle;
    root.add(blade);
  }
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xffc14a,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  }));
  flame.position.z = bodyLen / 2 + 1.1;
  flame.scale.set(2.2, 3.4, 1);
  root.add(flame);
  root.frustumCulled = false;
  root.traverse((obj) => {
    obj.frustumCulled = false;
  });
  return root;
}

function glowMat(color) {
  return new THREE.MeshBasicMaterial({ color, fog: false, toneMapped: false });
}

/** Five bright beads orbiting a core. Local −Z is forward. */
export function createAtomCluster() {
  const root = new THREE.Group();
  const spinner = new THREE.Group();
  const colors = [0x7af0ff, 0xffe08a, 0xff8ad8, 0xb8ff7a, 0xffffff];
  colors.forEach((color, i) => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glowMat(color));
    const angle = (i / colors.length) * Math.PI * 2;
    bead.position.set(Math.cos(angle) * 0.72, Math.sin(angle) * 0.42, -0.15);
    spinner.add(bead);
  });
  spinner.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glowMat(0xf7fbff)));
  root.add(spinner);
  root.userData.spinner = spinner;
  return root;
}

/** Short gold shell. Local −Z is the nose. */
export function createShellRound() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 4, 8), glowMat(0xf0c14a));
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.15;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glowMat(0xfff6d8));
  nose.position.z = -0.78;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 12), glowMat(0xfff1a8));
  band.rotation.y = Math.PI / 2;
  root.add(body, nose, band);
  return root;
}

/** Festival orb. A bright core and two pastel rings, not a debris cloud. */
export function createUltraBomb() {
  const root = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), glowMat(0xfff3b0));
  const spinner = new THREE.Group();
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 18), glowMat(0xff7ad9));
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 18), glowMat(0x7af0ff));
  ringB.rotation.x = Math.PI / 2.3;
  spinner.add(ringA, ringB);
  root.add(core, spinner);
  root.userData.spinner = spinner;
  return root;
}
