import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const game = document.querySelector("#game");
const hud = document.querySelector("#hud");
const startScreen = document.querySelector("#startScreen");
const startButton = document.querySelector("#startButton");
const objectiveEl = document.querySelector("#objective");
const lodBadge = document.querySelector("#lodBadge");
const distanceEl = document.querySelector("#towerDistance");
const promptEl = document.querySelector("#prompt");
const toastEl = document.querySelector("#toast");
const lensButton = document.querySelector("#lensButton");
const actionButton = document.querySelector("#actionButton");
const puzzle = document.querySelector("#puzzle");
const sequenceEl = document.querySelector("#sequence");
const puzzleHint = document.querySelector("#puzzleHint");
const resetPuzzle = document.querySelector("#resetPuzzle");
const closePuzzle = document.querySelector("#closePuzzle");
const journal = document.querySelector("#journal");
const journalTitle = document.querySelector("#journalTitle");
const journalText = document.querySelector("#journalText");
const journalClose = document.querySelector("#journalClose");
const stickBase = document.querySelector("#stickBase");
const stickKnob = document.querySelector("#stickKnob");

const isCoarsePointer = matchMedia("(pointer: coarse)").matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc4d2);
scene.fog = new THREE.FogExp2(0xa7c4c5, 0.0085);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.04, 420);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
  antialias: !isCoarsePointer,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarsePointer ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = !isCoarsePointer;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
game.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xeaf8ff, 0x3a4b3b, 2.35);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1ce, 2.2);
sun.position.set(-40, 75, 35);
sun.castShadow = !isCoarsePointer;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
scene.add(sun);

const clock = new THREE.Clock();
const player = new THREE.Vector3(0, 1.68, 24);
// Three.js cameras face -Z at yaw=0. Start facing the observation tower.
let yaw = 0;
let pitch = -0.035;
let started = false;
let modalOpen = false;
let lensOwned = false;
let lensActive = false;
let doorOpened = false;
let towerDoorSeen = false;
let toastTimer = 0;
let lodLevel = 3;
let previousLod = 3;
const move = { forward: 0, right: 0 };
const keys = new Set();
const towerPos = new THREE.Vector3(0, 0, -72);

const state = {
  treeBasic: false,
  statueBasic: false,
  springBasic: false,
  treeDeep: false,
  statueDeep: false,
  springDeep: false,
  lensCollected: false
};

const interactables = [];
const lodObjects = [];
const treeDetailTargets = [];
const hillDetailTargets = [];
let nearestInteractable = null;
let groundDetail = null;
let treeDetailProxy = null;
let hillDetailProxy = null;

const MAT = {
  grass: new THREE.MeshLambertMaterial({ color: 0x71965b }),
  grass2: new THREE.MeshLambertMaterial({ color: 0x88a968 }),
  earth: new THREE.MeshLambertMaterial({ color: 0x725943 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x626b68 }),
  stoneDark: new THREE.MeshLambertMaterial({ color: 0x313839 }),
  stoneLight: new THREE.MeshLambertMaterial({ color: 0x87918b }),
  wood: new THREE.MeshLambertMaterial({ color: 0x5c3d28 }),
  woodLight: new THREE.MeshLambertMaterial({ color: 0x876344 }),
  waterDry: new THREE.MeshLambertMaterial({ color: 0x826e55 }),
  glow: new THREE.MeshStandardMaterial({ color: 0x94eaff, emissive: 0x4bb9de, emissiveIntensity: 2.2 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd7b96f, emissive: 0x5c4514, emissiveIntensity: 0.35 }),
  black: new THREE.MeshLambertMaterial({ color: 0x161d1e })
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = !isCoarsePointer;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(r, h, mat, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), mat);
  mesh.castShadow = !isCoarsePointer;
  mesh.receiveShadow = true;
  return mesh;
}

function addVoxelPanel(parent, {
  width,
  height,
  cell,
  depth = cell * 0.72,
  x = 0,
  y = 0,
  z = 0,
  material = MAT.stone,
  axis = "z",
  inset = 0,
  seed = 0
}) {
  const cols = Math.max(1, Math.floor(width / cell));
  const rows = Math.max(1, Math.floor(height / cell));
  const count = cols * rows;
  const geometry = axis === "y"
    ? new THREE.BoxGeometry(cell * 0.92, depth, cell * 0.92)
    : axis === "x"
      ? new THREE.BoxGeometry(depth, cell * 0.92, cell * 0.92)
      : new THREE.BoxGeometry(cell * 0.92, cell * 0.92, depth);
  const inst = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  let n = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const u = (col + 0.5) / cols - 0.5;
      const v = (row + 0.5) / rows - 0.5;
      const noise = Math.sin((col + seed * 13.1) * 1.713 + (row + seed * 7.7) * 2.137) * cell * 0.12;

      if (axis === "y") {
        dummy.position.set(x + u * width, y + noise - inset, z + v * height);
      } else if (axis === "x") {
        dummy.position.set(x + noise - inset, y + v * height, z + u * width);
      } else {
        dummy.position.set(x + u * width, y + v * height, z + noise - inset);
      }

      const scaleNoise = 0.9 + ((col * 17 + row * 31 + seed * 11) % 7) * 0.018;
      dummy.scale.setScalar(scaleNoise);
      dummy.updateMatrix();
      inst.setMatrixAt(n++, dummy.matrix);
    }
  }

  inst.castShadow = false;
  inst.receiveShadow = true;
  inst.frustumCulled = true;
  parent.add(inst);
  return inst;
}

function addMicroGlyph(parent, x, y, z, material = MAT.glow, scale = 1) {
  const pattern = [
    [0,0],[1,0],[2,0],
    [0,1],[2,1],
    [1,2],
    [1,3]
  ];
  const cell = 0.035 * scale;
  for (const [gx, gy] of pattern) {
    parent.add(box(cell, cell, cell * 0.55, material,
      x + (gx - 1) * cell * 1.08,
      y + (1.5 - gy) * cell * 1.08,
      z));
  }
}

function addVoxelBoxShell(parent, {
  width,
  height,
  depth,
  cell,
  material,
  x = 0,
  y = 0,
  z = 0,
  seed = 0,
  top = true
}) {
  const skin = Math.max(cell * 0.62, 0.012);
  addVoxelPanel(parent, { width, height, cell, depth: skin, x, y, z: z + depth * 0.5, material, axis: "z", seed: seed + 1 });
  addVoxelPanel(parent, { width, height, cell, depth: skin, x, y, z: z - depth * 0.5, material, axis: "z", seed: seed + 2 });
  addVoxelPanel(parent, { width: depth, height, cell, depth: skin, x: x + width * 0.5, y, z, material, axis: "x", seed: seed + 3 });
  addVoxelPanel(parent, { width: depth, height, cell, depth: skin, x: x - width * 0.5, y, z, material, axis: "x", seed: seed + 4 });
  if (top) {
    addVoxelPanel(parent, { width, height: depth, cell, depth: skin, x, y: y + height * 0.5, z, material, axis: "y", seed: seed + 5 });
  }
}

function createGroundDetail() {
  const root = new THREE.Group();
  root.renderOrder = 3;

  const near = new THREE.Group();
  addVoxelPanel(near, {
    width: 9.0, height: 9.0, cell: 0.14, depth: 0.055,
    y: 0.015, material: MAT.grass2, axis: "y", seed: 23
  });

  const micro = new THREE.Group();
  addVoxelPanel(micro, {
    width: 3.2, height: 3.2, cell: 0.038, depth: 0.025,
    y: 0.052, material: MAT.grass2, axis: "y", seed: 29
  });
  addVoxelPanel(micro, {
    width: 1.75, height: 1.75, cell: 0.021, depth: 0.017,
    y: 0.078, material: MAT.earth, axis: "y", seed: 31
  });

  root.add(near, micro);
  scene.add(root);
  return { root, near, micro };
}

function createTreeDetailProxy() {
  const root = new THREE.Group();
  root.visible = false;

  const near = new THREE.Group();
  addVoxelBoxShell(near, {
    width: 0.84, height: 4.0, depth: 0.84, cell: 0.075,
    material: MAT.woodLight, y: 2.0, seed: 41
  });
  addVoxelBoxShell(near, {
    width: 4.2, height: 2.2, depth: 3.6, cell: 0.16,
    material: MAT.grass2, y: 4.4, seed: 43
  });
  addVoxelBoxShell(near, {
    width: 2.7, height: 2.1, depth: 4.5, cell: 0.15,
    material: MAT.grass, x: 0.8, y: 5.2, seed: 47
  });

  const micro = new THREE.Group();
  addVoxelBoxShell(micro, {
    width: 0.86, height: 4.0, depth: 0.86, cell: 0.026,
    material: MAT.woodLight, y: 2.0, seed: 53
  });
  addVoxelBoxShell(micro, {
    width: 4.22, height: 2.22, depth: 3.62, cell: 0.065,
    material: MAT.grass2, y: 4.4, seed: 59
  });
  addVoxelBoxShell(micro, {
    width: 2.72, height: 2.12, depth: 4.52, cell: 0.06,
    material: MAT.grass, x: 0.8, y: 5.2, seed: 61
  });

  // Bark fissures become individually readable only at arm's length.
  for (let i = 0; i < 42; i++) {
    const yy = 0.35 + (i % 14) * 0.245;
    const xx = -0.36 + Math.floor(i / 14) * 0.36;
    micro.add(box(0.018, 0.12, 0.015, MAT.black, xx, yy, 0.438));
  }

  root.add(near, micro);
  scene.add(root);
  return { root, near, micro };
}

function createHillDetailProxy() {
  const root = new THREE.Group();
  root.visible = false;

  const near = new THREE.Group();
  addVoxelBoxShell(near, {
    width: 10, height: 5.0, depth: 8.2, cell: 0.18,
    material: MAT.stoneLight, y: 2.5, seed: 67
  });

  const micro = new THREE.Group();
  addVoxelBoxShell(micro, {
    width: 10, height: 5.0, depth: 8.2, cell: 0.055,
    material: MAT.stoneLight, y: 2.5, seed: 71
  });

  root.add(near, micro);
  scene.add(root);
  return { root, near, micro };
}

function updateLocalDetail() {
  if (groundDetail) {
    // Snap the patch so detail feels anchored to the world instead of sliding underfoot.
    const snap = 0.35;
    groundDetail.root.position.set(
      Math.round(player.x / snap) * snap,
      0,
      Math.round(player.z / snap) * snap
    );
    groundDetail.near.visible = true;
    groundDetail.micro.visible = true;
  }

  if (treeDetailProxy && treeDetailTargets.length) {
    let nearest = null;
    let nearestD = Infinity;
    for (const target of treeDetailTargets) {
      const d = player.distanceTo(target.position);
      if (d < nearestD) {
        nearestD = d;
        nearest = target;
      }
    }

    const limit = nearest ? 17 * nearest.scale : 0;
    treeDetailProxy.root.visible = !!nearest && nearestD < limit;
    if (treeDetailProxy.root.visible) {
      treeDetailProxy.root.position.copy(nearest.position);
      treeDetailProxy.root.scale.setScalar(nearest.scale);
      const microRange = lensOwned && lensActive ? 6.5 * nearest.scale : 3.2 * nearest.scale;
      treeDetailProxy.near.visible = nearestD >= microRange;
      treeDetailProxy.micro.visible = nearestD < microRange;
    }
  }

  if (hillDetailProxy && hillDetailTargets.length) {
    let nearest = null;
    let nearestD = Infinity;
    for (const target of hillDetailTargets) {
      const d = player.distanceTo(target.position);
      if (d < nearestD) {
        nearestD = d;
        nearest = target;
      }
    }

    hillDetailProxy.root.visible = !!nearest && nearestD < 24;
    if (hillDetailProxy.root.visible) {
      hillDetailProxy.root.position.copy(nearest.position);
      hillDetailProxy.root.scale.set(
        nearest.width / 10,
        Math.max(0.7, nearest.height / 8),
        nearest.width * 0.82 / 8.2
      );
      const microRange = lensOwned && lensActive ? 7.5 : 3.6;
      hillDetailProxy.near.visible = nearestD >= microRange;
      hillDetailProxy.micro.visible = nearestD < microRange;
    }
  }
}

function addGround() {
  const ground = box(220, 1, 240, MAT.grass, 0, -0.55, -70);
  ground.receiveShadow = true;
  scene.add(ground);

  const tileGeo = new THREE.BoxGeometry(2.4, 0.28, 2.4);
  const tileMat = MAT.grass2;
  const count = isCoarsePointer ? 180 : 300;
  const inst = new THREE.InstancedMesh(tileGeo, tileMat, count);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let i = 0; i < count * 2 && placed < count; i++) {
    const x = (Math.random() - 0.5) * 145;
    const z = 28 - Math.random() * 165;
    if (Math.abs(x) < 5 && z > -82) continue;
    dummy.position.set(x, -0.02 + Math.random() * 0.05, z);
    dummy.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
    const s = 0.55 + Math.random() * 0.8;
    dummy.scale.set(s, 1, s);
    dummy.updateMatrix();
    inst.setMatrixAt(placed++, dummy.matrix);
  }
  inst.count = placed;
  inst.receiveShadow = true;
  scene.add(inst);

  addHill(-48, -102, 26, 16);
  addHill(42, -118, 34, 22);
  addHill(-62, -144, 48, 31);
  addHill(62, -158, 46, 34);

  for (let i = 0; i < 38; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (14 + Math.random() * 50);
    const z = 12 - Math.random() * 145;
    addTree(x, z, 0.7 + Math.random() * 1.5);
  }

  const pathMat = new THREE.MeshLambertMaterial({ color: 0x9b8b69 });
  for (let i = 0; i < 23; i++) {
    const z = 18 - i * 4.1;
    const x = Math.sin(i * 0.6) * 2.5;
    const p = box(3.2 + Math.random() * 1.4, 0.12, 3.0, pathMat, x, 0.06, z);
    p.rotation.y = Math.sin(i) * 0.13;
    scene.add(p);
  }
}

function addHill(x, z, width, height) {
  const g = new THREE.Group();
  const levels = 5;
  for (let i = 0; i < levels; i++) {
    const w = width * (1 - i * 0.14);
    const h = height / levels;
    const b = box(w, h + 0.4, w * 0.82, i > 3 ? MAT.stoneLight : MAT.stone, 0, i * h * 0.68, 0);
    b.position.x += (i % 2 ? 1 : -1) * width * 0.035;
    g.add(b);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  hillDetailTargets.push({
    position: new THREE.Vector3(x, Math.max(0.2, height * 0.12), z),
    width,
    height
  });
}

function addTree(x, z, scale = 1) {
  const g = new THREE.Group();
  g.add(box(0.8 * scale, 4 * scale, 0.8 * scale, MAT.wood, 0, 2 * scale, 0));
  g.add(box(4.2 * scale, 2.2 * scale, 3.6 * scale, MAT.grass2, 0, 4.4 * scale, 0));
  g.add(box(2.7 * scale, 2.1 * scale, 4.5 * scale, MAT.grass, 0.8 * scale, 5.2 * scale, 0));
  g.position.set(x, 0, z);
  scene.add(g);
  treeDetailTargets.push({
    position: new THREE.Vector3(x, 0, z),
    scale
  });
}

function createLODLandmark(position) {
  const root = new THREE.Group();
  root.position.copy(position);
  root.userData.levels = [];
  scene.add(root);
  lodObjects.push(root);
  return root;
}

function addLevel(root, level, group) {
  group.userData.lodLevel = level;
  root.userData.levels.push(group);
  root.add(group);
  return group;
}

function makeTower() {
  const root = createLODLandmark(towerPos);

  const coarse = new THREE.Group();
  coarse.add(box(14, 27, 14, MAT.stoneDark, 0, 13.5, 0));
  coarse.add(box(9, 9, 9, MAT.black, 0, 31.5, 0));
  coarse.add(box(2.6, 10, 2.6, MAT.black, -2, 40, 0));
  addLevel(root, 3, coarse);

  const mid = new THREE.Group();
  mid.add(box(14, 5, 14, MAT.stoneDark, 0, 2.5, 0));
  mid.add(box(12.5, 5, 12.5, MAT.stone, 0, 7.4, 0));
  mid.add(box(11, 5, 11, MAT.stoneDark, 0, 12.3, 0));
  mid.add(box(10, 8, 10, MAT.stone, 0, 18.5, 0));
  mid.add(box(9, 8, 9, MAT.stoneDark, 0, 26.5, 0));
  mid.add(box(7, 7, 7, MAT.black, 0, 34, 0));
  mid.add(box(2, 10, 2, MAT.black, -1.5, 42, 0));
  const beacon = box(1.2, 1.2, 1.2, MAT.glow, -1.5, 47.6, 0);
  mid.add(beacon);
  addLevel(root, 2, mid);

  const near = new THREE.Group();
  for (let y = 0; y < 26; y += 2) {
    const width = Math.max(8.8, 14 - y * 0.15);
    for (let x = -width / 2 + 1; x < width / 2; x += 2) {
      for (const z of [-width / 2, width / 2]) {
        near.add(box(1.85, 1.85, 0.8, (x + y) % 4 === 0 ? MAT.stoneLight : MAT.stoneDark, x, y + 1, z));
      }
    }
    for (let z = -width / 2 + 1; z < width / 2; z += 2) {
      for (const x of [-width / 2, width / 2]) {
        near.add(box(0.8, 1.85, 1.85, (z + y) % 4 === 0 ? MAT.stone : MAT.stoneDark, x, y + 1, z));
      }
    }
  }
  near.add(box(8, 8, 8, MAT.black, 0, 30, 0));
  near.add(box(2, 12, 2, MAT.black, -1.3, 39, 0));
  near.add(box(1.1, 1.1, 1.1, MAT.glow, -1.3, 46, 0));

  // LOD1: fine surface voxels appear on the lower facade as the player approaches.
  // Instancing keeps this dense layer cheap enough for mobile.
  addVoxelPanel(near, {
    width: 9.6, height: 7.0, cell: 0.12, depth: 0.085,
    x: 0, y: 4.0, z: 6.96, material: MAT.stoneLight, seed: 2
  });
  addVoxelPanel(near, {
    width: 7.4, height: 5.0, cell: 0.105, depth: 0.075,
    x: 0, y: 11.0, z: 5.58, material: MAT.stone, seed: 5
  });
  addLevel(root, 1, near);

  const micro = near.clone();

  // LOD0: the door surround resolves into thousands of tiny voxels.
  addVoxelPanel(micro, {
    width: 5.8, height: 6.0, cell: 0.032, depth: 0.025,
    x: 0, y: 3.4, z: 7.16, material: MAT.stoneLight, seed: 11
  });
  addVoxelPanel(micro, {
    width: 4.7, height: 1.15, cell: 0.024, depth: 0.019,
    x: 0, y: 6.75, z: 7.22, material: MAT.gold, seed: 19
  });
  for (let i = -5; i <= 5; i++) {
    addMicroGlyph(micro, i * 0.37, 6.72 + (i % 2) * 0.08, 7.27, i === 0 ? MAT.glow : MAT.gold, 0.78);
  }

  const trim = new THREE.Group();
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const x = Math.cos(angle) * 6.1;
    const z = Math.sin(angle) * 6.1;
    const rune = box(0.28, 0.28, 0.55, MAT.gold, x, 4.4 + (i % 3) * 0.32, z);
    rune.rotation.y = -angle;
    trim.add(rune);
  }
  micro.add(trim);
  addLevel(root, 0, micro);

  const door = box(4.2, 6.6, 0.7, MAT.black, 0, 3.3, 7.25);
  const seal = cylinder(1.55, 0.36, MAT.gold, 12);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, 3.4, 7.7);
  root.add(door, seal);
  root.userData.door = door;
  root.userData.seal = seal;

  const annex = new THREE.Group();
  annex.add(box(6.5, 4.2, 7.2, MAT.stoneDark, 8.5, 2.1, 4.0));
  annex.add(box(7.1, 0.75, 7.8, MAT.stone, 8.5, 4.5, 4.0));
  root.add(annex);

  const chest = new THREE.Group();
  chest.add(box(1.8, 0.85, 1.4, MAT.wood, 8.3, 0.65, 7.7));
  chest.add(box(1.9, 0.35, 1.5, MAT.woodLight, 8.3, 1.25, 7.7));
  chest.add(box(0.35, 0.45, 0.12, MAT.gold, 8.3, 0.95, 8.47));
  root.add(chest);

  addInteractable({
    id: "door",
    label: "観測塔の封印扉を調べる",
    position: new THREE.Vector3(0, 1.6, -64.1),
    radius: 4.3,
    action: () => openDoorPuzzle()
  });

  addInteractable({
    id: "lens",
    label: "小箱を調べる",
    position: new THREE.Vector3(8.3, 1.2, -64.2),
    radius: 3.2,
    enabled: () => !lensOwned,
    action: () => collectLens()
  });
}

function makeFallenTree() {
  const pos = new THREE.Vector3(-8.5, 0, -18);
  const root = createLODLandmark(pos);

  const coarse = new THREE.Group();
  const trunk = box(8, 1.9, 2, MAT.wood, 0, 1.05, 0);
  trunk.rotation.z = 0.1;
  coarse.add(trunk);
  coarse.add(box(5.8, 4.2, 4.4, MAT.grass, 3.4, 2.8, 0));
  addLevel(root, 3, coarse);

  const mid = new THREE.Group();
  for (let i = -4; i <= 4; i++) {
    const log = box(1, 1.4, 1.5, i % 2 ? MAT.woodLight : MAT.wood, i, 1.0 + Math.sin(i) * 0.08, 0);
    mid.add(log);
  }
  mid.add(box(4.6, 3.5, 3.8, MAT.grass, 3.5, 2.5, 0));
  mid.add(box(3.2, 2.4, 4.5, MAT.grass2, 4.2, 3.6, 0.2));
  addLevel(root, 2, mid);

  const near = mid.clone();
  for (let i = -7; i < 7; i++) {
    near.add(box(0.22, 0.08, 1.54, MAT.woodLight, i * 0.52, 1.72, 0));
  }
  addVoxelPanel(near, {
    width: 6.9, height: 1.16, cell: 0.095, depth: 0.065,
    x: -0.4, y: 1.12, z: 0.78, material: MAT.woodLight, seed: 7
  });
  addLevel(root, 1, near);

  const micro = near.clone();
  addVoxelPanel(micro, {
    width: 2.9, height: 0.9, cell: 0.028, depth: 0.024,
    x: -0.72, y: 1.47, z: 0.84, material: MAT.woodLight, seed: 17
  });
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 7; j++) {
      const scar = box(0.035, 0.055, 0.026, MAT.black,
        -1.08 + i * 0.32 - j * 0.035,
        1.58 + j * 0.07,
        0.868);
      micro.add(scar);
    }
  }
  for (let i = 0; i < 12; i++) {
    micro.add(box(0.038, 0.038, 0.025, i < 4 ? MAT.glow : MAT.gold,
      -1.22 + i * 0.075,
      1.27 + Math.sin(i * 1.8) * 0.045,
      0.87));
  }
  addLevel(root, 0, micro);

  addInteractable({
    id: "tree",
    label: "倒木の傷を調べる",
    position: new THREE.Vector3(-8.5, 1.6, -18),
    radius: 3.2,
    action: () => inspectClue("tree")
  });
}

function makeStatue() {
  const pos = new THREE.Vector3(10.5, 0, -34);
  const root = createLODLandmark(pos);

  const coarse = new THREE.Group();
  coarse.add(box(3.2, 7, 3.2, MAT.stone, 0, 3.5, 0));
  addLevel(root, 3, coarse);

  const mid = new THREE.Group();
  mid.add(box(3.8, 1, 3.8, MAT.stoneDark, 0, 0.5, 0));
  mid.add(box(2.4, 3.6, 1.8, MAT.stone, 0, 2.8, 0));
  mid.add(box(1.7, 1.7, 1.7, MAT.stoneLight, 0, 5.4, 0));
  mid.add(box(3.8, 0.8, 1.0, MAT.stone, 1.55, 4.0, 0));
  addLevel(root, 2, mid);

  const near = mid.clone();
  near.add(box(1.0, 0.6, 0.8, MAT.stoneLight, 3.7, 4.0, 0));
  near.add(box(0.22, 0.22, 0.12, MAT.black, -0.35, 5.55, 0.88));
  near.add(box(0.22, 0.22, 0.12, MAT.black, 0.35, 5.55, 0.88));
  addVoxelPanel(near, {
    width: 2.05, height: 2.65, cell: 0.105, depth: 0.075,
    x: 0, y: 5.0, z: 0.91, material: MAT.stoneLight, seed: 3
  });
  addVoxelPanel(near, {
    width: 1.0, height: 0.62, cell: 0.07, depth: 0.05,
    x: 3.7, y: 4.0, z: 0.46, material: MAT.stoneLight, seed: 8
  });
  addLevel(root, 1, near);

  const micro = near.clone();
  addVoxelPanel(micro, {
    width: 0.86, height: 0.56, cell: 0.025, depth: 0.022,
    x: 3.7, y: 4.0, z: 0.49, material: MAT.stoneLight, seed: 15
  });
  for (let i = 0; i < 5; i++) {
    addMicroGlyph(micro, 3.42 + i * 0.14, 4.03 + Math.sin(i * 1.6) * 0.055, 0.515,
      i === 1 ? MAT.glow : MAT.gold, 0.48);
  }
  addLevel(root, 0, micro);

  addInteractable({
    id: "statue",
    label: "石像の手を調べる",
    position: new THREE.Vector3(10.5, 2.2, -34),
    radius: 3.4,
    action: () => inspectClue("statue")
  });
}

function makeSpring() {
  const pos = new THREE.Vector3(-7, 0, -49);
  const root = createLODLandmark(pos);

  const coarse = new THREE.Group();
  coarse.add(cylinder(4, 0.6, MAT.waterDry, 8));
  addLevel(root, 3, coarse);

  const mid = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const s = box(1.65, 0.75, 1.1, i % 2 ? MAT.stone : MAT.stoneLight, Math.cos(a) * 3.3, 0.38, Math.sin(a) * 3.3);
    s.rotation.y = -a;
    mid.add(s);
  }
  mid.add(cylinder(2.6, 0.24, MAT.waterDry, 12));
  addLevel(root, 2, mid);

  const near = mid.clone();
  const disk = cylinder(1.0, 0.18, MAT.stoneDark, 24);
  disk.position.y = 0.2;
  near.add(disk);
  addVoxelPanel(near, {
    width: 1.72, height: 1.72, cell: 0.085, depth: 0.055,
    x: 0, y: 0.31, z: 0, material: MAT.stoneLight, axis: "y", seed: 6
  });
  addLevel(root, 1, near);

  const micro = near.clone();
  addVoxelPanel(micro, {
    width: 1.45, height: 1.45, cell: 0.026, depth: 0.022,
    x: 0, y: 0.35, z: 0, material: MAT.stoneLight, axis: "y", seed: 14
  });
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const rune = box(0.052, 0.028, 0.052, i < 3 ? MAT.glow : MAT.gold,
      Math.cos(a) * 0.69, 0.392, Math.sin(a) * 0.69);
    rune.rotation.y = -a;
    micro.add(rune);
  }
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    addMicroGlyph(micro, Math.cos(a) * 0.38, 0.41, Math.sin(a) * 0.38, i === 0 ? MAT.glow : MAT.gold, 0.38);
  }
  addLevel(root, 0, micro);

  addInteractable({
    id: "spring",
    label: "干上がった泉を調べる",
    position: new THREE.Vector3(-7, 1.0, -49),
    radius: 4.0,
    action: () => inspectClue("spring")
  });
}

function addInteractable(def) {
  interactables.push(def);
}

function inspectClue(id) {
  const lensReveal = lensOwned && lensActive;
  if (id === "tree") {
    state.treeBasic = true;
    if (lensReveal) {
      state.treeDeep = true;
      showJournal("倒木 · 深層観測", "三本の傷の下に、肉眼では読めなかった極小の記号がある。意味は「最後」。木の印は最後に置かれる。");
    } else {
      showJournal("倒木", "樹皮に人為的な三本の傷が刻まれている。近づくと確かに加工跡だと分かる。もっと細かく観察できれば、下に何かありそうだ。");
    }
  }
  if (id === "statue") {
    state.statueBasic = true;
    if (lensReveal) {
      state.statueDeep = true;
      showJournal("石像 · 深層観測", "掌の小さな記号は単なる数字ではない。「水の後に立つ者」を示している。人の印は水より後だ。");
    } else {
      showJournal("石像", "空へ伸ばした掌に、ごく小さな刻印がある。裸眼では形までは読み取れない。");
    }
  }
  if (id === "spring") {
    state.springBasic = true;
    if (lensReveal) {
      state.springDeep = true;
      showJournal("干上がった泉 · 深層観測", "中央円盤の最も小さな刻印だけが青く反応する。意味は「始まり」。水の印が最初だ。");
    } else {
      showJournal("干上がった泉", "底に石の円盤が埋まっている。縁には細かな凹凸が並ぶが、肉眼では意味を読み取れない。");
    }
  }
  updateObjective();
}

function collectLens() {
  if (lensOwned) return;
  lensOwned = true;
  state.lensCollected = true;
  lensButton.classList.remove("locked");
  lensActive = true;
  lensButton.classList.add("active");
  showToast("OBSERVATION LENS 入手\nLENSをONにすると、通常より遠くから微細な情報が見える。");
  updateObjective();
}

function toggleLens() {
  if (!lensOwned || modalOpen) return;
  lensActive = !lensActive;
  lensButton.classList.toggle("active", lensActive);
  showToast(lensActive ? "OBSERVATION LENS · ON" : "OBSERVATION LENS · OFF", 1.1);
}

function openDoorPuzzle() {
  towerDoorSeen = true;
  if (!lensOwned) {
    showJournal("観測塔の封印扉", "扉には「水・人・木」の三つの図柄が刻まれている。順序を要求しているようだ。脇の小部屋に古い収納箱が見える。");
    updateObjective();
    return;
  }
  modalOpen = true;
  puzzle.classList.remove("hidden");
  puzzleSequence.length = 0;
  renderSequence();
}

const puzzleSequence = [];

function renderSequence() {
  const labels = { water: "水", person: "人", tree: "木" };
  const slots = puzzleSequence.map(v => labels[v]);
  while (slots.length < 3) slots.push("＿");
  sequenceEl.textContent = slots.join(" → ");
}

function solvePuzzle() {
  const correct = ["water", "person", "tree"];
  const ok = correct.every((v, i) => puzzleSequence[i] === v);
  if (ok) {
    puzzleHint.textContent = "封印機構が反応している……";
    setTimeout(() => {
      modalOpen = false;
      puzzle.classList.add("hidden");
      openTowerDoor();
    }, 650);
  } else {
    puzzleHint.textContent = "順序が違う。観測記録をもう一度考えよう。";
    puzzleSequence.length = 0;
    renderSequence();
  }
}

function openTowerDoor() {
  if (doorOpened) return;
  doorOpened = true;
  const root = lodObjects.find(o => o.userData.door);
  const door = root.userData.door;
  const seal = root.userData.seal;
  const startY = door.position.y;
  const start = performance.now();
  function animateDoor(now) {
    const t = Math.min(1, (now - start) / 1700);
    const eased = 1 - Math.pow(1 - t, 3);
    door.position.y = startY + eased * 6.7;
    seal.rotation.z += 0.035;
    seal.material.emissiveIntensity = 0.5 + eased * 3;
    if (t < 1) requestAnimationFrame(animateDoor);
    else seal.visible = false;
  }
  requestAnimationFrame(animateDoor);

  for (let i = 0; i < 46; i++) {
    const mote = box(0.12, 0.12, 0.12, MAT.glow);
    mote.position.set((Math.random() - 0.5) * 5, 1 + Math.random() * 6, -64.5 + (Math.random() - 0.5) * 2);
    scene.add(mote);
    setTimeout(() => scene.remove(mote), 1800 + Math.random() * 1200);
  }

  objectiveEl.textContent = "観測塔が開いた。内部の星図装置へ進む — PROTOTYPE COMPLETE";
  showToast("SEALED DOOR OPEN\n近づき、観察し、情報を組み合わせることで世界が開いた。", 5);
}

function showJournal(title, text) {
  modalOpen = true;
  journalTitle.textContent = title;
  journalText.textContent = text;
  journal.classList.remove("hidden");
}

function closeJournal() {
  journal.classList.add("hidden");
  modalOpen = false;
}

function showToast(text, seconds = 3.2) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  toastTimer = seconds;
}

function updateObjective() {
  const basicCount = Number(state.treeBasic) + Number(state.statueBasic) + Number(state.springBasic);
  const deepCount = Number(state.treeDeep) + Number(state.statueDeep) + Number(state.springDeep);

  if (doorOpened) return;
  if (!lensOwned && !towerDoorSeen) {
    objectiveEl.textContent = basicCount === 0
      ? "白草の丘から、遠くに見える黒い観測塔へ向かう"
      : "観測塔へ向かいながら、気になる痕跡を調べる · " + basicCount + "/3";
    return;
  }
  if (!lensOwned) {
    objectiveEl.textContent = "塔の脇にある小部屋を調べる";
    return;
  }
  if (deepCount < 3) {
    objectiveEl.textContent = "観測レンズをONにして、倒木・石像・泉を再調査する · " + deepCount + "/3";
    return;
  }
  objectiveEl.textContent = "観測塔へ戻り、「水・人・木」の正しい順序を入力する";
}

function updateLOD(root, distance) {
  let level = 3;
  if (distance <= 80) level = 2;
  if (distance <= 24) level = 1;
  if (distance <= 2.8) level = 0;
  if (lensActive && lensOwned && distance <= 6.0) level = 0;
  for (const child of root.userData.levels) {
    child.visible = child.userData.lodLevel === level;
  }
}

function updateWorldLOD() {
  const d = player.distanceTo(new THREE.Vector3(towerPos.x, player.y, towerPos.z));
  previousLod = lodLevel;
  lodLevel = d > 80 ? 3 : d > 24 ? 2 : d > 2.8 ? 1 : 0;
  const names = ["LOD0 · MICRO ~5mm", "LOD1 · NEAR ~5cm", "LOD2 · MID ~1m", "LOD3 · FAR 2–8m"];
  lodBadge.textContent = names[lodLevel];
  if (previousLod !== lodLevel) {
    lodBadge.classList.remove("lodFlash");
    void lodBadge.offsetWidth;
    lodBadge.classList.add("lodFlash");
    showToast("WORLD DETAIL REFINED · " + names[lodLevel], 1.5);
  }
  distanceEl.textContent = Math.round(d) + " m";

  for (const root of lodObjects) {
    const wp = new THREE.Vector3();
    root.getWorldPosition(wp);
    updateLOD(root, player.distanceTo(wp));
  }
}

function updateNearestInteractable() {
  nearestInteractable = null;
  let best = Infinity;
  for (const item of interactables) {
    if (item.enabled && !item.enabled()) continue;
    const d = player.distanceTo(item.position);
    if (d <= item.radius && d < best) {
      best = d;
      nearestInteractable = item;
    }
  }
  if (nearestInteractable && !modalOpen) {
    promptEl.textContent = (isCoarsePointer ? "ACTION · " : "E · ") + nearestInteractable.label;
    promptEl.classList.add("show");
  } else {
    promptEl.classList.remove("show");
  }
}

function interact() {
  if (modalOpen || !started) return;
  updateNearestInteractable();
  if (nearestInteractable) nearestInteractable.action();
}

function addGuideStone() {
  const g = new THREE.Group();
  g.position.set(1.8, 0, 12);
  g.add(box(2.4, 2.7, 1.9, MAT.stone, 0, 1.35, 0));
  for (let i = 0; i < 4; i++) {
    const p = box(0.22 + i * 0.14, 0.18, 0.09, MAT.glow, -0.55 + i * 0.34, 1.65 - Math.abs(1.5 - i) * 0.15, 0.97);
    g.add(p);
  }
  scene.add(g);

  addInteractable({
    id: "guide",
    label: "岩の刻印を見る",
    position: new THREE.Vector3(1.8, 1.3, 12),
    radius: 3.1,
    action: () => showJournal("道標の岩", "近づくと、粗い岩肌の中から小さな矢印が現れた。矢印は遠くの黒い観測塔を指している。遠くでは見えなかった情報だ。")
  });
}

addGround();
addGuideStone();
makeFallenTree();
makeStatue();
makeSpring();
makeTower();

groundDetail = createGroundDetail();
treeDetailProxy = createTreeDetailProxy();
hillDetailProxy = createHillDetailProxy();

const keyLight = new THREE.PointLight(0x87dfff, 2.8, 22, 2);
keyLight.position.set(0, 6, -64);
scene.add(keyLight);

function updateCamera() {
  camera.position.copy(player);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function updateMovement(dt) {
  if (!started || modalOpen) return;

  let forward = move.forward;
  let right = move.right;
  if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) right += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) right -= 1;

  const len = Math.hypot(forward, right);
  if (len > 1) {
    forward /= len;
    right /= len;
  }

  const speed = keys.has("ShiftLeft") ? 8.0 : 5.1;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  // Match movement to the camera's actual forward direction.
  // At yaw=0 the camera looks toward -Z, so W/↑ must reduce Z.
  const dx = (-sin * forward + cos * right) * speed * dt;
  const dz = (-cos * forward - sin * right) * speed * dt;

  player.x += dx;
  player.z += dz;
  player.x = THREE.MathUtils.clamp(player.x, -78, 78);
  player.z = THREE.MathUtils.clamp(player.z, -170, 34);

  if (!doorOpened && player.z < -64.8 && Math.abs(player.x) < 4.5) {
    player.z = -64.8;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updateMovement(dt);
  updateCamera();
  updateWorldLOD();
  updateLocalDetail();
  updateNearestInteractable();

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove("show");
  }

  const time = performance.now() * 0.001;
  keyLight.intensity = 2.1 + Math.sin(time * 2.2) * 0.35;

  renderer.render(scene, camera);
}
updateCamera();
animate();

startButton.addEventListener("click", () => {
  started = true;
  startScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  showToast("近づくほど、世界は細かくなる。", 2.7);
});

window.addEventListener("keydown", e => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyE" || e.code === "Space") interact();
  if (e.code === "KeyQ") toggleLens();
  if (e.code === "Escape") {
    puzzle.classList.add("hidden");
    journal.classList.add("hidden");
    modalOpen = false;
  }
});
window.addEventListener("keyup", e => keys.delete(e.code));

let lookPointer = null;
let lastLookX = 0;
let lastLookY = 0;
renderer.domElement.addEventListener("pointerdown", e => {
  if (!started || modalOpen || e.target.closest?.("button")) return;
  if (isCoarsePointer && e.clientX < innerWidth * 0.42) return;
  lookPointer = e.pointerId;
  lastLookX = e.clientX;
  lastLookY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", e => {
  if (e.pointerId !== lookPointer || modalOpen) return;
  const dx = e.clientX - lastLookX;
  const dy = e.clientY - lastLookY;
  lastLookX = e.clientX;
  lastLookY = e.clientY;
  yaw -= dx * 0.0043;
  pitch -= dy * 0.0035;
  pitch = THREE.MathUtils.clamp(pitch, -1.18, 1.08);
});
renderer.domElement.addEventListener("pointerup", e => {
  if (e.pointerId === lookPointer) lookPointer = null;
});
renderer.domElement.addEventListener("pointercancel", e => {
  if (e.pointerId === lookPointer) lookPointer = null;
});

let stickPointer = null;
function updateStick(e) {
  const r = stickBase.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const max = r.width * 0.31;
  const l = Math.hypot(dx, dy);
  if (l > max) {
    dx = dx / l * max;
    dy = dy / l * max;
  }
  stickKnob.style.transform = "translate(" + dx + "px," + dy + "px)";
  move.right = dx / max;
  move.forward = -dy / max;
}
function resetStick() {
  stickPointer = null;
  move.right = 0;
  move.forward = 0;
  stickKnob.style.transform = "translate(0,0)";
}
stickBase.addEventListener("pointerdown", e => {
  e.preventDefault();
  stickPointer = e.pointerId;
  stickBase.setPointerCapture?.(e.pointerId);
  updateStick(e);
});
stickBase.addEventListener("pointermove", e => {
  if (e.pointerId === stickPointer) updateStick(e);
});
stickBase.addEventListener("pointerup", e => {
  if (e.pointerId === stickPointer) resetStick();
});
stickBase.addEventListener("pointercancel", resetStick);

actionButton.addEventListener("pointerdown", e => {
  e.preventDefault();
  interact();
});
lensButton.addEventListener("pointerdown", e => {
  e.preventDefault();
  toggleLens();
});

document.querySelectorAll("[data-symbol]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (puzzleSequence.length >= 3) return;
    puzzleSequence.push(btn.dataset.symbol);
    renderSequence();
    if (puzzleSequence.length === 3) solvePuzzle();
  });
});
resetPuzzle.addEventListener("click", () => {
  puzzleSequence.length = 0;
  puzzleHint.textContent = "旅の途中で見たものを思い出せ。";
  renderSequence();
});
closePuzzle.addEventListener("click", () => {
  puzzle.classList.add("hidden");
  modalOpen = false;
});
journalClose.addEventListener("click", closeJournal);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarsePointer ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
});

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
