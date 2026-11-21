# Watercolor art update

> Historical art review. [Current Phase 1 evaluation](../phase-1-final/README.md)
> records the later clock fix, contract coverage and browser replay evidence.

User approved `accept plan art màu nước`. References inform palette, paper washes,
cloud scrolls, ivory moon and warm light. Original reference pixels are not bundled.
No extra skill, dependency or gameplay tuning was used in this update.

Changed: src/main.js (scene adapter), src/visuals/paint.js (Canvas textures),
src/visuals/world.js (Three.js scene), src/visuals/hud.js (HUD adapter),
src/style.css, index.html, CREDITS.md. Existing scripts/evidence.js edits and
result.jsonl were preserved. core.js, headless.js and game.contract.json unchanged.

## Verification

- npm test: 14/14 test groups pass.
- npm run build: passes. Final app bundle approximately 512 kB / 132 kB gzip.
  Vite warns that its single JS chunk exceeds 500 kB. No new bundling dependency.
- Twelve source-adapter checks: A/Left project left and D/Right project right at
  yaw 0, 90 and 180 degrees. Headless movement convention remains unchanged.
- Contrast of opaque palette against #172e43: paper #f2e5c5 = 11.13:1,
  gold #c6a568 = 5.96:1, muted text #b8c7c9 = 7.99:1. These measurements do not
  assert contrast over every part of the changing 3D background.
- Chrome production preview: scene, HUD, moon, scroll clouds, motes and hat render.
- Escape shows pause panel; clicking Continue hides it and resumes simulation.
- Q visibly changes accessible flame count from 5 to 4.
- Natural runtime damage/pulse sequence reaches 0 flames and displays loss dialog.
  Clicking restart resets 05:00, 5 flames, 0 score and hides loss dialog.
- 390x844 viewport: HUD reflows to two rows; document scroll width 390, no horizontal
  overflow. Keyboard/mouse remain required; this is not touch-control support.
- Browser console error/warning capture: empty in observed session.
- Reduced-motion setting suppresses decorative bobbing, cloud motion and pulse
  expansion by code inspection; system preference switching was not exercised.

## Evidence

- [Desktop](desktop.jpg): final production scene.
- [Narrow layout](narrow.jpg): final 390px HUD layout.
- [Loss dialog](loss.jpg): actual no-flames outcome before clicking restart.

No measured FPS claim: browser inspection API does not expose requestAnimationFrame
for sampling. Render cost is bounded by capped pixel ratio, shared leaf materials,
one batched grass geometry and no shadow maps or postprocessing passes.
Full browser victory playthrough and macOS/Linux clean-run verification remain
outside the observed results. No Phase 1 release tag created by this art change.
