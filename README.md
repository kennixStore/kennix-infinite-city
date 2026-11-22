# KENNIX: INFINITE CITY

An original browser-first 3D driving and open-world game project built with PlayCanvas Engine and Vite.

## Current status — first-release candidate

The codebase includes a procedural first-district city, player driving, touch and keyboard controls, chase and close cockpit-style camera views, headlights and brake lights, prototype traffic, animated sidewalk pedestrians, a garage interface, four vehicle tuning profiles, paint selection, local browser saving, basic collision damage and repair, a 500 m driving objective and a three-checkpoint street sprint.

## Important limitations

This is a **first-release candidate**, not a finished commercial open-world game. The code still needs successful CI, public deployment, browser runtime checks and Android device testing. The four selectable vehicle profiles currently share one temporary procedural 3D chassis; unique authored vehicle models and true cockpit interiors are not yet included. Vehicle handling and collision are lightweight arcade approximations, not professional rigid-body simulation.

Not yet implemented: a large seamless world, multiple finished cities, full campaign/story missions, advanced pedestrian navigation, robust traffic turning, police pursuits, secure KX economy, player accounts, cloud saves, multiplayer, online transfers, anti-cheat, finished audio, dynamic weather, property ownership or monetisation.

Vehicle and paint selection are saved locally in the current browser only. The KX economy and online purchases are not active.

## Development

```sh
npm install
npm run dev
npm run build
```

GitHub Actions runs the production build on pushes and pull requests to `main`.

## Repository map

- `src/main.js` — scene, driving, traffic, pedestrians, garage and sprint.
- `src/style.css` — responsive HUD, garage and touch interface.
- `index.html` — browser entry point.
- `docs/GAME_DESIGN.md` — creative direction.
- `docs/TECHNICAL_PLAN.md` — architecture.
- `docs/ROADMAP.md` — verified and planned work.

This repository is separate from the KENNIX Store project. The creator is currently working from an Android phone; keep instructions phone-friendly.
