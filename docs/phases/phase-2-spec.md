# Phase 2 — Ticket-02 / Test Contract 1.1

Source: Ticket-02 “Ba hòn đảo” supplied 2026-11-20. Contract implementation is
the single deterministic 60 Hz simulation used by browser and headless.

## Acceptance criteria

1. **Standard movement and interaction:** speed 6 m/s with ≤0.1 s acceleration
   and braking, full air control, jump 7 m/s under −20 m/s² gravity, XZ pickup
   radius 1 m / vertical difference 1.5 m, carry cap 10, 10-mote lantern cost,
   2 m interaction, nearest unlit lantern then lexical ID tie-break.
2. **Dash and pulse:** dash 14 m/s for 12 ticks, 90-tick cooldown starting at
   activation, direction from movement or facing, no invulnerability, no height
   change while airborne; pulse costs 3 motes, radius 5 m from player feet +
   0.8 m, 120-tick stun and 4 m push across first 15 ticks, blocked by world
   bounds, deterministic +X fallback for coincident positions.
3. **Three maps and schedules:** map dimensions, lanterns, firefly points,
   enemies, jump pads, bridge, platforms, ramps, tower and wind use Ticket-02
   coordinates and counts. Spawns are seeded, deterministic, cap-aware, and
   skip occupied points. Falling below Y=-10 costs one flame, drops carried
   motes, waits 60 ticks and respawns at the night start with 90-tick immunity.
4. **Shades:** 4/4.5 m/s, 12/18 m detect/forget radii, XZ contact ≤1 m and
   vertical difference ≤1.5 m, one flame loss per tick, half inventory drop,
   90-tick invulnerability and 60-tick / 2 m recoil. Wander state moves between
   deterministic legal shade waypoints; chase follows the player. Safe lantern
   radius is 6 m.
5. **Drifters and charms:** all Ticket-02 transitions, steal/drop rules,
   lifetimes, spawn intervals, limits, charm speed/cooldown effect and respawns
   are deterministic and appear in snapshots/events.
6. **Night progression and pause:** menu → night intro → play → result; winning
   advances, losing retries the same night, third victory shows dawn and total
   campaign score. Pause freezes simulation time, cooldowns, spawns and TTL while
   wall tick advances; Escape/P toggles it. Settings persist volume and mouse
   sensitivity between page visits.
7. **Feedback/HUD:** prescribed colors stay within ±10 RGB per channel; ambient
   illumination follows `0.15 + 0.55 * lit / total`; HUD exposes all required
   counters, low-time alert, nearest off-screen lantern marker and action cues.
   Sound cues exist for every listed event, including final 10-second warning.
8. **Contract v1.1:** CLI accepts nights 1–3, produces complete deterministic
   JSONL state/events and supports the new scenario/input fields. Full-night
   headless run takes ≤30 s on the recorded verification host.
9. **Performance/evidence:** browser averages ≥30 FPS at 1280×720 on the recorded
   host. Evidence names environment and distinguishes manual play, browser input
   replay, measured rendering and CLI simulation.

## Explicit interpretations

- Night 1 defines 24 legal mote locations (8 inner + 16 outer), but says to place
  20 initially. Use the first 20 locations in deterministic angular order on
  every night; all map points remain eligible for later spawns. This applies the
  Ticket-02 global initial count to Night 2 and Night 3 as well.
- Night 1 shade schedule says two shades at tick 300 and “one each interval” at
  `300 + 480k`. Interpret as two at tick 300, then one at ticks 780, 1260, …;
  respect the six-shade cap and omit locations closer than 15 m.
- The Night 2 and Night 3 shade schedule has no initial offset stated. Use one
  shade on the first interval (420/360 ticks) and one per subsequent interval.
- Night 2 jump pads launch toward the opposite island center, normalized to the
  specified horizontal speed. The Ticket-02 wander state has no route described;
  use deterministic waypoints from each map's legal shade spawn ring at the
  standard shade speed, excluding lit lantern safe zones.
- “Closest lantern” ties use ascending IDs. Collection and enemy contact apply
  the stated inclusive horizontal and vertical bounds. A “point” occupancy test
  uses a 0.01 m XZ tolerance.
- Tick is the wall/input tick. `sim_tick` advances only while playing. Pressing
  pause advances wall tick once and emits `paused`; while paused each call still
  advances wall tick but no simulation counter or gameplay timers. Resume is a
  rising edge of `pause` and emits `resumed`.
- Campaign persistence is browser orchestration, not hidden mutable state in the
  simulation: one `createGame(seed, scenario, night)` per night; campaign score
  is carried by the UI. A headless invocation runs one selected night.
- Browser camera and sound are presentation-only. The simulation remains usable
  without WebGL or audio and does not consult wall-clock randomness.

## Verification matrix

| Requirement | Automated scenario / check | Evidence |
|---|---|---|
| Movement, acceleration, jump, dash | `tests/phase2.test.js` deterministic tick scenarios | test log + JSONL |
| Mote, lantern, pulse | boundary, tie, partial deposit, push/stun assertions | test log + JSONL |
| Fall, respawn, immunity | fall scenario through tick 150 | test log + JSONL |
| Three maps, pads, layers, wind | map geometry and seeded state assertions | test log + snapshots |
| Shade, drifter, charm | all shade schedules, deterministic wander/chase movement, drifter 1200-tick spawn/cap/state speeds, delayed removal and charm scenarios | test log + JSONL |
| Pause and exact clocks | repeated paused ticks and resumed deadline | test log + JSONL |
| Settings storage | volume/sensitivity storage survives a new settings/audio instance and browser page reload | `tests/audio-settings.test.js`; `docs/evidence/phase-2-final/browser-report.md` |
| CLI contract/determinism | same seed/scenario/input byte comparison | two headless files + hashes |
| Campaign simulation diagnosis | baseline nearest-only replay and evasive Night 1 legal-input replay | `docs/evidence/phase-2-final/campaign-traces/`; simulation-only |
| Browser UI/audio/performance | production HUD/lanterns and shade forms observed; settings persisted after reload; 60-second sample at 1280×720 averaged 78.97 FPS | `docs/evidence/phase-2-final/browser-report.md`; audible sound cues and human full campaign remain pending |
| Phase 1 regression | eight adapted public Phase 1 invariants, including 300-second Night 1 safe-zone/spawn soak, on current runtime | `tests/phase1-regression.test.js` + test log; hidden Coach suite is unavailable |

Known scope boundary: the current browser report records a production FPS pass,
visible shade forms, and settings values surviving a page reload. The captures
were inspected but not saved as image files; shade world-coordinate movement was
not isolated. Audible playback and a human victory through all three nights have
not been verified. The 30 FPS average threshold is met for this recorded Windows
host and viewport, but this is not a cross-platform GPU result.

The regression suite ports the public Phase 1 setup, movement/clock, interaction,
terminal scoring, damage/pulse, snapshot, CLI, and soak behaviors with Ticket-02
tuning. It does not claim to run the unavailable hidden Coach tests; historical
Phase 1 CI still verifies only the published Phase 1 commit.
