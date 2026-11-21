# Phase 1 retro

Shared deterministic core keeps browser and headless rules aligned. Small scenario
tests target observables rather than renderer internals. AI requires explicit review
of boundary conditions and terminal-state precedence. Keep fixed-step and contract
rules in AGENTS.md. Estimate tokens, clearly label estimates and avoid claiming cost.

Known limitations: geometry-only art, keyboard/mouse controls, no touch support,
no audio. Cross-platform host execution and real-player balance remain to verify.
Do not mark later phases complete until their released tickets are implemented.

## Verify → Evaluate follow-up

- Stronger contract tests found accumulated clock drift: 10 seconds minus 60
  increments became 8.99999999999995, losing a victory bonus point. Preserve the
  red log and compute time directly from initial duration minus integer ticks/60.
- Quick movement taps could be lost between renders. The keyboard adapter now
  latches direction taps until a simulation tick, with camera projection tests.
- Resource review found per-shade eye meshes/materials allocated without an
  explicit cleanup path. Share eye geometry/material and dispose unique removed
  entity materials. Repeated browser replay is a bounded resource check, not a
  claim about indefinite stability.
- A state-observing controller wins the unmodified seed12 game by legal inputs;
  CLI and browser replay agree on events/result. This does not establish human
  usability or replace an all-keyboard victory playthrough.
- Browser QA frame samples include large scheduling stalls. Separate CPU render
  submission time from frame intervals and human input latency. Do not claim 60fps.
- A separate production observer records visible/focused-only frame samples. Its
  short in-app sample still measured ~1Hz. Preserve this adverse result and investigate
  browser scheduling versus application cost before accepting performance.
- Ubuntu WSL reports Service/E_UNEXPECTED even for /bin/true. Linux validation is
  blocked by environment, not silently marked passed. No OS configuration changed.
- Harness rules now require tick-derived time, distinct evidence categories and
  resource cleanup. See the current evidence matrix for outstanding release gates.

## Phase 2 — Build and focused evaluation

- Replaced the Phase 1 tuning in the active branch with Ticket-02 standards and
  Contract 1.1. The published `phase-1` tag and its evidence remain unchanged.
- Designed deterministic tests before finishing implementation. The first test
  run caught action-edge checks reading the merged input instead of the previous
  tick, pulse recoil being hidden by stun state, and fall recovery decrementing a
  timer twice. Keeping these checks strict exposed behavior that visual review
  alone would miss.
- Added CLI fixtures for dash, pulse, fall/respawn, shade schedule, jump pad,
  drifter, charm, wind warning/start, and pause/resume. Three full-duration
  stationary headless runs ended in loss when dawn arrived; this proves CLI
  duration and termination, not that the campaign is balanced or winnable by a person.
- The spec applies Ticket-02's global 20 initial motes to all nights, taking the
  first 20 legal points in deterministic order; Night 1's 24 points remain valid
  respawn locations. It also records the overlapping Night 1 shade schedule.
- A visible production browser session rendered Night 1 HUD, lanterns and shade
  forms. It measured 78.97 mean FPS over 60 seconds at 1280×720 after a 10-second
  warm-up; p95 was 20.30 ms and one frame reached 240 ms. The mean passes the
  contract threshold, while that maximum is a reminder to keep an eye on stalls.
- Settings values 0.70 volume and 0.85 sensitivity survived a browser page reload.
  The captures were not persisted as files. Shade movement was visually seen
  across captures, but not isolated from camera motion. Audible playback remains
  unverified.
- Still to verify manually: a person winning all three nights in sequence and
  listening to the sound cues. Phase 2 Ubuntu CI also remains unrun because its
  workflow has not been pushed. See `docs/evidence/phase-2-final/browser-report.md`.
- The follow-up found that Night 3's ramp surface could be missed by grounded
  movement. The slope step is now permitted while platform edges remain blocked;
  a six-tick uphill regression test covers the fix. Firefly respawn now samples
  only from free legal points, so a free point cannot be skipped by random retries.
- Local Phase 2 verifier initially passed 37 tests, build, fourteen feature fixtures, and full
  duration headless nights to dawn. Those runs validate simulation duration, not
  human campaign balance. Ubuntu CI is prepared but has not been pushed or run.
- Pre-commit review found the pulse-dismissed drifter's 120-tick timer was being
  bypassed by immediate array filtering, Night 2 pads ignored their diagonal
  destination vector, and the starting mote count had been interpreted as every
  legal point on Nights 2/3. Regression cases now pin the delay, both pad vectors,
  and 20 starting motes on every night.
- A review of the reported stationary enemies found that shade `wander` did not
  move at all. It now follows seeded legal shade points at the standard speed;
  headless cases check shade schedules/movement, drifter spawn/cap and all three
  drifter speeds. Renderer position/visibility synchronization has a focused
  adapter test. The browser visual check is still needed to confirm on-screen
  visibility in a real running build.
- For acceptance, eight adapted public Phase 1 regression cases were added and
  run on the current Phase 2 runtime; all 47 tests now pass. The hidden Coach suite
  is unavailable, and the historical Phase 1 CI still targets the Phase 1 commit.
- Replaying the earlier nearest-only legal-input controller showed why it lost:
  it never used pulse or dash and took three shade hits by tick 3083 with 1/5
  lanterns lit. A second legal-input controller used evasive steering, pulse and
  dash; on the same seed it won Night 1 at tick 14544 with 1 flame remaining.
  Another defensive experiment reached 3/5 before losing. These are simulation
  diagnostics, not browser/human campaign evidence; Night 2/3 normal-enemy
  completion and a full human campaign win remain open.
- The Phase 2 verifier now regenerates the campaign trace and a deterministic
  Night 1 controller regression. It explicitly describes full-duration stationary
  runs as losses caused by dawn, rather than implying a win.
- The earlier hidden-window 2.57 FPS sample at 1864×999 was invalid for the
  contract. A valid production sample is now recorded at 1280×720: 78.97 mean
  FPS, 20.30 ms p95, 240 ms maximum. The observer required a 10-second warm-up
  and counted 60 seconds of visible/focused frames.
- The browser now shows shades in the production scene and settings survived a
  reload. These checks do not replace a human campaign win or listening to sound.
  The Phase 2 Ubuntu workflow remains prepared but unpushed/unrun.

## Phase 3 — Change request evaluation

- Ticket-03 replaces both victory and lantern state, so the core now owns fuel,
  ever-lit history, relight count and shade drain targets in integer 1/60 units.
  Rendering only reads these values; low-fuel blinking derives from `sim_tick`.
- Test-first work caught stale Phase 1/2 assertions for the 300-second safe-zone
  soak, old score and immediate all-lit victory. They now assert finite fuel and
  dawn rules; movement, maps, combat, pause, deterministic CLI and Phase 2 feature
  tests continue to run.
- A full lantern set no longer ends the night. Dawn scoring uses active fuel and
  remaining flames; `no_flames` takes terminal priority. ADR-0003 records tick
  ordering, scenario defaults and full-lamp selection.
- Local unit/headless verification passes on Windows. A limited production-preview
  browser smoke check verified menu, Night 1 HUD and color-palette persistence;
  fuel-bar/low-fuel visuals and a complete manual campaign remain open. Ubuntu
  Actions passed for both the Phase 2 tag commit and Phase 3 commit; the run warning
  about action Node.js 20 deprecation is non-blocking and documented in the evidence.

## Phase 4 — Release engineering and accessibility

The work split cleanly around boundaries: the shared core stayed deterministic;
benchmark and soak tooling were opt-in; a loopback Node runtime owns the local
leaderboard file; UI preferences remain in browser storage. This let the export
CLI and browser use the same score data without a cloud account or new package.
The most useful harness additions were fixed seed scenarios, derived benchmark
formulas, process RSS sampling, the local API's temp-directory override, and the
Phase 1–3 regression suite. No new runtime dependency was needed.

One early soak assertion assumed that a direction selected every 30 ticks must
change from the previous direction. That is not in the contract; a seeded stream
can legitimately select the same direction twice. The failing assertion exposed
my test assumption, which I changed to check determinism and 30-tick hold windows.
Another release design issue was discovered before implementation: browser
`localStorage` alone cannot satisfy a CLI export of the same leaderboard, so ADR
0004 records the loopback file-backed runtime. These decisions came from the
contract and integration boundary, not an AI completion claim.

Soak inputs, benchmark scene, score ranking/API, key conflicts, compatibility,
and static serving have focused automated checks. Results are recorded under
`docs/evidence/phase-4-final/`; they are host evidence, not the instructor's final
FPS result. The manual browser review, clean Ubuntu run, and truthful short
gameplay recording remain separate evidence gates until recorded. No hidden-test
pass is inferred from public regression.

The rough combined estimate across the earlier entries plus this phase is
**115k–220k tokens**. This is a broad reconstruction from per-phase estimates,
not telemetry or a billing statement; exact cost is unavailable under the app
subscription. Context was saved by reusing the phase contracts, writing small
focused assertions before integration, retaining one core and avoiding new
dependencies. If starting again, I would define the local release runtime and
browser evidence flow during Phase 1, rather than first confronting the CLI and
browser persistence mismatch at release time.
