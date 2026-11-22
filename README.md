# KENNIX: INFINITE CITY

An original browser-first 3D open-world driving and action game prototype built with PlayCanvas Engine and Vite.

## Offline gameplay included in code
- Procedural NOVA CITY road grid and district blocks.
- Four procedural vehicle silhouettes and tuning profiles.
- Paint selection and local garage persistence.
- Traffic, pedestrians, driving controls, camera modes, collision response and repairs.
- Police pursuit prototype and three-step local story campaign.
- Street sprint and distance objective.

## Online backend foundation added
- Supabase email/password account service module.
- Per-player cloud-save data service.
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
The account and KX database foundation is code-complete but not deployed or security-tested. The client service module is present but not yet connected to in-game account screens. Realtime presence alone is not a secure multiplayer simulation. Vehicles remain procedural low-poly meshes, the city is not yet streamed, and police/story systems are prototypes. Browser runtime and Android testing remain outstanding.

## Build
`npm install` then `npm run check` and `npm run build`.
