import * as THREE from "three";

export class WindField {
  constructor() {
    this.baseWind = new THREE.Vector3(6, 0, 3);
    this.turbulenceStrength = 2.5;
    this.time = 0;
  }

  getWindAt(position, altitude, dt) {
    this.time += dt;

    const altFactor = THREE.MathUtils.clamp(altitude / 80, 0.3, 1.2);
    const gust =
      Math.sin(position.x * 0.04 + this.time * 1.7) *
      Math.cos(position.z * 0.035 + this.time * 1.3);
    const shear = Math.sin(altitude * 0.06 + this.time * 0.8) * 0.4;

    const turbulence = new THREE.Vector3(
      Math.sin(position.x * 0.06 + this.time * 2.1) * this.turbulenceStrength,
      Math.sin(position.y * 0.09 + this.time * 1.6) * this.turbulenceStrength * 0.35,
      Math.cos(position.z * 0.05 + this.time * 1.9) * this.turbulenceStrength
    );

    return this.baseWind
      .clone()
      .multiplyScalar(altFactor * (1 + gust * 0.25 + shear))
      .add(turbulence);
  }

  getDisplay(speedFactor = 1) {
    const kts = this.baseWind.length() * 1.94384 * speedFactor;
    const dir = ((Math.atan2(-this.baseWind.x, -this.baseWind.z) * 180) / Math.PI + 360) % 360;
    return { kts: Math.round(kts), dir: Math.round(dir) };
  }
}

export function applyTurbulence(euler, angularVelocity, position, time, strength = 1) {
  const bump = 0.012 * strength;
  angularVelocity.x += Math.sin(time * 3.1 + position.z * 0.1) * bump;
  angularVelocity.z += Math.cos(time * 2.7 + position.x * 0.1) * bump;
  angularVelocity.y += Math.sin(time * 2.2 + position.y * 0.08) * bump * 0.5;
}
