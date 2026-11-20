# Delivery contract

Use one primary agent. Obtain approval before changing scope or dependencies.
Read the current phase specification. Design tests before implementation.
Use one deterministic 60 Hz simulation for browser and headless.
Keep tuning synchronized with `game.contract.json`. Never fabricate evidence.
Run focused checks and full regression before tagging. Report unrun checks.
Never commit secrets, `.env`, `node_modules` or unlicensed assets.

## Phase 2 harness

- Contract is v1.1. Read `docs/phases/phase-2-spec.md` before changing game rules.
- Run `npm test`, `npm run build`, then `node scripts/verify-phase2.js`.
- The Phase 2 verifier writes fresh output only to `docs/evidence/phase-2-final/`;
  retain each run's raw output and source hashes.
- `tests/scenarios/phase2.json` is the headless scenario catalog. Every new
  gameplay feature must have a deterministic scenario and an assertion.
- The published `phase-1` tag is immutable. Do not move it or overwrite
  `docs/evidence/phase-1-final/`. Its CI workflow checks the original tag in an
  isolated checkout; Phase 2 verification runs against the current branch.
- Compute gameplay time from integer simulation ticks. Wall/input tick advances
  during pause; simulation tick, cooldowns, spawn schedules and TTL do not.
- Keep Phase 1, browser manual play, development input replay, CLI simulation,
  and measured FPS claims separate. An input replay is not a human playthrough.
- Never use a performance target as a test value; record device, browser, size,
  DPR and raw samples. Do not claim an unmeasured 30 FPS result.
- Reuse or dispose renderer resources on entity removal. No new dependencies
  without an approved plan.

## Phase 3 harness

- Contract is v1.2. Read `docs/phases/phase-3-spec.md` and
  `docs/adr/0003-fuel-and-dawn.md` before changing lantern, shade, score or
  terminal rules.
- Run `npm test`, `npm run build`, then `npm run verify:phase3`.
- The Phase 3 verifier writes only to `docs/evidence/phase-3-final/`. Preserve
  Phase 1 and Phase 2 tags and evidence unchanged.
- `tests/scenarios/phase3.json` is the deterministic contract fixture catalog;
  keep assertions for each new headless feature.
- The Phase 2 Ubuntu workflow checks out `phase-2` manually. Current branch
  changes run through the Phase 3 workflow.
- Dawn priority is `no_flames`, then `dawn_survived` or `dawn`. Do not reintroduce
  `all_lit` or the old time bonus.
