import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGame, step, snapshot, T, NIGHT } from '../src/core.js';
import { syncEntityPosition } from '../src/visuals/world.js';

const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
function cli({ night = 1, scenario = quiet, inputs = { frames: [] }, ticks = 60, every = 10, seed = 12 } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-phase2-'));
    try {
        const s = path.join(dir, 'scenario.json'), i = path.join(dir, 'inputs.json'), out = path.join(dir, 'out.jsonl');
        fs.writeFileSync(s, JSON.stringify(scenario)); fs.writeFileSync(i, JSON.stringify(inputs));
        const result = spawnSync(process.execPath, ['src/headless.js', '--seed', String(seed), '--night', String(night), '--ticks', String(ticks), '--snapshot-every', String(every), '--scenario', s, '--inputs', i, '--out', out], { encoding: 'utf8' });
        const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
        return { ...result, text, rows: text.trim() ? text.trim().split('\n').map(JSON.parse) : [] };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('contract tuning matches the runtime and exposes v1.1 fields', () => {
    const contract = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
    assert.equal(contract.contract_version, '1.1'); assert.deepEqual(contract.tuning, T);
    for (const key of ['dash_speed', 'dash_duration_s', 'dash_cooldown_s', 'night2_duration_s', 'night3_duration_s']) assert.ok(key in contract.tuning);
});
test('standard maps use the specified lanterns, firefly counts and night durations', () => {
    assert.deepEqual([1, 2, 3].map(n => NIGHT[n].seconds), [300, 330, 360]);
    assert.deepEqual([1, 2, 3].map(n => createGame(1, quiet, n).lanterns.length), [5, 6, 7]);
    assert.deepEqual([1, 2, 3].map(n => createGame(1, quiet, n).motes.length), [20, 20, 20]);
    for (const n of [1, 2, 3]) {
        const game = createGame(1, quiet, n);
        assert.deepEqual(game.motes.map(m => m.pos), NIGHT[n].motePoints.slice(0, 20));
        assert.equal(new Set(game.motes.map(m => m.pos.join(','))).size, 20);
    }
    assert.deepEqual(NIGHT[1].lanterns[0], [0, 0, 25]);
    assert.deepEqual(NIGHT[2].islands, [[0, 0, 0], [70, 0, 0]]);
    assert.deepEqual(NIGHT[3].lanterns[0], [0, 6, 6]);
});
test('movement reaches 6 m/s in six ticks and has full air control', () => {
    const g = createGame(1, quiet);
    for (let i = 0; i < 6; i++) step(g, { move: [0, 1] });
    assert.equal(g.player.vel[2], 6);
    step(g, { move: [1, 0] }); assert.ok(g.player.vel[0] > 0); assert.equal(g.player.grounded, true);
    step(g, { move: [0, 0], jump: true }); assert.equal(g.player.grounded, false);
    step(g, { move: [1, 0], jump: false }); assert.ok(g.player.vel[0] > 0);
});
test('jump follows 7 m/s and −20 m/s²; jump input only acts on a press edge', () => {
    const g = createGame(1, quiet); step(g, { jump: true });
    assert.ok(Math.abs(g.player.vel[1] - (7 - 20 / 60)) < 1e-9);
    for (let i = 0; i < 5; i++) step(g, { jump: true });
    assert.ok(g.player.pos[1] > 0.45); assert.ok(g.player.vel[1] < 7);
});
test('dash travels 14 m/s for 12 ticks and starts a 90-tick cooldown', () => {
    const g = createGame(1, quiet);
    const first = step(g, { dash: true, move: [0, 1] });
    for (let i = 1; i < 12; i++) step(g, { dash: true, move: [0, 1] });
    assert.ok(Math.abs(g.player.pos[2] - 2.8) < 1e-9);
    assert.equal(g.player.dashCd, 79); assert.ok(first.some(e => e.name === 'dash'));
});
test('dash uses facing when stationary and does not make the player invulnerable', () => {
    const g = createGame(1, { ...quiet, player: { facing: [1, 0], pos: [0, 2, 0], grounded: false, vel: [0, 0, 0] }, shades: [{ id: 'S1', pos: [20, 2, 0], state: 'wander' }] });
    step(g, { dash: true }); assert.ok(g.player.pos[0] > 0); assert.equal(g.player.invuln, 0);
});
test('pickup uses inclusive XZ and vertical limits and respects 10-mote capacity', () => {
    const g = createGame(1, { ...quiet, player: { carried: 9 }, motes: [[1, 0, 0], [0, 1.501, 0], [1.001, 0, 0]] });
    step(g); assert.equal(g.player.carried, 10); assert.equal(g.motes.length, 2);
    const y = createGame(1, { ...quiet, player: { pos: [0, 0, 0] }, motes: [[0, 1.5, 0]] });
    step(y); assert.equal(y.player.carried, 1);
});
test('nearest lantern and ID tie-break deposit up to the remaining 10-mote cost', () => {
    const g = createGame(1, { ...quiet, player: { carried: 10 }, lanterns: [
        { id: 'L2', pos: [1, 0, 0], deposited: 5 }, { id: 'L1', pos: [-1, 0, 0], deposited: 4 },
    ] });
    step(g, { interact: true });
    assert.equal(g.lanterns.find(l => l.id === 'L1').deposited, 10); assert.equal(g.lanterns.find(l => l.id === 'L1').lit, true);
    assert.equal(g.lanterns.find(l => l.id === 'L2').deposited, 5); assert.equal(g.player.carried, 4); assert.equal(g.score, 160);
});
test('pulse costs three motes, targets 3D radius, stuns for 120 ticks and pushes 4 m', () => {
    const g = createGame(1, { ...quiet, player: { carried: 10 }, shades: [
        { id: 'S2', pos: [0, 0, 4.1] }, { id: 'S1', pos: [0, 0, 4] }, { id: 'S3', pos: [0, 7, 0] },
    ] });
    step(g, { pulse: true });
    assert.equal(g.player.carried, 7); assert.deepEqual(g.events.find(e => e.name === 'pulse').data.hit_ids, ['S1', 'S2']);
    assert.equal(g.shades[0].stunTicks, 120); assert.equal(g.score, 10);
    for (let i = 0; i < 15; i++) step(g, { pulse: false });
    assert.ok(Math.abs(g.shades[1].pos[2] - 8.1) < 1e-8);
});
test('pulse requires three motes and can refresh an already stunned target', () => {
    const g = createGame(1, { ...quiet, player: { carried: 2 }, shades: [{ pos: [0, 0, 2], state: 'stunned', state_ticks_left: 8 }] });
    step(g, { pulse: true }); assert.equal(g.player.carried, 2); assert.equal(g.player.pulseCd, 0);
    g.player.carried = 3; step(g, { pulse: false }); step(g, { pulse: true }); assert.equal(g.shades[0].stunTicks, 120);
});
test('hit drops floor(half), limits loss to one flame per tick and grants 90 tick immunity', () => {
    const g = createGame(1, { ...quiet, player: { carried: 7 }, shades: [{ id: 'S1', pos: [0, 0, 0] }, { id: 'S2', pos: [0, 0, 0] }] });
    step(g); assert.equal(g.player.flames, 2); assert.equal(g.player.carried, 4);
    assert.equal(g.events.filter(e => e.name === 'player_hit').length, 1);
    assert.equal(g.player.invuln, 90); assert.equal(g.motes.filter(m => m.kind === 'dropped').length, 3);
});
test('a newly lit safe radius pushes an inside shade out gradually over at most 30 ticks', () => {
    const g = createGame(1, { ...quiet, lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0] }], shades: [{ id: 'S1', pos: [2, 0, 0], state: 'chase' }] });
    step(g); assert.ok(g.shades[0].pos[0] > 2 && g.shades[0].pos[0] < 6); assert.equal(g.shades[0].safePushTicks, 29);
    for (let i = 0; i < 29; i++) step(g);
    assert.ok(Math.abs(g.shades[0].pos[0] - 6) < 1e-8); assert.equal(g.shades[0].safePushTicks, 0);
    assert.equal(g.player.flames, T.flames);
});
test('a fall costs one flame once, waits 60 ticks and respawns with 90 immunity', () => {
    const g = createGame(1, { ...quiet, player: { pos: [39.9, 0, 0], vel: [6, 0, 0], carried: 5 } });
    let fallAt = 0;
    for (let i = 1; i <= 180; i++) { const events = step(g); if (events.some(e => e.data?.lost)) { fallAt = i; break; } }
    assert.ok(fallAt > 60); assert.equal(g.player.flames, 2); assert.equal(g.player.carried, 0);
    for (let i = fallAt; i < fallAt + 60; i++) step(g);
    assert.deepEqual(g.player.pos, [0, 0, 0]); assert.equal(g.player.invuln, 90);
});
test('night 2 jump pad launches toward the other island and bridge stays grounded', () => {
    const pad = createGame(1, { ...quiet, player: { pos: [20, 0, 18] } }, 2);
    step(pad);
    const length = Math.hypot(50, 18);
    assert.ok(Math.abs(pad.player.vel[0] - 24 * 50 / length) < 1e-9);
    assert.ok(Math.abs(pad.player.vel[2] + 24 * 18 / length) < 1e-9);
    assert.ok(Math.abs(pad.player.vel[1] - (14 - 20 / 60)) < 1e-9); assert.equal(pad.player.padFlight, true);
    const returnPad = createGame(1, { ...quiet, player: { pos: [50, 0, -18] } }, 2); step(returnPad);
    assert.ok(Math.abs(returnPad.player.vel[0] + 24 * 50 / length) < 1e-9);
    assert.ok(Math.abs(returnPad.player.vel[2] - 24 * 18 / length) < 1e-9);
    const bridge = createGame(1, { ...quiet, player: { pos: [35, 0, 0] } }, 2); step(bridge);
    assert.equal(bridge.player.grounded, true); assert.equal(bridge.player.pos[1], 0);
});
test('night 3 has upper tiers, ramps and seeded wind forecast', () => {
    const tier = createGame(1, { ...quiet, player: { pos: [0, 6, 0] } }, 3); step(tier);
    assert.equal(tier.player.pos[1], 6); assert.equal(NIGHT[3].motePoints.length, 30);
    const ramp = createGame(1, { ...quiet, player: { pos: [24.25, 1, 14] } }, 3); step(ramp);
    assert.ok(ramp.player.pos[1] > 0);
    const startAlong = 29.8, rampAngle = Math.PI / 6;
    const climbing = createGame(1, { ...quiet, player: { pos: [startAlong * Math.cos(rampAngle), (30 - startAlong) / 2, startAlong * Math.sin(rampAngle)] } }, 3);
    for (let i = 0; i < 6; i++) step(climbing, { move: [0, 1], cam_yaw_deg: 240 });
    assert.ok(climbing.player.pos[1] > 0.2, 'ground movement should follow the ramp instead of falling off it');
    const a = createGame(42, { random_shades: false }, 3), b = createGame(42, { random_shades: false }, 3);
    for (let i = 0; i < 1680; i++) { step(a); step(b); }
    assert.deepEqual(snapshot(a).wind, snapshot(b).wind); assert.equal(snapshot(a).wind.active, false);
});
test('mote respawn chooses an unoccupied point at the scheduled tick', () => {
    const g = createGame(1, { random_shades: false, random_drifters: false, wind_enabled: false });
    for (let i = 0; i < T.mote_spawn_ticks; i++) step(g);
    assert.equal(g.events.filter(e => e.name === 'mote_spawned').length, 1);
    const spawned = g.events.find(e => e.name === 'mote_spawned').data.pos;
    assert.ok(!g.motes.slice(0, 20).some(m => Math.hypot(m.pos[0] - spawned[0], m.pos[2] - spawned[2]) < 0.01));
});
test('shade wander moves deterministically, then chase uses each night speed', () => {
    const wander = createGame(3, { ...quiet, shades: [{ id: 'S1', pos: [37, 0, 0], state: 'wander' }] });
    const initial = [...wander.shades[0].pos]; step(wander);
    assert.equal(wander.shades[0].state, 'wander');
    assert.ok(Math.abs(Math.hypot(wander.shades[0].pos[0] - initial[0], wander.shades[0].pos[2] - initial[2]) - T.shade_speed / 60) < 1e-9);
    const chase1 = createGame(1, { ...quiet, shades: [{ id: 'S1', pos: [10, 0, 0], state: 'wander' }] }); step(chase1);
    assert.equal(chase1.shades[0].state, 'chase'); assert.ok(Math.abs(chase1.shades[0].pos[0] - (10 - T.shade_speed / 60)) < 1e-9);
    const chase3 = createGame(1, { ...quiet, shades: [{ id: 'S1', pos: [10, 0, 0], state: 'wander' }] }, 3); step(chase3);
    assert.equal(chase3.shades[0].state, 'chase'); assert.ok(Math.abs(chase3.shades[0].pos[0] - (10 - T.night3_shade_speed / 60)) < 1e-9);
});
test('scheduled shade spawns use seeded legal points on all nights', () => {
    for (const [night, tick, expected] of [[1, 300, 2], [2, 420, 1], [3, 360, 1]]) {
        const g = createGame(12, { random_motes: false, random_drifters: false, wind_enabled: false }, night), spawned = [];
        for (let i = 0; i < tick; i++) spawned.push(...step(g).filter(e => e.name === 'shade_spawned'));
        assert.equal(spawned.length, expected, `night ${night} spawn count`);
        assert.deepEqual(spawned.map(e => e.data.id), Array.from({ length: expected }, (_, i) => `S${i + 1}`));
        for (const event of spawned) {
            assert.ok(NIGHT[night].shadePoints.some(pos => Math.hypot(pos[0] - event.data.pos[0], pos[2] - event.data.pos[2]) < 1e-9));
            assert.ok(Math.hypot(event.data.pos[0], event.data.pos[2]) >= 15);
        }
    }
    const night1 = createGame(12, { random_motes: false, random_drifters: false, wind_enabled: false });
    let later = [];
    for (let i = 0; i < 780; i++) later.push(...step(night1).filter(e => e.name === 'shade_spawned'));
    assert.equal(later.length, 3); assert.equal(later.at(-1).data.id, 'S3');
});
test('scheduled drifters spawn at 1200-tick intervals and stay under the two-creature cap', () => {
    const g = createGame(12, { random_motes: false, random_shades: false, wind_enabled: false }, 2), spawned = [];
    for (let i = 0; i < 3600; i++) spawned.push(...step(g).filter(e => e.name === 'drifter_spawned'));
    assert.deepEqual(spawned.map(e => e.tick), [1200, 2400]);
    assert.deepEqual(spawned.map(e => e.data.id), ['D1', 'D2']);
    assert.equal(g.drifters.length, T.drifter_cap);
    for (const d of g.drifters) assert.ok(NIGHT[2].islands.some(c => Math.hypot(d.pos[0] - c[0], d.pos[2] - c[2]) <= NIGHT[2].islandRadius));
});
test('drifter idle and chase states move at their specified speeds', () => {
    const idle = createGame(1, { ...quiet, drifters: [{ id: 'D1', pos: [0, 0, 10], state: 'idle' }] }, 2);
    step(idle); assert.equal(idle.drifters[0].state, 'idle'); assert.ok(Math.abs(idle.drifters[0].pos[2] - (10 - T.drifter_idle_speed / 60)) < 1e-9);
    const chase = createGame(1, { ...quiet, player: { carried: 5 }, drifters: [{ id: 'D1', pos: [10, 0, 0], state: 'idle' }] }, 2);
    step(chase); assert.equal(chase.drifters[0].state, 'chase'); assert.ok(Math.abs(chase.drifters[0].pos[0] - (10 - T.drifter_speed / 60)) < 1e-9);
    const flee = createGame(1, { ...quiet, drifters: [{ id: 'D1', pos: [10, 0, 0], state: 'flee', state_ticks_left: 240 }] }, 2);
    step(flee); assert.equal(flee.drifters[0].state, 'flee'); assert.ok(Math.abs(flee.drifters[0].pos[0] - (10 + T.drifter_speed / 60)) < 1e-9);
});
test('renderer adapter tracks entity positions and keeps a pulse-dismissed drifter visible through its delay', () => {
    const object = { visible: false, position: { x: 0, y: 0, z: 0, fromArray(pos) { [this.x, this.y, this.z] = pos; } } };
    const entity = { pos: [2, 3, 4], state: 'idle' };
    syncEntityPosition(object, entity, 1.25); assert.deepEqual([object.position.x, object.position.y, object.position.z], [2, 4.25, 4]); assert.equal(object.visible, true);
    entity.pos = [5, 6, 7]; entity.state = 'removed'; entity.stateTicksLeft = 120; syncEntityPosition(object, entity, 1.25);
    assert.deepEqual([object.position.x, object.position.y, object.position.z], [5, 7.25, 7]); assert.equal(object.visible, true);
    entity.stateTicksLeft = 0; syncEntityPosition(object, entity, 1.25); assert.equal(object.visible, false);
});
test('drifter steals up to three, flees, and pulse returns stolen motes', () => {
    const g = createGame(1, { ...quiet, player: { carried: 8 }, drifters: [{ id: 'D1', pos: [1, 0, 0], state: 'chase' }] }, 2);
    step(g); assert.equal(g.player.carried, 5); assert.equal(g.drifters[0].stolen, 3);
    assert.ok(g.events.some(e => e.name === 'drifter_steal' && e.data.amount === 3));
    g.player.pos = [...g.drifters[0].pos]; g.player.carried = 3; step(g, { pulse: true });
    assert.ok(g.events.some(e => e.name === 'drifter_drop' && e.data.amount === 3));
    assert.equal(g.drifters.length, 1); assert.equal(g.drifters[0].state, 'removed'); assert.equal(g.drifters[0].stateTicksLeft, 120);
    assert.equal(g.motes.filter(m => m.owner === 'D1').length, 3);
    for (let i = 0; i < 119; i++) step(g);
    assert.equal(g.drifters.length, 1); assert.equal(g.drifters[0].stateTicksLeft, 1);
    step(g); assert.equal(g.drifters.length, 0);
});
test('charm pickup lasts 600 ticks and allows repeated dash activations', () => {
    const g = createGame(1, { ...quiet, charms: [{ id: 'C1', pos: [0, 0, 0] }] }, 2);
    step(g); assert.equal(g.player.charm, 600); assert.equal(g.charms[0].available, false);
    step(g, { dash: true }); const firstCd = g.player.dashCd;
    for (let i = 0; i < 12; i++) step(g, { dash: true });
    step(g, { dash: false }); step(g, { dash: true }); assert.equal(firstCd, 0); assert.equal(g.player.dashCd, 0);
});
test('pause advances wall tick only; resume restarts deterministic simulation tick', () => {
    const g = createGame(1, quiet); step(g); const time = g.timeLeftTicks;
    step(g, { pause: true }); assert.equal(g.state, 'paused'); assert.equal(g.tick, 2); assert.equal(g.simTick, 1);
    for (let i = 0; i < 30; i++) step(g, { pause: false });
    assert.equal(g.tick, 32); assert.equal(g.simTick, 1); assert.equal(g.timeLeftTicks, time);
    step(g, { pause: true }); assert.equal(g.state, 'playing'); assert.equal(g.simTick, 1);
    step(g, { pause: false }); assert.equal(g.simTick, 2);
});
test('victory precedence, integer-tick clock and score use standardized formula', () => {
    const g = createGame(1, { ...quiet, time_left_s: 1 / 60, player: { carried: 10, flames: 2 }, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: i > 0, pos: [0, 0, 0] })) });
    step(g, { interact: true }); assert.equal(g.state, 'won'); assert.equal(g.events.at(-1).data.reason, 'all_lit');
    assert.equal(g.score, 100 + 100 + 2 * 50);
    const time = createGame(1, { ...quiet, time_left_s: 1 / 60 }); step(time); assert.equal(time.state, 'lost');
});
test('snapshot contains required v1.1 state and rounds positions to three decimals', () => {
    const s = snapshot(createGame(1, quiet, 3));
    assert.equal(s.night, 3); assert.deepEqual(s.wind, { active: false, dir_deg: 0 });
    for (const key of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(key in s.player);
    for (const key of ['motes', 'drifters', 'charms']) assert.ok(Array.isArray(s[key]));
    assert.ok('ttl_s' in s.motes[0]);
});
test('CLI accepts all nights, emits v1.1 and is byte deterministic with action inputs', () => {
    const scenario = { ...quiet, player: { carried: 10 }, shades: [{ id: 'S1', pos: [4, 0, 0] }] };
    const options = { night: 3, scenario, ticks: 80, inputs: { frames: [{ tick: 0, dash: true, move: [0, 1] }, { tick: 12, dash: false }, { tick: 20, pulse: true }] } };
    const a = cli(options), b = cli(options); assert.equal(a.status, 0); assert.equal(a.text, b.text);
    assert.equal(a.rows[0].night, 3); assert.deepEqual(a.rows.at(-1).type, 'end');
    assert.ok(a.rows.some(r => r.name === 'dash')); assert.ok(a.rows.some(r => r.name === 'pulse'));
    for (const n of [1, 2, 3]) assert.equal(cli({ night: n, ticks: 0 }).status, 0);
});
test('CLI rejects malformed scenario/input and invalid night with clear exit codes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-invalid-'));
    try {
        const s = path.join(dir, 's.json'), i = path.join(dir, 'i.json'), out = path.join(dir, 'o');
        fs.writeFileSync(s, '{'); fs.writeFileSync(i, '{"frames":[]}');
        const run = night => spawnSync(process.execPath, ['src/headless.js', '--seed', '1', '--night', String(night), '--ticks', '1', '--scenario', s, '--inputs', i, '--out', out], { encoding: 'utf8' });
        assert.equal(run(1).status, 2); fs.writeFileSync(s, '{}'); assert.equal(run(4).status, 1);
        fs.writeFileSync(i, '{"frames":[{"tick":0,"dash":1}]}'); assert.equal(run(1).status, 2);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('full headless night stays deterministic under the 30-second limit target', () => {
    const start = performance.now(), a = cli({ night: 2, ticks: 19800, every: 19800 }), b = cli({ night: 2, ticks: 19800, every: 19800 });
    assert.equal(a.status, 0); assert.equal(a.text, b.text); assert.ok(performance.now() - start < 30000);
});
