import { createGame, step, snapshot, T } from '../src/core.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

// A state-observing test driver: issues only legal movement/button input.
// This is simulation coverage, not proof of a human/browser playthrough.
export function fullPlaythrough(seed = 12) {
    const g = createGame(seed), frames = [], rows = [snapshot(g)];
    let target;
    while (g.state === 'playing' && g.tick < 18000) {
        const p = g.player, lamps = g.lanterns.filter(l => !l.lit);
        const lamp = [...lamps].sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0];
        if (p.carried >= T.lantern_cost - lamp.deposited) target = lamp;
        else if (!target || !g.motes.includes(target)) {
            target = [...g.motes].sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos))[0];
        }
        const dx = target.pos[0] - p.pos[0], dz = target.pos[2] - p.pos[2], d = Math.hypot(dx, dz);
        const interact = distance(lamp.pos, p.pos) <= T.interact_radius && p.carried > 0 && !g.input.interact;
        const frame = { tick: g.tick, move: interact ? [0, 0] : [dx / Math.max(d, 1), dz / Math.max(d, 1)], cam_yaw_deg: 0, interact, pulse: false };
        frames.push(frame); rows.push(...step(g, frame));
        if (g.tick % 10 === 0 || g.state !== 'playing') rows.push(snapshot(g));
    }
    rows.push({ type: 'end', ticks: g.tick, state: g.state, score: g.score });
    return { g, frames, rows };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/full-playthrough.js')) {
    const dir = 'docs/evidence/phase-1-final'; fs.mkdirSync(dir, { recursive: true });
    const { g, frames, rows } = fullPlaythrough();
    fs.writeFileSync(`${dir}/full-playthrough-inputs.json`, JSON.stringify({ frames }));
    fs.writeFileSync(`${dir}/full-playthrough.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    const summary = { seed: 12, initialScenario: 'unmodified default game', driver: 'state-observing simulation input controller; NOT browser play', result: g.state, ticks: g.tick, score: g.score, lit: g.lanterns.filter(l => l.lit).length, pickups: rows.filter(r => r.name === 'mote_picked').length, hits: rows.filter(r => r.name === 'player_hit').length, flamesLeft: g.player.flames };
    fs.writeFileSync(`${dir}/full-playthrough-summary.json`, JSON.stringify(summary, null, 2));
    console.log(summary);
    assert.equal(g.state, 'won'); assert.equal(summary.lit, 5); assert.ok(summary.pickups >= 50);
}
