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
two supplied images. One Codex agent authored textures, scene and HUD; no Komorebi
skill used. Browser QA found overly bright ground and a Vietnamese font rendering
problem; palette/exposure and title font were adjusted. Actual pause, pulse,
loss/restart and narrow layout were observed. Screenshots are saved under
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
