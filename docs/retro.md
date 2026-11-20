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
