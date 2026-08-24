import * as THREE from "three";

const KEYFRAMES = [
  {
    time: 0,
    position: [0, 12, 80],
    euler: [0, 0, 0],
    throttle: 0.45,
    caption: "Welcome to Sky Pilot! Let's go for a spin.",
    keys: [],
  },
  {
    time: 3,
    position: [0, 12, 55],
    euler: [0, 0, 0],
    throttle: 0.95,
    caption: "Hold Shift to increase throttle and roll down the runway.",
    keys: ["Shift"],
  },
  {
    time: 7,
    position: [0, 14, 25],
    euler: [-0.18, 0, 0],
    throttle: 0.95,
    caption: "Press W to pull up and lift off!",
    keys: ["W"],
  },
  {
    time: 11,
    position: [0, 28, -30],
    euler: [-0.08, 0, 0],
    throttle: 0.75,
    caption: "Climbing out — watch your airspeed on the HUD.",
    keys: [],
  },
  {
    time: 15,
    position: [0, 35, -75],
    euler: [-0.02, 0, 0],
    throttle: 0.7,
    caption: "Fly through the golden rings to score points!",
    keys: [],
  },
  {
    time: 19,
    position: [22, 42, -105],
    euler: [-0.05, -0.15, -0.35],
    throttle: 0.72,
    caption: "Press A or D to bank and turn toward the next ring.",
    keys: ["D"],
  },
  {
    time: 24,
    position: [40, 45, -118],
    euler: [-0.03, -0.08, -0.12],
    throttle: 0.68,
    caption: "Nice! Ring collected — +100 points.",
    keys: [],
  },
  {
    time: 28,
    position: [15, 48, -150],
    euler: [0.05, 0.2, 0.25],
    throttle: 0.65,
    caption: "Use Q and E for rudder to fine-tune your heading.",
    keys: ["Q"],
  },
  {
    time: 32,
    position: [0, 38, -90],
    euler: [0.08, 0, 0.05],
    throttle: 0.5,
    caption: "Hold Ctrl to reduce throttle and begin your descent.",
    keys: ["Ctrl"],
  },
  {
    time: 36,
    position: [0, 22, -10],
    euler: [0.12, 0, 0],
    throttle: 0.35,
    caption: "Keep wings level and aim for the runway.",
    keys: [],
  },
  {
    time: 40,
    position: [0, 13, 35],
    euler: [0.04, 0, 0],
    throttle: 0.25,
    caption: "Press Space to brake after landing.",
    keys: ["Space"],
  },
  {
    time: 44,
    position: [0, 12, 58],
    euler: [0, 0, 0],
    throttle: 0.2,
    caption: "You're ready! Click Take Off and try it yourself.",
    keys: [],
  },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export class DemoFlight {
  constructor(flight, onUpdate, onEnd) {
    this.flight = flight;
    this.onUpdate = onUpdate;
    this.onEnd = onEnd;
    this.active = false;
    this.time = 0;
    this.duration = KEYFRAMES[KEYFRAMES.length - 1].time;
    this.demoScore = 0;
    this.ringsCollected = new Set();
  }

  start() {
    this.active = true;
    this.time = 0;
    this.demoScore = 0;
    this.ringsCollected.clear();
    this.flight.crashed = false;
    this.flight.onGround = false;
    this.applyFrame(KEYFRAMES[0]);
    this.onUpdate({
      caption: KEYFRAMES[0].caption,
      keys: KEYFRAMES[0].keys,
      progress: 0,
    });
  }

  cancel() {
    this.active = false;
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.onEnd(true);
  }

  applyFrame(frame) {
    this.flight.position.set(frame.position[0], frame.position[1], frame.position[2]);
    this.flight.euler.set(frame.euler[0], frame.euler[1], frame.euler[2], "YXZ");
    this.flight.quaternion.setFromEuler(this.flight.euler);
    this.flight.throttle = frame.throttle;
    this.flight.angularVelocity.set(0, 0, 0);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.flight.quaternion);
    const speed = 18 + frame.throttle * 22;
    this.flight.velocity.copy(forward.multiplyScalar(speed));
    this.flight.onGround = frame.position[1] < 13.5 && frame.position[2] > 30;
  }

  getCurrentFrame() {
    if (this.time >= this.duration) return KEYFRAMES[KEYFRAMES.length - 1];

    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      const a = KEYFRAMES[i];
      const b = KEYFRAMES[i + 1];
      if (this.time >= a.time && this.time < b.time) {
        const t = smoothstep((this.time - a.time) / (b.time - a.time));
        return {
          position: [
            lerp(a.position[0], b.position[0], t),
            lerp(a.position[1], b.position[1], t),
            lerp(a.position[2], b.position[2], t),
          ],
          euler: [
            lerpAngle(a.euler[0], b.euler[0], t),
            lerpAngle(a.euler[1], b.euler[1], t),
            lerpAngle(a.euler[2], b.euler[2], t),
          ],
          throttle: lerp(a.throttle, b.throttle, t),
          caption: t < 0.5 ? a.caption : b.caption,
          keys: t < 0.5 ? a.keys : b.keys,
        };
      }
    }

    return KEYFRAMES[KEYFRAMES.length - 1];
  }

  checkRings(rings) {
    let collected = 0;
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      if (this.ringsCollected.has(i)) continue;
      if (this.flight.position.distanceTo(ring.position) < 8) {
        this.ringsCollected.add(i);
        ring.userData.collected = true;
        ring.visible = false;
        collected++;
      }
    }
    return collected;
  }

  update(dt, rings) {
    if (!this.active) return;

    this.time += dt;
    const frame = this.getCurrentFrame();
    this.applyFrame(frame);

    const collected = this.checkRings(rings);
    this.demoScore += collected * 100;

    this.onUpdate({
      caption: frame.caption,
      keys: frame.keys,
      progress: Math.min(1, this.time / this.duration),
      score: this.demoScore,
      collected,
    });

    if (this.time >= this.duration + 1.5) {
      this.finish();
    }
  }
}

export function createDemoUI(container) {
  container.innerHTML = `
    <div id="demo-banner">DEMO FLIGHT</div>
    <div id="demo-caption"></div>
    <div id="demo-keys"></div>
    <div id="demo-progress"><div id="demo-progress-bar"></div></div>
    <div id="demo-skip">Press Esc to skip</div>
  `;

  return {
    root: container,
    caption: container.querySelector("#demo-caption"),
    keys: container.querySelector("#demo-keys"),
    progressBar: container.querySelector("#demo-progress-bar"),
    setKeys(activeKeys) {
      const allKeys = ["W", "A", "S", "D", "Q", "E", "Shift", "Ctrl", "Space"];
      this.keys.innerHTML = allKeys
        .map((k) => `<kbd class="${activeKeys.includes(k) ? "active" : ""}">${k}</kbd>`)
        .join("");
    },
    setCaption(text) {
      this.caption.textContent = text;
    },
    setProgress(p) {
      this.progressBar.style.width = `${p * 100}%`;
    },
    show() {
      container.classList.remove("hidden");
    },
    hide() {
      container.classList.add("hidden");
    },
  };
}
