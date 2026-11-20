# Phase 3 verification

Contract 1.2 local verification. Tested working tree based on commit: `1d314d31329aab3f1bb88afccf8a13f270683afc`.

- Worktree was dirty during verification; changed paths are listed in `run-summary.json`.
- Test suite and production build logs are stored beside this file.
- Feature fixtures run twice and compare JSONL bytes. Their outputs are under `fixtures/`.
- Three full-duration headless nights reach dawn with no lamps lit and no shades enabled. This validates tick duration and terminal handling, not campaign balance or a human win.
- Source hashes are in `source-hashes.json`; command and runtime details are in `run-summary.json`.
- Limited Chrome preview review is recorded in `browser-review.md`; it does not demonstrate a lit fuel bar, manual campaign or FPS.
- Ubuntu Actions runs are recorded in `ubuntu-ci.md`.
- Fuel-bar gameplay and FPS are not claimed by this CLI verifier.
