import * as THREE from 'three';

export function makeSoftTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shellPositions(count, radius) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xc5dcff),
    new THREE.Color(0xffe0bf),
    new THREE.Color(0xffc4de),
  ];
  for (let i = 0; i < count; i += 1) {
    const r = radius * (0.75 + Math.random() * 0.25);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const color = palette[i % palette.length];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return { positions, colors };
}

export function createStarfield(count, radius, size) {
  const { positions, colors } = shellPositions(count, radius);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  });
  return new THREE.Points(geometry, material);
}

export function createNebulas(softMap) {
  const group = new THREE.Group();
  const specs = [
    { p: [140, 50, -200], c: 0x1a78ff, s: 230 },
    { p: [-220, -20, -60], c: 0xff2f86, s: 190 },
    { p: [30, 90, 220], c: 0x14c8b0, s: 250 },
    { p: [-90, -50, 260], c: 0xff9a3c, s: 170 },
    { p: [240, 30, 90], c: 0x7a5cff, s: 210 },
  ];
  for (const spec of specs) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softMap,
      color: spec.c,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }));
    sprite.position.set(spec.p[0], spec.p[1], spec.p[2]);
    sprite.scale.set(spec.s, spec.s * 0.72, 1);
    group.add(sprite);
  }
  return group;
}

export function createSparks(scene, softMap, count) {
  const sprites = [];
  for (let i = 0; i < count; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: softMap,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.frustumCulled = false;
    scene.add(sprite);
    sprites.push(sprite);
  }
  return sprites;
}

export function createRings(scene, count) {
  const rings = [];
  const geometry = new THREE.RingGeometry(0.75, 1, 28);
  for (let i = 0; i < count; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffcc77,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    rings.push(mesh);
  }
  return rings;
}

export function burstSparks(sprites, position, color, count, speed, bias, sizeScale = 1, lifeScale = 1) {
  let spawned = 0;
  for (const sprite of sprites) {
    if (sprite.visible) continue;
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (dir.lengthSq() < 0.001) dir.set(0, 1, 0);
    dir.normalize();
    if (bias) dir.add(bias).normalize();
    const vel = dir.multiplyScalar(speed * (0.35 + Math.random() * 0.75));
    sprite.position.copy(position);
    sprite.visible = true;
    sprite.material.color.setHex(color);
    sprite.material.opacity = 1;
    const size = (0.45 + Math.random() * 0.9) * sizeScale;
    sprite.scale.setScalar(size);
    sprite.userData.vel = vel;
    sprite.userData.life = (0.28 + Math.random() * 0.35) * lifeScale;
    sprite.userData.max = sprite.userData.life;
    sprite.userData.size = size;
    spawned += 1;
    if (spawned >= count) break;
  }
}

export function updateSparks(sprites, dt) {
  for (const sprite of sprites) {
    if (!sprite.visible) continue;
    sprite.userData.life -= dt;
    if (sprite.userData.life <= 0) {
      sprite.visible = false;
      continue;
    }
    sprite.position.addScaledVector(sprite.userData.vel, dt);
    sprite.userData.vel.multiplyScalar(0.98);
    const k = sprite.userData.life / sprite.userData.max;
    sprite.material.opacity = Math.max(0, k);
    sprite.scale.setScalar(sprite.userData.size * (0.35 + k));
  }
}

export function spawnRing(rings, position, color, options) {
  const ring = rings.find((item) => !item.visible);
  if (!ring) return;
  const life = options?.life ?? 0.45;
  ring.visible = true;
  ring.position.copy(position);
  ring.material.color.setHex(color);
  ring.material.opacity = 0.9;
  ring.scale.setScalar(options?.scale ?? 1.2);
  ring.userData.life = life;
  ring.userData.max = life;
  ring.userData.grow = options?.grow ?? 46;
}

export function updateRings(rings, camera, dt) {
  for (const ring of rings) {
    if (!ring.visible) continue;
    ring.userData.life -= dt;
    if (ring.userData.life <= 0) {
      ring.visible = false;
      continue;
    }
    ring.scale.setScalar(ring.scale.x + ring.userData.grow * dt);
    ring.material.opacity = Math.max(0, ring.userData.life / ring.userData.max);
    ring.lookAt(camera.position);
  }
}

const STREAK_COLORS = [0xe8f4ff, 0xfff6c2, 0xffd4ea, 0xffffff, 0xb9dcff];

/** Thin additive streaks in camera space. They frame the ship and leave the center clear. */
export function createSpeedTunnel(count = 42) {
  const group = new THREE.Group();
  group.name = 'speedTunnel';
  group.frustumCulled = false;
  const geos = [
    new THREE.BoxGeometry(0.22, 0.22, 11),
    new THREE.BoxGeometry(0.16, 0.34, 18),
    new THREE.BoxGeometry(0.38, 0.14, 26),
  ];
  const streaks = [];
  for (let i = 0; i < count; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      color: STREAK_COLORS[i % STREAK_COLORS.length],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geos[i % geos.length], mat);
    mesh.frustumCulled = false;
    const radius = 4.2 + Math.random() * 8.6;
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.35;
    const baseZ = -8 - Math.random() * 44;
    mesh.userData = {
      radius,
      ang,
      baseZ,
      drift: 0.25 + Math.random() * 0.55,
    };
    mesh.position.set(Math.cos(ang) * radius, Math.sin(ang) * radius, baseZ);
    mesh.visible = false;
    group.add(mesh);
    streaks.push(mesh);
  }
  group.userData.streaks = streaks;
  group.userData.rush = 0;
  return group;
}

export function updateSpeedTunnel(group, camera, dt, { active, reduceMotion }) {
  if (!group) return;
  group.position.copy(camera.position);
  group.quaternion.copy(camera.quaternion);
  const rush = THREE.MathUtils.damp(group.userData.rush, active ? 1 : 0, active ? 7 : 5, dt);
  group.userData.rush = rush;
  const show = rush > 0.03;
  const travel = (90 + rush * 220) * dt;
  const opacityCap = reduceMotion ? 0.22 : 0.82;
  for (const mesh of group.userData.streaks) {
    mesh.visible = show;
    if (!show) continue;
    const data = mesh.userData;
    data.baseZ += travel * (0.65 + data.drift);
    if (data.baseZ > -5) {
      data.baseZ = -50 - Math.random() * 6;
      data.ang += 0.55;
    }
    data.ang += data.drift * dt * rush;
    const radius = data.radius;
    mesh.position.set(Math.cos(data.ang) * radius, Math.sin(data.ang) * radius, data.baseZ);
    mesh.scale.set(1, 1, 0.55 + rush * 2.6);
    const near = THREE.MathUtils.smoothstep(data.baseZ, -6, -14);
    const far = 1 - THREE.MathUtils.smoothstep(data.baseZ, -40, -56);
    mesh.material.opacity = rush * opacityCap * near * far;
  }
}
