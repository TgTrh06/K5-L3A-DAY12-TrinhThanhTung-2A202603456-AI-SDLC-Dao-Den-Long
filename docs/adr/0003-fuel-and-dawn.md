# ADR-0003 — Fuelled lanterns and dawn victory

- **Status:** Accepted for Ticket-03 / Contract 1.2
- **Date:** 2026-11-21

## Decision

Lantern fuel is stored internally as integer `fuelUnits`, where 60 units equal
one fuel. The JSONL snapshot converts this to one decimal place. This avoids
floating-point drift over 60 Hz decay and drain ticks.

Each lantern also stores `everLit` and `relitCount`. First-light deposits use
the Ticket-02 cost of 10; an ever-lit lantern uses 5 when relit. Partial deposits
are preserved until completion. A successful light leaves the completed deposit
visible in state. Extinguishing resets it to 0, preserves `everLit`, and emits
`lantern_out`.

The fuel phase runs immediately after advancing `sim_tick` and before player
movement or interaction. Lit lanterns lose one fuel unit per tick. Shades already
in `drain` at the start of this phase subtract five more units each. A shade that
enters `drain` during movement begins siphoning on the next tick. `fuel_drain` is
emitted per draining shade at each 60th simulation tick. A lantern that reaches
zero is extinguished before interaction.

Interaction considers only nearby unlit or non-full lamps and sorts by distance,
then ascending ID. A lamp that was full at tick start is excluded from that
tick's target selection even though its normal decay has just begun; this keeps
the explicit “full lamp is not selected” rule deterministic. Refuel mote use is
the integer ceiling of the remaining fuel deficit divided by 10.

Only `wander` shades choose a lantern target. They prefer the nearest lit lamp
below 30 fuel; ties use ascending ID. If there is no weak lamp, they approach the
nearest unlit lamp and do not drain it. At 2 m or less from a weak lamp they enter
`drain` and remain still. Chasing shades keep their current player target. Lamps
at 30 fuel remain safe; lamps below 30 do not. When a weak lamp is restored to
at least 30, draining shades transition out immediately and safe-zone push keeps
nearby shades from causing damage during the 30-tick ejection.

Victory is resolved only after the complete dawn tick. It requires a living
player and `ceil(0.6 * lantern_count)` currently lit lamps. `no_flames` takes
priority over dawn, then dawn produces `dawn_survived` or `dawn`. The winner
receives 50 points plus `floor(fuel)` for each lit lamp, and 50 per remaining
flame; no time bonus is awarded. All-lanterns-lit is no longer a terminal state.

Scenario lamps marked lit default to 100 fuel and `ever_lit: true` if omitted.
An explicitly supplied `ever_lit` value is retained. Scenario lights do not
increment `successful_lights`; a new game resets that count. Player capacity is
derived as `min(20, 10 + 2 * successful_lights)`.

## Consequences

- Contract 1.2 changes snapshot fields, events, score, time limits, shade state,
  lantern selection and victory conditions. See [CHANGELOG.md](../../CHANGELOG.md).
- Phase 1/2 assertions for immediate all-lit victory, pickup scoring, old night
  durations and permanent safe zones are replaced with explicit v1.2 assertions;
  unchanged movement, combat, map and headless assertions remain active.
- Fuel and drain use only deterministic integer arithmetic in the core. Renderer
  animations read simulation ticks and do not change gameplay state.
