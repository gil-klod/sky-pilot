import * as THREE from "three";

export const MISSIONS = [
  {
    id: "free",
    name: "Free Flight",
    waypoints: [],
    reward: 0,
  },
  {
    id: "patrol",
    name: "Island Patrol",
    waypoints: [
      [0, 40, -60],
      [70, 55, -140],
      [-60, 60, -220],
      [0, 45, -300],
    ],
    reward: 500,
  },
  {
    id: "transit",
    name: "Cross-Country",
    waypoints: [
      [0, 35, -80],
      [90, 50, -180],
      [-80, 55, -280],
      [0, 30, -380],
    ],
    reward: 750,
  },
  {
    id: "rtb",
    name: "Return to Base",
    waypoints: [
      [0, 50, -150],
      [0, 35, -50],
      [0, 18, 45],
    ],
    reward: 400,
  },
];

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class Autopilot {
  constructor() {
    this.enabled = false;
    this.missionIndex = 0;
    this.waypointIndex = 0;
    this.waypoints = [];
    this.completed = false;
  }

  get mission() {
    return MISSIONS[this.missionIndex];
  }

  setMission(index) {
    this.missionIndex = ((index % MISSIONS.length) + MISSIONS.length) % MISSIONS.length;
    this.waypointIndex = 0;
    this.completed = false;
    this.waypoints = MISSIONS[this.missionIndex].waypoints.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    );
  }

  nextMission() {
    this.setMission(this.missionIndex + 1);
    return this.mission;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  getCurrentWaypoint() {
    if (!this.waypoints.length || this.waypointIndex >= this.waypoints.length) return null;
    return this.waypoints[this.waypointIndex];
  }

  advanceIfReached(flight) {
    const wp = this.getCurrentWaypoint();
    if (!wp) return null;

    const horizDist = Math.hypot(flight.position.x - wp.x, flight.position.z - wp.z);
    const altDiff = Math.abs(flight.position.y - wp.y);

    if (horizDist < 35 && altDiff < 25) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        this.completed = true;
        this.enabled = false;
        return "complete";
      }
      return "advance";
    }
    return null;
  }

  getAutoInput(flight) {
    const wp = this.getCurrentWaypoint();
    if (!wp) return null;

    const dx = wp.x - flight.position.x;
    const dz = wp.z - flight.position.z;
    const dy = wp.y - flight.position.y;
    const horizDist = Math.hypot(dx, dz);

    const desiredHeading = Math.atan2(-dx, -dz);
    const headingErr = normalizeAngle(desiredHeading - flight.euler.y);

    const isHeli = flight.aircraftType === "helicopter";

    return {
      pitchUp: dy > (isHeli ? 4 : 8),
      pitchDown: dy < (isHeli ? -4 : -8),
      rollLeft: headingErr > 0.08,
      rollRight: headingErr < -0.08,
      yawLeft: headingErr > 0.25,
      yawRight: headingErr < -0.25,
      throttleUp: horizDist > 60 || dy > 15 || (isHeli && dy > 2),
      throttleDown: horizDist < 25 && dy < -8,
      brake: false,
    };
  }

  mergeInput(playerInput, flight) {
    if (!this.enabled || !this.waypoints.length) return playerInput;
    const auto = this.getAutoInput(flight);
    if (!auto) return playerInput;

    const merged = { ...playerInput };
    for (const key of Object.keys(auto)) {
      if (auto[key]) merged[key] = true;
    }
    return merged;
  }

  getStatusText() {
    if (this.mission.id === "free") return "FREE FLIGHT";
    if (this.completed) return "MISSION COMPLETE";
    if (!this.enabled) return `${this.mission.name.toUpperCase()} — press F for AP`;
    const wp = this.waypointIndex + 1;
    const total = this.waypoints.length;
    return `AP ON — WP ${wp}/${total}`;
  }
}
