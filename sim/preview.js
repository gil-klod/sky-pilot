import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("previewCanvas");
const status = document.getElementById("previewStatus");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1522);

const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 5000);
camera.position.set(0, 28, 95);

scene.add(new THREE.HemisphereLight(0x9ec5e8, 0x1a2838, 0.9));

const sun = new THREE.DirectionalLight(0xfff4e6, 1.2);
sun.position.set(4, 8, 4);
scene.add(sun);

const fill = new THREE.DirectionalLight(0x88aacc, 0.35);
fill.position.set(-4, 2, -3);
scene.add(fill);

const loader = new GLTFLoader();
const models = {};
let current = null;
let spin = 0;
let sizeScale = 1;
let baseYaw = 0;

const planeSetup = {
  b744: { path: "/sim/assets/b744.glb", yaw: 0 },
  a380: { path: "/sim/assets/a380.glb", yaw: Math.PI / 2 },
};

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w <= 0 || h <= 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function frameModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += size.y * 0.35;

  const length = Math.max(size.z, size.x, size.y * 0.35);
  const dist = Math.max(length * 1.35, 55);
  camera.position.set(0, Math.max(size.y * 0.55, 12), dist);
  camera.lookAt(0, size.y * 0.35, 0);
}

function applySize() {
  if (!current) return;
  current.scale.setScalar(sizeScale);
}

async function loadPlane(id) {
  status.textContent = "Loading preview…";
  status.hidden = false;

  if (!models[id]) {
    const cfg = planeSetup[id];
    const gltf = await loader.loadAsync(cfg.path);
    const root = gltf.scene;
    root.rotation.set(0, cfg.yaw, 0);
    models[id] = root;
  }

  if (current && current !== models[id]) {
    scene.remove(current);
  }

  current = models[id];
  baseYaw = planeSetup[id].yaw;
  if (!current.parent) {
    scene.add(current);
    frameModel(current);
  }
  applySize();
  status.hidden = true;
}

function animate() {
  requestAnimationFrame(animate);
  spin += 0.005;
  if (current) {
    current.rotation.y = baseYaw + spin;
  }
  renderer.render(scene, camera);
}

window.hangarPreview = {
  plane: "b744",
  setPlane(id) {
    this.plane = id;
    return loadPlane(id).catch(() => {
      status.textContent = "Could not load preview — Fly still works.";
      status.hidden = false;
    });
  },
  setSize(scale) {
    sizeScale = scale;
    applySize();
  },
};

resize();
window.addEventListener("resize", resize);
loadPlane("b744").catch(() => {
  status.textContent = "Loading 3D preview…";
});
animate();
