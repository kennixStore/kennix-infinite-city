import * as pc from "playcanvas";
import "./style.css";

const canvas = document.querySelector("#application");
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true, alpha: false },
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas)
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight = new pc.Color(0.43, 0.48, 0.58);
app.scene.toneMapping = pc.TONEMAP_ACES;
app.scene.gammaCorrection = pc.GAMMA_SRGB;

const makeMat = (rgb, metalness = 0, roughness = 0.65) => {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(...rgb);
  m.metalness = metalness;
  m.shininess = (1 - roughness) * 100;
  m.update();
  return m;
};

const mats = {
  ground: makeMat([0.19, 0.23, 0.22]),
  asphalt: makeMat([0.075, 0.085, 0.095]),
  concrete: makeMat([0.43, 0.45, 0.46]),
  curb: makeMat([0.68, 0.68, 0.64]),
  paint: makeMat([0.92, 0.78, 0.35]),
  white: makeMat([0.88, 0.88, 0.82]),
  glass: makeMat([0.055, 0.13, 0.2], 0.35, 0.2),
  windowLit: makeMat([0.72, 0.58, 0.32]),
  dark: makeMat([0.025, 0.03, 0.04]),
  metal: makeMat([0.25, 0.29, 0.32], 0.75, 0.25),
  tree: makeMat([0.08, 0.25, 0.15]),
  trunk: makeMat([0.25, 0.15, 0.09]),
  body: makeMat([0.035, 0.07, 0.12], 0.82, 0.18),
  trim: makeMat([0.012, 0.016, 0.02], 0.3, 0.25),
  red: makeMat([0.65, 0.025, 0.018]),
  headlight: makeMat([0.85, 0.83, 0.62])
};

function block(name, pos, size, mat, parent = app.root, shape = "box") {
  const e = new pc.Entity(name);
  e.addComponent("render", { type: shape, material: mat });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  e.setLocalScale(size[0], size[1], size[2]);
  parent.addChild(e);
  return e;
}

// Compact first-district driving test area.
block("City ground", [0, -0.42, 0], [150, 0.6, 180], mats.ground);
block("Main avenue", [0, -0.04, 0], [15, 0.16, 160], mats.asphalt);
for (const x of [-8.7, 8.7]) {
  block("Sidewalk", [x, 0.02, 0], [2.4, 0.22, 160], mats.concrete);
  block("Curb", [Math.sign(x) * 7.55, 0.13, 0], [0.22, 0.25, 160], mats.curb);
}
for (let z = -74; z <= 74; z += 11) {
  block("Centre lane dash", [0, 0.055, z], [0.16, 0.035, 5.2], mats.paint);
}
for (const x of [-4.9, 4.9]) {
  block("Lane divider", [x, 0.05, 0], [0.09, 0.025, 160], mats.white);
}
 
// Junction markings, pedestrian crossings and roadside signs.
for (const junctionZ of [-43, 39]) {
  block("Junction stop line", [0, 0.065, junctionZ], [10.2, 0.035, 0.28], mats.white);
  for (let stripe = -5; stripe <= 5; stripe++) {
    block("Pedestrian crossing", [stripe * 0.88, 0.07, junctionZ - 1.15], [0.58, 0.035, 2.1], mats.white);
  }
  for (const side of [-1, 1]) {
    block("Roadside sign post", [side * 6.9, 1.65, junctionZ - 4.1], [0.12, 3.3, 0.12], mats.metal);
    block("Roadside sign", [side * 6.9, 3.05, junctionZ - 4.1], [0.9, 0.8, 0.12], mats.body);
    block("Sign face", [side * 6.9, 3.05, junctionZ - 4.02], [0.68, 0.56, 0.035], mats.paint);
  }
}
for (const side of [-1, 1]) {
  for (let z = -70; z <= 70; z += 14) {
    block("Road drain", [side * 7.28, 0.255, z], [0.28, 0.025, 1.2], mats.dark);
  }
}

// Cross streets connect the avenue to the surrounding district.
for (const junctionZ of [-43, 39]) {
  block("Cross street", [0, -0.035, junctionZ], [118, 0.15, 10], mats.asphalt);
  for (const side of [-1, 1]) {
    block("Cross street edge line", [side * 56, 0.055, junctionZ], [0.16, 0.03, 9.6], mats.white);
    block("Cross street sidewalk", [side * 0, 0.025, junctionZ + side * 6.5], [118, 0.2, 2.6], mats.concrete);
  }
  for (let x = -52; x <= 52; x += 8) {
    block("Cross street centre dash", [x, 0.055, junctionZ], [3.8, 0.03, 0.14], mats.paint);
  }
}

// A few parked vehicles give the first district a sense of scale and life.
const parkedMats = [
  makeMat([0.42, 0.055, 0.035], 0.45, 0.3),
  makeMat([0.12, 0.2, 0.28], 0.55, 0.25),
  makeMat([0.48, 0.48, 0.44], 0.35, 0.3)
];
function parkedCar(x, z, colorIndex, facing = 0) {
  const vehicle = new pc.Entity("Parked city vehicle");
  vehicle.setPosition(x, 0.08, z);
  vehicle.setEulerAngles(0, facing, 0);
  app.root.addChild(vehicle);
  const paint = parkedMats[colorIndex % parkedMats.length];
  block("Parked car body", [0, 0.48, 0], [1.75, 0.48, 3.5], paint, vehicle);
  block("Parked car cabin", [0, 0.83, 0.15], [1.42, 0.48, 1.65], mats.glass, vehicle);
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    block("Parked car wheel", [side * 0.88, 0.25, end * 1.08], [0.22, 0.48, 0.62], mats.trim, vehicle, "cylinder");
  }
  for (const side of [-1, 1]) {
    block("Parked car headlamp", [side * 0.58, 0.52, -1.77], [0.28, 0.12, 0.06], mats.headlight, vehicle);
    block("Parked car tail lamp", [side * 0.58, 0.52, 1.77], [0.28, 0.12, 0.06], mats.red, vehicle);
  }
}
parkedCar(-11.2, -29, 0, 90);
parkedCar(11.2, -17, 1, -90);
parkedCar(-11.2, 8, 2, 90);
parkedCar(11.2, 57, 0, -90);

// Distant skyline silhouettes make the district feel larger than the test road.
const skylineMats = [
  makeMat([0.12, 0.17, 0.23]),
  makeMat([0.16, 0.19, 0.24]),
  makeMat([0.2, 0.21, 0.24])
];
for (let i = 0; i < 18; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const z = -82 + Math.floor(i / 2) * 18;
  const width = 9 + (i % 4) * 3;
  const height = 22 + ((i * 13) % 30);
  block("Distant skyline tower", [side * (42 + (i % 3) * 8), height / 2, z], [width, height, 12], skylineMats[i % skylineMats.length]);
}

// Buildings with road-facing windows, entrances and rooftop details.
const facades = [
  makeMat([0.24, 0.29, 0.34]),
  makeMat([0.34, 0.31, 0.27]),
  makeMat([0.18, 0.23, 0.29]),
  makeMat([0.39, 0.4, 0.39])
];
for (let i = 0; i < 14; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const row = Math.floor(i / 2);
  const z = -67 + row * 19;
  const width = 8 + (i % 3) * 2.5;
  const height = 12 + ((i * 7) % 18);
  const x = side * (14.8 + width / 2);
  const building = block("District building", [x, height / 2, z], [width, height, 13], facades[i % facades.length]);
  const faceX = side * (14.8 + 0.08);
  for (let floor = 1; floor < Math.floor(height / 3.2); floor++) {
    for (let bay = 0; bay < 3; bay++) {
      const wz = z - 4 + bay * 4;
      block("Building window", [faceX, floor * 3.1, wz], [0.08, 1.45, 2.1], (floor + bay + i) % 4 === 0 ? mats.windowLit : mats.glass);
    }
  }
  block("Shopfront", [faceX, 1.25, z], [0.12, 2.25, 5.8], mats.glass);
  block("Roof feature", [x, height + 0.55, z], [width * 0.45, 1.1, 4], mats.metal);
}

// Street lamps and trees along both sidewalks.
for (const side of [-1, 1]) {
  for (let i = 0; i < 8; i++) {
    const z = -65 + i * 18;
    block("Lamp pole", [side * 7.65, 3.1, z], [0.13, 6.2, 0.13], mats.metal);
    block("Lamp arm", [side * 7.1, 6.05, z], [1.1, 0.12, 0.12], mats.metal);
    block("Lamp head", [side * 6.65, 5.95, z], [0.65, 0.18, 0.35], mats.windowLit);
    const treeZ = z + 7;
    block("Tree trunk", [side * 9.05, 1.1, treeZ], [0.35, 2.2, 0.35], mats.trunk);
    block("Tree crown", [side * 9.05, 3.05, treeZ], [2.1, 2.5, 2.1], mats.tree, app.root, "sphere");
  }
}

// Directional daylight.
const sun = new pc.Entity("Afternoon sun");
sun.addComponent("light", {
  type: "directional",
  color: new pc.Color(1, 0.78, 0.58),
  intensity: 1.15,
  castShadows: true,
  shadowResolution: 1024
});
sun.setEulerAngles(48, 32, 0);
app.root.addChild(sun);

// Player vehicle: a temporary procedural sports-car model.
const car = new pc.Entity("Player sports car");
car.setPosition(0, 0.18, 19);
app.root.addChild(car);
block("Car chassis", [0, 0.53, 0], [2.05, 0.58, 4.25], mats.body, car);
block("Front hood", [0, 0.82, -1.25], [1.92, 0.16, 1.35], mats.body, car);
block("Cabin", [0, 1.04, -0.22], [1.62, 0.68, 1.95], mats.glass, car);
block("Rear window", [0, 1.18, 0.78], [1.42, 0.42, 0.08], mats.glass, car);
block("Front grille", [0, 0.58, -2.17], [0.82, 0.22, 0.07], mats.metal, car);
block("Front splitter", [0, 0.28, -2.17], [2.08, 0.1, 0.32], mats.dark, car);
block("Rear diffuser", [0, 0.28, 2.12], [1.8, 0.12, 0.3], mats.dark, car);
for (const side of [-1, 1]) {
  block("Side skirt", [side * 1.02, 0.34, 0], [0.12, 0.18, 2.8], mats.metal, car);
  block("Side mirror", [side * 0.91, 1.04, -0.78], [0.28, 0.18, 0.32], mats.body, car);
}
block("Rear spoiler", [0, 1.28, 1.75], [2.0, 0.09, 0.32], mats.metal, car);

block("Front bumper", [0, 0.37, -2.13], [1.95, 0.2, 0.18], mats.trim, car);
block("Rear bumper", [0, 0.37, 2.13], [1.95, 0.2, 0.18], mats.trim, car);
for (const x of [-0.68, 0.68]) {
  block("Headlight", [x, 0.67, -2.16], [0.48, 0.2, 0.08], mats.headlight, car);
  block("Tail light", [x, 0.68, 2.16], [0.48, 0.2, 0.08], mats.red, car);
}
const wheels = [];
for (const x of [-1.04, 1.04]) {
  for (const z of [-1.38, 1.38]) {
    const wheel = block("Tyre", [x, 0.27, z], [0.68, 0.28, 0.68], mats.trim, car, "cylinder");
    wheel.setLocalEulerAngles(0, 0, 90);
    wheels.push(wheel);
  }
}

// Lightweight ambient traffic: simple NPC cars circulate along the avenue.
const trafficPaints = [
  makeMat([0.62, 0.08, 0.045], 0.35, 0.3),
  makeMat([0.12, 0.32, 0.42], 0.45, 0.28),
  makeMat([0.58, 0.58, 0.55], 0.35, 0.32),
  makeMat([0.12, 0.14, 0.17], 0.55, 0.25)
];
const traffic = [];
function createTrafficCar(laneX, startZ, direction, paintIndex, cruiseSpeed) {
  const npc = new pc.Entity("NPC traffic vehicle");
  npc.setPosition(laneX, 0.08, startZ);
  app.root.addChild(npc);
  const paint = trafficPaints[paintIndex % trafficPaints.length];
  block("Traffic body", [0, 0.48, 0], [1.72, 0.48, 3.45], paint, npc);
  block("Traffic cabin", [0, 0.83, 0.18], [1.38, 0.46, 1.62], mats.glass, npc);
  for (const side of [-1, 1]) {
    block("Traffic headlight", [side * 0.55, 0.52, -1.74], [0.26, 0.12, 0.06], mats.headlight, npc);
    block("Traffic tail light", [side * 0.55, 0.52, 1.74], [0.26, 0.12, 0.06], mats.red, npc);
    for (const end of [-1, 1]) {
      const tyre = block("Traffic tyre", [side * 0.87, 0.25, end * 1.05], [0.22, 0.46, 0.58], mats.trim, npc, "cylinder");
      tyre.setLocalEulerAngles(0, 0, 90);
    }
  }
  traffic.push({ entity: npc, direction, cruiseSpeed, hitCooldown: 0 });
}
createTrafficCar(-2.55, -57, 1, 0, 10);
createTrafficCar(2.55, -25, -1, 1, 8.5);
createTrafficCar(-2.55, 11, 1, 2, 9);
createTrafficCar(2.55, 62, -1, 3, 11);

// Pedestrian figures on the sidewalks (visual prototype, not animated AI yet).
const skinMat = makeMat([0.55, 0.34, 0.22]);
const clothingMats = [
  makeMat([0.12, 0.22, 0.48]),
  makeMat([0.48, 0.12, 0.09]),
  makeMat([0.12, 0.34, 0.2]),
  makeMat([0.34, 0.27, 0.16])
];
function createPedestrian(x, z, outfit, facing = 0) {
  const person = new pc.Entity("Sidewalk pedestrian");
  person.setPosition(x, 0.12, z);
  person.setEulerAngles(0, facing, 0);
  app.root.addChild(person);
  block("Pedestrian torso", [0, 0.98, 0], [0.48, 0.78, 0.28], clothingMats[outfit % clothingMats.length], person);
  block("Pedestrian head", [0, 1.58, -0.015], [0.34, 0.36, 0.34], skinMat, person, "sphere");
  for (const side of [-1, 1]) {
    block("Pedestrian leg", [side * 0.13, 0.43, 0], [0.16, 0.62, 0.18], mats.dark, person);
    block("Pedestrian arm", [side * 0.31, 1.02, 0], [0.14, 0.58, 0.16], clothingMats[outfit % clothingMats.length], person);
  }
}
createPedestrian(-9.1, -51, 0, 90);
createPedestrian(9.1, -35, 1, -90);
createPedestrian(-9.1, -5, 2, 90);
createPedestrian(9.1, 22, 3, -90);
createPedestrian(-9.1, 61, 1, 90);

const camera = new pc.Entity("Chase camera");
camera.addComponent("camera", {
  clearColor: new pc.Color(0.23, 0.34, 0.49),
  fov: 62,
  nearClip: 0.1,
  farClip: 300
});
app.root.addChild(camera);

const keys = new Set();
const held = new Set();
window.addEventListener("keydown", e => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => { keys.clear(); held.clear(); });

const controls = document.createElement("div");
controls.className = "touch-controls";
controls.innerHTML = `
  <div class="steering">
    <button data-control="left" aria-label="Steer left">◀</button>
    <button data-control="right" aria-label="Steer right">▶</button>
  </div>
  <div class="pedals">
    <button data-control="brake" aria-label="Brake and reverse">BRAKE</button>
    <button data-control="handbrake" aria-label="Handbrake">HANDBRAKE</button>
    <button data-control="gas" aria-label="Accelerate">GAS</button>
  </div>`;
document.querySelector("#game-stage").appendChild(controls);
controls.querySelectorAll("button").forEach(button => {
  const id = button.dataset.control;
  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    held.add(id);
    button.setPointerCapture(e.pointerId);
  });
  const release = () => held.delete(id);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

let speed = 0;                 // metres per second; forward is negative Z
let heading = 0;
let steeringAngle = 0;
let handbrakeActive = false;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const speedValue = document.querySelector("#speed-value");
const gearValue = document.querySelector("#gear-value");
const frontWheels = wheels.slice(0, 2);
const rearWheels = wheels.slice(2);

function isDown(...names) {
  return names.some(name => keys.has(name) || held.has(name));
}

app.on("update", dt => {
  const forward = isDown("w", "arrowup", "gas");
  const reverse = isDown("s", "arrowdown", "brake");
  const left = isDown("a", "arrowleft", "left");
  const right = isDown("d", "arrowright", "right");
  handbrakeActive = isDown(" ", "handbrake");

  // Arcade vehicle response with separate acceleration, braking and coasting.
  if (forward) speed += (speed < 0 ? 39 : 17) * dt;
  else if (reverse) speed -= (speed > 0 ? 48 : 11) * dt;
  else speed *= Math.pow(handbrakeActive ? 0.12 : 0.42, dt);

  if (handbrakeActive && Math.abs(speed) > 1) speed *= Math.pow(0.16, dt);
  speed = clamp(speed, -10, 38);

  const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
  const steerLimit = 28;
  const targetSteering = steerInput * steerLimit;
  steeringAngle += (targetSteering - steeringAngle) * Math.min(1, dt * 8);

  // Steering response increases with speed, but remains controllable at low speed.
  const speedFactor = 0.18 + Math.min(Math.abs(speed) / 24, 1) * 0.82;
  const grip = handbrakeActive ? 1.35 : 1;
  heading -= steeringAngle * 0.95 * speedFactor * grip * dt * Math.sign(speed || 1);

  const radians = heading * Math.PI / 180;
  const p = car.getPosition();
  const nextX = p.x + Math.sin(radians) * speed * dt;
  const nextZ = p.z - Math.cos(radians) * speed * dt;

  // Keep the test vehicle on the drivable avenue.
  const roadEdge = 5.75;
  if (nextX < -roadEdge || nextX > roadEdge) {
    speed *= -0.18;
    p.x = clamp(nextX, -roadEdge, roadEdge);
  } else {
    p.x = nextX;
  }
  p.z = clamp(nextZ, -75, 75);
  car.setPosition(p);
  car.setEulerAngles(0, heading, 0);

  frontWheels.forEach(wheel => wheel.setLocalEulerAngles(0, steeringAngle * 0.55, 90));
  rearWheels.forEach(wheel => wheel.rotateLocal(0, 0, speed * dt * 85));

  // Keep pedestrians visual-only for this milestone; no unsafe or misleading collision claims.
  // Move NPC traffic and recycle vehicles at the ends of the test district.
  for (const npc of traffic) {
    const npcPos = npc.entity.getPosition();
    npcPos.z += npc.direction * npc.cruiseSpeed * dt;
    if (npcPos.z < -82) npcPos.z = 82;
    if (npcPos.z > 82) npcPos.z = -82;
    npc.entity.setPosition(npcPos);
    npc.hitCooldown = Math.max(0, npc.hitCooldown - dt);

    // Basic low-cost contact response; full rigid-body collisions come later.
    const dx = npcPos.x - p.x;
    const dz = npcPos.z - p.z;
    if (npc.hitCooldown === 0 && Math.abs(dx) < 1.65 && Math.abs(dz) < 3.05) {
      speed *= 0.38;
      heading += dx >= 0 ? -5 : 5;
      npc.hitCooldown = 1.1;
    }
  }

  // Smooth follow camera to reduce sudden movement on mobile.
  const camTarget = new pc.Vec3(p.x, p.y + 5.4, p.z + 10.8);
  const camPos = camera.getPosition();
  camPos.lerp(camPos, camTarget, 1 - Math.pow(0.001, dt));
  camera.setPosition(camPos);
  camera.lookAt(p.x, p.y + 0.65, p.z - 3.2);

  if (speedValue) speedValue.textContent = Math.round(Math.abs(speed) * 3.6).toString().padStart(3, "0");
  if (gearValue) gearValue.textContent = speed > 0.6 ? "D" : speed < -0.6 ? "R" : "N";
});

app.start();
