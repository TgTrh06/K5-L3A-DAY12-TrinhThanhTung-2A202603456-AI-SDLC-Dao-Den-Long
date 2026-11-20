# Phase 2 production browser report

Observed locally on 2026-11-20 in the production Vite preview using Chrome
157 on Windows x64 (the browser user-agent reports `Windows NT 10.0`). This is a browser presentation/performance observation;
it is separate from the headless simulation and controller traces.

## Production frame sample

The observer was opened at `http://127.0.0.1:4180/?metrics=1` in a visible,
focused tab. The CSS viewport was 1280×720 at device pixel ratio 1. After a
10-second warm-up, the observer recorded 60,000.2 ms of active frames. It
excluded zero hidden or unfocused frames and reported `acceptanceCandidate: true`.

| Measure | Result |
|---|---:|
| Frame samples | 4,738 |
| Mean frame interval | 12.664 ms |
| Mean FPS | 78.97 |
| P95 frame interval | 20.30 ms |
| Maximum frame interval | 240 ms |
| Three.js geometries / textures / draw calls | 64 / 17 / 150 |
| Reported JS heap | 16,026,681 bytes |

This passes the Phase 2 average-FPS threshold of 30 at the required viewport.
The 240 ms maximum frame indicates an occasional stall remains; the mean alone
does not establish consistently smooth frame delivery. The observer records
render-frame timing, not human input latency.

The browser reported `visible: true`, `focused: true`,
`viewportMatchesTarget: true`, `activeSampleMs: 60000.2`, and
`excludedHiddenOrUnfocusedFrames: 0`. Its raw result also identifies Chrome
157 on Windows x64 and DPR 1. The live observer JSON is shown in the game
panel when the production page is opened with `?metrics=1`.

## Visual and settings observations

- The production Night 1 scene rendered its HUD and lanterns. Across two visual
  captures about five seconds apart, purple shade forms were visible in the
  world at different screen positions. This confirms visible enemy rendering
  during this session; camera/world motion was not isolated into a coordinate
  measurement, so this is not a controlled movement benchmark.
- The settings UI was changed to volume `0.70` and mouse sensitivity `0.85`,
  the page was reloaded, and the displayed values remained `0.70` and `0.85`.
  This verifies browser persistence for these values in this session.
- Audible playback was not verified by listening. Automated settings tests
  verify persistence only, not that every sound cue is audible or correctly
  timed.
- The game continued advancing during observation; the captures showed changing
  HUD values. No campaign outcome is inferred from that observation.

The captures were inspected in the browser during verification but were not
saved as image files in the repository. Do not cite this report as a screenshot
or as evidence of a human full-campaign victory.

## Still open

- A person playing and winning all three nights in sequence.
- Listening to the required sound cues in the browser.
- Running the Phase 2 Ubuntu workflow after it is pushed to GitHub.

## Night 3 visual correction follow-up

The submitted Night 3 image showed the tier 2 disc/tower with very little
contrast at 0/7 lit lanterns. A dev-only route, `/?night=3`, now enters the
ordinary playing scene for visual inspection without completing the campaign.
At a 1280×720 viewport, the browser DOM showed `ĐÊM 03 · ĐẢO CHUÔNG`, `0 / 7`
lanterns lit, three flames, and the six-minute timer. The running scene showed
the tier 2 gold deck rim and a short, warm wood bell tower with gold ribs and a
roof beside the centered title. The player remained visible from the lower
island. The visual review was performed in the browser; no screenshot file was
persisted, so this report does not serve as a saved image artifact.

The tier 2 cylinder is open-ended; a separate top circle remains the playable
deck surface. This removes the dark bottom cap that previously filled the view
from below the upper platform. The tower has been moved within the tier 2 deck
footprint, shortened so it fits in the default camera view, and given a muted
warm highlight with gold ribs and bands. The tier 1 half-ring is one continuous
shape on the required positive-Z side.

A Three.js geometry check confirmed that the rendered tier 1 half-ring spans
`z = 0..24 m`, the tier 2 platform spans `y = 5.645..6.0 m`, and the tower
assembly lies within the radius-8 tier 2 deck with a top at `y = 9.2 m`.
`node scripts/verify-phase2.js` passed against the final working tree: 47 tests
passed, the production build completed, and the campaign/fixture outputs and
source hashes were regenerated. Vite still reports its existing main-chunk
size warning (>500 kB).

