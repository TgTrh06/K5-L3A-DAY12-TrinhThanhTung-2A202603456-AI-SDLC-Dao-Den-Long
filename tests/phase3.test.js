import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createGame, step, snapshot, T, NIGHT } from '../src/core.js';

const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const lamp = (id, pos, extra = {}) => ({ id, pos, ...extra });
function runCli(scenario, ticks = 60) {
    const dir = fs.mkdtempSync(path.join(process.cwd(), '.tmp-phase3-'));
    try {
        const scenarioFile = path.join(dir, 'scenario.json'), out = path.join(dir, 'out.jsonl');
        fs.writeFileSync(scenarioFile, JSON.stringify(scenario));
        const result = spawnSync(process.execPath, ['src/headless.js', '--seed', '7', '--night', '1', '--ticks', String(ticks), '--snapshot-every', String(ticks), '--scenario', scenarioFile, '--out', out], { encoding: 'utf8' });
        const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
        return { ...result, rows: text.trim() ? text.trim().split('\n').map(JSON.parse) : [] };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('Contract 1.3 preserves v1.2 tuning and night durations', () => {
    const contract = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
    assert.equal(contract.contract_version, '1.3');
    assert.equal(typeof contract.bench_cmd, 'string'); assert.equal(typeof contract.soak_cmd, 'string');
    assert.deepEqual(contract.tuning, T);
    assert.deepEqual([1, 2, 3].map(night => NIGHT[night].seconds), [240, 270, 300]);
});

test('lantern state initializes fuel units, ever-lit history and dynamic player capacity', () => {
    const g = createGame(1, { ...quiet, player: { successful_lights: 3 }, lanterns: [
        lamp('L1', [0, 0, 0], { lit: true }),
        lamp('L2', [2, 0, 0], { lit: true, fuel: 21.2, ever_lit: false, relit_count: 2 }),
        lamp('L3', [3, 0, 0], { fuel: 88 }),
    ] });
    assert.equal(g.lanterns.find(item => item.id === 'L1').fuelUnits, 6000);
    assert.equal(g.lanterns.find(item => item.id === 'L1').everLit, true);
    assert.equal(g.lanterns.find(item => item.id === 'L2').fuelUnits, 1272);
    assert.equal(g.lanterns.find(item => item.id === 'L2').everLit, false);
    assert.equal(g.lanterns.find(item => item.id === 'L3').fuelUnits, 0);
    assert.equal(snapshot(g).player.capacity, 16);
    assert.deepEqual(snapshot(g).lanterns.slice(0, 3).map(item => item.fuel), [100, 21.2, 0]);
});

test('new light consumes ten motes, awards v1.2 score and grows capacity', () => {
    const g = createGame(1, { ...quiet, player: { carried: 10 }, lanterns: [lamp('L1', [0, 0, 0])] });
    step(g, { interact: true });
    const l = g.lanterns[0];
    assert.equal(l.lit, true); assert.equal(l.fuelUnits, 6000); assert.equal(l.everLit, true);
    assert.equal(l.deposited, 10); assert.equal(g.player.carried, 0);
    assert.equal(g.player.successfulLights, 1); assert.equal(snapshot(g).player.capacity, 12);
    assert.equal(g.score, 150);
    assert.deepEqual(g.events.filter(e => ['deposit', 'lantern_lit'].includes(e.name)).map(e => e.name), ['deposit', 'lantern_lit']);
    assert.equal(g.state, 'playing', 'lighting every lamp no longer ends a night early');
});

test('all lanterns lit early do not end the night before dawn', () => {
    const g = createGame(1, { ...quiet, time_left_s: 10, lanterns: Array.from({ length: 5 }, (_, i) =>
        lamp(`L${i + 1}`, [i, 0, 0], { lit: true })) });
    step(g);
    assert.equal(g.state, 'playing'); assert.equal(g.lanterns.filter(item => item.lit).length, 5);
    assert.equal(g.events.some(event => event.name === 'game_over'), false);
});

test('dynamic carry capacity changes collection limit and resets on a new night', () => {
    const motes = Array.from({ length: 20 }, () => [0, 0, 0]);
    const expanded = createGame(1, { ...quiet, player: { successful_lights: 5 }, motes });
    step(expanded); assert.equal(expanded.player.carried, 20); assert.equal(snapshot(expanded).player.capacity, 20);
    const nextNight = createGame(1, { ...quiet }, 2);
    assert.equal(nextNight.player.successfulLights, 0); assert.equal(snapshot(nextNight).player.capacity, 10);
});

test('picking up motes does not score before they are loaded into a lantern', () => {
    const g = createGame(1, { ...quiet, motes: [[0, 0, 0]], player: { carried: 9 }, lanterns: [lamp('L1', [0, 0, 0])] });
    step(g);
    assert.equal(g.player.carried, 10); assert.equal(g.score, 0);
});

test('refueling rounds up required motes, caps fuel and scores only loaded motes', () => {
    const g = createGame(1, { ...quiet, player: { carried: 3 }, lanterns: [
        lamp('L1', [0, 0, 0], { lit: true, fuel: 81.1 }),
    ] });
    step(g, { interact: true });
    assert.equal(g.lanterns[0].fuelUnits, 6000);
    assert.equal(g.player.carried, 1);
    assert.equal(g.score, 10, 'two motes are used after 1/60 fuel decay; unused carried motes remain');
    assert.ok(g.events.some(e => e.name === 'refuel' && e.data.amount === 2));
});

test('full lamp is not selected and does not emit a refuel or score event', () => {
    const g = createGame(1, { ...quiet, player: { carried: 5 }, lanterns: [
        lamp('L1', [0, 0, 0], { lit: true, fuel: 100 }),
        lamp('L2', [1, 0, 0], { lit: true, fuel: 90 + 1 / 60 }),
    ] });
    step(g, { interact: true });
    assert.equal(g.lanterns.find(item => item.id === 'L1').fuelUnits, 5999);
    assert.equal(g.lanterns.find(item => item.id === 'L2').fuelUnits, 6000);
    assert.equal(g.player.carried, 4); assert.equal(g.score, 5);
    assert.equal(g.events.filter(e => e.name === 'refuel').length, 1);
    assert.equal(g.events.find(e => e.name === 'refuel').data.lantern_id, 'L2');
});

test('ever-lit lamp relights with five motes for forty bonus points', () => {
    const g = createGame(1, { ...quiet, player: { carried: 5 }, lanterns: [
        lamp('L1', [0, 0, 0], { ever_lit: true, relit_count: 1 }),
    ] });
    step(g, { interact: true });
    assert.equal(g.lanterns[0].lit, true); assert.equal(g.lanterns[0].fuelUnits, 6000);
    assert.equal(g.lanterns[0].relitCount, 2); assert.equal(g.player.successfulLights, 1);
    assert.equal(g.score, 65);
    assert.equal(g.events.find(e => e.name === 'lantern_lit').data.relight, true);
});

test('fuel decays exactly 1/60 per tick and extinguishes at zero', () => {
    const g = createGame(1, { ...quiet, time_left_s: 2, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 1 })] });
    for (let i = 0; i < 59; i++) step(g);
    assert.equal(g.lanterns[0].fuelUnits, 1); assert.equal(g.lanterns[0].lit, true);
    step(g);
    assert.equal(g.lanterns[0].lit, false); assert.equal(g.lanterns[0].fuelUnits, 0);
    assert.equal(g.lanterns[0].deposited, 0); assert.equal(g.lanterns[0].everLit, true);
    assert.ok(g.events.some(e => e.name === 'lantern_out' && e.data.lantern_id === 'L1'));
});

test('wander shades target the nearest weak lamp, drain while stationary and report every 60 ticks', () => {
    const g = createGame(1, { ...quiet, player: { pos: [25, 0, 0] }, lanterns: [
        lamp('L1', [0, 0, 0], { lit: true, fuel: 29.1 }),
        lamp('L2', [12, 0, 0], { lit: true, fuel: 29 }),
    ], shades: [{ id: 'S1', pos: [1, 0, 0], state: 'wander' }] });
    const start = [...g.shades[0].pos]; step(g);
    assert.equal(g.shades[0].state, 'drain'); assert.equal(g.shades[0].targetLanternId, 'L1');
    assert.deepEqual(g.shades[0].pos, start);
    assert.equal(g.lanterns[0].fuelUnits, 1745, 'a shade entering drain starts siphoning on the following fuel phase');
    for (let i = 1; i < 60; i++) step(g);
    const drainEvent = g.events.find(e => e.name === 'fuel_drain');
    assert.deepEqual(drainEvent?.data, { lantern_id: 'L1', shade_id: 'S1', fuel: 23.2 });
});

test('drain pursuit breaks into chase when Mây comes within six metres', () => {
    const g = createGame(1, { ...quiet, player: { pos: [5, 0, 0] }, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 20 })],
        shades: [{ id: 'S1', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }] });
    step(g); assert.equal(g.shades[0].state, 'chase'); assert.equal(g.shades[0].targetLanternId, null);
});

test('a shade returns to wander when its stun expires', () => {
    const g = createGame(1, { ...quiet, player: { pos: [20, 0, 0] },
        shades: [{ id: 'S1', pos: [1, 0, 0], state: 'stunned', state_ticks_left: 1, target_lantern_id: 'L1' }] });
    step(g);
    assert.equal(g.shades[0].state, 'wander');
    assert.equal(g.shades[0].targetLanternId, null);
});

test('refueling a weak lamp above thirty pushes a nearby draining shade without damage', () => {
    const g = createGame(1, { ...quiet, player: { pos: [1, 0, 0], carried: 2 }, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 29 })],
        shades: [{ id: 'S1', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }] });
    step(g, { interact: true });
    assert.ok(g.lanterns[0].fuelUnits >= 30 * 60);
    assert.equal(g.shades[0].state, 'chase'); assert.equal(g.shades[0].targetLanternId, null);
    assert.ok(g.shades[0].safePushTicks > 0); assert.equal(g.player.flames, T.flames);
});

test('headless v1.2 accepts fuel/drain scenarios and serializes their state and event fields', () => {
    const result = runCli({ ...quiet, time_left_s: 3, player: { pos: [25, 0, 0], successful_lights: 3 }, lanterns: [
        lamp('L1', [0, 0, 0], { lit: true, fuel: 29.1 }), lamp('L2', [10, 0, 0], { lit: true }),
    ], shades: [{ id: 'S1', pos: [1, 0, 0], state: 'wander', target_lantern_id: null }] });
    assert.equal(result.status, 0, result.stderr);
    const initial = result.rows[0], final = result.rows.find(row => row.type === 'snapshot' && row.tick === 60);
    assert.equal(initial.player.capacity, 16); assert.equal(initial.lanterns[0].fuel, 29.1);
    assert.equal(initial.lanterns[1].fuel, 100); assert.equal(initial.lanterns[1].ever_lit, true);
    assert.equal(final.shades[0].state, 'drain'); assert.equal(final.shades[0].target_lantern_id, 'L1');
    const drained = result.rows.find(row => row.name === 'fuel_drain');
    assert.deepEqual(drained.data, { lantern_id: 'L1', shade_id: 'S1', fuel: 23.2 });
    assert.equal(result.rows.at(-1).type, 'end');
});

test('weak-lamp safety boundary is inclusive at 30 and expires below 30', () => {
    const safe = createGame(1, { ...quiet, player: { pos: [20, 0, 0] }, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 30 + 1 / 60 })], shades: [{ id: 'S1', pos: [1, 0, 0], state: 'wander' }] });
    step(safe);
    assert.notEqual(safe.shades[0].state, 'drain');
    assert.ok(safe.shades[0].safePushTicks > 0);
    const weak = createGame(1, { ...quiet, player: { pos: [20, 0, 0] }, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 29 })], shades: [{ id: 'S1', pos: [1, 0, 0], state: 'wander' }] });
    step(weak);
    assert.equal(weak.shades[0].state, 'drain');
});

test('drain shades aggregate fuel loss and pulse awards fifteen for a draining target', () => {
    const g = createGame(1, { ...quiet, player: { carried: 3, pos: [2, 0, 0] }, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 50 })], shades: [
        { id: 'S1', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' },
        { id: 'S2', pos: [-1, 0, 0], state: 'drain', target_lantern_id: 'L1' },
    ] });
    step(g, { pulse: true });
    assert.equal(g.shades[0].state, 'stunned'); assert.equal(g.shades[1].state, 'stunned');
    assert.equal(g.score, 30);
    const decay = createGame(1, { ...quiet, player: { pos: [20, 0, 0] }, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 50 })], shades: [
        { id: 'S1', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' },
        { id: 'S2', pos: [-1, 0, 0], state: 'drain', target_lantern_id: 'L1' },
    ] });
    step(decay);
    assert.equal(decay.lanterns[0].fuelUnits, 50 * 60 - 11, 'normal decay plus two shade drains');
});

test('dawn victory requires the 60 percent threshold and awards fuel/flame score only', () => {
    for (const [night, expected] of [[1, 3], [2, 4], [3, 5]]) {
        const count = NIGHT[night].lanterns.length;
        const scenario = { ...quiet, time_left_s: 1 / 60, player: { flames: 2 }, lanterns: Array.from({ length: count }, (_, index) =>
            lamp(`L${index + 1}`, NIGHT[night].lanterns[index], { lit: index < expected, fuel: index < expected ? 40.7 : 0 })) };
        const g = createGame(1, scenario, night); step(g);
        assert.equal(g.state, 'won', `night ${night}`);
        assert.equal(g.events.at(-1).data.reason, 'dawn_survived');
        assert.equal(g.score, expected * (50 + 40) + 2 * 50);
    }
});

test('dawn below threshold loses and no_flames has priority on the dawn tick', () => {
    const under = createGame(1, { ...quiet, time_left_s: 1 / 60, lanterns: [lamp('L1', [0, 0, 0], { lit: true, fuel: 50 }), lamp('L2', [1, 0, 0], { lit: true, fuel: 50 })] });
    step(under); assert.equal(under.state, 'lost'); assert.equal(under.events.at(-1).data.reason, 'dawn');
    const fatal = createGame(1, { ...quiet, time_left_s: 1 / 60, player: { flames: 1 }, lanterns: Array.from({ length: 5 }, (_, i) => lamp(`L${i + 1}`, [20 + i, 0, 0], { lit: i < 3, fuel: i < 3 ? 50 : 0 })), shades: [{ id: 'S1', pos: [0, 0, 0] }] });
    step(fatal); assert.equal(fatal.state, 'lost'); assert.equal(fatal.events.at(-1).data.reason, 'no_flames');
});
