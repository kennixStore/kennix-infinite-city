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

// Functional vehicle lighting: forward beams and brake lamps follow the car.
const brakeLampMaterial = makeMat([0.85, 0.018, 0.012]);
brakeLampMaterial.emissive = new pc.Color(0.28, 0.008, 0.004);
brakeLampMaterial.update();
const brakeLamps = [];
for (const x of [-0.68, 0.68]) {
  brakeLamps.push(block("Brake lamp", [x, 0.68, 2.18], [0.38, 0.18, 0.07], brakeLampMaterial, car));
}
for (const x of [-0.62, 0.62]) {
  const beam = new pc.Entity("Headlight beam");
  beam.setLocalPosition(x, 0.72, -2.08);
  beam.addComponent("light", {
    type: "spot",
    color: new pc.Color(1, 0.91, 0.72),
    intensity: 2.2,
    range: 42,
    innerConeAngle: 22,
    outerConeAngle: 42,
    castShadows: false
  });
  car.addChild(beam);
}
const brakeGlow = new pc.Entity("Brake light glow");
brakeGlow.setLocalPosition(0, 0.8, 2.2);
brakeGlow.addComponent("light", {
  type: "point",
  color: new pc.Color(1, 0.025, 0.012),
  intensity: 0,
  range: 7,
  castShadows: false
});
car.addChild(brakeGlow);
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
  traffic.push({ entity: npc, direction, cruiseSpeed, currentSpeed: cruiseSpeed, hitCooldown: 0 });
}
createTrafficCar(-2.55, -57, 1, 0, 10);
createTrafficCar(2.55, -25, -1, 1, 8.5);
createTrafficCar(-2.55, 11, 1, 2, 9);
createTrafficCar(2.55, 62, -1, 3, 11);

// Pedestrian figures with simple looping walk cycles along the sidewalks.
const skinMat = makeMat([0.55, 0.34, 0.22]);
const clothingMats = [makeMat([0.12, 0.22, 0.48]), makeMat([0.48, 0.12, 0.09]), makeMat([0.12, 0.34, 0.2]), makeMat([0.34, 0.27, 0.16])];
const pedestrians = [];
function createPedestrian(x, z, outfit, facing = 0, walkDirection = 1) {
  const person = new pc.Entity("Walking pedestrian");
  person.setPosition(x, 0.12, z); person.setEulerAngles(0, facing, 0); app.root.addChild(person);
  block("Pedestrian torso", [0, 0.98, 0], [0.48, 0.78, 0.28], clothingMats[outfit % clothingMats.length], person);
  block("Pedestrian head", [0, 1.58, -0.015], [0.34, 0.36, 0.34], skinMat, person, "sphere");
  const legs = []; const arms = [];
  for (const side of [-1, 1]) {
    legs.push(block("Pedestrian leg", [side * 0.13, 0.43, 0], [0.16, 0.62, 0.18], mats.dark, person));
    arms.push(block("Pedestrian arm", [side * 0.31, 1.02, 0], [0.14, 0.58, 0.16], clothingMats[outfit % clothingMats.length], person));
  }
  pedestrians.push({ entity: person, legs, arms, phase: outfit * 0.9, direction: walkDirection, minZ: -72, maxZ: 72 });
}
createPedestrian(-9.1, -51, 0, 90, 1); createPedestrian(9.1, -35, 1, -90, -1);
createPedestrian(-9.1, -5, 2, 90, 1); createPedestrian(9.1, 22, 3, -90, -1); createPedestrian(-9.1, 61, 1, 90, -1);

// Traffic signal props at the two main junctions.
const signalLamps = [];
const signalRed = makeMat([0.62, 0.025, 0.018]); const signalGreen = makeMat([0.025, 0.48, 0.12]);
for (const junctionZ of [-43, 39]) {
  for (const side of [-1, 1]) {
    block("Traffic signal pole", [side * 6.8, 2.1, junctionZ - 5.2], [0.13, 4.2, 0.13], mats.metal);
    block("Traffic signal housing", [side * 6.8, 4.0, junctionZ - 5.2], [0.48, 1.25, 0.34], mats.dark);
    const redLamp = block("Traffic red lamp", [side * 6.8, 4.35, junctionZ - 5.0], [0.22, 0.22, 0.08], signalRed, app.root, "sphere");
    const greenLamp = block("Traffic green lamp", [side * 6.8, 3.65, junctionZ - 5.0], [0.22, 0.22, 0.08], signalGreen, app.root, "sphere");
    signalLamps.push({ red: redLamp, green: greenLamp });
  }
}

const raceRoute = [-15,-39,-64];
const raceGates = raceRoute.map((z,i)=>{
 const gate=new pc.Entity("Race checkpoint "+(i+1));app.root.addChild(gate);
 block("Checkpoint left post",[-5.1,2.1,0],[.22,4.2,.22],mats.paint,gate).setLocalPosition(-5.1,2.1,z);
 block("Checkpoint right post",[5.1,2.1,z],[.22,4.2,.22],mats.paint,gate);
 block("Checkpoint top beam",[0,4.15,z],[10.4,.22,.22],mats.paint,gate);
 gate.enabled=false;return gate;
});

const vehicleCatalog = [
 {id:"sport",name:"KX Sport",className:"SPORT",paint:[0.035,0.07,0.12],acceleration:12.5,maxSpeed:42,handling:1.0,owned:true},
 {id:"muscle",name:"Vortex GT",className:"MUSCLE",paint:[0.52,0.075,0.035],acceleration:13.8,maxSpeed:39,handling:0.88,owned:true},
 {id:"suv",name:"Ranger X",className:"SUV",paint:[0.18,0.23,0.2],acceleration:9.2,maxSpeed:32,handling:0.78,owned:true},
 {id:"hyper",name:"Apex R",className:"HYPER",paint:[0.04,0.32,0.38],acceleration:16.5,maxSpeed:50,handling:1.12,owned:true}
];
const savedGarage=(()=>{try{return JSON.parse(localStorage.getItem("kxic-garage")||"{}")}catch{return {}}})();
let selectedVehicle=vehicleCatalog.find(v=>v.id===savedGarage.vehicle)||vehicleCatalog[0];
let selectedPaint=Array.isArray(savedGarage.paint)?savedGarage.paint:selectedVehicle.paint;
let cameraMode="chase",gamePaused=true,damage=0,raceActive=false,raceStart=0,raceCheckpoint=0,bestRace=Number(localStorage.getItem("kxic-best-race")||0),drivenDistance=0;
const garagePaints=[{name:"Midnight",rgb:[.035,.07,.12]},{name:"Crimson",rgb:[.52,.045,.035]},{name:"Ocean",rgb:[.035,.22,.42]},{name:"Silver",rgb:[.48,.5,.52]},{name:"Gold",rgb:[.55,.34,.08]}];
function saveGarage(){localStorage.setItem("kxic-garage",JSON.stringify({vehicle:selectedVehicle.id,paint:selectedPaint}))}
function setPlayerPaint(rgb){
 selectedPaint=rgb; const paint=makeMat(rgb,.72,.2);
 for(const name of ["Car chassis","Front hood"]){const part=car.findByName(name);if(part?.render)part.render.material=paint}
 saveGarage();
}

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
window.addEventListener("keydown",e=>{if(e.key==="Escape"){if(gamePaused)hideGarage();else showGarage("PAUSED","Take a break or return to the garage.")}keys.add(e.key.toLowerCase())});
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
const gameOverlay=document.createElement("section");gameOverlay.className="game-overlay";
gameOverlay.innerHTML=`<div class="game-panel"><div class="panel-kicker">KENNIX GAME STUDIOS</div><h1 id="panel-title">INFINITE CITY</h1><p id="panel-copy">Choose your ride, then enter the city.</p><div id="garage-list" class="garage-list"></div><div class="paint-list">${garagePaints.map((p,i)=>`<button class="paint-swatch" data-paint="${i}" title="${p.name}" style="--swatch:rgb(${p.rgb.map(v=>Math.round(v*255)).join(",")})"></button>`).join("")}</div><div class="panel-stats" id="vehicle-stats"></div><div class="panel-actions"><button id="start-drive" class="primary-action">START DRIVING</button><button id="start-race" class="secondary-action">STREET SPRINT</button><button id="repair-car" class="secondary-action">REPAIR VEHICLE</button></div><small id="panel-note">Prototype vehicles share temporary 3D geometry; distinct authored models are still needed.</small></div>`;
document.querySelector("#game-stage").appendChild(gameOverlay);
const panelTitle=gameOverlay.querySelector("#panel-title"),panelCopy=gameOverlay.querySelector("#panel-copy"),garageList=gameOverlay.querySelector("#garage-list"),vehicleStats=gameOverlay.querySelector("#vehicle-stats"),panelNote=gameOverlay.querySelector("#panel-note");
function refreshGarage(){
 garageList.innerHTML=vehicleCatalog.map(v=>`<button class="vehicle-option ${v.id===selectedVehicle.id?"selected":""}" data-vehicle="${v.id}"><strong>${v.name}</strong><span>${v.className}</span><small>AVAILABLE</small></button>`).join("");
 vehicleStats.textContent=`TOP SPEED ${Math.round(selectedVehicle.maxSpeed*3.6)} KM/H • ACCELERATION ${selectedVehicle.acceleration.toFixed(1)} • HANDLING ${Math.round(selectedVehicle.handling*100)}%`;
 gameOverlay.querySelector("#repair-car").textContent=damage?`REPAIR VEHICLE • ${damage}% DAMAGE`:"VEHICLE IN GOOD CONDITION";
}
function showGarage(title="INFINITE CITY",copy="Choose your ride, then enter the city."){gamePaused=true;gameOverlay.classList.remove("hidden");panelTitle.textContent=title;panelCopy.textContent=copy;refreshGarage()}
function hideGarage(){gameOverlay.classList.add("hidden");gamePaused=false}
garageList.addEventListener("click",e=>{const b=e.target.closest("[data-vehicle]");if(!b)return;selectedVehicle=vehicleCatalog.find(v=>v.id===b.dataset.vehicle)||vehicleCatalog[0];setPlayerPaint(selectedVehicle.paint);refreshGarage()});
gameOverlay.querySelector(".paint-list").addEventListener("click",e=>{const b=e.target.closest("[data-paint]");if(!b)return;setPlayerPaint(garagePaints[Number(b.dataset.paint)].rgb);gameOverlay.querySelectorAll(".paint-swatch").forEach(x=>x.classList.toggle("selected",x===b))});
gameOverlay.querySelector("#start-drive").addEventListener("click",()=>{raceActive=false;raceGates.forEach(g=>g.enabled=false);hideGarage()});
gameOverlay.querySelector("#start-race").addEventListener("click",()=>{raceActive=true;raceCheckpoint=0;raceStart=performance.now();raceGates.forEach((g,i)=>g.enabled=i===0);const q=car.getPosition();q.x=0;q.z=19;car.setPosition(q);speed=0;lateralSpeed=0;hideGarage()});
gameOverlay.querySelector("#repair-car").addEventListener("click",()=>{damage=0;speed=0;lateralSpeed=0;refreshGarage()});
const utilityBar=document.createElement("div");utilityBar.className="utility-bar";utilityBar.innerHTML='<button id="garage-open">GARAGE</button><button id="camera-toggle">CAMERA: CHASE</button><button id="pause-toggle">PAUSE</button>';document.querySelector("#game-stage").appendChild(utilityBar);
utilityBar.querySelector("#garage-open").addEventListener("click",()=>showGarage("CITY GARAGE","Select a vehicle, choose paint and repair damage."));
utilityBar.querySelector("#pause-toggle").addEventListener("click",()=>gamePaused?hideGarage():showGarage("PAUSED","Take a break or return to the garage."));
utilityBar.querySelector("#camera-toggle").addEventListener("click",e=>{cameraMode=cameraMode==="chase"?"cockpit":"chase";e.currentTarget.textContent="CAMERA: "+cameraMode.toUpperCase()});
const raceStatusLabel=document.createElement("div");raceStatusLabel.className="race-status";raceStatusLabel.id="race-status";document.querySelector("#game-stage").appendChild(raceStatusLabel);
const missionStatusLabel=document.createElement("div");missionStatusLabel.className="mission-status";missionStatusLabel.textContent="CITY DRIVE • 0 / 500 M";document.querySelector("#game-stage").appendChild(missionStatusLabel);
setPlayerPaint(selectedPaint);refreshGarage();showGarage();

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
let lateralSpeed = 0;          // sideways slip, damped by tyre grip
let heading = 0;
let steeringAngle = 0;
let handbrakeActive = false;
let signalTimer = 0;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const speedValue = document.querySelector("#speed-value");
const gearValue = document.querySelector("#gear-value");
const frontWheels = wheels.slice(0, 2);
const rearWheels = wheels.slice(2);

function isDown(...names) {
  return names.some(name => keys.has(name) || held.has(name));
}

app.on("update", dt => {
  if(gamePaused)return;
  const forward = isDown("w", "arrowup", "gas");
  const reverse = isDown("s", "arrowdown", "brake");
  const left = isDown("a", "arrowleft", "left");
  const right = isDown("d", "arrowright", "right");
  handbrakeActive = isDown(" ", "handbrake");

  // More grounded arcade handling: throttle, braking, coasting and tyre grip.
  // The brake input slows the car first, then engages reverse at low speed.
  if (forward) {
    speed += (speed < 0 ? 26 : selectedVehicle.acceleration) * dt;
  } else if (reverse) {
    speed -= (speed > 0 ? 25 : 7.5) * dt;
  } else {
    speed *= Math.exp(-(handbrakeActive ? 1.7 : 0.72) * dt);
  }

  if (handbrakeActive && Math.abs(speed) > 2) speed *= Math.exp(-1.2 * dt);
  speed = clamp(speed, -12, Math.max(18,selectedVehicle.maxSpeed*(1-damage/180)));

  const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
  const targetSteering = steerInput * 30;
  steeringAngle += (targetSteering - steeringAngle) * Math.min(1, dt * 7.5);

  const speedRatio = clamp(Math.abs(speed) / 24, 0, 1);
  const directionSign = Math.sign(speed || 1);
  const gripFactor = handbrakeActive ? 1.25 : 1;
  heading -= steeringAngle * 0.88 * selectedVehicle.handling * (0.16 + speedRatio * 0.84) * gripFactor * dt * directionSign;

  // Steering creates a little lateral movement; normal tyres quickly regain grip.
  lateralSpeed += steerInput * speedRatio * (handbrakeActive ? 5.2 : 1.35) * directionSign * dt;
  lateralSpeed *= Math.exp(-(handbrakeActive ? 1.15 : 6.2) * dt);

  const radians = heading * Math.PI / 180;
  const forwardX = Math.sin(radians);
  const forwardZ = -Math.cos(radians);
  const rightX = Math.cos(radians);
  const rightZ = Math.sin(radians);
  const p = car.getPosition();
  const nextX = p.x + (forwardX * speed + rightX * lateralSpeed) * dt;
  const nextZ = p.z + (forwardZ * speed + rightZ * lateralSpeed) * dt;

  // Road-edge contact reduces speed and sideways momentum instead of allowing clipping.
  const roadEdge = 5.75;
  if (nextX < -roadEdge || nextX > roadEdge) {
    speed *= -0.12;
    lateralSpeed *= -0.28;
    p.x = clamp(nextX, -roadEdge, roadEdge);
  } else {
    p.x = nextX;
  }
  if (nextZ < -75 || nextZ > 75) {
    speed *= -0.12;
    p.z = clamp(nextZ, -75, 75);
  } else {
    p.z = nextZ;
  }
  car.setPosition(p);
  car.setEulerAngles(0, heading, clamp(-steeringAngle * speedRatio * 0.035, -3, 3));
  const braking = reverse && speed > 0.8;
  brakeGlow.light.intensity = braking ? 2.8 : 0;
  brakeLamps.forEach(lamp => {
    lamp.render.material = braking ? brakeLampMaterial : mats.red;
  });

  frontWheels.forEach(wheel => wheel.setLocalEulerAngles(0, steeringAngle * 0.55, 90));
  rearWheels.forEach(wheel => wheel.rotateLocal(0, 0, speed * dt * 85));

  // Keep pedestrians visual-only for this milestone; no unsafe or misleading collision claims.
  // Sidewalk pedestrians walk with alternating arm and leg swings.
  for (const pedestrian of pedestrians) {
    pedestrian.phase += dt * 5.2;
    const swing = Math.sin(pedestrian.phase) * 0.42;
    pedestrian.legs[0].setLocalEulerAngles(swing * 55, 0, 0);
    pedestrian.legs[1].setLocalEulerAngles(-swing * 55, 0, 0);
    pedestrian.arms[0].setLocalEulerAngles(-swing * 38, 0, 0);
    pedestrian.arms[1].setLocalEulerAngles(swing * 38, 0, 0);
    const position = pedestrian.entity.getPosition();
    position.z += pedestrian.direction * 0.48 * dt;
    if (position.z > pedestrian.maxZ) { position.z = pedestrian.maxZ; pedestrian.direction = -1; }
    if (position.z < pedestrian.minZ) { position.z = pedestrian.minZ; pedestrian.direction = 1; }
    pedestrian.entity.setPosition(position);
  }
  signalTimer += dt;
  const trafficPhase = Math.floor(signalTimer / 8) % 2;
  const greenDirection = trafficPhase === 0 ? 1 : -1;
  for (const lamps of signalLamps) {
    lamps.green.render.material = greenDirection === 1 ? signalGreen : signalRed;
    lamps.red.render.material = greenDirection === -1 ? signalGreen : signalRed;
  }

  // Move NPC traffic and recycle vehicles at the ends of the test district.
  for (const npc of traffic) {
    const npcPos = npc.entity.getPosition();
    npc.hitCooldown = Math.max(0, npc.hitCooldown - dt);

    // Follow the vehicle ahead and avoid driving into the player's car.
    let targetSpeed = npc.cruiseSpeed;
    for (const other of traffic) {
      if (other === npc || other.direction !== npc.direction) continue;
      const otherPos = other.entity.getPosition();
      if (Math.abs(otherPos.x - npcPos.x) > 1.1) continue;
      const gap = (otherPos.z - npcPos.z) * npc.direction;
      if (gap > 0 && gap < 13) {
        targetSpeed = Math.min(targetSpeed, npc.cruiseSpeed * clamp((gap - 3.5) / 9.5, 0, 1));
      }
    }
    const playerGap = (p.z - npcPos.z) * npc.direction;
    if (Math.abs(p.x - npcPos.x) < 1.55 && playerGap > 0 && playerGap < 13) {
      targetSpeed = Math.min(targetSpeed, npc.cruiseSpeed * clamp((playerGap - 4) / 9, 0, 1));
    }

    // Red lights bring traffic to a gradual stop before the junction.
    for (const junctionZ of [-43, 39]) {
      const distanceToJunction = (junctionZ - npcPos.z) * npc.direction;
      if (distanceToJunction > 0 && distanceToJunction < 10 && npc.direction !== greenDirection) {
        targetSpeed = 0;
        break;
      }
    }
    npc.currentSpeed += (targetSpeed - npc.currentSpeed) * Math.min(1, dt * 2.8);
    npcPos.z += npc.direction * npc.currentSpeed * dt;
    if (npcPos.z < -82) npcPos.z = 82;
    if (npcPos.z > 82) npcPos.z = -82;
    npc.entity.setPosition(npcPos);

    // Low-cost contact response: slow the player and push the cars apart briefly.
    const dx = npcPos.x - p.x;
    const dz = npcPos.z - p.z;
    if (npc.hitCooldown === 0 && Math.abs(dx) < 1.65 && Math.abs(dz) < 3.05) {
      speed *= 0.32;
      damage=Math.min(100,damage+8);refreshGarage();
      lateralSpeed += dx >= 0 ? -1.8 : 1.8;
      heading += dx >= 0 ? -4 : 4;
      npc.currentSpeed *= 0.25;
      npc.hitCooldown = 1.1;
    }
  }

  drivenDistance+=Math.abs(speed)*dt;
  missionStatusLabel.textContent=drivenDistance<500?`CITY DRIVE • ${Math.min(500,Math.floor(drivenDistance))} / 500 M`:"CITY DRIVE • COMPLETE";
  if(raceActive){const target=raceRoute[raceCheckpoint];if(target!==undefined&&Math.abs(p.z-target)<2.4&&Math.abs(p.x)<5.8){raceGates[raceCheckpoint].enabled=false;raceCheckpoint++;if(raceCheckpoint<raceRoute.length)raceGates[raceCheckpoint].enabled=true;else{raceActive=false;const elapsed=(performance.now()-raceStart)/1000;if(!bestRace||elapsed<bestRace){bestRace=elapsed;localStorage.setItem("kxic-best-race",String(bestRace))}showGarage("SPRINT COMPLETE",`Time: ${elapsed.toFixed(2)}s • Best: ${bestRace.toFixed(2)}s`)}}}
  raceStatusLabel.textContent=raceActive?`STREET SPRINT • CHECKPOINT ${raceCheckpoint+1}/3 • ${((performance.now()-raceStart)/1000).toFixed(1)}s`:"";
  // Smooth follow camera to reduce sudden movement on mobile.
  const camTarget=cameraMode==="cockpit"?new pc.Vec3(p.x+Math.sin(heading*Math.PI/180)*.55,p.y+1.48,p.z-Math.cos(heading*Math.PI/180)*.25):new pc.Vec3(p.x-Math.sin(heading*Math.PI/180)*10.8,p.y+5.4,p.z+Math.cos(heading*Math.PI/180)*10.8);
  const camPos=camera.getPosition();camPos.lerp(camPos,camTarget,1-Math.pow(.001,dt));camera.setPosition(camPos);
  camera.lookAt(p.x+Math.sin(heading*Math.PI/180)*(cameraMode==="cockpit"?12:-3.2),p.y+(cameraMode==="cockpit"?1.35:.65),p.z-Math.cos(heading*Math.PI/180)*(cameraMode==="cockpit"?12:-3.2));

  if (speedValue) speedValue.textContent = Math.round(Math.abs(speed) * 3.6).toString().padStart(3, "0");
  if (gearValue) gearValue.textContent = speed > 0.6 ? "D" : speed < -0.6 ? "R" : "N";
});

app.start();
