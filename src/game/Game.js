import * as THREE from 'three';
import { T } from './i18n.js';
import {
  ALLIES,
  COMBO_MAX,
  COMBO_STEP,
  COMBO_WINDOW,
  ENEMIES,
  PLAYER,
  POOLS,
  POWER,
  TOWERS,
  WAVE_BONUS,
  WING,
  WORLD,
  waveSpec,
} from './balance.js';
import { Sfx } from './audio.js';
import { bonusHome, buildLayout } from './layout.js';
import {
  boltGeometry,
  createPlayerShip,
  createAlly,
  createEnemy,
  createPickup,
  createTower,
  flashMaterials,
  restoreMaterials,
} from './meshes.js';
import {
  burstSparks,
  createNebulas,
  createRings,
  createSparks,
  createStarfield,
  makeSoftTexture,
  spawnRing,
  updateRings,
  updateSparks,
} from './fx.js';

const BEST_KEY = 'galaxy-guardians-best';
const ESCORT_SLOTS = [
  new THREE.Vector3(-14, 1.3, -1.5),
  new THREE.Vector3(14.5, 0.4, -0.5),
  new THREE.Vector3(-1.5, 3.6, 7),
];
const MEND_SLOTS = [
  new THREE.Vector3(-6, -1.5, 14),
  new THREE.Vector3(6.5, -0.7, 15),
];
const PICKUP_TEXT = {
  rapid: T.pickupRapid,
  spread: T.pickupSpread,
  shield: T.pickupShield,
  repair: T.pickupRepair,
};

function steerAxis(v) {
  const amount = Math.abs(v);
  // Wide center deadzone so resting near the crosshair flies straight.
  if (amount < 0.16) return 0;
  const scaled = (amount - 0.16) / 0.84;
  return Math.sign(v) * (Math.min(1, scaled) ** 1.25);
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.sfx = new Sfx();
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, ready: false, armed: false, fire: false };
    this.state = 'menu';
    this.time = 0;
    this.score = 0;
    this.best = this.readBest();
    this.newBest = false;
    this.combo = 1;
    this.comboUntil = 0;
    this.wave = 0;
    this.queue = [];
    this.restAt = 0;
    this.kills = 0;
    this.structures = 0;
    this.fireCd = 0;
    this.fireLock = 0;
    this.rapidUntil = 0;
    this.spreadUntil = 0;
    this.invuln = 0;
    this.lastHit = -999;
    this.hull = PLAYER.hull;
    this.shield = PLAYER.shield;
    this.yaw = 0;
    this.pitch = 0.2;
    this.bank = 0;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.speed = 0;
    this.boosting = false;
    this.braking = false;
    this.shakeAmp = 0;
    this.edge = 0;
    this.popups = [];
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.v1 = new THREE.Vector3();
    this.v2 = new THREE.Vector3();
    this.v3 = new THREE.Vector3();
    this.boltOrigin = new THREE.Vector3();
    this.boltDir = new THREE.Vector3();
    this.boltUp = new THREE.Vector3();
    this.boltFwd = new THREE.Vector3();
    this.nose = new THREE.Vector3();
    this.rightV = new THREE.Vector3();
    this.upV = new THREE.Vector3();
    this.camDesired = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.slotLocal = new THREE.Vector3();
    this.slotWorld = new THREE.Vector3();
    this.orbitSlot = new THREE.Vector3();
    this.muzzleWorld = new THREE.Vector3();
    this.shotDir = new THREE.Vector3();
    this.allyDelta = new THREE.Vector3();
    this.faceAt = new THREE.Vector3();

    this.dom = {
      hud: document.querySelector('#hud'),
      menu: document.querySelector('#menu'),
      overlay: document.querySelector('#overlay'),
      overlayTitle: document.querySelector('#overlay-title'),
      overlayBody: document.querySelector('#overlay-body'),
      crosshair: document.querySelector('#crosshair'),
      radar: document.querySelector('#radar'),
      banner: document.querySelector('#banner'),
      toast: document.querySelector('#toast'),
      edge: document.querySelector('#edge'),
      popups: document.querySelector('#popups'),
      bootError: document.querySelector('#boot-error'),
      hullBar: document.querySelector('#hull-bar'),
      shieldBar: document.querySelector('#shield-bar'),
      hullLabel: document.querySelector('#hull-label'),
      shieldLabel: document.querySelector('#shield-label'),
      score: document.querySelector('#score'),
      scoreLabel: document.querySelector('#score-label'),
      wave: document.querySelector('#wave'),
      waveLabel: document.querySelector('#wave-label'),
      combo: document.querySelector('#combo'),
      allies: document.querySelector('#allies'),
      weapon: document.querySelector('#weapon'),
      flight: document.querySelector('#flight'),
      pauseBtn: document.querySelector('#pause-btn'),
      muteBtn: document.querySelector('#mute-btn'),
      startBtn: document.querySelector('#start-btn'),
      resumeBtn: document.querySelector('#resume-btn'),
      restartBtn: document.querySelector('#restart-btn'),
      menuBtn: document.querySelector('#menu-btn'),
      menuBest: document.querySelector('#menu-best'),
      title: document.querySelector('#title'),
      subtitle: document.querySelector('#subtitle'),
      shipName: document.querySelector('#ship-name'),
      hudShip: document.querySelector('#hud-ship'),
      tagline: document.querySelector('#tagline'),
      sector: document.querySelector('#sector'),
      goal: document.querySelector('#goal'),
      roster: document.querySelector('#roster'),
      controlsTitle: document.querySelector('#controls-title'),
      controls: document.querySelector('#controls'),
    };

    this.fillText();
    this.bindInput();

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
      if (!this.renderer.getContext()) throw new Error('WebGL context missing');
    } catch (err) {
      this.renderer = null;
      this.dom.bootError.hidden = false;
      return;
    }
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.dom.bootError.hidden = false;
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(WORLD.background);
    this.scene.fog = new THREE.FogExp2(WORLD.background, WORLD.fog);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2200);
    this.camera.position.set(0, 4.2, 15);

    this.soft = makeSoftTexture();
    this.stars = createStarfield(1400, 1100, 1.7);
    this.dust = createStarfield(420, 820, 2.6);
    this.scene.add(this.stars, this.dust, createNebulas(this.soft));

    this.scene.add(new THREE.HemisphereLight(0xc5dcff, 0x221428, 0.72));
    this.scene.add(new THREE.AmbientLight(0x8ea0b8, 0.28));
    const key = new THREE.DirectionalLight(0xfff3dd, 1.45);
    key.position.set(70, 110, 40);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x6aa7ff, 0.5);
    fill.position.set(-60, 10, -50);
    this.scene.add(fill);

    const grid = new THREE.GridHelper(1100, 40, 0x2f7590, 0x18364c);
    grid.position.y = -120;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const material of gridMats) {
      material.transparent = true;
      material.opacity = 0.4;
    }
    this.scene.add(grid);

    this.sparks = createSparks(this.scene, this.soft, POOLS.sparks);
    this.rings = createRings(this.scene, POOLS.rings);

    this.player = {
      mesh: createPlayerShip(this.soft),
    };
    this.player.mesh.scale.setScalar(PLAYER.visualScale);
    this.scene.add(this.player.mesh);
    this.bubble = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0x8ef6ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.bubble.scale.set(1.15, 0.7, 1.32);
    this.player.mesh.add(this.bubble);

    this.towers = [];
    for (const spot of buildLayout()) {
      this.towers.push(this.makeTower(spot.type, spot.position, false));
    }
    const bonusPlan = [
      ['crate', POOLS.bonusCrate],
      ['spire', POOLS.bonusSpire],
      ['silo', POOLS.bonusSilo],
      ['nest', POOLS.bonusNest],
    ];
    for (const [type, count] of bonusPlan) {
      for (let i = 0; i < count; i += 1) {
        this.towers.push(this.makeTower(type, new THREE.Vector3(0, -400, 0), true));
      }
    }

    this.enemies = [];
    for (const type of Object.keys(POOLS).filter((key) => ENEMIES[key])) {
      for (let i = 0; i < POOLS[type]; i += 1) {
        const mesh = createEnemy(type);
        mesh.visible = false;
        this.scene.add(mesh);
        this.enemies.push({
          type,
          cfg: ENEMIES[type],
          mesh,
          alive: false,
          hp: ENEMIES[type].hp,
          maxHp: ENEMIES[type].hp,
          vel: new THREE.Vector3(),
          fireCd: 0,
          ramCd: 0,
          windup: 0,
          swing: 0,
          strafe: Math.random() < 0.5 ? 1 : -1,
          strafeT: 1,
          phase: Math.random() * 10,
          flash: 0,
        });
      }
    }

    this.playerBolts = this.makeBolts(POOLS.playerBolts);
    this.enemyBolts = this.makeBolts(POOLS.enemyBolts);

    this.allies = [];
    const wingCounts = { escort: 0, drone: 0, mend: 0, ward: 0 };
    WING.forEach((type, index) => {
      const mesh = createAlly(type, this.soft);
      this.scene.add(mesh);
      const ally = {
        type,
        cfg: ALLIES[type],
        mesh,
        alive: true,
        hp: ALLIES[type].hp,
        maxHp: ALLIES[type].hp,
        slot: wingCounts[type],
        wingIndex: index,
        phase: index * 0.62,
        lift: (index % 5) * 0.4,
        vel: new THREE.Vector3(),
        fireCd: Math.random() * 0.4,
        hitCd: 0,
        healCd: 0.4,
        pulseCd: 2 + index * 0.2,
        flash: 0,
        respawn: 0,
      };
      wingCounts[type] += 1;
      this.allies.push(ally);
      this.placeAlly(ally);
    });

    this.pickups = [];
    const pickupTypes = ['rapid', 'spread', 'shield', 'repair'];
    for (let i = 0; i < POOLS.pickups; i += 1) {
      const type = pickupTypes[i % pickupTypes.length];
      const mesh = createPickup(type, this.soft);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pickups.push({ type, mesh, alive: false, life: 0 });
    }

    this.syncVisibility();
    this.syncHud();
    this.updateMenuBest();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  fillText() {
    const { dom } = this;
    dom.bootError.textContent = T.bootError;
    dom.title.textContent = T.title;
    dom.subtitle.textContent = T.subtitle;
    dom.shipName.textContent = T.ship;
    dom.hudShip.textContent = T.ship;
    dom.tagline.textContent = T.tagline;
    dom.sector.textContent = T.sector;
    dom.goal.textContent = T.goal;
    const allyList = Object.values(T.allyNames).join(', ');
    const enemyList = Object.values(T.enemyNames).join(', ');
    const towerList = Object.values(T.towerNames).join(', ');
    dom.roster.textContent = `${T.allies}: ${allyList}. ${T.enemies}: ${enemyList}. ${T.towers}: ${towerList}.`;
    dom.controlsTitle.textContent = T.controlsTitle;
    dom.controls.replaceChildren();
    for (const line of T.controls) {
      const item = document.createElement('li');
      item.textContent = line;
      dom.controls.appendChild(item);
    }
    dom.startBtn.textContent = T.start;
    dom.hullLabel.textContent = T.hull;
    dom.shieldLabel.textContent = T.shield;
    dom.scoreLabel.textContent = T.score;
    dom.waveLabel.textContent = T.wave;
    dom.pauseBtn.textContent = T.pause;
    dom.muteBtn.textContent = T.sound;
    dom.resumeBtn.textContent = T.resume;
    dom.restartBtn.textContent = T.restart;
    dom.menuBtn.textContent = T.menu;
    dom.edge.textContent = T.edge;
    dom.weapon.textContent = `${T.weapon}: ${T.weaponNormal}`;
    dom.flight.textContent = T.cruise;
  }

  bindInput() {
    const { dom } = this;
    dom.startBtn.addEventListener('click', () => this.startMission());
    dom.pauseBtn.addEventListener('click', () => this.togglePause());
    dom.muteBtn.addEventListener('click', () => this.toggleMute());
    dom.resumeBtn.addEventListener('click', () => this.togglePause());
    dom.restartBtn.addEventListener('click', () => this.startMission());
    dom.menuBtn.addEventListener('click', () => this.showMenu());

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointer.fire = false;
    });
    window.addEventListener('pointermove', (event) => {
      if (!this.renderer) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      this.pointer.x = THREE.MathUtils.clamp(nx, -1, 1);
      this.pointer.y = THREE.MathUtils.clamp(ny, -1, 1);
      this.pointer.ready = true;
      if (!this.pointer.armed && Math.abs(this.pointer.x) < 0.22 && Math.abs(this.pointer.y) < 0.22) {
        this.pointer.armed = true;
      }
    });
    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('button')) return;
      this.pointer.fire = true;
      this.shoot();
    });
    window.addEventListener('pointerup', () => {
      this.pointer.fire = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  onKeyDown(event) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    if (event.code === 'KeyM') {
      this.toggleMute();
      return;
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      this.togglePause();
      return;
    }
    if (event.code === 'Enter') {
      this.onConfirm();
      return;
    }
    if (event.code === 'Space' && this.state === 'menu') {
      this.startMission();
      return;
    }
    if (event.code === 'Space' && this.state === 'play') {
      this.keys.add(event.code);
      this.shoot();
      return;
    }
    if (event.code === 'KeyR' && (this.state === 'dead' || this.state === 'paused')) {
      this.startMission();
      return;
    }
    this.keys.add(event.code);
  }

  onConfirm() {
    if (this.state === 'menu' || this.state === 'dead') this.startMission();
    else if (this.state === 'paused') this.togglePause();
  }

  makeTower(type, position, bonus) {
    const mesh = createTower(type);
    mesh.position.copy(position);
    mesh.visible = !bonus;
    this.scene.add(mesh);
    const cfg = TOWERS[type];
    return {
      type,
      bonus,
      home: position.clone(),
      mesh,
      alive: !bonus,
      hp: cfg.hp,
      maxHp: cfg.hp,
      radius: cfg.radius,
      score: cfg.score,
      color: cfg.color,
      fireCd: Math.random(),
      flash: 0,
      phase: Math.random() * Math.PI * 2,
    };
  }

  makeBolts(count) {
    const bolts = [];
    for (let i = 0; i < count; i += 1) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
      const mesh = new THREE.Mesh(boltGeometry, material);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.soft,
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }));
      glow.scale.set(2.4, 2.4, 1);
      mesh.add(glow);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      bolts.push({
        mesh,
        glow,
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        damage: 0,
        radius: PLAYER.bulletRadius,
        team: 'player',
      });
    }
    return bolts;
  }

  startLoop() {
    const step = (now) => {
      this.raf = requestAnimationFrame(step);
      if (!this.renderer) return;
      const dt = Math.min(0.033, this.last ? (now - this.last) / 1000 : 0);
      this.last = now;
      this.frame(dt);
    };
    this.last = 0;
    this.raf = requestAnimationFrame(step);
  }

  frame(dt) {
    if (this.state === 'paused') {
      this.render();
      return;
    }
    this.time += dt;
    if (this.state === 'menu') {
      this.updateShowcase(dt);
      this.updateWingShowcase(dt);
      this.updateTowers(dt, false);
      this.updateStarParallax();
      updateSparks(this.sparks, dt);
      updateRings(this.rings, this.camera, dt);
      this.updateCameraMenu(dt);
      this.render();
      return;
    }
    if (this.state === 'dead') {
      updateSparks(this.sparks, dt);
      updateRings(this.rings, this.camera, dt);
      this.updateStarParallax();
      this.updateChaseCamera(dt);
      this.updatePopups(dt);
      this.render();
      return;
    }

    this.updatePlayer(dt);
    this.updateQueue();
    this.updateAllies(dt);
    this.updateEnemies(dt);
    this.separateEnemies();
    this.updateTowers(dt, true);
    this.updateBolts(dt);
    this.updatePickups(dt);
    this.checkWaveClear();
    updateSparks(this.sparks, dt);
    updateRings(this.rings, this.camera, dt);
    this.updateStarParallax();
    this.updateChaseCamera(dt);
    this.syncHud();
    this.drawRadar();
    this.updatePopups(dt);
    this.render();
  }

  updateShowcase(dt) {
    this.player.mesh.visible = true;
    this.player.mesh.position.set(0, Math.sin(this.time * 1.2) * 0.35, 0);
    this.yaw += dt * 0.45;
    this.pitch = 0.22;
    this.bank = Math.sin(this.time * 0.8) * 0.2;
    this.applyAttitude();
    this.pulseEngines(0.85 + Math.sin(this.time * 3) * 0.1);
    this.bubble.visible = true;
    this.bubble.material.opacity = 0.1;
  }

  updatePlayer(dt) {
    const mouseSteer = this.pointer.ready && this.pointer.armed;
    let nx = mouseSteer ? this.pointer.x : 0;
    let ny = mouseSteer ? this.pointer.y : 0;
    if (this.keys.has('ArrowLeft')) nx -= 0.9;
    if (this.keys.has('ArrowRight')) nx += 0.9;
    if (this.keys.has('ArrowUp')) ny -= 0.9;
    if (this.keys.has('ArrowDown')) ny += 0.9;
    nx = THREE.MathUtils.clamp(nx, -1, 1);
    ny = THREE.MathUtils.clamp(ny, -1, 1);

    // Yaw is a rate so heading stays free. Pitch springs back to level when the
    // cursor is centered, so traveling the pointer onto the crosshair does not
    // leave the nose stuck high or low.
    this.yawVel = steerAxis(nx) * PLAYER.turn;
    this.yaw += this.yawVel * dt;
    const targetPitch = THREE.MathUtils.clamp(steerAxis(-ny) * 0.9, -0.95, 0.95);
    this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 6, dt);
    this.bank = THREE.MathUtils.damp(this.bank, THREE.MathUtils.clamp(-this.yawVel * 0.48, -0.7, 0.7), 6, dt);
    this.applyAttitude();

    this.boosting = this.keys.has('KeyW') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.braking = this.keys.has('KeyS');
    let targetSpeed = PLAYER.cruise;
    if (this.boosting) targetSpeed = PLAYER.boost;
    if (this.braking) targetSpeed = PLAYER.brake;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 2.4, dt);

    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    this.rightV.set(1, 0, 0).applyQuaternion(this.player.mesh.quaternion);
    let strafe = 0;
    if (this.keys.has('KeyA')) strafe -= PLAYER.strafe;
    if (this.keys.has('KeyD')) strafe += PLAYER.strafe;
    this.player.mesh.position.addScaledVector(this.nose, this.speed * dt);
    this.player.mesh.position.addScaledVector(this.rightV, strafe * dt);

    const pos = this.player.mesh.position;
    if (pos.length() > WORLD.bounds) {
      pos.setLength(WORLD.bounds);
      this.edge = 1.1;
    }
    this.edge = Math.max(0, this.edge - dt);

    this.fireCd = Math.max(0, this.fireCd - dt);
    if (this.pointer.fire || this.keys.has('Space')) this.shoot();

    if (this.time - this.lastHit > PLAYER.shieldDelay && this.shield < PLAYER.shield && this.invuln <= 0) {
      this.shield = Math.min(PLAYER.shield, this.shield + PLAYER.shieldRegen * dt);
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.player.mesh.visible = this.invuln <= 0 || Math.floor(this.time * 18) % 2 === 0;

    const shieldRatio = this.shield / PLAYER.shield;
    this.bubble.visible = shieldRatio > 0.02 && this.player.mesh.visible;
    this.bubble.material.opacity = 0.05 + shieldRatio * 0.16;
    this.pulseEngines(0.7 + this.speed / PLAYER.boost);

    if (this.playerFlash > 0) {
      this.playerFlash -= dt;
      if (this.playerFlash <= 0) restoreMaterials(this.player.mesh.userData.mats);
    }
    const muzzleFlash = this.player.mesh.userData.muzzleFlash;
    if (muzzleFlash && muzzleFlash.visible) {
      muzzleFlash.userData.life -= dt;
      const life = Math.max(0, muzzleFlash.userData.life);
      muzzleFlash.scale.setScalar(8 * (0.4 + life / 0.1));
      muzzleFlash.material.opacity = 0.95 * (life / 0.1);
      if (life <= 0) muzzleFlash.visible = false;
    }

    if (this.speed > PLAYER.cruise * 0.85) {
      const glows = this.player.mesh.userData.glows;
      glows[0].getWorldPosition(this.v1);
      this.v2.copy(this.nose).multiplyScalar(-1);
      if (Math.random() < dt * 28) {
        burstSparks(this.sparks, this.v1, 0xff8a3a, 1, 10, this.v2);
      }
    }
  }

  shoot() {
    if (this.state !== 'play') return;
    if (this.fireCd > 0 || this.time < this.fireLock) return;
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    const rapid = this.time < this.rapidUntil;
    const spread = this.time < this.spreadUntil;
    this.fireCd = rapid ? PLAYER.rapidDelay : PLAYER.fireDelay;
    const angles = spread ? [-0.14, 0, 0.14] : [0];
    this.upV.set(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    const muzzle = this.player.mesh.userData.muzzlePoint;
    if (muzzle) muzzle.getWorldPosition(this.muzzleWorld);
    else this.muzzleWorld.copy(this.player.mesh.position).addScaledVector(this.nose, 2.2 * PLAYER.visualScale);
    for (const angle of angles) {
      const dir = this.v1.copy(this.nose).applyAxisAngle(this.upV, angle).normalize();
      this.spawnBolt('player', this.muzzleWorld, dir, PLAYER.bulletSpeed, PLAYER.bulletDamage, 0xe8fff8, 1);
      burstSparks(this.sparks, this.muzzleWorld, 0xe8fff8, 28, 32, dir, 3.4);
      const muzzleFlash = this.player.mesh.userData.muzzleFlash;
      if (muzzleFlash) {
        muzzleFlash.visible = true;
        muzzleFlash.userData.life = 0.1;
        muzzleFlash.material.opacity = 0.95;
        muzzleFlash.scale.setScalar(8);
      }
    }
    this.sfx.shoot();
  }

  applyAttitude() {
    this.player.mesh.rotation.order = 'YXZ';
    this.player.mesh.rotation.y = this.yaw;
    this.player.mesh.rotation.x = this.pitch;
    this.player.mesh.rotation.z = this.bank;
  }

  pulseEngines(scale) {
    const glows = this.player.mesh.userData.glows;
    if (!glows) return;
    for (const glow of glows) {
      glow.scale.setScalar((glow.userData.base || 1) * scale);
    }
    this.player.mesh.userData.engineLight.intensity = 1.15 * scale;
  }

  updateQueue() {
    while (this.queue.length && this.queue[0].at <= this.time) {
      const job = this.queue.shift();
      this.spawnEnemy(job.type);
    }
  }

  spawnEnemy(type) {
    const enemy = this.enemies.find((item) => item.type === type && !item.alive);
    if (!enemy) return;
    const pos = this.spawnAnchor();
    enemy.alive = true;
    enemy.hp = enemy.maxHp;
    enemy.mesh.visible = true;
    enemy.mesh.position.copy(pos);
    enemy.vel.set(0, 0, 0);
    enemy.fireCd = 0.35 + Math.random() * 0.5;
    enemy.ramCd = 0.4;
    enemy.windup = 0;
    enemy.swing = 0;
    enemy.flash = 0;
    if (enemy.mesh.userData.maul) enemy.mesh.userData.maul.rotation.x = 0.2;
    if (enemy.mesh.userData.maulCore) enemy.mesh.userData.maulCore.scale.setScalar(1);
    restoreMaterials(enemy.mesh.userData.mats);
    if (enemy.mesh.userData.bar) enemy.mesh.userData.bar.group.visible = false;
    if (type === 'vorak') this.showToast(T.enemyNames.vorak);
  }

  spawnAnchor() {
    const playerPos = this.player.mesh.position;
    for (let i = 0; i < 8; i += 1) {
      const dir = this.v1.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.45, Math.random() - 0.5);
      if (dir.lengthSq() < 0.01) continue;
      dir.normalize();
      const pos = this.v2.copy(playerPos).addScaledVector(dir, 125 + Math.random() * 45);
      pos.y = THREE.MathUtils.clamp(pos.y, -70, 110);
      if (pos.length() < WORLD.bounds - 20) return pos.clone();
    }
    return new THREE.Vector3(playerPos.x, 12, playerPos.z - 140);
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.fireCd -= dt;
      const pos = enemy.mesh.position;
      this.faceAt.copy(this.player.mesh.position);
      const to = this.v1.copy(this.faceAt).sub(pos);
      let dist = to.length();
      if (dist > 0.001) to.multiplyScalar(1 / dist);
      else to.set(0, 0, -1);

      enemy.phase += dt;
      const playerDist = dist;
      if (enemy.cfg.ai === 'chase' || enemy.cfg.ai === 'kite') {
        const bait = this.nearestAlly(pos);
        if (bait && bait.dist < 95 && (bait.dist < playerDist * 0.85 || (enemy.strafe < 0 && bait.dist < playerDist * 1.2))) {
          this.faceAt.copy(bait.ally.mesh.position);
          to.copy(this.faceAt).sub(pos);
          dist = to.length();
          if (dist > 0.001) to.multiplyScalar(1 / dist);
          else to.set(0, 0, -1);
        }
      }
      const desired = this.v2.copy(to);
      if (enemy.cfg.ai === 'chase') {
        const side = this.v3.set(-to.z, 0, to.x);
        if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
        side.normalize();
        desired.addScaledVector(side, Math.sin(enemy.phase * 2.1) * enemy.cfg.wobble);
        desired.y += Math.sin(enemy.phase * 1.3) * enemy.cfg.wobble * 0.3;
        if (desired.lengthSq() > 0.0001) desired.normalize();
      } else if (enemy.cfg.ai === 'kite') {
        enemy.strafeT -= dt;
        if (enemy.strafeT <= 0) {
          enemy.strafeT = 1.2 + Math.random() * 0.8;
          enemy.strafe *= -1;
        }
        if (dist < enemy.cfg.prefer - 8) desired.negate();
        else if (dist < enemy.cfg.prefer + 14) {
          desired.set(-to.z, 0, to.x);
          if (desired.lengthSq() < 0.0001) desired.set(1, 0, 0);
          desired.normalize();
          if (enemy.strafe < 0) desired.negate();
        }
        if (dist < enemy.cfg.range) this.tryEnemyShot(enemy);
      } else if (enemy.cfg.ai === 'maul') {
        enemy.strafeT -= dt;
        if (enemy.strafeT <= 0) {
          enemy.strafeT = 1.8 + Math.random();
          enemy.strafe *= -1;
        }
        if (dist > enemy.cfg.prefer + 16) {
          desired.copy(to);
        } else if (dist < enemy.cfg.prefer - 14) {
          desired.negate();
        } else {
          desired.set(-to.z, 0, to.x);
          if (desired.lengthSq() < 0.0001) desired.set(1, 0, 0);
          desired.normalize();
          if (enemy.strafe < 0) desired.negate();
          desired.y += Math.sin(enemy.phase * 0.6) * 0.08;
        }
        if (desired.lengthSq() > 0.0001) desired.normalize();
        this.updateMaul(enemy, dist, dt);
      } else {
        desired.y += Math.sin(enemy.phase) * 0.12;
        if (desired.lengthSq() > 0.0001) desired.normalize();
        if (dist < enemy.cfg.range) this.tryEnemyShot(enemy);
      }

      const speed = enemy.cfg.ai === 'maul' && enemy.windup > 0 ? enemy.cfg.speed * 0.22 : enemy.cfg.speed;
      desired.multiplyScalar(speed);
      enemy.vel.lerp(desired, 1 - Math.exp(-2.8 * dt));
      pos.addScaledVector(enemy.vel, dt);
      if (pos.length() > WORLD.bounds - 12) pos.setLength(WORLD.bounds - 12);
      pos.y = THREE.MathUtils.clamp(pos.y, -100, 140);

      if (enemy.cfg.ai === 'maul') {
        this.faceNose(enemy.mesh, this.player.mesh.position);
      } else if (enemy.vel.lengthSq() > 4) {
        this.v3.copy(pos).add(enemy.vel);
        this.faceNose(enemy.mesh, this.v3);
      }

      enemy.ramCd -= dt;
      if (pos.distanceTo(this.player.mesh.position) < enemy.cfg.radius + PLAYER.radius && enemy.ramCd <= 0) {
        enemy.ramCd = 0.85;
        this.damagePlayer(enemy.cfg.contact);
      }

      if (enemy.flash > 0) {
        enemy.flash -= dt;
        if (enemy.flash <= 0) restoreMaterials(enemy.mesh.userData.mats);
      }
      this.updateBar(enemy);
    }
  }

  separateEnemies() {
    const list = this.enemies.filter((enemy) => enemy.alive);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i].mesh.position;
        const b = list[j].mesh.position;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const min = list[i].cfg.radius + list[j].cfg.radius;
        if (distSq > 0.0001 && distSq < min * min) {
          const dist = Math.sqrt(distSq);
          const push = ((min - dist) * 0.5) / dist;
          a.x += dx * push;
          a.y += dy * push;
          a.z += dz * push;
          b.x -= dx * push;
          b.y -= dy * push;
          b.z -= dz * push;
        }
      }
    }
  }

  faceNose(mesh, target) {
    mesh.lookAt(target);
    mesh.rotateY(Math.PI);
  }

  allySlot(ally) {
    if (ally.type === 'escort') return ESCORT_SLOTS[ally.slot] || ESCORT_SLOTS[0];
    if (ally.type === 'mend') return MEND_SLOTS[ally.slot] || MEND_SLOTS[0];
    const ward = ally.type === 'ward';
    const ang = ally.phase + this.time * (ward ? 0.65 : 1.2);
    const rad = ward ? 11.5 + ally.slot * 0.8 : 6.2 + (ally.slot % 4) * 1.2;
    const y = Math.sin(this.time * 1.45 + ally.phase) * 1.7 + (ward ? 3.6 : (ally.slot % 2 ? 1.8 : -0.5));
    const z = Math.sin(ang) * rad * 0.5 + (ward ? 1.5 : 4);
    this.orbitSlot.set(Math.cos(ang) * rad, y, z);
    return this.orbitSlot;
  }

  placeAlly(ally) {
    this.slotLocal.copy(this.allySlot(ally));
    this.slotWorld.copy(this.slotLocal).applyQuaternion(this.player.mesh.quaternion).add(this.player.mesh.position);
    ally.mesh.position.copy(this.slotWorld);
    ally.vel.set(0, 0, 0);
  }

  updateWingShowcase(dt) {
    for (const ally of this.allies) {
      ally.mesh.visible = true;
      const ang = this.time * (0.28 + (ally.wingIndex % 5) * 0.05) + ally.phase;
      const rad = 9 + (ally.wingIndex % 6) * 1.15;
      const y = Math.sin(this.time * 0.9 + ally.phase) * 1.8 + ally.lift;
      ally.mesh.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad * 0.72);
      this.faceNose(ally.mesh, this.player.mesh.position);
      const spin = ally.mesh.userData.spinner;
      if (spin) spin.rotation.y += dt * 2.2;
      if (ally.mesh.userData.bar) ally.mesh.userData.bar.group.visible = false;
    }
  }

  updateAllies(dt) {
    let chirped = false;
    for (const ally of this.allies) {
      if (!ally.alive) {
        ally.respawn -= dt;
        if (ally.respawn <= 0) this.reviveAlly(ally);
        continue;
      }
      const pos = ally.mesh.position;
      this.slotLocal.copy(this.allySlot(ally));
      this.slotWorld.copy(this.slotLocal).applyQuaternion(this.player.mesh.quaternion).add(this.player.mesh.position);
      this.allyDelta.copy(this.slotWorld).sub(pos);
      const dist = this.allyDelta.length();
      const catchup = dist > 32 ? 1.9 : dist > 14 ? 1.28 : 1;
      if (dist > 0.12) this.allyDelta.multiplyScalar(1 / dist);
      else this.allyDelta.set(0, 0, 0);
      this.faceAt.copy(this.allyDelta).multiplyScalar(ally.cfg.speed * catchup);
      ally.vel.lerp(this.faceAt, 1 - Math.exp(-3.6 * dt));
      pos.addScaledVector(ally.vel, dt);
      if (pos.length() > WORLD.bounds - 10) pos.setLength(WORLD.bounds - 10);

      this.allyDelta.copy(pos).sub(this.player.mesh.position);
      const gap = this.allyDelta.length();
      const minGap = PLAYER.radius * 0.72 + ally.cfg.radius;
      if (gap < minGap && gap > 0.001) {
        pos.addScaledVector(this.allyDelta.multiplyScalar(1 / gap), minGap - gap);
      }

      ally.fireCd -= dt;
      ally.hitCd = Math.max(0, ally.hitCd - dt);
      const hostile = this.pickHostile(pos);
      if (hostile) this.faceNose(ally.mesh, hostile.pos);
      else if (ally.vel.lengthSq() > 1) {
        this.faceAt.copy(pos).add(ally.vel);
        this.faceNose(ally.mesh, this.faceAt);
      } else {
        this.faceAt.copy(pos).add(this.nose);
        this.faceNose(ally.mesh, this.faceAt);
      }

      if (hostile && hostile.dist < ally.cfg.range && ally.fireCd <= 0) {
        ally.fireCd = ally.cfg.fireEvery * (0.82 + Math.random() * 0.35);
        this.shotDir.copy(hostile.pos).sub(pos);
        if (this.shotDir.lengthSq() > 0.01) {
          this.shotDir.normalize();
          this.shotDir.x += (Math.random() - 0.5) * 0.05;
          this.shotDir.y += (Math.random() - 0.5) * 0.05;
          this.shotDir.normalize();
          this.muzzleWorld.copy(pos).addScaledVector(this.shotDir, ally.cfg.radius + 0.6);
          this.spawnBolt('ally', this.muzzleWorld, this.shotDir, ally.cfg.shotSpeed, ally.cfg.shotDamage, ally.cfg.color, ally.cfg.shotScale);
          if (!chirped) {
            this.sfx.allyShot();
            chirped = true;
          }
        }
      }

      if (ally.type === 'mend') this.tickMend(ally, dt);
      if (ally.type === 'ward') this.tickWard(ally, dt);
      if (ally.flash > 0) {
        ally.flash -= dt;
        if (ally.flash <= 0) restoreMaterials(ally.mesh.userData.mats);
      }
      const spin = ally.mesh.userData.spinner;
      if (spin) spin.rotation.y += dt * 2.4;
      this.updateBar(ally);
    }
    this.separateAllies();
    this.resolveWingHits();
  }

  tickMend(ally, dt) {
    ally.healCd -= dt;
    if (ally.healCd > 0 || this.hull >= PLAYER.hull) return;
    if (ally.mesh.position.distanceTo(this.player.mesh.position) > ally.cfg.healRange) return;
    ally.healCd = ally.cfg.healEvery;
    this.hull = Math.min(PLAYER.hull, this.hull + ally.cfg.heal);
    burstSparks(this.sparks, this.player.mesh.position, 0x8dffb0, 6, 10, null);
  }

  tickWard(ally, dt) {
    ally.pulseCd -= dt;
    if (ally.pulseCd > 0) return;
    if (this.shield >= PLAYER.shield) return;
    if (ally.mesh.position.distanceTo(this.player.mesh.position) > 40) return;
    ally.pulseCd = ally.cfg.shieldEvery;
    this.shield = Math.min(PLAYER.shield, this.shield + ally.cfg.shieldPulse);
    spawnRing(this.rings, this.player.mesh.position, 0x9ef6e8);
  }

  separateAllies() {
    const list = this.allies.filter((ally) => ally.alive);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i].mesh.position;
        const b = list[j].mesh.position;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const min = (list[i].cfg.radius + list[j].cfg.radius) * 0.85;
        if (distSq > 0.0001 && distSq < min * min) {
          const dist = Math.sqrt(distSq);
          const push = ((min - dist) * 0.45) / dist;
          a.x += dx * push;
          a.y += dy * push;
          a.z += dz * push;
          b.x -= dx * push;
          b.y -= dy * push;
          b.z -= dz * push;
        }
      }
    }
  }

  resolveWingHits() {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      for (const ally of this.allies) {
        if (!ally.alive || ally.hitCd > 0) continue;
        const gap = enemy.mesh.position.distanceTo(ally.mesh.position);
        if (gap < enemy.cfg.radius + ally.cfg.radius) {
          ally.hitCd = 0.7;
          this.damageAlly(ally, Math.max(4, enemy.cfg.contact * 0.55));
        }
      }
    }
  }

  pickHostile(from) {
    let best = null;
    let bestDist = 150;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = from.distanceTo(enemy.mesh.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = { pos: enemy.mesh.position, dist, kind: 'enemy' };
      }
    }
    if (best) return best;
    bestDist = 120;
    for (const tower of this.towers) {
      if (!tower.alive || tower.type === 'crate') continue;
      const dist = from.distanceTo(tower.mesh.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = { pos: tower.mesh.position, dist, kind: 'tower' };
      }
    }
    return best;
  }

  combatFocus(from) {
    let best = this.player.mesh.position;
    let bestDist = from.distanceTo(best);
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      const dist = from.distanceTo(ally.mesh.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = ally.mesh.position;
      }
    }
    return best;
  }

  nearestAlly(from) {
    let ally = null;
    let dist = Infinity;
    for (const item of this.allies) {
      if (!item.alive) continue;
      const gap = from.distanceTo(item.mesh.position);
      if (gap < dist) {
        dist = gap;
        ally = item;
      }
    }
    return ally ? { ally, dist } : null;
  }

  reviveAlly(ally) {
    ally.alive = true;
    ally.hp = ally.maxHp;
    ally.fireCd = 0.25;
    ally.hitCd = 0.35;
    ally.healCd = 0.4;
    ally.pulseCd = 1.2;
    ally.flash = 0;
    ally.mesh.visible = true;
    restoreMaterials(ally.mesh.userData.mats);
    this.placeAlly(ally);
    burstSparks(this.sparks, ally.mesh.position, ally.cfg.color, 8, 14, null);
  }

  damageAlly(ally, amount) {
    if (!ally.alive || this.state !== 'play') return;
    ally.hp -= amount;
    ally.flash = 0.08;
    flashMaterials(ally.mesh.userData.mats);
    burstSparks(this.sparks, ally.mesh.position, ally.cfg.color, 5, 12, null);
    if (ally.hp > 0) return;
    ally.alive = false;
    ally.hp = 0;
    const pos = ally.mesh.position.clone();
    ally.mesh.visible = false;
    ally.mesh.position.set(0, -999, 0);
    if (ally.mesh.userData.bar) ally.mesh.userData.bar.group.visible = false;
    ally.respawn = ally.cfg.respawn;
    this.fxBoom(pos, ally.cfg.color, 'small');
  }

  updateMaul(enemy, dist, dt) {
    const maul = enemy.mesh.userData.maul;
    const core = enemy.mesh.userData.maulCore;
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      const t = 1 - Math.max(0, enemy.windup) / enemy.cfg.windup;
      if (maul) maul.rotation.x = 0.7 * (1 - t) + -1.2 * t;
      if (core) core.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.85);
      if (enemy.windup <= 0) {
        this.fireMaul(enemy);
        enemy.swing = (enemy.swing + 1) % 2;
        enemy.fireCd = enemy.cfg.fireEvery;
        if (maul) maul.rotation.x = 0.15;
        if (core) core.scale.setScalar(1);
      }
      return;
    }
    if (maul) maul.rotation.x = 0.22 + Math.sin(enemy.phase * 1.4) * 0.08;
    if (core) core.scale.setScalar(1);
    if (enemy.fireCd <= 0 && dist < enemy.cfg.range) {
      enemy.windup = enemy.cfg.windup;
      this.sfx.maulWind();
    }
  }

  fireMaul(enemy) {
    const tip = enemy.mesh.userData.maulTip;
    const origin = this.boltOrigin;
    if (tip) tip.getWorldPosition(origin);
    else origin.copy(enemy.mesh.position);
    const heavy = enemy.swing % 2 === 0;
    this.boltFwd.set(0, 0, -1).applyQuaternion(enemy.mesh.quaternion);
    this.boltDir.copy(this.player.mesh.position).sub(origin);
    if (this.boltDir.lengthSq() < 0.01) this.boltDir.copy(this.boltFwd);
    else this.boltDir.normalize();
    if (heavy) this.boltDir.lerp(this.boltFwd, 0.35).normalize();
    this.boltUp.set(0, 1, 0).applyQuaternion(enemy.mesh.quaternion);
    const angles = heavy ? [0] : [-0.34, 0, 0.34];
    const speed = heavy ? enemy.cfg.shotSpeed : enemy.cfg.arcSpeed;
    const damage = heavy ? enemy.cfg.shotDamage : enemy.cfg.arcDamage;
    const scale = heavy ? enemy.cfg.shotScale : enemy.cfg.arcScale;
    for (const angle of angles) {
      const dir = this.boltDir.clone().applyAxisAngle(this.boltUp, angle);
      this.spawnBolt('enemy', origin, dir, speed, damage, 0xffb15a, scale);
    }
    burstSparks(this.sparks, origin, 0xffc56a, heavy ? 14 : 8, 16, this.boltFwd);
    this.sfx.maul();
  }

  tryEnemyShot(enemy) {
    if (enemy.fireCd > 0 || !enemy.cfg.shotDamage) return;
    enemy.fireCd = enemy.cfg.fireEvery * (0.85 + Math.random() * 0.3);
    const origin = enemy.mesh.position.clone();
    let aimPos = this.faceAt;
    if (enemy.cfg.ai === 'tank') {
      const bait = this.nearestAlly(enemy.mesh.position);
      if (bait && bait.dist < enemy.cfg.range && Math.random() < 0.4) aimPos = bait.ally.mesh.position;
    }
    const dir = aimPos.clone().sub(origin);
    if (dir.lengthSq() < 0.01) return;
    dir.normalize();
    dir.x += (Math.random() - 0.5) * 0.14;
    dir.y += (Math.random() - 0.5) * 0.1;
    dir.z += (Math.random() - 0.5) * 0.14;
    dir.normalize();
    this.spawnBolt('enemy', origin, dir, enemy.cfg.shotSpeed, enemy.cfg.shotDamage, enemy.cfg.color, enemy.cfg.shotScale);
    this.sfx.enemyShot();
  }

  updateTowers(dt, allowFire) {
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      const lamp = tower.mesh.userData.lamp;
      if (lamp) {
        const pulse = 0.82 + Math.sin(this.time * 4.2 + tower.phase) * 0.22;
        lamp.scale.setScalar(pulse);
      }
      if (tower.type === 'crate') {
        const t = this.time + tower.phase;
        const drift = TOWERS.crate.drift;
        tower.mesh.position.set(
          tower.home.x + Math.sin(t * 0.37) * drift,
          tower.home.y + Math.sin(t * 0.8) * drift * 0.7,
          tower.home.z + Math.cos(t * 0.31) * drift * 0.85,
        );
        tower.mesh.rotation.y += dt * 0.5;
        tower.mesh.rotation.z = Math.sin(t * 0.5) * 0.14;
      } else if (tower.type === 'nest') {
        tower.mesh.position.y = tower.home.y + Math.sin(this.time * 0.7 + tower.phase) * 1.5;
        this.aimTower(tower, allowFire, TOWERS.nest, dt);
      } else if (tower.type === 'spire') {
        tower.mesh.rotation.y += dt * 0.35;
        this.aimTower(tower, allowFire, TOWERS.spire, dt);
      } else if (tower.type === 'silo') {
        tower.mesh.rotation.y += dt * 0.22;
        if (allowFire) this.ventSilo(tower, dt);
      }
      if (tower.flash > 0) {
        tower.flash -= dt;
        if (tower.flash <= 0) restoreMaterials(tower.mesh.userData.mats);
      }
      this.updateBar(tower);
    }
  }

  aimTower(tower, allowFire, cfg, dt) {
    const pivot = tower.mesh.userData.barrel || tower.mesh.userData.aim;
    if (!pivot) return;
    const focus = this.combatFocus(tower.mesh.position);
    this.faceNose(pivot, focus);
    if (!allowFire) return;
    tower.fireCd -= dt;
    if (tower.fireCd > 0) return;
    if (tower.mesh.position.distanceTo(focus) > cfg.range) return;
    const muzzle = tower.mesh.userData.muzzle;
    if (!muzzle) return;
    tower.fireCd = cfg.fireEvery * (0.88 + Math.random() * 0.24);
    muzzle.getWorldPosition(this.muzzleWorld);
    this.shotDir.copy(focus).sub(this.muzzleWorld);
    if (this.shotDir.lengthSq() < 0.01) return;
    this.shotDir.normalize();
    this.shotDir.x += (Math.random() - 0.5) * 0.08;
    this.shotDir.y += (Math.random() - 0.5) * 0.08;
    this.shotDir.normalize();
    this.spawnBolt('enemy', this.muzzleWorld, this.shotDir, cfg.shotSpeed, cfg.shotDamage, cfg.color, cfg.shotScale);
    this.sfx.enemyShot();
  }

  ventSilo(tower, dt) {
    tower.fireCd -= dt;
    if (tower.fireCd > 0) return;
    tower.fireCd = TOWERS.silo.ventEvery * (0.9 + Math.random() * 0.2);
    const origin = tower.mesh.position;
    this.shotDir.set(0, 1, 0);
    burstSparks(this.sparks, origin, 0xffb020, 12, 18, this.shotDir);
    const radius = TOWERS.silo.ventRadius;
    const dmg = TOWERS.silo.ventDamage;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.mesh.position.distanceTo(origin) <= radius + enemy.cfg.radius) {
        this.damageEnemy(enemy, dmg);
      }
    }
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      if (ally.mesh.position.distanceTo(origin) <= radius + ally.cfg.radius) {
        this.damageAlly(ally, dmg);
      }
    }
    if (this.state === 'play' && this.player.mesh.position.distanceTo(origin) <= radius + PLAYER.radius * 0.45) {
      this.damagePlayer(dmg);
    }
  }

  updateBolts(dt) {
    const bolts = this.playerBolts.concat(this.enemyBolts);
    for (const bolt of bolts) {
      if (!bolt.alive) continue;
      bolt.life -= dt;
      bolt.pos.addScaledVector(bolt.vel, dt);
      if (bolt.life <= 0 || bolt.pos.length() > WORLD.bounds + 40) {
        this.killBolt(bolt);
        continue;
      }
      bolt.mesh.position.copy(bolt.pos);
      this.v3.copy(bolt.pos).add(bolt.vel);
      bolt.mesh.lookAt(this.v3);
      if (bolt.team === 'player') {
        bolt.mesh.scale.set(PLAYER.boltGirth, PLAYER.boltGirth, PLAYER.boltStretch);
      }
    }

    for (const bolt of this.playerBolts) {
      if (!bolt.alive || bolt.team === 'enemy') continue;
      let hit = false;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (bolt.pos.distanceTo(enemy.mesh.position) <= bolt.radius + enemy.cfg.radius) {
          this.damageEnemy(enemy, bolt.damage, bolt.vel);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const tower of this.towers) {
          if (!tower.alive) continue;
          if (bolt.team === 'ally' && tower.type === 'crate') continue;
          if (bolt.pos.distanceTo(tower.mesh.position) <= bolt.radius + tower.radius) {
            this.damageTower(tower, bolt.damage);
            hit = true;
            break;
          }
        }
      }
      if (hit) this.killBolt(bolt);
    }

    if (this.state !== 'play') return;
    for (const bolt of this.enemyBolts) {
      if (!bolt.alive) continue;
      let soaked = false;
      for (const ally of this.allies) {
        if (!ally.alive) continue;
        const reach = ally.cfg.radius + (ally.type === 'ward' ? ally.cfg.intercept : 0);
        const gap = bolt.pos.distanceTo(ally.mesh.position);
        if (gap <= bolt.radius + reach) {
          this.killBolt(bolt);
          const grazed = ally.type === 'ward' && gap > ally.cfg.radius + bolt.radius;
          this.damageAlly(ally, grazed ? bolt.damage * 0.35 : bolt.damage);
          soaked = true;
          break;
        }
      }
      if (soaked) continue;
      if (bolt.pos.distanceTo(this.player.mesh.position) <= bolt.radius + PLAYER.radius) {
        this.killBolt(bolt);
        this.damagePlayer(bolt.damage);
      }
    }
  }

  spawnBolt(team, origin, dir, speed, damage, color, scale) {
    const pool = team === 'enemy' ? this.enemyBolts : this.playerBolts;
    const bolt = pool.find((item) => !item.alive);
    if (!bolt) return null;
    bolt.alive = true;
    bolt.team = team;
    bolt.pos.copy(origin);
    bolt.vel.copy(dir).multiplyScalar(speed);
    if (team === 'player') bolt.vel.addScaledVector(this.nose, this.speed * 0.3);
    if (team === 'enemy') bolt.life = 2.5;
    else if (team === 'ally') bolt.life = 1.05;
    else bolt.life = PLAYER.bulletLife;
    bolt.damage = damage;
    if (team === 'player') bolt.radius = PLAYER.bulletRadius;
    else if (team === 'ally') bolt.radius = 1.2;
    else bolt.radius = PLAYER.bulletRadius * (scale || 1) * 0.45;
    bolt.mesh.visible = true;
    if (team === 'player') bolt.mesh.scale.set(PLAYER.boltGirth, PLAYER.boltGirth, PLAYER.boltStretch);
    else bolt.mesh.scale.setScalar(scale || 1);
    bolt.mesh.material.color.setHex(color);
    if (bolt.glow) {
      bolt.glow.material.color.setHex(color);
      const glowSize = team === 'player' ? 0.85 : team === 'ally' ? 1.7 : 2.4;
      bolt.glow.scale.set(glowSize, glowSize, 1);
    }
    bolt.mesh.position.copy(origin);
    return bolt;
  }

  killBolt(bolt) {
    bolt.alive = false;
    bolt.mesh.visible = false;
  }

  updatePickups(dt) {
    if (this.state !== 'play') return;
    for (const pickup of this.pickups) {
      if (!pickup.alive) continue;
      pickup.life -= dt;
      pickup.mesh.userData.spin.rotation.y += dt * 2.4;
      pickup.mesh.userData.spin.rotation.x += dt;
      const offset = this.v1.copy(this.player.mesh.position).sub(pickup.mesh.position);
      const dist = offset.length();
      if (dist < 18 && dist > 0.001) {
        pickup.mesh.position.addScaledVector(offset.multiplyScalar(1 / dist), (20 + (18 - dist) * 6) * dt);
      }
      const near = pickup.mesh.position.distanceTo(this.player.mesh.position);
      if (near < PLAYER.radius + 1.3) {
        this.collectPickup(pickup);
        continue;
      }
      if (pickup.life <= 0) {
        pickup.alive = false;
        pickup.mesh.visible = false;
        continue;
      }
      pickup.mesh.visible = pickup.life > 2.4 || Math.floor(this.time * 10) % 2 === 0;
    }
  }

  spawnPickup(position) {
    const free = this.pickups.filter((item) => !item.alive);
    if (!free.length) return;
    const pickup = free[Math.floor(Math.random() * free.length)];
    pickup.alive = true;
    pickup.life = 14;
    pickup.mesh.visible = true;
    pickup.mesh.position.copy(position);
    pickup.mesh.position.y += 1.4;
  }

  collectPickup(pickup) {
    pickup.alive = false;
    pickup.mesh.visible = false;
    if (pickup.type === 'rapid') this.rapidUntil = this.time + POWER.duration;
    else if (pickup.type === 'spread') this.spreadUntil = this.time + POWER.duration;
    else if (pickup.type === 'shield') this.shield = Math.min(PLAYER.shield, this.shield + POWER.shield);
    else this.hull = Math.min(PLAYER.hull, this.hull + POWER.repair);
    this.sfx.pickup();
    this.showToast(PICKUP_TEXT[pickup.type]);
  }

  damageEnemy(enemy, amount) {
    if (!enemy.alive || this.state !== 'play') return;
    enemy.hp -= amount;
    enemy.flash = 0.08;
    flashMaterials(enemy.mesh.userData.mats);
    burstSparks(this.sparks, enemy.mesh.position, 0xfff6d8, 7, 18, null);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const pos = enemy.mesh.position.clone();
    enemy.mesh.visible = false;
    enemy.mesh.position.set(0, -999, 0);
    if (enemy.mesh.userData.bar) enemy.mesh.userData.bar.group.visible = false;
    this.kills += 1;
    this.addScore(enemy.cfg.score, pos, true);
    const size = enemy.type === 'vorak' || enemy.type === 'slab' ? 'big' : enemy.type === 'nib' ? 'small' : 'mid';
    this.fxBoom(pos, enemy.cfg.color, size);
    this.addShake(enemy.type === 'vorak' ? 0.85 : enemy.type === 'slab' ? 0.48 : 0.16);
    if (enemy.type === 'vorak') this.sfx.bigBoom();
    else this.sfx.explode();
    if (Math.random() < enemy.cfg.drop) this.spawnPickup(pos);
  }

  damageTower(tower, amount) {
    if (!tower.alive || this.state !== 'play') return;
    tower.hp -= amount;
    tower.flash = 0.08;
    flashMaterials(tower.mesh.userData.mats);
    burstSparks(this.sparks, tower.mesh.position, 0xfff6d8, 7, 18, null);
    if (tower.hp <= 0) this.killTower(tower);
  }

  killTower(tower) {
    if (!tower.alive) return;
    tower.alive = false;
    const pos = tower.mesh.position.clone();
    tower.mesh.visible = false;
    if (tower.mesh.userData.bar) tower.mesh.userData.bar.group.visible = false;
    this.structures += 1;
    this.addScore(tower.score, pos, true);
    const size = tower.type === 'silo' ? 'big' : tower.type === 'crate' ? 'small' : 'mid';
    this.fxBoom(pos, tower.color, size);
    this.addShake(tower.type === 'crate' ? 0.1 : 0.24);
    if (tower.type === 'crate') {
      this.sfx.pop();
      this.shrapnel(pos, TOWERS.crate.shrapnelRadius, TOWERS.crate.shrapnel);
    } else if (tower.type !== 'silo') this.sfx.explode();
    if (tower.type === 'silo') this.blast(pos, TOWERS.silo.blast, TOWERS.silo.blastDamage);
  }

  shrapnel(origin, radius, damage) {
    burstSparks(this.sparks, origin, 0xf0b45a, 10, 20, null);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.mesh.position.distanceTo(origin) <= radius + enemy.cfg.radius) {
        this.damageEnemy(enemy, damage);
      }
    }
  }

  blast(origin, radius, damage) {
    this.addShake(0.95);
    this.sfx.bigBoom();
    spawnRing(this.rings, origin, 0xffb020);
    burstSparks(this.sparks, origin, 0xffb020, 28, 32, null);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.mesh.position.distanceTo(origin) <= radius + enemy.cfg.radius) {
        this.damageEnemy(enemy, damage);
      }
    }
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      if (tower.mesh.position.distanceTo(origin) <= radius) {
        this.damageTower(tower, damage);
      }
    }
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      if (ally.mesh.position.distanceTo(origin) <= radius + ally.cfg.radius) {
        this.damageAlly(ally, damage * 0.45);
      }
    }
    const playerDist = this.player.mesh.position.distanceTo(origin);
    if (playerDist <= radius * 0.82) {
      this.damagePlayer(TOWERS.silo.playerBlast);
      const away = this.v2.copy(this.player.mesh.position).sub(origin);
      if (away.lengthSq() > 0.01) {
        this.player.mesh.position.addScaledVector(away.normalize(), 9);
      }
    }
  }

  damagePlayer(amount) {
    if (this.invuln > 0 || this.state !== 'play') return;
    let rest = amount;
    if (this.shield > 0) {
      const used = Math.min(this.shield, rest);
      this.shield -= used;
      rest -= used;
    }
    if (rest > 0) this.hull -= rest;
    this.invuln = PLAYER.invuln;
    this.lastHit = this.time;
    this.playerFlash = 0.08;
    flashMaterials(this.player.mesh.userData.mats);
    this.addShake(0.28 + amount * 0.012);
    this.sfx.hurt();
    document.body.classList.add('hurt');
    clearTimeout(this.hurtTimer);
    this.hurtTimer = setTimeout(() => document.body.classList.remove('hurt'), 180);
    if (this.hull <= 0) {
      this.hull = 0;
      this.onDeath();
    }
  }

  onDeath() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.player.mesh.visible = false;
    this.bubble.visible = false;
    const pos = this.player.mesh.position.clone();
    this.fxBoom(pos, 0xff8a3a, 'big');
    this.addShake(1.15);
    this.sfx.bigBoom();
    this.commitBest();
    this.openOverlay('dead');
  }

  fxBoom(position, color, size) {
    const count = size === 'big' ? 34 : size === 'mid' ? 16 : 9;
    const speed = size === 'big' ? 30 : size === 'small' ? 12 : 18;
    burstSparks(this.sparks, position, color, count, speed, null);
    burstSparks(this.sparks, position, 0xfff6d8, Math.max(4, Math.floor(count / 3)), speed * 1.25, null);
    if (size !== 'small') spawnRing(this.rings, position, color);
  }

  addShake(amount) {
    this.shakeAmp = Math.min(1.35, this.shakeAmp + amount);
  }

  addScore(base, worldPos, useCombo) {
    let mult = 1;
    if (useCombo) {
      if (this.time < this.comboUntil) this.combo = Math.min(COMBO_MAX, this.combo + COMBO_STEP);
      else this.combo = 1;
      this.comboUntil = this.time + COMBO_WINDOW;
      mult = this.combo;
    }
    const gained = Math.round(base * mult);
    this.score += gained;
    if (worldPos) this.popup(`+${gained.toLocaleString('he-IL')}`, worldPos);
  }

  checkWaveClear() {
    if (this.state !== 'play') return;
    const enemiesAlive = this.enemies.some((enemy) => enemy.alive);
    if (this.queue.length || enemiesAlive) {
      this.restAt = 0;
      return;
    }
    if (!this.restAt) this.restAt = this.time + 2;
    if (this.time >= this.restAt) {
      this.restAt = 0;
      this.addScore(WAVE_BONUS * this.wave, this.player.mesh.position.clone(), false);
      this.beginWave();
    }
  }

  beginWave() {
    this.wave += 1;
    const spec = waveSpec(this.wave);
    const types = [];
    for (const [type, count] of Object.entries(spec)) {
      for (let i = 0; i < count; i += 1) types.push(type);
    }
    for (let i = types.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    let at = this.time + 0.85;
    this.queue = types.map((type) => {
      const job = { type, at };
      at += 0.38;
      return job;
    });
    const named = types.includes('vorak') ? ` · ${T.enemyNames.vorak}` : '';
    this.showBanner(`${T.wave} ${this.wave}${named}`);
    if (this.wave === 1) this.showToast(T.wingWithYou);
    this.sfx.wave();
    if (this.wave > 1 && this.wave % 2 === 0) this.spawnBonusStructures();
  }

  spawnBonusStructures() {
    const occupied = this.towers.filter((tower) => tower.alive).map((tower) => tower.mesh.position);
    const types = ['crate', 'crate', 'crate', 'spire', 'silo'];
    for (const type of types) {
      const slot = this.towers.find((tower) => tower.bonus && !tower.alive && tower.type === type);
      if (!slot) continue;
      const pos = bonusHome(type, occupied);
      slot.home.copy(pos);
      slot.mesh.position.copy(pos);
      slot.hp = slot.maxHp;
      slot.alive = true;
      slot.mesh.visible = true;
      slot.fireCd = 0.6;
      restoreMaterials(slot.mesh.userData.mats);
      occupied.push(slot.mesh.position);
    }
  }

  updateBar(entity) {
    const bar = entity.mesh.userData.bar;
    if (!bar) return;
    if (!entity.alive || entity.hp >= entity.maxHp) {
      bar.group.visible = false;
      return;
    }
    bar.group.visible = true;
    const ratio = Math.max(0, entity.hp / entity.maxHp);
    bar.fg.scale.x = Math.max(0.04, ratio);
    bar.fgMat.color.setHex(ratio > 0.45 ? 0x5ee08a : 0xff5d6e);
    bar.group.lookAt(this.camera.position);
  }

  updateStarParallax() {
    this.stars.position.copy(this.player.mesh.position);
    this.dust.position.copy(this.player.mesh.position).multiplyScalar(0.48);
    this.stars.rotation.y = this.state === 'menu' ? this.time * 0.02 : 0;
  }

  updateCameraMenu() {
    const angle = this.time * 0.18;
    this.camera.position.set(Math.sin(angle) * 26, 7.2 + Math.sin(this.time * 0.7) * 0.4, Math.cos(angle) * 26);
    this.camera.lookAt(0, 0.7, 0);
    this.dampFov(52);
  }

  updateChaseCamera(dt) {
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    this.upV.set(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    const back = 20 + (this.speed / PLAYER.boost) * 6;
    this.camDesired.copy(this.player.mesh.position).addScaledVector(this.nose, -back).addScaledVector(this.upV, 5.4);
    const blend = 1 - Math.exp(-3.5 * dt);
    this.camera.position.lerp(this.camDesired, blend);
    this.look.copy(this.player.mesh.position).addScaledVector(this.nose, 34);
    this.camera.lookAt(this.look);
    if (this.shakeAmp > 0) {
      const mag = this.reduceMotion ? this.shakeAmp * 0.15 : this.shakeAmp;
      this.camera.position.x += (Math.random() - 0.5) * mag;
      this.camera.position.y += (Math.random() - 0.5) * mag * 0.7;
      this.shakeAmp = Math.max(0, this.shakeAmp - dt * 1.7);
    }
    this.dampFov(this.boosting && this.state === 'play' ? 78 : 66);
  }

  dampFov(target) {
    const before = this.camera.fov;
    this.camera.fov += (target - this.camera.fov) * 0.08;
    if (Math.abs(this.camera.fov - before) > 0.01) this.camera.updateProjectionMatrix();
  }

  updatePopups(dt) {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    for (let i = this.popups.length - 1; i >= 0; i -= 1) {
      const popup = this.popups[i];
      popup.age += dt;
      popup.rise += dt * 36;
      if (popup.age > 0.85) {
        popup.el.remove();
        this.popups.splice(i, 1);
        continue;
      }
      const screen = this.project(popup.pos, width, height);
      if (!screen) {
        popup.el.style.opacity = '0';
        continue;
      }
      popup.el.style.opacity = String(1 - popup.age / 0.85);
      popup.el.style.left = `${screen.x}px`;
      popup.el.style.top = `${screen.y - popup.rise}px`;
    }
  }

  project(pos, width, height) {
    this.v3.copy(pos).sub(this.camera.position);
    this.v2.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    if (this.v3.dot(this.v2) <= 1) return null;
    this.v1.copy(pos).project(this.camera);
    if (this.v1.z > 1) return null;
    return {
      x: (this.v1.x * 0.5 + 0.5) * width,
      y: (-this.v1.y * 0.5 + 0.5) * height,
    };
  }

  popup(text, worldPos) {
    if (this.popups.length > 14) return;
    const el = document.createElement('div');
    el.className = 'popup';
    el.textContent = text;
    this.dom.popups.appendChild(el);
    this.popups.push({
      el,
      pos: worldPos.clone(),
      age: 0,
      rise: 0,
    });
  }

  drawRadar() {
    const canvas = this.dom.radar;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.44;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 10, 20, 0.62)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(46, 230, 199, 0.85)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(46, 230, 199, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const yaw = this.yaw;
    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const range = 200;
    const plot = (x, z, color, size) => {
      const dx = x - px;
      const dz = z - pz;
      const localRight = dx * rightX + dz * rightZ;
      const localFwd = dx * fwdX + dz * fwdZ;
      const sx = cx + (localRight / range) * radius;
      const sy = cy - (localFwd / range) * radius;
      const ox = sx - cx;
      const oy = sy - cy;
      if (ox * ox + oy * oy > radius * radius) return;
      ctx.fillStyle = color;
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    };

    for (const tower of this.towers) {
      if (!tower.alive) continue;
      const color = {
        silo: '#ffb020',
        nest: '#ff4d6a',
        spire: '#7ad7ff',
        crate: '#f0d2a0',
      }[tower.type];
      plot(tower.mesh.position.x, tower.mesh.position.z, color, 5);
    }
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const mark = enemy.type === 'vorak' ? ['#e7a15a', 9] : ['#ff4d8d', 4];
      plot(enemy.mesh.position.x, enemy.mesh.position.z, mark[0], mark[1]);
    }
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      const color = {
        escort: '#7eb2ff',
        drone: '#2ee6c7',
        mend: '#3dde62',
        ward: '#d7fff4',
      }[ally.type];
      plot(ally.mesh.position.x, ally.mesh.position.z, color, ally.type === 'escort' ? 4 : 3);
    }
    ctx.fillStyle = '#2ee6c7';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }

  syncHud() {
    const hullRatio = Math.max(0, this.hull / PLAYER.hull);
    const shieldRatio = Math.max(0, this.shield / PLAYER.shield);
    this.dom.hullBar.style.width = `${hullRatio * 100}%`;
    this.dom.shieldBar.style.width = `${shieldRatio * 100}%`;
    this.dom.hullBar.parentElement.classList.toggle('low', hullRatio < 0.3 && hullRatio > 0);
    this.dom.score.textContent = Math.floor(this.score).toLocaleString('he-IL');
    this.dom.wave.textContent = String(this.wave);
    this.dom.combo.textContent = this.combo > 1 ? `${T.combo} ×${this.combo.toFixed(2)}` : '';
    if (this.dom.allies && this.allies) {
      const alive = this.allies.reduce((sum, ally) => sum + (ally.alive ? 1 : 0), 0);
      this.dom.allies.textContent = `${T.allies} ${alive}`;
    }
    const rapidLeft = this.rapidUntil - this.time;
    const spreadLeft = this.spreadUntil - this.time;
    const parts = [];
    if (rapidLeft > 0) parts.push(`${T.weaponRapid} ${Math.ceil(rapidLeft)}`);
    if (spreadLeft > 0) parts.push(`${T.weaponSpread} ${Math.ceil(spreadLeft)}`);
    this.dom.weapon.textContent = parts.length ? parts.join(' · ') : `${T.weapon}: ${T.weaponNormal}`;
    this.dom.flight.textContent = this.boosting ? T.boost : this.braking ? T.brake : T.cruise;
    this.dom.edge.classList.toggle('show', this.edge > 0);
  }

  syncVisibility() {
    const menu = this.state === 'menu';
    const playing = this.state === 'play';
    this.dom.menu.hidden = !menu;
    this.dom.hud.hidden = menu;
    this.dom.radar.hidden = menu;
    document.querySelector('#flight-row').hidden = menu;
    this.dom.crosshair.hidden = !playing;
    this.dom.overlay.hidden = this.state !== 'paused' && this.state !== 'dead';
    document.body.classList.toggle('playing', playing);
  }

  openOverlay(mode) {
    this.dom.overlayTitle.textContent = mode === 'dead' ? T.gameOver : T.pause;
    this.dom.resumeBtn.hidden = mode === 'dead';
    if (mode === 'dead') {
      const rows = [
        [T.score, Math.floor(this.score).toLocaleString('he-IL')],
        [T.best, Math.floor(this.best).toLocaleString('he-IL')],
        [T.wave, String(this.wave)],
        [T.enemiesDown, String(this.kills)],
        [T.towersDown, String(this.structures)],
      ];
      this.dom.overlayBody.replaceChildren();
      if (this.newBest) {
        const banner = document.createElement('p');
        banner.className = 'new-best';
        banner.textContent = T.newBest;
        this.dom.overlayBody.appendChild(banner);
      }
      for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'stat';
        const name = document.createElement('span');
        name.textContent = label;
        const num = document.createElement('b');
        num.dir = 'ltr';
        num.textContent = value;
        row.append(name, num);
        this.dom.overlayBody.appendChild(row);
      }
    } else {
      this.dom.overlayBody.replaceChildren();
      const list = document.createElement('ul');
      for (const line of T.controls) {
        const item = document.createElement('li');
        item.textContent = line;
        list.appendChild(item);
      }
      this.dom.overlayBody.appendChild(list);
    }
    this.syncVisibility();
    this.syncHud();
  }

  showBanner(text) {
    const el = this.dom.banner;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  showToast(text) {
    const el = this.dom.toast;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  togglePause() {
    if (this.state === 'play') {
      this.state = 'paused';
      this.sfx.ui();
      this.openOverlay('paused');
      return;
    }
    if (this.state === 'paused') {
      this.state = 'play';
      this.fireLock = this.time + 0.2;
      this.sfx.ui();
      this.syncVisibility();
    }
  }

  toggleMute() {
    this.sfx.unlock();
    const muted = this.sfx.toggle();
    this.dom.muteBtn.textContent = muted ? T.mute : T.sound;
    this.sfx.ui();
  }

  startMission() {
    if (!this.renderer) return;
    this.sfx.unlock();
    this.sfx.ui();
    this.reset('play');
  }

  showMenu() {
    if (!this.renderer) return;
    this.sfx.ui();
    this.reset('menu');
  }

  reset(next) {
    this.state = next;
    this.score = 0;
    this.combo = 1;
    this.comboUntil = 0;
    this.wave = 0;
    this.queue = [];
    this.restAt = 0;
    this.kills = 0;
    this.structures = 0;
    this.time = 0;
    this.fireCd = 0;
    this.fireLock = 0.45;
    this.rapidUntil = 0;
    this.spreadUntil = 0;
    this.invuln = 0;
    this.lastHit = -999;
    this.hull = PLAYER.hull;
    this.shield = PLAYER.shield;
    this.yaw = next === 'menu' ? 0.4 : 0;
    this.pitch = next === 'menu' ? 0.22 : 0;
    this.bank = 0;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.speed = next === 'play' ? PLAYER.cruise : 0;
    this.boosting = false;
    this.braking = false;
    this.pointer.ready = next !== 'play';
    this.pointer.armed = false;
    this.pointer.fire = false;
    this.dom.banner.classList.remove('show');
    this.dom.toast.classList.remove('show');
    this.shakeAmp = 0;
    this.edge = 0;
    this.playerFlash = 0;
    this.player.mesh.visible = true;
    this.player.mesh.position.set(0, 0, 0);
    this.applyAttitude();
    restoreMaterials(this.player.mesh.userData.mats);
    document.body.classList.remove('hurt');

    for (const enemy of this.enemies) {
      enemy.alive = false;
      enemy.mesh.visible = false;
      enemy.mesh.position.set(0, -999, 0);
      if (enemy.mesh.userData.bar) enemy.mesh.userData.bar.group.visible = false;
    }
    for (const ally of this.allies) {
      ally.alive = true;
      ally.hp = ally.maxHp;
      ally.respawn = 0;
      ally.fireCd = Math.random() * 0.35;
      ally.hitCd = 0;
      ally.healCd = 0.5;
      ally.pulseCd = 1.5;
      ally.flash = 0;
      ally.vel.set(0, 0, 0);
      ally.mesh.visible = true;
      restoreMaterials(ally.mesh.userData.mats);
      if (ally.mesh.userData.bar) ally.mesh.userData.bar.group.visible = false;
      this.placeAlly(ally);
    }
    for (const bolt of this.playerBolts.concat(this.enemyBolts)) this.killBolt(bolt);
    for (const pickup of this.pickups) {
      pickup.alive = false;
      pickup.mesh.visible = false;
    }
    for (const tower of this.towers) {
      if (tower.bonus) {
        tower.alive = false;
        tower.mesh.visible = false;
      } else {
        tower.alive = true;
        tower.hp = tower.maxHp;
        tower.mesh.visible = true;
        tower.mesh.position.copy(tower.home);
        tower.fireCd = Math.random();
        restoreMaterials(tower.mesh.userData.mats);
        if (tower.mesh.userData.bar) tower.mesh.userData.bar.group.visible = false;
      }
    }
    for (const popup of this.popups) popup.el.remove();
    this.popups = [];
    if (next === 'play') this.beginWave();
    this.syncVisibility();
    this.syncHud();
    this.updateMenuBest();
  }

  readBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch (err) {
      return 0;
    }
  }

  commitBest() {
    const prev = this.readBest();
    this.newBest = this.score > prev && this.score > 0;
    this.best = Math.max(prev, this.score);
    try {
      localStorage.setItem(BEST_KEY, String(Math.floor(this.best)));
    } catch (err) {
      /* private mode */
    }
  }

  updateMenuBest() {
    this.dom.menuBest.textContent = this.best > 0
      ? `${T.best} ${Math.floor(this.best).toLocaleString('he-IL')}`
      : '';
  }

  resize() {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
