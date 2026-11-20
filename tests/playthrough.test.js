import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fullPlaythrough } from '../scripts/full-playthrough.js';
import { createGame, step, T } from '../src/core.js';

test('default seed12: collect from empty inventory, light all five, win with legal inputs', () => {
    const { g, rows } = fullPlaythrough(12);
    const initial = rows[0];
    assert.equal(initial.player.carried, 0); assert.equal(initial.player.flames, T.flames);
    assert.ok(initial.lanterns.every(l => !l.lit && l.deposited === 0));
    assert.equal(g.state, 'won'); assert.equal(g.lanterns.filter(l => l.lit).length, 5);
    assert.equal(new Set(rows.filter(e => e.name === 'lantern_lit').map(e => e.data.lantern_id)).size, 5);
    const picked = rows.filter(e => e.name === 'mote_picked').length;
    const deposited = rows.filter(e => e.name === 'deposit').reduce((sum, e) => sum + e.data.amount, 0);
    assert.ok(picked >= 50); assert.equal(deposited, 50);
    assert.equal(g.score, picked * 10 + 5 * 100 + Math.floor(300 - g.tick / 60) + g.player.flames * 50);
});
test('300-second safe-zone soak: full duration, spawns continue, no damage in safe zone', () => {
    const g = createGame(123, { lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }] });
    let hits = 0;
    for (let i = 0; i < 18000; i++) hits += step(g).filter(e => e.name === 'player_hit').length;
    assert.equal(g.tick, 18000); assert.equal(g.state, 'lost'); assert.equal(g.time_left_s, 0);
    assert.equal(hits, 0); assert.equal(g.shades.length, 60);
    assert.ok(g.shades.every(s => Math.hypot(s.pos[0], s.pos[2]) >= T.safe_radius - 1e-9));
    assert.equal(g.events.at(-1).data.reason, 'dawn');
});
