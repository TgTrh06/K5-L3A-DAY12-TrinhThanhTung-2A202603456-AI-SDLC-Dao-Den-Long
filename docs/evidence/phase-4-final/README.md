# Phase 4 local verification — Contract 1.3

Base commit: `f7d55a728cb3ea09466ca33bde90bc0b1ecfe6a2`. The working tree contains
uncommitted Phase 4 changes. Local validation ran on Windows with Node.js 22.12.0.
SHA-256 values for the phase source and project files are in `source-hashes.json`.

| Check | Result | Evidence |
|---|---|---|
| Full public test suite, including Phase 1–3 regressions | 76 passed, 0 failed | `tests.txt` |
| Production Vite build via direct Node entry point | Passed; emitted the existing 576 kB main-chunk advisory | `build.txt` |
| Ten-night seeded headless soak in one process | 10 results, 0 crashes; RSS 28.3 MB → 32.4 MB (14.5% growth, below 20%) | `soak.json`, `soak-diagnostics.md` |
| Release archive contents | Passed; archive contains web files, local server, MIT license, credits and run instructions | `release-package-check.txt`, `../../../release/dao-den-long-v1.0.0.tar.gz` |
| Packaged static-server route | Passed; package serves the home page and hashed JavaScript asset from its `dist/` directory | `release-package-check.txt` |

The soak command disables V8 JIT and bounds the young generation to reduce RSS
noise from JIT/code-cache and heap expansion during the first simulation. This
changes the Node runtime configuration only; the game rules, random input
probabilities and seeds are unchanged. The exact command is recorded in
`game.contract.json` and `soak.json` is its raw output. Diagnostic attempts are
kept beside the final result: the default JIT run exceeded the RSS ratio, while
JITless without the bounded semi-space also exceeded it. These measurements are
not hidden or presented as passing results.

## Checks still open

- No `bench.json` is claimed. The local sandbox denied browser access to the
  loopback server; `benchmark-attempt.txt` records the `EACCES` preflight
  failure. There is no valid Chrome frame sample or FPS conclusion.
- Manual browser checks of settings persistence, leaderboard reload and visual
  accessibility cues need a normal local browser session.
- The Ubuntu workflow is prepared locally but has not been pushed or run.
- The gameplay MP4 is not recorded yet.
- No phase-4 tag or GitHub Release was created.

The `npm run build` wrapper did not return in this restricted execution, so the
successful build evidence is from `node node_modules/vite/bin/vite.js build`.
The wrapper attempt is preserved as `build-npm-wrapper-attempt.txt`; it is not
counted as a successful build.
