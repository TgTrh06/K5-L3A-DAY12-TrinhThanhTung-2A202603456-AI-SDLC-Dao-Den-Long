# AI usage

2026-11-20: Codex (model reported by session: GPT-6.1-sol for implementation).
User approved Phase 1 plan. One agent, no delegation. AI drafted shared simulation,
CLI, renderer, tests and documents. Tools: filesystem patch, shell, browser inspection.
Token usage is not exposed as an authoritative per-turn measurement; planning plus
implementation estimate is 15k–30k tokens, not a billing claim. Cost unavailable
under the user's app subscription. No API key or external inference call in game.

Review focus: output tick semantics, edge-trigger persistence, tuning consistency,
runtime UI and evidence honesty. A draft test incorrectly expected no retained final
event after termination; corrected before running to assert the actual loss reason.

Watercolor update: user approved a procedural Three.js/Canvas art direction from
two supplied images. One Codex agent authored textures, scene and HUD. Browser QA
found overly bright ground and a Vietnamese font rendering problem; palette,
exposure and title font were adjusted. Actual pause, pulse, loss/restart and narrow
layout were observed. Screenshots are saved under
docs/evidence/watercolor. Additional usage estimate: 10k–20k tokens, not billing
telemetry; exact charge unavailable. No image-generation or external art API used.

Verify–Evaluate follow-up (2026-11-20): one Codex agent, no delegation. Added
contract, input and complete simulation playthrough tests before final evidence.
Preserved failing clock regression output and fixed the arithmetic rather than
loosening assertions. Development QA replays legal inputs, exposes measurements
and labels itself explicitly. Browser victory/restart observations are distinct
from manual-play claims. WSL failures are reported as blocked Linux validation.
Exact token/cost telemetry is unavailable; this follow-up is estimated at 15k–30k
tokens, not a billing measurement. Focused cases, one seeded fixture and reusing
the shared core reduced repeated context and implementation. Main mistakes caught:
clock accumulation, lost quick movement taps, stale QA counters after restart,
and missing disposal of entity-specific visual resources.

Phase 2 (2026-11-20): Codex planned and implemented the v1.1 deterministic core,
headless CLI, feature scenarios, three map scenes, HUD, browser campaign flow,
procedural Web Audio, harness documentation and verification script. One primary
agent; no delegation, new dependencies, image generation or external inference API.
The user supplied Ticket-02. Test and CLI failures exposed input-edge handling,
pause/fall counters and pulse-push order; fixes were made against assertions and
the complete verifier was rerun. Usage cannot be read as authoritative session
telemetry; rough estimate 25k–45k tokens, not a billing statement. Cost is unknown
under the app subscription. Browser manual play and 1280×720 performance are still
pending and are not claimed by the generated CLI evidence.

Phase 2 follow-up: corrected the drifter's 120-tick pulse-removal delay, derived
Night 2 pad direction from the destination island, and applied the ticket's 20
initial motes consistently across all nights. Added deterministic shade wandering
and expanded spawn/motion/render-adapter scenarios. Estimated additional usage:
5k–10k tokens, not billing telemetry; exact cost unavailable.

Phase 3 (2026-11-21): one Codex primary agent, no delegation or new dependencies.
Tests were added first for integer fuel ticks, refuel target selection, draining
shade transitions, dawn outcomes, dynamic capacity and JSONL v1.2. The core, HUD,
world, persistent color palette, contract validator, ADR, changelog and Ubuntu
verifier were then updated. Initial runs exposed stale v1.1 expectations and
fixture arithmetic errors; assertions were corrected to approved v1.2 behavior,
not skipped. Usage estimate: 15k–30k tokens, rough estimate only; the desktop
session does not expose authoritative token or cost telemetry. The limited browser
smoke result and successful Ubuntu Phase 2/3 runs are recorded separately; full
fuel-visual gameplay and a human campaign win are not claimed.
