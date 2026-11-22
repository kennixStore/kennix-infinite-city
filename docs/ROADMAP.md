# Development Roadmap

## Implemented in source; runtime verification pending
- [x] PlayCanvas/Vite browser foundation and responsive controls.
- [x] Procedural multi-road NOVA CITY grid.
- [x] Four primitive-built vehicle silhouettes and tuning presets.
- [x] Paint selection, local garage persistence and camera modes.
- [x] Traffic, pedestrian, collision, repair and sprint prototypes.
- [x] Probabilistic NPC turns between north-south avenues and east-west cross streets (prototype; runtime tuning pending).
- [x] Police interceptor pursuit with steering, chase acceleration, capture and escape timers.
- [x] Three-step story campaign with mission failure and retry flow.
- [x] Waterfront, Market Quarter and Industrial Edge district landmarks.
- [x] Supabase account service module (email/password, session, password recovery and profile update).
- [x] Per-player cloud-save service module.
- [x] Database migration for player profiles and KX wallet/ledger.
- [x] In-game account UI for registration, sign-in, password reset/update and display-name changes.
- [x] In-game cloud save/load and KX balance/transfer controls.
- [x] Casual online room presence and remote vehicle snapshot prototype.
- [x] Authenticated transactional KX transfer RPC with row locks and idempotency.
- [x] GitHub Actions syntax and production-build checks restored.

- [x] Two visible NOVA FUEL stations with local fuel gauge, fuel consumption and proximity refuelling (prototype; KX payment integration pending).

- [x] NPC traffic receives a planned next junction, lane-consistent facing, and deterministic turn timing instead of frame-by-frame random turns (prototype; signal and collision tuning still needs Android runtime testing).

## Still required
- [ ] Apply migration in Supabase and configure build environment variables.
- [ ] Deploy Supabase schema, configure credentials, and test account, profile, wallet and cloud-save UI end-to-end.
- [ ] Add verified server-side mission reward functions and anti-abuse limits.
- [ ] Add email verification, password reset and account deletion flows.
- [ ] Build authoritative multiplayer server, matchmaking and race validation.
- [ ] Replace primitive vehicles with licensed/authored detailed 3D models and interiors.
- [ ] Add visible damage states, proper vehicle physics and audio.
- [ ] Expand city streaming, authored landmarks and road navigation.
- [ ] Build full story campaign, character scenes and robust police AI.
- [ ] Run browser, Android, network, load and security tests.

A checked item means source code or schema was added. It does not mean the service is deployed, verified or production-ready.
