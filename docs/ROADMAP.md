# Development Roadmap

## Implemented in source; runtime verification pending
- [x] PlayCanvas/Vite browser foundation and responsive controls.
- [x] Procedural multi-road NOVA CITY grid.
- [x] Four primitive-built vehicle silhouettes and tuning presets.
- [x] Paint selection, local garage persistence and camera modes.
- [x] Traffic, pedestrian, collision, repair and sprint prototypes.
- [x] Police interceptor and basic pursuit prototype.
- [x] Three-step local story campaign.
- [x] Supabase account service module (email/password, session).
- [x] Per-player cloud-save service module.
- [x] Database migration for player profiles and KX wallet/ledger.
- [x] Authenticated transactional KX transfer RPC with row locks and idempotency.
- [x] GitHub Actions syntax and production-build checks restored.

## Still required
- [ ] Apply migration in Supabase and configure build environment variables.
- [ ] Connect account, profile, wallet and cloud-save UI to the game.
- [ ] Add verified server-side mission reward functions and anti-abuse limits.
- [ ] Add email verification, password reset and account deletion flows.
- [ ] Build authoritative multiplayer server, matchmaking and race validation.
- [ ] Replace primitive vehicles with licensed/authored detailed 3D models and interiors.
- [ ] Add visible damage states, proper vehicle physics and audio.
- [ ] Expand city streaming, authored landmarks and road navigation.
- [ ] Build full story campaign, character scenes and robust police AI.
- [ ] Run browser, Android, network, load and security tests.

A checked item means source code or schema was added. It does not mean the service is deployed, verified or production-ready.
