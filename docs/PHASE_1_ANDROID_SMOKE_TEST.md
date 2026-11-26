# Phase 1 — Android Runtime Smoke Test

**Purpose:** Capture a real-device baseline before Phase 1 is signed off. This checklist is intentionally short and must be completed on the target Android phone; a GitHub Actions build is not a substitute.

## Before testing
- Open the currently deployed game URL in Chrome on the Android phone.
- Use a stable connection and allow the first load to finish.
- Record phone model, Android version, Chrome version, test date and game URL.

## Smoke test
1. **Startup:** Does the game load without a blank screen or permanent loading state?
2. **Rendering:** Is the 3D scene visible? Are there missing textures, invisible objects or broken models?
3. **Touch controls:** Can you accelerate, brake, steer and use the on-screen buttons?
4. **Camera:** Can you switch between the available chase and cockpit views?
5. **Driving:** Can you drive, turn, stop and recover from a collision?
6. **HUD/UI:** Are the speed display, minimap and menus readable and positioned correctly?
7. **Stability:** Play for at least five minutes. Does the page freeze, reload, overheat noticeably or crash?

## Record results
For each item, mark PASS, FAIL or NOT TESTED and add a short note. If something fails, capture a screenshot or short screen recording and note the exact step.

| Check | Result | Notes |
|---|---|---|
| Startup | NOT TESTED | |
| Rendering | NOT TESTED | |
| Touch controls | NOT TESTED | |
| Camera switching | NOT TESTED | |
| Driving | NOT TESTED | |
| HUD/UI | NOT TESTED | |
| Five-minute stability | NOT TESTED | |

## Sign-off rule
Phase 1 runtime baseline is complete only when the startup, rendering, touch, camera, driving and stability checks have been performed on a real Android device. Do not mark untested items as passed. Fix any blocking issue and repeat the affected checks.