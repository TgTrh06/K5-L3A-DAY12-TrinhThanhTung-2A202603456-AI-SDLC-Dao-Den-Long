import test from 'node:test';
import assert from 'node:assert/strict';
import { createBenchmarkScenario } from '../src/bench-scene.js';
import { summarizeFrameTimes } from '../src/bench-metrics.js';
import { addLeaderboardEntry, rankLeaderboard, validateLeaderboardEntry } from '../src/leaderboard.js';
import { createSoakController } from '../src/soak-input.js';
import { createGame, step, T } from '../src/core.js';
import { DEFAULT_BINDINGS, readKeyboard, saveBindings, validateBindings } from '../src/input.js';

test('benchmark scene has the contract counts and is seed deterministic', () => {
    const first = createBenchmarkScenario(42), second = createBenchmarkScenario(42);
    assert.deepEqual(first, second);
    assert.equal(first.shades.length, 200);
    assert.equal(first.motes.length, 100);
    assert.deepEqual(first.lanterns.map(l => l.id), ['L1', 'L2', 'L3']);
    assert.ok(first.shades.every(shade => shade.state === 'wander'));
});

test('benchmark summary follows contract FPS and percentile formulas', () => {
    assert.deepEqual(summarizeFrameTimes([10, 20, 30, 40]), {
        avg_fps: 40, p1_low_fps: 25, frame_ms_p95: 40, frames: 4,
    });
    assert.throws(() => summarizeFrameTimes([]), /at least one/);
});

test('benchmark simulation moves wander shades without gameplay side effects', () => {
    const scenario = createBenchmarkScenario(42), game = createGame(42, scenario, 1);
    const before = game.shades[0].pos.slice(), time = game.timeLeftTicks, fuel = game.lanterns[0].fuelUnits;
    for (let i = 0; i < 60; i++) step(game, { move: [0, 0] });
    assert.notDeepEqual(game.shades[0].pos, before);
    assert.ok(game.shades.every(shade => shade.state === 'wander'));
    assert.equal(game.timeLeftTicks, time);
    assert.equal(game.lanterns[0].fuelUnits, fuel);
    assert.equal(game.motes.length, 100);
    assert.equal(game.shades.length, 200);
});

test('leaderboard validates entries, sorts by score and chronological tie, keeps top ten', () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
        name: `Player${i}`, score: i < 2 ? 500 : 1000 - i * 10,
        nights_won: 2, achieved_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, seed: i,
    }));
    const ranked = rankLeaderboard(entries);
    assert.equal(ranked.length, 10);
    assert.ok(ranked[0].score >= ranked.at(-1).score);
    const tie = rankLeaderboard([
        { name: 'Later', score: 30, nights_won: 1, achieved_at: '2026-01-02T00:00:00+02:00', seed: 1 },
        { name: 'Earlier', score: 30, nights_won: 1, achieved_at: '2026-01-01T23:00:00Z', seed: 2 },
    ]);
    assert.equal(tie[0].name, 'Later');
    assert.throws(() => validateLeaderboardEntry({ ...entries[0], name: 'bad name' }), /name/);
    assert.throws(() => validateLeaderboardEntry({ ...entries[0], achieved_at: '2026-01-01T00:00:00' }), /timezone/);
    assert.equal(addLeaderboardEntry([], entries[0]).length, 1);
});

test('soak input stream is repeatable and follows movement/action schedule', () => {
    const a = createSoakController(8), b = createSoakController(8);
    const framesA = Array.from({ length: 90 }, (_, tick) => a(tick));
    const framesB = Array.from({ length: 90 }, (_, tick) => b(tick));
    assert.deepEqual(framesA, framesB);
    assert.deepEqual(framesA[1].move, framesA[29].move);
    assert.deepEqual(framesA[30].move, framesA[59].move);
    assert.deepEqual(framesA[60].move, framesA[89].move);
    for (const frame of framesA) for (const key of ['jump', 'dash', 'pulse', 'interact']) assert.equal(typeof frame[key], 'boolean');
});

test('benchmark contract settings do not affect ordinary v1.2 simulation', () => {
    const game = createGame(12, { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false }, 1);
    const first = game.lanterns[0].fuelUnits;
    step(game, { move: [0, 0] });
    assert.equal(game.benchmark, false);
    assert.equal(game.timeLeftTicks, T.night1_duration_s * 60 - 1);
    assert.equal(game.lanterns[0].fuelUnits, first);
});

test('key remapping rejects duplicate bindings and feeds every action to the keyboard adapter', () => {
    const duplicate = { ...DEFAULT_BINDINGS, right: DEFAULT_BINDINGS.left };
    assert.equal(validateBindings(duplicate).valid, false);
    assert.equal(validateBindings({ ...DEFAULT_BINDINGS, left: 'ArrowRight' }).valid, false);
    const bindings = { ...DEFAULT_BINDINGS, left: 'KeyJ', right: 'KeyL', jump: 'KeyU', dash: 'KeyI', interact: 'KeyO', pulse: 'KeyP', pause: 'Backspace' };
    assert.equal(validateBindings(bindings).valid, true);
    const saved = new Map(), storage = { setItem: (key, value) => saved.set(key, value) };
    saveBindings(bindings, storage);
    const input = readKeyboard(new Set(['KeyJ', 'KeyU', 'KeyO']), new Set(), 0, bindings);
    assert.deepEqual(input.move, [1, 0]);
    assert.equal(input.jump, true); assert.equal(input.interact, true); assert.equal(saved.size, 1);
});
