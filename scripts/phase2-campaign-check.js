import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, step, snapshot, T } from '../src/core.js';
import { fullPlaythrough } from './full-playthrough.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/evidence/phase-2-final/campaign-traces');
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

// Simulation-only diagnostic driver. It issues legal input frames and reads state
// to steer; it never edits game state and is not human/browser play evidence.
export function evasiveNightOne(seed = 12) {
    const g = createGame(seed), frames = [], rows = [snapshot(g)];
    let target;
    while (g.state === 'playing' && g.tick < 18000) {
        const p = g.player;
        const lamp = [...g.lanterns.filter(item => !item.lit)]
            .sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0];
        if (!lamp) break;
        if (p.carried >= T.lantern_cost - lamp.deposited) target = lamp;
        else if (!target || target === lamp || !g.motes.includes(target)) {
            target = [...g.motes]
                .sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0] ?? lamp;
        }
        if (target !== lamp && p.carried >= T.lantern_cost - lamp.deposited) target = lamp;

        const dx = target.pos[0] - p.pos[0], dz = target.pos[2] - p.pos[2];
        const length = Math.hypot(dx, dz) || 1;
        let moveX = dx / length, moveZ = dz / length;
        let nearestThreat = Infinity, repelX = 0, repelZ = 0;
        for (const enemy of [...g.shades, ...g.drifters]) {
            const awayX = p.pos[0] - enemy.pos[0], awayZ = p.pos[2] - enemy.pos[2];
            const d = Math.hypot(awayX, awayZ);
            nearestThreat = Math.min(nearestThreat, d);
            const radius = enemy.id.startsWith('D') ? T.drifter_detect_radius : T.shade_detect_radius;
            if (d < radius) {
                repelX += awayX / Math.max(d, 0.1) * (radius - d) / radius;
                repelZ += awayZ / Math.max(d, 0.1) * (radius - d) / radius;
            }
        }
        moveX += 0.2 * repelX;
        moveZ += 0.2 * repelZ;
        const moveLength = Math.hypot(moveX, moveZ) || 1;
        moveX /= moveLength;
        moveZ /= moveLength;

        const interact = target === lamp && distance(lamp.pos, p.pos) <= T.interact_radius && p.carried > 0;
        const frame = {
            tick: g.tick,
            move: interact ? [0, 0] : [moveX, moveZ],
            cam_yaw_deg: 0,
            interact,
            pulse: nearestThreat <= 4.5 && p.carried >= T.pulse_cost,
            dash: nearestThreat <= 3.2,
        };
        frames.push(frame);
        const events = step(g, frame);
        rows.push(...events);
        if (g.tick % 30 === 0 || g.state !== 'playing') rows.push(snapshot(g));
    }
    rows.push({ type: 'end', ticks: g.tick, state: g.state, score: g.score });
    return { g, frames, rows };
}

function eventSummary(rows) {
    const events = rows.filter(row => row.type === 'event');
    const count = name => events.filter(row => row.name === name).length;
    return {
        state: rows.at(-1).state,
        ticks: rows.at(-1).ticks,
        score: rows.at(-1).score,
        lit: rows.filter(row => row.type === 'snapshot').at(-1).lanterns.filter(lamp => lamp.lit).length,
        pickups: count('mote_picked'),
        shadeHits: events.filter(row => row.name === 'player_hit' && row.data.by === 'shade').length,
        falls: events.filter(row => row.name === 'player_hit' && row.data.by === 'fall').length,
        pulses: count('pulse'),
        dashes: count('dash'),
        hits: events.filter(row => row.name === 'player_hit').map(row => ({ tick: row.tick, ...row.data })),
    };
}

export function diagnoseCampaign(seed = 12) {
    const original = fullPlaythrough(seed);
    const evasive = evasiveNightOne(seed);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'nearest-only-inputs.json'), JSON.stringify({ frames: original.frames }, null, 2));
    fs.writeFileSync(path.join(output, 'nearest-only-trace.jsonl'), original.rows.map(row => JSON.stringify(row)).join('\n') + '\n');
    fs.writeFileSync(path.join(output, 'evasive-inputs.json'), JSON.stringify({ frames: evasive.frames }, null, 2));
    fs.writeFileSync(path.join(output, 'evasive-trace.jsonl'), evasive.rows.map(row => JSON.stringify(row)).join('\n') + '\n');
    const summary = {
        seed,
        evidenceType: 'deterministic, state-observing simulation input drivers; not browser or human play',
        nearestOnly: eventSummary(original.rows),
        evasiveNightOne: eventSummary(evasive.rows),
        interpretation: 'The nearest-only driver did not use pulse or dash and lost to shade contacts. The evasive driver won Night 1 on the same seed. This diagnoses controller strategy only; it does not establish a full-campaign human victory or prove balance.',
    };
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    fs.writeFileSync(path.join(output, 'README.md'), `# Campaign controller diagnosis\n\nSeed: \`${seed}\`. This is deterministic simulation evidence from legal input drivers that inspect simulation state. It is not a browser replay or human campaign result.\n\n| Driver | Result | Details |\n|---|---|---|\n| Nearest-only baseline | ${summary.nearestOnly.state} | tick ${summary.nearestOnly.ticks}; ${summary.nearestOnly.lit}/5 lanterns; ${summary.nearestOnly.shadeHits} shade hits; ${summary.nearestOnly.pulses} pulses; ${summary.nearestOnly.dashes} dashes |\n| Evasive Night 1 | ${summary.evasiveNightOne.state} | tick ${summary.evasiveNightOne.ticks}; ${summary.evasiveNightOne.lit}/5 lanterns; ${summary.evasiveNightOne.shadeHits} shade hits; ${summary.evasiveNightOne.pulses} pulses; ${summary.evasiveNightOne.dashes} dashes; ${summary.evasiveNightOne.hits.at(-1)?.flames ?? 'n/a'} flames after the last hit |\n\nThe baseline follows the nearest mote/lantern and never uses defensive actions. The evasive driver blends a threat-away vector into its target movement, pulses when a threat is within 4.5 m and the player can pay the 3-mote cost, and dashes when a threat is within 3.2 m. The evasive driver shows that Night 1 can be won by a legal simulation controller on this seed. Night 2/3 normal-enemy completion, browser visibility, and a human full-campaign victory remain unverified.\n\nSee \`summary.json\` and the paired input/JSONL files for the reproducible traces.\n`);
    return summary;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/phase2-campaign-check.js')) {
    console.log(JSON.stringify(diagnoseCampaign(), null, 2));
}
