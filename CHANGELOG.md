# Changelog

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
