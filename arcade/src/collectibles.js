import * as THREE from "three";

const COIN_STORAGE_KEY = "skyPilotCoins";
const RING_SCORE = 100;
const COIN_SCORE = 25;
const MAX_RINGS = 14;
const MAX_COINS = 20;
const SPAWN_AHEAD = 280;
const DESPAWN_BEHIND = 120;

function loadCoinBank() {
  try {
    return parseInt(localStorage.getItem(COIN_STORAGE_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function saveCoinBank(n) {
  try {
    localStorage.setItem(COIN_STORAGE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function createRingMesh() {
  const group = new THREE.Group();
  group.userData.type = "ring";

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xffaa00,
    emissiveIntensity: 0.85,
    metalness: 0.6,
    roughness: 0.2,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.35,
    metalness: 0.2,
    roughness: 0.1,
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.4, 12, 32), ringMat);
  group.add(ring);

  const glow = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.15, 8, 32), glowMat);
  group.add(glow);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.08, 6, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff7ed,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
    })
  );
  group.add(inner);

  group.userData.spinners = [ring, glow, inner];
  return group;
}

function createCoinMesh() {
  const group = new THREE.Group();
  group.userData.type = "coin";

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.7,
    metalness: 0.85,
    roughness: 0.15,
  });

  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), mat);
  coin.rotation.x = Math.PI / 2;
  group.add(coin);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.06, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.5, metalness: 0.9 })
  );
  group.add(rim);

  group.userData.spinners = [coin, rim];
  return group;
}

export class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.rings = [];
    this.coins = [];
    this.time = 0;
    this.mode = "game";
    this.ringsThisRun = 0;
    this.coinsThisRun = 0;
    this.coinBank = loadCoinBank();
    this.lastSpawn = { x: 0, y: 38, z: 40 };
    this.furthestZ = 40;
  }

  reset() {
    this.clearAll();
    this.time = 0;
    this.mode = "game";
    this.ringsThisRun = 0;
    this.coinsThisRun = 0;
    this.lastSpawn = { x: 0, y: 38, z: 40 };
    this.furthestZ = 40;
    for (let i = 0; i < 8; i++) this.spawnRing();
  }

  resetForDemo() {
    this.clearAll();
    this.mode = "demo";
    this.ringsThisRun = 0;
    this.coinsThisRun = 0;
    const demoRings = [
      [0, 35, -75],
      [22, 42, -105],
      [40, 45, -118],
    ];
    for (const [x, y, z] of demoRings) {
      this.placeRing(x, y, z);
    }
  }

  clearAll() {
    for (const r of this.rings) this.scene.remove(r);
    for (const c of this.coins) this.scene.remove(c);
    this.rings = [];
    this.coins = [];
  }

  placeRing(x, y, z) {
    const ring = createRingMesh();
    ring.position.set(x, y, z);
    ring.userData.collected = false;
    ring.userData.bobPhase = Math.random() * Math.PI * 2;
    ring.userData.baseY = y;
    this.scene.add(ring);
    this.rings.push(ring);
    this.lastSpawn = { x, y, z };
    this.furthestZ = Math.min(this.furthestZ, z);

    if (Math.random() < 0.65) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 10
      );
      this.placeCoin(x + offset.x, y + offset.y, z + offset.z);
    }
    return ring;
  }

  placeCoin(x, y, z) {
    if (this.coins.length >= MAX_COINS) return null;
    const coin = createCoinMesh();
    coin.position.set(x, y, z);
    coin.userData.collected = false;
    coin.userData.bobPhase = Math.random() * Math.PI * 2;
    coin.userData.baseY = y;
    this.scene.add(coin);
    this.coins.push(coin);
    return coin;
  }

  nextRingPosition() {
    const dz = 42 + Math.random() * 28;
    const dx = this.lastSpawn.x + (Math.random() - 0.5) * 90;
    const dy = 32 + Math.random() * 38;
    return {
      x: THREE.MathUtils.clamp(dx, -110, 110),
      y: dy,
      z: this.lastSpawn.z - dz,
    };
  }

  spawnRing() {
    if (this.rings.length >= MAX_RINGS) return;
    const p = this.nextRingPosition();
    this.placeRing(p.x, p.y, p.z);
  }

  spawnAheadOf(planePos) {
    if (this.mode !== "game") return;

    while (this.furthestZ > planePos.z - SPAWN_AHEAD && this.rings.length < MAX_RINGS) {
      this.spawnRing();
    }

    if (Math.random() < 0.02 && this.coins.length < MAX_COINS) {
      this.placeCoin(
        planePos.x + (Math.random() - 0.5) * 80,
        25 + Math.random() * 45,
        planePos.z - 60 - Math.random() * 120
      );
    }
  }

  cullBehind(planePos) {
    if (this.mode !== "game") return;

    this.rings = this.rings.filter((ring) => {
      if (ring.userData.collected) return false;
      if (ring.position.z > planePos.z + DESPAWN_BEHIND) {
        this.scene.remove(ring);
        return false;
      }
      return true;
    });

    this.coins = this.coins.filter((coin) => {
      if (coin.userData.collected) return false;
      if (coin.position.z > planePos.z + DESPAWN_BEHIND) {
        this.scene.remove(coin);
        return false;
      }
      return true;
    });
  }

  animate(dt) {
    this.time += dt;

    for (const ring of this.rings) {
      if (ring.userData.collected) continue;
      ring.position.y = ring.userData.baseY + Math.sin(this.time * 2 + ring.userData.bobPhase) * 0.6;
      ring.rotation.y += dt * 0.8;
      for (const s of ring.userData.spinners) {
        s.material.emissiveIntensity = 0.7 + Math.sin(this.time * 4 + ring.userData.bobPhase) * 0.35;
      }
    }

    for (const coin of this.coins) {
      if (coin.userData.collected) continue;
      coin.rotation.y += dt * 3.5;
      coin.position.y = coin.userData.baseY + Math.sin(this.time * 3 + coin.userData.bobPhase) * 0.45;
    }
  }

  collectBurst(mesh) {
    const burst = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 8),
      new THREE.MeshBasicMaterial({
        color: mesh.userData.type === "coin" ? 0xffd700 : 0xfbbf24,
        transparent: true,
        opacity: 0.7,
      })
    );
    burst.position.copy(mesh.position);
    this.scene.add(burst);
    let life = 0.35;
    const tick = () => {
      life -= 0.016;
      burst.scale.multiplyScalar(1.12);
      burst.material.opacity = life * 2;
      if (life > 0) requestAnimationFrame(tick);
      else this.scene.remove(burst);
    };
    tick();
  }

  checkCollisions(planePos) {
    let rings = 0;
    let coins = 0;

    for (const ring of this.rings) {
      if (ring.userData.collected) continue;
      if (planePos.distanceTo(ring.position) < 6.5) {
        ring.userData.collected = true;
        ring.visible = false;
        this.collectBurst(ring);
        this.ringsThisRun++;
        rings++;
      }
    }

    for (const coin of this.coins) {
      if (coin.userData.collected) continue;
      if (planePos.distanceTo(coin.position) < 3.5) {
        coin.userData.collected = true;
        coin.visible = false;
        this.collectBurst(coin);
        this.coinsThisRun++;
        this.coinBank++;
        saveCoinBank(this.coinBank);
        coins++;
      }
    }

    return {
      rings,
      coins,
      ringScore: rings * RING_SCORE,
      coinScore: coins * COIN_SCORE,
    };
  }

  getStats() {
    return {
      ringsThisRun: this.ringsThisRun,
      coinsThisRun: this.coinsThisRun,
      coinBank: this.coinBank,
    };
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
