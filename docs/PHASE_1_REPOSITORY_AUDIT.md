# Phase 1 — Existing Repository Audit

**Audit date:** 26 November 2026  
**Branch reviewed:** main  
**Scope:** Source-tree and documentation review. This is a static code review; no live browser session, Supabase project, or physical Android device was available during this audit.

## Executive summary

The repository is an established PlayCanvas/Vite driving prototype, not a blank project. It already contains useful driving, traffic, police, mission, garage, audio, map and online-service foundations. The approved Phase 1 design is substantially broader than the current playable implementation.

The largest mismatch is the visual/world foundation: the current city is one compact, hand-built procedural grid with many primitive-built buildings and vehicle fallbacks. It is not yet the agreed near-photorealistic multi-location world. The next development phase must prioritise a deliberate asset/rendering pipeline and world design rather than adding more decorative primitives.

## 1. Existing foundations to retain

| Area | Evidence in repository | Audit assessment |
|---|---|---|
| Engine/build | PlayCanvas 2.24.x, Vite 7, JavaScript; `npm run check` and `npm run build` scripts | Retain. Suitable current browser-first foundation. |
| Mobile rendering | Canvas auto-resolution and device pixel ratio capped at 1.5 | Useful initial safeguard; requires profiling on real devices. |
| Driving | Player vehicle movement, steering modes, acceleration/braking, gear/speed HUD, damage and repair state | Retain as prototype; physics and vehicle feel need dedicated validation. |
| Cameras | Chase and cockpit camera toggle | Partial match. First-/third-person concept exists; more driving views and user-adjustable distance are not confirmed. |
| Garage | Four selectable vehicle definitions, paint selection, local persistence, repair control; four local GLB vehicle assets are in the repository | Retain; not a full ownership/dealership/customisation economy. |
| Navigation | Compact NOVA CITY minimap, named local landmarks, tap-to-set waypoint | Retain as a prototype. It maps one small city grid, not a multi-city world. |
| World activity | Traffic, pedestrian prototypes, traffic signals/crossings, fuel stations, street sprint | Retain selectively; needs runtime and gameplay testing. |
| Police/story | Police pursuit prototype and a three-step local campaign are referenced in source/roadmap | Retain as prototypes. Not a full campaign or complete police simulation. |
| Audio | Browser audio synthesis for engine/horn and sound toggle | Retain as a placeholder; replace/extend with licensed recorded audio. |
| Online account | Supabase auth UI and service calls for registration, login, reset, profile, cloud save, KX balance and transfer | Code exists. Deployment/configuration and end-to-end service operation are not verified. |
| Multiplayer | Supabase Realtime presence and broadcast snapshots | Casual presence prototype only; not an authoritative multiplayer simulation or secure racing service. |
| Database | SQL migration for profiles, saves, KX wallet, ledger and transactional transfers | Migration exists. Whether it has been applied to a live project is unknown. |

## 2. Approved features not yet implemented or only partially implemented

### Game modes
- The source has free driving and a street sprint/race flow, plus a small campaign prototype.
- A clear mode-selection flow for Story Mode, Free Roam and Online Multiplayer is not present in the reviewed UI.
- Online multiplayer is a presence/snapshot prototype and must remain deferred until a secure server-authoritative design exists.

### Character creation
- No full player character creation/customisation system was found in the reviewed main game flow.
- The current player is primarily represented by a vehicle; streamed pedestrian models are NPCs, not a player avatar creator.
- Gender, face, hairstyle, body, clothing and outfit selection remain future work.

### Camera
- Chase and cockpit camera modes exist.
- Multiple additional driving views and a player-controlled camera-distance setting remain unconfirmed/not implemented.

### World
- Current map is one bounded NOVA CITY road grid with a handful of named local districts/landmarks.
- Multiple connected cities, towns, countryside, highways between regions and progressive region unlocks are not implemented.
- Selected enterable buildings/interiors are not established in the reviewed source; the current building work is primarily exterior scenery.

### Economy and progression
- The online KX wallet/transfer database foundation exists in code and SQL.
- A complete playable economy does not yet exist: jobs, criminal income, shops, property purchases, business ownership, vehicle purchasing/selling and spending loops are not established.
- Local XP/level, distance, race-time and campaign-progress values exist as prototype progression data. Reward authority and complete progression balancing remain outstanding.

### Visual quality
- PBR road/concrete maps, lighting cycle, sky/fog and some remote GLB architecture/vehicle/pedestrian loading are present.
- Much of the city and several traffic/player vehicle fallback shapes are still procedurally assembled primitives.
- Remote asset URLs are loaded at runtime; this static audit cannot confirm URL availability, correct scale/orientation, materials, animation playback, performance or visual quality in the running game.
- No claim of photorealism is justified at this stage.

## 3. Structural and quality risks

1. **Large main module:** `src/main.js` is approximately 2,871 lines and contains rendering, city construction, traffic, vehicles, UI, audio, missions and runtime updates. This increases change risk. Refactor gradually, only with tests and small commits.
2. **Remote asset dependency:** Some GLBs are fetched from external URLs at runtime. Network failure, CORS, changed URLs and download latency can leave fallback geometry visible. Verify each asset and its licence; pin or vendor only where repository workflows permit.
3. **Runtime verification gap:** GitHub Actions has passed recent repository build workflows, but build success does not prove that the game starts correctly, assets load, controls work, or Android performance is acceptable.
4. **Backend deployment gap:** The repository includes a Supabase migration and client module. No live backend credentials or deployment evidence were inspected. Never assume accounts, cloud saves or KX transfers work in production until tested.
5. **Security boundary:** Client-side progress values and Realtime vehicle snapshots are untrusted. Do not grant valuable rewards or ranked outcomes from client-only claims. The SQL KX transfer RPC is a useful foundation but does not provide the complete game economy.
6. **Asset licence verification:** Keep a licence/attribution record for every imported asset. A free download alone does not establish permission for commercial use.
7. **Scope/performance:** A connected multi-city world, near-photorealistic assets, character customisation and online play are ambitious for a zero-cost Android-led workflow. Build and profile a small high-quality vertical slice before expanding map size.

## 4. Recommended keep / rebuild / add decisions

### KEEP and improve
- PlayCanvas + Vite project foundation.
- Existing input/vehicle control loop, garage selection and camera toggle.
- Useful traffic, pedestrian, minimap, waypoint, fuel, police and mission prototypes.
- Existing local vehicle GLBs and PBR surface maps, subject to in-game quality/licence verification.
- Supabase account and KX database work as a future online foundation, after deployment and security testing.

### REBUILD or replace progressively
- Primitive city block/building presentation.
- Primitive player/NPC vehicle fallbacks as final visuals.
- Temporary mannequin pedestrians as final character visuals.
- Placeholder audio as final sound design.
- The compact single-city map presentation, once Phase 2's world layout is approved.

Do not delete working prototype systems simply because their visuals are temporary. Keep a safe playable test scene while replacing visible assets.

### ADD after design approval
- A mode-selection and new-game flow.
- Full player character creator and avatar controller.
- Camera options/settings.
- World/region data model, streaming boundaries and unlock progression.
- Complete in-game currency earn/spend loop and server-validated rewards.
- Property, shop and business systems.
- Enterable interiors for selected locations.
- Dedicated authoritative multiplayer architecture, moderation and anti-abuse systems.

## 5. Recommended implementation order

1. Complete the Phase 1 technical baseline and preserve a known-good build.
2. In Phase 2, design the full world map and region/district structure before creating more city geometry.
3. Build one representative high-quality district as a vertical slice: roads, buildings, vegetation, street furniture, traffic, lighting and a short drivable route.
4. Verify every environment and vehicle asset in-game, including scale, orientation, texture quality, licence, load time and Android performance.
5. Replace the player car with a properly rigged detailed vehicle and validate handling/camera.
6. Add a player avatar and character-creation foundation.
7. Implement the mode-selection flow and connect existing gameplay prototypes to it.
8. Expand the world and economy only after the vertical slice is stable.

## 6. Verification record

- Repository files reviewed: `package.json`, `index.html`, `src/main.js`, `src/style.css`, `src/backend.js`, `src/multiplayer.js`, and the Supabase migration.
- GitHub Actions runs for the Phase 1 foundation document and README update completed with **success**.
- The prior special-traffic fallback build also completed with **success**.
- This confirms the repository workflow/build checks for those commits only. It is not a live game, backend or Android acceptance test.
