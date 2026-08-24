import * as THREE from "three";

export function createAirplane() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8f0f8, metalness: 0.3, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    metalness: 0.8,
    roughness: 0.1,
    transparent: true,
    opacity: 0.65,
  });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 3.2, 12), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 12), accentMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -1.9;
  group.add(nose);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.08, 0.9), accentMat);
  wing.position.set(0, 0, 0.1);
  group.add(wing);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.5), accentMat);
  tailWing.position.set(0, 0, 1.35);
  group.add(tailWing);

  const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.5), accentMat);
  vTail.position.set(0, 0.45, 1.35);
  group.add(vTail);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), glassMat);
  cockpit.position.set(0, 0.25, -0.5);
  group.add(cockpit);

  const propHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8), darkMat);
  propHub.rotation.x = Math.PI / 2;
  propHub.position.z = -2.25;
  group.add(propHub);

  const prop = new THREE.Group();
  prop.position.z = -2.3;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.04), darkMat);
    blade.rotation.z = (i * Math.PI * 2) / 3;
    prop.add(blade);
  }
  group.add(prop);
  group.userData.propeller = prop;

  group.scale.setScalar(0.55);
  return group;
}

export class FlightModel {
  constructor() {
    this.position = new THREE.Vector3(0, 12, 80);
    this.velocity = new THREE.Vector3(0, 0, -25);
    this.quaternion = new THREE.Quaternion();
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");

    this.throttle = 0.55;
    this.angularVelocity = new THREE.Vector3();

    this.maxThrust = 38;
    this.wingArea = 1.0;
    this.mass = 1.0;
    this.dragCoeff = 0.018;
    this.pitchRate = 1.4;
    this.rollRate = 2.2;
    this.yawRate = 0.9;
    this.stallSpeed = 14;
    this.maxSpeed = 75;
    this.onGround = false;
    this.crashed = false;
    this.gearDown = true;
  }

  reset(startPos, startHeading) {
    this.position.copy(startPos);
    this.velocity.set(0, 0, -25).applyAxisAngle(new THREE.Vector3(0, 1, 0), startHeading);
    this.euler.set(0, startHeading, 0, "YXZ");
    this.quaternion.setFromEuler(this.euler);
    this.throttle = 0.55;
    this.angularVelocity.set(0, 0, 0);
    this.onGround = false;
    this.crashed = false;
  }

  update(dt, input, terrainHeight) {
    if (this.crashed) return;

    const groundY = terrainHeight(this.position.x, this.position.z);
    const altAGL = this.position.y - groundY;
    this.onGround = altAGL < 1.2 && this.velocity.length() < 8;

    // Throttle
    if (input.throttleUp) this.throttle = Math.min(1, this.throttle + dt * 0.5);
    if (input.throttleDown) this.throttle = Math.max(0, this.throttle - dt * 0.5);

    // Control surfaces
    const controlScale = this.onGround ? 0.3 : 1.0;
    const pitchInput = (input.pitchUp ? -1 : 0) + (input.pitchDown ? 1 : 0);
    const rollInput = (input.rollLeft ? 1 : 0) + (input.rollRight ? -1 : 0);
    const yawInput = (input.yawLeft ? 1 : 0) + (input.yawRight ? -1 : 0);

    this.angularVelocity.x = THREE.MathUtils.lerp(
      this.angularVelocity.x,
      pitchInput * this.pitchRate * controlScale,
      dt * 4
    );
    this.angularVelocity.z = THREE.MathUtils.lerp(
      this.angularVelocity.z,
      rollInput * this.rollRate * controlScale,
      dt * 4
    );
    this.angularVelocity.y = THREE.MathUtils.lerp(
      this.angularVelocity.y,
      yawInput * this.yawRate * controlScale,
      dt * 4
    );

    // Apply rotation
    this.euler.x += this.angularVelocity.x * dt;
    this.euler.z += this.angularVelocity.z * dt;
    this.euler.y += this.angularVelocity.y * dt;
    this.euler.x = THREE.MathUtils.clamp(this.euler.x, -0.8, 0.8);
    this.quaternion.setFromEuler(this.euler);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const speed = this.velocity.length();

    // Thrust
    const thrust = forward.clone().multiplyScalar(this.throttle * this.maxThrust);

    // Lift (simplified)
    const dynamicPressure = 0.5 * speed * speed;
    const liftCoeff = THREE.MathUtils.clamp(1.2 - Math.abs(this.euler.x) * 1.5, 0.1, 1.3);
    const stallFactor = speed < this.stallSpeed ? (speed / this.stallSpeed) ** 2 : 1;
    const lift = up.clone().multiplyScalar(dynamicPressure * this.wingArea * liftCoeff * stallFactor * 0.035);

    // Drag + gravity
    const drag = this.velocity.clone().normalize().multiplyScalar(-dynamicPressure * this.dragCoeff);
    if (this.velocity.lengthSq() < 0.01) drag.set(0, 0, 0);
    const gravity = new THREE.Vector3(0, -9.81 * this.mass, 0);

    // Ground interaction
    if (this.onGround) {
      this.position.y = groundY + 1.0;
      if (this.velocity.y < 0) this.velocity.y = 0;
      if (input.brake) this.velocity.multiplyScalar(1 - dt * 3);

      const forwardSpeed = this.velocity.dot(forward);
      if (forwardSpeed > 0) {
        this.velocity.copy(forward.multiplyScalar(forwardSpeed));
      }
    }

    const accel = new THREE.Vector3()
      .add(thrust)
      .add(lift)
      .add(drag)
      .add(gravity)
      .divideScalar(this.mass);

    this.velocity.add(accel.multiplyScalar(dt));

    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.setLength(this.maxSpeed);
    }

    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // Crash detection
    if (altAGL < 0.3 && !this.onGround) {
      const impact = speed;
      if (impact > 22 || Math.abs(this.euler.x) > 0.5 || Math.abs(this.euler.z) > 0.6) {
        this.crashed = true;
        return "crash-hard";
      }
      // Soft landing
      this.position.y = groundY + 1.0;
      this.velocity.multiplyScalar(0.4);
      this.onGround = true;
      return "landed";
    }

    return null;
  }

  getAirspeed() {
    return this.velocity.length() * 1.94384; // m/s → knots (approx display)
  }

  getAltitude(groundY) {
    return (this.position.y - groundY) * 3.28084; // feet
  }

  getHeading() {
    const h = ((this.euler.y * 180) / Math.PI + 360) % 360;
    return h;
  }
}
