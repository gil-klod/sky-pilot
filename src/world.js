import * as THREE from "three";

function noise2D(x, z) {
  return (
    Math.sin(x * 0.04) * Math.cos(z * 0.03) * 4 +
    Math.sin(x * 0.015 + 1.3) * Math.cos(z * 0.02 + 0.7) * 8 +
    Math.sin(x * 0.008) * 3
  );
}

export function terrainHeight(x, z) {
  const distFromRunway = Math.abs(x);
  const runwayBlend = THREE.MathUtils.smoothstep(distFromRunway, 15, 80);
  const h = noise2D(x, z) * runwayBlend;
  return Math.max(h, -2);
}

export function createWorld(scene) {
  const world = { rings: [], clouds: [] };

  // Sky
  scene.background = new THREE.Color(0x5eb3f5);
  scene.fog = new THREE.Fog(0x8ec8f8, 120, 450);

  // Lighting
  const ambient = new THREE.AmbientLight(0xb8d4f0, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
  sun.position.set(80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  scene.add(sun);

  // Terrain mesh
  const size = 512;
  const segments = 128;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
  }
  geo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3d8b4a,
    roughness: 0.95,
    metalness: 0,
    flatShading: false,
  });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);
  world.ground = ground;

  // Water patch
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x1a6fb5, roughness: 0.3, metalness: 0.5 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-120, -1.5, 60);
  scene.add(water);

  // Runway
  const runwayGroup = new THREE.Group();
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 120),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.05, 0);
  runway.receiveShadow = true;
  runwayGroup.add(runway);

  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (let i = -5; i <= 5; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 4), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.06, i * 10);
    runwayGroup.add(stripe);
  }

  const thresholdMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
  const threshold = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), thresholdMat);
  threshold.rotation.x = -Math.PI / 2;
  threshold.position.set(0, 0.07, -55);
  runwayGroup.add(threshold);

  scene.add(runwayGroup);
  world.runway = runwayGroup;

  // Collectible rings
  const ringPositions = [
    [0, 35, -80],
    [40, 45, -120],
    [-35, 55, -160],
    [60, 40, -200],
    [-50, 65, -240],
    [0, 50, -280],
    [80, 35, -320],
    [-70, 45, -360],
    [0, 70, -400],
  ];

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.6,
    metalness: 0.5,
    roughness: 0.3,
  });

  for (const [x, y, z] of ringPositions) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 24), ringMat);
    ring.position.set(x, y, z);
    ring.userData.collected = false;
    scene.add(ring);
    world.rings.push(ring);
  }

  // Clouds
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    roughness: 1,
  });

  for (let i = 0; i < 30; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(Math.random() * 4);
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(4 + Math.random() * 6, 8, 8),
        cloudMat
      );
      puff.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 8);
      cloud.add(puff);
    }
    cloud.position.set(
      (Math.random() - 0.5) * 400,
      40 + Math.random() * 60,
      -50 - Math.random() * 400
    );
    scene.add(cloud);
    world.clouds.push(cloud);
  }

  // Start position marker
  world.startPosition = new THREE.Vector3(0, 12, 80);
  world.startHeading = 0;

  return world;
}

export function checkRingCollision(planePos, rings) {
  let collected = 0;
  for (const ring of rings) {
    if (ring.userData.collected) continue;
    const dist = planePos.distanceTo(ring.position);
    if (dist < 6) {
      ring.userData.collected = true;
      ring.visible = false;
      collected++;
    }
  }
  return collected;
}

export function resetRings(rings) {
  for (const ring of rings) {
    ring.userData.collected = false;
    ring.visible = true;
  }
}
