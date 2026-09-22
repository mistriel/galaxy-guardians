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
 * Dustlark — original chunky freighter.
 * Blunt nose, cockpit blister offset to port, a cargo drum bolted to
 * starboard, one oversized engine and one stub engine, uneven fins.
 * The nose points down local -Z.
 */
export function createDustlark(softMap) {
  const root = new THREE.Group();
  root.name = 'dustlark';

  const hull = makeStandard(0x148f86, { emissive: 0x083833, emissiveIntensity: 0.45, roughness: 0.4 });
  const cream = makeStandard(0xf3e2c4, { emissive: 0x3a2c18, emissiveIntensity: 0.15, roughness: 0.62 });
  const magenta = makeStandard(0xe23d8c, { emissive: 0x6a1040, emissiveIntensity: 0.55 });
  const rust = makeStandard(0xc4622d, { emissive: 0x3a1c0c, emissiveIntensity: 0.2, roughness: 0.78, metalness: 0.2 });
  const dark = makeStandard(0x1b2430, { emissive: 0x05070c, metalness: 0.7, roughness: 0.35 });
  const glass = makeStandard(0x9ee7ff, {
    emissive: 0x1a6a88,
    emissiveIntensity: 0.8,
    metalness: 0.85,
    roughness: 0.12,
  });

  addMesh(root, box(1.7, 0.72, 2.7), hull, 0.05, 0, 0.05);
  addMesh(root, box(1.15, 0.5, 0.7), cream, 0.02, -0.02, -1.55);

  const cockpit = addMesh(
    root,
    geo('cockpit', () => new THREE.SphereGeometry(0.38, 18, 14)),
    glass,
    -0.48,
    0.4,
    -0.55,
  );
  cockpit.scale.set(1.15, 0.72, 1.45);

  const pod = addMesh(root, cyl(0.42, 0.42, 1.35, 14), rust, 1.2, -0.02, 0.15);
  pod.rotation.z = Math.PI / 2;
  addMesh(root, box(0.95, 0.1, 0.16), magenta, 1.2, 0.28, 0.15);
  addMesh(root, box(0.12, 0.16, 1.2), cream, 1.2, -0.05, 0.15);

  const finL = addMesh(root, box(1.45, 0.08, 0.62), cream, -1.25, 0.08, 0.7);
  finL.rotation.z = 0.28;
  finL.rotation.y = 0.15;
  const finR = addMesh(root, box(0.62, 0.08, 0.95), magenta, 0.85, 0.22, 0.95);
  finR.rotation.z = -0.55;

  addMesh(root, box(0.12, 0.74, 2.15), magenta, 0.32, 0, 0.05);
  addMesh(root, box(0.55, 0.05, 0.7), rust, 0.05, 0.4, 0.35);

  const bigEngine = addMesh(root, cyl(0.34, 0.42, 0.85, 14), dark, 0.46, -0.05, 1.55);
  bigEngine.rotation.x = Math.PI / 2;
  const smallEngine = addMesh(root, cyl(0.18, 0.24, 0.5, 12), dark, -0.5, 0.05, 1.35);
  smallEngine.rotation.x = Math.PI / 2;

  const glowMat = (color, opacity) => new THREE.SpriteMaterial({
    map: softMap,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const bigGlow = new THREE.Sprite(glowMat(0xff8a3a, 0.95));
  bigGlow.position.set(0.46, -0.05, 2.02);
  bigGlow.scale.set(1.35, 1.35, 1);
  root.add(bigGlow);
  const smallGlow = new THREE.Sprite(glowMat(0xffd27a, 0.9));
  smallGlow.position.set(-0.5, 0.05, 1.66);
  smallGlow.scale.set(0.62, 0.62, 1);
  root.add(smallGlow);

  const mast = addMesh(root, cyl(0.035, 0.035, 0.85, 6), cream, 0.42, 0.78, 0.25);
  mast.rotation.z = -0.4;
  const dish = addMesh(root, geo('dish', () => new THREE.ConeGeometry(0.16, 0.14, 8)), magenta, 0.58, 1.12, 0.22);
  dish.rotation.z = 0.5;

  const chin = addMesh(root, box(0.4, 0.16, 0.55), dark, -0.15, -0.38, -1.2);
  chin.rotation.x = 0.2;

  const light = new THREE.PointLight(0xff7a3a, 1.6, 9, 2);
  light.position.set(0.2, 0, 1.8);
  root.add(light);

  root.userData.glows = [bigGlow, smallGlow];
  root.userData.engineLight = light;
  root.userData.mats = captureMaterials(root);
  return root;
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
  } else {
    const mat = makeStandard(0x7c5cbf, { emissive: 0x2a1860, emissiveIntensity: 0.45 });
    const body = addMesh(root, geo('slab', () => new THREE.DodecahedronGeometry(1.15, 0)), mat, 0, 0, 0);
    body.scale.set(1.35, 0.85, 1.6);
    addMesh(root, box(2.4, 0.18, 0.55), makeStandard(0xd6c7ff, { emissive: 0x3a2870, emissiveIntensity: 0.35 }), 0, 0.55, 0.1);
    addMesh(root, box(0.7, 0.7, 0.7), makeStandard(0x3a2a55, { metalness: 0.6, roughness: 0.4 }), 0, 0.1, -1.15);
  }

  root.userData.bar = attachHealthBar(root, type === 'slab' ? 2.3 : type === 'nib' ? 1.1 : 1.6);
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

export const boltGeometry = geo('bolt', () => new THREE.BoxGeometry(0.16, 0.16, 1.7));
