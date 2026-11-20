# Phase 3 browser review

- Build served by local Vite preview on Windows Chrome at `127.0.0.1:4173`.
- Menu, Night 1 introduction and active Night 1 rendered. Active HUD showed
  `04:00`, `0 / 5` lit lanterns and carried/capacity `0 / 10`.
- Opened Settings, enabled “Bảng màu dễ phân biệt”, returned to the menu,
  reloaded the page and confirmed the checkbox stayed enabled. Restored it to
  its original disabled state after the persistence check.
- The live scene rendered the player, terrain, lanterns, fireflies and HUD. No
  blank scene or overlay/layout failure was observed in this pass.
- A follow-up attempt to move through nearby fireflies did not collect any; the
  active HUD remained `0 / 10`, and no lantern was lit. This attempt is not counted
  as gameplay or fuel-bar verification.

## Not demonstrated in this pass

- A lit lantern's 3D fuel bar, blinking below 30, or its extinguished shape.
- The 30-second warning icon/color, a shade's colorblind accent, or warning
  contrast under active gameplay.
- Full manual campaign, measured FPS, or a frame-time benchmark.

This is a limited visual smoke check, not a complete gameplay acceptance run.
The screen was inspected live, but no browser screenshot was persisted in the repo
during this pass; this file is an observation log, not image evidence.
