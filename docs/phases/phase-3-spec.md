# Phase 3 — Ticket-03 / Test Contract 1.2

Source: user-provided Ticket-03 “Đèn cạn dầu”. The browser and headless CLI use
the same deterministic 60 Hz simulation. Design choices are recorded in
[ADR-0003](../adr/0003-fuel-and-dawn.md); breaking changes are listed in
[CHANGELOG.md](../../CHANGELOG.md).

## Acceptance criteria

1. **Lantern fuel:** maximum 100, first or later successful light resets to 100;
   every lit lantern loses `1/60` fuel each tick. Interacting with a lit lamp
   spends `min(carried, ceil((100-fuel)/10))` motes and adds 10 fuel each. Full
   lamps are never selected and have no event or score. Fuel is exact in integer
   1/60 units, rounded to one decimal only at output. At zero the lamp turns off,
   resets `deposited`, retains ever-lit history and emits `lantern_out`. Ever-lit
   lamps relight for five; first lights still cost ten. Lit lamps show fuel bars;
   below 30, lamp and bar blink at 1 Hz.
2. **Shade draining:** fuel below 30 removes safety; exactly 30 is safe. Only
   wander shades select the nearest weak lamp, ties by ID, otherwise the nearest
   unlit lamp. Chase targets do not change. Within 2 m of a weak lamp, the shade
   stops in `drain` and subtracts 5/60 fuel per tick. Multiple shades stack.
   Drain exits to chase within 6 m of the player; it exits to wander if the lamp
   goes out, reaches 30 after refuel, or distance exceeds 2 m. Pulse stuns shade;
   after stun it returns to wander. Restoring a weak lamp above 30 pushes nearby
   shades away for no more than 30 ticks without damage.
3. **Dawn outcome:** lengths 240/270/300 s. No early all-lit win. At the last
   tick, a living player wins at `ceil(0.6 * total)` active lamps (3/5, 4/6,
   5/7). Zero flames wins precedence and reason `no_flames`; below-threshold dawn
   loses with `dawn`; a qualifying dawn wins with `dawn_survived`.
4. **Capacity and scoring:** capacity is `min(20, 10 + 2*successful_lights)`;
   it resets each night and scenario-prelit lamps do not count. Award +5 per
   loaded/refuelled mote, +100 first light, +40 relight, +5 per ordinary pulse
   target or +15 for a target that was draining. At winning dawn add 50 plus
   `floor(fuel)` for every lit lamp and 50 per remaining flame. No time bonus.
   Campaign/replay score handling stays as Ticket-02.
5. **Color distinction:** setting persists. Bóng Mực accent becomes `#00B3FF`,
   warning UI is white with ⚠. Lamp state remains distinguishable without color:
   off lamp is 20% flatter and shows a tear; low-fuel lamps blink.
6. **Contract v1.2:** runtime and `game.contract.json` match. Scenarios accept
   lantern `lit`, `fuel`, `ever_lit`, `relit_count`; player
   `successful_lights`; shade `drain` and `target_lantern_id`. Snapshots report
   lantern fuel to one decimal, history fields, player capacity and shade target.
   JSONL has `refuel`, `lantern_out`, per-60-tick `fuel_drain`, `lantern_lit`
   with `relight`, and `game_over.reason` values required by the contract.
7. **Regression and evidence:** all non-replaced Phase 1/2 tests pass. Changed
   tests explicitly assert dawn victory, delayed ending, unscored pickup, finite
   fuel and v1.2 durations; no old test is silently skipped. The final verifier
   records commands, outputs, source hashes and full-duration headless results.

## Verification matrix

| Requirement | Automated check | Evidence |
|---|---|---|
| Fuel initialization, decay, extinguish, refuel and relight | `tests/phase3.test.js` | Phase 3 test log and JSONL fixtures |
| Safe threshold, target choice, drain, state exits and pulse bonus | `tests/phase3.test.js` | Phase 3 test log and JSONL fixtures |
| Dawn threshold, priority, score and no early win | `tests/phase3.test.js`, adapted Phase 1/2 tests | Phase 3 test log and full-night output |
| Dynamic capacity and night reset | `tests/phase3.test.js` | Test log |
| Headless v1.2 state/events and malformed inputs | `tests/phase3.test.js`, `tests/phase2.test.js` | JSONL fixture and test log |
| Colorblind preference persistence | `tests/audio-settings.test.js`; Chrome preview reload | Test log and [browser review](../evidence/phase-3-final/browser-review.md) |
| Full regression and build | `npm test`, `npm run build` | `docs/evidence/phase-3-final/` |
| Ubuntu install/test/build/HTTP smoke | GitHub Actions Phase 3 workflow | Run URL/artifact after push; currently pending |
| Visible browser fuel bar and warning colors | Manual production browser QA | Partial: menu, Night 1 HUD and saved preference observed; fuel bar, low-fuel blinking and 30-second warning remain open |

The hidden Coach suite is unavailable locally. Ubuntu workflow, fuel-bar and
low-fuel warning visuals, and a complete manual campaign remain open; none is
inferred from local simulation tests.
