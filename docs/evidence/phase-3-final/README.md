# Phase 3 verification

Contract 1.2 local verification. Tested working tree based on commit: `5ba809bfb1d445245dcdc2801e8b98a985fe2957`.

- Worktree was dirty during verification; changed paths are listed in `run-summary.json`.
- Test suite and production build logs are stored beside this file.
- Feature fixtures run twice and compare JSONL bytes. Their outputs are under `fixtures/`.
- Three full-duration headless nights reach dawn with no lamps lit and no shades enabled. This validates tick duration and terminal handling, not campaign balance or a human win.
- Source hashes are in `source-hashes.json`; command and runtime details are in `run-summary.json`.
- Browser rendering, manual gameplay and FPS are not claimed by this CLI verifier.
