import * as THREE from "three";
import { createAircraftMesh, FlightModel } from "./airplane.js";
import { initControls, getInput } from "./controls.js";
import { createHUD, updateHUD } from "./hud.js";
import { DemoFlight, createDemoUI } from "./demo.js";
import { WindField } from "./wind.js";
import { SoundManager } from "./sounds.js";
import { Autopilot } from "./autopilot.js";
import {
  createWorld,
  terrainHeight,
  checkRingCollision,
  resetRings,
  createWaypointMarkers,
} from "./world.js";

const overlay = document.getElementById("overlay");
const menu = document.getElementById("menu");
const crashMsg = document.getElementById("crash-msg");
const crashDetail = document.getElementById("crash-detail");
const startBtn = document.getElementById("start-btn");
const demoBtn = document.getElementById("demo-btn");
const restartBtn = document.getElementById("restart-btn");
const aircraftSelect = document.getElementById("aircraft-select");
const aircraftSelectGame = document.getElementById("aircraft-select-game");
const inGamePanel = document.getElementById("in-game-panel");
const toggleControlsBtn = document.getElementById("toggle-controls-btn");
const hudContainer = document.getElementById("hud");
const demoContainer = document.getElementById("demo-ui");

const hud = createHUD(hudContainer);
const demoUI = createDemoUI(demoContainer);
const windField = new WindField();
const sounds = new SoundManager();
const autopilot = new Autopilot();

let playing = false;
let demoMode = false;
let score = 0;
let chaseCamera = true;
let selectedAircraft = "prop";
let aircraftMesh = null;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.insertBefore(renderer.domElement, overlay);

const scene = new THREE.Scene();
const world = createWorld(scene);
const waypoints = createWaypointMarkers(scene);

const flight = new FlightModel(selectedAircraft);
flight.reset(world.startPosition, world.startHeading);
autopilot.setMission(0);

function syncAircraftSelects(type) {
  if (aircraftSelect) aircraftSelect.value = type;
  if (aircraftSelectGame) aircraftSelectGame.value = type;
}

function showInGamePanel() {
  inGamePanel?.classList.remove("hidden");
  inGamePanel?.classList.remove("collapsed");
}

function hideInGamePanel() {
  inGamePanel?.classList.add("hidden");
}

function toggleInGamePanel() {
  if (inGamePanel?.classList.contains("hidden")) return;
  inGamePanel.classList.toggle("collapsed");
  toggleControlsBtn.textContent = inGamePanel.classList.contains("collapsed") ? "+" : "−";
}

function mountAircraft(type) {
  if (aircraftMesh) scene.remove(aircraftMesh);
  selectedAircraft = type;
  aircraftMesh = createAircraftMesh(type);
  aircraftMesh.castShadow = true;
  scene.add(aircraftMesh);
  flight.setType(type);
  syncAircraftSelects(type);
}

mountAircraft(selectedAircraft);

const chaseCam = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 800);
const cockpitCam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
let activeCamera = chaseCam;

function updateMissionMarkers() {
  const wps = autopilot.waypoints;
  if (wps.length && playing) {
    waypoints.setWaypoints(wps, autopilot.waypointIndex);
  } else {
    waypoints.hide();
  }
}

function updateCamera() {
  activeCamera = chaseCamera ? chaseCam : cockpitCam;

  if (chaseCamera) {
    const offset = new THREE.Vector3(0, 4, 14).applyQuaternion(flight.quaternion);
    chaseCam.position.copy(flight.position).add(offset);
    chaseCam.lookAt(
      flight.position.clone().add(new THREE.Vector3(0, 1, -8).applyQuaternion(flight.quaternion))
    );
  } else {
    const eye = new THREE.Vector3(0, 0.8, -0.5).applyQuaternion(flight.quaternion);
    cockpitCam.position.copy(flight.position).add(eye);
    cockpitCam.quaternion.copy(flight.quaternion);
  }
}

function syncMesh() {
  if (!aircraftMesh) return;
  aircraftMesh.position.copy(flight.position);
  aircraftMesh.quaternion.copy(flight.quaternion);

  const spinner = aircraftMesh.userData.spinner;
  if (spinner) {
    if (selectedAircraft === "helicopter") {
      spinner.rotation.y += flight.throttle * 0.5 + 0.08;
    } else {
      spinner.rotation.z += flight.throttle * 0.8 + 0.05;
    }
  }
  const tailRotor = aircraftMesh.userData.tailRotor;
  if (tailRotor) tailRotor.rotation.x += 0.4;
}

function refreshHUD(statusText = "") {
  const groundY = terrainHeight(flight.position.x, flight.position.z);
  updateHUD(hud, flight, groundY, score, flight.stallSpeed, {
    wind: windField.getDisplay(),
    missionText: autopilot.getStatusText(),
    autopilotOn: autopilot.enabled,
    statusText,
  });
}

function resetFlight() {
  stopDemo();
  sounds.resume();
  flight.reset(world.startPosition, world.startHeading);
  resetRings(world.rings);
  autopilot.completed = false;
  autopilot.waypointIndex = 0;
  score = 0;
  crashMsg.classList.add("hidden");
  menu.classList.add("hidden");
  playing = true;
  demoMode = false;
  overlay.classList.add("hidden");
  showInGamePanel();
  updateMissionMarkers();
}

function stopDemo() {
  demo.cancel();
  demoMode = false;
  demoUI.hide();
}

function startDemo() {
  sounds.resume();
  playing = false;
  demoMode = true;
  chaseCamera = true;
  resetRings(world.rings);
  waypoints.hide();
  score = 0;
  crashMsg.classList.add("hidden");
  menu.classList.add("hidden");
  overlay.classList.add("hidden");
  demoUI.show();
  showInGamePanel();
  demo.start();
}

function endDemo(completed) {
  demoMode = false;
  demoUI.hide();
  hideInGamePanel();
  overlay.classList.remove("hidden");
  menu.classList.remove("hidden");
  resetRings(world.rings);
  flight.reset(world.startPosition, world.startHeading);

  if (completed) {
    menu.querySelector(".subtitle").textContent =
      "Demo complete! Try missions, autopilot (F), or switch aircraft (1/2/3).";
  }
}

function switchAircraft(type) {
  sounds.resume();
  mountAircraft(type);
  if (playing) refreshHUD(`${flight.displayName} selected`);
}

function showCrash(reason) {
  playing = false;
  sounds.playCrash();
  hideInGamePanel();
  overlay.classList.remove("hidden");
  menu.classList.add("hidden");
  crashMsg.classList.remove("hidden");
  waypoints.hide();
  crashDetail.textContent =
    reason === "crash-hard"
      ? "Too fast or too steep on landing. Reduce speed and keep wings level!"
      : "Something went wrong. Check your speed and angle on approach.";
}

const demo = new DemoFlight(
  flight,
  ({ caption, keys, progress, score: demoScore, collected }) => {
    demoUI.setCaption(caption);
    demoUI.setKeys(keys);
    demoUI.setProgress(progress);
    score = demoScore ?? score;

    if (collected > 0) {
      sounds.playRing();
      refreshHUD(`+${collected * 100} RING BONUS!`);
    } else {
      refreshHUD("");
    }
  },
  endDemo
);

initControls((action) => {
  if (action === "skipDemo" && demoMode) {
    stopDemo();
    endDemo(false);
    return;
  }
  if (action === "toggleControlsPanel") {
    toggleInGamePanel();
    return;
  }
  if (demoMode) return;

  if (action === "aircraftProp") switchAircraft("prop");
  if (action === "aircraftJet") switchAircraft("jet");
  if (action === "aircraftHeli") switchAircraft("helicopter");

  if (!playing && !["aircraftProp", "aircraftJet", "aircraftHeli", "reset"].includes(action)) return;

  if (action === "toggleCamera") chaseCamera = !chaseCamera;
  if (action === "reset") resetFlight();

  if (action === "toggleAutopilot" && playing) {
    if (autopilot.mission.waypoints.length === 0) {
      refreshHUD("Select a mission with M first");
      return;
    }
    const on = autopilot.toggle();
    sounds.playAutopilot(on);
    refreshHUD(on ? "Autopilot engaged" : "Autopilot disengaged");
  }

  if (action === "nextMission" && playing) {
    autopilot.nextMission();
    autopilot.completed = false;
    updateMissionMarkers();
    refreshHUD(`Mission: ${autopilot.mission.name}`);
  }
});

startBtn.addEventListener("click", () => {
  selectedAircraft = aircraftSelect?.value || selectedAircraft;
  switchAircraft(selectedAircraft);
  resetFlight();
});
demoBtn.addEventListener("click", startDemo);
restartBtn.addEventListener("click", resetFlight);
aircraftSelect?.addEventListener("change", (e) => switchAircraft(e.target.value));
aircraftSelectGame?.addEventListener("change", (e) => switchAircraft(e.target.value));
toggleControlsBtn?.addEventListener("click", toggleInGamePanel);

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  chaseCam.aspect = w / h;
  chaseCam.updateProjectionMatrix();
  cockpitCam.aspect = w / h;
  cockpitCam.updateProjectionMatrix();
  renderer.setSize(w, h);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (demoMode) {
    demo.update(dt, world.rings);
    sounds.update({
      aircraftType: selectedAircraft,
      throttle: flight.throttle,
      speed: flight.getAirspeed(),
      onGround: flight.onGround,
      stallWarning: false,
    });
  } else if (playing && !flight.crashed) {
    const input = autopilot.mergeInput(getInput(), flight);
    const result = flight.update(dt, input, terrainHeight, windField);

    if (result === "crash-hard") showCrash("crash-hard");

    const wpResult = autopilot.advanceIfReached(flight);
    if (wpResult === "advance") {
      sounds.playWaypoint();
      updateMissionMarkers();
      refreshHUD(`Waypoint ${autopilot.waypointIndex}/${autopilot.waypoints.length}`);
    } else if (wpResult === "complete") {
      score += autopilot.mission.reward;
      sounds.playMissionComplete();
      updateMissionMarkers();
      refreshHUD(`Mission complete! +${autopilot.mission.reward}`);
    }

    const collected = checkRingCollision(flight.position, world.rings);
    if (collected > 0) {
      score += collected * 100;
      sounds.playRing();
      refreshHUD(`+${collected * 100} RING BONUS!`);
      setTimeout(() => {
        if (playing) refreshHUD("");
      }, 1500);
    } else {
      refreshHUD("");
    }

    const speed = flight.getAirspeed();
    const stallKts = flight.stallSpeed * 1.94384;
    sounds.update({
      aircraftType: selectedAircraft,
      throttle: flight.throttle,
      speed,
      onGround: flight.onGround,
      stallWarning: flight.stallSpeed > 0 && speed < stallKts && !flight.onGround,
    });
  }

  syncMesh();
  updateCamera();
  renderer.render(scene, activeCamera);
}

animate();
