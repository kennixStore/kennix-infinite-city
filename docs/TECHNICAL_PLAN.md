# Technical Plan

## Engine and client
The current browser client uses PlayCanvas Engine with Vite. Its procedural NOVA CITY grid and primitive-built vehicle silhouettes are greybox prototypes only. The agreed final presentation is near-photorealistic GTA V-style third-person gameplay. The rebuild must replace visible placeholder geometry with licensed realistic environment, vehicle and character assets, physically based materials, cinematic lighting and a performance-aware streaming strategy. Existing driving, traffic, mission and online systems should be retained only where they support that target.

## Online service layer
The repository includes an in-game Supabase account UI, email/password registration and sign-in, password recovery/update, profile display-name update, session persistence, per-player cloud saves, balance reads and authenticated KX transfers. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables. Never put a Supabase service-role key in browser code.

Apply `supabase/migrations/202611220001_online_accounts_and_kx.sql` in the Supabase SQL Editor. It creates player profiles, cloud saves, server-owned wallets, an append-only transaction history, a one-time welcome balance and a transaction-safe transfer RPC. Row-level security prevents clients from writing wallet balances or ledger entries directly. The transfer function validates the signed-in user, recipient, amount, available balance and idempotency key inside one database transaction.

## Multiplayer
Supabase Realtime is wired to a casual online city-room prototype with presence and remote vehicle snapshots. It can support presence, lobbies and casual room state, but it is not an authoritative simulation server. Ranked real-time racing still requires a dedicated authoritative game server, input validation, race-result verification, matchmaking, rate limits and anti-cheat. Do not award KX based on client-submitted race results.

## Visual rebuild requirements
- Treat the current primitive city and primitive cars as temporary greybox content, not final art.
- Establish the realistic lighting/material/camera pipeline before expanding the map.
- Import only assets with verified commercial-use permissions; prefer CC0 or explicitly compatible licences.
- Use detailed authored vehicle rigs and realistic environment/character assets, then profile them on Android.
- Do not describe the game as photorealistic until the assets are integrated and verified in actual gameplay.

## Production requirements
- Deploy and test the Supabase migration and configure environment variables.
- Add account UI, email verification, password recovery and account deletion flow.
- Add cloud-save conflict handling and schema versioning.
- Add server-side reward functions and abuse limits before granting KX.
- Add authoritative multiplayer server and matchmaking.
- Replace primitive vehicle assemblies with licensed/authored models, UV textures, interiors, rigs and damage states.
- Expand city streaming, road navigation, police AI, campaign dialogue and authored missions.
- Test browser runtime, Android performance, network failure and security before public launch.
