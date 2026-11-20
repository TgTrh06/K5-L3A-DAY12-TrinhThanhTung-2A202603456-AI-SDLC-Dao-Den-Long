import fs from 'node:fs';
import { createGame, step, snapshot } from './core.js';
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = value => typeof value === 'number' && Number.isFinite(value);
const integer = value => Number.isInteger(value) && value >= 0;
const vector = (value, length) => Array.isArray(value) && value.length === length && value.every(number);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 32;
function validateScenario(s, inputs) {
    if (!object(s) || !object(inputs) || !Array.isArray(inputs.frames)) fail('scenario/inputs must be objects; inputs.frames must be an array');
    for (const key of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (key in s && typeof s[key] !== 'boolean') fail(key);
    if (s.player !== undefined) {
        if (!object(s.player)) fail('player');
        for (const key of ['pos', 'vel', 'facing']) if (key in s.player && !vector(s.player[key], key === 'facing' ? 2 : 3)) fail(`player.${key}`);
        for (const key of ['carried', 'flames', 'successful_lights', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) if (key in s.player && !integer(s.player[key])) fail(`player.${key}`);
    }
    if ('time_left_s' in s && (!number(s.time_left_s) || s.time_left_s < 0)) fail('time_left_s');
    if ('motes' in s && (!Array.isArray(s.motes) || !s.motes.every(m => vector(m, 3) || (object(m) && vector(m.pos, 3) && (m.id === undefined || validId(m.id)) && ['random', 'dropped'].includes(m.kind ?? 'random'))))) fail('motes');
    for (const [key, states] of [['shades', ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain']], ['drifters', ['idle', 'chase', 'flee']]]) {
        if (key in s && (!Array.isArray(s[key]) || !s[key].every(x => object(x) && vector(x.pos, 3) && (x.id === undefined || validId(x.id)) && (x.state === undefined || states.includes(x.state)) && (x.state_ticks_left === undefined || integer(x.state_ticks_left))))) fail(key);
        if (key in s) { const ids = s[key].map(x => x.id).filter(Boolean); if (new Set(ids).size !== ids.length) fail(`duplicate ${key} id`); }
        if (key === 'shades' && key in s && !s[key].every(x => x.target_lantern_id === undefined || x.target_lantern_id === null || /^L[1-7]$/.test(x.target_lantern_id))) fail('shades.target_lantern_id');
    }
    if ('charms' in s && (!Array.isArray(s.charms) || !s.charms.every(x => object(x) && (x.pos === undefined || vector(x.pos, 3)) && (x.available === undefined || typeof x.available === 'boolean') && (x.respawn_ticks === undefined || integer(x.respawn_ticks))))) fail('charms');
    if ('lanterns' in s) {
        if (!Array.isArray(s.lanterns)) fail('lanterns'); const ids = new Set();
        for (const l of s.lanterns) {
            if (!object(l) || !/^L[1-7]$/.test(l.id) || ids.has(l.id)) fail('lantern id'); ids.add(l.id);
            if ('pos' in l && !vector(l.pos, 3)) fail('lantern.pos');
            if ('deposited' in l && !integer(l.deposited)) fail('deposited');
            if ('lit' in l && typeof l.lit !== 'boolean') fail('lit');
            if ('fuel' in l && (!number(l.fuel) || l.fuel < 0 || l.fuel > 100)) fail('lantern.fuel');
            if ('ever_lit' in l && typeof l.ever_lit !== 'boolean') fail('lantern.ever_lit');
            if ('relit_count' in l && !integer(l.relit_count)) fail('lantern.relit_count');
        }
    }
    let last = -1;
    for (const f of inputs.frames) {
        if (!object(f) || !integer(f.tick) || f.tick <= last) fail('frame ticks must strictly increase'); last = f.tick;
        if ('move' in f && (!vector(f.move, 2) || f.move.some(x => Math.abs(x) > 1))) fail('move');
        if ('cam_yaw_deg' in f && !number(f.cam_yaw_deg)) fail('cam_yaw_deg');
        for (const key of ['jump', 'pulse', 'interact', 'dash', 'pause']) if (key in f && typeof f[key] !== 'boolean') fail(key);
    }
}
function readJSON(filename, fallback) {
    if (!filename) return fallback;
    return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
}
try {
    const args = {}; const allowed = ['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'];
    if ((process.argv.length - 2) % 2 !== 0) fail('arguments must be --name value pairs');
    for (let i = 2; i < process.argv.length; i += 2) {
        const key = process.argv[i].replace(/^--/, ''); if (!allowed.includes(key) || args[key] !== undefined) fail('unknown or duplicate argument'); args[key] = process.argv[i + 1];
    }
    for (const key of ['seed', 'night', 'ticks', 'out']) if (args[key] === undefined) fail(`missing --${key}`);
    const seed = Number(args.seed), night = Number(args.night), ticks = Number(args.ticks), every = Number(args['snapshot-every'] ?? 10);
    if (!Number.isInteger(seed) || ![1, 2, 3].includes(night) || !integer(ticks) || ticks > 21600 || !integer(every) || every < 1) fail('invalid numeric argument');
    let scenario, inputs;
    try { scenario = readJSON(args.scenario, {}); inputs = readJSON(args.inputs, { frames: [] }); validateScenario(scenario, inputs); }
    catch (error) { process.stderr.write(`Invalid scenario/inputs: ${error.message}\n`); process.exit(2); }
    const g = createGame(seed, scenario, night), lines = [snapshot(g)]; let index = 0;
    for (let i = 0; i < ticks && (g.state === 'playing' || g.state === 'paused'); i++) {
        let frame = {};
        if (inputs.frames[index]?.tick === g.tick) frame = inputs.frames[index++];
        lines.push(...step(g, frame));
        if (g.tick % every === 0) lines.push(snapshot(g));
    }
    lines.push({ type: 'end', ticks: g.tick, sim_tick: g.simTick, night, state: g.state, score: g.score, campaign_score: g.campaignScore });
    fs.writeFileSync(args.out, `${lines.map(line => JSON.stringify(line)).join('\n')}\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
