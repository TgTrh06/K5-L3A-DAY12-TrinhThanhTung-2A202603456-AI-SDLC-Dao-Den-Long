# Phase 1 — Verify → Evaluate, current status

This is the current acceptance matrix. Original prototype/art reports are historical
observations, retained without editing their recorded results. No hidden grader test
has been run. No tag, commit, push or release is performed by this verification step.

## Reproduce automated verification

```sh
node scripts/verify-phase1.js
```

Outputs include actual [tests](tests.txt), [build](build.txt), [run summary](run-summary.json),
[source hashes](source-hashes.json), input replay and headless JSONL. The script
throws/exits nonzero on test, build, determinism or event comparison failure.
`source-hashes.json` identifies source bytes, not a fabricated future tag.
Final automated run: 83 tests, 83 pass, 0 fail. Markdown link scan found no broken
local links; a filename/token-pattern scan found no secret candidates (not a
comprehensive security audit). Production assets contain neither the QA banner nor
its replay control IDs.

## Requirements to evidence

| Requirement | Evidence | Result / limit |
|---|---|---|
| Fixed 60Hz, tick 0, N steps, clock and event k+1 | tests/contract.test.js; tests.txt | Pass; clock regression fixed |
| Valid JSONL, final end, rounding and intervals | tests/contract.test.js | Pass for covered cases |
| Partial input frames, button edges and bad data exit 2 | tests/contract.test.js | Pass for covered cases; not exhaustive unknown hidden inputs |
| Movement/yaw/normalization and A/D screen direction | tests/core.test.js, tests/input.test.js | Pass at tested yaws and diagonal; manual usability only partial |
| Mote pickup, capacity, interaction/deposit and lantern costs | core/contract tests; full-playthrough.jsonl | Pass, includes inside/on/outside radii |
| Shade chase, hit/drop/invulnerability, pulse cost/stun/push/cooldown | core/contract tests | Pass for covered scenarios |
| Safe lantern area and 300-second night | tests/playthrough.test.js safe-zone soak | Pass over 18,000 ticks, 60 shades, dawn; simulation only |
| Win all five from default game, no initial inventory or prelit lamps | full-playthrough-inputs.json, full-playthrough-summary.json, full-playthrough.jsonl | Seed12 wins at tick 2414; controller sends only input |
| Same full-play input through headless, twice | headless-a.jsonl, headless-b.jsonl, run-summary.json | Byte-identical; controller events/end equal CLI |
| 3D HUD and winning state with same legal inputs | browser-win-replay-final.jpg; browser-replay-*.json | Observed in development browser replay, not a human playthrough |
| Manual controls, pause, loss and restart | historical watercolor evidence; browser-manual-controls.json | Partial manual checks; full keyboard-only victory remains pending |
| Clean macOS/Linux run | WSL status below | Blocked, not passed |
| Performance and stability | browser-replay-1.json, browser-replay-2.json, production-frame-observation.json | Measured development + short production sample; not accepted as stable performance |

## Actual full-play result

Default game seed 12; player starts empty; all five lamps initially unlit. The driver
observes simulation state to choose a target and sends legal movement/interact input.
It never directly changes player, lanterns, items, health or time. Result: 57 pickups,
50 deposited, 3 shade hits, 2 flames remaining, all five lamps lit, 1429 points at
tick 2414 (~40.23 simulation seconds). This proves a feasible seeded route, not a
human player skill/balance assessment.

Browser development QA loads that input file via visible controls and uses the same
60Hz simulation/render loop. Lamps light at ticks 308, 690, 1209, 1803 and 2414.
Repeat runs agree on the result; restart after winning was observed resetting HUD.
The panel remains explicitly labeled QA and is removed from production by Vite's
DEV guard. A real keyboard/mouse victory still needs separate evidence.
The final source's [browser replay report](browser-replay-final.json) again matches
tick 2414 / score 1429. [Final win screenshot](browser-win-replay-final.jpg) shows
the actual replay result. Its frame timings include minimized-window throttling.

## Findings and fixes

1. Clock drift: [actual red regression](clock-before-fix.txt) shows 8.99999999999995
   where 9 seconds is required. `core.js` now derives time from ticks. The test still
   asserts exact 9 seconds and independent victory scoring.
2. Fast directional taps could disappear before a frame sampled held keys. The
   input adapter now consumes latched taps on the next simulation step; regression
   tests also use actual Three.js camera projection for A/D at 0/90/180 degrees.
3. Restart resource ownership: eye geometry/material now shared; unique haze/glow
   materials are disposed when entities are removed. Two replay endpoints after
   this fix reported the same 136 geometries and 25 textures. This bounded check
   does not prove leak-free indefinite play. Heap values fluctuate with GC.
4. QA telemetry initially kept recording after the terminal screen and kept prior
   run event counts on manual restart. It now freezes terminal samples and resets
   counters on restart. The earlier file is retained as before-fix QA evidence.

## Performance interpretation

Host: Windows x64, Node v22.12.0, Intel Core i7-10750H (6 cores / 12 threads),
16,930,025,472 bytes RAM. Available adapters: Intel UHD Graphics (31.0.101.2145),
NVIDIA GTX 1650 Max-Q (32.0.15.9579). Active WebGL adapter was not established.
Chrome 157, development server, 1864x943 CSS pixels, pixel ratio 1 in recorded runs.

First post-cleanup replay: average frame interval ~29.83ms, p95 ~49.9ms; CPU render
submission ~5.20ms average. Second: ~67.10ms average, p95 50ms, with stalls up to
~2.01 seconds; CPU submission ~7.91ms average. These include browser scheduling/
automation and development overhead. They are not reliable production FPS or human
input latency. No 60fps claim. A foreground production benchmark and longer browser
soak remain pending. See raw reports rather than interpreting CPU submission as GPU time.

Later inspection of the selected native Chrome game window confirmed it was
minimized (`window is minimized` from window observation). Later samples clustered
near 1 second per frame, so those cannot be used for a normal foreground FPS claim.
User handoff was requested to restore that window. Do not attribute these samples
to an established game/GPU bottleneck without a controlled foreground rerun.

The user's opened tab was subsequently located in the in-app browser rather than
the separate Chrome window. A production-only observation module, enabled only by
`?metrics=1`, measured a short sample there: [raw JSON](production-frame-observation.json)
and [screenshot](production-observation.jpg). It performs no replay and has no access
to simulation state. After a 1-second warm-up it accumulates 5 seconds only when
`document.visibilityState` is visible and `document.hasFocus()` is true.

Actual sample: 5 frames / 5029.9ms, mean 1005.98ms (~0.994 FPS), p95 1009.9ms,
visible=true, focused=true, 712x846, DPR1. This does not meet a smooth-play quality
expectation. The near-1Hz cadence is consistent with scheduling throttling, but
the measured visibility/focus flags do not establish its cause. Do not claim
production performance passed. A controlled external-browser rerun and investigation
are still needed; no browser/OS/GPU settings were changed to hide the result.

## Linux environment blocker

Ubuntu WSL2 is installed. `wsl -d Ubuntu --exec sh -lc ...` and a retry with
`wsl -d Ubuntu --exec /bin/true` both exit 1 with:

```text
Catastrophic failure
Error code: Wsl/Service/E_UNEXPECTED
```

`wsl --status` reports default Ubuntu/WSL2; WslService is running. No Node/npm
execution inside Linux was reached. No OS setting/service restart, distro repair,
system installation or network change was attempted. Linux clean install/build/run
requires a working distro or another authorized Linux host.

## Release gate

Automated covered behavior passes. Keep Phase 1 untagged until the agreed remaining
verification is resolved or explicitly accepted with disclosed limitations:

- Real keyboard/mouse full victory and broader focus/camera usability checks.
- Clean Linux/macOS execution.
- Investigate production near-1Hz sample and perform a longer controlled stability run.
- Final review of submission requirements, license, evidence-to-final-source match.

No timestamps, output or phase completion status have been backdated or fabricated.
