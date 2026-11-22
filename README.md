# KENNIX: INFINITE CITY

An original browser-first 3D open-world driving and action game prototype built with PlayCanvas Engine and Vite.

## New gameplay batch

- Expanded NOVA CITY grid with multiple connected road corridors and procedural district blocks.
- Four different procedural vehicle silhouettes and tuning profiles (sport, muscle, SUV and hypercar), with selectable paint and locally saved garage choices.
- Police interceptor prototype with a wanted level and direct pursuit behaviour.
- Three-step story campaign prototype with destination markers, mission objectives and local campaign progress.
- Existing touch/keyboard driving, chase/cockpit-style camera, traffic, pedestrians, lighting, collision response, sprint and driving-distance objective.

## Honest production status

The vehicles are procedural low-poly models assembled from engine primitives. They are distinct silhouettes, but are not final artist-authored production meshes with detailed UV textures, interiors, rigging or damage deformation. The city is a larger procedural grid, not a fully hand-authored, streamed open world. Police pursuit and story missions are early offline prototypes, not a complete campaign or sophisticated police simulation.

The project does **not** yet have secure online player accounts, an authoritative KX wallet/ledger, cloud saves or real-time multiplayer. Those require a deployed backend, credentials, server-side validation, security rules, moderation and device/network testing. A local browser balance would not be secure, so no fake "secure KX" wallet is presented.

## Build

```sh
npm install
npm run build
```

The GitHub Actions workflow checks JavaScript syntax and runs the Vite production build.
