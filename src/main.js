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
app.scene.ambientLight = new pc.Color(0.48, 0.52, 0.6);
app.scene.toneMapping = pc.TONEMAP_ACES;
app.scene.gammaCorrection = pc.GAMMA_SRGB;

const material = (color, metalness = 0, roughness = 0.7) => {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(...color);
  m.metalness = metalness;
  m.shininess = (1 - roughness) * 100;
  m.update();
  return m;
};

function box(name, position, scale, mat, parent = app.root) {
  const e = new pc.Entity(name);
  e.addComponent("render", { type: "box", material: mat });
  e.setLocalPosition(...position);
  e.setLocalScale(...scale);
  parent.addChild(e);
  return e;
}

const groundMat = material([0.12, 0.15, 0.18]);
const roadMat = material([0.075, 0.085, 0.1]);
const lineMat = material([0.78, 0.72, 0.52]);
const buildingMats = [
  material([0.22, 0.27, 0.33]),
  material([0.28, 0.3, 0.34]),
  material([0.16, 0.2, 0.25])
];
const carMat = material([0.55, 0.08, 0.07], 0.65, 0.25);
const glassMat = material([0.035, 0.09, 0.13], 0.4, 0.18);
const tyreMat = material([0.025, 0.027, 0.03]);

box("Ground", [0, -0.25, 0], [180, 0.5, 180], groundMat);
box("Test road", [0, 0.01, 0], [13, 0.08, 150], roadMat);
for (let z = -68; z <= 68; z += 12) {
  box("Road centre marking", [0, 0.065, z], [0.18, 0.025, 5], lineMat);
}
for (const x of [-6.5, 6.5]) {
  box("Road edge", [x, 0.07, 0], [0.16, 0.04, 150], lineMat);
}

// Simple skyline blocks frame the first test road; these are placeholders, not final city art.
for (let i = 0; i < 22; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const z = -66 + Math.floor(i / 2) * 12;
  const width = 5 + (i % 3) * 2;
  const height = 8 + ((i * 7) % 15);
  const x = side * (13 + width / 2);
  const b = box("Placeholder building", [x, height / 2, z], [width, height, 8], buildingMats[i % buildingMats.length]);
  b.rotateLocal(0, (i % 3) * 3, 0);
}

const sun = new pc.Entity("Sun");
sun.addComponent("light", {
  type: "directional",
  color: new pc.Color(1, 0.88, 0.72),
  intensity: 1.35,
  castShadows: true,
  shadowResolution: 1024
});
sun.setEulerAngles(42, 28, 0);
app.root.addChild(sun);

const vehicle = new pc.Entity("Prototype vehicle");
vehicle.setPosition(0, 0.9, 18);
app.root.addChild(vehicle);
box("Vehicle body", [0, 0.15, 0], [2.1, 0.65, 4.1], carMat, vehicle);
box("Vehicle cabin", [0, 0.68, -0.35], [1.65, 0.65, 1.9], glassMat, vehicle);
for (const x of [-1.08, 1.08]) {
  for (const z of [-1.35, 1.35]) {
    const wheel = new pc.Entity("Wheel");
    wheel.addComponent("render", { type: "cylinder", material: tyreMat });
    wheel.setLocalPosition(x, -0.12, z);
    wheel.setLocalScale(0.42, 0.22, 0.42);
    wheel.setLocalEulerAngles(0, 0, 90);
    vehicle.addChild(wheel);
  }
}

const camera = new pc.Entity("Follow camera");
camera.addComponent("camera", {
  clearColor: new pc.Color(0.055, 0.075, 0.11),
  fov: 62,
  nearClip: 0.1,
  farClip: 350
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
    <button data-control="brake" aria-label="Brake">BRAKE</button>
    <button data-control="gas" aria-label="Accelerate">GAS</button>
  </div>`;
document.querySelector("#game-stage").appendChild(controls);
controls.querySelectorAll("button").forEach(button => {
  const id = button.dataset.control;
  button.addEventListener("pointerdown", e => { e.preventDefault(); held.add(id); button.setPointerCapture(e.pointerId); });
  const release = () => held.delete(id);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

let speed = 0;
let heading = 0;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

app.on("update", dt => {
  const forward = keys.has("w") || keys.has("arrowup") || held.has("gas");
  const brake = keys.has("s") || keys.has("arrowdown") || held.has("brake");
  const left = keys.has("a") || keys.has("arrowleft") || held.has("left");
  const right = keys.has("d") || keys.has("arrowright") || held.has("right");

  if (forward) speed += 17 * dt;
  else if (brake) speed -= 25 * dt;
  else speed *= Math.pow(0.35, dt);
  speed = clamp(speed, -8, 28);

  const steer = (left ? 1 : 0) - (right ? 1 : 0);
  const steeringStrength = 48 * (0.25 + Math.min(Math.abs(speed) / 28, 1));
  heading += steer * steeringStrength * dt * Math.sign(speed || 1);

  const radians = heading * Math.PI / 180;
  const p = vehicle.getPosition();
  p.x += Math.sin(radians) * speed * dt;
  p.z -= Math.cos(radians) * speed * dt;
  p.x = clamp(p.x, -4.6, 4.6);
  p.z = clamp(p.z, -72, 72);
  vehicle.setPosition(p);
  vehicle.setEulerAngles(0, heading, 0);

  const target = new pc.Vec3(p.x, p.y + 5.2, p.z + 10.5);
  camera.setPosition(target);
  camera.lookAt(p.x, p.y + 0.5, p.z - 2.5);

  const speedReadout = document.querySelector("#speed-value");
  if (speedReadout) speedReadout.textContent = Math.round(Math.abs(speed) * 3.6).toString().padStart(3, "0");
});

app.start();
