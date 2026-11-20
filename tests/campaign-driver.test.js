import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core.js';

test('campaign victory is resolved at dawn after the required lantern threshold is met', () => {
    const g = createGame(12, { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
        time_left_s: 1 / 60, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: i < 3, fuel: 100 })) });
    step(g);
    assert.equal(g.state, 'won');
    assert.equal(g.events.at(-1).data.reason, 'dawn_survived');
    assert.equal(g.lanterns.filter(lamp => lamp.lit).length, 3);
});
