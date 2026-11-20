# Phase 1 verification — incomplete release gate

> Historical report from the initial prototype. For current verification status,
> fixes and traceability, see [the latest evaluation](../phase-1-final/README.md).
> Keep the original observations below as historical evidence, not current claims.

Run `node scripts/evidence.js` to regenerate actual test, build, deterministic and
scenario evidence. source-hashes.json identifies source bytes under test, avoiding
self-referential commit hashes in generated evidence.

Automated: 14 test groups pass. CLI scenario runs demonstrate all_lit victory,
dawn loss and no_flames loss. Two runs with seed 42 compare byte-for-byte.
Contract tuning matches shared constants. Production Vite build passes.
See test-results.txt, build-results.txt, environment.md and *-run.jsonl.

Browser observation on Windows Chrome: production page renders 3D island, Mây's
hat, motes, lanterns and HUD at approximately 900x940. HUD and help fit the view.
Automated key actions did not yield a reliable observed gameplay change; focus and
frame scheduling remain unresolved. This is not evidence of a successful UI playthrough.
Fast button taps are now retained until the next simulation tick by the input adapter.

Outstanding release gates: real browser win/loss/restart playthrough, reliable keyboard
and camera verification, narrow viewport review, and macOS/Linux clean install/run.
No phase-1 tag should be created until required gameplay verification is complete.
No hidden grader test has been run. No screenshot file is claimed; browser screenshots
were observed in the session only. The headless benchmark is not a graphics FPS claim.
