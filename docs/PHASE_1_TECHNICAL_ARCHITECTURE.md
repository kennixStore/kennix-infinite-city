# KENNIX: INFINITE CITY — Phase 1 Technical Architecture

**Status:** Technical plan prepared; implementation migration not started
**Date:** 26 November 2026
**Branch:** `main`

## Purpose

Define a safe architecture for growing the existing PlayCanvas/Vite prototype without a disruptive rewrite. This is a migration plan, not a claim that the proposed modules already exist.

## Current verified entry points

- `src/main.js`: PlayCanvas startup and integrated game loop; large legacy module, retained as active entry point for now.
- `src/backend.js`: Supabase account, profile, save and KX service functions.
- `src/multiplayer.js`: current realtime room/presence prototype.
- `src/style.css`: game interface styling.
- `package.json`: Vite scripts and PlayCanvas/Supabase dependencies.

Existing scripts:
- `npm run check`: syntax checks for main.js, backend.js and multiplayer.js.
- `npm run build`: Vite production build.

## Target module boundaries

The following is the intended destination. Introduce modules incrementally when a feature is changed; do not create empty files just to imitate this tree.

```text
src/
  main.js                    # thin bootstrap
  core/                      # app lifecycle, config, events, device capabilities
  world/                     # world manager, region registry, streaming, environment
  player/                    # avatar controller, character profile and customizer
  camera/                    # first-/third-person and driving camera manager
  vehicles/                  # vehicle registry, controller, damage, garage service
  gameplay/                  # missions, police, interactions and activities
  economy/                   # wallet, inventory, shops, properties and businesses
  ui/                        # menus, HUD and settings
  audio/                     # audio manager and asset registry
  online/                    # backend, multiplayer and save adapters
```

## Dependency rules

1. Core may be imported by all systems; core must not import feature modules.
2. World owns region and environment lifecycle, not player economy or mission rewards.
3. Player and vehicles expose state/events; gameplay coordinates activities without directly manipulating UI DOM.
4. Economy services own balances, inventory and purchases. UI may request operations but cannot authoritatively award currency.
5. Online code is a service boundary. Browser clients are untrusted; competitive results and valuable rewards require server-side validation.
6. UI renders state and sends user intent; it is not the source of game rules.
7. Every asset must have recorded provenance and a verified licence.

## Safe migration sequence

### Step 0 — baseline
- Run `npm run check` and `npm run build`.
- Record commit SHA and workflow result.
- Keep a rollback point; make one small extraction per commit.

### Step 1 — configuration
Move only stable configuration and constants into small modules. Preserve runtime behavior and rebuild.

### Step 2 — camera and input
Extract camera switching and input mapping behind narrow interfaces. Test touch, mouse/keyboard, both character views and vehicle views.

### Step 3 — vehicle definitions and garage
Separate data/configuration from rendering and physics. Preserve vehicle selection, paint, repair and local persistence.

### Step 4 — world data
Represent districts and regions as data first. Do not implement streaming until Phase 2 map boundaries are approved.

### Step 5 — gameplay systems
Move mission, police and interaction logic one at a time. Preserve existing behavior during each extraction.

### Step 6 — player avatar and economy
Introduce character customisation and gameplay economy only after data contracts are designed. Keep gameplay currency distinct from the KX account/wallet feature.

### Step 7 — online hardening
Audit Supabase deployment, row-level security and save validation. Current Realtime presence is a prototype, not authoritative multiplayer.

## Quality gates

Every code migration must pass `npm run check`, `npm run build`, a browser startup/render smoke test, and a gameplay regression test for the touched system. Android touch/viewport tests are required for changes affecting controls, rendering or layout.

Build success alone does not prove runtime correctness. If browser/device testing is unavailable, mark it **not tested**, not passed.

## Performance and asset rules

- Start with a high-quality small playable area before scaling to multiple regions.
- Set device budgets for texture dimensions, triangles, draw calls, shadows and animated characters.
- Use LODs, culling, instancing and streaming where measurements justify them.
- Cache shared model resources; avoid repeated downloads.
- Prefer local/pinned release assets when redistribution is permitted.
- Maintain an asset register: source, author, licence, attribution, download date and intended use.
- No paid assets, APIs, hosting or subscriptions under the approved zero-cost constraint.

## Phase 1 exit criteria

- [x] Product decisions recorded in `PHASE_1_FOUNDATION.md`.
- [x] Existing implementation audited in `PHASE_1_REPOSITORY_AUDIT.md`.
- [x] Target architecture and safe migration order documented here.
- [ ] Known-good browser runtime baseline captured on an actual supported device.
- [ ] User reviews and accepts the Phase 1 documents as the baseline for Phase 2.

**Current limitation:** This review is static. No claim is made that the game has been visually verified on a browser or Android device during this work.