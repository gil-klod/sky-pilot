import * as THREE from "three";

function addMesh(group, geometry, material, x, y, z, rotX = 0, rotY = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, rotY, rotZ);
  group.add(mesh);
  return mesh;
}

export function buildPropPlane(group) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8f0f8, metalness: 0.3, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.65,
  });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 3.2, 12), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 12), accentMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -1.9;
  group.add(nose);

  addMesh(group, new THREE.BoxGeometry(5.5, 0.08, 0.9), accentMat, 0, 0, 0.1);
  addMesh(group, new THREE.BoxGeometry(2.2, 0.06, 0.5), accentMat, 0, 0, 1.35);
  addMesh(group, new THREE.BoxGeometry(0.06, 0.9, 0.5), accentMat, 0, 0.45, 1.35);
  addMesh(group, new THREE.BoxGeometry(0.5, 0.35, 0.7), glassMat, 0, 0.25, -0.5);

  const prop = new THREE.Group();
  prop.position.z = -2.3;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.04), darkMat);
    blade.rotation.z = (i * Math.PI * 2) / 3;
    prop.add(blade);
  }
  group.add(prop);
  group.userData.spinner = prop;
}

export function buildJet(group) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.4, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.7,
  });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 4.2, 10), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 10), accentMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -2.6;
  group.add(nose);

  addMesh(group, new THREE.BoxGeometry(4.2, 0.06, 1.8), bodyMat, 0, -0.05, 0.2);
  addMesh(group, new THREE.BoxGeometry(2.8, 0.05, 0.8), bodyMat, 0, 0.35, 1.8);
  addMesh(group, new THREE.BoxGeometry(0.05, 1.1, 0.7), accentMat, 0, 0.65, 1.85);
  addMesh(group, new THREE.BoxGeometry(0.55, 0.3, 1.0), glassMat, 0, 0.28, -0.8);
}

export function buildHelicopter(group) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.35, roughness: 0.45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, metalness: 0.3, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbbf7d0, metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.65,
  });

  addMesh(group, new THREE.BoxGeometry(1.1, 1.0, 2.8), bodyMat, 0, 0.2, 0);
  addMesh(group, new THREE.BoxGeometry(0.9, 0.7, 1.2), glassMat, 0, 0.55, -0.4);
  addMesh(group, new THREE.BoxGeometry(0.18, 0.18, 2.5), darkMat, 0, 0.35, 2.2);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.35, 0.35, 3.3);
  const trBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.08), darkMat);
  tailRotor.add(trBlade);
  const trBlade2 = trBlade.clone();
  trBlade2.rotation.z = Math.PI / 2;
  tailRotor.add(trBlade2);
  group.add(tailRotor);
  group.userData.tailRotor = tailRotor;

  addMesh(group, new THREE.BoxGeometry(0.08, 0.08, 2.4), darkMat, -0.55, -0.35, 0);
  addMesh(group, new THREE.BoxGeometry(0.08, 0.08, 2.4), darkMat, 0.55, -0.35, 0);

  const rotor = new THREE.Group();
  rotor.position.y = 0.95;
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 3.8), darkMat);
    blade.rotation.y = (i * Math.PI) / 2;
    rotor.add(blade);
  }
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), bodyMat));
  group.add(rotor);
  group.userData.spinner = rotor;
}

export function createAircraftMesh(type = "prop") {
  const group = new THREE.Group();
  if (type === "jet") buildJet(group);
  else if (type === "helicopter") buildHelicopter(group);
  else buildPropPlane(group);
  group.scale.setScalar(type === "helicopter" ? 0.65 : 0.55);
  group.userData.aircraftType = type;
  return group;
}
