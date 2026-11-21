# KENNIX: INFINITE CITY

**Working slogan:** One City. Endless Possibilities. *(Proposed; not final.)*

An original browser-first 3D open-world action, driving and adventure game.

This repository is the source of truth for the game's design notes, technical decisions, custom code and release history. It is separate from the KENNIX Store website.

## Current status

**Foundation + first driving prototype in progress.** The current code is an early technical test using placeholder geometry. It is not the full open-world game and does not yet include a finished vehicle physics system, city, campaign, police, online services or KX economy.

## Current prototype

- PlayCanvas Engine with Vite.
- A small 3D road and placeholder buildings.
- A basic arcade-style placeholder car.
- Follow camera.
- Keyboard and on-screen touch controls.
- Speed readout.

The current steering and movement are deliberately simple and are not realistic vehicle physics.

## Run locally

Requires Node.js on a computer:
```sh
npm install
npm run dev
```
Then open the local Vite address shown in the terminal.

## Repository map

- `docs/GAME_DESIGN.md` — agreed direction and proposals still awaiting approval.
- `docs/TECHNICAL_PLAN.md` — architecture and technical approach.
- `docs/ROADMAP.md` — staged development plan.
- `docs/DECISIONS.md` — decision log.
- `src/main.js` — current prototype scene and controls.
- `src/style.css` — responsive browser interface.
- `index.html` — app entry point.

## Technology

- [PlayCanvas Engine](https://developer.playcanvas.com/)
- [PlayCanvas Editor](https://playcanvas.com/)
- [Vite](https://vite.dev/)

## Important scope rule

The complete vision is a major production. We will build and test one milestone at a time. Do not describe planned features as available until implemented and tested.

The creator is currently working from an Android phone without a laptop. The workflow should remain phone-friendly where possible, while being honest that larger 3D production tasks may eventually need a computer or collaborators.
