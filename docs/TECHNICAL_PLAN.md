# Technical Plan

## Engine and client
The browser client uses PlayCanvas Engine with Vite. The current offline prototype includes a procedural multi-road city grid, four distinct primitive-built vehicle silhouettes, driving controls, NPC traffic and pedestrians, a simple police pursuit loop, and a three-step local story campaign.

## Current limitations
The vehicle meshes are procedural primitive assemblies, not final production assets. City generation is static and compact, without streaming, interiors or robust path navigation. Police and campaign logic are early prototypes and require runtime validation.

## Online architecture required before launch
Online features must be server-authoritative:
- Authentication provider verifies user identity; client tokens are validated server-side.
- Player profile and cloud-save service stores progression and inventory.
- KX is a ledger, not a client-side editable number. Every reward, purchase and transfer is an authenticated server transaction with idempotency keys, balance checks, rate limits and immutable audit history.
- Multiplayer uses an authoritative room/server simulation for player state, race results and rewards. Clients submit inputs, not trusted positions, times or currency outcomes.
- Moderation includes report/block tools, chat controls, abuse detection and account recovery.

Do not enable real KX transfers or player-to-player theft until fraud controls, account recovery, rate limits and moderation have been reviewed. Do not claim secure accounts or multiplayer until the backend is deployed and tested.

## Deployment and testing
GitHub Actions performs JavaScript syntax validation and a Vite production build. This does not verify browser rendering, game logic, Android performance, network behaviour or security. Test on actual target devices before launch.
