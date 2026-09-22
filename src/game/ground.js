import * as THREE from 'three';
import { T } from './i18n.js';

/** Easy arcade timings. A full push resolves in about half a minute. */
const PHASE_LEN = {
  artillery: 7,
  armor: 8,
  infantry: 7.5,
  special: 5.5,
  resolve: 99,
};

const PHASE_ORDER = ['artillery', 'armor', 'infantry', 'special', 'resolve'];

export const GROUND_WORLDS = [
  {
    id: 'forest',
    name: 'יער זוהר',
    blurb: 'עצים מאירים וקרקע רכה.',
    sky: 0x0c2420,
    fog: 0x12352c,
    ground: 0x184232,
    lane: 0x206848,
    accent: 0x3dffa2,
    prop: 0x1f8a4c,
    glow: 0xb8ffd8,
    enemy: 0xc45cff,
    special: 'lantern',
    specialName: 'אורן הנוצץ',
  },
  {
    id: 'desert',
    name: 'מדבר אדום',
    blurb: 'חול אדום וסלעים חמים.',
    sky: 0x3a140c,
    fog: 0x5a2414,
    ground: 0x8a3a22,
    lane: 0xa34a28,
    accent: 0xffb15a,
    prop: 0xc46a32,
    glow: 0xffe08a,
    enemy: 0x6a1a3a,
    special: 'drum',
    specialName: 'תוף המדבר',
  },
  {
    id: 'ice',
    name: 'קרח כחול',
    blurb: 'קרח כחול וגבישים.',
    sky: 0x0c1830,
    fog: 0x163048,
    ground: 0x1a3a55,
    lane: 0x245070,
    accent: 0x9ad7ff,
    prop: 0xd8f4ff,
    glow: 0xe8fbff,
    enemy: 0xff6b9a,
    special: 'crown',
    specialName: 'כתר הקרח',
  },
];

const FRIENDLY = 0xf4f7fb;

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

/** Faster, lower cousin of the tank. Same push, different silhouette. */
function makeGunCar(accent) {
  const root = new THREE.Group();
  const bed = mat(accent, accent, 0.35);
  const cab = mat(FRIENDLY, 0x243040, 0.25);
  addBox(root, 1.7, 0.32, 2.8, bed, 0, 0.32, 0);
  addBox(root, 1.15, 0.7, 0.95, cab, 0, 0.78, 0.7);
  const barrel = addCyl(root, 0.06, 0.08, 1.5, cab, 0, 0.7, -1.35);
  barrel.rotation.x = Math.PI / 2;
  for (const [x, z] of [[-0.7, 0.9], [0.7, 0.9], [-0.7, -0.9], [0.7, -0.9]]) {
    const wheel = addCyl(root, 0.28, 0.28, 0.18, mat(0x1b2430), x, 0.28, z);
    wheel.rotation.z = Math.PI / 2;
  }
  return root;
}

function makeInfantry(accent) {
  const root = new THREE.Group();
  const cloth = mat(accent, accent, 0.4);
  const skin = mat(0xffe0c2, 0x000000, 0);
  addCyl(root, 0.22, 0.28, 0.7, cloth, 0, 0.5, 0);
  addCyl(root, 0.2, 0.2, 0.28, skin, 0, 1.05, 0);
  const flag = addBox(root, 0.05, 0.55, 0.32, mat(FRIENDLY, accent, 0.3), 0.28, 1.15, 0);
  root.userData.flag = flag;
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
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 420);
    this.look = new THREE.Vector3(0, 1, -12);
    this.camera.position.set(0, 24, 34);
    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x1a2838, 0.85);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.25);
    this.sun.position.set(30, 40, 20);
    this.scene.add(this.hemi, this.sun);
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
    this.scene.background = new THREE.Color(this.world.sky);
    this.scene.fog = new THREE.FogExp2(this.world.fog, 0.018);
    this.hemi.color.setHex(this.world.glow);
    this.hemi.groundColor.setHex(this.world.ground);
    this.sun.color.setHex(this.world.id === 'desert' ? 0xffc48a : 0xfff4e0);
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
    this.shake = 0;
    this.active = true;
    this.buildField();
    [-8, 0, 8].forEach((x, i) => this.spawn('artillery', x, 0.2 + i * 0.32, { speed: 0, laneFollow: 0.2, bob: 0 }));
    this.syncHud();
    this.sfx.wave?.();
  }

  stop() {
    this.active = false;
  }

  buildField() {
    const world = this.world;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(170, 170),
      mat(world.ground, world.ground, 0.08),
    );
    ground.rotation.x = -Math.PI / 2;
    this.root.add(ground);
    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 120),
      mat(world.lane, world.accent, 0.12),
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.y = 0.02;
    lane.position.z = -12;
    this.root.add(lane);

    for (let i = 0; i < 16; i += 1) {
      const prop = makeProp(world, i);
      const side = i % 2 === 0 ? -1 : 1;
      prop.position.set(side * (26 + (i % 4) * 4), 0, -40 + (i % 8) * 10);
      prop.scale.setScalar(0.8 + (i % 3) * 0.35);
      this.root.add(prop);
    }

    for (let i = 0; i < 7; i += 1) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.3, 1.2),
        mat(world.enemy, world.enemy, 0.35),
      );
      const x = (i - 3) * 4.2;
      box.position.set(x, 0.65, -32);
      this.root.add(box);
      this.barricades.push({ mesh: box, x, z: -32, popped: false, crack: 0 });
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
    else if (kind === 'gunCar') mesh = makeGunCar(this.world.accent);
    else if (kind === 'infantry') mesh = makeInfantry(this.world.accent);
    else mesh = makeSpecial(kind, this.world);
    mesh.visible = false;
    this.root.add(mesh);
    const speeds = { artillery: 0, tank: 8, gunCar: 13, infantry: 12, lantern: 9, drum: 9, crown: 9 };
    const bobs = { artillery: 0, tank: 0.03, gunCar: 0.05, infantry: 0.12, lantern: 0.08, drum: 0.04, crown: 0.05 };
    const follows = { artillery: 0.15, tank: 1, gunCar: 1, infantry: 1, lantern: 0.35, drum: 0.35, crown: 0.35 };
    const unit = {
      kind,
      mesh,
      x,
      z: kind === 'infantry' ? 14 : kind === 'artillery' ? 18 : 12,
      delay,
      age: 0,
      speed: extra.speed ?? speeds[kind] ?? 8,
      bob: extra.bob ?? bobs[kind] ?? 0.04,
      laneFollow: extra.laneFollow ?? follows[kind] ?? 1,
      special: kind === 'lantern' || kind === 'drum' || kind === 'crown',
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
      [-8, 3, 13].forEach((x, i) => this.spawn('gunCar', x, 0.28 + i * 0.4));
    } else if (id === 'infantry') {
      for (let i = 0; i < 24; i += 1) {
        const col = (i % 6) - 2.5;
        const row = Math.floor(i / 6);
        this.spawn('infantry', col * 3.6, row * 0.34 + (i % 6) * 0.06);
      }
    } else if (id === 'special') {
      this.spawn(this.world.special, 0, 0.25);
      this.splash(0, -6, this.world.glow, 14);
      this.shake = Math.min(1.2, this.shake + 0.7);
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

  update(dt, input) {
    if (!this.active) return;
    const pushing = Boolean(input?.push) || this.pushPulse > 0;
    this.pushPulse = Math.max(0, this.pushPulse - dt);
    let axis = 0;
    if (input?.left) axis -= 1;
    if (input?.right) axis += 1;
    axis += input?.stick || 0;
    const targetLane = THREE.MathUtils.clamp(axis, -1, 1) * 12;
    this.lane = THREE.MathUtils.damp(this.lane, targetLane, 4, dt);

    if (this.phase !== 'resolve') {
      this.phaseT += dt * (pushing ? 1.28 : 1);
      if (this.phaseT >= PHASE_LEN[this.phase]) this.nextPhase();
    }

    this.updatePhase(dt, pushing);
    this.updateUnits(dt, pushing);
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

  updatePhase(dt, pushing) {
    const pace = pushing ? 1.35 : 1;
    if (this.phase === 'artillery') {
      this.hold = Math.max(0, this.hold - 4.2 * pace * dt);
      this.shellCd -= dt * pace;
      if (this.shellCd <= 0) {
        this.shellCd = pushing ? 0.32 : 0.52;
        this.launchShell();
      }
    } else if (this.phase === 'armor') {
      this.hold = Math.max(0, this.hold - 3.2 * pace * dt);
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

  launchShell() {
    const from = new THREE.Vector3((Math.random() - 0.5) * 10, 1.4, 18);
    const to = new THREE.Vector3(this.lane + (Math.random() - 0.5) * 16, 0.4, -26 - Math.random() * 14);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      mat(this.world.glow, this.world.glow, 0.9),
    );
    mesh.position.copy(from);
    this.root.add(mesh);
    this.shells.push({ mesh, from, to, t: 0, dur: 0.7 });
    for (const tube of this.tubes) {
      tube.material.emissiveIntensity = 1.4;
    }
    this.sfx.blip?.({ freq: 220, dur: 0.09, type: 'sine', vol: 0.05, slide: -80 });
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
      shell.mesh.position.y += Math.sin(p * Math.PI) * 9;
      if (p < 1) continue;
      this.splash(shell.to.x, shell.to.z, this.world.glow, 7);
      this.hold = Math.max(0, this.hold - 3.1);
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
      const pop = unit.special ? 2.5 : unit.kind === 'tank' ? 1.25 : unit.kind === 'gunCar' ? 1.05 : unit.kind === 'artillery' ? 1.15 : 0.85;
      unit.mesh.scale.setScalar(pop * (0.2 + 0.8 * intro));
      if (fallingBack && unit.kind !== 'artillery') unit.z += 11 * dt;
      else if (this.phase !== 'resolve') unit.z -= unit.speed * pace * dt;
      unit.z = THREE.MathUtils.clamp(unit.z, -50, 22);
      const yBob = Math.sin(unit.age * (unit.kind === 'infantry' ? 10 : 4)) * unit.bob;
      const drop = unit.special ? (1 - intro) * 14 : (1 - intro) * 0.8;
      unit.mesh.position.set(unit.x + this.lane * unit.laneFollow, yBob + drop, unit.z);
      if (unit.kind === 'infantry' && unit.z < -40 && !unit.scored && !fallingBack) {
        unit.scored = true;
        this.capture = Math.min(100, this.capture + 3.5);
      }
      if ((unit.kind === 'tank' || unit.kind === 'gunCar') && !fallingBack) this.smashNear(unit);
    }
  }

  smashNear(unit) {
    const x = unit.x + this.lane * unit.laneFollow;
    for (const block of this.barricades) {
      if (block.popped) continue;
      if (unit.z > block.z + 1.5) continue;
      if (Math.abs(x - block.x) > 3.4) continue;
      block.popped = true;
      this.splash(block.x, block.z, this.world.enemy, 9);
      this.root.remove(block.mesh);
      this.hold = Math.max(0, this.hold - 6);
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
      artillery: { pos: [0, 24, 34], look: [0, 1, -10] },
      armor: { pos: [7, 16, 26], look: [0, 1.2, -18] },
      infantry: { pos: [0, 20, 28], look: [0, 0.8, -26] },
      special: { pos: [-6, 14, 24], look: [0, 2, -8] },
      resolve: { pos: [0, 22, 36], look: [0, 1, -16] },
    };
    const aim = aims[this.phase] || aims.artillery;
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
    dom.phase.textContent = this.phase === 'special' ? `${T.groundSpecial} · ${world.specialName}` : this.phaseLabel();
    if (dom.hold) dom.hold.style.width = `${Math.max(0, this.hold)}%`;
    if (dom.capture) dom.capture.style.width = `${Math.min(100, this.capture)}%`;
    if (dom.note) {
      dom.note.textContent = {
        artillery: T.groundArtilleryNote,
        armor: T.groundArmorNote,
        infantry: T.groundInfantryNote,
        special: world.specialName,
        resolve: this.outcome === 'retreat' ? T.groundRetreatNote : T.groundWinNote,
      }[this.phase] || '';
    }
  }
}
