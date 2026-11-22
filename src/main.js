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
app.scene.ambientLight = new pc.Color(0.58, 0.62, 0.7);
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
  color: new pc.Color(1, 0.9, 0.76),
  intensity: 1.35,
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

const camera = new pc.Entity("Chase camera");
camera.addComponent("camera", {
  clearColor: new pc.Color(0.43, 0.62, 0.8),
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
  heading += steeringAngle * 0.95 * speedFactor * grip * dt * Math.sign(speed || 1);

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
