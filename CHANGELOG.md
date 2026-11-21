# Changelog

## Phase 1 — Contract 1.0 baseline

- Introduced the 60 Hz deterministic game core, browser renderer, initial
  headless JSONL runner, one third-person island, lantern collection/light,
  shade encounters, pulse, health, score, timer and restart flow.
- Contract 1.0 defined the first CLI and snapshot/event format. Subsequent phases
  keep its still-valid movement, input and output guarantees in regression.

## Phase 2 — Contract 1.1 / Ticket-02

### Breaking changes

- Contract version changed from 1.0 to 1.1. The single map expanded to three
  islands with distinct geometry, night lengths and campaign progression.
- Added jump, dash, expanded enemy schedules, drifting thieves, charms, wind,
  pause, persistent audio/sensitivity settings and the Phase 2 score/campaign
  feedback described by Ticket-02.

### Retained behavior

The 60 Hz shared core, basic movement, collection, lantern interactions, pulse,
shades, win/loss and JSONL event/snapshot stream remain the foundation.

## Phase 3 — Contract 1.2

### Breaking changes

- Contract version changes from `1.1` to `1.2`; Night 1/2/3 lengths change to
  240/270/300 seconds.
- Lanterns carry fuel, decay by 1 per second, can be refuelled, extinguish at
  zero and can be relit for five motes after their first light. Full lamps are
  not interaction targets. Snapshots now include `fuel`, `ever_lit` and
  `relit_count`.
- `shades[].state` adds `drain`; shade snapshots include `target_lantern_id`.
  Weak lanterns below 30 fuel lose their safe zone and can be drained by shades.
- Player snapshots add dynamic `capacity`; scenarios accept
  `player.successful_lights`, lantern fuel/history fields and shade targets.
- Scoring changes to +5 for each mote loaded into a lantern, +100 for first
  light, +40 for relight, +5 per normal pulse hit or +15 per shade hit from
  `drain`, and dawn fuel/flame awards. Pickup and time-left bonuses are removed.
- A night no longer ends when all lanterns are lit. At dawn, the player wins only
  if alive and at least 60% of lanterns remain lit. End reasons are `dawn`,
  `dawn_survived` and `no_flames`; `all_lit` is retired.
- The new persistent “Bảng màu dễ phân biệt” option changes shade accents and
  warning treatment; extinguished lamps use a flattened lantern and paper tear.

### Retained behavior

Unchanged Phase 1/2 movement, maps, enemy contact, dash, pulse cost/radius,
drifter rules, pause behavior and deterministic JSONL behavior remain covered by
the current regression suite unless explicitly replaced above.

## Phase 4 — Contract 1.3 / Ticket-04

### Breaking changes

- Contract version changes from 1.2 to 1.3; package metadata becomes 1.0.0.
- `npm run preview` now starts a local Node runtime after the Vite build so the
  browser leaderboard and `--export-leaderboard` CLI use the same on-disk data.
- New benchmark and soak commands write host measurements and deterministic
  simulation-stability summaries. They do not alter standard headless JSONL.

### Added

- Seeded Night 1 benchmark scene with 200 wandering shades, 100 motes, orbiting
  camera, frame statistics, load time and process RSS where supported.
- Ten-night same-process soak runner with seeded movement/actions and memory
  comparison.
- Persistent local top-ten leaderboard, name validation, chronological tiebreak,
  menu view and JSON export.
- Persistent keyboard remapping with conflict reporting/default reset, reduced
  motion, large text, and visible/screen-reader alerts and shade direction.
- Required README, all-phase changelog, MIT project license, release package,
  evidence and retro updates.

Unchanged headless fields/events, scoring, tick order and Night 1–3 rules remain
covered by the Phase 1–3 regression suite.
