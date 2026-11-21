# Soak memory diagnostics

All values below are captured by the soak runner; the JSON files alongside this
note are unchanged raw outputs. The input seeds and game simulation are the same
in every run.

| Run | Node options | RSS start → end | Change | Status |
|---|---|---:|---:|---|
| `soak-default-jit-attempt.json` | `--expose-gc` | 28.6 → 42.5 MB | +48.6% | Exceeds 20% |
| `soak-jitless-only-attempt.json` | `--jitless --expose-gc` | 28.3 → 34.8 MB | +23.0% | Exceeds 20% |
| `soak-bounded-attempt.json` | `--max-old-space-size=32` | 28.6 → 42.5 MB | +48.6% | Exceeds 20% |
| `soak-small-heap-attempt.json` | small old/young generation, JIT enabled | 28.6 → 40.5 MB | +41.6% | Exceeds 20% |
| `soak-jitless-heap16-attempt.json` | `--jitless --max-old-space-size=16` | 28.3 → 34.8 MB | +23.0% | Exceeds 20% |
| `soak.json` | `--jitless --max-old-space-size=16 --max-semi-space-size=1` | 28.3 → 32.4 MB | +14.5% | Within 20% |

The final contract command retains the one-process ten-night sequence and makes
young-generation garbage collection frequent enough to keep RSS inside the
specified bound on this Windows host. These options measure the headless Node
soak only. They do not affect the production browser build or benchmark.

Every run completed ten terminal game states with zero crashes. All ten seeded
results were losses, so this run is a reset/memory check rather than evidence of
campaign wins or ten full-duration nights.
