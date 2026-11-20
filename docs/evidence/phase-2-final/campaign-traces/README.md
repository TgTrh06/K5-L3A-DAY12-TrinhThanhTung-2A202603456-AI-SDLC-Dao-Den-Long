# Campaign controller diagnosis

Seed: `12`. This is deterministic simulation evidence from legal input drivers that inspect simulation state. It is not a browser replay or human campaign result.

| Driver | Result | Details |
|---|---|---|
| Nearest-only baseline | lost | tick 3083; 1/5 lanterns; 3 shade hits; 0 pulses; 0 dashes |
| Evasive Night 1 | won | tick 14544; 5/5 lanterns; 2 shade hits; 8 pulses; 11 dashes; 1 flames after the last hit |

The baseline follows the nearest mote/lantern and never uses defensive actions. The evasive driver blends a threat-away vector into its target movement, pulses when a threat is within 4.5 m and the player can pay the 3-mote cost, and dashes when a threat is within 3.2 m. The evasive driver shows that Night 1 can be won by a legal simulation controller on this seed. Night 2/3 normal-enemy completion, browser visibility, and a human full-campaign victory remain unverified.

See `summary.json` and the paired input/JSONL files for the reproducible traces.
