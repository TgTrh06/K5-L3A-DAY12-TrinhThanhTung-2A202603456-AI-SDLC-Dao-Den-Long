# Phase 2 local verification

Generated locally on Windows (`win32`, `x64`) with Node.js `v22.12.0` on
2026-11-20. This is evidence for the current working tree, not a GitHub Actions
run, a tagged revision, or a full manual campaign victory. The separate
[production browser report](browser-report.md) records the 1280×720 FPS sample.

## Results

| Check | Result | Evidence |
|---|---|---|
| Automated tests | 47 passed, 0 failed, including 8 adapted public Phase 1 regression tests, a legal-input Night 1 diagnostic driver, and settings persistence unit coverage | `tests.txt`; `campaign-diagnosis.txt` |
| Production build | passed; Vite warns that the main minified chunk exceeds 500 kB | `build.txt` |
| Feature scenarios | 14 fixtures cover 20 initial motes/night, shade schedules/wander, drifter spawn/pulse delay, and other Contract 1.1 behavior; tests assert both Night 2 pad vectors and shade/drifter speeds | `fixtures/*.jsonl`, `fixture-*.txt`, `tests.txt` |
| Renderer adapter | Entity position updates and the 120-tick drifter visibility delay are covered by a focused adapter test | `tests.txt` |
| Settings persistence | Unit check across new instances and browser UI values after reload both passed | `tests.txt`; `browser-report.md`; audible playback remains unverified |
| Full-duration headless nights | Nights 1/2/3 ran through 300/330/360 seconds, then ended in loss due to dawn; each completed in under 0.5 s on this host | `full-night-*.jsonl`, `full-night-*.txt`, `run-summary.json` |
| Browser UI and shades | Production Night 1 HUD/lanterns rendered; shade forms visible across two captures about five seconds apart | `browser-report.md`; captures were not saved as image files, and movement was not measured in world coordinates |
| Human campaign victory | Not verified | No claim |
| Browser FPS at 1280×720 | 78.97 mean FPS over 60 seconds after 10-second warm-up; visible/focused, zero excluded frames | `browser-report.md`; one 240 ms maximum frame stall; `src/metrics.js` |
| Ubuntu CI | Workflow prepared, not pushed or run | `.github/workflows/verify-phase-2.yml` |
| Campaign controller diagnosis | Nearest-only driver lost at tick 3083 after lighting 1/5; evasive driver won Night 1 at tick 14544 (5/5); a separate defensive trial reached 3/5 then lost | `campaign-traces/`; simulation-only, not human/browser campaign evidence |

Headless full-night tests intentionally let the player stand still until dawn;
the terminal result is a loss due to time. They prove duration, deterministic
simulation, and termination behavior. They do not demonstrate the game can be won
by a person. Full details and assumptions are
in `docs/phases/phase-2-spec.md`. File hashes for the tested source and harness
are in `source-hashes.json`.

Regenerate this directory from the repository root with:

```sh
node scripts/verify-phase2.js
```
