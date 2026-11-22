# Development Roadmap

## First playable release candidate — implemented in code, awaiting verification
- [x] PlayCanvas/Vite browser foundation.
- [x] Procedural first-district roads, buildings, street furniture and skyline.
- [x] Player vehicle with touch and keyboard driving controls.
- [x] Chase and close cockpit-style camera views.
- [x] Headlight and brake-light effects.
- [x] Four selectable vehicle tuning profiles and paint colours.
- [x] Garage and local browser persistence for vehicle/paint selection.
- [x] Prototype traffic with simple following and signal stopping.
- [x] Sidewalk pedestrians with basic walk cycles.
- [x] Basic collision response and damage/repair loop.
- [x] 500 m local driving objective.
- [x] Three-checkpoint street sprint and local best-time record.
- [x] GitHub Actions production-build workflow.

## Required before public playable launch
- [ ] Confirm latest GitHub Actions build succeeds.
- [ ] Deploy to a public HTTPS URL.
- [ ] Test loading and play on creator's Android phone.
- [ ] Verify controls, garage, camera, race and local saving in-browser.
- [ ] Fix runtime errors, layout problems and performance issues.
- [ ] Test a desktop browser and a lower-powered mobile browser.

## Production milestones still outstanding

### Vehicles and driving
- [ ] Original authored 3D vehicle models for each class.
- [ ] True cockpit interiors, suspension and tyre simulation.
- [ ] Robust collision physics, damage meshes and engine/audio systems.

### City and world
- [ ] Expand the compact district into a connected streamed city.
- [ ] Add original district art, shops, garages and services.
- [ ] Improve traffic turning, yielding and pedestrian navigation.
- [ ] Police AI, wanted system, weather and day/night cycle.

### Gameplay and progression
- [ ] Approved story and side-mission framework.
- [ ] More race types, missions, rewards and achievements.
- [ ] Player character creation, clothing and properties.
- [ ] Secure KX economy and progression.

### Online services
- [ ] Accounts and cloud saves.
- [ ] Server-authoritative KX ledger and transfers.
- [ ] Multiplayer rooms and races.
- [ ] Anti-cheat, reporting, blocking and moderation.
- [ ] Security, load and operating-cost testing.

### Launch operations
- [ ] Privacy policy and terms.
- [ ] Hosting, monitoring and analytics.
- [ ] Device-tier graphics settings and profiling.
- [ ] Closed testing and staged release.

A checked item means code has been added, not that it has passed runtime testing. Mark features verified only after browser and target-device testing.
