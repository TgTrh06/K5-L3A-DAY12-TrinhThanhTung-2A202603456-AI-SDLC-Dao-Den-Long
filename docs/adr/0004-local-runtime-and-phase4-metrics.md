# ADR-0004 — Local runtime, benchmark and release persistence

- Status: accepted for Phase 4 implementation
- Date: 2026-11-21

## Context

The deliverable is a static Three.js browser game, but Ticket-04 also requires a
command-line export of the same persistent local leaderboard. Browser
`localStorage` cannot provide an interoperable on-disk JSON file to that CLI.
Benchmark numbers must describe browser frame intervals for one exact stress
scene, while soak runs must preserve the shared simulation's 60 Hz rules.

## Decision

- Keep the gameplay core deterministic and unchanged for ordinary v1.2 runs.
- Add an opt-in benchmark mode with a seeded scene and an early simulation path
  that advances wander movement only; it does not collect, spawn, damage, drain,
  or end the night.
- Run the benchmark in Chrome/Chromium and collect actual `requestAnimationFrame`
  intervals. The host CLI samples the browser process tree's RSS where supported.
- Serve the built app from a small Node loopback server. Store the shared top-ten
  JSON in the platform's user data directory and export that exact file from CLI.
- Keep soak input seeded, execute each night in the same Node process, and reset
  the game state between nights.
- Avoid a new dependency; bundle browser code with the existing Vite build.

## Consequences

`npm run preview` starts a loopback Node server after the normal Vite build. The
release archive must contain `dist/`, `package.json`, and the small server/store
modules. The leaderboard is per-user and local to the machine; there is no
account or cloud synchronization. Benchmark evidence is host-specific reference
data, never a claim about the instructor's scoring machine.
