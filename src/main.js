import * as THREE from "three";
import { createAirplane, FlightModel } from "./airplane.js";
import { initControls, getInput } from "./controls.js";
import { createHUD, updateHUD } from "./hud.js";
import { DemoFlight, createDemoUI } from "./demo.js";
import {
  createWorld,
  terrainHeight,
  checkRingCollision,
  resetRings,
} from "./world.js";

const overlay = document.getElementById("overlay");
const menu = document.getElementById("menu");
const crashMsg = document.getElementById("crash-msg");
const crashDetail = document.getElementById("crash-detail");
const startBtn = document.getElementById("start-btn");
const demoBtn = document.getElementById("demo-btn");
const restartBtn = document.getElementById("restart-btn");
const hudContainer = document.getElementById("hud");
const demoContainer = document.getElementById("demo-ui");

const hud = createHUD(hudContainer);
const demoUI = createDemoUI(demoContainer);

let playing = false;
let demoMode = false;
let score = 0;
let chaseCamera = true;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.insertBefore(renderer.domElement, overlay);

const scene = new THREE.Scene();
const world = createWorld(scene);

const airplaneMesh = createAirplane();
airplaneMesh.castShadow = true;
scene.add(airplaneMesh);

const flight = new FlightModel();
flight.reset(world.startPosition, world.startHeading);

const chaseCam = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 800);
const cockpitCam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
let activeCamera = chaseCam;

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
  airplaneMesh.position.copy(flight.position);
  airplaneMesh.quaternion.copy(flight.quaternion);

  const prop = airplaneMesh.userData.propeller;
  if (prop) {
    prop.rotation.z += flight.throttle * 0.8 + 0.05;
  }
}

function resetFlight() {
  stopDemo();
  flight.reset(world.startPosition, world.startHeading);
  resetRings(world.rings);
  score = 0;
  crashMsg.classList.add("hidden");
  menu.classList.add("hidden");
  playing = true;
  demoMode = false;
  overlay.classList.add("hidden");
}

function stopDemo() {
  demo.cancel();
  demoMode = false;
  demoUI.hide();
}

function startDemo() {
  playing = false;
  demoMode = true;
  chaseCamera = true;
  resetRings(world.rings);
  score = 0;
  crashMsg.classList.add("hidden");
  menu.classList.add("hidden");
  overlay.classList.add("hidden");
  demoUI.show();
  demo.start();
}

function endDemo(completed) {
  demoMode = false;
  demoUI.hide();
  overlay.classList.remove("hidden");
  menu.classList.remove("hidden");
  resetRings(world.rings);
  flight.reset(world.startPosition, world.startHeading);

  if (completed) {
    menu.querySelector(".subtitle").textContent =
      "Demo complete! Collect rings and land on the runway.";
  }
}

const demo = new DemoFlight(
  flight,
  ({ caption, keys, progress, score: demoScore, collected }) => {
    demoUI.setCaption(caption);
    demoUI.setKeys(keys);
    demoUI.setProgress(progress);
    score = demoScore ?? score;

    if (collected > 0) {
      hud.status.textContent = `+${collected * 100} RING BONUS!`;
      hud.status.className = "hud-top hud-panel";
      hud.status.style.opacity = "1";
    }

    const groundY = terrainHeight(flight.position.x, flight.position.z);
    updateHUD(hud, flight, groundY, score, flight.stallSpeed);
  },
  endDemo
);

function showCrash(reason) {
  playing = false;
  overlay.classList.remove("hidden");
  menu.classList.add("hidden");
  crashMsg.classList.remove("hidden");
  crashDetail.textContent =
    reason === "crash-hard"
      ? "Too fast or too steep on landing. Reduce speed and keep wings level!"
      : "Something went wrong. Check your speed and angle on approach.";
}

initControls((action) => {
  if (action === "skipDemo" && demoMode) {
    stopDemo();
    endDemo(false);
    return;
  }
  if (demoMode) return;
  if (!playing && action !== "reset") return;
  if (action === "toggleCamera") chaseCamera = !chaseCamera;
  if (action === "reset") resetFlight();
});

startBtn.addEventListener("click", resetFlight);
demoBtn.addEventListener("click", startDemo);
restartBtn.addEventListener("click", resetFlight);

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
  } else if (playing && !flight.crashed) {
    const input = getInput();
    const result = flight.update(dt, input, terrainHeight);

    if (result === "crash-hard") {
      showCrash("crash-hard");
    }

    const collected = checkRingCollision(flight.position, world.rings);
    score += collected * 100;

    if (collected > 0) {
      hud.status.textContent = `+${collected * 100} RING BONUS!`;
      hud.status.className = "hud-top hud-panel";
      hud.status.style.opacity = "1";
      setTimeout(() => {
        if (playing) hud.status.style.opacity = "0";
      }, 1500);
    }

    const groundY = terrainHeight(flight.position.x, flight.position.z);
    updateHUD(hud, flight, groundY, score, flight.stallSpeed);
  }

  syncMesh();
  updateCamera();
  renderer.render(scene, activeCamera);
}

animate();
