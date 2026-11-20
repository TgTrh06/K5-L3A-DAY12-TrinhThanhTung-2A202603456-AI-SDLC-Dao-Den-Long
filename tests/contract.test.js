import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGame, step, snapshot, T } from '../src/core.js';

const empty = { random_motes: false, random_shades: false };
function cli({ scenario = empty, inputs = { frames: [] }, ticks = 10, every = 1, rawScenario, rawInputs } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-contract-'));
    try {
        const s = path.join(dir, 's.json'), i = path.join(dir, 'i.json'), out = path.join(dir, 'out.jsonl');
        fs.writeFileSync(s, rawScenario ?? JSON.stringify(scenario));
        fs.writeFileSync(i, rawInputs ?? JSON.stringify(inputs));
        const p = spawnSync(process.execPath, ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', String(ticks), '--snapshot-every', String(every), '--scenario', s, '--inputs', i, '--out', out], { encoding: 'utf8' });
        const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
        return { ...p, text, rows: text.trim() ? text.trim().split('\n').map(JSON.parse) : [] };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('contract declaration equals actual runtime tuning', () => {
    assert.deepEqual(JSON.parse(fs.readFileSync('game.contract.json')).tuning, T);
});
test('zero steps: only tick-zero snapshot and mandatory final end', () => {
    const r = cli({ ticks: 0 }); assert.equal(r.status, 0);
    assert.deepEqual(r.rows.map(x => x.type), ['snapshot', 'end']);
    assert.equal(r.rows[0].tick, 0); assert.equal(r.rows[0].time_left_s, 300);
    assert.deepEqual(r.rows.at(-1), { type: 'end', ticks: 0, state: 'playing', score: 0 });
});
test('snapshots interval, N steps and time agree exactly', () => {
    const r = cli({ ticks: 11, every: 3 }); assert.equal(r.status, 0);
    assert.deepEqual(r.rows.filter(x => x.type === 'snapshot').map(x => x.tick), [0, 3, 6, 9]);
    assert.equal(r.rows.at(-1).ticks, 11);
    assert.equal(r.rows.find(x => x.tick === 9).time_left_s, 299.85);
});
test('partial frames preserve movement and yaw; edges trigger only once', () => {
    const r = cli({ ticks: 5, inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }, { tick: 1, pulse: true }, { tick: 3, move: [0, 0] }] } });
    assert.equal(r.status, 0);
    const snapshots = r.rows.filter(x => x.type === 'snapshot');
    assert.deepEqual(snapshots.map(s => s.player.pos), [[0, 0, 0], [.1, 0, 0], [.2, 0, 0], [.3, 0, 0], [.3, 0, 0], [.3, 0, 0]]);
    assert.deepEqual(r.rows.filter(x => x.name === 'pulse').map(e => e.tick), [2]);
    assert.equal(snapshots.at(-1).player.flames, 4);
});
test('setup emits no events/points; pickup-deposit-lit-win events use k+1', () => {
    const scenario = { ...empty, player: { carried: 9 }, motes: [[0, 0, 0]], lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i > 0 })) };
    const r = cli({ scenario, ticks: 120, inputs: { frames: [{ tick: 0, interact: true }] } });
    assert.equal(r.status, 0); assert.equal(r.rows[0].score, 0);
    const events = r.rows.filter(x => x.type === 'event');
    assert.deepEqual(events.map(x => [x.name, x.tick]), [['mote_picked', 1], ['deposit', 1], ['lantern_lit', 1], ['game_over', 1]]);
    assert.deepEqual(events[1].data, { lantern_id: 'L1', amount: 10, deposited: 10 });
    assert.deepEqual(r.rows.at(-1), { type: 'end', ticks: 1, state: 'won', score: 10 + 100 + 299 + 250 });
});
test('score independently counts collection, deposit and exact-second victory bonus', () => {
    const g = createGame(1, { ...empty, time_left_s: 10, player: { carried: 10 }, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [0, 0, 0], lit: i > 0 })) });
    for (let i = 0; i < 59; i++) step(g);
    step(g, { interact: true });
    assert.equal(g.tick, 60); assert.equal(g.time_left_s, 9);
    assert.equal(g.score, 100 + 9 + 5 * 50);
});
test('snapshot rounds every reported position to 3 decimal places', () => {
    const g = createGame(1, { ...empty, player: { pos: [1.23456, .12345, -2.34567] }, motes: [[1.11119, 0, 2.22229]], shades: [{ pos: [3.33339, 4.44449, 5.55559] }], lanterns: [{ id: 'L1', pos: [1.23456, 0, -9.87654] }] });
    const s = snapshot(g);
    assert.deepEqual(s.player.pos, [1.235, .123, -2.346]);
    assert.deepEqual(s.motes[0].pos, [1.111, 0, 2.222]);
    assert.deepEqual(s.shades[0].pos, [3.333, 4.444, 5.556]);
    assert.deepEqual(s.lanterns[0].pos, [1.235, 0, -9.877]);
});
for (const offset of [-.00001, 0, .00001]) {
    test(`pickup radius boundary offset ${offset}`, () => {
        const g = createGame(1, { ...empty, motes: [[T.pickup_radius + offset, 50, 0]] }); step(g);
        assert.equal(g.player.carried, offset <= 0 ? 1 : 0);
    });
    test(`interaction radius boundary offset ${offset}`, () => {
        const g = createGame(1, { ...empty, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [T.interact_radius + offset, 20, 0] }] }); step(g, { interact: true });
        assert.equal(g.lanterns[0].lit, offset <= 0);
    });
    test(`pulse radius boundary offset ${offset}`, () => {
        const g = createGame(1, { ...empty, shades: [{ id: 'S', pos: [T.pulse_radius + offset, 50, 0] }] });
        const events = step(g, { pulse: true });
        assert.deepEqual(events.find(e => e.name === 'pulse').data.stunned_ids, offset <= 0 ? ['S'] : []);
    });
    test(`shade hit radius after chase offset ${offset}`, () => {
        const g = createGame(1, { ...empty, shades: [{ pos: [T.shade_hit_radius + T.shade_speed / 60 + offset, 0, 0] }] }); step(g);
        assert.equal(g.player.flames, offset <= 0 ? 4 : 5);
    });
}
test('CLI byte determinism with scenario, held controls and action edges', () => {
    const options = { ticks: 240, every: 7, scenario: { ...empty, motes: [[0, 0, 1], [0, 0, 2]], shades: [{ id: 'shade', pos: [4, 0, 0] }] }, inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pulse: true, jump: true }, { tick: 30, pulse: false }, { tick: 60, move: [1, 0], cam_yaw_deg: 90 }, { tick: 100, move: [0, 0] }, { tick: 150, pulse: true }] } };
    const a = cli(options), b = cli(options); assert.equal(a.status, 0); assert.equal(b.status, 0); assert.equal(a.text, b.text);
    assert.ok(a.rows.some(x => x.name === 'pulse')); assert.ok(a.rows.some(x => x.name === 'mote_picked'));
});
const badInputs = [null, [], {}, { frames: null }, { frames: [{ tick: 1 }, { tick: 1 }] }, { frames: [{ tick: 2 }, { tick: 1 }] }, { frames: [{ tick: -1 }] }, { frames: [{ tick: .5 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, move: ['0', 0] }] }, { frames: [{ tick: 0, pulse: 1 }] }, { frames: [{ tick: 0, cam_yaw_deg: '0' }] }];
badInputs.forEach((inputs, n) => test(`invalid inputs ${n}: exit 2, stderr, no successful end`, () => {
    const r = cli({ inputs }); assert.equal(r.status, 2); assert.match(r.stderr, /Invalid scenario\/inputs/); assert.equal(r.rows.length, 0);
}));
for (const raw of ['{', '\uFEFF{invalid', 'true']) test(`invalid scenario text ${JSON.stringify(raw)}`, () => {
    const r = cli({ rawScenario: raw }); assert.equal(r.status, 2); assert.ok(r.stderr.trim());
});
test('malformed input JSON exits 2; BOM is accepted for valid JSON', () => {
    assert.equal(cli({ rawInputs: '{"frames":[' }).status, 2);
    assert.equal(cli({ rawInputs: '\uFEFF{"frames":[]}', rawScenario: '\uFEFF{}' }).status, 0);
});
test('dawn ends on exact configured tick and end is written once', () => {
    const r = cli({ scenario: { ...empty, time_left_s: 1 }, ticks: 100, every: 10 });
    assert.equal(r.status, 0); assert.equal(r.rows.at(-1).ticks, 60);
    assert.deepEqual(r.rows.filter(x => x.name === 'game_over').map(x => [x.tick, x.data.reason]), [[60, 'dawn']]);
    assert.equal(r.rows.filter(x => x.type === 'end').length, 1);
});
const badScenarios = [null, [], { random_motes: 0 }, { random_shades: 'false' }, { player: null }, { player: { carried: -1 } }, { player: { flames: 1.5 } }, { player: { pos: [0, 0] } }, { time_left_s: -1 }, { motes: [0] }, { shades: [{ pos: [0, 0] }] }, { shades: [{ id: 'duplicate', pos: [0, 0, 0] }, { id: 'duplicate', pos: [1, 0, 0] }] }, { lanterns: [{ id: 'L6' }] }, { lanterns: [{ id: 'L1', deposited: '10' }] }, { lanterns: [{ id: 'L1', lit: 1 }] }];
badScenarios.forEach((scenario, n) => test(`invalid scenario ${n}: exit 2 and stderr`, () => {
    const r = cli({ scenario }); assert.equal(r.status, 2); assert.ok(r.stderr.trim()); assert.equal(r.rows.length, 0);
}));
test('no input file means stationary player, no scenario uses default game', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-default-'));
    try {
        const out = path.join(dir, 'out.jsonl');
        const r = spawnSync(process.execPath, ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', '10', '--out', out], { encoding: 'utf8' });
        assert.equal(r.status, 0);
        const rows = fs.readFileSync(out, 'utf8').trim().split('\n').map(JSON.parse);
        const snapshots = rows.filter(r => r.type === 'snapshot');
        assert.deepEqual(snapshots[0].player.pos, [0, 0, 0]); assert.deepEqual(snapshots.at(-1).player.pos, [0, 0, 0]);
        assert.equal(snapshots[0].lanterns.length, 5); assert.equal(snapshots[0].motes_active, 90);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
