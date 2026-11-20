import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGame, step, snapshot, T } from '../src/core.js';

const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
function runCli({ scenario = quiet, inputs = { frames: [] }, ticks = 10, every = 1 } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1-regression-'));
    try {
        const scenarioFile = path.join(dir, 'scenario.json'), inputFile = path.join(dir, 'inputs.json'), out = path.join(dir, 'out.jsonl');
        fs.writeFileSync(scenarioFile, JSON.stringify(scenario)); fs.writeFileSync(inputFile, JSON.stringify(inputs));
        const result = spawnSync(process.execPath, ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', String(ticks), '--snapshot-every', String(every), '--scenario', scenarioFile, '--inputs', inputFile, '--out', out], { encoding: 'utf8' });
        const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
        return { ...result, text, rows: text.trim() ? text.trim().split('\n').map(JSON.parse) : [] };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('Phase 1 setup and public defaults remain compatible with Phase 2 standard tuning', () => {
    const g = createGame(1, { ...quiet, lanterns: [{ id: 'L2', lit: true }] });
    assert.equal(g.lanterns.length, 5); assert.equal(g.lanterns[1].lit, true);
    assert.equal(g.player.flames, 3); assert.equal(g.motes.length, 20);
    assert.equal(g.events.length, 0); assert.equal(g.score, 0); assert.equal(snapshot(g).tick, 0);
    assert.equal(T.tick_rate, 60); assert.equal(T.player_speed, 6); assert.equal(T.carry_capacity, 10);
});

test('Phase 1 movement/yaw behavior and fixed-tick clock remain deterministic', () => {
    const diagonal = (10 + 56 * 6 / Math.sqrt(2)) / 60;
    for (const [move, yaw, expected] of [
        [[0, 1], 0, [0, 5.75]], [[0, 1], 90, [5.75, 0]], [[1, 1], 0, [diagonal, diagonal]],
    ]) {
        const g = createGame(1, quiet);
        for (let i = 0; i < 60; i++) step(g, { move, cam_yaw_deg: yaw });
        assert.ok(Math.abs(g.player.pos[0] - expected[0]) < 1e-9, `move ${move}, yaw ${yaw}: x=${g.player.pos[0]}`);
        assert.ok(Math.abs(g.player.pos[2] - expected[1]) < 1e-9, `move ${move}, yaw ${yaw}: z=${g.player.pos[2]}`);
        assert.equal(g.tick, 60); assert.equal(snapshot(g).time_left_s, 299);
    }
});

test('Phase 1 interaction boundaries, partial deposits and rising-edge behavior remain valid', () => {
    const g = createGame(1, { ...quiet, player: { carried: 6 }, lanterns: [
        { id: 'L1', pos: [2, 0, 0], deposited: 4 }, { id: 'L2', pos: [5, 0, 0] },
    ] });
    step(g, { interact: true });
    assert.equal(g.lanterns[0].deposited, 10); assert.equal(g.player.carried, 0); assert.equal(g.lanterns[0].lit, true);
    g.player.carried = 10; step(g, { interact: true }); assert.equal(g.lanterns[1].deposited, 0);
    step(g, { interact: false }); g.lanterns[1].pos = [0, 0, 0]; step(g, { interact: true });
    assert.equal(g.lanterns[1].deposited, 10); assert.equal(g.score, 360);
});

test('Phase 1 terminal event ordering and score remain correct with Contract 1.1 values', () => {
    const g = createGame(1, { ...quiet, time_left_s: 10, player: { carried: 9 }, motes: [[0, 0, 0]],
        lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i > 0 })) });
    step(g, { interact: true });
    assert.deepEqual(g.events.map(e => e.name), ['mote_picked', 'deposit', 'lantern_lit', 'game_over']);
    assert.equal(g.state, 'won');
    assert.equal(g.score, T.score.per_mote + T.lantern_cost * T.score.per_mote + T.score.per_lantern +
        Math.floor(g.timeLeftTicks / T.tick_rate) * T.score.per_second_left + 3 * T.score.per_flame_left);
});

test('Phase 1 hit, invulnerability, drop and pulse regression hold with the new flame/cost rules', () => {
    const hit = createGame(1, { ...quiet, player: { carried: 8, flames: 2 }, shades: [{ id: 'S1', pos: [0, 0, 0] }] });
    step(hit); assert.equal(hit.player.carried, 4); assert.equal(hit.player.flames, 1); assert.equal(hit.player.invuln, 90);
    step(hit); assert.equal(hit.player.flames, 1);
    const pulse = createGame(1, { ...quiet, player: { carried: 6 }, shades: [{ id: 'S1', pos: [0, 0, 4] }] });
    step(pulse, { pulse: true }); assert.equal(pulse.player.carried, 3);
    assert.equal(pulse.shades[0].state, 'stunned'); assert.equal(pulse.shades[0].stunTicks, 120);
});

test('Phase 1 snapshot positions retain three-decimal rounding', () => {
    const g = createGame(1, { ...quiet, player: { pos: [1.23456, .12345, -2.34567] }, motes: [[1.11119, 0, 2.22229]],
        shades: [{ id: 'S1', pos: [3.33339, 4.44449, 5.55559] }], lanterns: [{ id: 'L1', pos: [1.23456, 0, -9.87654] }] });
    const s = snapshot(g);
    assert.deepEqual(s.player.pos, [1.235, .123, -2.346]);
    assert.deepEqual(s.motes[0].pos, [1.111, 0, 2.222]);
    assert.deepEqual(s.shades[0].pos, [3.333, 4.444, 5.556]);
    assert.deepEqual(s.lanterns[0].pos, [1.235, 0, -9.877]);
});

test('Phase 1 safe-zone soak preserves safety, scheduled spawns and the configured Night 1 cap', () => {
    const g = createGame(123, { ...quiet, random_shades: true, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }] });
    let hits = 0;
    for (let i = 0; i < 18000; i++) hits += step(g).filter(e => e.name === 'player_hit').length;
    assert.equal(g.tick, 18000); assert.equal(g.state, 'lost'); assert.equal(snapshot(g).time_left_s, 0);
    assert.equal(hits, 0); assert.equal(g.shades.length, 6);
    assert.ok(g.shades.every(s => Math.hypot(s.pos[0], s.pos[2]) >= T.safe_radius - 1e-9));
    assert.equal(g.events.at(-1).data.reason, 'dawn');
});

test('Phase 1 headless output retains interval snapshots, deterministic bytes and invalid-input exit 2', () => {
    const options = { ticks: 21, every: 10, scenario: { ...quiet, player: { carried: 5 }, shades: [{ id: 'S1', pos: [4, 0, 0] }] },
        inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pulse: true }, { tick: 11, pulse: false }] } };
    const a = runCli(options), b = runCli(options);
    assert.equal(a.status, 0); assert.equal(a.text, b.text);
    assert.deepEqual(a.rows.filter(r => r.type === 'snapshot').map(r => r.tick), [0, 10, 20]);
    assert.equal(a.rows.at(-1).type, 'end'); assert.equal(a.rows.at(-1).ticks, 21);
    assert.ok(a.rows.some(r => r.name === 'pulse'));
    const invalid = runCli({ ticks: 1, scenario: { motes: [1] } });
    assert.equal(invalid.status, 2); assert.match(invalid.stderr, /Invalid scenario\/inputs/); assert.equal(invalid.rows.length, 0);
});
