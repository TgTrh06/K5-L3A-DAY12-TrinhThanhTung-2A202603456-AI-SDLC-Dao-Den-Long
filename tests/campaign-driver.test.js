import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evasiveNightOne } from '../scripts/phase2-campaign-check.js';

test('legal evasive input driver can win Night 1 on diagnostic seed 12', () => {
    const { g, rows } = evasiveNightOne(12);
    assert.equal(g.state, 'won');
    assert.equal(g.lanterns.filter(lamp => lamp.lit).length, 5);
    assert.ok(rows.filter(row => row.type === 'event').some(row => row.name === 'pulse'));
    assert.ok(rows.filter(row => row.type === 'event').some(row => row.name === 'dash'));
});
