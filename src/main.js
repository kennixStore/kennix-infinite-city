import * as pc from "playcanvas";
import "./style.css";
import { backendConfigured, createPlayerAccount, signInPlayer, signOutPlayer, getPlayerSession, savePlayerProgress, loadPlayerProgress, getKXBalance, transferKX, requestPasswordReset, updatePlayerPassword, updatePlayerDisplayName } from "./backend.js";
import { joinCityRoom } from "./multiplayer.js";

const canvas = document.querySelector("#application");
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true, alpha: false },
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas)
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
// Keep the image crisp on modern phones without blindly rendering at extreme
// device-pixel ratios that can overwhelm mobile GPUs.
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
app.scene.ambientLight = new pc.Color(0.36, 0.39, 0.45);
app.scene.toneMapping = pc.TONEMAP_ACES;
app.scene.gammaCorrection = pc.GAMMA_SRGB;
// Atmospheric depth separates near streets from the skyline while preserving
// enough contrast to keep the first district readable.
app.scene.fog = pc.FOG_LINEAR;
app.scene.fogColor = new pc.Color(0.62, 0.72, 0.82);
app.scene.fogStart = 210;
app.scene.fogEnd = 760;

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
// Warm interior lights become visibly emissive after sunset.
mats.windowLit.emissive = new pc.Color(1, 0.58, 0.27);
mats.windowLit.emissiveIntensity = 0;
mats.windowLit.update();

 
// Procedural, tileable surface maps add material detail without large external downloads.
function createSurfaceTexture(kind) {
  const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext("2d");
  const base=kind==="asphalt"?"#292e34":kind==="concrete"?"#777a78":kind==="ground"?"#343d35":"#77736d";
  ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  let seed=kind==="asphalt"?173:kind==="concrete"?419:kind==="ground"?733:991;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<2600;i++){
    const v=Math.floor(rand()*34),a=.035+rand()*.11;
    ctx.fillStyle=kind==="asphalt"?`rgba(${v+35},${v+38},${v+42},${a})`:`rgba(${v+100},${v+100},${v+100},${a})`;
    const x=rand()*256,y=rand()*256,size=.4+rand()*2.2;
    ctx.fillRect(x,y,size,size);
  }
  if(kind==="asphalt"){
    ctx.strokeStyle="rgba(9,12,15,.28)";ctx.lineWidth=1;
    for(let i=0;i<12;i++){let x=rand()*256,y=rand()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*28,y+(rand()-.5)*20);ctx.stroke();}
    ctx.fillStyle="rgba(8,11,14,.12)";
    for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(rand()*256,rand()*256,4+rand()*12,2+rand()*5,rand()*3,0,Math.PI*2);ctx.fill();}
  }else if(kind==="concrete"){
    ctx.strokeStyle="rgba(35,39,40,.16)";ctx.lineWidth=1;
    for(let y=32;y<256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
  }else if(kind==="facade"){
    ctx.strokeStyle="rgba(25,30,34,.22)";ctx.lineWidth=2;
    for(let x=32;x<256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
    ctx.strokeStyle="rgba(220,215,200,.12)";ctx.lineWidth=1;
    for(let y=42;y<256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
  }
  const texture=new pc.Texture(app.graphicsDevice,{width:256,height:256,format:pc.PIXELFORMAT_R8_G8_B8_A8,mipmaps:true});
  texture.name="KENNIX "+kind+" surface";texture.addressU=pc.ADDRESS_REPEAT;texture.addressV=pc.ADDRESS_REPEAT;texture.setSource(canvas);
  return texture;
}
const surfaceMaps={
  asphalt:createSurfaceTexture("asphalt"),
  concrete:createSurfaceTexture("concrete"),
  ground:createSurfaceTexture("ground"),
  facade:createSurfaceTexture("facade")
};
function applySurface(material,texture,tilesX=1,tilesY=1){
  material.diffuseMap=texture;material.diffuseMapTiling=new pc.Vec2(tilesX,tilesY);material.update();
}
applySurface(mats.asphalt,surfaceMaps.asphalt,2,72);
applySurface(mats.concrete,surfaceMaps.concrete,2,64);
applySurface(mats.ground,surfaceMaps.ground,22,36);

// Small procedural normal maps give asphalt, concrete and facade materials
// lighting response instead of relying on flat diffuse colour alone.
function createDetailNormal(kind){
 const size=128,canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext("2d"),img=ctx.createImageData(size,size),height=new Float32Array(size*size);
 let seed=kind==="asphalt"?271:kind==="concrete"?619:887;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<height.length;i++){
  const grain=rand()-.5;
  height[i]=kind==="asphalt"?grain*.16:kind==="concrete"?grain*.1:grain*.035;
 }
 if(kind==="facade"){
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   if(x%32<2||y%32<2)height[y*size+x]+=.16;
  }
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const at=y*size+x,left=y*size+(x+size-1)%size,right=y*size+(x+1)%size;
  const up=((y+size-1)%size)*size+x,down=((y+1)%size)*size+x;
  const dx=(height[right]-height[left])*3.5,dy=(height[down]-height[up])*3.5;
  const nx=-dx,ny=-dy,nz=1,len=Math.hypot(nx,ny,nz),o=at*4;
  img.data[o]=Math.round((nx/len*.5+.5)*255);
  img.data[o+1]=Math.round((ny/len*.5+.5)*255);
  img.data[o+2]=Math.round((nz/len*.5+.5)*255);
  img.data[o+3]=255;
 }
 ctx.putImageData(img,0,0);
 const texture=new pc.Texture(app.graphicsDevice,{width:size,height:size,format:pc.PIXELFORMAT_R8_G8_B8_A8,mipmaps:true});
 texture.name="KENNIX "+kind+" micro normal";texture.addressU=pc.ADDRESS_REPEAT;texture.addressV=pc.ADDRESS_REPEAT;texture.setSource(canvas);
 return texture;
}
const detailNormals={
 asphalt:createDetailNormal("asphalt"),
 concrete:createDetailNormal("concrete"),
 facade:createDetailNormal("facade")
};
function applyDetailNormal(material,texture,tiling= new pc.Vec2(1,1),strength=.35){
 material.normalMap=texture;
 material.normalMapTiling=tiling;
 material.bumpiness=strength;
 material.update();
}
applyDetailNormal(mats.asphalt,detailNormals.asphalt,new pc.Vec2(2,72),.28);
applyDetailNormal(mats.concrete,detailNormals.concrete,new pc.Vec2(2,64),.2);

 
// Load higher-resolution CC0 PBR scans. Procedural maps above remain as
// immediate fallbacks if a texture is unavailable or the player is offline.
function loadPbrTexture(url, apply){
  app.assets.loadFromUrl(url,"texture",(err,asset)=>{
    if(err || !asset?.resource){
      console.warn("KENNIX PBR texture unavailable; keeping procedural fallback:",url,err);
      return;
    }
    const texture=asset.resource;
    texture.addressU=pc.ADDRESS_REPEAT;
    texture.addressV=pc.ADDRESS_REPEAT;
    apply(texture);
  });
}
loadPbrTexture("/textures/pbr/road_Color.jpg",texture=>{
  mats.asphalt.diffuseMap=texture;
  mats.asphalt.diffuseMapTiling=new pc.Vec2(4,88);
  mats.asphalt.metalness=.025;
  mats.asphalt.shininess=17;
  mats.asphalt.update();
});
loadPbrTexture("/textures/pbr/road_NormalGL.jpg",texture=>{
  mats.asphalt.normalMap=texture;
  mats.asphalt.normalMapTiling=new pc.Vec2(4,88);
  mats.asphalt.bumpiness=.42;
  mats.asphalt.update();
});
loadPbrTexture("/textures/pbr/concrete_Color.jpg",texture=>{
  mats.concrete.diffuseMap=texture;
  mats.concrete.diffuseMapTiling=new pc.Vec2(3,68);
  mats.concrete.metalness=0;
  mats.concrete.shininess=8;
  mats.concrete.update();
});
loadPbrTexture("/textures/pbr/concrete_NormalGL.jpg",texture=>{
  mats.concrete.normalMap=texture;
  mats.concrete.normalMapTiling=new pc.Vec2(3,68);
  mats.concrete.bumpiness=.28;
  mats.concrete.update();
});

function block(name, pos, size, mat, parent = app.root, shape = "box") {
  const e = new pc.Entity(name);
  e.addComponent("render", { type: shape, material: mat });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  e.setLocalScale(size[0], size[1], size[2]);
  parent.addChild(e);
  return e;
}

// Compact first-district driving test area.
block("City ground", [0, -0.42, 0], [900, 0.6, 900], mats.ground);

// Rolling green ridgelines frame NOVA CITY instead of ending at a flat map edge.
const ridgeMaterials = [
  makeMat([0.12, 0.22, 0.18], 0, 0.92),
  makeMat([0.16, 0.27, 0.21], 0, 0.9),
  makeMat([0.19, 0.28, 0.25], 0, 0.94)
];
function addRidge(name, x, y, z, sx, sy, sz, material, rotation = 0) {
  const ridge = block(name, [x, y, z], [sx, sy, sz], material, app.root, "sphere");
  ridge.setEulerAngles(0, rotation, 0);
  return ridge;
}
addRidge("Western green ridge", -295, -20, -135, 220, 105, 310, ridgeMaterials[0], -12);
addRidge("Western far ridge", -365, -34, 190, 250, 122, 290, ridgeMaterials[1], 8);
addRidge("Eastern green ridge", 300, -22, -160, 230, 112, 300, ridgeMaterials[1], 14);
addRidge("Eastern far ridge", 370, -35, 190, 250, 125, 310, ridgeMaterials[0], -10);
addRidge("Northern hill crest", -20, -38, -420, 360, 135, 210, ridgeMaterials[2], 4);
addRidge("Southern hill crest", 20, -40, 420, 380, 145, 220, ridgeMaterials[1], -5);
block("Main avenue", [0, -0.04, 0], [15, 0.16, 520], mats.asphalt);
for (const x of [-8.7, 8.7]) {
  block("Sidewalk", [x, 0.02, 0], [2.4, 0.22, 520], mats.concrete);
  block("Curb", [Math.sign(x) * 7.55, 0.13, 0], [0.22, 0.25, 520], mats.curb);
}
for (let z = -250; z <= 250; z += 11) {
  block("Centre lane dash", [0, 0.055, z], [0.16, 0.035, 5.2], mats.paint);
}
for (const x of [-4.9, 4.9]) {
  block("Lane divider", [x, 0.05, 0], [0.09, 0.025, 520], mats.white);
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

// Functional-looking traffic signal props make the junctions read as city
// intersections. These are visual signals for now; traffic AI is separate.
const signalHousing=makeMat([.018,.024,.03],.25,.42);
const signalLensRed=makeMat([.62,.018,.012],.12,.22);
const signalAmber=makeMat([.8,.31,.018],.12,.22);
const signalLensGreen=makeMat([.025,.48,.12],.12,.22);
for(const material of [signalLensRed,signalAmber,signalLensGreen]){
 material.emissive=material.diffuse.clone().mulScalar(.22);
 material.update();
}
function buildTrafficSignal(x,z,rotation=0){
 const pole=new pc.Entity("NOVA traffic signal");app.root.addChild(pole);
 pole.setPosition(x,0,z);pole.setEulerAngles(0,rotation,0);
 block("Traffic signal pole",[0,3.1,0],[.16,6.2,.16],mats.metal,pole);
 block("Traffic signal head",[0,5.25,-.12],[.62,1.72,.48],signalHousing,pole);
 for(const [y,material] of [[5.76,signalLensRed],[5.25,signalAmber],[4.74,signalLensGreen]]){
  block("Traffic signal lens",[0,y,-.385],[.34,.34,.1],material,pole,"sphere");
 }
 block("Traffic signal visor",[0,6.18,-.12],[.78,.12,.62],signalHousing,pole);
}
for(const junctionZ of [-43,39]){
 for(const sideX of [-1,1]){
  buildTrafficSignal(sideX*6.35,junctionZ-7,sideX===1?180:0);
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


// Extended NOVA CITY grid: Downtown, Market Quarter, Waterfront and Industrial Edge.
const districtRoads = [-210,-140,-70,0,70,140,210];
// Player road contact follows the asphalt that is actually built. The two
// original downtown cross streets are shorter than the later district avenues.
const playerCrossRoads = [
  { z: -210, halfWidth: 160 }, { z: -140, halfWidth: 160 },
  { z: -43, halfWidth: 59 }, { z: 39, halfWidth: 59 },
  { z: 140, halfWidth: 160 }, { z: 210, halfWidth: 160 }
];
for (const z of districtRoads) {
  if (z === 0 || z === -70 || z === 70) continue;
  block("City cross avenue", [0,-0.035,z], [320,0.15,15], mats.asphalt);
  for (let x=-150;x<=150;x+=12) block("Cross avenue lane dash",[x,0.055,z],[6,0.03,0.14],mats.paint);
}
for (const x of [-120,-60,60,120]) {
  block("City north south avenue",[x,-0.035,0],[15,0.15,520],mats.asphalt);
  for(let z=-250;z<=250;z+=12) block("City avenue lane dash",[x,0.055,z],[0.14,0.03,6],mats.paint);
  for(const side of [-1,1]){
    block("Side avenue sidewalk",[x+side*9.1,0.025,0],[2.4,0.2,520],mats.concrete);
    block("Side avenue curb",[x+side*7.7,0.13,0],[0.22,0.24,520],mats.curb);
  }
}
for(const z of districtRoads){
  if(z===0||z===-70||z===70)continue;
  for(const side of [-1,1]){
    block("Cross avenue sidewalk",[0,0.025,z+side*9.1],[320,0.2,2.4],mats.concrete);
    block("Cross avenue curb",[0,0.13,z+side*7.7],[320,0.24,0.22],mats.curb);
  }
  for(const x of [-120,-60,0,60,120]){
    for(let stripe=-4;stripe<=4;stripe++){
      block("District zebra crossing",[x+stripe*0.9,0.075,z-5.1],[0.55,0.035,2.2],mats.white);
    }
  }
}
const districtPalettes=[
  makeMat([0.22,0.27,0.33]),makeMat([0.34,0.29,0.23]),
  makeMat([0.16,0.25,0.29]),makeMat([0.31,0.33,0.34])
];
for(const material of districtPalettes){
 applySurface(material,surfaceMaps.facade,2,2);
 applyDetailNormal(material,detailNormals.facade,new pc.Vec2(2,2),.16);
}
const marketFabric=makeMat([0.68,0.28,0.09]);
const industrialPaint=makeMat([0.34,0.37,0.39],.45,.4);
// Buildings sit within the blocks, leaving the avenue grid clear for driving.
for(let row=0;row<6;row++){
 for(let col=0;col<6;col++){
  const x=-180+col*60+30, z=-210+35+row*70;
  if(Math.abs(x)<22) continue;
  const h=12+((row*7+col*11)%5)*5, w=22+((row+col)%3)*5;
  block("NOVA CITY district block",[x,h/2,z],[w,h,23],districtPalettes[(row+col)%4]);
  // Fully positioned facade pieces are separate world entities, so building scale
  // never stretches the detail meshes or creates doubled coordinates.
  for(const face of [-1,1]){
   const faceZ=z+face*11.58;
   for(let floor=1;floor<Math.floor(h/3.2);floor++){
    const y=floor*3;
    for(let bay=0;bay<3;bay++){
     const wx=x-w/2-0.06+(bay+0.5)*w/3;
     const glass=(floor+bay+row)%5===0?mats.windowLit:mats.glass;
     block("District tower window frame",[wx,y,faceZ],[2.18,1.62,.09],mats.dark);
     block("District tower window",[wx,y,faceZ+face*.055],[1.94,1.38,.06],glass);
    }
    block("Facade floor band",[x,y-1.0,faceZ],[w+.25,.09,.22],mats.metal);
   }
   block("Ground floor shopfront",[x,1.55,faceZ],[w*.72,2.4,.16],mats.glass);
   block("Shop fascia",[x,2.95,faceZ+face*.12],[w*.78,.28,.32],mats.paint);
  }
  for(const side of [-1,1]){
   const faceX=x+side*(w/2+.06);
   for(let floor=1;floor<Math.floor(h/3.2);floor++){
    for(let bay=0;bay<3;bay++){
     const wz=z-7+bay*7;
     block("Side elevation window",[faceX,floor*3,wz],[.09,1.38,1.9],mats.glass);
    }
   }
   block("Building corner pier",[x+side*(w/2-.18),h/2,z],[.34,h,.34],mats.metal);
  }
  block("Rooftop plant room",[x,h+.8,z],[w*.35,1.6,5],mats.metal);
  block("Rooftop service unit",[x+w*.28,h/2+.55,z+5.2],[2.6,1.1,2.1],mats.dark);

  // Selective architectural features break up the repeated block silhouettes.
  const detailIndex=row*6+col;
  if(detailIndex%3!==1){
   const face=detailIndex%2===0?1:-1;
   const faceZ=z+face*11.72;
   const balconyY=Math.min(h-2.1,6.1+(detailIndex%2)*2.8);
   block("Projecting balcony slab",[x-w*.18,balconyY,faceZ+face*.58],[w*.42,.18,1.25],mats.concrete);
   block("Balcony front rail",[x-w*.18,balconyY+.55,faceZ+face*1.18],[w*.42,.9,.09],mats.metal);
   for(const railX of [x-w*.18-w*.21,x-w*.18+w*.21]){
    block("Balcony side rail",[railX,balconyY+.55,faceZ+face*.58],[.09,.9,1.15],mats.metal);
   }
  }
  if(detailIndex%4===0){
   const signFace=detailIndex%2===0?1:-1;
   const signZ=z+signFace*11.82;
   const signMat=detailIndex%8===0?marketFabric:mats.paint;
   block("Vertical illuminated shop sign",[x+w*.34,3.1,signZ+signFace*.2],[1.05,3.5,.22],signMat);
   block("Shop sign lettering panel",[x+w*.34,3.1,signZ+signFace*.34],[.72,2.75,.06],mats.windowLit);
  }
  if(detailIndex%5===0){
   block("Roof antenna mast",[x-w*.3,h+2.5,z],[.12,5,.12],mats.metal);
   block("Roof antenna crossbar",[x-w*.3,h+3.7,z],[1.1,.1,.1],mats.metal);
  }
  if(detailIndex%2===0){
   const awningFace=detailIndex%4===0?-1:1;
   const awningZ=z+awningFace*11.95;
   block("Storefront canopy",[x,3.05,awningZ+awningFace*.62],[w*.76,.18,1.3],detailIndex%4===0?marketFabric:industrialPaint);
   for(let stripe=-2;stripe<=2;stripe++){
    block("Canopy valance detail",[x+stripe*w*.13,2.88,awningZ+awningFace*1.22],[.12,.24,.06],mats.windowLit);
   }
  }
 }
}
// District landmarks give the first city map recognisable destinations.
const waterMat=makeMat([0.035,0.19,0.28],.35,.28);
const dockWood=makeMat([0.27,0.19,0.12]);

// Waterfront: water basin, pier, mooring posts and container stacks.
block("NOVA waterfront basin",[70,-.24,-252],[190,.12,38],waterMat);
block("Waterfront pier",[55,.08,-225],[92,.42,15],dockWood);
for(let x=12;x<=98;x+=12){
 block("Pier support post",[x,-.45,-225],[.55,1.2,.55],mats.trunk);
 block("Pier light pole",[x,.9,-217],[.12,1.8,.12],mats.metal);
 block("Pier light",[x,1.85,-217],[.45,.12,.35],mats.windowLit);
}
for(let x=24;x<=84;x+=20){
 const container=block("Waterfront cargo container",[x,1.15,-240],[15,2.3,7],x%40?industrialPaint:marketFabric);
 for(let rib=-6;rib<=6;rib+=2)block("Container rib",[x+rib,1.16,-236.42],[.12,2.05,.08],mats.metal,container);
}
block("Harbour crane tower",[112,8,-230],[2,16,2],mats.metal);
block("Harbour crane boom",[99,16,-230],[28,1.2,1.2],mats.metal);
block("Harbour crane cable",[89,8,-230],[.12,15,.12],mats.dark);
block("Harbour crane hook",[89,.6,-230],[1.2,.18,.18],mats.paint);

// Market Quarter: covered stalls and a small public square.
block("Market Quarter plaza",[90,.02,-125],[42,.18,30],mats.concrete);
for(let row=0;row<2;row++)for(let col=0;col<4;col++){
 const x=76+col*10,z=-132+row*13;
 block("Market stall counter",[x,.65,z],[5.8,1.2,4.8],dockWood);
 block("Market stall canopy",[x,2.2,z],[6.6,.28,5.6],marketFabric);
 for(const sx of [-2.8,2.8])for(const sz of [-2.2,2.2])
  block("Market canopy support",[x+sx,1.35,z+sz],[.12,1.8,.12],mats.metal);
}
block("Market clock plinth",[90,1.3,-105],[3,2.6,3],mats.metal);
block("Market clock face",[90,2.8,-103.35],[1.7,1.7,.12],mats.windowLit);

// Industrial Edge: storage tanks, smokestacks and warehouse loading bays.
const tankMat=makeMat([.31,.35,.37],.65,.32);
for(let i=0;i<3;i++){
 const x=-151+i*15,z=218;
 block("Industrial storage tank",[x,4,z],[10,8,10],tankMat,app.root,"cylinder");
 block("Storage tank roof",[x,8.1,z],[10.2,.35,10.2],mats.metal,app.root,"cylinder");
}
for(let i=0;i<2;i++){
 const x=-165+i*18,z=242;
 block("Industrial smokestack",[x,12,z],[3.2,24,3.2],industrialPaint,app.root,"cylinder");
 block("Smokestack rim",[x,24.1,z],[3.8,.5,3.8],mats.dark,app.root,"cylinder");
}
block("Industrial warehouse",[ -135,7,215],[32,14,25],industrialPaint);
for(let bay=0;bay<3;bay++){
 const x=-147+bay*12;
 block("Warehouse loading door",[x,3.4,202.35],[7,6.8,.2],mats.dark);
 block("Loading bay light",[x,7.4,202],[1.3,.18,.25],mats.windowLit);
}

for(let i=0;i<24;i++){
 const z=-225+i*19;
 const side=i%2?1:-1;
 block("NOVA boulevard lamp",[side*9,4,z],[.14,8,.14],mats.metal);
 block("Boulevard lamp head",[side*8.3,7.8,z],[1.2,.18,.25],mats.windowLit);
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

// Street furniture adds a human scale to the first playable boulevard.
const streetPropMetal=makeMat([.16,.2,.23],.55,.35);
const benchWood=makeMat([.32,.2,.11],.05,.72);
function buildBusStop(x,z,side){
 const stop=new pc.Entity("NOVA CITY bus shelter");app.root.addChild(stop);stop.setPosition(x,0,z);
 block("Bus shelter platform",[0,.08,0],[3.8,.16,2.1],mats.concrete,stop);
 for(const sx of [-1.65,1.65]){
  block("Shelter upright",[sx,1.35,0],[.1,2.7,.1],streetPropMetal,stop);
  block("Shelter glass panel",[sx*.78,1.28,.02],[.06,2.25,1.7],mats.glass,stop);
 }
 block("Shelter roof",[0,2.72,0],[4,.16,2.2],streetPropMetal,stop);
 block("Shelter route sign",[0,2.05,-.94],[1.25,.55,.08],mats.paint,stop);
 block("Bus stop bench",[0,.62,.48],[2.25,.12,.48],benchWood,stop);
 for(const sx of [-.9,.9])block("Bench leg",[sx,.34,.48],[.08,.56,.08],streetPropMetal,stop);
 block("Bus stop pole",[side*1.9,1.55,-.85],[.09,3.1,.09],streetPropMetal,stop);
 block("Bus stop sign",[side*1.9,2.75,-.85],[.58,.7,.08],mats.paint,stop);
}
buildBusStop(-11.2,-55,-1);buildBusStop(11.2,52,1);
function buildStreetBench(x,z,rotation=0){
 const bench=new pc.Entity("NOVA CITY public bench");app.root.addChild(bench);bench.setPosition(x,.0,z);bench.setEulerAngles(0,rotation,0);
 block("Bench seat",[0,.62,0],[1.9,.12,.52],benchWood,bench);
 block("Bench back",[0,1.02,.22],[1.9,.62,.12],benchWood,bench);
 for(const sx of [-.72,.72])block("Bench support",[sx,.32,0],[.09,.64,.42],streetPropMetal,bench);
}
buildStreetBench(78,-107,0);buildStreetBench(102,-107,0);
for(const z of [-92,-72,-52,42,62,82]){
 for(const side of [-1,1]){
  block("Boulevard planter",[side*11.3,.28,z],[1.2,.56,1.3],mats.dark);
  block("Planter foliage",[side*11.3,.83,z],[1.05,.72,1.05],mats.tree,app.root,"sphere");
 }
}

// Palm-lined boulevards and leafy street trees add a more natural city scale.
const palmLeafMaterials = [
  makeMat([0.035, 0.19, 0.095], 0, 0.86),
  makeMat([0.055, 0.25, 0.12], 0, 0.88),
  makeMat([0.12, 0.29, 0.15], 0, 0.9)
];
const palmTrunkMaterial = makeMat([0.28, 0.19, 0.11], 0, 0.94);
function buildPalmTree(x, z, height = 8) {
  const root = new pc.Entity("NOVA CITY palm tree");
  root.setPosition(x, 0, z);
  app.root.addChild(root);
  block("Palm trunk", [0, height * 0.46, 0], [0.42, height, 0.42], palmTrunkMaterial, root, "cylinder");
  const crownY = height * 0.91;
  block("Palm crown", [0, crownY, 0], [1.05, 0.62, 1.05], palmLeafMaterials[1], root, "sphere");
  for (let blade = 0; blade < 7; blade++) {
    const angle = blade * (Math.PI * 2 / 7);
    const leaf = block(
      "Palm frond",
      [Math.sin(angle) * 1.25, crownY - 0.25, Math.cos(angle) * 1.25],
      [0.34, 0.16, 3.6],
      palmLeafMaterials[blade % palmLeafMaterials.length],
      root,
      "sphere"
    );
    leaf.setLocalEulerAngles(20, angle * 180 / Math.PI, 0);
  }
  return root;
}
for (const z of [-215, -145, -75, 75, 145, 215]) {
  buildPalmTree(-15.2, z, 7.2 + (Math.abs(z) % 3));
  buildPalmTree(15.2, z + 9, 7.8 + (Math.abs(z) % 2));
}

// Soft cloud banks sit above the skyline and catch the changing daylight.
const cloudMaterial = makeMat([0.68, 0.74, 0.78], 0, 0.98);
function buildCloudBank(x, y, z, scale = 1) {
  const cloud = new pc.Entity("NOVA CITY distant cloud bank");
  cloud.setPosition(x, y, z);
  app.root.addChild(cloud);
  block("Cloud body", [0, 0, 0], [26 * scale, 5.5 * scale, 10 * scale], cloudMaterial, cloud, "sphere");
  block("Cloud puff", [-8 * scale, 2 * scale, 1.5 * scale], [13 * scale, 7 * scale, 11 * scale], cloudMaterial, cloud, "sphere");
  block("Cloud puff", [8 * scale, 1.2 * scale, -1.8 * scale], [16 * scale, 6.5 * scale, 12 * scale], cloudMaterial, cloud, "sphere");
}
buildCloudBank(-190, 86, -260, 1.25);
buildCloudBank(110, 102, -360, 1.0);
buildCloudBank(260, 92, -80, 1.1);
buildCloudBank(-260, 96, 130, 1.05);
buildCloudBank(180, 110, 300, 1.2);

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
for(const material of facades){
  applySurface(material,surfaceMaps.facade,2,2);
  applyDetailNormal(material,detailNormals.facade,new pc.Vec2(2,2),.14);
}
// Give distant skyline buildings the same subtle facade relief so the city
// keeps consistent material response as the camera looks toward the horizon.
for(const material of skylineMats){
  applySurface(material,surfaceMaps.facade,1.5,2.5);
  applyDetailNormal(material,detailNormals.facade,new pc.Vec2(1.5,2.5),.1);
}
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
  color: new pc.Color(1, 0.88, 0.74),
  intensity: 1.3,
  castShadows: true,
  shadowResolution: 2048,
  shadowType: pc.SHADOW_PCF3_32F,
  shadowDistance: 190,
  numCascades: 2,
  cascadeBlend: 0.15
});
sun.setEulerAngles(48, 32, 0);
app.root.addChild(sun);

// A restrained cool fill light keeps shaded vehicle sides and building faces
// readable without flattening the warm afternoon key light.
const skyFill = new pc.Entity("Sky fill light");
skyFill.addComponent("light", {
  type: "directional",
  color: new pc.Color(0.62, 0.74, 1),
  intensity: 0.22,
  castShadows: false
});
skyFill.setEulerAngles(205, -28, 0);
app.root.addChild(skyFill);

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
const indicatorOffMaterial=makeMat([.22,.075,.012],.08,.3);
const indicatorOnMaterial=makeMat([1,.38,.025],.08,.2);
indicatorOnMaterial.emissive=new pc.Color(.9,.22,.008);indicatorOnMaterial.update();
const brakeLampMaterial = makeMat([0.85, 0.018, 0.012]);
brakeLampMaterial.emissive = new pc.Color(0.28, 0.008, 0.004);
brakeLampMaterial.update();
const brakeLamps = [];
for (const x of [-0.68, 0.68]) {
  brakeLamps.push(block("Brake lamp", [x, 0.68, 2.18], [0.38, 0.18, 0.07], brakeLampMaterial, car));
}
const headlightBeams = [];
for (const x of [-0.62, 0.62]) {
  const beam = new pc.Entity("Headlight beam");
  beam.setLocalPosition(x, 0.72, -2.08);
  beam.setLocalEulerAngles(90, 0, 0);
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
  headlightBeams.push(beam);
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

// Interactive fuel stations with local fuel gauge and proximity-based refuelling.
const fuelStations=[];
const canopyMat=makeMat([.07,.11,.16],.45,.28), stationGold=makeMat([.92,.68,.18],.3,.35), pumpMat=makeMat([.78,.8,.82],.25,.35);
function buildFuelStation(x,z,label){
 const root=new pc.Entity(label);app.root.addChild(root);root.setPosition(x,0,z);
 block("Fuel forecourt",[0,.025,0],[22,.08,18],mats.concrete,root);
 block("Fuel canopy roof",[0,4.1,0],[17,.42,12],canopyMat,root);
 block("Fuel canopy trim",[0,3.85,0],[17,.12,.22],stationGold,root);
 for(const sx of [-7.3,7.3])for(const sz of [-4.8,4.8])block("Canopy support",[sx,1.95,sz],[.22,3.9,.22],mats.metal,root);
 for(const px of [-4.3,0,4.3]){
  block("Fuel pump base",[px,.55,0],[1.05,1.1,.9],pumpMat,root);
  block("Fuel pump display",[px,.98,-.48],[.68,.4,.06],mats.dark,root);
  block("Fuel pump nozzle",[px+.52,.65,-.12],[.12,.48,.12],stationGold,root);
  block("Fuel pump hose",[px+.58,.52,.2],[.07,.62,.07],mats.dark,root);
 }
 block("Station shop",[0,1.5,8],[8,3,4],districtPalettes[0],root);
 block("Station shop window",[0,1.55,5.94],[4.8,1.5,.08],mats.glass,root);
 fuelStations.push({label,x,z});
}
buildFuelStation(75,0,"NOVA FUEL • DOWNTOWN");
buildFuelStation(-135,140,"NOVA FUEL • INDUSTRIAL");

// Lightweight ambient traffic: simple NPC cars circulate along the avenue.
const trafficPaints = [
  makeMat([0.62, 0.08, 0.045], 0.35, 0.3),
  makeMat([0.12, 0.32, 0.42], 0.45, 0.28),
  makeMat([0.58, 0.58, 0.55], 0.35, 0.32),
  makeMat([0.12, 0.14, 0.17], 0.55, 0.25)
];
const traffic = [];
const trafficBrakeMaterial = makeMat([1, 0.035, 0.012], 0.12, 0.22);
function createTrafficCar(laneX, startZ, direction, paintIndex, cruiseSpeed, axis = "z") {
  const npc = new pc.Entity("NPC traffic vehicle");
  npc.setPosition(axis === "z" ? laneX : startZ, 0.08, axis === "z" ? startZ : laneX);
  if(axis === "x") npc.setEulerAngles(0,direction>0?90:-90,0);
  app.root.addChild(npc);
  const paint = trafficPaints[paintIndex % trafficPaints.length];
  block("Traffic underbody", [0, .22, 0], [1.48, .18, 2.9], mats.dark, npc);
  block("Traffic body", [0, 0.48, 0], [1.72, 0.48, 3.45], paint, npc);
  block("Traffic bonnet", [0,.75,-1.12],[1.58,.12,1.12],paint,npc);
  block("Traffic cabin", [0, 0.83, 0.18], [1.38, 0.46, 1.62], mats.glass, npc);
  block("Traffic roof", [0,1.09,.18],[1.2,.1,1.08],paint,npc);
  block("Traffic windscreen", [0,.91,-.67],[1.18,.32,.06],mats.glass,npc).setLocalEulerAngles(-18,0,0);
  block("Traffic rear glass", [0,.91,.98],[1.16,.3,.06],mats.glass,npc).setLocalEulerAngles(18,0,0);
  const brakeLamps = [];
  for (const side of [-1, 1]) {
    block("Traffic headlight", [side * 0.55, 0.52, -1.74], [0.26, 0.12, 0.06], mats.headlight, npc);
    brakeLamps.push(block("Traffic tail brake light", [side * 0.55, 0.52, 1.74], [0.26, 0.12, 0.06], mats.red, npc));
    for (const end of [-1, 1]) {
      const tyre = block("Traffic tyre", [side * 0.87, 0.25, end * 1.05], [0.22, 0.46, 0.58], mats.trim, npc, "cylinder");
      tyre.setLocalEulerAngles(0, 0, 90);
      block("Traffic alloy hub",[side*.99,.25,end*1.05],[.25,.22,.22],mats.metal,npc,"cylinder").setLocalEulerAngles(0,0,90);
    }
  }
  for(const side of [-1,1]){
    block("Traffic door handle",[side*.87,.67,.05],[.035,.05,.22],mats.metal,npc);
    block("Traffic wing mirror",[side*.75,.98,-.58],[.22,.12,.24],paint,npc);
  }
  const travelStart=startZ;
  const junctions=axis==="z"?districtRoads:[-120,-60,60,120];
  const upcoming=junctions.filter(value=>(value-travelStart)*direction>8).sort((a,b)=>Math.abs(a-travelStart)-Math.abs(b-travelStart));
  const plannedTurn=upcoming.length&&Math.random()<0.42?upcoming[0]:null;
  traffic.push({entity:npc,direction,cruiseSpeed,currentSpeed:cruiseSpeed,hitCooldown:0,brakeLamps,braking:false,axis,turnAt:plannedTurn,turnDirection:Math.random()<0.5?1:-1,turns:0});
  npc.setEulerAngles(0,axis==="z"?(direction>0?180:0):(direction>0?90:-90),0);
}
createTrafficCar(-2.55, -57, 1, 0, 10);
createTrafficCar(2.55, -25, -1, 1, 8.5);
createTrafficCar(-2.55, 11, 1, 2, 9);
createTrafficCar(2.55, 62, -1, 3, 11);
createTrafficCar(-2.55, 45, 1, 1, 8.2);
createTrafficCar(2.55, 15, -1, 2, 9.4);
createTrafficCar(-2.55, -76, 1, 3, 10.5);
createTrafficCar(2.55, 39, -1, 0, 8.8);
// East-west traffic gives the expanded cross-avenues life.
createTrafficCar(-137.45,-145,1,0,8.5,"x");
createTrafficCar(-142.55,145,-1,1,9.2,"x");
createTrafficCar(-67.45,-145,1,2,10,"x");
createTrafficCar(-72.55,145,-1,3,8.8,"x");
createTrafficCar(72.55,-145,1,0,9.5,"x");
createTrafficCar(67.45,145,-1,2,8.3,"x");
createTrafficCar(212.55,-145,1,1,10.2,"x");
createTrafficCar(207.45,145,-1,3,9,"x");

// Pedestrian figures with simple looping walk cycles along the sidewalks.
const skinMat = makeMat([0.55, 0.34, 0.22]);
const clothingMats = [makeMat([0.12, 0.22, 0.48]), makeMat([0.48, 0.12, 0.09]), makeMat([0.12, 0.34, 0.2]), makeMat([0.34, 0.27, 0.16])];
const pedestrians = [];
function createPedestrian(x, z, outfit, facing = 0, walkDirection = 1, axis = "z", min = -72, max = 72) {
  const person = new pc.Entity("Walking pedestrian");
  person.setPosition(x, 0.12, z); person.setEulerAngles(0, facing, 0); app.root.addChild(person);
  block("Pedestrian torso", [0, 0.98, 0], [0.48, 0.78, 0.28], clothingMats[outfit % clothingMats.length], person);
  block("Pedestrian head", [0, 1.58, -0.015], [0.34, 0.36, 0.34], skinMat, person, "sphere");
  const legs = []; const arms = [];
  for (const side of [-1, 1]) {
    legs.push(block("Pedestrian leg", [side * 0.13, 0.43, 0], [0.16, 0.62, 0.18], mats.dark, person));
    arms.push(block("Pedestrian arm", [side * 0.31, 1.02, 0], [0.14, 0.58, 0.16], clothingMats[outfit % clothingMats.length], person));
  }
  const pedestrian={entity:person,legs,arms,phase:outfit*.9,direction:walkDirection,axis,min,max};
  pedestrians.push(pedestrian);
  return pedestrian;
}
createPedestrian(-9.1, -51, 0, 90, 1); createPedestrian(9.1, -35, 1, -90, -1);
createPedestrian(-9.1, -5, 2, 90, 1); createPedestrian(9.1, 22, 3, -90, -1); createPedestrian(-9.1, 61, 1, 90, -1);
for(const avenueX of [-120,-60,60,120]){
 createPedestrian(avenueX-9.1,-185,0,0,1,"z",-245,245);
 createPedestrian(avenueX+9.1,185,2,180,-1,"z",-245,245);
}
for(const streetZ of [-210,-140,140,210]){
 createPedestrian(-145,streetZ-9.1,1,90,1,"x",-155,155);
 createPedestrian(145,streetZ+9.1,3,-90,-1,"x",-155,155);
}

// Marked pedestrian crossings and two crossing routes across north-south avenues.
const pedestrianCrossings=[{x:-120,z:35},{x:60,z:-105}];
for(const crossing of pedestrianCrossings){
 for(let stripe=-4;stripe<=4;stripe++){
  block("Pedestrian zebra crossing",[crossing.x,0.085,crossing.z+stripe*.9],[14,.035,.48],mats.white);
 }
}
function createCrossingPedestrian(crossing,outfit,direction){
 const startX=crossing.x+(direction>0?-10:10);
 const endX=crossing.x+(direction>0?10:-10);
 const person=createPedestrian(startX,crossing.z,outfit,direction>0?90:-90,direction,"x",Math.min(startX,endX),Math.max(startX,endX));
 person.crossing={centerX:crossing.x,centerZ:crossing.z,startX,endX,waiting:true,waitTimer:0};
}
createCrossingPedestrian(pedestrianCrossings[0],1,1);
createCrossingPedestrian(pedestrianCrossings[0],2,-1);
createCrossingPedestrian(pedestrianCrossings[1],3,1);

// City lighting: warm street lamps and a gradual day/night cycle.
const streetLights=[];
const streetLampMaterial=makeMat([.12,.14,.18],.5,.32);
const lampGlowMaterial=makeMat([1,.76,.38],.25,.18);
const lampGlowLights=[];
function buildStreetLight(x,z,side=1){
 const pole=new pc.Entity("NOVA streetlight");app.root.addChild(pole);pole.setPosition(x,0,z);
 block("Streetlight pole",[0,3.25,0],[.16,6.5,.16],streetLampMaterial,pole);
 block("Streetlight arm",[side*.85,6.25,0],[1.8,.14,.14],streetLampMaterial,pole);
 const bulb=block("Streetlight bulb",[side*1.65,6.12,0],[.38,.16,.38],lampGlowMaterial,pole,"sphere");
 const glow=new pc.Entity("Streetlight illumination");glow.addComponent("light",{type:"omni",color:new pc.Color(1,.72,.42),intensity:0,range:17,falloffMode:1});glow.setPosition(x+side*1.65,5.9,z);app.root.addChild(glow);
 streetLights.push({bulb,glow});
}
for(const z of [-220,-170,-120,-70,-20,30,80,130,180,230]){
 buildStreetLight(-8.8,z,1);buildStreetLight(8.8,z,-1);
}
for(const x of [-140,-80,-20,40,100,160,220]){
 buildStreetLight(x,-8.8,1);buildStreetLight(x,8.8,-1);
}
const nightAmbient=new pc.Color(.035,.055,.12);
const dayAmbient=new pc.Color(.48,.52,.62);
const daySky=new pc.Color(.94,.97,1);
const nightSky=new pc.Color(.035,.05,.12);
const dayFog=new pc.Color(.56,.68,.78);
const nightFog=new pc.Color(.025,.04,.085);
let worldTime=0.32; // start in late morning; one full cycle lasts about four real minutes.
const cycleDuration=240;
const cycleLabel=document.createElement("div");cycleLabel.className="cycle-status";cycleLabel.textContent="11:40 • DAY";document.querySelector("#game-stage").appendChild(cycleLabel);
const skyDome=new pc.Entity("NOVA sky dome");
skyDome.addComponent("render",{type:"sphere"});
skyDome.setLocalScale(900,900,900);app.root.addChild(skyDome);
// An equirectangular canvas sky gives the dome a blue upper sky and warm horizon.
const skyCanvas=document.createElement("canvas");
skyCanvas.width=1024;skyCanvas.height=512;
const skyContext=skyCanvas.getContext("2d");
const skyGradient=skyContext.createLinearGradient(0,0,0,512);
skyGradient.addColorStop(0,"#355b83");
skyGradient.addColorStop(.34,"#729bb8");
skyGradient.addColorStop(.64,"#c4d0d0");
skyGradient.addColorStop(.79,"#f0c18f");
skyGradient.addColorStop(.9,"#d9b28f");
skyGradient.addColorStop(1,"#8299a8");
skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,1024,512);
let skySeed=91827;
const skyRand=()=>{skySeed=(skySeed*1664525+1013904223)>>>0;return skySeed/4294967296;};
for(let i=0;i<115;i++){
  const x=skyRand()*1024,y=55+skyRand()*310,w=24+skyRand()*115,h=2+skyRand()*7;
  skyContext.fillStyle="rgba(255,255,255,"+(.018+skyRand()*.035)+")";
  skyContext.beginPath();skyContext.ellipse(x,y,w,h,skyRand()*.08,0,Math.PI*2);skyContext.fill();
}
const skyTexture=new pc.Texture(app.graphicsDevice,{width:1024,height:512,format:pc.PIXELFORMAT_R8_G8_B8_A8,mipmaps:true});
skyTexture.name="KENNIX NOVA CITY atmospheric sky";skyTexture.addressU=pc.ADDRESS_REPEAT;skyTexture.addressV=pc.ADDRESS_CLAMP_TO_EDGE;skyTexture.setSource(skyCanvas);
const skyMaterial=new pc.StandardMaterial();skyMaterial.diffuse=new pc.Color(1,1,1);skyMaterial.emissive=new pc.Color(.94,.97,1);skyMaterial.emissiveMap=skyTexture;skyMaterial.emissiveIntensity=.9;skyMaterial.cull=pc.CULLFACE_FRONT;skyMaterial.update();skyDome.render.meshInstances[0].material=skyMaterial;

// A visible warm sun disk sits low over the distant skyline.
const sunCoreMaterial=makeMat([1,.72,.34],0,.3);
sunCoreMaterial.emissive=new pc.Color(1,.58,.22);sunCoreMaterial.emissiveIntensity=1.4;sunCoreMaterial.update();
const sunHaloMaterial=makeMat([1,.52,.2],0,.7);
sunHaloMaterial.emissive=new pc.Color(.9,.34,.12);sunHaloMaterial.emissiveIntensity=.55;sunHaloMaterial.update();
const sunHalo=block("NOVA sunset halo",[-220,126,-350],[34,34,34],sunHaloMaterial,app.root,"sphere");
const sunVisual=block("NOVA visible sun",[-220,126,-350],[12,12,12],sunCoreMaterial,app.root,"sphere");
function updateWorldLighting(dt){
 worldTime=(worldTime+dt/cycleDuration)%1;
 const daylight=clamp((Math.sin((worldTime-.25)*Math.PI*2)+.18)/1.18,0,1);
 const night=1-daylight;
 for(const beam of headlightBeams){
  beam.enabled=night>.12;
  beam.light.intensity=night*2.4;
 }
 mats.headlight.emissive=new pc.Color(.9,.82,.62);
 mats.headlight.emissiveIntensity=night*.7;
 mats.headlight.update();
 mats.windowLit.emissiveIntensity=night*.85;
 mats.windowLit.update();
 const blend=(a,b,t)=>new pc.Color(a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t);
 app.scene.ambientLight=blend(nightAmbient,dayAmbient,daylight);
 app.scene.fogColor=blend(nightFog,dayFog,daylight);
 skyMaterial.emissive=blend(nightSky,daySky,daylight);skyMaterial.diffuse=skyMaterial.emissive;skyMaterial.update();
 sunVisual.enabled=daylight>.08;sunHalo.enabled=daylight>.08;
 sunCoreMaterial.emissiveIntensity=1.4*daylight;sunCoreMaterial.update();
 sunHaloMaterial.emissiveIntensity=.55*daylight;sunHaloMaterial.update();
 if(typeof sun!=="undefined"&&sun.light)sun.light.intensity=.12+daylight*1.05;
 for(const item of streetLights){
  item.glow.light.intensity=night*.9;
  item.bulb.render.material=night>.15?lampGlowMaterial:streetLampMaterial;
 }
 const totalMinutes=Math.floor(worldTime*24*60),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;
 cycleLabel.textContent=String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+(daylight>.45?" • DAY":" • NIGHT");
}

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
 {id:"sport",name:"KX Sport",className:"SPORT",paint:[0.035,0.07,0.12],acceleration:12.5,maxSpeed:42,handling:1.0,braking:1.0,grip:1.0,owned:true},
 {id:"muscle",name:"Vortex GT",className:"MUSCLE",paint:[0.52,0.075,0.035],acceleration:13.8,maxSpeed:39,handling:0.88,braking:1.12,grip:.91,owned:true},
 {id:"suv",name:"Ranger X",className:"SUV",paint:[0.18,0.23,0.2],acceleration:9.2,maxSpeed:32,handling:0.78,braking:1.28,grip:1.18,owned:true},
 {id:"hyper",name:"Apex R",className:"HYPER",paint:[0.04,0.32,0.38],acceleration:16.5,maxSpeed:50,handling:1.12,braking:1.08,grip:1.06,owned:true}
];
const savedGarage=(()=>{try{return JSON.parse(localStorage.getItem("kxic-garage")||"{}")}catch{return {}}})();
let selectedVehicle=vehicleCatalog.find(v=>v.id===savedGarage.vehicle)||vehicleCatalog[0];
let selectedPaint=Array.isArray(savedGarage.paint)?savedGarage.paint:selectedVehicle.paint;
let cameraMode="chase",gamePaused=true,damage=Math.max(0,Math.min(100,Number(localStorage.getItem("kxic-damage")||0))),raceActive=false,raceStart=0,raceCheckpoint=0,bestRace=Number(localStorage.getItem("kxic-best-race")||0),drivenDistance=Number(localStorage.getItem("kxic-distance")||0),playerXP=Number(localStorage.getItem("kxic-xp")||0),playerLevel=Math.max(1,Math.floor(playerXP/1000)+1);let lastDistanceSave=Math.floor(drivenDistance/10);
const garagePaints=[{name:"Midnight",rgb:[.035,.07,.12]},{name:"Crimson",rgb:[.52,.045,.035]},{name:"Ocean",rgb:[.035,.22,.42]},{name:"Silver",rgb:[.48,.5,.52]},{name:"Gold",rgb:[.55,.34,.08]}];
function saveGarage(){localStorage.setItem("kxic-garage",JSON.stringify({vehicle:selectedVehicle.id,paint:selectedPaint}))}

const vehicleModels = {};
let activeVehicleWheels = [];
let activeSteeringWheel = null;
let activeSteeringWheelImported = false;
let activeVehicleIndicators = [];
let activeVehicleReverseLamps = [];
let activeVehicleExhaustFlames = [];
let indicatorBlinkTimer = 0;
let wheelSpinAngle = 0;
for(const child of [...car.children]){
 if(child.name!=="Headlight beam" && child.name!=="Brake light glow") child.enabled=false;
}
function buildVehicleModel(vehicle){
 const root=new pc.Entity(vehicle.id+" detailed vehicle model");car.addChild(root);
 const bodyMat=makeMat(vehicle.paint,.78,.2), trimMat=makeMat([.018,.022,.028],.45,.25);
 bodyMat.clearCoat=.72;bodyMat.clearCoatGloss=.88;bodyMat.useMetalness=true;bodyMat.update();
 const glassMat=makeMat([.025,.095,.14],.5,.12), chromeMat=makeMat([.38,.42,.46],.85,.18);
 const lampMat=makeMat([.9,.78,.48],.1,.15);lampMat.emissive=new pc.Color(.55,.38,.12);lampMat.update();
 const frontSignatureMat=makeMat([.82,.9,1],.08,.18);frontSignatureMat.emissive=new pc.Color(.72,.82,1);frontSignatureMat.update();
 const rearSignatureMat=makeMat([.72,.018,.012],.08,.2);rearSignatureMat.emissive=new pc.Color(.58,.008,.004);rearSignatureMat.update();
 const amberMat=makeMat([.95,.31,.035],.08,.22);amberMat.emissive=new pc.Color(.32,.055,.004);amberMat.update();
 const plateMat=makeMat([.72,.75,.74],.12,.55);
 const reverseMat=makeMat([.9,.94,1],.08,.18);reverseMat.emissive=new pc.Color(.72,.82,1);reverseMat.update();
 const reverseOffMat=makeMat([.34,.37,.4],.08,.28);
 const wheelList=[],paintParts=[],indicators=[],reverseLamps=[];
 const kind=vehicle.id;
 const caliperMat=makeMat(kind==="muscle"?[.72,.045,.018]:kind==="hyper"?[.025,.22,.62]:kind==="suv"?[.68,.48,.08]:[.62,.055,.035],.62,.28);
 const tyreTreadMat=makeMat([.045,.05,.055],.08,.9);
 let steeringWheel;
 const width=kind==="suv"?2.25:kind==="muscle"?2.18:kind==="hyper"?2.02:2.08;
 const length=kind==="suv"?4.65:kind==="muscle"?4.55:kind==="hyper"?4.35:4.25;
 const height=kind==="suv"?1.05:kind==="muscle"?.68:.55;
 const body=block("Vehicle base body",[0,.48,0],[width,height,length],bodyMat,root);
 body.enabled=false;
 // Authored-style procedural shell: a flattened underfloor, broad shoulders,
 // sculpted front/rear taper and closed end caps avoid the old box silhouette.
 const bodyEntity=new pc.Entity("Sculpted vehicle body shell");
 const bodyMesh=new pc.Mesh(app.graphicsDevice);
 const bodyPositions=[],bodyIndices=[];
 const bodyStations=[
  [-length*.5,width*.22,.23],
  [-length*.47,width*.31,.31],
  [-length*.39,width*.39,.38],
  [-length*.25,width*.46,.43],
  [-length*.08,width*.49,.45],
  [length*.17,width*.48,.44],
  [length*.34,width*.43,.4],
  [length*.44,width*.35,.34],
  [length*.5,width*.23,.24]
 ];
 const ringSegments=20;
 bodyStations.forEach(([z,halfWidth,halfHeight])=>{
  for(let segment=0;segment<ringSegments;segment++){
   const angle=segment/ringSegments*Math.PI*2;
   const side=Math.cos(angle),vertical=Math.sin(angle);
   const shoulderShape=.94+.06*Math.abs(vertical);
   const x=side*halfWidth*shoulderShape;
   const lowerFlatten=vertical<-.48?-.48+(vertical+.48)*.42:vertical;
   const y=.48+lowerFlatten*halfHeight;
   bodyPositions.push(x,y,z);
  }
 });
 for(let station=0;station<bodyStations.length-1;station++){
  for(let segment=0;segment<ringSegments;segment++){
   const a=station*ringSegments+segment;
   const b=station*ringSegments+(segment+1)%ringSegments;
   const c=(station+1)*ringSegments+(segment+1)%ringSegments;
   const d=(station+1)*ringSegments+segment;
   bodyIndices.push(a,b,d,b,c,d);
  }
 }
 const frontCap=bodyPositions.length/3;
 bodyPositions.push(0,.48-bodyStations[0][2]*.2,bodyStations[0][0]);
 const rearCap=bodyPositions.length/3;
 bodyPositions.push(0,.48-bodyStations[bodyStations.length-1][2]*.2,bodyStations[bodyStations.length-1][0]);
 for(let segment=0;segment<ringSegments;segment++){
  const next=(segment+1)%ringSegments;
  bodyIndices.push(frontCap,next,segment);
  const rearStart=(bodyStations.length-1)*ringSegments;
  bodyIndices.push(rearCap,rearStart+segment,rearStart+next);
 }
 bodyMesh.setPositions(bodyPositions);
 bodyMesh.setNormals(pc.calculateNormals(bodyPositions,bodyIndices));
 bodyMesh.setIndices(bodyIndices);
 bodyMesh.update();
 bodyEntity.addComponent("render",{meshInstances:[new pc.MeshInstance(bodyMesh,bodyMat,bodyEntity)]});
 root.addChild(bodyEntity);
 paintParts.push(bodyEntity);
 const hood=block("Sculpted bonnet",[0,.48+height*.53,-length*.29],[width*.91,.16,length*.34],bodyMat,root);paintParts.push(hood);
 const cabinHeight=kind==="suv"?1.05:kind==="muscle"?.58:.72;
 const cabinZ=kind==="suv"?.02:kind==="muscle"?.12:-.05;
 // Lofted cabin shell: tapered pillars, a narrower roof and a model-specific roofline.
 const cabinBaseY=.57,cabinTopY=cabinBaseY+cabinHeight;
 const cabinFrontZ=cabinZ-length*(kind==="suv"?.235:kind==="muscle"?.17:.205);
 const cabinRearZ=cabinZ+length*(kind==="suv"?.235:kind==="muscle"?.17:.205);
 const cabinRoofFactor=kind==="suv"?.79:kind==="muscle"?.76:kind==="hyper"?.68:.73;
 const cabinStations=[
  [cabinFrontZ,width*.31,width*.31,cabinBaseY,cabinTopY-(kind==="suv"?.08:.16)],
  [cabinFrontZ+length*.055,width*.385,width*.34,cabinBaseY,cabinTopY],
  [cabinZ,width*.405,width*cabinRoofFactor*.5,cabinBaseY,cabinTopY+.025],
  [cabinRearZ-length*.055,width*.38,width*.33,cabinBaseY,cabinTopY-.015],
  [cabinRearZ,width*.29,width*.27,cabinBaseY,cabinTopY-(kind==="suv"?.06:.18)]
 ];
 const cabinPositions=[],cabinIndices=[];
 cabinStations.forEach(([z,bottomHalf,topHalf,bottomY,topY])=>{
  cabinPositions.push(-bottomHalf,bottomY,z,bottomHalf,bottomY,z,topHalf,topY,z,-topHalf,topY,z);
 });
 for(let station=0;station<cabinStations.length-1;station++){
  for(let corner=0;corner<4;corner++){
   const a=station*4+corner,b=station*4+(corner+1)%4,c=(station+1)*4+(corner+1)%4,d=(station+1)*4+corner;
   cabinIndices.push(a,b,c,a,c,d);
  }
 }
 cabinIndices.push(0,3,2,0,2,1);
 const lastCabin=(cabinStations.length-1)*4;
 cabinIndices.push(lastCabin,lastCabin+1,lastCabin+2,lastCabin,lastCabin+2,lastCabin+3);
 const cabinMesh=new pc.Mesh(app.graphicsDevice);
 cabinMesh.setPositions(cabinPositions);
 cabinMesh.setNormals(pc.calculateNormals(cabinPositions,cabinIndices));
 cabinMesh.setIndices(cabinIndices);cabinMesh.update();
 const cabin=new pc.Entity("Tapered sculpted glass cabin");
 cabin.addComponent("render",{meshInstances:[new pc.MeshInstance(cabinMesh,glassMat,cabin)]});
 root.addChild(cabin);
 // Painted roof follows the reduced cabin width and unique roof length.
 const roofY=cabinTopY+.025;
 const roofLength=kind==="suv"?length*.39:kind==="muscle"?length*.25:kind==="hyper"?length*.23:length*.29;
 const roofPanel=block("Painted roof panel",[0,roofY,cabinZ],[width*cabinRoofFactor,.09,roofLength],bodyMat,root);paintParts.push(roofPanel);
 const frontScreen=block("Front windscreen",[0,.99,cabinZ-length*.205],[width*.7,.42,.055],glassMat,root);
 frontScreen.setLocalEulerAngles(-20,0,0);
 const rearScreen=block("Rear windscreen",[0,.99,cabinZ+length*.205],[width*.68,.38,.055],glassMat,root);
 rearScreen.setLocalEulerAngles(20,0,0);
 // Interior details are deliberately visible through the glazing in chase view.
 const interiorMat=makeMat([.035,.043,.05],.18,.72);
 const seatMat=makeMat([.075,.082,.09],.08,.82);
 const dashMat=makeMat([.055,.065,.075],.22,.48);
 block("Full width dashboard",[0,.79,cabinZ-.66],[width*.72,.18,.38],dashMat,root);
 block("Centre console",[0,.69,cabinZ-.02],[.34,.2,.88],interiorMat,root);
 for(const side of [-1,1]){
  block("Front seat cushion",[side*.39,.68,cabinZ-.12],[.55,.16,.66],seatMat,root);
  const seatBack=block("Front seat backrest",[side*.39,.91,cabinZ+.18],[.55,.62,.17],seatMat,root);
  seatBack.setLocalEulerAngles(-7,0,0);
  block("Front seat headrest",[side*.39,1.27,cabinZ+.22],[.34,.2,.15],seatMat,root);
  block("Front seat side bolster",[side*.39,.82,cabinZ-.02],[.58,.42,.12],interiorMat,root);
  block("Rear seat cushion",[side*.36,.67,cabinZ+.66],[.56,.14,.48],seatMat,root);
  block("Rear seat backrest",[side*.36,.87,cabinZ+.84],[.56,.42,.14],seatMat,root);
 }
 const steeringColumn=block("Steering column",[-.43,.91,cabinZ-.54],[.09,.09,.32],chromeMat,root);
 steeringColumn.setLocalEulerAngles(-18,0,0);
 steeringWheel=block("Steering wheel",[-.43,1.02,cabinZ-.72],[.36,.045,.36],interiorMat,root,"cylinder");
 steeringWheel.setLocalEulerAngles(90,0,0);
 block("Instrument cluster",[0,.91,cabinZ-.68],[.48,.12,.12],interiorMat,root);
 block("Digital instrument screen",[-.43,.99,cabinZ-.69],[.29,.12,.025],frontSignatureMat,root);
 block("Centre infotainment display",[0,.86,cabinZ-.23],[.4,.25,.045],glassMat,root);
 block("Infotainment screen glow",[0,.86,cabinZ-.258],[.31,.16,.012],frontSignatureMat,root);
 if(kind==="suv"){const suvRoof=block("SUV roof",[0,1.48,.05],[width*.82,.13,length*.4],bodyMat,root);paintParts.push(suvRoof);}
 if(kind==="muscle") {
  block("Bonnet power bulge",[0,.73,-1.12],[.72,.22,1.05],trimMat,root);
  block("Rear spoiler wing",[0,1.02,1.82],[2.05,.12,.34],chromeMat,root);
 }
 if(kind==="hyper"){
  block("Hypercar front splitter",[0,.22,-2.2],[2.2,.12,.48],trimMat,root);
  block("Rear aero wing",[0,1.02,1.9],[2.25,.09,.3],chromeMat,root);
  for(const side of [-1,1]) block("Hyper side intake",[side*1.02,.56,.25],[.09,.25,.82],trimMat,root);
 }
 if(kind==="suv"){
  for(const side of [-1,1]) block("Roof rail",[side*.86,1.57,.05],[.08,.12,1.75],chromeMat,root);
  block("SUV rear spare detail",[0,.9,2.22],[.85,.72,.16],trimMat,root);
 }
 for(const side of [-1,1]){
  block("Wheel arch trim front",[side*width*.48,.42,-1.28],[.12,.72,1.05],trimMat,root);
  block("Wheel arch trim rear",[side*width*.48,.42,1.28],[.12,.72,1.05],trimMat,root);
  block("Side sill",[side*width*.49,.27,0],[.12,.16,2.6],chromeMat,root);
  // Layered lower-door surfacing gives the slab-sided body a more finished profile.
  const lowerDoor=block("Lower door sculpting",[side*width*.505,.43,.12],[.055,.22,length*.48],bodyMat,root);paintParts.push(lowerDoor);
  block("Upper shoulder crease",[side*width*.505,.64,.02],[.045,.045,length*.68],chromeMat,root);
  block("Lower rocker aero blade",[side*width*.515,.19,.02],[.075,.075,2.72],trimMat,root);
  const frontCorner=block("Front bumper corner",[side*width*.43,.34,-length*.485],[.32,.2,.28],bodyMat,root);paintParts.push(frontCorner);
  const rearCorner=block("Rear bumper corner",[side*width*.43,.34,length*.485],[.32,.2,.28],bodyMat,root);paintParts.push(rearCorner);
  block("Wing mirror stem",[side*width*.49,.94,-.68],[.09,.1,.16],chromeMat,root);
  block("Wing mirror",[side*width*.54,.99,-.68],[.28,.18,.32],bodyMat,root);
  block("Front side glass",[side*width*.392,1.08,cabinZ-.43],[.055,cabinHeight*.58,.48],glassMat,root);
  block("Rear side glass",[side*width*.392,1.08,cabinZ+.43],[.055,cabinHeight*.58,.48],glassMat,root);
  block("Window beltline trim",[side*width*.395,.87,cabinZ],[.07,.07,length*.36],chromeMat,root);
  block("B-pillar",[side*width*.405,1.1,cabinZ],[.075,cabinHeight*.83,.09],trimMat,root);
  const aPillar=block("A-pillar",[side*width*.365,1.12,cabinFrontZ+.12],[.075,cabinHeight*.92,.11],bodyMat,root);
  aPillar.setLocalEulerAngles(-12,0,side*8);paintParts.push(aPillar);
  const cPillar=block("C-pillar",[side*width*.36,1.11,cabinRearZ-.1],[.085,cabinHeight*.88,.13],bodyMat,root);
  cPillar.setLocalEulerAngles(10,0,-side*7);paintParts.push(cPillar);
  block("Window upper chrome frame",[side*width*.397,1.36,cabinZ],[.045,.035,length*.34],chromeMat,root);
  block("Rear quarter glass",[side*width*.34,1.08,cabinRearZ-.27],[.045,cabinHeight*.48,.25],glassMat,root);
  block("Front door seam",[side*width*.502,.49,-.48],[.025,.36,.035],trimMat,root);
  block("Rear door seam",[side*width*.502,.49,.62],[.025,.34,.035],trimMat,root);
  block("Door handle",[side*width*.515,.66,.08],[.035,.055,.28],chromeMat,root);
  block("Front fender vent",[side*width*.505,.57,-1.08],[.035,.19,.42],trimMat,root);
  block("LED headlamp",[side*.65,.59,-length*.5-.02],[.48,.18,.07],lampMat,root);
  block("Front signature light strip",[side*.65,.69,-length*.5-.055],[.43,.035,.035],frontSignatureMat,root);
  block("Rear LED lamp",[side*.65,.59,length*.5+.02],[.48,.16,.07],mats.red,root);
  block("Rear signature light strip",[side*.65,.67,length*.5+.055],[.44,.045,.035],rearSignatureMat,root);
  block("Rear reflector",[side*.65,.38,length*.5+.04],[.28,.07,.05],lampMat,root);
  block("Front amber side marker",[side*width*.505,.49,-.62],[.045,.09,.25],amberMat,root);
  block("Rear amber side marker",[side*width*.505,.49,.72],[.045,.09,.22],amberMat,root);
 }
 // Front and rear indicator lenses for each side.
 for(const side of [-1,1]){
  indicators.push(block("Front turn indicator",[side*.86,.57,-length*.5-.11],[.22,.09,.045],indicatorOffMaterial,root));
  indicators.push(block("Rear turn indicator",[side*.86,.57,length*.5+.11],[.22,.09,.045],indicatorOffMaterial,root));
 }
 // Each wheel is a single pivot: tyre, brake disc, rim and spokes now
 // rotate and steer together instead of leaving the alloy details frozen.
 const tyreDiameter=kind==="suv"?.78:kind==="muscle"?.76:kind==="hyper"?.66:.72;
 const tyreWidth=kind==="suv"?.39:kind==="muscle"?.36:kind==="hyper"?.29:.33;
 const wheelZ=length*.33;
 for(const z of [-wheelZ,wheelZ]){
  for(const side of [-1,1]){
   const wheelX=side*width*.49;
   const wheelPivot=new pc.Entity("Suspended wheel assembly");
   wheelPivot.setLocalPosition(wheelX,.28,z);
   // Store per-corner spring state so each wheel can travel independently.
   wheelPivot.suspensionBaseY=.28;
   wheelPivot.suspensionOffset=0;
   wheelPivot.suspensionVelocity=0;
   root.addChild(wheelPivot);
   const tyre=block("Performance tyre",[0,0,0],[tyreDiameter,tyreWidth,tyreDiameter],trimMat,wheelPivot,"cylinder");
   tyre.setLocalEulerAngles(0,0,90);
   // Raised circumferential tread bars add visible tyre texture without heavy geometry.
   const treadRadius=tyreDiameter*.485;
   for(let tread=0;tread<10;tread++){
    const angle=tread*Math.PI*2/10;
    const treadBar=block("Tyre tread bar",[0,Math.sin(angle)*treadRadius,Math.cos(angle)*treadRadius],[tyreWidth*1.015,.075,.022],tyreTreadMat,wheelPivot);
    treadBar.setLocalEulerAngles(angle*180/Math.PI,0,0);
   }
   const rimX=side*tyreWidth*.56;
   const rimDiameter=tyreDiameter*.61;
   block("Machined alloy rim",[rimX,0,0],[rimDiameter,tyreWidth*.22,rimDiameter],chromeMat,wheelPivot,"cylinder").setLocalEulerAngles(0,0,90);
   block("Brake disc",[side*tyreWidth*.43,0,0],[rimDiameter*.78,.045,rimDiameter*.78],mats.metal,wheelPivot,"cylinder").setLocalEulerAngles(0,0,90);
   block("Wheel centre cap",[rimX+side*.035,0,0],[.12,.075,.12],mats.paint,wheelPivot,"cylinder").setLocalEulerAngles(0,0,90);
   const spokeCount=kind==="suv"?6:kind==="muscle"?5:kind==="hyper"?10:7;
   for(let spoke=0;spoke<spokeCount;spoke++){
    const angle=spoke*Math.PI*2/spokeCount;
    const spokeWidth=kind==="hyper"?.032:kind==="muscle"?.065:.045;
    const part=block(kind+" alloy wheel spoke",[rimX+side*.04,Math.sin(angle)*rimDiameter*.3,Math.cos(angle)*rimDiameter*.3],[spokeWidth,rimDiameter*.44,.055],chromeMat,wheelPivot);
    part.setLocalEulerAngles(angle*180/Math.PI,0,0);
   }
   const caliper=block("Performance brake caliper",[side*tyreWidth*.49,0,rimDiameter*.18],[.11,rimDiameter*.38,.16],caliperMat,wheelPivot);
   caliper.setLocalEulerAngles(0,0,12);
   wheelList.push(wheelPivot);
  }
 }
 block("Front grille surround",[0,.41,-length*.5-.045],[1.05,.3,.1],trimMat,root);
 block("Front grille",[0,.41,-length*.5-.105],[.82,.2,.035],chromeMat,root);
 for(let slat=-2;slat<=2;slat++){
  block("Front grille horizontal slat",[0,.41+slat*.035,-length*.5-.13],[.78,.018,.025],mats.metal,root);
 }
 block("Lower air intake",[0,.25,-length*.5-.07],[1.45,.12,.08],trimMat,root);
 // Give each class its own front-end identity instead of reusing one grille.
 if(kind==="suv"){
  block("SUV upright grille",[0,.48,-length*.5-.105],[.9,.42,.075],chromeMat,root);
  for(let bar=-3;bar<=3;bar++)block("SUV vertical grille bar",[bar*.115,.48,-length*.5-.15],[.025,.34,.025],mats.metal,root);
  const skid=block("SUV brushed skid plate",[0,.19,-length*.5-.15],[1.55,.12,.16],chromeMat,root);
  block("SUV raised bumper guard",[0,.34,-length*.5-.12],[1.82,.12,.14],trimMat,root);
 }else if(kind==="muscle"){
  const scoop=block("Muscle car bonnet scoop",[0,.66,-1.12],[.72,.17,.72],trimMat,root);
  block("Muscle wide grille",[0,.45,-length*.5-.145],[1.35,.23,.045],chromeMat,root);
  for(let bar=-4;bar<=4;bar++)block("Muscle grille slat",[bar*.14,.45,-length*.5-.18],[.018,.19,.018],mats.metal,root);
  for(const side of [-1,1])block("Muscle front air vent",[side*.78,.31,-length*.5-.14],[.28,.18,.045],trimMat,root);
 }else if(kind==="hyper"){
  block("Hypercar central intake",[0,.35,-length*.5-.17],[1.48,.24,.07],trimMat,root);
  for(const side of [-1,1]){
   block("Hypercar vertical aero blade",[side*.82,.29,-length*.5-.2],[.09,.27,.22],chromeMat,root);
   block("Hypercar bumper canard",[side*1.02,.23,-length*.5-.25],[.28,.055,.38],trimMat,root);
  }
  block("Hypercar bonnet centre channel",[0,.59,-1.45],[.16,.035,.92],trimMat,root);
 }else{
  block("Sport wide lower grille",[0,.34,-length*.5-.15],[1.28,.18,.045],chromeMat,root);
  for(const side of [-1,1])block("Sport bonnet crease",[side*.55,.59,-1.28],[.035,.025,.92],chromeMat,root);
 }
 for(const side of [-1,1]){
  block("Front fog lamp bezel",[side*.78,.3,-length*.5-.085],[.34,.16,.07],trimMat,root);
  block("Front fog lamp lens",[side*.78,.3,-length*.5-.13],[.22,.085,.025],lampMat,root);
 }
 block("Front registration plate",[0,.32,-length*.5-.145],[.62,.16,.025],plateMat,root);
 block("Rear registration plate",[0,.34,length*.5+.085],[.62,.16,.025],plateMat,root);
 for(const side of [-1,1]){
  reverseLamps.push(block("Rear reverse lamp",[side*.42,.43,length*.5+.078],[.2,.085,.028],reverseOffMat,root));
 }
 block("Rear centre light bridge",[0,.65,length*.5+.04],[.78,.035,.035],rearSignatureMat,root);
 block("Front splitter",[0,.18,-length*.5-.12],[width*1.02,.08,.42],trimMat,root);
 block("Front bumper lower lip",[0,.29,-length*.5-.095],[width*.94,.09,.16],chromeMat,root);
 block("Rear diffuser",[0,.19,length*.5+.06],[width*.78,.12,.38],trimMat,root);
 if(kind==="suv"){
  block("SUV rear bumper step",[0,.22,length*.5+.14],[1.55,.12,.2],chromeMat,root);
  for(const side of [-1,1])block("SUV rear reflector",[side*.82,.39,length*.5+.1],[.16,.22,.045],rearSignatureMat,root);
 }else if(kind==="muscle"){
  block("Muscle rear deck spoiler",[0,.91,length*.36],[1.75,.12,.34],bodyMat,root);
  for(const side of [-1,1])block("Muscle rear exhaust surround",[side*.68,.25,length*.5+.16],[.34,.18,.08],chromeMat,root);
 }else if(kind==="hyper"){
  for(let fin=-3;fin<=3;fin++)block("Hypercar diffuser fin",[fin*.19,.16,length*.5+.2],[.045,.18,.52],chromeMat,root);
  block("Hypercar active rear wing",[0,1.02,length*.43],[2.12,.075,.24],chromeMat,root);
 }else{
  block("Sport rear lip spoiler",[0,.91,length*.4],[1.55,.075,.22],bodyMat,root);
 }
 block("Rear bumper valance",[0,.3,length*.5+.045],[width*.9,.13,.12],trimMat,root);
 for(const exhaustSide of [-1,1]){
  block("Polished exhaust tip",[exhaustSide*.62,.27,length*.5+.18],[.2,.14,.18],chromeMat,root,"cylinder").setLocalEulerAngles(90,0,0);
  block("Hood character line",[exhaustSide*.48,.58,-1.15],[.035,.025,1.12],chromeMat,root);
 }
 if(kind==="sport"){const rearDeck=block("Sport rear deck",[0,.84,1.35],[1.6,.12,.5],bodyMat,root);paintParts.push(rearDeck);}
 const exhaustFlameMat=makeMat([.15,.42,.95],.05,.25);exhaustFlameMat.emissive=new pc.Color(.08,.38,1);exhaustFlameMat.update();
 const exhaustFlames=[];
 for(const side of [-1,1]){const flame=block("Nitro exhaust flame",[side*.62,.27,length*.5+.29],[.12,.18,.42],exhaustFlameMat,root,"cone");flame.setLocalEulerAngles(90,0,0);flame.enabled=false;exhaustFlames.push(flame);}
 const brakeLamps=[];
 for(const side of [-1,1]){
  const lamp=block("Vehicle brake LED",[side*.64,.6,length*.5+.06],[.42,.16,.08],brakeLampMaterial,root);
  brakeLamps.push(lamp);
 }
 // Damage meshes are hidden until impacts accumulate; they are separate from paintable body panels.
 const damageMat=makeMat([.055,.045,.04],.25,.55);
 const scratchParts=[
  block("Bonnet scrape left",[-.48,.572,-1.12],[.055,.018,.62],damageMat,root),
  block("Bonnet scrape right",[.38,.574,-1.02],[.045,.018,.48],damageMat,root),
  block("Driver door scrape",[-width*.505,.48,.05],[.025,.12,.72],damageMat,root),
  block("Passenger door scrape",[width*.505,.48,.18],[.025,.12,.68],damageMat,root)
 ];
 const bumperDamage=block("Bent front bumper",[0,.2,-length*.5-.12],[width*.9,.13,.2],damageMat,root);
 const brokenLamp=block("Broken headlamp cover",[width*.65,.59,-length*.5-.065],[.5,.2,.09],damageMat,root);
 const windshieldCrack=block("Windshield crack main",[0,1.13,-.48],[.72,.025,.035],damageMat,root);
 const windshieldCracks=[
  windshieldCrack,
  block("Windshield crack branch left",[-.22,1.135,-.5],[.025,.022,.48],damageMat,root),
  block("Windshield crack branch right",[.2,1.135,-.51],[.025,.022,.42],damageMat,root),
  block("Windshield crack upper fracture",[.02,1.145,-.66],[.48,.02,.025],damageMat,root),
  block("Rear quarter panel scrape left",[-width*.505,.53,length*.24],[.025,.1,.42],damageMat,root),
  block("Rear quarter panel scrape right",[width*.505,.53,length*.24],[.025,.1,.42],damageMat,root)
 ];
 const damageParts={scratchParts,bumperDamage,brokenLamp,windshieldCrack,windshieldCracks};
 Object.values(damageParts).flat().forEach(part=>part.enabled=false);
 root.enabled=false;
 return {root,wheels:wheelList,paintParts,brakeLamps,reverseLamps,exhaustFlames,steeringWheel,indicators,bodyMat,damageParts};
}
for(const v of vehicleCatalog) vehicleModels[v.id]=buildVehicleModel(v);

// Optional realistic CC0 vehicle containers. The procedural models remain the safe
// fallback until public/models/vehicles/manifest.json and its GLB files are present.
const importedVehicleFiles = {
 sport: "sport-coupe.glb",
 muscle: "sedan.glb",
 suv: "suv.glb",
 hyper: "mid-engine-sports.glb"
};
let importedVehiclesReady = false;
function activateVehicleModel(){
 for(const [id,model] of Object.entries(vehicleModels)){
  const selected=id===selectedVehicle.id;
  model.root.enabled=selected&&!model.importedRoot;
  if(model.importedRoot)model.importedRoot.enabled=selected;
  applyVehicleDamage(model,damage);
 }
 const current=vehicleModels[selectedVehicle.id];
 activeVehicleWheels=current.importedWheels||current.wheels;
 activeSteeringWheel=current.importedSteeringWheel||current.steeringWheel;
 activeSteeringWheelImported=!!current.importedSteeringWheel;
 activeVehicleIndicators=current.indicators;
 activeVehicleReverseLamps=current.reverseLamps;
 activeVehicleExhaustFlames=current.exhaustFlames;
}
function loadImportedVehicleModels(){
 fetch("/models/vehicles/manifest.json",{cache:"no-store"}).then(response=>{
  if(!response.ok) return null;
  return response.json();
 }).then(manifest=>{
  if(!manifest||manifest.version!==1||!manifest.vehicles)return;
  importedVehiclesReady=true;
  for(const [id,filename] of Object.entries(importedVehicleFiles)){
   if(!manifest.vehicles.includes(filename)||!vehicleModels[id])continue;
   app.assets.loadFromUrl("/models/vehicles/"+filename,"container",(err,asset)=>{
    if(err||!asset?.resource){console.warn("Optional vehicle model unavailable:",filename,err||"empty asset");return;}
    const model=vehicleModels[id];
    if(model.importedRoot)return;
    const imported=asset.resource.instantiateRenderEntity();
    imported.name="KENNIX imported "+id;
    imported.setLocalScale(0.9,0.9,0.9);
    imported.setLocalEulerAngles(0,180,0);
    imported.setLocalPosition(0,0,0);
    car.addChild(imported);
    // Match the actual front/rear node names used by the imported GLB assets.
    const wheelNames=["wheel-front-left","wheel-front-right","wheel-rear-left","wheel-rear-right"];
    const importedWheels=wheelNames.map((name,index)=>imported.findByName(name)||imported.findByName(["wheel-front-left","wheel-front-right","wheel-back-left","wheel-back-right"][index])).filter(Boolean);
    model.importedSteeringWheel=imported.findByName("steering");
    if(importedWheels.length===4){
     importedWheels.forEach(wheel=>{
      const p=wheel.getLocalPosition();
      wheel.suspensionBaseY=p.y;
      wheel.suspensionOffset=0;
      wheel.suspensionVelocity=0;
      wheel.baseLocalX=p.x;
      wheel.baseLocalZ=p.z;
     });
     model.importedWheels=importedWheels;
    }
    model.importedRoot=imported;
    model.importedMaterials=[];
    imported.findComponents("render").forEach(component=>{
     component.castShadows=true;
     component.receiveShadows=true;
     component.meshInstances.forEach(instance=>{
      if(!instance.material)return;
      const material=instance.material.clone();
      // Keep the source material's texture, roughness, metalness and base colour.
      // Only recognised exterior-paint materials are recoloured by the garage.
      const materialName=String(material.name||"").toLowerCase();
      material.kennixPaintable=/(body|paint|exterior|car.?color|vehicle.?color)/.test(materialName);
      material.kennixBaseDiffuse=material.diffuse?.clone?.()||new pc.Color(1,1,1);
      instance.material=material;
      instance.castShadow=true;
      model.importedMaterials.push(material);
     });
    });
    const catalogPaint=vehicleCatalog.find(vehicle=>vehicle.id===id)?.paint||[.2,.2,.2];
    applyImportedPaint(model,selectedVehicle.id===id?selectedPaint:catalogPaint);
    model.root.enabled=false;
    activateVehicleModel();
    console.info("Loaded realistic CC0 vehicle:",filename);
   });
  }
 }).catch(error=>console.warn("Optional vehicle manifest unavailable; using procedural vehicles.",error));
}
function applyImportedPaint(model,rgb){
 if(!model?.importedMaterials)return;
 const tint=new pc.Color(rgb[0],rgb[1],rgb[2]);
 model.importedMaterials.forEach(material=>{
  if(!material.kennixPaintable)return;
  // Multiply the requested colour by the model's authored base colour rather
  // than replacing it, preserving painted highlights and material variation.
  const base=material.kennixBaseDiffuse||new pc.Color(1,1,1);
  material.diffuse=new pc.Color(base.r*tint.r,base.g*tint.g,base.b*tint.b);
  material.update();
 });
}
function setPlayerPaint(rgb){
 selectedPaint=rgb;
 const model=vehicleModels[selectedVehicle.id];
 const paint=makeMat(rgb,.78,.2);
 model.paintParts.forEach(part=>part.render.material=paint);
 applyImportedPaint(model,rgb);
 selectedVehicle.paint=rgb;
 saveGarage();
}
function applyVehicleDamage(model,amount=damage){
 const parts=model.damageParts;
 if(!parts)return;
 parts.scratchParts.forEach(part=>part.enabled=amount>=15);
 parts.bumperDamage.enabled=amount>=40;
 parts.brokenLamp.enabled=amount>=65;
 parts.windshieldCrack.enabled=amount>=85;
 if(parts.windshieldCracks)parts.windshieldCracks.forEach((part,index)=>part.enabled=amount>=85&&index>0||amount>=55&&index>=4);
 if(amount>=40)parts.bumperDamage.setLocalEulerAngles(0,0,Math.min(12,(amount-35)*.22));
 else parts.bumperDamage.setLocalEulerAngles(0,0,0);
}
function refreshVehicleDamage(){
 for(const model of Object.values(vehicleModels))applyVehicleDamage(model,damage);
}
const camera = new pc.Entity("Chase camera");
camera.addComponent("camera", {
  clearColor: new pc.Color(0.23, 0.34, 0.49),
  fov: 68,
  nearClip: 0.1,
  farClip: 1000
});
app.root.addChild(camera);

const keys = new Set();
const held = new Set();
window.addEventListener("keydown",e=>{const key=e.key.toLowerCase();if(e.key==="Escape"){if(gamePaused)hideGarage();else showGarage("PAUSED","Take a break or return to the garage.")}if(key==="h")setHorn(true);if(key==="j"&&!keys.has("j"))hazardLights=!hazardLights;keys.add(key)});
window.addEventListener("keyup",e=>{if(e.key.toLowerCase()==="h")setHorn(false)});
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => { keys.clear(); held.clear(); });

const controls = document.createElement("div");
controls.className = "touch-controls";
controls.innerHTML = `
  <div class="steering-panel">
    <button class="steering-mode" type="button" aria-label="Change steering control">STEERING: WHEEL</button>
    <div class="steering-wheel-control" role="slider" aria-label="Virtual steering wheel" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0" tabindex="0">
      <span class="wheel-spoke wheel-spoke-top"></span><span class="wheel-spoke wheel-spoke-left"></span><span class="wheel-spoke wheel-spoke-right"></span><span class="wheel-hub"></span>
    </div>
    <div class="steering steering-arrows" hidden>
      <button data-control="left" aria-label="Steer left">◀</button>
      <button data-control="right" aria-label="Steer right">▶</button>
    </div>
  </div>
  <div class="pedals">
    <button data-control="brake" aria-label="Brake and reverse">BRAKE</button>
    <button data-control="handbrake" aria-label="Handbrake">HANDBRAKE</button>
    <button data-control="gas" aria-label="Accelerate">GAS</button>
    <button data-control="nitro" aria-label="Nitro boost">NITRO</button>
    <button data-control="signal-left" aria-label="Left turn signal">SIGNAL ◀</button>
    <button data-control="signal-right" aria-label="Right turn signal">SIGNAL ▶</button>
    <button data-control="hazards" aria-label="Toggle hazard lights">HAZARDS</button>
  </div>`;
document.querySelector("#game-stage").appendChild(controls);
const gameOverlay=document.createElement("section");gameOverlay.className="game-overlay";
gameOverlay.innerHTML=`<div class="game-panel"><div class="panel-kicker">KENNIX GAME STUDIOS</div><h1 id="panel-title">INFINITE CITY</h1><p id="panel-copy">Choose your ride, then enter the city.</p><div id="garage-list" class="garage-list"></div><div class="paint-list">${garagePaints.map((p,i)=>`<button class="paint-swatch" data-paint="${i}" title="${p.name}" style="--swatch:rgb(${p.rgb.map(v=>Math.round(v*255)).join(",")})"></button>`).join("")}</div><div class="panel-stats" id="vehicle-stats"></div><div class="panel-actions"><button id="start-drive" class="primary-action">START DRIVING</button><button id="start-race" class="secondary-action">STREET SPRINT</button><button id="repair-car" class="secondary-action">REPAIR VEHICLE</button></div><small id="panel-note">Prototype vehicles share temporary 3D geometry; distinct authored models are still needed.</small></div>`;
document.querySelector("#game-stage").appendChild(gameOverlay);
const panelTitle=gameOverlay.querySelector("#panel-title"),panelCopy=gameOverlay.querySelector("#panel-copy"),garageList=gameOverlay.querySelector("#garage-list"),vehicleStats=gameOverlay.querySelector("#vehicle-stats"),panelNote=gameOverlay.querySelector("#panel-note");
function refreshGarage(){
 activateVehicleModel();
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
gameOverlay.querySelector("#repair-car").addEventListener("click",()=>{damage=0;try{localStorage.setItem("kxic-damage","0")}catch{}speed=0;lateralSpeed=0;refreshVehicleDamage();refreshGarage()});

const fuelLabel=document.createElement("div");fuelLabel.className="fuel-status";fuelLabel.textContent="FUEL 100%";document.querySelector("#game-stage").appendChild(fuelLabel);
const nitroLabel=document.createElement("div");nitroLabel.className="nitro-status";nitroLabel.innerHTML='<span>NITRO</span><div class="nitro-track"><i></i></div>';document.querySelector("#game-stage").appendChild(nitroLabel);
const nitroFill=nitroLabel.querySelector("i");
let nitro=100,nitroActive=false;
const refuelButton=document.createElement("button");refuelButton.className="refuel-button";refuelButton.textContent="REFUEL";refuelButton.hidden=true;document.querySelector("#game-stage").appendChild(refuelButton);
let fuel=100;try{fuel=Math.max(0,Math.min(100,Number(localStorage.getItem("kxic-fuel")??100)))}catch{}
let lastFuelSaved=Math.floor(fuel);
refuelButton.addEventListener("click",()=>{if(fuel<99.5){fuel=100;lastFuelSaved=100;try{localStorage.setItem("kxic-fuel","100")}catch{}fuelLabel.textContent="FUEL 100%";refuelButton.textContent="TANK FULL"}});
const utilityBar=document.createElement("div");utilityBar.className="utility-bar";utilityBar.innerHTML='<button id="garage-open">GARAGE</button><button id="camera-toggle">CAMERA: CHASE</button><button id="audio-toggle">SOUND: OFF</button><button id="horn-button">HORN</button><button id="pause-toggle">PAUSE</button>';document.querySelector("#game-stage").appendChild(utilityBar);
utilityBar.querySelector("#garage-open").addEventListener("click",()=>showGarage("CITY GARAGE","Select a vehicle, choose paint and repair damage."));
utilityBar.querySelector("#pause-toggle").addEventListener("click",()=>gamePaused?hideGarage():showGarage("PAUSED","Take a break or return to the garage."));
utilityBar.querySelector("#camera-toggle").addEventListener("click",e=>{cameraMode=cameraMode==="chase"?"cockpit":"chase";e.currentTarget.textContent="CAMERA: "+cameraMode.toUpperCase()});

// Live open-world minimap with tap-to-set waypoint navigation.
const mapLandmarks = [
  { id: "centre", name: "NOVA CENTRE", x: 0, z: 0 },
  { id: "market", name: "MARKET QUARTER", x: 90, z: -125 },
  { id: "waterfront", name: "WATERFRONT", x: 55, z: -225 },
  { id: "industrial", name: "INDUSTRIAL EDGE", x: -135, z: 215 }
];
let navigationTarget = null;
const miniMapPanel = document.createElement("section");
miniMapPanel.className = "minimap-panel";
miniMapPanel.innerHTML = `
  <div class="minimap-heading"><strong>NOVA CITY</strong><button id="map-clear" type="button" aria-label="Clear waypoint">×</button></div>
  <canvas id="city-minimap" width="240" height="240" aria-label="Interactive city minimap. Tap to set a waypoint."></canvas>
  <div class="minimap-readout"><span id="map-position">NOVA CITY • FREE DRIVE</span><span id="map-distance">TAP MAP TO NAVIGATE</span></div>
  <select id="map-destination" aria-label="Choose a city destination">
    <option value="">QUICK DESTINATIONS</option>
    <option value="centre">NOVA CENTRE</option>
    <option value="market">MARKET QUARTER</option>
    <option value="waterfront">WATERFRONT</option>
    <option value="industrial">INDUSTRIAL EDGE</option>
  </select>`;
document.querySelector("#game-stage").appendChild(miniMapPanel);
const miniMapCanvas = miniMapPanel.querySelector("#city-minimap");
const miniMapContext = miniMapCanvas.getContext("2d");
const mapPositionLabel = miniMapPanel.querySelector("#map-position");
const mapDistanceLabel = miniMapPanel.querySelector("#map-distance");
const mapScale = 0.72;
const mapRoadXs = [-120, -60, 0, 60, 120];
const mapRoadZs = [-210, -140, -43, 39, 140, 210];
const nearestRoad = (values, value) => values.reduce((best, item) => Math.abs(item-value)<Math.abs(best-value)?item:best, values[0]);
function setNavigationTarget(target) {
  navigationTarget = target ? { x: clamp(target.x, -158, 158), z: clamp(target.z, -258, 258), name: target.name || "CUSTOM WAYPOINT" } : null;
  mapDistanceLabel.textContent = navigationTarget ? navigationTarget.name + " • ROUTE SET" : "TAP MAP TO NAVIGATE";
}
miniMapCanvas.addEventListener("pointerdown", event => {
  const rect = miniMapCanvas.getBoundingClientRect();
  const localX = (event.clientX - rect.left) / rect.width * miniMapCanvas.width;
  const localY = (event.clientY - rect.top) / rect.height * miniMapCanvas.height;
  const playerPosition = car.getPosition();
  setNavigationTarget({
    x: playerPosition.x + (localX - miniMapCanvas.width/2) / mapScale,
    z: playerPosition.z + (localY - miniMapCanvas.height/2) / mapScale,
    name: "CUSTOM WAYPOINT"
  });
  miniMapPanel.querySelector("#map-destination").value = "";
});
miniMapPanel.querySelector("#map-clear").addEventListener("click", () => {
  setNavigationTarget(null);
  miniMapPanel.querySelector("#map-destination").value = "";
});
miniMapPanel.querySelector("#map-destination").addEventListener("change", event => {
  const place = mapLandmarks.find(item => item.id === event.target.value);
  if (place) setNavigationTarget(place);
});
function drawMiniMap() {
  const ctx = miniMapContext, width = miniMapCanvas.width, height = miniMapCanvas.height;
  const playerPosition = car.getPosition();
  const cx = width/2, cy = height/2, radius = width/2-5;
  ctx.clearRect(0,0,width,height);
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.clip();
  ctx.fillStyle = "#101b24";ctx.fillRect(0,0,width,height);
  const point = (x,z) => [cx+(x-playerPosition.x)*mapScale, cy+(z-playerPosition.z)*mapScale];

  // Waterfront water, city blocks and the connected road grid.
  const water = point(70,-252);
  ctx.fillStyle = "#164b60";
  ctx.fillRect(water[0]-95*mapScale,water[1]-19*mapScale,190*mapScale,38*mapScale);
  ctx.strokeStyle = "#71818a";ctx.lineCap = "round";
  for(const x of mapRoadXs){
    const a=point(x,-270),b=point(x,270);
    ctx.lineWidth=15*mapScale;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.strokeStyle="#394954";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.strokeStyle="#71818a";
  }
  for(const z of mapRoadZs){
    const a=point(-170,z),b=point(170,z);
    ctx.lineWidth=15*mapScale;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.strokeStyle="#394954";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.strokeStyle="#71818a";
  }

  // Named landmarks are visible when they are inside the current map window.
  for(const place of mapLandmarks){
    const q=point(place.x,place.z);
    if(Math.hypot(q[0]-cx,q[1]-cy)<radius-8){
      ctx.fillStyle="#d7b36f";ctx.beginPath();ctx.arc(q[0],q[1],3.6,0,Math.PI*2);ctx.fill();
    }
  }

  if(navigationTarget){
    const startX=nearestRoad(mapRoadXs,playerPosition.x);
    const startZ=nearestRoad(mapRoadZs,playerPosition.z);
    const targetX=nearestRoad(mapRoadXs,navigationTarget.x);
    const targetZ=nearestRoad(mapRoadZs,navigationTarget.z);
    const route=[
      [playerPosition.x,playerPosition.z],
      [startX,playerPosition.z],
      [startX,startZ],
      [targetX,startZ],
      [targetX,targetZ],
      [navigationTarget.x,targetZ],
      [navigationTarget.x,navigationTarget.z]
    ];
    ctx.strokeStyle="#f3c66f";ctx.lineWidth=3;ctx.setLineDash([5,4]);
    ctx.beginPath();
    route.forEach((pos,index)=>{const q=point(pos[0],pos[1]);if(index===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);});
    ctx.stroke();ctx.setLineDash([]);
    const targetPoint=point(navigationTarget.x,navigationTarget.z);
    ctx.fillStyle="#ffd27b";ctx.beginPath();ctx.arc(targetPoint[0],targetPoint[1],5.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#fff1cf";ctx.lineWidth=1.5;ctx.stroke();
    const routeDistance=route.slice(1).reduce((total,pos,index)=>total+Math.hypot(pos[0]-route[index][0],pos[1]-route[index][1]),0);
    mapDistanceLabel.textContent=navigationTarget.name+" • "+(routeDistance<1000?Math.round(routeDistance)+" M":(routeDistance/1000).toFixed(1)+" KM");
  }else{
    mapDistanceLabel.textContent="TAP MAP TO NAVIGATE";
  }

  // The player arrow points toward the top of the map when facing north.
  ctx.translate(cx,cy);ctx.rotate(heading*Math.PI/180);
  ctx.fillStyle="#63d5ff";ctx.strokeStyle="#07121a";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,8);ctx.lineTo(0,5);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();
  ctx.strokeStyle="rgba(225,195,137,.8)";ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
  mapPositionLabel.textContent="NOVA CITY • "+Math.round(playerPosition.x)+", "+Math.round(playerPosition.z);
}
let miniMapElapsed = 0;


let audioContext=null,engineOscillator=null,engineGain=null,engineFilter=null,hornOscillator=null,hornGain=null,nitroOscillator=null,nitroGain=null,audioEnabled=false;
let simulatedGear=1,gearShiftFlash=0;
function initialiseVehicleAudio(){
 const AudioEngine=window.AudioContext||window.webkitAudioContext;
 if(!AudioEngine)throw new Error("This browser does not support game audio.");
 if(!audioContext){
  audioContext=new AudioEngine();
  engineOscillator=audioContext.createOscillator();engineOscillator.type="sawtooth";
  engineFilter=audioContext.createBiquadFilter();engineFilter.type="lowpass";engineFilter.frequency.value=520;
  engineGain=audioContext.createGain();engineGain.gain.value=0;
  engineOscillator.connect(engineFilter);engineFilter.connect(engineGain);engineGain.connect(audioContext.destination);engineOscillator.start();
  hornOscillator=audioContext.createOscillator();hornOscillator.type="square";
  hornGain=audioContext.createGain();hornGain.gain.value=0;
  hornOscillator.connect(hornGain);hornGain.connect(audioContext.destination);hornOscillator.frequency.value=440;hornOscillator.start();
  nitroOscillator=audioContext.createOscillator();nitroOscillator.type="sawtooth";
  nitroGain=audioContext.createGain();nitroGain.gain.value=0;
  const nitroFilter=audioContext.createBiquadFilter();nitroFilter.type="lowpass";nitroFilter.frequency.value=680;
  nitroOscillator.connect(nitroFilter);nitroFilter.connect(nitroGain);nitroGain.connect(audioContext.destination);nitroOscillator.start();
 }
 if(audioContext.state==="suspended")audioContext.resume();
 audioEnabled=true;
 utilityBar.querySelector("#audio-toggle").textContent="SOUND: ON";
}
function setHorn(active){
 if(!audioEnabled||!hornGain||!audioContext)return;
 hornGain.gain.setTargetAtTime(active ? 0.035 : 0,audioContext.currentTime,.035);
}
utilityBar.querySelector("#audio-toggle").addEventListener("click",()=>{
 try{
  if(audioEnabled){audioEnabled=false;engineGain.gain.setTargetAtTime(0,audioContext.currentTime,.08);if(nitroGain)nitroGain.gain.setTargetAtTime(0,audioContext.currentTime,.05);setHorn(false);utilityBar.querySelector("#audio-toggle").textContent="SOUND: OFF"}
  else initialiseVehicleAudio();
 }catch(error){onlineStatus.textContent=error.message}
});
utilityBar.querySelector("#horn-button").addEventListener("pointerdown",e=>{e.preventDefault();try{if(!audioEnabled)initialiseVehicleAudio();setHorn(true)}catch(error){onlineStatus.textContent=error.message}});
for(const eventName of ["pointerup","pointercancel","pointerleave"])utilityBar.querySelector("#horn-button").addEventListener(eventName,()=>setHorn(false));

const accountButton=document.createElement("button");
accountButton.textContent="ACCOUNT / KX";
utilityBar.appendChild(accountButton);
const onlinePanel=document.createElement("section");
onlinePanel.className="game-overlay hidden";
onlinePanel.innerHTML='<div class="game-panel"><div class="panel-kicker">KENNIX ONLINE</div><h1>DRIVER ACCOUNT</h1><p id="online-status">Create an account or sign in.</p><div id="account-form"><label class="online-label">DRIVER NAME<input id="account-name" maxlength="24"></label><label class="online-label">EMAIL<input id="account-email" type="email"></label><label class="online-label">PASSWORD<input id="account-password" type="password" minlength="8"></label><div class="panel-actions"><button id="account-create" class="primary-action">CREATE ACCOUNT</button><button id="account-login">SIGN IN</button><button id="account-reset">RESET PASSWORD</button></div></div><div id="account-tools" hidden><label class="online-label">DRIVER NAME<input id="profile-name" maxlength="24"></label><button id="profile-save">UPDATE DRIVER NAME</button><label class="online-label">NEW PASSWORD<input id="new-password" type="password" minlength="8"></label><button id="password-update">UPDATE PASSWORD</button><h2 id="kx-balance">KX —</h2><button id="wallet-refresh">REFRESH WALLET</button><label class="online-label">RECIPIENT USER ID<input id="transfer-recipient"></label><label class="online-label">AMOUNT<input id="transfer-amount" type="number" min="1" max="100000"></label><button id="transfer-kx">TRANSFER KX</button><button id="cloud-save">SAVE TO CLOUD</button><button id="cloud-load">LOAD CLOUD SAVE</button><label class="online-label">PRIVATE ROOM CODE<input id="room-code" maxlength="32" value="nova-city"></label><button id="room-join">JOIN ONLINE CITY</button><button id="room-leave">LEAVE ONLINE CITY</button><button id="account-logout">SIGN OUT</button></div><small id="online-note">Requires the Supabase migration and hosting environment variables. Never share your password.</small><button id="online-close">CLOSE</button></div>';
document.querySelector("#game-stage").appendChild(onlinePanel);
const onlineStatus=onlinePanel.querySelector("#online-status");
const accountForm=onlinePanel.querySelector("#account-form");
const accountTools=onlinePanel.querySelector("#account-tools");
const accountEmail=onlinePanel.querySelector("#account-email");
const accountPassword=onlinePanel.querySelector("#account-password");
const accountName=onlinePanel.querySelector("#account-name");
const walletLabel=onlinePanel.querySelector("#kx-balance");
function openAccount(){gamePaused=true;gameOverlay.classList.add("hidden");onlinePanel.classList.remove("hidden");refreshAccount()}
async function refreshAccount(){
 if(!backendConfigured){onlineStatus.textContent="Backend not configured. Add the Supabase project URL and publishable key to the hosting build settings.";accountForm.hidden=false;accountTools.hidden=true;return}
 try{const session=await getPlayerSession();const signed=Boolean(session?.user);accountForm.hidden=signed;accountTools.hidden=!signed;onlineStatus.textContent=signed?"Signed in: "+(session.user.user_metadata?.display_name||session.user.email):"Create an account or sign in.";if(signed){onlinePanel.querySelector("#profile-name").value=session.user.user_metadata?.display_name||"";await refreshWallet()}}
 catch(error){onlineStatus.textContent=error.message}
}
async function refreshWallet(){walletLabel.textContent="KX "+(await getKXBalance()).toLocaleString("en-US")}
async function runOnline(button,task){const label=button.textContent;button.disabled=true;button.textContent="PLEASE WAIT";try{await task()}catch(error){onlineStatus.textContent=error.message||"Request failed"}finally{button.disabled=false;button.textContent=label}}
accountButton.addEventListener("click",openAccount);
onlinePanel.querySelector("#account-create").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{if(accountPassword.value.length<8)throw new Error("Password must be at least 8 characters.");await createPlayerAccount(accountEmail.value.trim(),accountPassword.value,accountName.value.trim());accountPassword.value="";onlineStatus.textContent="Registration submitted. Confirm your email if requested.";await refreshAccount()}));
onlinePanel.querySelector("#account-login").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{await signInPlayer(accountEmail.value.trim(),accountPassword.value);accountPassword.value="";await refreshAccount()}));

onlinePanel.querySelector("#account-reset").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{await requestPasswordReset(accountEmail.value.trim());onlineStatus.textContent="If the email is registered, a password reset link has been sent."}));
onlinePanel.querySelector("#profile-save").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{const name=onlinePanel.querySelector("#profile-name").value;await updatePlayerDisplayName(name);onlineStatus.textContent="Driver name updated."}));
onlinePanel.querySelector("#password-update").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{const value=onlinePanel.querySelector("#new-password").value;await updatePlayerPassword(value);onlinePanel.querySelector("#new-password").value="";onlineStatus.textContent="Password updated."}));

onlinePanel.querySelector("#account-logout").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{await signOutPlayer();await refreshAccount()}));
onlinePanel.querySelector("#wallet-refresh").addEventListener("click",e=>runOnline(e.currentTarget,refreshWallet));
onlinePanel.querySelector("#transfer-kx").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{const recipient=onlinePanel.querySelector("#transfer-recipient").value.trim();const amount=Number(onlinePanel.querySelector("#transfer-amount").value);const key=globalThis.crypto?.randomUUID?.()||("kx-"+Date.now()+"-"+Math.random().toString(36).slice(2));const result=await transferKX(recipient,amount,key);onlineStatus.textContent="Transfer: "+result.status;await refreshWallet()}));
function cloudProgress(){return {level:playerLevel,xp:playerXP,distance_m:drivenDistance,best_race_seconds:bestRace,vehicle_damage:damage,selected_vehicle:selectedVehicle.id,paint:"#"+selectedPaint.map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join(""),campaign_step:Number(localStorage.getItem("kxic-story-progress")||0)}}
onlinePanel.querySelector("#cloud-save").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{await savePlayerProgress(cloudProgress());onlineStatus.textContent="Progress saved to your account."}));
onlinePanel.querySelector("#cloud-load").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{const progress=await loadPlayerProgress();if(!progress){onlineStatus.textContent="No cloud save found.";return}const chosen=vehicleCatalog.find(v=>v.id===progress.selected_vehicle);if(chosen)selectedVehicle=chosen;const match=/^#([0-9a-f]{6})$/i.exec(progress.paint||"");if(match){const hex=match[1];setPlayerPaint([0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255))}localStorage.setItem("kxic-story-progress",String(progress.campaign_step||0));playerXP=Number(progress.xp)||0;playerLevel=Math.max(1,Number(progress.level)||Math.floor(playerXP/1000)+1);drivenDistance=Number(progress.distance_m)||0;bestRace=Number(progress.best_race_seconds)||bestRace;damage=clamp(Number(progress.vehicle_damage)||0,0,100);localStorage.setItem("kxic-damage",String(damage));refreshVehicleDamage();localStorage.setItem("kxic-xp",String(playerXP));localStorage.setItem("kxic-distance",String(drivenDistance));refreshGarage();onlineStatus.textContent="Cloud progress loaded."}));

let cityRoom=null;
const remoteDrivers=new Map();
let roomSnapshotTimer=0;
async function leaveOnlineRoom(){
 if(cityRoom){await cityRoom.leave();cityRoom=null}
 for(const entity of remoteDrivers.values())entity.destroy();
 remoteDrivers.clear();
 onlineStatus.textContent="You left the online city room.";
}
onlinePanel.querySelector("#room-join").addEventListener("click",e=>runOnline(e.currentTarget,async()=>{
 if(cityRoom)await leaveOnlineRoom();
 const code=onlinePanel.querySelector("#room-code").value.trim()||"nova-city";
 cityRoom=await joinCityRoom(code,players=>{
  const ownId=activePlayerSession?.user?.id;
  const present=new Set(players.filter(x=>x.userId!==ownId).map(x=>x.userId));
  for(const [id,entity] of remoteDrivers){if(!present.has(id)){entity.destroy();remoteDrivers.delete(id)}}
  onlineStatus.textContent="Online room "+code.toUpperCase()+" • "+present.size+" other driver(s) present.";
 },snapshot=>{
  if(snapshot.userId===activePlayerSession?.user?.id)return;
  let entity=remoteDrivers.get(snapshot.userId);
  if(!entity){
   entity=new pc.Entity("Online driver vehicle");
   app.root.addChild(entity);
   block("Online vehicle body",[0,.5,0],[1.9,.55,4],makeMat([.12,.28,.48],.65,.25),entity);
   block("Online vehicle cabin",[0,.9,.1],[1.4,.55,1.8],mats.glass,entity);
   remoteDrivers.set(snapshot.userId,entity);
  }
  entity.setPosition(snapshot.x,.08,snapshot.z);
  entity.setEulerAngles(0,snapshot.heading,0);
 });
 onlineStatus.textContent="Connected to room "+cityRoom.room.toUpperCase()+". Keep this screen open or close it to drive online.";
}));
onlinePanel.querySelector("#room-leave").addEventListener("click",e=>runOnline(e.currentTarget,leaveOnlineRoom));

onlinePanel.querySelector("#online-close").addEventListener("click",()=>{onlinePanel.classList.add("hidden");if(gameOverlay.classList.contains("hidden"))gamePaused=false});



const policeRoot=new pc.Entity("NOVA City Police interceptor");app.root.addChild(policeRoot);
const policePaint=makeMat([.018,.035,.075],.65,.22);
block("Police interceptor body",[0,.52,0],[2.05,.62,4.3],policePaint,policeRoot);
block("Police interceptor cabin",[0,1.02,-.1],[1.55,.68,1.9],mats.glass,policeRoot);
for(const side of [-1,1]){
 block("Police door badge",[side*1.04,.58,0],[.035,.32,.72],mats.white,policeRoot);
 for(const z of [-1.35,1.35]) block("Police wheel",[side*1.02,.27,z],[.62,.3,.65],mats.dark,policeRoot,"cylinder").setLocalEulerAngles(0,0,90);
}
const sirenRed=makeMat([.8,.015,.01]);sirenRed.emissive=new pc.Color(.8,.01,.005);sirenRed.update();
const sirenBlue=makeMat([.01,.12,.9]);sirenBlue.emissive=new pc.Color(.01,.1,.9);sirenBlue.update();
const sirenL=block("Police red light",[ -.38,1.42,-.1],[.42,.16,.25],sirenRed,policeRoot);
const sirenR=block("Police blue light",[ .38,1.42,-.1],[.42,.16,.25],sirenBlue,policeRoot);
policeRoot.enabled=false;
let wantedLevel=0,policeSpawnTimer=0,policeSirenTimer=0,policeHeading=0,policeSpeed=0,policeCloseTimer=0,policeLostTimer=0,missionEscapeTimer=0,missionIndex=-1,missionElapsed=0,missionComplete=false;
const storyMissions=[
 {title:"FIRST NIGHT",brief:"A contact needs a quick driver. Reach the waterfront marker.",target:[0,-125],wanted:0,goal:"Reach the waterfront"},
 {title:"HEAT CHECK",brief:"The street run drew police attention. Escape the patrol and reach the Market Quarter.",target:[60,-140],wanted:1,goal:"Lose the police and reach Market Quarter"},
 {title:"BLACKOUT RUN",brief:"The city grid is failing. Cross the city and reach the Industrial Edge.",target:[-120,210],wanted:2,goal:"Reach the Industrial Edge"}
];
let missionMarker=null;
function setMissionMarker(x,z){
 if(missionMarker)missionMarker.destroy();
 missionMarker=new pc.Entity("Story mission destination");app.root.addChild(missionMarker);
 block("Mission marker ring",[0,.16,0],[3.5,.12,3.5],mats.paint,missionMarker,"cylinder");
 block("Mission marker beacon",[0,2.3,0],[.18,4.6,.18],mats.paint,missionMarker);
 missionMarker.setPosition(x,.1,z);
}
function startStoryMission(index){
 missionIndex=index;missionElapsed=0;missionComplete=false;retryMissionButton.hidden=true;missionEscapeTimer=0;policeCloseTimer=0;policeLostTimer=0;policeSpeed=0;
 const mission=storyMissions[index];wantedLevel=mission.wanted;
 setMissionMarker(mission.target[0],mission.target[1]);
 missionStatusLabel.textContent=mission.goal;
 panelTitle.textContent=mission.title;panelCopy.textContent=mission.brief;
 panelNote.textContent="Story campaign prototype • mission progress is saved locally on this device.";
 hideGarage();
}
const retryMissionButton=document.createElement("button");
retryMissionButton.className="secondary-action";
retryMissionButton.textContent="RETRY MISSION";
retryMissionButton.hidden=true;
gameOverlay.querySelector(".panel-actions").appendChild(retryMissionButton);
retryMissionButton.addEventListener("click",()=>{if(missionIndex>=0)startStoryMission(missionIndex)});
function failStoryMission(reason){
 missionComplete=true;wantedLevel=0;policeRoot.enabled=false;policeSpeed=0;
 if(missionMarker){missionMarker.destroy();missionMarker=null}
 retryMissionButton.hidden=false;
 showGarage("MISSION FAILED",reason+" You can retry this mission or return to the city.");
}
function completeStoryMission(){
 const mission=storyMissions[missionIndex];missionComplete=true;
 if(missionMarker){missionMarker.destroy();missionMarker=null}
 wantedLevel=0;policeRoot.enabled=false;
 showGarage("MISSION COMPLETE",mission.title+" completed. Your campaign progress is saved on this device.");
 try{localStorage.setItem("kxic-story-progress",String(Math.max(Number(localStorage.getItem("kxic-story-progress")||0),missionIndex+1)));playerXP+=500+missionIndex*250;playerLevel=Math.max(1,Math.floor(playerXP/1000)+1);localStorage.setItem("kxic-xp",String(playerXP));}catch{}
 if(backendConfigured)getPlayerSession().then(session=>{if(session?.user)return savePlayerProgress(cloudProgress())}).catch(error=>console.warn("Cloud auto-save:",error.message));
}
const campaignButton=document.createElement("button");campaignButton.className="secondary-action";campaignButton.textContent="STORY CAMPAIGN";
gameOverlay.querySelector(".panel-actions").appendChild(campaignButton);
campaignButton.addEventListener("click",()=>{
 const saved=Number(localStorage.getItem("kxic-story-progress")||0);
 const next=Math.min(saved,storyMissions.length-1);
 startStoryMission(next);
});
const wantedLabel=document.createElement("div");wantedLabel.className="wanted-label";wantedLabel.textContent="";document.querySelector("#game-stage").appendChild(wantedLabel);
const missionTitleLabel=document.createElement("div");missionTitleLabel.className="mission-title-label";document.querySelector("#game-stage").appendChild(missionTitleLabel);

const raceStatusLabel=document.createElement("div");raceStatusLabel.className="race-status";raceStatusLabel.id="race-status";document.querySelector("#game-stage").appendChild(raceStatusLabel);
const missionStatusLabel=document.createElement("div");missionStatusLabel.className="mission-status";missionStatusLabel.textContent=`LEVEL ${playerLevel} • ${playerXP} XP • CITY DRIVE ${Math.min(500,Math.floor(drivenDistance))}/500 M`;document.querySelector("#game-stage").appendChild(missionStatusLabel);
setPlayerPaint(selectedPaint);refreshGarage();showGarage();

const steeringModeButton=controls.querySelector(".steering-mode");
const steeringWheelControl=controls.querySelector(".steering-wheel-control");
const steeringArrows=controls.querySelector(".steering-arrows");
let steeringMode="wheel",wheelSteeringInput=0;
function setSteeringMode(mode){
  steeringMode=mode;
  steeringModeButton.textContent=mode==="wheel"?"STEERING: WHEEL":"STEERING: ARROWS";
  steeringWheelControl.hidden=mode!=="wheel";
  steeringArrows.hidden=mode!=="arrows";
  wheelSteeringInput=0;
  steeringWheelControl.style.setProperty("--wheel-turn","0deg");
  steeringWheelControl.setAttribute("aria-valuenow","0");
}
steeringModeButton.addEventListener("click",()=>setSteeringMode(steeringMode==="wheel"?"arrows":"wheel"));
function updateVirtualWheel(e){
  const rect=steeringWheelControl.getBoundingClientRect();
  const centerX=rect.left+rect.width/2;
  const radius=rect.width*.43;
  wheelSteeringInput=Math.max(-1,Math.min(1,(centerX-e.clientX)/radius));
  steeringWheelControl.style.setProperty("--wheel-turn",(-wheelSteeringInput*135)+"deg");
  steeringWheelControl.setAttribute("aria-valuenow",String(Math.round(wheelSteeringInput*100)));
}
steeringWheelControl.addEventListener("pointerdown",e=>{e.preventDefault();steeringWheelControl.setPointerCapture(e.pointerId);updateVirtualWheel(e)});
steeringWheelControl.addEventListener("pointermove",e=>{if(steeringWheelControl.hasPointerCapture(e.pointerId))updateVirtualWheel(e)});
const releaseWheel=()=>{wheelSteeringInput=0;steeringWheelControl.style.setProperty("--wheel-turn","0deg");steeringWheelControl.setAttribute("aria-valuenow","0")};
steeringWheelControl.addEventListener("pointerup",releaseWheel);
steeringWheelControl.addEventListener("pointercancel",releaseWheel);
steeringWheelControl.addEventListener("lostpointercapture",releaseWheel);
controls.querySelectorAll("button[data-control]").forEach(button => {
  const id = button.dataset.control;
  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    if(id==="hazards"){hazardLights=!hazardLights;button.classList.toggle("is-active",hazardLights);return;}
    if(id==="signal-left"||id==="signal-right"){manualIndicatorSide=manualIndicatorSide===(id==="signal-left"?-1:1)?0:(id==="signal-left"?-1:1);controls.querySelectorAll('[data-control^="signal-"]').forEach(signal=>signal.classList.toggle("is-active",signal.dataset.control===(manualIndicatorSide<0?"signal-left":"signal-right")));return;}
    held.add(id);
    button.setPointerCapture(e.pointerId);
  });
  const release = () => held.delete(id);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});
setSteeringMode("wheel");

let speed = 0;                 // metres per second; forward is negative Z
let lateralSpeed = 0;          // sideways slip, damped by tyre grip
let bodyPitch = 0;              // subtle chassis pitch from acceleration and braking
let heading = 0;
let steeringAngle = 0;
let handbrakeActive = false;
let hazardLights = false;
let manualIndicatorSide=0;
let signalTimer = 0;
let skidMarkTimer = 0;
const skidMarks = [];
const skidMarkMaterial = makeMat([0.018,0.02,0.022],0.05,0.9);
function addSkidMarks(position,forwardX,forwardZ,rightX,rightZ){
 for(const side of [-1,1]){
  const mark=block("Tyre skid mark",[position.x-forwardX*1.45+rightX*side*.72,.035,position.z-forwardZ*1.45+rightZ*side*.72],[.085,.012,.78],skidMarkMaterial);
  mark.setEulerAngles(0,heading,0);skidMarks.push(mark);
 }
 while(skidMarks.length>100){const oldest=skidMarks.shift();oldest.destroy()}
}
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
  const posForStation=car.getPosition();
  const station=fuelStations.find(item=>Math.hypot(posForStation.x-item.x,posForStation.z-item.z)<15);
  refuelButton.hidden=!station;
  if(station)refuelButton.textContent=fuel>=99.5?"TANK FULL":"REFUEL AT "+station.label;
  fuelLabel.textContent="FUEL "+Math.round(fuel)+"%";
  const forward = isDown("w", "arrowup", "gas");
  const reverse = isDown("s", "arrowdown", "brake");
  const left = isDown("a", "arrowleft", "left");
  const right = isDown("d", "arrowright", "right");
  handbrakeActive = isDown(" ", "handbrake");
  nitroActive=forward&&isDown("shift","nitro")&&nitro>0.5;
  nitro=clamp(nitro+(nitroActive?-34:12)*dt,0,100);
  nitroFill.style.width=nitro+"%";
  nitroLabel.classList.toggle("boosting",nitroActive);

  const previousSpeed = speed;
  // More grounded arcade handling: throttle, braking, coasting and tyre grip.
  // The brake input slows the car first, then engages reverse at low speed.
  if(forward&&fuel>0)fuel=Math.max(0,fuel-dt*(.018+Math.abs(speed)*.0009));
  if(Math.floor(fuel)!==lastFuelSaved){lastFuelSaved=Math.floor(fuel);try{localStorage.setItem("kxic-fuel",String(fuel))}catch{}}
  if(forward&&fuel>0){
    const engineCondition=1-damage*.0038;
    speed += (speed < 0 ? 26 : selectedVehicle.acceleration*engineCondition*(nitroActive?1.75:1)) * dt;
  } else if (reverse) {
    speed -= (speed > 0 ? 25*selectedVehicle.braking*(1-damage*.0025) : 7.5) * dt;
  } else {
    speed *= Math.exp(-(handbrakeActive ? 1.7 : 0.72) * dt);
  }

  if (handbrakeActive && Math.abs(speed) > 2) speed *= Math.exp(-1.2 * dt);
  speed = clamp(speed, -12, Math.max(18,selectedVehicle.maxSpeed*(1-damage/180)*(nitroActive?1.22:1)));
  const longitudinalAcceleration = dt > 0 ? (speed-previousSpeed)/dt : 0;
  const targetBodyPitch = clamp(-longitudinalAcceleration*.16,-3,3);
  bodyPitch += (targetBodyPitch-bodyPitch)*Math.min(1,dt*5);

  const steerInput = steeringMode==="wheel" ? wheelSteeringInput : (left ? 1 : 0) - (right ? 1 : 0);
  const targetSteering = steerInput * 30;
  steeringAngle += (targetSteering - steeringAngle) * Math.min(1, dt * 7.5);

  const speedRatio = clamp(Math.abs(speed) / 24, 0, 1);
  const directionSign = Math.sign(speed || 1);
  const gripFactor = handbrakeActive ? 1.25 : selectedVehicle.grip*(1-damage*.0018);
  heading -= steeringAngle * 0.88 * selectedVehicle.handling * (0.16 + speedRatio * 0.84) * gripFactor * dt * directionSign;

  // Steering creates a little lateral movement; normal tyres quickly regain grip.
  lateralSpeed += steerInput * speedRatio * (handbrakeActive ? 5.2 : 1.35) * directionSign * dt;
  lateralSpeed *= Math.exp(-(handbrakeActive ? 1.15 : 6.2*selectedVehicle.grip) * dt);

  const radians = heading * Math.PI / 180;
  const forwardX = Math.sin(radians);
  const forwardZ = -Math.cos(radians);
  const rightX = Math.cos(radians);
  const rightZ = Math.sin(radians);
  const p = car.getPosition();
  if(fuel<=0.01&&speed>0)speed=Math.max(0,speed-8*dt);
  const nextX = p.x + (forwardX * speed + rightX * lateralSpeed) * dt;
  const nextZ = p.z + (forwardZ * speed + rightZ * lateralSpeed) * dt;

  // Road-edge contact reduces speed and sideways momentum instead of allowing clipping.
  p.x=clamp(nextX,-158,158);
  p.z=clamp(nextZ,-258,258);
  const onMainAvenue=Math.abs(p.x)<7.8;
  const onCrossStreet=playerCrossRoads.some(road=>Math.abs(p.z-road.z)<7.8&&Math.abs(p.x)<road.halfWidth);
  const onSideAvenue=[-120,-60,60,120].some(x=>Math.abs(p.x-x)<7.8);
  if(!(onMainAvenue||onCrossStreet||onSideAvenue)){
    speed*=Math.exp(-1.7*dt);
    lateralSpeed*=Math.exp(-3.2*dt);
  }
  car.setPosition(p);
  car.setEulerAngles(bodyPitch, heading, clamp(-steeringAngle * speedRatio * 0.035, -3, 3));
  if(handbrakeActive&&Math.abs(speed)>9){
   skidMarkTimer+=dt;
   if(skidMarkTimer>=.13){skidMarkTimer=0;addSkidMarks(p,forwardX,forwardZ,rightX,rightZ)}
  }else skidMarkTimer=0;
  if(audioEnabled&&audioContext&&engineOscillator){
   const throttleLoad=forward?1:reverse ? 0.62 : 0.28;
   const engineBase=selectedVehicle.id==="muscle"?48:selectedVehicle.id==="suv"?42:selectedVehicle.id==="hyper"?76:58;
   const engineWave=selectedVehicle.id==="muscle"?"sawtooth":selectedVehicle.id==="suv"?"triangle":selectedVehicle.id==="hyper"?"square":"sawtooth";
   engineOscillator.type=engineWave;
   const speedRatio=clamp(Math.abs(speed)/Math.max(1,selectedVehicle.maxSpeed),0,1);
   const gearThresholds=[.16,.34,.54,.76];
   let nextGear=1;while(nextGear<=gearThresholds.length&&speedRatio>gearThresholds[nextGear-1])nextGear++;
   if(nextGear!==simulatedGear){simulatedGear=nextGear;gearShiftFlash=.16;}
   const gearStart=simulatedGear===1?0:gearThresholds[simulatedGear-2];
   const gearEnd=gearThresholds[simulatedGear-1]??1;
   const gearLoad=clamp((speedRatio-gearStart)/Math.max(.01,gearEnd-gearStart),0,1);
   gearShiftFlash=Math.max(0,gearShiftFlash-dt);
   const revFrequency=engineBase+gearLoad*(selectedVehicle.id==="hyper"?66:54)+(forward?selectedVehicle.acceleration*.8:0);
   engineOscillator.frequency.setTargetAtTime(revFrequency*(gearShiftFlash>0?.78:1),audioContext.currentTime,.055);
   if(nitroOscillator&&nitroGain){nitroOscillator.frequency.setTargetAtTime(85+Math.abs(speed)*2.8,audioContext.currentTime,.05);nitroGain.gain.setTargetAtTime(nitroActive?.012:0,audioContext.currentTime,.08);}
   engineFilter.frequency.setTargetAtTime(260+Math.abs(speed)*24,audioContext.currentTime,.1);
   engineGain.gain.setTargetAtTime((gamePaused?0:.018+Math.abs(speed)/Math.max(1,selectedVehicle.maxSpeed)*.035)*throttleLoad,audioContext.currentTime,.1);
  }
  activeVehicleExhaustFlames.forEach((flame,index)=>{
    flame.enabled=nitroActive;
    if(nitroActive)flame.setLocalScale(.1,.12,.28+Math.random()*.28);
  });
  const braking = (reverse && speed > 0.8) || (forward && speed < -0.8);
  const reversing = speed < -0.6 || (reverse && Math.abs(speed) <= 0.6);
  brakeGlow.light.intensity = braking ? 2.8 : 0;
  brakeLamps.forEach(lamp => {
    lamp.render.material = braking ? brakeLampMaterial : mats.red;
  });
  activeVehicleReverseLamps.forEach(lamp => {
    lamp.render.material = reversing ? reverseMat : reverseOffMat;
  });

  // Keep all four tyres rotating with road speed. Front wheels also steer,
  // while rear wheels remain aligned with the chassis.
  wheelSpinAngle += speed * dt * 85;
  // Blink the matching side indicators while steering.
  indicatorBlinkTimer += dt;
  const indicatorLit=Math.floor(indicatorBlinkTimer/.38)%2===0;
  const activeIndicatorSide=manualIndicatorSide||(steeringAngle>7?-1:steeringAngle< -7?1:0);
  activeVehicleIndicators.forEach((lamp,index)=>{
    const lampSide=Math.floor(index/2)===0?-1:1;
    const shouldBlink=hazardLights||activeIndicatorSide===lampSide;
    lamp.render.material=shouldBlink&&indicatorLit?indicatorOnMaterial:indicatorOffMaterial;
  });
  // The cockpit steering wheel follows the same smoothed steering input as the front tyres.
  if(activeSteeringWheel){
   if(activeSteeringWheelImported) activeSteeringWheel.setLocalEulerAngles(0,0,steeringAngle*2.8);
   else activeSteeringWheel.setLocalEulerAngles(90,0,steeringAngle*2.8);
  }
  activeVehicleWheels.forEach((wheel,index)=>{
    const isFront=index<2;
    const isLeft=index%2===0;
    const steer=isFront ? steeringAngle*.55*(activeSteeringWheelImported?-1:1) : 0;
    // Chassis pitch and cornering load each suspension corner independently.
    const pitchLoad=bodyPitch*(isFront?-1:1)*.012;
    const cornerLoad=steeringAngle*speedRatio*(isLeft?1:-1)*.0009;
    const targetTravel=clamp(pitchLoad+cornerLoad,-.055,.055);
    const springForce=(targetTravel-wheel.suspensionOffset)*85;
    wheel.suspensionVelocity+=(springForce-wheel.suspensionVelocity*14)*dt;
    wheel.suspensionOffset=clamp(wheel.suspensionOffset+wheel.suspensionVelocity*dt,-.06,.06);
    const wheelPosition=wheel.getLocalPosition();
    const baseY=wheel.suspensionBaseY??wheelPosition.y;
    wheel.setLocalPosition(wheel.baseLocalX??wheelPosition.x,baseY+(wheel.suspensionOffset||0),wheel.baseLocalZ??wheelPosition.z);
    wheel.setLocalEulerAngles(wheelSpinAngle,steer,0);
  });

  // Pedestrians use marked crossings, wait for a safe signal phase and pause for approaching traffic.
  const pedestrianSignalSafe=(Math.floor(signalTimer/8)%2)===1; // north-south vehicle signals are red.
  for (const pedestrian of pedestrians) {
    const position = pedestrian.entity.getPosition();
    const nearPlayer = Math.abs(position.x - p.x) < 5.2 && Math.abs(position.z - p.z) < 8.5 && Math.abs(speed) > 3;
    let walkRate=nearPlayer?0:0.48;
    if(pedestrian.crossing){
      const crossing=pedestrian.crossing;
      const crossingTraffic=traffic.some(npc=>{
        if(npc.axis!=="z")return false;
        const q=npc.entity.getPosition();
        return Math.abs(q.x-crossing.centerX)<3.5&&Math.abs(q.z-crossing.centerZ)<20;
      });
      if(crossing.waiting){
        walkRate=0;
        crossing.waitTimer+=dt;
        if(pedestrianSignalSafe&&!crossingTraffic&&!nearPlayer&&crossing.waitTimer>1.2){
          crossing.waiting=false;
          crossing.waitTimer=0;
          pedestrian.direction=position.x<=crossing.centerX?1:-1;
          pedestrian.entity.setEulerAngles(0,pedestrian.direction>0?90:-90,0);
        }
      }else{
        walkRate=1.05;
        const destination=pedestrian.direction>0?crossing.endX:crossing.startX;
        if((pedestrian.direction>0&&position.x>=destination)||(pedestrian.direction<0&&position.x<=destination)){
          position.x=destination;
          crossing.waiting=true;
          crossing.waitTimer=0;
        }else if(nearPlayer||crossingTraffic){
          walkRate=0;
        }
      }
    }
    pedestrian.phase+=dt*(walkRate===0?1.2:5.2);
    const swing=Math.sin(pedestrian.phase)*(walkRate===0?.08:.42);
    pedestrian.legs[0].setLocalEulerAngles(swing*55,0,0);
    pedestrian.legs[1].setLocalEulerAngles(-swing*55,0,0);
    pedestrian.arms[0].setLocalEulerAngles(-swing*38,0,0);
    pedestrian.arms[1].setLocalEulerAngles(swing*38,0,0);
    if(pedestrian.axis==="z"){
      position.z+=pedestrian.direction*walkRate*dt;
      if(position.z>pedestrian.max){position.z=pedestrian.max;pedestrian.direction=-1}
      if(position.z<pedestrian.min){position.z=pedestrian.min;pedestrian.direction=1}
    }else if(!pedestrian.crossing||!pedestrian.crossing.waiting){
      position.x+=pedestrian.direction*walkRate*dt;
      if(!pedestrian.crossing){
        if(position.x>pedestrian.max){position.x=pedestrian.max;pedestrian.direction=-1}
        if(position.x<pedestrian.min){position.x=pedestrian.min;pedestrian.direction=1}
      }
    }
    pedestrian.entity.setPosition(position);
  }
  updateWorldLighting(dt);
  signalTimer += dt;
  // Coordinated 16-second signal cycle: north/south, then east/west.
  const trafficPhase = Math.floor(signalTimer / 8) % 2;
  const greenAxis = trafficPhase === 0 ? "z" : "x";
  for (const lamps of signalLamps) {
    lamps.green.render.material = greenAxis === "z" ? signalGreen : signalRed;
    lamps.red.render.material = greenAxis === "z" ? signalRed : signalGreen;
  }

  // Move NPC traffic and recycle vehicles at the ends of the test district.
  for (const npc of traffic) {
    const npcPos = npc.entity.getPosition();
    npc.hitCooldown = Math.max(0, npc.hitCooldown - dt);

    // Predictive following: maintain a speed-dependent gap and brake smoothly.
    let targetSpeed = npc.cruiseSpeed;
    const sameAxis = npc.axis === "z" ? "z" : "x";
    for (const other of traffic) {
      if (other === npc) continue;
      const otherPos = other.entity.getPosition();
      if (other.axis !== sameAxis || other.direction !== npc.direction) continue;
      const sameLane = npc.axis === "z" ? Math.abs(otherPos.x - npcPos.x) < 1.1 : Math.abs(otherPos.z - npcPos.z) < 1.1;
      if (!sameLane) continue;
      const gap = (npc.axis === "z" ? otherPos.z - npcPos.z : otherPos.x - npcPos.x) * npc.direction;
      const safeGap = 4.5 + npc.currentSpeed * 0.78;
      if (gap > 0 && gap < safeGap + 9) {
        const followSpeed = clamp((gap - 3.2) * 1.35, 0, npc.cruiseSpeed);
        targetSpeed = Math.min(targetSpeed, followSpeed);
      }
    }

    // Treat the player's car as another moving road user when it is in the same lane.
    const playerGap = (npc.axis === "z" ? p.z-npcPos.z : p.x-npcPos.x)*npc.direction;
    const playerInLane = npc.axis === "z" ? Math.abs(p.x-npcPos.x)<1.7 : Math.abs(p.z-npcPos.z)<1.7;
    if(playerInLane && playerGap>0 && playerGap<18){
      const playerSafeGap=4.8+npc.currentSpeed*.82;
      targetSpeed=Math.min(targetSpeed,clamp((playerGap-3.4)*1.3,0,npc.cruiseSpeed));
      if(playerGap<playerSafeGap)targetSpeed=Math.min(targetSpeed,Math.max(0,(playerGap-2.8)*1.1));
    }

    // Junction conflict check: do not enter a crossing while perpendicular traffic occupies it.
    if(npc.axis==="z"){
      const laneJunctionX=[-120,-60,60,120].reduce((best,x)=>Math.abs(x-npcPos.x)<Math.abs(best-npcPos.x)?x:best,-120);
      for(const junctionZ of districtRoads){
        const distanceToJunction=(junctionZ-npcPos.z)*npc.direction;
        if(distanceToJunction>0&&distanceToJunction<15){
          const occupied=traffic.some(other=>{
            if(other===npc||other.axis!=="x")return false;
            const q=other.entity.getPosition();
            return Math.abs(q.x-laneJunctionX)<8&&Math.abs(q.z-junctionZ)<8;
          });
          if(occupied){targetSpeed=0;break}
        }
      }
    }else{
      const laneJunctionZ=districtRoads.reduce((best,z)=>Math.abs(z-npcPos.z)<Math.abs(best-npcPos.z)?z:best,districtRoads[0]);
      for(const junctionX of [-120,-60,60,120]){
        const distanceToJunction=(junctionX-npcPos.x)*npc.direction;
        if(distanceToJunction>0&&distanceToJunction<15){
          const occupied=traffic.some(other=>{
            if(other===npc||other.axis!=="z")return false;
            const q=other.entity.getPosition();
            return Math.abs(q.x-junctionX)<8&&Math.abs(q.z-laneJunctionZ)<8;
          });
          if(occupied){targetSpeed=0;break}
        }
      }
    }

    // Yield to pedestrians who are actively using a marked crossing.
    if(npc.axis==="z"){
      for(const crossing of pedestrianCrossings){
        const distanceToCrossing=(crossing.z-npcPos.z)*npc.direction;
        const pedestrianOnCrossing=pedestrians.some(person=>person.crossing&&!person.crossing.waiting&&Math.abs(person.entity.getPosition().x-crossing.x)<10.5&&Math.abs(person.entity.getPosition().z-crossing.z)<1.2);
        if(pedestrianOnCrossing&&distanceToCrossing>-3&&distanceToCrossing<24){targetSpeed=0;break}
      }
    }
    // Stop at red lights on every junction along each traffic axis.
    if(npc.axis==="z"){
      for(const junctionZ of districtRoads){
        const distanceToJunction=(junctionZ-npcPos.z)*npc.direction;
        if(distanceToJunction>0&&distanceToJunction<13&&greenAxis!=="z"){targetSpeed=0;break}
      }
    }else{
      for(const junctionX of [-120,-60,60,120]){
        const distanceToJunction=(junctionX-npcPos.x)*npc.direction;
        if(distanceToJunction>0&&distanceToJunction<13&&greenAxis!=="x"){targetSpeed=0;break}
      }
    }
    const wasMovingFaster = targetSpeed < npc.currentSpeed - 0.7;
    npc.braking = wasMovingFaster;
    npc.brakeLamps.forEach(lamp => { lamp.render.material = wasMovingFaster ? trafficBrakeMaterial : mats.red; });
    const response = targetSpeed < npc.currentSpeed ? 6.2 : 1.65;
    const speedDelta=(targetSpeed-npc.currentSpeed)*Math.min(1,dt*response);
    npc.currentSpeed=clamp(npc.currentSpeed+speedDelta,0,npc.cruiseSpeed);
    const previousTravel=npc.axis==="z"?npcPos.z:npcPos.x;
    if(npc.axis==="z"){
      npcPos.z+=npc.direction*npc.currentSpeed*dt;
      if(npcPos.z<-258)npcPos.z=258;
      if(npcPos.z>258)npcPos.z=-258;
      // Turn only at the preselected junction, after crossing its stop line on green.
      const crossedTurn=npc.turnAt!==null&&npc.turnAt!==undefined&&((npc.direction>0&&previousTravel<npc.turnAt&&npcPos.z>=npc.turnAt)||(npc.direction<0&&previousTravel>npc.turnAt&&npcPos.z<=npc.turnAt));
      if(crossedTurn&&greenAxis==="z"&&(npc.turns||0)<1){
        const nextDirection=npc.turnDirection;
        npcPos.z=npc.turnAt;
        npcPos.x=npcPos.x; // preserve the intersection approach lane until the turn is applied.
        npc.axis="x";npc.direction=nextDirection;npc.turns=1;npc.turnAt=null;
        npcPos.z+=nextDirection>0?-2.55:2.55;
        npc.entity.setEulerAngles(0,nextDirection>0?90:-90,0);
      }
    }else{
      npcPos.x+=npc.direction*npc.currentSpeed*dt;
      if(npcPos.x<-158)npcPos.x=158;
      if(npcPos.x>158)npcPos.x=-158;
      const crossedTurn=npc.turnAt!==null&&npc.turnAt!==undefined&&((npc.direction>0&&previousTravel<npc.turnAt&&npcPos.x>=npc.turnAt)||(npc.direction<0&&previousTravel>npc.turnAt&&npcPos.x<=npc.turnAt));
      if(crossedTurn&&greenAxis==="x"&&(npc.turns||0)<1){
        const nextDirection=npc.turnDirection;
        npcPos.x=npc.turnAt;
        npc.axis="z";npc.direction=nextDirection;npc.turns=1;npc.turnAt=null;
        npcPos.x+=nextDirection>0?-2.55:2.55;
        npc.entity.setEulerAngles(0,nextDirection>0?180:0,0);
      }
    }
    npc.entity.setPosition(npcPos);

    // Low-cost contact response: slow the player and push the cars apart briefly.
    const dx = npcPos.x - p.x;
    const dz = npcPos.z - p.z;
    if (npc.hitCooldown === 0 && Math.abs(dx) < 1.65 && Math.abs(dz) < 3.05) {
      speed *= 0.32;
      damage=Math.min(100,damage+8);try{localStorage.setItem("kxic-damage",String(damage))}catch{}refreshVehicleDamage();refreshGarage();
      lateralSpeed += dx >= 0 ? -1.8 : 1.8;
      heading += dx >= 0 ? -4 : 4;
      npc.currentSpeed *= 0.25;
      npc.hitCooldown = 1.1;
    }
  }


  policeSirenTimer+=dt;
  sirenL.render.material=Math.floor(policeSirenTimer*5)%2===0?sirenRed:sirenBlue;
  sirenR.render.material=Math.floor(policeSirenTimer*5)%2===0?sirenBlue:sirenRed;
  if(wantedLevel>0){
   policeSpawnTimer+=dt;
   if(!policeRoot.enabled&&policeSpawnTimer>1.2){
    const backX=-Math.sin(heading*Math.PI/180),backZ=Math.cos(heading*Math.PI/180);
    policeRoot.enabled=true;
    policeRoot.setPosition(clamp(p.x+backX*34,-155,155),.08,clamp(p.z+backZ*34,-250,250));
    policeHeading=heading;policeSpeed=0;policeCloseTimer=0;policeLostTimer=0;
   }
   if(policeRoot.enabled){
    const pp=policeRoot.getPosition(),dx=p.x-pp.x,dz=p.z-pp.z,dist=Math.hypot(dx,dz);
    const desiredHeading=Math.atan2(dx,-dz)*180/Math.PI;
    const angleDelta=((desiredHeading-policeHeading+540)%360)-180;
    const turnRate=(wantedLevel>=2?105:82)*dt;
    policeHeading+=clamp(angleDelta,-turnRate,turnRate);
    const maxPoliceSpeed=wantedLevel>=2?30:24;
    policeSpeed=Math.min(maxPoliceSpeed,policeSpeed+(wantedLevel>=2?11:8)*dt);
    const policeRad=policeHeading*Math.PI/180;
    pp.x+=Math.sin(policeRad)*policeSpeed*dt;
    pp.z-=Math.cos(policeRad)*policeSpeed*dt;
    pp.x=clamp(pp.x,-158,158);pp.z=clamp(pp.z,-258,258);
    policeRoot.setPosition(pp);policeRoot.setEulerAngles(0,policeHeading,0);
    if(dist<4.2){policeCloseTimer+=dt;speed*=Math.exp(-.45*dt)}
    else policeCloseTimer=Math.max(0,policeCloseTimer-dt*.5);
    if(dist>95){policeLostTimer+=dt}else policeLostTimer=0;
    if(policeCloseTimer>2.4){
     speed=0;
     if(missionIndex>=0)failStoryMission("The police caught you.");else{wantedLevel=0;policeRoot.enabled=false;policeSpeed=0;missionStatusLabel.textContent="BUSTED • RESTART THE MISSION"}
    }else if(policeLostTimer>10){
     wantedLevel=0;policeRoot.enabled=false;policeSpeed=0;
     missionStatusLabel.textContent="POLICE ESCAPED";
    }
   }
  }else{policeRoot.enabled=false;policeSpawnTimer=0;policeSpeed=0}
  wantedLabel.textContent=wantedLevel?"POLICE HEAT  "+"★".repeat(wantedLevel)+"☆".repeat(3-wantedLevel):"";
  if(missionIndex>=0&&!missionComplete){
   missionElapsed+=dt;
   const mission=storyMissions[missionIndex],distance=Math.hypot(p.x-mission.target[0],p.z-mission.target[1]);
   missionTitleLabel.textContent=mission.title+" • "+mission.goal;
   if(mission.wanted>0&&wantedLevel>0&&policeRoot.enabled){
    const policeDistance=Math.hypot(p.x-policeRoot.getPosition().x,p.z-policeRoot.getPosition().z);
    if(policeDistance>95)missionEscapeTimer+=dt;else missionEscapeTimer=0;
    if(missionEscapeTimer>=10){wantedLevel=0;policeRoot.enabled=false;missionStatusLabel.textContent="POLICE ESCAPED • REACH THE MARKER"}
   }
   if(distance<9&&wantedLevel===0)completeStoryMission();
  }


  if(cityRoom){
   roomSnapshotTimer+=dt;
   if(roomSnapshotTimer>=.1){
    roomSnapshotTimer=0;
    cityRoom.sendSnapshot({x:p.x,z:p.z,heading,vehicle:selectedVehicle.id}).catch(error=>{onlineStatus.textContent=error.message});
   }
  }

  drivenDistance+=Math.abs(speed)*dt;const distanceBucket=Math.floor(drivenDistance/10);if(distanceBucket!==lastDistanceSave){lastDistanceSave=distanceBucket;try{localStorage.setItem("kxic-distance",String(Math.floor(drivenDistance)))}catch{}}
  missionStatusLabel.textContent=`LEVEL ${playerLevel} • ${playerXP} XP • `+(drivenDistance<500?`CITY DRIVE ${Math.min(500,Math.floor(drivenDistance))}/500 M`:"CITY DRIVE COMPLETE");
  if(raceActive){const target=raceRoute[raceCheckpoint];if(target!==undefined&&Math.abs(p.z-target)<2.4&&Math.abs(p.x)<5.8){raceGates[raceCheckpoint].enabled=false;raceCheckpoint++;if(raceCheckpoint<raceRoute.length)raceGates[raceCheckpoint].enabled=true;else{raceActive=false;const elapsed=(performance.now()-raceStart)/1000;if(!bestRace||elapsed<bestRace){bestRace=elapsed;localStorage.setItem("kxic-best-race",String(bestRace))}showGarage("SPRINT COMPLETE",`Time: ${elapsed.toFixed(2)}s • Best: ${bestRace.toFixed(2)}s`)}}}
  raceStatusLabel.textContent=raceActive?`STREET SPRINT • CHECKPOINT ${raceCheckpoint+1}/3 • ${((performance.now()-raceStart)/1000).toFixed(1)}s`:"";
  // Smooth follow camera to reduce sudden movement on mobile.
  // Speed-sensitive chase framing opens the view at high speed without
  // making low-speed city driving feel distant or difficult to control.
  const chaseDistance=13.2+speedRatio*2.8;
  const chaseHeight=6.4+speedRatio*.9;
  const camTarget=cameraMode==="cockpit"
    ?new pc.Vec3(p.x+Math.sin(heading*Math.PI/180)*.55,p.y+1.48,p.z-Math.cos(heading*Math.PI/180)*.25)
    :new pc.Vec3(p.x-Math.sin(heading*Math.PI/180)*chaseDistance,p.y+chaseHeight,p.z+Math.cos(heading*Math.PI/180)*chaseDistance);
  const camPos=camera.getPosition();camPos.lerp(camPos,camTarget,1-Math.pow(.001,dt));camera.setPosition(camPos);
  const targetFov=cameraMode==="cockpit"?76:68+speedRatio*5;
  camera.camera.fov+=(targetFov-camera.camera.fov)*Math.min(1,dt*2.8);
  camera.lookAt(p.x+Math.sin(heading*Math.PI/180)*(cameraMode==="cockpit"?12:-3.2),p.y+(cameraMode==="cockpit"?1.35:.7),p.z-Math.cos(heading*Math.PI/180)*(cameraMode==="cockpit"?12:-4.0));

  if (speedValue) speedValue.textContent = Math.round(Math.abs(speed) * 3.6).toString().padStart(3, "0");
  if (gearValue) gearValue.textContent = speed > 0.6 ? "D" : speed < -0.6 ? "R" : "N";
});

app.on("update", dt => {
  miniMapElapsed += dt;
  if(miniMapElapsed >= 0.12) {
    miniMapElapsed = 0;
    drawMiniMap();
  }
});

app.start();
activateVehicleModel();
loadImportedVehicleModels();
