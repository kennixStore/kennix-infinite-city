# KENNIX: INFINITE CITY — Phase 2 World and Experience Design

**Status:** Direction approved; exact map geometry and feature scope remain to be validated  
**Updated:** 26 November 2026

This document turns the player's approved decisions into a practical production plan. It describes the target, not features that are already implemented.

## 1. World identity

The setting is **Nova City**, an original fictional international metropolis. Its architecture blends global influences without reproducing a specific real city. The game should feel like a believable place, not a direct copy of GTA or another title.

The eventual world connects the main metropolis to coastal locations, industrial areas, smaller towns, countryside and highways. Districts should be contiguous wherever practical, with no loading screen between neighbouring areas when performance permits.

## 2. District plan

The first seven named districts are a planning structure, not a final map:

1. **Downtown:** skyscrapers, offices, hotels, financial centre and dense streets.
2. **Luxury District:** mansions, premium apartments, landscaped streets and high-end retail.
3. **Commercial District:** shopping centres, restaurants, markets, entertainment and busy streets.
4. **Residential District:** mixed housing, schools, parks and local businesses.
5. **Industrial District:** factories, warehouses, logistics yards, power and port facilities.
6. **Coastal District:** waterfront roads, beaches, marina, boats and coastal properties.
7. **Countryside:** farms, forests, smaller settlements and winding roads.

District identities must be visually distinct through building silhouettes, street widths, landscaping, signage, lighting and activity.

## 3. Map layout and scale

The proposed first-pass arrangement places Downtown near the centre, with commercial and luxury areas nearby, residential areas between the centre and coast, and industrial/countryside connections toward the outer map. The exact compass layout will be decided with a navigable map sketch before implementation.

A roughly 8 km × 8 km full-world footprint is a **provisional long-term target only**, not a locked requirement. The initial release should be a much smaller, carefully polished playable district. Map scale will be adjusted after Android performance testing.

## 4. Roads and transport

The road network should include local streets, multi-lane avenues, intersections, roundabouts, highways, flyovers, bridges, tunnels, coastal roads and country roads.

Approved long-term transport categories:
- Cars and SUVs.
- Motorcycles.
- Buses and other public transport.
- Boats and yachts.
- Helicopters.
- Aeroplanes.
- Trains and other transport options introduced as the world expands.

Build order: reliable car driving first, then motorcycles and basic public transport; water, air and rail transport are later milestones. Do not add empty vehicle categories merely to claim they exist.

## 5. Player character

Players create one main character at the start. They can later change clothing, hairstyles and accessories through appropriate locations and home customisation. Planned options include male/female character choices, face and body appearance, skin-tone options, hair, shoes and accessories. Actual range depends on verified free character assets and animation licences.

Character actions should include walking, running, entering/exiting vehicles, interacting with objects and context-appropriate animations. Character creation and animation quality must be tested on Android.

## 6. Story and progression

The main character arrives in Nova City as a newcomer with very limited money and connections. The story tone is a serious cinematic crime drama, but the player must retain open-world freedom outside missions.

The player can choose a lawful, criminal or mixed lifestyle. Main missions, side missions, jobs, driving activities, business tasks and optional criminal activities can all contribute to progression. The actual plot, characters and mission sequence require a separate story-design approval before being written into the game.

## 7. Economy and ownership

Players can earn fictional in-game currency through jobs, missions, businesses, investments, property and optional criminal activities. Players are not forced into crime to progress.

Long-term ownership goals:
- Homes and apartments.
- Garages and vehicle collections.
- Businesses such as restaurants, shops, hotels, dealerships and repair shops.
- Clothing and accessories.
- Bank accounts and business finances.

Prices and opportunities should vary by district and quality. This is an in-game economy only; no real-money cash-out or financial promises.

## 8. Combat and health

The initial combat direction is hand-to-hand fighting. Firearms are not part of the initial approved combat scope. Planned actions include punches, kicks, blocking, dodging, stamina and opponent reactions.

Health and recovery goals:
- Health and stamina indicators.
- Food and drinks may restore limited health or stamina.
- Hospitals provide treatment.
- Recovery can happen over time.
- Serious injuries may temporarily affect movement.

These systems are future design goals until implemented and tested.

## 9. Vehicle handling

The approved direction is **hybrid handling**: believable acceleration, braking, weight, grip, suspension and collision response, with controls accessible to mobile players.

Long-term vehicle features include ownership, buying/selling, garages, repairs, refuelling, paint, wheels, brakes, suspension and selected performance/body upgrades.

Priority order:
1. Make the current car reliably accelerate, brake, reverse and steer on Android touch controls.
2. Verify camera follow and collision behaviour.
3. Improve vehicle models, materials, lights, wheels and interior detail.
4. Add customisation and vehicle ownership features after the driving loop is dependable.

## 10. Multiplayer

The long-term target includes both public online sessions and private invite-only sessions, plus shared activities such as driving and racing. Multiplayer is deferred until the single-player world, vehicle simulation and backend security are stable. Realtime presence alone is not an authoritative multiplayer game server.

## 11. Visual production standard

The visual ambition is GTA V-style realism, constrained by a zero-cost asset budget and real Android/browser hardware. This is an aspiration, not a promise of matching a large-budget production.

Visual priorities:
- Detailed, varied architecture rather than repeated box-shaped buildings.
- Believable road surfaces, markings, kerbs, signs, street furniture and lighting.
- High-quality licensed vehicle and character models.
- Physically based materials with restrained, natural lighting.
- Shadows, reflections and atmospheric depth only where hardware allows.
- Weather and day/night variation.
- Distinctive landscaping and a populated, believable street atmosphere.

Use only assets with verified licences permitting the intended use, including commercial use if monetised. Prefer CC0. Record attribution for CC BY assets. Do not use scraped or unclear-licence models.

## 12. Production order

1. **Stabilise the current playable loop:** resolve startup/runtime errors, ensure the car moves on touch controls, confirm camera and HUD.
2. **Visual benchmark:** build one small street block with a consistent realistic material and lighting standard; test on the target Android phone.
3. **First district:** replace the current greybox/placeholder appearance with varied, licensed architecture, detailed streets and selected interiors.
4. **Living world:** improve vehicles, pedestrians, traffic and environmental audio.
5. **Player systems:** character customisation, interaction, health and combat.
6. **Progression:** story, jobs, economy, properties and businesses.
7. **World expansion:** connect additional districts and outlying locations.
8. **Multiplayer:** only after single-player and server authority are ready.

## 13. Quality and budget rules

- Keep the project on PlayCanvas + Vite + JavaScript unless a measured technical reason requires a change.
- No paid assets, subscriptions, hosting or development tools.
- Keep working systems intact; prefer small commits that can be tested independently.
- A successful GitHub build/deployment is not proof that the browser runtime works.
- Test actual gameplay on Android after each meaningful control/rendering change.
- Label planned, prototype and tested features honestly.
