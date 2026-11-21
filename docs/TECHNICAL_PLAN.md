# Technical Plan

## 1. Current recommendation

Use **PlayCanvas** as the 3D foundation because its Engine is designed for browser-based 3D and supports WebGL 2 / WebGPU. Its Editor is a browser-based visual environment, which is useful while the creator is working from an Android phone.

Official references:
- https://developer.playcanvas.com/
- https://developer.playcanvas.com/user-manual/engine/
- https://developer.playcanvas.com/user-manual/editor/

This is a technical direction, not a claim that the full game is already set up or that every Editor workflow will be comfortable on a phone.

## 2. Hybrid workflow

- **PlayCanvas Editor:** build and inspect 3D scenes, lighting, materials and imported assets.
- **GitHub (this repository):** preserve source code, custom scripts, design documents, version history and issue tracking.
- **Browser testing:** test small builds on Android early, not only at the end.
- **Hosting:** choose the final hosting path after the first prototype. Do not assume GitHub Pages, PlayCanvas hosting or any ad provider is automatically the right production solution.

The exact asset and scene hand-off between the Editor and this repository must be tested before the project depends on it.

## 3. First technical milestone

Build a tiny **driving-feel prototype**, not the open world:
1. A browser page loads a PlayCanvas 3D scene.
2. A simple placeholder vehicle can accelerate, brake and steer.
3. A follow camera tracks the vehicle.
4. A small test area has a road, boundaries and a few collision obstacles.
5. Touch controls work on Android.
6. A basic performance check records device, browser, frame rate and issues.

Do not add accounts, KX economy, multiplayer, ads, police AI, large maps or vehicle ownership to this milestone.

## 4. Proposed system boundaries for later

- Client presentation: scene rendering, camera, UI and input.
- Gameplay simulation: vehicle handling, collisions, mission state and NPC behaviour.
- Content: streamed/partitioned city chunks, vehicle models, audio and environment assets.
- Backend (later): accounts, saved progress, inventory, KX ledger, missions, leaderboards and multiplayer authority.
- Operations (later): moderation, anti-cheat, analytics, backups and monitoring.

The browser client must not be trusted to decide authoritative online KX balances, player transfers, rewards or competitive outcomes.

## 5. Multiplayer architecture — later milestone

Online multiplayer is a separate engineering project. It will require authoritative server logic, networking, persistence, abuse prevention, scaling and operating costs. It should not be attempted until the offline driving prototype is stable and fun.

## 6. Performance strategy

The intended audience includes phones, so the game must be designed around mobile constraints:
- Start with a very small test environment.
- Use low-cost placeholder geometry before detailed assets.
- Keep texture sizes, draw calls, shadows and effects controlled.
- Use level-of-detail and distance-based visibility as the world grows.
- Load city areas progressively rather than placing the entire city in memory.
- Provide graphics settings for lower-powered devices.
- Measure on real devices before increasing visual complexity.

## 7. Phone-only workflow

For now:
- Use GitHub in the Android browser/app for repository review.
- Use PlayCanvas Editor in the browser for visual scene work, checking desktop-site mode if needed.
- Keep changes small enough to review and test from a phone.
- Do not require local Node.js, terminal commands or a laptop for the immediate planning steps.

A laptop or collaborators may become necessary for large-scale asset creation, profiling, automation and production builds. That is a future constraint, not a reason to stop the early prototype.
