# Delivery contract
Use one primary agent. Obtain approval before changing scope or dependencies.
Read the current phase specification. Design tests before implementation.
Use one deterministic 60 Hz simulation for browser and headless.
Keep tuning synchronized with game.contract.json. Never fabricate evidence.
Run focused checks and full regression before tagging. Report unrun checks.
Never commit secrets, .env, node_modules or unlicensed assets.

Validation: `npm test`, `npm run build`, `node scripts/verify-phase1.js`.
Compute gameplay time from integer ticks, never accumulated subtraction.
Separate manual browser play, development input replay, CLI simulation and measured
performance claims. Never present one as evidence of another.
Keep original failing logs when fixing regressions. New evidence gets its own run
directory/source hashes. Reuse or dispose renderer resources on entity removal.
