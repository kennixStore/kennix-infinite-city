# KENNIX: INFINITE CITY

An original browser-first open-world driving and action game prototype built with PlayCanvas Engine and Vite. The agreed target is GTA V-style third-person gameplay with near-photorealistic visuals. The current city and vehicle geometry are temporary greybox placeholders and are being replaced; the game is not photorealistic yet.

## Offline gameplay included in code
- Procedural NOVA CITY road grid and district blocks.
- Four procedural vehicle silhouettes and tuning profiles.
- Paint selection and local garage persistence.
- Traffic with planned grid-junction turning with direction-aware vehicle facing, predictive following and cross-traffic conflict checks, pedestrians with signal-aware marked crossings and traffic yielding, driving controls, camera modes, collision response, repairs and prototype petrol stations with fuel consumption/refuelling.
- Police pursuit prototype and three-step local story campaign.
- Street sprint and distance objective.

## Online backend foundation added
- Supabase email/password registration, sign-in, password recovery and profile updates.
- In-game account interface, KX balance/transfer controls and per-player cloud save/load.
- Campaign XP, levels, driving distance and best sprint time can be saved to a player cloud record.
- Server-owned KX wallets and transaction ledger schema.
- Database-side welcome balance and authenticated, row-locked KX transfer RPC.
- Row-level security prevents direct client writes to wallet balances and transactions.

## Required setup
1. Apply `supabase/migrations/202611220001_online_accounts_and_kx.sql` in the Supabase SQL Editor.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables.
3. Complete the account screens, email verification and recovery UI.
4. Add server-validated mission rewards before granting KX.
5. Deploy an authoritative multiplayer server before ranked or prize-bearing races.

Never expose a Supabase service-role key in the browser. The KX transfer RPC is not a cash-out feature.

## Honest production status
The account and KX database foundation is code-complete but not deployed or security-tested. The client service module is present but not yet connected to in-game account screens. Realtime presence alone is not a secure multiplayer simulation. The player-vehicle importer supports optional GLB vehicle models. Four CC0 vehicle models are currently included in `public/models/vehicles/`: `sport-coupe.glb`, `sedan.glb`, `suv.glb`, and `mid-engine-sports.glb`. Imported materials retain their authored textures and surface properties; garage tint is applied only to materials whose names identify them as exterior paint. Imported render components are configured to cast and receive shadows. Road and concrete PBR colour/normal maps are included in `public/textures/pbr/` and applied to the corresponding surfaces. City facade materials also receive subtle normal detail. These upgrades improve surface response but do not yet make the city photorealistic: the city remains a hand-built prototype rather than a streamed detailed world. Police/story systems are prototypes. Browser runtime and Android testing remain outstanding.

## Build
`npm install` then `npm run check` and `npm run build`.
