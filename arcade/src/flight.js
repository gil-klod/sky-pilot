import * as THREE from "three";
import { applyTurbulence } from "./wind.js";

export const AIRCRAFT = {
  prop: {
    name: "Prop Plane",
    maxThrust: 38, wingArea: 1.0, mass: 1.0, dragCoeff: 0.018,
    pitchRate: 1.4, rollRate: 2.2, yawRate: 0.9,
    stallSpeed: 14, maxSpeed: 75, groundClearance: 1.0, crashSpeed: 22, hoverThrottle: null,
  },
  jet: {
    name: "Jet Fighter",
    maxThrust: 68, wingArea: 0.85, mass: 1.2, dragCoeff: 0.012,
    pitchRate: 2.0, rollRate: 3.0, yawRate: 1.1,
    stallSpeed: 22, maxSpeed: 130, groundClearance: 1.0, crashSpeed: 35, hoverThrottle: null,
  },
  helicopter: {
    name: "Helicopter",
    maxThrust: 52, wingArea: 0, mass: 1.1, dragCoeff: 0.022,
    pitchRate: 1.6, rollRate: 1.8, yawRate: 1.4,
    stallSpeed: 0, maxSpeed: 55, groundClearance: 1.2, crashSpeed: 18, hoverThrottle: 0.52,
  },
};

export class FlightModel {
  constructor(type = "prop") {
    this.aircraftType = type;
    this.position = new THREE.Vector3(0, 12, 80);
    this.velocity = new THREE.Vector3(0, 0, -25);
    this.quaternion = new THREE.Quaternion();
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.throttle = 0.55;
    this.angularVelocity = new THREE.Vector3();
    this.onGround = false;
    this.crashed = false;
    this.windTime = 0;
    this.applyConfig(type);
  }

  applyConfig(type) {
    const cfg = AIRCRAFT[type] || AIRCRAFT.prop;
    this.aircraftType = type;
    this.displayName = cfg.name;
    Object.assign(this, cfg);
  }

  setType(type) {
    this.applyConfig(type);
    if (type === "helicopter") this.throttle = 0.52;
  }

  reset(startPos, startHeading) {
    this.position.copy(startPos);
    this.velocity.set(0, 0, -25).applyAxisAngle(new THREE.Vector3(0, 1, 0), startHeading);
    this.euler.set(0, startHeading, 0, "YXZ");
    this.quaternion.setFromEuler(this.euler);
    this.throttle = this.hoverThrottle ?? 0.55;
    this.angularVelocity.set(0, 0, 0);
    this.onGround = false;
    this.crashed = false;
    this.windTime = 0;
  }

  applyControls(dt, input) {
    if (input.throttleUp) this.throttle = Math.min(1, this.throttle + dt * 0.5);
    if (input.throttleDown) this.throttle = Math.max(0, this.throttle - dt * 0.5);

    const controlScale = this.onGround ? 0.3 : 1.0;
    const pitchInput = (input.pitchUp ? -1 : 0) + (input.pitchDown ? 1 : 0);
    const rollInput = (input.rollLeft ? 1 : 0) + (input.rollRight ? -1 : 0);
    const yawInput = (input.yawLeft ? 1 : 0) + (input.yawRight ? -1 : 0);

    this.angularVelocity.x = THREE.MathUtils.lerp(
      this.angularVelocity.x, pitchInput * this.pitchRate * controlScale, dt * 4
    );
    this.angularVelocity.z = THREE.MathUtils.lerp(
      this.angularVelocity.z, rollInput * this.rollRate * controlScale, dt * 4
    );
    this.angularVelocity.y = THREE.MathUtils.lerp(
      this.angularVelocity.y, yawInput * this.yawRate * controlScale, dt * 4
    );

    this.windTime += dt;
    applyTurbulence(
      this.euler, this.angularVelocity, this.position, this.windTime,
      this.aircraftType === "helicopter" ? 0.7 : 1
    );

    this.euler.x += this.angularVelocity.x * dt;
    this.euler.z += this.angularVelocity.z * dt;
    this.euler.y += this.angularVelocity.y * dt;
    this.euler.x = THREE.MathUtils.clamp(this.euler.x, this.aircraftType === "helicopter" ? -0.55 : -0.8, 0.8);
    this.quaternion.setFromEuler(this.euler);
  }

  updateFixedWing(dt, input, terrainHeight, wind) {
    const groundY = terrainHeight(this.position.x, this.position.z);
    const altAGL = this.position.y - groundY;
    this.onGround = altAGL < 1.2 && this.velocity.length() < 8;

    this.applyControls(dt, input);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const airVelocity = this.velocity.clone().sub(wind);
    const airSpeed = airVelocity.length();

    const thrust = forward.clone().multiplyScalar(this.throttle * this.maxThrust);
    const dynamicPressure = 0.5 * airSpeed * airSpeed;
    const liftCoeff = THREE.MathUtils.clamp(1.2 - Math.abs(this.euler.x) * 1.5, 0.1, 1.3);
    const stallFactor = airSpeed < this.stallSpeed ? (airSpeed / this.stallSpeed) ** 2 : 1;
    const lift = up.clone().multiplyScalar(dynamicPressure * this.wingArea * liftCoeff * stallFactor * 0.035);

    const drag = airVelocity.lengthSq() > 0.01
      ? airVelocity.clone().normalize().multiplyScalar(-dynamicPressure * this.dragCoeff)
      : new THREE.Vector3();

    if (this.onGround) {
      this.position.y = groundY + this.groundClearance;
      if (this.velocity.y < 0) this.velocity.y = 0;
      if (input.brake) this.velocity.multiplyScalar(1 - dt * 3);
      const forwardSpeed = this.velocity.dot(forward);
      if (forwardSpeed > 0) this.velocity.copy(forward.multiplyScalar(forwardSpeed));
    }

    const accel = new THREE.Vector3()
      .add(thrust).add(lift).add(drag)
      .add(new THREE.Vector3(0, -9.81 * this.mass, 0))
      .add(wind.clone().multiplyScalar(0.35))
      .divideScalar(this.mass);

    this.velocity.add(accel.multiplyScalar(dt));
    if (this.velocity.length() > this.maxSpeed) this.velocity.setLength(this.maxSpeed);
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    return { groundY, altAGL };
  }

  updateHelicopter(dt, input, terrainHeight, wind) {
    const groundY = terrainHeight(this.position.x, this.position.z);
    const altAGL = this.position.y - groundY;
    this.onGround = altAGL < 1.3 && this.velocity.length() < 4;

    this.applyControls(dt, input);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const collective = (this.throttle - this.hoverThrottle) * this.maxThrust * 1.4;

    if (this.onGround) {
      this.position.y = groundY + this.groundClearance;
      if (input.brake) this.velocity.multiplyScalar(1 - dt * 4);
    }

    const accel = new THREE.Vector3()
      .add(up.clone().multiplyScalar(collective + 9.81 * this.mass))
      .add(forward.clone().multiplyScalar(this.throttle * 18))
      .add(this.velocity.clone().multiplyScalar(-0.35))
      .add(wind.clone().multiplyScalar(0.25))
      .add(new THREE.Vector3(0, -9.81 * this.mass, 0))
      .divideScalar(this.mass);

    this.velocity.add(accel.multiplyScalar(dt));
    if (this.velocity.length() > this.maxSpeed) this.velocity.setLength(this.maxSpeed);
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    return { groundY, altAGL };
  }

  update(dt, input, terrainHeight, windField) {
    if (this.crashed) return;

    const groundY = terrainHeight(this.position.x, this.position.z);
    const altAGL = this.position.y - groundY;
    const wind = windField.getWindAt(this.position, altAGL, dt);

    const result = this.aircraftType === "helicopter"
      ? this.updateHelicopter(dt, input, terrainHeight, wind)
      : this.updateFixedWing(dt, input, terrainHeight, wind);

    const speed = this.velocity.length();
    if (result.altAGL < 0.3 && !this.onGround) {
      if (speed > this.crashSpeed || Math.abs(this.euler.x) > 0.55 || Math.abs(this.euler.z) > 0.65) {
        this.crashed = true;
        return "crash-hard";
      }
      this.position.y = result.groundY + this.groundClearance;
      this.velocity.multiplyScalar(0.4);
      this.onGround = true;
      return "landed";
    }
    return null;
  }

  getAirspeed() {
    return this.velocity.length() * 1.94384;
  }

  getAltitude(groundY) {
    return (this.position.y - groundY) * 3.28084;
  }

  getHeading() {
    return ((this.euler.y * 180) / Math.PI + 360) % 360;
  }
}
