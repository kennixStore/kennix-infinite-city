# KENNIX: INFINITE CITY — Phase 1 Foundation

**Status:** Approved foundation  
**Last updated:** 26 November 2026  
**Purpose:** This document is the canonical record of the decisions approved for Phase 1. It supersedes conflicting older proposals in project notes. New ideas remain proposals until the user approves them.

## 1. Product identity

- **Title:** KENNIX: INFINITE CITY
- **Genre:** Open-world action, adventure, driving and life simulation.
- **Core promise:** A believable, explorable world where players can build a life, earn money, explore, drive, complete missions and choose lawful or criminal paths.
- **Visual target:** Near-photorealistic, real-world-video-footage presentation. This is an ambitious target, not a claim about the current prototype or a guarantee of matching a large-budget game.
- **Setting:** An original fictional international metropolitan world. It must not feel like a Lagos-life simulator or copy a specific real city. Global city influences may inspire distinct districts, but the map, architecture, landmarks and identity must be original.

## 2. Game modes — approved

1. **Story Mode:** A main narrative with missions, characters and progression.
2. **Free Roam:** Explore and use available world activities without being required to follow the main story.
3. **Online Multiplayer:** Play with other people. This is planned after the single-player foundation is stable; it is not an early-release promise.

## 3. Player character — approved

Players create and customise their own character. Planned customisation includes:
- Male or female character options.
- Face and appearance choices.
- Hairstyles.
- Clothing, shoes and accessories.
- Body appearance options.
- Outfit changes during the game.

The depth of customisation will depend on the quality and licensing of available free character assets and animations.

## 4. Camera — approved

- Switchable third-person and first-person views.
- Multiple driving camera angles.
- Adjustable camera distance where practical.
- Camera switching during gameplay.

## 5. World structure — approved

The world is a collection of connected locations, not one isolated city:
- A major central metropolitan city.
- A coastal city or coastal district.
- An industrial town/area.
- Residential towns and neighbourhoods.
- Countryside with natural landscapes.
- Connecting highways, bridges and tunnels.

Locations are progressively unlocked as players advance. The exact names, geography, scale, road network and unlock conditions are not yet final; they belong to Phase 2.

### District variety

The world should contain wealthy districts, middle-class neighbourhoods, poorer/older neighbourhoods, commercial centres, industrial areas, entertainment areas and natural spaces. The architecture and street design should feel internationally varied and believable.

### Building access — approved

Most buildings are exterior scenery. Selected important buildings have enterable interiors, such as player-owned homes, garages, shops, restaurants, banks and mission locations. Not every building needs an interior.

## 6. Economy — approved

Players can:
- Earn money through legitimate jobs and activities.
- Earn money through criminal activities and missions.
- Purchase houses and apartments.
- Purchase, own and customise vehicles.
- Own and operate businesses.
- Buy clothing, shoes and accessories.
- Use banks and manage their in-game wealth.

The economy is fictional game currency. It is not real money, does not promise cash-out and must not be treated as a financial product.

## 7. Gameplay pillars — approved

- Driving and vehicle ownership.
- Missions and side activities.
- Police pursuits and wanted levels.
- Combat and self-defence mechanics.
- Pedestrian and world interactions.
- Shopping, restaurants and entertainment.
- Business and property ownership.
- Exploration, discovery and progression.

Players should have meaningful freedom to roam rather than being forced to follow Story Mode at all times.

## 8. Visual and audio target — approved

Visual goals:
- Detailed, believable architecture and streets.
- High-quality vehicles and, where feasible, detailed interiors.
- Realistic human characters and natural animations.
- Physically based materials, natural lighting and shadows.
- Reflections and atmospheric depth where hardware allows.
- Weather effects and day/night cycle.
- Believable traffic and pedestrian activity.

Audio goals include engines, horns, sirens, footsteps, traffic ambience, weather, collisions and environmental sounds.

**Performance rule:** Visual quality must be balanced against actual Android/browser hardware. We will profile and test on phones; we will not promise GTA V-level fidelity or world scale on a zero-cost, phone-led workflow.

## 9. Technology and budget — approved

- Continue with the existing **PlayCanvas Engine + Vite + JavaScript** browser project.
- Use GitHub for version control and build checks.
- Target browser delivery with Android-friendly touch controls and performance.
- Use free tools and assets only.
- Use assets only when their licence is verified to allow the intended use, including commercial use if the game is monetised. Prefer CC0; comply with attribution and other licence conditions.
- No paid assets, subscriptions, domains, hosting or development tools are part of the approved budget. Any service that cannot meet the zero-cost requirement must be redesigned or deferred.

PlayCanvas Engine is open source under the MIT licence; see the official [PlayCanvas Engine documentation](https://developer.playcanvas.com/user-manual/engine/).

## 10. Technical architecture direction

The existing repository is a PlayCanvas/Vite application. The current prototype contains a large main game module plus separate backend and multiplayer modules. Phase 1 establishes the intended separation of responsibilities; it does not justify a risky wholesale rewrite.

As systems are developed, keep clear boundaries between:
- **Core/runtime:** app startup, device capabilities, lifecycle and configuration.
- **World:** map data, districts, roads, streaming and environment.
- **Player:** character creation, movement, camera and interaction.
- **Vehicles:** vehicle definitions, handling, ownership, garage and damage.
- **Gameplay:** missions, police, combat, jobs and activities.
- **Economy:** balances, inventory, shops, properties and businesses.
- **UI/audio:** menus, HUD, settings, accessibility and sound.
- **Online services:** accounts, cloud saves, multiplayer and server-authoritative rewards.

Do not split or migrate the current large source file until the next change can be tested safely. Keep working features intact and make changes in small, verifiable steps.

## 11. Safety, security and quality guardrails

- Never trust client-side wallet balances, mission rewards or competitive results.
- Do not expose service-role keys or other secrets in browser code.
- Multiplayer competitive rewards require server-side validation.
- Use original game content; do not copy another game's protected maps, characters, logos, artwork, music, code or missions.
- Do not call a feature complete until it is integrated and tested.
- Separate source-code/build success from actual in-browser and Android runtime verification.
- Maintain a clear list of known limitations and deferred features.

## 12. Phase 1 completion checklist

- [x] Game identity and genre agreed.
- [x] Three game modes agreed.
- [x] Custom character creation agreed.
- [x] First-person/third-person and driving camera options agreed.
- [x] Connected cities, towns and countryside agreed.
- [x] Progressive world unlocking agreed.
- [x] Economy and ownership systems agreed.
- [x] Open-world gameplay pillars agreed.
- [x] Near-photorealistic visual target agreed.
- [x] Free-only tools and assets budget agreed.
- [x] Existing engine and technical direction recorded.
- [ ] Foundation document reviewed against the live repository and approved as the baseline for Phase 2.

**Phase 1 boundary:** This phase establishes what the game is and the rules for building it. It does not claim that the future world, character creator, economy, missions or multiplayer systems have already been implemented.
