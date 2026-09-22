import * as THREE from 'three';
import { T } from './i18n.js';
import {
  ALLY,
  CARRIER,
  COMBO_MAX,
  COMBO_STEP,
  COMBO_WINDOW,
  ENEMIES,
  GIANT,
  HEAVY,
  HEAVY_ORDER,
  MISSILE,
  PLAYER,
  POOLS,
  POWER,
  SHIPS,
  TOWERS,
  WEAPONS,
  WAVE_BONUS,
  WORLD,
  waveSpec,
} from './balance.js';
import { Sfx } from './audio.js';
import { GROUND_WORLDS, GroundBattle } from './ground.js';
import { bonusHome, buildLayout } from './layout.js';
import {
  boltGeometry,
  createAlly,
  createCarrier,
  createAtomCluster,
  createGiantMissile,
  createMissile,
  createShellRound,
  createUltraBomb,
  createNetzShip,
  createOgenShip,
  createPlayerShip,
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
  createSpeedTunnel,
  createStarfield,
  makeSoftTexture,
  spawnRing,
  updateRings,
  updateSparks,
  updateSpeedTunnel,
} from './fx.js';

const BEST_KEY = 'galaxy-guardians-best';
const META_KEY = 'galaxy-guardians-meta';

function blankStick() {
  return { id: null, originX: 0, originY: 0, x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0 };
}
const PICKUP_TEXT = {
  rapid: T.pickupRapid,
  spread: T.pickupSpread,
  shield: T.pickupShield,
  repair: T.pickupRepair,
  party: T.pickupParty,
  wing: T.pickupWing,
};

function steerAxis(v) {
  const amount = Math.abs(v);
  // Wide center deadzone so resting near the crosshair flies straight.
  if (amount < 0.16) return 0;
  const scaled = (amount - 0.16) / 0.84;
  return Math.sign(v) * (Math.min(1, scaled) ** 1.25);
}

function touchAxis(v) {
  const amount = Math.abs(v);
  // The stick already applied its own deadzone. Only crush noise here.
  if (amount < 0.02) return 0;
  return Math.sign(v) * (Math.min(1, amount) ** 1.35);
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.sfx = new Sfx();
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, ready: false, armed: false, fire: false };
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    this.coarse = window.matchMedia('(pointer: coarse)').matches
      || ((navigator.maxTouchPoints || 0) > 0 && narrow);
    document.body.classList.toggle('touch', this.coarse);
    this.move = blankStick();
    this.aim = blankStick();
    this.stickBoost = false;
    this.stickBrake = false;
    this.meta = this.readMeta();
    this.firePointer = null;
    this.boostPointer = null;
    this.boostHeld = false;
    this.groundPush = false;
    this.groundLeft = false;
    this.groundRight = false;
    this.nudgeX = 0;
    this.nudgeY = 0;
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
    this.missileCd = 0;
    this.giantCd = 0;
    this.heavyIndex = 0;
    this.heavyCd = { atoms: 0, shells: 0, ultra: 0 };
    this.giftAt = 16;
    this.chain = [];
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
    this.inward = new THREE.Vector3();
    this.rightV = new THREE.Vector3();
    this.upV = new THREE.Vector3();
    this.aimAt = new THREE.Vector3();
    this.camDesired = new THREE.Vector3();
    this.look = new THREE.Vector3();

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
      weapon: document.querySelector('#weapon'),
      flight: document.querySelector('#flight'),
      pauseBtn: document.querySelector('#pause-btn'),
      muteBtn: document.querySelector('#mute-btn'),
      menuMute: document.querySelector('#menu-mute'),
      hangarTitle: document.querySelector('#hangar-title'),
      metaPoints: document.querySelector('#meta-points'),
      shipPicks: document.querySelector('#ship-picks'),
      weaponPicks: document.querySelector('#weapon-picks'),
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
      touch: document.querySelector('#touch'),
      moveStick: document.querySelector('#move-stick'),
      aimStick: document.querySelector('#aim-stick'),
      fireBtn: document.querySelector('#fire-btn'),
      missileBtn: document.querySelector('#missile-btn'),
      nukeBtn: document.querySelector('#nuke-btn'),
      giantBtn: document.querySelector('#giant-btn'),
      giantTouch: document.querySelector('#giant-touch'),
      ordnanceBtn: document.querySelector('#ordnance-btn'),
      ordnanceTouch: document.querySelector('#ordnance-touch'),
      ordnanceCycle: document.querySelector('#ordnance-cycle'),
      ordnanceCycleTouch: document.querySelector('#ordnance-cycle-touch'),
      boostBtn: document.querySelector('#boost-btn'),
      boostTouch: document.querySelector('#boost-touch'),
      groundMenu: document.querySelector('#ground-menu-btn'),
      openForest: document.querySelector('#open-forest'),
      openDesert: document.querySelector('#open-desert'),
      groundPick: document.querySelector('#ground-pick'),
      groundTitle: document.querySelector('#ground-title'),
      groundBlurb: document.querySelector('#ground-blurb'),
      groundWorlds: document.querySelector('#ground-worlds'),
      groundClose: document.querySelector('#ground-close'),
      groundHud: document.querySelector('#ground-hud'),
      groundPushBtn: document.querySelector('#ground-push'),
      groundRetreat: document.querySelector('#ground-retreat'),
      groundBack: document.querySelector('#ground-back'),
      groundSpace: document.querySelector('#ground-space'),
      worldFade: document.querySelector('#world-fade'),
      groundHoldLabel: document.querySelector('#ground-hold-label'),
      groundCaptureLabel: document.querySelector('#ground-capture-label'),
      groundTouch: document.querySelector('#ground-touch'),
      groundLeftBtn: document.querySelector('#ground-left'),
      groundRightBtn: document.querySelector('#ground-right'),
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(WORLD.background);
    this.scene.fog = new THREE.FogExp2(WORLD.background, WORLD.fog);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 4800);
    this.camera.position.set(0, 4.2, 15);

    this.soft = makeSoftTexture();
    this.stars = createStarfield(2000, 1500, 1.7);
    this.dust = createStarfield(640, 980, 2.5);
    this.farStars = createStarfield(1100, 2600, 2.1);
    this.nebulas = createNebulas(this.soft);
    this.scene.add(this.stars, this.dust, this.farStars, this.nebulas);

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
    this.speedTunnel = createSpeedTunnel();
    this.scene.add(this.speedTunnel);

    this.shipMeshes = {
      shomeret: createPlayerShip(this.soft),
      netz: createNetzShip(this.soft),
      ogen: createOgenShip(this.soft),
    };
    for (const [id, mesh] of Object.entries(this.shipMeshes)) {
      mesh.visible = false;
      mesh.scale.setScalar(SHIPS[id].scale);
      this.scene.add(mesh);
    }
    this.player = { mesh: this.shipMeshes[this.meta.ship] || this.shipMeshes.shomeret };
    this.player.mesh.visible = true;
    this.player.mesh.scale.setScalar(this.shipScale());
    this.bubble = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0x8eb6ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.player.mesh.add(this.bubble);

    this.towers = [];
    for (const spot of buildLayout()) {
      this.towers.push(this.makeTower(spot.type, spot.position, false));
    }
    this.portals = this.buildPortals();
    this.spaceLive = false;
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
          lane: new THREE.Vector3(),
          anchor: new THREE.Vector3(),
          orbit: 20,
          spin: 1,
          flash: 0,
        });
      }
    }

    this.playerBolts = this.makeBolts(POOLS.playerBolts);
    this.enemyBolts = this.makeBolts(POOLS.enemyBolts);
    this.missiles = this.makeMissiles();
    this.giants = this.makeGiants();
    this.heavy = this.makeHeavy();
    this.buildFleet();

    this.pickups = [];
    const pickupTypes = ['rapid', 'spread', 'shield', 'repair', 'party', 'wing'];
    for (let i = 0; i < POOLS.pickups; i += 1) {
      const type = pickupTypes[i % pickupTypes.length];
      const mesh = createPickup(type, this.soft);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pickups.push({ type, mesh, alive: false, life: 0 });
    }

    this.ground = new GroundBattle(this.sfx);
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
    const shipLabel = T.shipNames[this.meta.ship] || T.ship;
    dom.shipName.textContent = shipLabel;
    dom.hudShip.textContent = shipLabel;
    dom.tagline.textContent = T.tagline;
    dom.sector.textContent = T.sector;
    dom.goal.textContent = T.goal;
    const enemyList = Object.values(T.enemyNames).join(', ');
    const towerList = Object.values(T.towerNames).join(', ');
    dom.roster.textContent = `${T.enemies}: ${enemyList}. ${T.towers}: ${towerList}.`;
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
    dom.fireBtn.textContent = T.fire;
    dom.missileBtn.textContent = T.missile;
    dom.nukeBtn.textContent = T.missile;
    dom.giantBtn.textContent = T.giant;
    dom.giantTouch.textContent = T.giant;
    if (dom.ordnanceCycle) dom.ordnanceCycle.textContent = T.heavyCycle;
    if (dom.ordnanceCycleTouch) dom.ordnanceCycleTouch.textContent = T.heavyCycle;
    if (dom.ordnanceBtn) dom.ordnanceBtn.textContent = T.heavyAtoms;
    if (dom.ordnanceTouch) dom.ordnanceTouch.textContent = T.heavyAtoms;
    dom.boostBtn.textContent = T.boost;
    dom.boostTouch.textContent = T.boost;
    this.syncMuteLabel();
    if (dom.moveStick) dom.moveStick.dataset.label = T.moveStick;
    if (dom.aimStick) dom.aimStick.dataset.label = T.aimStick;
    this.paintHangar();
    dom.resumeBtn.textContent = T.resume;
    dom.restartBtn.textContent = T.restart;
    dom.menuBtn.textContent = T.menu;
    dom.edge.textContent = T.edge;
    dom.weapon.textContent = `${T.weapon}: ${T.weaponNormal}`;
    dom.flight.textContent = T.cruise;
    dom.groundMenu.textContent = T.groundBattles;
    if (dom.openForest) dom.openForest.textContent = T.openForest;
    if (dom.openDesert) dom.openDesert.textContent = T.openDesert;
    dom.groundTitle.textContent = T.groundBattles;
    dom.groundBlurb.textContent = T.groundBlurb;
    dom.groundClose.textContent = T.groundClose;
    dom.groundPushBtn.textContent = T.groundPush;
    dom.groundRetreat.textContent = T.groundRetreat;
    dom.groundBack.textContent = T.groundWorlds;
    dom.groundSpace.textContent = T.groundSpace;
    dom.groundHoldLabel.textContent = T.groundHold;
    dom.groundCaptureLabel.textContent = T.groundCapture;
    dom.groundLeftBtn.textContent = T.groundLeft;
    dom.groundRightBtn.textContent = T.groundRight;
    dom.groundWorlds.replaceChildren();
    for (const world of GROUND_WORLDS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'world-btn';
      button.dataset.world = world.id;
      button.textContent = world.name;
      const hint = document.createElement('small');
      hint.textContent = world.blurb;
      button.append(document.createElement('br'), hint);
      button.addEventListener('click', () => this.startGround(world.id));
      dom.groundWorlds.appendChild(button);
    }
  }

  bindInput() {
    const { dom } = this;
    dom.startBtn.addEventListener('click', () => this.startMission());
    dom.pauseBtn.addEventListener('click', () => this.togglePause());
    dom.muteBtn.addEventListener('click', () => this.toggleMute());
    dom.menuMute.addEventListener('click', () => this.toggleMute());
    dom.resumeBtn.addEventListener('click', () => this.togglePause());
    dom.restartBtn.addEventListener('click', () => this.startMission());
    dom.menuBtn.addEventListener('click', () => this.showMenu());
    dom.groundMenu.addEventListener('click', () => this.openGroundPick());
    if (dom.openForest) dom.openForest.addEventListener('click', () => this.startGround('forest'));
    if (dom.openDesert) dom.openDesert.addEventListener('click', () => this.startGround('desert'));
    dom.groundClose.addEventListener('click', () => this.startGround(this.ground?.world?.id || 'forest'));
    dom.groundBack.addEventListener('click', () => this.exitGround());
    dom.groundSpace.addEventListener('click', () => this.returnToSpace());
    dom.groundRetreat.addEventListener('click', () => this.ground?.retreat());
    dom.groundPushBtn.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.groundPush = true;
      this.ground?.boostPush();
    });
    dom.groundPushBtn.addEventListener('pointerup', () => { this.groundPush = false; });
    dom.groundPushBtn.addEventListener('pointercancel', () => { this.groundPush = false; });
    const holdLane = (button, side) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (side < 0) this.groundLeft = true;
        else this.groundRight = true;
      });
      button.addEventListener('pointerup', () => {
        if (side < 0) this.groundLeft = false;
        else this.groundRight = false;
      });
      button.addEventListener('pointercancel', () => {
        if (side < 0) this.groundLeft = false;
        else this.groundRight = false;
      });
    };
    holdLane(dom.groundLeftBtn, -1);
    holdLane(dom.groundRightBtn, 1);

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'Space') this.groundPush = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.groundPush = false;
      this.groundLeft = false;
      this.groundRight = false;
      this.releaseStick(true);
      this.releaseFire();
      this.releaseBoost();
    });
    window.addEventListener('pointermove', (event) => {
      if (!this.renderer || this.coarse) return;
      if (event.target instanceof Element && event.target.closest('#touch')) return;
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
      if (this.state === 'ground' || this.state === 'ground-pick') return;
      if (event.button === 2) {
        this.launchMissile();
        return;
      }
      if (this.coarse || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('button, #touch')) return;
      this.pointer.fire = true;
      this.shoot();
    });
    window.addEventListener('pointerup', (event) => this.onGlobalPointerUp(event));
    window.addEventListener('pointercancel', (event) => this.onGlobalPointerUp(event));
    this.bindJoy(this.move, dom.moveStick);
    this.bindJoy(this.aim, dom.aimStick);
    dom.fireBtn.addEventListener('pointerdown', (event) => this.onFireDown(event));
    dom.fireBtn.addEventListener('pointerup', (event) => this.onFireUp(event));
    dom.fireBtn.addEventListener('pointercancel', (event) => this.onFireUp(event));
    dom.missileBtn.addEventListener('pointerdown', (event) => this.onMissileDown(event));
    dom.nukeBtn.addEventListener('pointerdown', (event) => this.onMissileDown(event));
    dom.giantBtn.addEventListener('pointerdown', (event) => this.onGiantDown(event));
    dom.giantTouch.addEventListener('pointerdown', (event) => this.onGiantDown(event));
    for (const button of [dom.ordnanceBtn, dom.ordnanceTouch]) {
      button?.addEventListener('pointerdown', (event) => this.onHeavyDown(event));
    }
    for (const button of [dom.ordnanceCycle, dom.ordnanceCycleTouch]) {
      button?.addEventListener('pointerdown', (event) => this.onHeavyCycle(event));
    }
    for (const button of [dom.boostBtn, dom.boostTouch]) {
      button.addEventListener('pointerdown', (event) => this.onBoostDown(event));
      button.addEventListener('pointerup', (event) => this.onBoostUp(event));
      button.addEventListener('pointercancel', (event) => this.onBoostUp(event));
    }
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  onGlobalPointerUp(event) {
    if (this.move.id === event.pointerId) this.releaseJoy(this.move, false);
    if (this.aim.id === event.pointerId) this.releaseJoy(this.aim, false);
    if (this.firePointer === event.pointerId) {
      this.releaseFire();
      return;
    }
    if (this.boostPointer === event.pointerId) this.releaseBoost();
    if (!this.coarse && this.firePointer == null) this.pointer.fire = false;
  }

  bindJoy(stick, root) {
    stick.root = root;
    stick.base = root.querySelector('.stick-base');
    stick.knob = root.querySelector('.stick-knob');
    root.addEventListener('pointerdown', (event) => this.onJoyDown(stick, event));
    root.addEventListener('pointermove', (event) => this.onJoyMove(stick, event));
    root.addEventListener('pointerup', (event) => this.onJoyUp(stick, event));
    root.addEventListener('pointercancel', (event) => this.onJoyUp(stick, event));
  }

  onJoyDown(stick, event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    try { stick.root.setPointerCapture(event.pointerId); } catch (err) { /* already released */ }
    const rect = stick.root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const shiftX = THREE.MathUtils.clamp(event.clientX - cx, -28, 28);
    const shiftY = THREE.MathUtils.clamp(event.clientY - cy, -28, 28);
    stick.id = event.pointerId;
    stick.originX = cx + shiftX;
    stick.originY = cy + shiftY;
    stick.base.style.transform = `translate(calc(-50% + ${shiftX}px), calc(-50% + ${shiftY}px))`;
    this.applyJoy(stick, event.clientX, event.clientY);
  }

  onJoyMove(stick, event) {
    if (stick.id !== event.pointerId) return;
    event.preventDefault();
    this.applyJoy(stick, event.clientX, event.clientY);
  }

  onJoyUp(stick, event) {
    if (stick.id !== event.pointerId) return;
    this.releaseJoy(stick, false);
  }

  applyJoy(stick, clientX, clientY) {
    const maxThrow = 64;
    const dead = 0.3;
    let dx = clientX - stick.originX;
    let dy = clientY - stick.originY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxThrow) {
      dx = (dx / dist) * maxThrow;
      dy = (dy / dist) * maxThrow;
    }
    stick.px = dx;
    stick.py = dy;
    let nx = dx / maxThrow;
    let ny = dy / maxThrow;
    const mag = Math.hypot(nx, ny);
    if (mag < dead) {
      nx = 0;
      ny = 0;
    } else {
      const scaled = (mag - dead) / (1 - dead);
      nx *= scaled / mag;
      ny *= scaled / mag;
    }
    stick.tx = nx;
    stick.ty = ny;
    stick.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  releaseJoy(stick, snap) {
    stick.id = null;
    stick.tx = 0;
    stick.ty = 0;
    if (stick.base) stick.base.style.transform = 'translate(-50%, -50%)';
    if (snap) {
      stick.x = 0;
      stick.y = 0;
      stick.px = 0;
      stick.py = 0;
      if (stick.knob) stick.knob.style.transform = 'translate(-50%, -50%)';
    }
  }

  releaseStick(snap) {
    this.releaseJoy(this.move, snap);
    this.releaseJoy(this.aim, snap);
    this.stickBoost = false;
    this.stickBrake = false;
  }

  onFireDown(event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    try { this.dom.fireBtn.setPointerCapture(event.pointerId); } catch (err) { /* already released */ }
    this.firePointer = event.pointerId;
    this.pointer.fire = true;
    this.shoot();
  }

  onFireUp(event) {
    if (this.firePointer != null && event.pointerId !== this.firePointer) return;
    this.releaseFire();
  }

  releaseFire() {
    this.firePointer = null;
    this.pointer.fire = false;
  }

  onBoostDown(event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (err) { /* already released */ }
    this.boostPointer = event.pointerId;
    this.boostHeld = true;
  }

  onBoostUp(event) {
    if (this.boostPointer != null && event.pointerId !== this.boostPointer) return;
    this.releaseBoost();
  }

  releaseBoost() {
    this.boostPointer = null;
    this.boostHeld = false;
  }

  onMissileDown(event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    this.launchMissile();
  }

  onGiantDown(event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    this.launchGiant();
  }

  smoothStick(dt) {
    this.easeJoy(this.move, dt);
    this.easeJoy(this.aim, dt);
  }

  easeJoy(stick, dt) {
    const follow = 1 - Math.exp(-14 * dt);
    stick.x += (stick.tx - stick.x) * follow;
    stick.y += (stick.ty - stick.y) * follow;
    if (stick.id == null) {
      const back = 1 - Math.exp(-18 * dt);
      stick.px += -stick.px * back;
      stick.py += -stick.py * back;
      if (Math.hypot(stick.x, stick.y) < 0.01) {
        stick.x = 0;
        stick.y = 0;
      }
      if (stick.knob) {
        stick.knob.style.transform = `translate(calc(-50% + ${stick.px}px), calc(-50% + ${stick.py}px))`;
      }
    }
  }

  aimNudge() {
    const mesh = this.player.mesh;
    this.nose.set(0, 0, -1).applyQuaternion(mesh.quaternion);
    this.rightV.set(1, 0, 0).applyQuaternion(mesh.quaternion);
    this.upV.set(0, 1, 0).applyQuaternion(mesh.quaternion);
    const origin = mesh.position;
    let best = Infinity;
    let found = false;
    const consider = (pos) => {
      this.v1.copy(pos).sub(origin);
      const dist = this.v1.length();
      if (dist < 14 || dist > 180 || dist >= best) return;
      this.v1.multiplyScalar(1 / dist);
      if (this.nose.dot(this.v1) < 0.8) return;
      best = dist;
      this.aimAt.copy(this.v1);
      found = true;
    };
    for (const enemy of this.enemies) {
      if (enemy.alive) consider(enemy.mesh.position);
    }
    for (const tower of this.towers) {
      if (tower.alive) consider(tower.mesh.position);
    }
    if (!found) {
      this.nudgeX = 0;
      this.nudgeY = 0;
      return;
    }
    this.nudgeX = THREE.MathUtils.clamp(this.rightV.dot(this.aimAt) * 2.4, -0.65, 0.65);
    this.nudgeY = THREE.MathUtils.clamp(-this.upV.dot(this.aimAt) * 2.1, -0.45, 0.45);
  }

  onKeyDown(event) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    if (this.state === 'ground-pick') {
      if (event.code === 'KeyM') this.toggleMute();
      return;
    }
    if (this.state === 'ground') {
      if (event.code === 'KeyM') {
        this.toggleMute();
        return;
      }
      if (event.code === 'Escape') {
        this.exitGround();
        return;
      }
      if (event.code === 'Space') {
        this.ground?.boostPush();
        this.groundPush = true;
        return;
      }
      if (event.code === 'KeyG') {
        this.ground?.retreat();
        return;
      }
      this.keys.add(event.code);
      return;
    }
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
    if (event.code === 'KeyF' && this.state === 'play') {
      this.launchMissile();
      return;
    }
    if (event.code === 'KeyQ' && this.state === 'play') {
      this.launchGiant();
      return;
    }
    if (event.code === 'KeyE' && this.state === 'play') {
      this.launchHeavy();
      return;
    }
    if (event.code === 'KeyC' && this.state === 'play') {
      this.cycleHeavy();
      return;
    }
    if (event.code === 'KeyR' && (this.state === 'dead' || this.state === 'paused')) {
      this.startMission();
      return;
    }
    this.keys.add(event.code);
  }

  onConfirm() {
    if (this.state === 'ground' || this.state === 'ground-pick') return;
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

  makeGiants() {
    const missiles = [];
    for (let i = 0; i < 3; i += 1) {
      const mesh = createGiantMissile();
      mesh.visible = false;
      this.scene.add(mesh);
      missiles.push({
        mesh,
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
      });
    }
    return missiles;
  }

  makeMissiles() {
    const missiles = [];
    for (let i = 0; i < 4; i += 1) {
      const mesh = createMissile();
      mesh.visible = false;
      this.scene.add(mesh);
      missiles.push({
        mesh,
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
      });
    }
    return missiles;
  }

  launchMissile() {
    if (this.state !== 'play' || !this.missiles || this.missileCd > 0) return;
    const missile = this.missiles.find((item) => !item.alive);
    if (!missile) return;
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    const origin = this.v2.copy(this.player.mesh.position).addScaledVector(this.nose, 8 * this.shipScale());
    missile.alive = true;
    missile.life = MISSILE.life;
    missile.pos.copy(origin);
    missile.vel.copy(this.nose).multiplyScalar(MISSILE.speed);
    missile.mesh.visible = true;
    missile.mesh.position.copy(origin);
    missile.mesh.scale.setScalar(MISSILE.visualScale);
    this.missileCd = MISSILE.cooldown;
    this.sfx.missile();
    burstSparks(this.sparks, origin, 0xff7a22, 6, 14, this.nose, 0.7, 0.8);
  }

  launchGiant() {
    if (this.state !== 'play' || !this.giants || this.giantCd > 0) return;
    const missile = this.giants.find((item) => !item.alive);
    if (!missile) return;
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    const origin = this.v2.copy(this.player.mesh.position).addScaledVector(this.nose, 8 * this.shipScale());
    missile.alive = true;
    missile.life = GIANT.life;
    missile.pos.copy(origin);
    missile.vel.copy(this.nose).multiplyScalar(GIANT.speed);
    missile.mesh.visible = true;
    missile.mesh.position.copy(origin);
    missile.mesh.scale.setScalar(GIANT.visualScale);
    this.giantCd = GIANT.cooldown;
    this.sfx.missile();
    burstSparks(this.sparks, origin, 0xffc14a, 10, 18, this.nose, 1.4, 1.1);
  }

  makeHeavy() {
    const pools = {
      atoms: { factory: createAtomCluster, count: 4 },
      shells: { factory: createShellRound, count: 3 },
      ultra: { factory: createUltraBomb, count: 2 },
    };
    const heavy = {};
    for (const [id, spec] of Object.entries(pools)) {
      heavy[id] = [];
      for (let i = 0; i < spec.count; i += 1) {
        const mesh = spec.factory();
        mesh.visible = false;
        this.scene.add(mesh);
        heavy[id].push({
          mesh,
          alive: false,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          life: 0,
        });
      }
    }
    return heavy;
  }

  heavyKind() {
    return HEAVY_ORDER[this.heavyIndex] || 'atoms';
  }

  heavyLabel(id, cooling) {
    const name = {
      atoms: T.heavyAtoms,
      shells: T.heavyShells,
      ultra: T.heavyUltraShort,
    }[id] || T.heavyAtoms;
    return cooling ? `${name} ${Math.ceil(this.heavyCd[id])}` : name;
  }

  clearHeavy() {
    if (!this.heavy) return;
    for (const id of HEAVY_ORDER) {
      for (const shot of this.heavy[id]) {
        shot.alive = false;
        shot.mesh.visible = false;
      }
    }
  }

  cycleHeavy() {
    if (this.state !== 'play') return;
    this.heavyIndex = (this.heavyIndex + 1) % HEAVY_ORDER.length;
    const id = this.heavyKind();
    const full = id === 'ultra' ? T.heavyUltra : this.heavyLabel(id, false);
    this.showToast(full);
  }

  launchHeavy() {
    if (this.state !== 'play' || !this.heavy) return;
    const id = this.heavyKind();
    const spec = HEAVY[id];
    if (this.heavyCd[id] > 0) return;
    const shot = this.heavy[id].find((item) => !item.alive);
    if (!shot) return;
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    const origin = this.v2.copy(this.player.mesh.position).addScaledVector(this.nose, 8 * this.shipScale());
    shot.alive = true;
    shot.life = spec.life;
    shot.pos.copy(origin);
    shot.vel.copy(this.nose).multiplyScalar(spec.speed);
    shot.mesh.visible = true;
    shot.mesh.position.copy(origin);
    shot.mesh.scale.setScalar(spec.visualScale);
    this.heavyCd[id] = spec.cooldown;
    if (id === 'atoms') this.sfx.blip?.({ freq: 520, dur: 0.08, type: 'sine', vol: 0.05, slide: 80 });
    else this.sfx.missile();
    burstSparks(this.sparks, origin, id === 'shells' ? 0xffc14a : 0x7af0ff, 8, 12, this.nose, 0.8, 0.7);
  }

  onHeavyDown(event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    this.launchHeavy();
  }

  onHeavyCycle(event) {
    if (this.state !== 'play') return;
    event.preventDefault();
    event.stopPropagation();
    this.cycleHeavy();
  }

  updateMissiles(dt) {
    this.stepOrdnance(this.missiles, dt, MISSILE.visualScale, 0xff6a1a, (pos) => this.detonateMissile(pos));
    this.stepOrdnance(this.giants, dt, GIANT.visualScale, 0xffc14a, (pos) => this.detonateGiant(pos));
    if (this.heavy) {
      for (const id of HEAVY_ORDER) {
        const spec = HEAVY[id];
        this.stepOrdnance(this.heavy[id], dt, spec.visualScale, id === 'shells' ? 0xffc14a : 0x7af0ff, (pos) => {
          this.detonateHeavy(id, pos);
        });
      }
    }
    this.updateChain();
  }

  stepOrdnance(list, dt, scale, trailColor, onBoom) {
    if (!list) return;
    for (const missile of list) {
      if (!missile.alive) continue;
      missile.life -= dt;
      missile.pos.addScaledVector(missile.vel, dt);
      missile.mesh.position.copy(missile.pos);
      this.v3.copy(missile.pos).add(missile.vel);
      missile.mesh.lookAt(this.v3);
      missile.mesh.scale.setScalar(scale);
      const spinner = missile.mesh.userData.spinner;
      if (spinner) spinner.rotation.y += dt * 5;
      const trail = this.v1.copy(missile.vel).multiplyScalar(-1);
      if (trail.lengthSq() > 0.001) trail.normalize();
      if (Math.random() < 0.35) {
        burstSparks(this.sparks, missile.pos, trailColor, 1, 6, trail, 0.45, 0.7);
      }
      if (missile.life > 0) continue;
      const pos = missile.pos.clone();
      missile.alive = false;
      missile.mesh.visible = false;
      onBoom(pos);
    }
  }

  detonateMissile(origin) {
    this.sfx.missileBoom();
    this.addShake(1.3);
    const up = this.v2.set(0, 1, 0);
    // The dart blooms far beyond the fog. Draw the mushroom ahead of the camera
    // so the burst stays readable, and still apply damage at the true end point.
    const toBurst = this.v3.copy(origin).sub(this.camera.position);
    const dist = Math.max(toBurst.length(), 0.001);
    const visual = this.camera.position.clone().addScaledVector(toBurst.multiplyScalar(1 / dist), Math.min(dist, 240));
    burstSparks(this.sparks, visual, 0xfff6d2, 36, 40, up, 4.2, 1.6);
    burstSparks(this.sparks, visual, 0xff8a22, 42, 55, null, 5.5, 1.5);
    spawnRing(this.rings, visual, 0xfff6d2, { life: 0.85, grow: 220, scale: 2.4 });
    spawnRing(this.rings, visual, 0xff7a18, { life: 1.15, grow: 340, scale: 3.2 });
    for (let i = 1; i <= 4; i += 1) {
      const stem = visual.clone().addScaledVector(up, i * 10);
      spawnRing(this.rings, stem, i > 2 ? 0xfff2c4 : 0xff9a3c, {
        life: 0.8,
        grow: 90 + i * 40,
        scale: 1.4 + i * 0.2,
      });
    }
    const cap = visual.clone().addScaledVector(up, 48);
    spawnRing(this.rings, cap, 0xfff6d2, { life: 1.05, grow: 200, scale: 6 });
    spawnRing(this.rings, cap, 0xff5a22, { life: 0.9, grow: 140, scale: 4 });
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.mesh.position.distanceTo(origin) <= MISSILE.blast + enemy.cfg.radius) {
        this.damageEnemy(enemy, MISSILE.damage, true);
      }
    }
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      if (tower.mesh.position.distanceTo(origin) <= MISSILE.blast + tower.radius) {
        this.damageTower(tower, MISSILE.damage, true);
      }
    }
    const foe = this.carriers && this.carriers.enemy;
    if (foe && foe.alive && foe.mesh.position.distanceTo(origin) <= MISSILE.blast + foe.radius) {
      this.damageCarrier(foe, MISSILE.damage);
    }
  }

  detonateHeavy(id, origin) {
    const spec = HEAVY[id];
    const palettes = {
      atoms: [0x7af0ff, 0xffe08a, 0xff8ad8, 0xb8ff7a],
      shells: [0xffc14a, 0xfff6d2],
      ultra: [0xfff3b0, 0xff7ad9, 0x7af0ff, 0xffe08a],
    };
    this.sfx.missileBoom();
    this.addShake(spec.shake);
    const colors = palettes[id] || palettes.atoms;
    colors.forEach((color, index) => {
      burstSparks(this.sparks, origin, color, id === 'ultra' ? 18 : 10, 16 + index * 4, null, 1.4 + index * 0.35, 1.1);
      spawnRing(this.rings, origin, color, {
        life: 0.55 + index * 0.12,
        grow: spec.blast * (0.45 + index * 0.22),
        scale: 1.2 + index * 0.45,
      });
    });
    if (id === 'ultra') {
      const up = this.v2.set(0, 1, 0);
      const cap = origin.clone().addScaledVector(up, 18);
      spawnRing(this.rings, cap, 0xfff6d2, { life: 0.9, grow: 220, scale: 4.2 });
    }
    this.blastAround(origin, spec.blast, spec.damage);
  }

  blastAround(origin, blast, damage) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.mesh.position.distanceTo(origin) <= blast + enemy.cfg.radius) {
        this.damageEnemy(enemy, damage, true);
      }
    }
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      if (tower.mesh.position.distanceTo(origin) <= blast + tower.radius) {
        this.damageTower(tower, damage, true);
      }
    }
    const foe = this.carriers && this.carriers.enemy;
    if (foe && foe.alive && foe.mesh.position.distanceTo(origin) <= blast + foe.radius) {
      this.damageCarrier(foe, damage);
    }
  }

  detonateGiant(origin) {
    this.sfx.missileBoom();
    this.addShake(0.7);
    burstSparks(this.sparks, origin, 0xffc14a, 28, 36, null, 3.2, 1.4);
    burstSparks(this.sparks, origin, 0xfff6d2, 16, 28, null, 2.2, 1.2);
    spawnRing(this.rings, origin, 0xffc14a, { life: 0.7, grow: 260, scale: 2.4 });
    spawnRing(this.rings, origin, 0xfff6d2, { life: 0.5, grow: 160, scale: 1.6 });
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.mesh.position.distanceTo(origin) <= GIANT.blast + enemy.cfg.radius) {
        this.damageEnemy(enemy, GIANT.damage, true);
      }
    }
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      if (tower.mesh.position.distanceTo(origin) <= GIANT.blast + tower.radius) {
        this.damageTower(tower, GIANT.damage, true);
      }
    }
    const foe = this.carriers && this.carriers.enemy;
    if (foe && foe.alive && foe.mesh.position.distanceTo(origin) <= GIANT.blast + foe.radius) {
      this.damageCarrier(foe, GIANT.damage);
    }
  }

  updateChain() {
    if (!this.chain.length) return;
    for (let i = this.chain.length - 1; i >= 0; i -= 1) {
      const event = this.chain[i];
      if (event.at > this.time) continue;
      this.chain.splice(i, 1);
      burstSparks(this.sparks, event.pos, event.color, event.size === 'small' ? 8 : 14, 28, null, event.size === 'big' ? 3.4 : 2.2, 1.3);
      burstSparks(this.sparks, event.pos, 0xfff6d8, 6, 22, null, 1.8, 1.1);
      spawnRing(this.rings, event.pos, event.color, {
        life: 0.36,
        grow: event.size === 'big' ? 90 : 58,
        scale: 1.4,
      });
    }
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
    if (this.state === 'ground-pick') {
      this.render();
      return;
    }
    if (this.state === 'ground') {
      this.ground?.update(dt, {
        left: this.groundLeft || this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
        right: this.groundRight || this.keys.has('KeyD') || this.keys.has('ArrowRight'),
        push: this.groundPush || this.keys.has('Space'),
        stick: this.coarse ? this.move.x : 0,
      });
      this.render();
      return;
    }
    if (this.state === 'paused') {
      this.render();
      return;
    }
    this.time += dt;
    if (this.state === 'menu') {
      this.updateShowcase(dt);
      this.updateTowers(dt, false);
      this.updateStarParallax();
      updateSparks(this.sparks, dt);
      updateRings(this.rings, this.camera, dt);
      this.updateCameraMenu(dt);
      this.updateSpeedTunnel(dt);
      this.render();
      return;
    }
    if (this.state === 'dead') {
      this.updateChain();
      updateSparks(this.sparks, dt);
      updateRings(this.rings, this.camera, dt);
      this.updateStarParallax();
      this.updateChaseCamera(dt);
      this.updateSpeedTunnel(dt);
      this.updatePopups(dt);
      this.render();
      return;
    }

    this.updatePlayer(dt);
    this.updatePortals(dt);
    this.updateQueue();
    this.updateEnemies(dt);
    this.updateFleet(dt);
    this.separateEnemies();
    this.updateTowers(dt, true);
    this.updateBolts(dt);
    this.updateMissiles(dt);
    this.updatePickups(dt);
    this.checkWaveClear();
    updateSparks(this.sparks, dt);
    updateRings(this.rings, this.camera, dt);
    this.updateStarParallax();
    this.updateChaseCamera(dt);
    this.updateSpeedTunnel(dt);
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
    let nx = 0;
    let ny = 0;
    let axis = steerAxis;
    let turn = PLAYER.turn;
    if (this.coarse) {
      this.smoothStick(dt);
      nx = this.aim.x;
      ny = this.aim.y;
      this.aimNudge();
      const stickMag = Math.min(1, Math.hypot(nx, ny));
      const gain = 0.62 * (1 - Math.min(1, stickMag * 1.15));
      nx = THREE.MathUtils.clamp(nx + this.nudgeX * gain, -1, 1);
      ny = THREE.MathUtils.clamp(ny + this.nudgeY * gain, -1, 1);
      axis = touchAxis;
      turn = PLAYER.turn * 0.68;
      this.stickBoost = this.move.y < -0.28;
      this.stickBrake = this.move.y > 0.28;
    } else if (this.pointer.ready && this.pointer.armed) {
      nx = this.pointer.x;
      ny = this.pointer.y;
    }
    if (this.keys.has('ArrowLeft')) nx -= 0.9;
    if (this.keys.has('ArrowRight')) nx += 0.9;
    if (this.keys.has('ArrowUp')) ny -= 0.9;
    if (this.keys.has('ArrowDown')) ny += 0.9;
    nx = THREE.MathUtils.clamp(nx, -1, 1);
    ny = THREE.MathUtils.clamp(ny, -1, 1);

    // Yaw is a rate so heading stays free. Positive rotation.y swings the −Z nose
    // toward world −X (left), so a rightward stick, mouse, or arrow must decrease yaw.
    // Pitch springs back to level when the cursor is centered. Touch uses a slower rate.
    this.yawVel = axis(nx) * turn;
    this.yaw -= this.yawVel * dt;
    const targetPitch = THREE.MathUtils.clamp(axis(-ny) * 0.9, -0.95, 0.95);
    this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 6, dt);
    this.bank = THREE.MathUtils.damp(this.bank, THREE.MathUtils.clamp(-this.yawVel * 0.48, -0.7, 0.7), 6, dt);
    this.applyAttitude();

    const wasBoosting = this.boosting;
    this.boosting = this.boostHeld
      || this.stickBoost
      || this.keys.has('KeyW')
      || this.keys.has('ShiftLeft')
      || this.keys.has('ShiftRight');
    if (this.boosting && !wasBoosting && this.state === 'play') {
      this.sfx.whoosh();
      spawnRing(this.rings, this.player.mesh.position, 0xe8f4ff, { life: 0.32, scale: 2.4, grow: 78 });
    }
    this.braking = this.keys.has('KeyS') || this.stickBrake;
    let targetSpeed = PLAYER.cruise;
    if (this.boosting) targetSpeed = PLAYER.boost;
    if (this.braking) targetSpeed = PLAYER.brake;
    const accel = this.boosting ? 8.5 : 2.6;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, accel, dt);

    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    this.rightV.set(1, 0, 0).applyQuaternion(this.player.mesh.quaternion);
    let strafe = 0;
    if (this.keys.has('KeyA')) strafe -= PLAYER.strafe;
    if (this.keys.has('KeyD')) strafe += PLAYER.strafe;
    if (this.coarse) strafe += this.move.x * PLAYER.strafe;
    this.player.mesh.position.addScaledVector(this.nose, this.speed * dt);
    this.player.mesh.position.addScaledVector(this.rightV, strafe * dt);
    this.foldArena(this.player.mesh.position, dt);

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.missileCd = Math.max(0, this.missileCd - dt);
    this.giantCd = Math.max(0, this.giantCd - dt);
    for (const id of HEAVY_ORDER) this.heavyCd[id] = Math.max(0, this.heavyCd[id] - dt);
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
      muzzleFlash.scale.setScalar(this.weaponSpec().muzzle * (life / 0.1));
      muzzleFlash.material.opacity = 0.95 * (life / 0.1);
      if (life <= 0) muzzleFlash.visible = false;
    }

    if (this.speed > PLAYER.cruise * 0.85) {
      const glows = this.player.mesh.userData.glows;
      glows[0].getWorldPosition(this.v1);
      this.v2.copy(this.nose).multiplyScalar(-1);
      const spray = this.boosting ? dt * 90 : dt * 28;
      if (Math.random() < spray) {
        burstSparks(this.sparks, this.v1, this.boosting ? 0xfff2a0 : 0xff8a3a, this.boosting ? 3 : 1, this.boosting ? 28 : 10, this.v2);
      }
    }
  }

  shoot() {
    if (this.state !== 'play') return;
    if (this.fireCd > 0 || this.time < this.fireLock) return;
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    const rapid = this.time < this.rapidUntil;
    const spread = this.time < this.spreadUntil;
    const weapon = this.weaponSpec();
    this.fireCd = rapid ? PLAYER.rapidDelay : weapon.delay;
    const angles = spread ? [-0.14, 0, 0.14] : weapon.angles;
    this.upV.set(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    for (const angle of angles) {
      const dir = this.v1.copy(this.nose).applyAxisAngle(this.upV, angle).normalize();
      const origin = this.v2.copy(this.player.mesh.position).addScaledVector(this.nose, 2.2 * this.shipScale());
      this.spawnBolt('player', origin, dir, weapon.speed, weapon.damage, weapon.color, 1, weapon);
      burstSparks(this.sparks, origin, weapon.color, weapon.sparks, weapon.sparkSpeed, dir, weapon.sparkScale);
      const muzzleFlash = this.player.mesh.userData.muzzleFlash;
      if (muzzleFlash) {
        muzzleFlash.visible = true;
        muzzleFlash.userData.life = 0.1;
        muzzleFlash.material.opacity = 0.95;
        muzzleFlash.scale.setScalar(weapon.muzzle);
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
    glows[0].scale.setScalar(1.2 * scale);
    glows[1].scale.setScalar(0.55 * scale);
    this.player.mesh.userData.engineLight.intensity = 1.1 * scale;
  }

  updateQueue() {
    while (this.queue.length && this.queue[0].at <= this.time) {
      const job = this.queue.shift();
      this.spawnEnemy(job.type, job);
    }
  }

  spawnEnemy(type, job = null) {
    const enemy = this.enemies.find((item) => item.type === type && !item.alive);
    if (!enemy) return;
    const pos = job?.pos ? job.pos : this.spawnAnchor();
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
    if (job?.anchor) enemy.anchor.copy(job.anchor);
    else enemy.anchor.copy(pos);
    enemy.spin = job?.spin ?? enemy.strafe;
    enemy.orbit = job?.orbit ?? (enemy.cfg.band ?? 22) + (enemy.phase % 5);
  }

  gallerySteer(enemy, desired) {
    const pos = enemy.mesh.position;
    const ax = pos.x - enemy.anchor.x;
    const az = pos.z - enemy.anchor.z;
    let radial = Math.hypot(ax, az);
    if (radial < 0.4) radial = 0.4;
    const tx = (-az / radial) * enemy.spin;
    const tz = (ax / radial) * enemy.spin;
    const error = radial - enemy.orbit;
    const pull = THREE.MathUtils.clamp(error * 0.12, -1, 1);
    desired.set(tx - (ax / radial) * pull, 0, tz - (az / radial) * pull);
    desired.y = THREE.MathUtils.clamp((enemy.anchor.y - pos.y) * 0.05, -0.4, 0.4);
    if (desired.lengthSq() > 0.0001) desired.normalize();
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
      const to = this.v1.copy(this.player.mesh.position).sub(pos);
      const dist = to.length();
      if (dist > 0.001) to.multiplyScalar(1 / dist);
      else to.set(0, 0, -1);

      enemy.phase += dt;
      const desired = this.v2;
      this.gallerySteer(enemy, desired);
      if (enemy.cfg.ai === 'maul') this.updateMaul(enemy, dist, dt);
      else if (enemy.cfg.range > 0 && dist < enemy.cfg.range) this.tryEnemyShot(enemy);

      const loiter = enemy.cfg.loiter ?? 12;
      const speed = enemy.cfg.ai === 'maul' && enemy.windup > 0 ? loiter * 0.35 : loiter;
      desired.multiplyScalar(speed);
      enemy.vel.lerp(desired, 1 - Math.exp(-2.4 * dt));
      pos.addScaledVector(enemy.vel, dt);
      const reach = pos.length();
      if (reach > WORLD.bounds - 80) {
        enemy.anchor.multiplyScalar(Math.pow(0.94, dt * 8));
        const curve = THREE.MathUtils.clamp((reach - (WORLD.bounds - 80)) / 70, 0, 1);
        pos.addScaledVector(pos, -curve * 0.45 * dt);
        if (pos.length() > WORLD.bounds - 8) pos.setLength(WORLD.bounds - 8);
      }
      pos.y = THREE.MathUtils.clamp(pos.y, -100, 140);

      if (enemy.vel.lengthSq() > 1) {
        this.v3.copy(pos).add(enemy.vel);
        enemy.mesh.lookAt(this.v3);
      }

      enemy.ramCd -= dt;
      if (dist < enemy.cfg.radius + PLAYER.radius && enemy.ramCd <= 0) {
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
    const dir = this.player.mesh.position.clone().sub(origin);
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
      const barrel = tower.mesh.userData.barrel;
      if (barrel) {
        barrel.lookAt(this.player.mesh.position);
        if (allowFire) {
          tower.fireCd -= dt;
          const dist = tower.mesh.position.distanceTo(this.player.mesh.position);
          if (tower.fireCd <= 0 && dist < TOWERS.nest.range) {
            tower.fireCd = TOWERS.nest.fireEvery * (0.9 + Math.random() * 0.2);
            const origin = new THREE.Vector3();
            tower.mesh.userData.muzzle.getWorldPosition(origin);
            const dir = this.player.mesh.position.clone().sub(origin);
            if (dir.lengthSq() > 0.01) {
              dir.normalize();
              dir.x += (Math.random() - 0.5) * 0.07;
              dir.y += (Math.random() - 0.5) * 0.07;
              dir.normalize();
              this.spawnBolt('enemy', origin, dir, TOWERS.nest.shotSpeed, TOWERS.nest.shotDamage, 0xff4d6a, TOWERS.nest.shotScale);
              this.sfx.enemyShot();
            }
          }
        }
      } else if (allowFire) {
        tower.fireCd = Math.max(0, tower.fireCd - dt);
      }
      if (tower.flash > 0) {
        tower.flash -= dt;
        if (tower.flash <= 0) restoreMaterials(tower.mesh.userData.mats);
      }
      this.updateBar(tower);
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
        const girth = bolt.girth || PLAYER.boltGirth;
        const stretch = bolt.stretch || PLAYER.boltStretch;
        bolt.mesh.scale.set(girth, girth, stretch);
      }
    }

    for (const bolt of this.playerBolts) {
      if (!bolt.alive) continue;
      let hit = false;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (bolt.pos.distanceTo(enemy.mesh.position) <= bolt.radius + enemy.cfg.radius) {
          this.damageEnemy(enemy, bolt.damage, bolt.vel);
          hit = true;
          break;
        }
      }
      const foe = this.carriers && this.carriers.enemy;
      if (!hit && foe && foe.alive && bolt.pos.distanceTo(foe.mesh.position) <= bolt.radius + foe.radius) {
        this.damageCarrier(foe, bolt.damage);
        hit = true;
      }
      if (!hit) {
        for (const tower of this.towers) {
          if (!tower.alive) continue;
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
      if (bolt.team === 'ally') {
        let hit = false;
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (bolt.pos.distanceTo(enemy.mesh.position) <= bolt.radius + enemy.cfg.radius) {
            this.damageEnemy(enemy, bolt.damage, bolt.vel);
            hit = true;
            break;
          }
        }
        const foe = this.carriers && this.carriers.enemy;
        if (!hit && foe && foe.alive && bolt.pos.distanceTo(foe.mesh.position) <= bolt.radius + foe.radius) {
          this.damageCarrier(foe, bolt.damage);
          hit = true;
        }
        if (hit) this.killBolt(bolt);
        continue;
      }
      if (bolt.pos.distanceTo(this.player.mesh.position) <= bolt.radius + PLAYER.radius) {
        this.killBolt(bolt);
        this.damagePlayer(bolt.damage);
        continue;
      }
      if (this.allies) {
        for (const ally of this.allies) {
          if (!ally.alive) continue;
          if (bolt.pos.distanceTo(ally.mesh.position) <= bolt.radius + ALLY.radius) {
            this.killBolt(bolt);
            this.damageAlly(ally, bolt.damage);
            break;
          }
        }
      }
      const friend = this.carriers && this.carriers.ally;
      if (bolt.alive && friend && friend.alive && bolt.pos.distanceTo(friend.mesh.position) <= bolt.radius + friend.radius) {
        this.killBolt(bolt);
        this.damageCarrier(friend, bolt.damage);
      }
    }
  }

  spawnBolt(team, origin, dir, speed, damage, color, scale, profile) {
    const pool = team === 'player' ? this.playerBolts : this.enemyBolts;
    const bolt = pool.find((item) => !item.alive);
    if (!bolt) return null;
    bolt.alive = true;
    bolt.team = team;
    bolt.pos.copy(origin);
    bolt.vel.copy(dir).multiplyScalar(speed);
    if (team === 'player') bolt.vel.addScaledVector(this.nose, this.speed * 0.3);
    bolt.life = team === 'player' ? (profile?.life || PLAYER.bulletLife) : 2.5;
    bolt.damage = damage;
    bolt.radius = team === 'player'
      ? (profile?.radius || PLAYER.bulletRadius)
      : PLAYER.bulletRadius * (scale || 1) * 0.45;
    bolt.girth = team === 'player' ? (profile?.girth || PLAYER.boltGirth) : 1;
    bolt.stretch = team === 'player' ? (profile?.stretch || PLAYER.boltStretch) : 1;
    bolt.mesh.visible = true;
    if (team === 'player') bolt.mesh.scale.set(bolt.girth, bolt.girth, bolt.stretch);
    else bolt.mesh.scale.setScalar(scale || 1);
    bolt.mesh.material.color.setHex(color);
    if (bolt.glow) {
      bolt.glow.material.color.setHex(color);
      const glow = team === 'player' ? 0.48 : 2.4;
      bolt.glow.scale.set(glow, glow, 1);
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
    if (this.time >= this.giftAt) {
      this.giftAt = this.time + 20;
      this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
      const ahead = this.player.mesh.position.clone().addScaledVector(this.nose, 36);
      this.spawnKind(Math.floor(this.time / 20) % 2 === 0 ? 'party' : 'wing', ahead);
    }
    for (const pickup of this.pickups) {
      if (!pickup.alive) continue;
      pickup.life -= dt;
      pickup.mesh.userData.spin.rotation.y += dt * 2.4;
      pickup.mesh.userData.spin.rotation.x += dt;
      const offset = this.v1.copy(this.player.mesh.position).sub(pickup.mesh.position);
      const dist = offset.length();
      if (dist < 26 && dist > 0.001) {
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
    this.spawnKind(null, position);
  }

  spawnKind(type, position) {
    const alive = (item) => !item.alive;
    const typed = type ? this.pickups.filter((item) => alive(item) && item.type === type) : [];
    const free = typed.length ? typed : this.pickups.filter(alive);
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
    else if (pickup.type === 'party') {
      this.addScore(POWER.partyScore, this.player.mesh.position.clone(), false);
      this.shield = Math.min(PLAYER.shield, this.shield + POWER.partyShield);
      this.invuln = Math.max(this.invuln, 1.6);
      burstSparks(this.sparks, this.player.mesh.position, 0xfff1a8, 16, 22, null, 1.2, 1);
    }     else if (pickup.type === 'wing') {
      let called = 0;
      if (this.carriers?.ally?.alive) {
        for (const ally of this.allies || []) {
          if (ally.alive) continue;
          this.launchAlly(ally);
          called += 1;
          if (called >= POWER.wingCall) break;
        }
      }
    } else this.hull = Math.min(PLAYER.hull, this.hull + POWER.repair);
    this.sfx.pickup();
    this.showToast(PICKUP_TEXT[pickup.type]);
  }

  damageEnemy(enemy, amount, quiet) {
    if (!enemy.alive || this.state !== 'play') return;
    enemy.hp -= amount;
    enemy.flash = 0.08;
    flashMaterials(enemy.mesh.userData.mats);
    if (quiet !== true) burstSparks(this.sparks, enemy.mesh.position, 0xfff6d8, 7, 18, null);
    if (enemy.hp <= 0) this.killEnemy(enemy, quiet === true);
  }

  killEnemy(enemy, quiet = false) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const pos = enemy.mesh.position.clone();
    enemy.mesh.visible = false;
    enemy.mesh.position.set(0, -999, 0);
    if (enemy.mesh.userData.bar) enemy.mesh.userData.bar.group.visible = false;
    this.kills += 1;
    this.addScore(enemy.cfg.score, pos, true);
    const size = enemy.type === 'vorak' || enemy.type === 'slab' ? 'big' : enemy.type === 'nib' ? 'small' : 'mid';
    if (!quiet) {
      this.fxBoom(pos, enemy.cfg.color, size);
      this.voidBurst(pos, enemy.cfg.color);
      this.addShake(enemy.type === 'vorak' ? 0.85 : enemy.type === 'slab' ? 0.48 : 0.16);
      if (enemy.type === 'vorak') this.sfx.bigBoom();
      else this.sfx.explode();
    } else {
      this.chain.push({
        at: this.time + Math.min(0.5, this.chain.length * 0.045),
        pos,
        color: enemy.cfg.color,
        size,
      });
    }
    if (Math.random() < enemy.cfg.drop) this.spawnPickup(pos);
  }

  damageTower(tower, amount, quiet) {
    if (!tower.alive || this.state !== 'play') return;
    tower.hp -= amount;
    tower.flash = 0.08;
    flashMaterials(tower.mesh.userData.mats);
    if (quiet !== true) burstSparks(this.sparks, tower.mesh.position, 0xfff6d8, 7, 18, null);
    if (tower.hp <= 0) this.killTower(tower, quiet === true);
  }

  killTower(tower, quiet = false) {
    if (!tower.alive) return;
    tower.alive = false;
    const pos = tower.mesh.position.clone();
    tower.mesh.visible = false;
    if (tower.mesh.userData.bar) tower.mesh.userData.bar.group.visible = false;
    this.structures += 1;
    this.addScore(tower.score, pos, true);
    const size = tower.type === 'silo' ? 'big' : tower.type === 'crate' ? 'small' : 'mid';
    if (!quiet) {
      this.fxBoom(pos, tower.color, size);
      this.addShake(tower.type === 'crate' ? 0.1 : 0.24);
      if (tower.type === 'crate') this.sfx.pop();
      else if (tower.type !== 'silo') this.sfx.explode();
    } else {
      this.chain.push({
        at: this.time + Math.min(0.5, this.chain.length * 0.045),
        pos,
        color: tower.color,
        size,
      });
    }
    if (tower.type === 'silo') this.blast(pos, TOWERS.silo.blast, TOWERS.silo.blastDamage);
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
    if (this.missiles) {
      for (const missile of this.missiles) {
        missile.alive = false;
        missile.mesh.visible = false;
      }
    }
    if (this.giants) {
      for (const missile of this.giants) {
        missile.alive = false;
        missile.mesh.visible = false;
      }
    }
    this.clearHeavy();
    this.player.mesh.visible = false;
    this.bubble.visible = false;
    const pos = this.player.mesh.position.clone();
    this.fxBoom(pos, 0xff8a3a, 'big');
    this.addShake(1.15);
    this.sfx.bigBoom();
    this.commitBest();
    this.openOverlay('dead');
  }

  voidBurst(position, color) {
    spawnRing(this.rings, position, color, { life: 0.75, grow: 150, scale: 2.4 });
    spawnRing(this.rings, position, 0xd7f7ff, { life: 0.55, grow: 210, scale: 1.1 });
    burstSparks(this.sparks, position, color, 26, 48, null, 2.8, 1.4);
    burstSparks(this.sparks, position, 0xeaf8ff, 12, 26, null, 1.8, 1.3);
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
    this.meta.points += gained;
    this.saveMeta();
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
    const squadSize = 8;
    this.queue = [];
    let at = this.time + 0.4;
    const playerPos = this.player.mesh.position;
    const nose = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.mesh.quaternion);
    const lift = new THREE.Vector3(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    for (let i = 0; i < types.length; i += squadSize) {
      const squad = types.slice(i, i + squadSize);
      const sway = ((i / squadSize) % 7) - 3;
      const dir = nose.clone()
        .addScaledVector(right, sway * 0.16)
        .addScaledVector(lift, (Math.random() - 0.45) * 0.1);
      if (dir.lengthSq() < 0.04) dir.copy(nose);
      dir.normalize();
      const center = new THREE.Vector3().copy(playerPos).addScaledVector(dir, 102 + Math.random() * 22);
      center.y = THREE.MathUtils.clamp(center.y, -36, 64);
      if (center.length() > WORLD.bounds - 90) center.setLength(WORLD.bounds - 90);
      const spin = (i / squadSize) % 2 === 0 ? 1 : -1;
      const anchor = center.clone();
      squad.forEach((type, k) => {
        const band = (ENEMIES[type].band ?? 22) + (k % 5);
        const ang = (k / Math.max(1, squad.length)) * Math.PI * 2 + sway * 0.4;
        const pos = center.clone();
        pos.x += Math.cos(ang) * band;
        pos.z += Math.sin(ang) * band;
        pos.y += ((k % 3) - 1) * 6;
        if (pos.length() > WORLD.bounds - 24) pos.setLength(WORLD.bounds - 24);
        this.queue.push({
          type,
          at: at + k * 0.05,
          pos,
          anchor,
          orbit: band,
          spin,
        });
      });
      at += 0.32;
    }
    this.supportWave();
    const named = types.includes('vorak') ? ` · ${T.enemyNames.vorak}` : '';
    this.showBanner(`${T.wave} ${this.wave}${named}`);
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
    const ship = this.player.mesh.position;
    this.stars.position.copy(ship);
    this.farStars.position.copy(ship);
    this.dust.position.copy(ship).multiplyScalar(0.42);
    this.nebulas.position.copy(ship).multiplyScalar(0.2);
    this.stars.rotation.y = this.state === 'menu' ? this.time * 0.02 : 0;
    this.farStars.rotation.y = this.time * 0.008;
  }

  /** Closed arena without a wall: a wide inward current, then a safety radius. */
  foldArena(pos, dt) {
    const dist = pos.length();
    if (dist > WORLD.soft) {
      const t = THREE.MathUtils.smoothstep(dist, WORLD.soft, WORLD.bounds);
      this.inward.copy(pos).multiplyScalar(-1 / Math.max(dist, 0.001));
      pos.addScaledVector(this.inward, (14 + t * t * 340) * dt);
      this.speed = Math.max(PLAYER.brake, this.speed - t * t * 190 * dt);
      if (t > 0.62) this.edge = Math.max(this.edge, 1.15);
    }
    if (pos.length() > WORLD.bounds) pos.setLength(WORLD.bounds * 0.992);
    this.edge = Math.max(0, this.edge - dt);
  }

  updateCameraMenu() {
    const angle = this.time * 0.18;
    this.camera.position.set(Math.sin(angle) * 19, 5.2 + Math.sin(this.time * 0.7) * 0.35, Math.cos(angle) * 19);
    this.camera.lookAt(0, 0.45, 0);
    this.dampFov(52);
  }

  updateChaseCamera(dt) {
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    this.upV.set(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    const back = 16 + (this.speed / PLAYER.boost) * 5.5;
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
    this.dampFov(this.boosting && this.state === 'play' ? 98 : 66);
  }

  updateSpeedTunnel(dt) {
    updateSpeedTunnel(this.speedTunnel, this.camera, dt, {
      active: this.boosting && this.state === 'play',
      reduceMotion: this.reduceMotion,
    });
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

  buildFleet() {
    this.allies = [];
    for (let i = 0; i < ALLY.count; i += 1) {
      const mesh = createAlly();
      mesh.visible = false;
      mesh.scale.setScalar(ALLY.visualScale);
      this.scene.add(mesh);
      this.allies.push({
        mesh,
        alive: false,
        hp: ALLY.hp,
        maxHp: ALLY.hp,
        fireCd: 0.4 + i * 0.15,
        invuln: 0,
        slot: i,
      });
    }
    const make = (side) => {
      const mesh = createCarrier(side);
      mesh.visible = false;
      mesh.scale.setScalar(CARRIER.visualScale);
      this.scene.add(mesh);
      return {
        side,
        mesh,
        alive: false,
        hp: side === 'enemy' ? CARRIER.enemyHp : CARRIER.hp,
        maxHp: side === 'enemy' ? CARRIER.enemyHp : CARRIER.hp,
        radius: CARRIER.radius,
        fireCd: 1.4,
      };
    };
    this.carriers = { ally: make('ally'), enemy: make('enemy') };
    this.allyGap = 0;
    this.slot = new THREE.Vector3();
    this.goal = new THREE.Vector3();
  }

  resetFleet() {
    if (!this.allies) return;
    for (const ally of this.allies) {
      ally.alive = false;
      ally.hp = ALLY.hp;
      ally.mesh.visible = false;
      ally.mesh.position.set(0, -980, 0);
    }
    for (const carrier of [this.carriers.ally, this.carriers.enemy]) {
      carrier.alive = false;
      carrier.hp = carrier.maxHp;
      carrier.mesh.visible = false;
      carrier.mesh.position.set(0, -980, 0);
    }
  }

  supportWave() {
    if (!this.carriers || this.state === 'menu') return;
    this.reviveCarrier(this.carriers.ally, -46, 8, 34);
    this.reviveCarrier(this.carriers.enemy, 26, 14, 148);
    this.launchVolley();
    this.fillAllies(true);
  }

  reviveCarrier(carrier, right, up, fwd) {
    this.park(carrier.mesh.position, right, up, fwd);
    carrier.alive = true;
    carrier.hp = carrier.maxHp;
    carrier.mesh.visible = true;
    carrier.mesh.scale.setScalar(CARRIER.visualScale);
    this.goal.copy(carrier.mesh.position).add(this.nose);
    carrier.mesh.lookAt(this.goal);
    if (carrier.mesh.userData.bar) carrier.mesh.userData.bar.group.visible = false;
    restoreMaterials(carrier.mesh.userData.mats);
  }

  park(out, right, up, fwd) {
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    this.rightV.set(1, 0, 0).applyQuaternion(this.player.mesh.quaternion);
    this.upV.set(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    out.copy(this.player.mesh.position)
      .addScaledVector(this.rightV, right)
      .addScaledVector(this.upV, up)
      .addScaledVector(this.nose, fwd);
  }

  launchVolley() {
    const carrier = this.carriers.enemy;
    if (!carrier.alive) return;
    const anchor = carrier.mesh.position.clone().addScaledVector(this.nose, 36);
    if (anchor.length() > WORLD.bounds - 90) anchor.setLength(WORLD.bounds - 90);
    for (let i = 0; i < 8; i += 1) {
      const type = i % 2 === 0 ? 'glint' : 'nib';
      const band = ENEMIES[type].band + (i % 5);
      const ang = (i / 8) * Math.PI * 2;
      const pos = anchor.clone();
      pos.x += Math.cos(ang) * band;
      pos.z += Math.sin(ang) * band;
      pos.y += ((i % 3) - 1) * 5;
      this.spawnEnemy(type, { pos, anchor, orbit: band, spin: i < 7 ? 1 : -1 });
      burstSparks(this.sparks, pos, CARRIER.colorEnemy, 6, 12, this.nose, 1.2);
    }
  }

  fillAllies(all) {
    if (!this.carriers.ally.alive) return;
    for (const ally of this.allies) {
      if (ally.alive) continue;
      this.launchAlly(ally);
      if (!all) return;
    }
  }

  allySlot(index) {
    const cols = 6;
    const col = index % cols;
    const row = Math.floor(index / cols);
    return [
      (col - (cols - 1) / 2) * 8,
      ((row % 3) - 1) * 4.2,
      9 + row * 6,
    ];
  }

  launchAlly(ally) {
    const carrier = this.carriers.ally;
    ally.alive = true;
    ally.hp = ALLY.hp;
    ally.invuln = 0.8;
    ally.fireCd = 0.25;
    ally.mesh.visible = true;
    ally.mesh.scale.setScalar(ALLY.visualScale);
    ally.mesh.position.copy(carrier.mesh.position).addScaledVector(this.nose, 16 + ally.slot * 3);
    burstSparks(this.sparks, ally.mesh.position, ALLY.color, 8, 14, this.nose, 1.4);
  }

  updateFleet(dt) {
    if (!this.carriers) return;
    this.nose.set(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
    this.rightV.set(1, 0, 0).applyQuaternion(this.player.mesh.quaternion);
    this.upV.set(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);
    this.steerCarrier(this.carriers.ally, -20, 6, 26, 58, dt);
    this.steerCarrier(this.carriers.enemy, 16, 8, 70, 32, dt);
    const foe = this.carriers.enemy;
    if (foe.alive) {
      foe.fireCd -= dt;
      if (foe.fireCd <= 0) {
        foe.fireCd = 4.2;
        const origin = foe.mesh.position.clone();
        const dir = this.player.mesh.position.clone().sub(origin);
        if (dir.lengthSq() > 0.01) {
          dir.normalize();
          this.spawnBolt('enemy', origin, dir, 58, 8, 0xff5a36, 2.1);
        }
      }
      this.updateBar(foe);
    }
    if (this.carriers.ally.alive) this.updateBar(this.carriers.ally);
    this.allyGap -= dt;
    if (this.allyGap <= 0) {
      this.allyGap = 0.28;
      this.fillAllies(false);
    }
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      ally.invuln = Math.max(0, ally.invuln - dt);
      ally.fireCd -= dt;
      const slot = this.allySlot(ally.slot);
      this.slot.copy(this.player.mesh.position)
        .addScaledVector(this.rightV, slot[0])
        .addScaledVector(this.upV, slot[1])
        .addScaledVector(this.nose, slot[2]);
      const pos = ally.mesh.position;
      this.v1.copy(this.slot).sub(pos);
      const gap = this.v1.length();
      const pace = Math.max(ALLY.speed, this.speed + 18);
      if (gap > 1.5) {
        this.v1.multiplyScalar(1 / gap);
        pos.addScaledVector(this.v1, Math.min(gap, pace * dt));
      }
      let aim = null;
      let best = 240 * 240;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const d2 = pos.distanceToSquared(enemy.mesh.position);
        if (d2 < best) {
          best = d2;
          aim = enemy.mesh.position;
        }
      }
      if (foe.alive) {
        const d2 = pos.distanceToSquared(foe.mesh.position);
        if (d2 < best) aim = foe.mesh.position;
      }
      if (aim) {
        ally.mesh.lookAt(aim);
        ally.mesh.scale.setScalar(ALLY.visualScale);
        if (ally.fireCd <= 0 && best < 190 * 190) {
          ally.fireCd = ALLY.fireEvery;
          const origin = pos.clone();
          const dir = aim.clone().sub(origin);
          if (dir.lengthSq() > 0.01) {
            dir.normalize();
            this.spawnBolt('ally', origin, dir, 130, ALLY.shotDamage, 0x8eb6ff, 1.15);
          }
        }
      } else {
        this.goal.copy(pos).add(this.nose);
        ally.mesh.lookAt(this.goal);
        ally.mesh.scale.setScalar(ALLY.visualScale);
      }
      for (const enemy of this.enemies) {
        if (!enemy.alive || ally.invuln > 0) continue;
        if (pos.distanceTo(enemy.mesh.position) < ALLY.radius * 0.7 + enemy.cfg.radius) {
          this.damageAlly(ally, 12);
          break;
        }
      }
      this.updateBar(ally);
    }
  }

  steerCarrier(carrier, right, up, fwd, speed, dt) {
    if (!carrier.alive) return;
    this.park(this.goal, right, up, fwd);
    this.v1.copy(this.goal).sub(carrier.mesh.position);
    const dist = this.v1.length();
    if (dist > 6) {
      this.v1.multiplyScalar(1 / dist);
      carrier.mesh.position.addScaledVector(this.v1, Math.min(dist, speed * dt));
    }
    this.goal.copy(carrier.mesh.position).add(this.nose);
    carrier.mesh.lookAt(this.goal);
    carrier.mesh.scale.setScalar(CARRIER.visualScale);
  }

  damageAlly(ally, amount) {
    if (!ally.alive || ally.invuln > 0) return;
    ally.hp -= amount;
    ally.invuln = 0.55;
    flashMaterials(ally.mesh.userData.mats);
    if (ally.hp > 0) return;
    ally.alive = false;
    const pos = ally.mesh.position.clone();
    ally.mesh.visible = false;
    ally.mesh.position.set(0, -980, 0);
    if (ally.mesh.userData.bar) ally.mesh.userData.bar.group.visible = false;
    this.voidBurst(pos, ALLY.color);
    this.sfx.explode();
  }

  damageCarrier(carrier, amount) {
    if (!carrier.alive) return;
    carrier.hp -= amount;
    flashMaterials(carrier.mesh.userData.mats);
    const color = carrier.side === 'enemy' ? CARRIER.colorEnemy : CARRIER.colorAlly;
    burstSparks(this.sparks, carrier.mesh.position, color, 8, 16, null);
    if (carrier.hp > 0) return;
    carrier.alive = false;
    const pos = carrier.mesh.position.clone();
    carrier.mesh.visible = false;
    carrier.mesh.position.set(0, -980, 0);
    if (carrier.mesh.userData.bar) carrier.mesh.userData.bar.group.visible = false;
    this.voidBurst(pos, color);
    this.fxBoom(pos, color, 'big');
    this.addShake(1.1);
    this.sfx.bigBoom();
    if (carrier.side === 'enemy') {
      this.addScore(CARRIER.score, pos, true);
      this.showToast(T.carrierEnemy);
    } else {
      this.showToast(T.carrier);
    }
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
      const mark = enemy.type === 'vorak' ? ['#ff1f3a', 8] : ['#ff3a3a', 3];
      plot(enemy.mesh.position.x, enemy.mesh.position.z, mark[0], mark[1]);
    }
    if (this.allies) {
      for (const ally of this.allies) {
        if (!ally.alive) continue;
        plot(ally.mesh.position.x, ally.mesh.position.z, '#3d7dff', 4);
      }
    }
    if (this.carriers) {
      if (this.carriers.ally.alive) plot(this.carriers.ally.mesh.position.x, this.carriers.ally.mesh.position.z, '#3d7dff', 11);
      if (this.carriers.enemy.alive) plot(this.carriers.enemy.mesh.position.x, this.carriers.enemy.mesh.position.z, '#ff5a3a', 12);
    }
    if (this.portals) {
      for (const portal of this.portals) {
        plot(portal.position.x, portal.position.z, portal.id === 'forest' ? '#3dffa2' : '#ffb15a', 9);
      }
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
    const rapidLeft = this.rapidUntil - this.time;
    const spreadLeft = this.spreadUntil - this.time;
    const parts = [];
    if (rapidLeft > 0) parts.push(`${T.weaponRapid} ${Math.ceil(rapidLeft)}`);
    if (spreadLeft > 0) parts.push(`${T.weaponSpread} ${Math.ceil(spreadLeft)}`);
    if (!parts.length) {
      const name = T.weaponNames[this.meta.weapon] || T.weaponNormal;
      parts.push(`${T.weapon}: ${name}`);
    }
    parts.push(this.giantCd > 0 ? `${T.giant} ${Math.ceil(this.giantCd)}` : T.giantReady);
    parts.push(this.missileCd > 0 ? `${T.missile} ${Math.ceil(this.missileCd)}` : T.missileReady);
    const heavyId = this.heavyKind();
    const heavyCool = this.heavyCd[heavyId] > 0;
    parts.push(heavyCool ? this.heavyLabel(heavyId, true) : `${this.heavyLabel(heavyId, false)} ${T.heavyReady}`);
    if (this.allies) {
      const ready = this.allies.filter((ally) => ally.alive).length;
      parts.push(`${T.allies} ${ready}`);
    }
    this.dom.weapon.textContent = parts.join(' · ');
    const cooling = this.missileCd > 0;
    const missileLabel = cooling ? `${T.missile} ${Math.ceil(this.missileCd)}` : T.missile;
    for (const button of [this.dom.missileBtn, this.dom.nukeBtn]) {
      if (!button) continue;
      button.classList.toggle('cooling', cooling);
      button.textContent = missileLabel;
    }
    const giantCooling = this.giantCd > 0;
    const giantLabel = giantCooling ? `${T.giant} ${Math.ceil(this.giantCd)}` : T.giant;
    for (const button of [this.dom.giantBtn, this.dom.giantTouch]) {
      if (!button) continue;
      button.classList.toggle('cooling', giantCooling);
      button.textContent = giantLabel;
    }
    const heavyName = this.heavyLabel(heavyId, heavyCool);
    for (const button of [this.dom.ordnanceBtn, this.dom.ordnanceTouch]) {
      if (!button) continue;
      button.classList.toggle('cooling', heavyCool);
      button.classList.remove('kind-atoms', 'kind-shells', 'kind-ultra');
      button.classList.add(`kind-${heavyId}`);
      button.textContent = heavyName;
    }
    this.dom.flight.textContent = this.boosting ? T.boost : this.braking ? T.brake : T.cruise;
    for (const button of [this.dom.boostBtn, this.dom.boostTouch]) {
      if (!button) continue;
      button.classList.toggle('on', this.boosting);
    }
    this.dom.edge.classList.toggle('show', this.edge > 0);
  }

  syncVisibility() {
    const playing = this.state === 'play';
    const ground = this.state === 'ground';
    const picking = this.state === 'ground-pick';
    const spaceHud = playing || this.state === 'paused' || this.state === 'dead';
    this.dom.menu.hidden = this.state !== 'menu';
    this.dom.hud.hidden = !spaceHud;
    this.dom.radar.hidden = !spaceHud;
    document.querySelector('#flight-row').hidden = !spaceHud;
    this.dom.groundHud.hidden = !ground;
    this.dom.groundTouch.hidden = !(ground && this.coarse);
    this.dom.groundPick.hidden = !picking;
    this.dom.crosshair.hidden = !playing;
    this.dom.overlay.hidden = this.state !== 'paused' && this.state !== 'dead';
    document.body.classList.toggle('playing', playing);
    document.body.classList.toggle('touch', this.coarse);
    this.dom.touch.hidden = !(this.coarse && playing);
    this.dom.nukeBtn.hidden = !playing;
    this.dom.giantBtn.hidden = !playing;
    if (this.dom.ordnanceBtn) this.dom.ordnanceBtn.hidden = !playing;
    if (this.dom.ordnanceCycle) this.dom.ordnanceCycle.hidden = !playing;
    this.dom.boostBtn.hidden = !playing;
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
      this.releaseStick(true);
      this.releaseFire();
      this.releaseBoost();
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
    this.sfx.toggle();
    this.syncMuteLabel();
    this.sfx.ui();
  }

  syncMuteLabel() {
    const label = this.sfx.muted ? T.mute : T.sound;
    this.dom.muteBtn.textContent = label;
    if (this.dom.menuMute) this.dom.menuMute.textContent = label;
  }

  shipScale() {
    return SHIPS[this.meta.ship]?.scale || PLAYER.visualScale;
  }

  weaponSpec() {
    return WEAPONS[this.meta.weapon] || WEAPONS.laser;
  }

  readMeta() {
    const fresh = {
      points: 0,
      ship: 'shomeret',
      weapon: 'laser',
      ownedShips: ['shomeret'],
      ownedWeapons: ['laser'],
    };
    try {
      const raw = JSON.parse(localStorage.getItem(META_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return fresh;
      const ownedShips = Array.isArray(raw.ownedShips)
        ? raw.ownedShips.filter((id) => SHIPS[id])
        : ['shomeret'];
      const ownedWeapons = Array.isArray(raw.ownedWeapons)
        ? raw.ownedWeapons.filter((id) => WEAPONS[id])
        : ['laser'];
      if (!ownedShips.includes('shomeret')) ownedShips.unshift('shomeret');
      if (!ownedWeapons.includes('laser')) ownedWeapons.unshift('laser');
      return {
        points: Math.max(0, Number(raw.points) || 0),
        ship: SHIPS[raw.ship] ? raw.ship : 'shomeret',
        weapon: WEAPONS[raw.weapon] ? raw.weapon : 'laser',
        ownedShips,
        ownedWeapons,
      };
    } catch (err) {
      return fresh;
    }
  }

  saveMeta() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(this.meta));
    } catch (err) {
      /* private mode */
    }
  }

  paintHangar() {
    const { dom } = this;
    if (!dom.hangarTitle) return;
    dom.hangarTitle.textContent = T.hangar;
    dom.metaPoints.textContent = `${T.points} ${Math.floor(this.meta.points).toLocaleString('he-IL')}`;
    dom.shipPicks.replaceChildren();
    for (const spec of Object.values(SHIPS)) dom.shipPicks.appendChild(this.pickButton('ship', spec));
    dom.weaponPicks.replaceChildren();
    for (const spec of Object.values(WEAPONS)) dom.weaponPicks.appendChild(this.pickButton('weapon', spec));
  }

  pickButton(kind, spec) {
    const owned = kind === 'ship'
      ? this.meta.ownedShips.includes(spec.id)
      : this.meta.ownedWeapons.includes(spec.id);
    const selected = kind === 'ship' ? this.meta.ship === spec.id : this.meta.weapon === spec.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = selected ? 'pick on' : 'pick';
    const name = kind === 'ship' ? T.shipNames[spec.id] : T.weaponNames[spec.id];
    let suffix = ` · ${spec.cost.toLocaleString('he-IL')}`;
    if (selected) suffix = ` · ${T.equipped}`;
    else if (owned) suffix = ` · ${T.owned}`;
    button.textContent = `${name}${suffix}`;
    button.addEventListener('click', () => {
      this.sfx.unlock();
      this.sfx.ui();
      if (kind === 'ship') this.chooseShip(spec.id);
      else this.chooseWeapon(spec.id);
    });
    return button;
  }

  chooseShip(id) {
    if (!SHIPS[id]) return;
    if (!this.meta.ownedShips.includes(id)) {
      if (this.meta.points < SHIPS[id].cost) return;
      this.meta.points -= SHIPS[id].cost;
      this.meta.ownedShips.push(id);
    }
    this.meta.ship = id;
    this.saveMeta();
    this.equipShip(id);
    this.paintHangar();
  }

  chooseWeapon(id) {
    if (!WEAPONS[id]) return;
    if (!this.meta.ownedWeapons.includes(id)) {
      if (this.meta.points < WEAPONS[id].cost) return;
      this.meta.points -= WEAPONS[id].cost;
      this.meta.ownedWeapons.push(id);
    }
    this.meta.weapon = id;
    this.saveMeta();
    this.paintHangar();
    this.syncHud();
  }

  equipShip(id) {
    const next = this.shipMeshes[id];
    if (!next) return;
    const prev = this.player.mesh;
    if (prev && prev !== next) {
      next.position.copy(prev.position);
      next.rotation.copy(prev.rotation);
      next.rotation.order = prev.rotation.order;
      prev.visible = false;
      if (this.bubble && this.bubble.parent === prev) {
        prev.remove(this.bubble);
        next.add(this.bubble);
      }
    }
    next.visible = true;
    next.scale.setScalar(SHIPS[id].scale);
    this.player.mesh = next;
    const name = T.shipNames[id] || T.ship;
    this.dom.shipName.textContent = name;
    this.dom.hudShip.textContent = name;
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
    this.missileCd = 0;
    this.giantCd = 0;
    this.heavyIndex = 0;
    this.heavyCd = { atoms: 0, shells: 0, ultra: 0 };
    this.giftAt = 16;
    this.chain = [];
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
    this.releaseStick(true);
    this.releaseFire();
    this.releaseBoost();
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
    for (const bolt of this.playerBolts.concat(this.enemyBolts)) this.killBolt(bolt);
    if (this.missiles) {
      for (const missile of this.missiles) {
        missile.alive = false;
        missile.mesh.visible = false;
      }
    }
    if (this.giants) {
      for (const missile of this.giants) {
        missile.alive = false;
        missile.mesh.visible = false;
      }
    }
    this.clearHeavy();
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
    if (this.allies) this.resetFleet(next);
    if (next === 'play') this.beginWave();
    this.syncVisibility();
    this.syncHud();
    this.updateMenuBest();
    if (next === 'play') this.showToast(`${T.missileReady} · ${T.alliesIn}`);
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
    this.paintHangar();
  }

  resize() {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.ground) {
      this.ground.camera.aspect = width / height;
      this.ground.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(width, height, false);
  }

  openGroundPick() {
    if (!this.renderer) return;
    this.sfx.unlock();
    this.dom.groundPick.hidden = false;
  }

  closeGroundPick() {
    this.dom.groundPick.hidden = true;
  }

  startGround(worldId) {
    if (!this.renderer || !this.ground) return;
    if (this.state === 'play') this.spaceLive = true;
    else if (this.state === 'menu') this.spaceLive = false;
    this.sfx.unlock();
    this.closeGroundPick();
    this.state = 'ground';
    this.ground.start(worldId);
    const world = GROUND_WORLDS.find((item) => item.id === worldId) || GROUND_WORLDS[0];
    this.fadeWorld(`${T.groundWelcome} ${world.name}`);
    this.syncVisibility();
  }

  fadeWorld(text) {
    const el = this.dom.worldFade;
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => el.classList.remove('show'), 780);
  }

  returnToSpace() {
    this.groundPush = false;
    this.groundLeft = false;
    this.groundRight = false;
    this.ground?.stop();
    this.closeGroundPick();
    if (this.portals) {
      for (const portal of this.portals) portal.armed = false;
    }
    this.state = this.spaceLive ? 'play' : 'menu';
    this.fadeWorld(T.groundWelcomeBack);
    this.syncVisibility();
  }

  buildPortals() {
    const specs = [
      { id: 'forest', color: 0x3dffa2, position: new THREE.Vector3(-36, 4, -110) },
      { id: 'desert', color: 0xffb15a, position: new THREE.Vector3(36, 4, -155) },
    ];
    return specs.map((spec) => {
      const mesh = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(13, 1.35, 12, 32),
        new THREE.MeshBasicMaterial({ color: spec.color }),
      );
      const inner = new THREE.Mesh(
        new THREE.TorusGeometry(9.2, 0.28, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
      );
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(11.2, 18, 14),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.add(ring, inner, glow);
      mesh.position.copy(spec.position);
      this.scene.add(mesh);
      return { ...spec, mesh, glow, armed: true };
    });
  }

  updatePortals(dt) {
    if (this.state !== 'play' || !this.portals) return;
    const pos = this.player.mesh.position;
    for (const portal of this.portals) {
      portal.mesh.rotation.z += dt * 0.35;
      const dist = pos.distanceTo(portal.position);
      portal.glow.material.opacity = dist < 48 ? 0.28 : 0.14;
      if (dist > 26) portal.armed = true;
      if (dist < 12 && portal.armed) {
        portal.armed = false;
        const world = GROUND_WORLDS.find((item) => item.id === portal.id);
        if (world) this.showBanner(world.name);
        this.startGround(portal.id);
        return;
      }
    }
  }

  exitGround() {
    this.groundPush = false;
    this.groundLeft = false;
    this.groundRight = false;
    this.state = 'ground-pick';
    this.syncVisibility();
  }

  render() {
    if ((this.state === 'ground' || this.state === 'ground-pick') && this.ground) {
      this.renderer.render(this.ground.scene, this.ground.camera);
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
