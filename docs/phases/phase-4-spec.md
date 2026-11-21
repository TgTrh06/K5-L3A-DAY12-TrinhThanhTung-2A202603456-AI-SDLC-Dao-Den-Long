# Phase 4 — Ticket-04 / Test Contract 1.3

Source: user-provided Ticket-04 “Bình minh: phát hành v1.0.0”. This phase keeps
the deterministic v1.2 headless state and events unchanged and adds release,
benchmark, soak, leaderboard and accessibility behavior around it.

## Acceptance and verification map

| Requirement | Verification | Evidence |
|---|---|---|
| v1.0–v1.2 rules and JSONL preserved | existing Phase 1/2/3 suite and fixture verifiers | `docs/evidence/phase-4-final/` |
| Benchmark scene, seed, frame formulas and exact sample interval | deterministic scene/formula tests, then Chrome benchmark command | `bench.json`, browser and host logs |
| Ten headless nights in one Node process, seeded inputs, memory/crash thresholds | soak command and JSON schema/assertions | `soak.json` and verifier log |
| Persistent local top ten, validation, tiebreak and CLI export | unit/API/storage/export tests; reload from real preview | test log and exported JSON |
| Key rebinding and conflict handling | adapter and validation tests plus settings UI review | tests and browser review |
| Visual/announced shade, wind, time and low-fuel cues | event-to-alert code checks and browser review | browser review |
| Reduced motion, large text, color-safe alerts | preference persistence and CSS/UI review | browser review |
| Three-command clean start; Windows/Linux/macOS server paths | `npm ci`, `node node_modules/vite/bin/vite.js build`, `npm run preview`; Phase 4 Ubuntu workflow | build/HTTP logs and CI artifact |
| Release package and required project files | archive content check | `release/dao-den-long-v1.0.0.tar.gz` |
| Retro, changelog, credits, license and demo | document checklist and media metadata | repo docs and `docs/demo/demo.mp4` |

## Decisions and assumptions

- The local leaderboard lives under each OS user's application-data directory;
  `DAO_DEN_LONG_DATA_DIR` can override it for automated checks. A loopback Node
  server is required so browser storage and `--export-leaderboard` share one file.
- Benchmark uses Chrome/Chromium with a fresh profile, a 1280×720 app window,
  GPU VSync disabled where the browser exposes that flag, a WebGL scene matching
  normal Night 1 lighting, and 3 seconds of warm-up followed by the requested
  exact sample duration. Browser frame timestamps are the source of `dt_i`.
- RSS is sampled from the browser process tree on Windows/Linux/macOS. If the OS
  cannot provide it, the required output is `null` and the limitation is named.
- Soak uses a seeded input stream. The first night uses base seed + 1 (the ticket
  indexes nights from one); a new game state is allocated after each result in
  the same Node process. The soak runner disables V8 JIT and bounds the young
  generation to reduce first-run JIT/code-cache RSS noise; inputs, rules and
  allocations remain in the same process and are unchanged.
- The project uses the user-selected MIT license. Third-party library licenses
  remain listed in `CREDITS.md`.
- The demo remains a manual release gate; no synthetic or generated recording is
  represented as gameplay evidence.

## Breaking changes

Contract version becomes `1.3`; package version becomes `1.0.0`. The preview
command now starts the loopback local runtime after the Vite build. New CLI
options add benchmark, soak and leaderboard export. Browser preferences add
rebound keys, reduced motion and large text. No v1.2 headless fields, events,
scoring, or simulation output are intentionally changed.
