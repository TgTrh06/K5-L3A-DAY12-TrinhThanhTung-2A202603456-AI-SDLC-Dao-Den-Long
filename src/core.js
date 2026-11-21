// Contract 1.2: deterministic 60 Hz game simulation shared by browser and CLI.
export const T = {
    tick_rate: 60, player_speed: 6, acceleration_time_s: 0.1,
    jump_speed: 7, gravity: -20, dash_speed: 14, dash_duration_s: 0.2,
    dash_cooldown_s: 1.5, carry_capacity: 10, capacity_max: 20, pickup_radius: 1,
    pickup_height: 1.5, lantern_cost: 10, interact_radius: 2,
    fuel_max: 100, fuel_decay_per_s: 1, fuel_per_mote: 10, relight_cost: 5,
    low_fuel_threshold: 30, drain_per_s: 5, win_ratio: .6,
    safe_radius: 6, pulse_cost: 3, pulse_radius: 5,
    pulse_cooldown_s: 3, pulse_stun_ticks: 120, pulse_push_m: 4,
    pulse_push_ticks: 15, shade_speed: 4, night3_shade_speed: 4.5,
    shade_detect_radius: 12, shade_forget_radius: 18, shade_hit_radius: 1,
    invuln_ticks: 90, hit_drop_ratio: 0.5, hit_recoil_m: 2,
    hit_recoil_ticks: 60, fall_y: -10, fall_wait_ticks: 60,
    night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300,
    mote_initial_count: 20, mote_cap: 30, mote_spawn_ticks: 240,
    dropped_mote_ttl_ticks: 480, flames: 3,
    night2_shade_spawn_ticks: 420, night3_shade_spawn_ticks: 360,
    drifter_speed: 7, drifter_idle_speed: 2, drifter_cap: 2,
    drifter_spawn_ticks: 1200, drifter_trigger_motes: 5, drifter_detect_radius: 15,
    drifter_hit_radius: 1.2, drifter_steal_cap: 3, drifter_flee_ticks: 240,
    charm_duration_ticks: 600, charm_respawn_ticks: 2700,
    charm_player_speed: 7.2, charm_dash_cooldown_ticks: 0,
    wind_interval_ticks: 1800, wind_warning_ticks: 120,
    wind_duration_ticks: 300, wind_speed: 2,
    score: { per_mote: 5, per_lantern: 100, per_relight: 40, per_pulse_hit: 5, per_drain_pulse_hit: 15,
        per_lit_lantern_at_dawn: 50, per_flame_left: 50 },
};
const DT = 1 / T.tick_rate, rad = d => d * Math.PI / 180;
const FUEL_UNITS_PER_FUEL = T.tick_rate;
const fuelUnits = fuel => Math.max(0, Math.min(T.fuel_max * FUEL_UNITS_PER_FUEL, Math.round(fuel * FUEL_UNITS_PER_FUEL)));
const fuelValue = units => Number((units / FUEL_UNITS_PER_FUEL).toFixed(1));
const playerCapacity = player => Math.min(T.capacity_max, T.carry_capacity + 2 * player.successfulLights);
const safeLamp = lamp => lamp.lit && lamp.fuelUnits >= T.low_fuel_threshold * FUEL_UNITS_PER_FUEL;
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const vec = (r, deg, center = [0, 0, 0], y = center[1] ?? 0) => {
    const a = rad(deg); return [center[0] + r * Math.cos(a), y, center[2] + r * Math.sin(a)];
};
const ring = (r, angles, center) => angles.map(a => vec(r, a, center));
const angles = (n, start = 0, stride = 360 / n) => Array.from({ length: n }, (_, i) => start + i * stride);

export const NIGHT = {
    1: { name: 'Đảo Bến', seconds: T.night1_duration_s, radius: 40,
        lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
        motePoints: [...ring(12, angles(8)), ...ring(33, angles(16, 0, 22.5))],
        shadePoints: ring(37, angles(12, 15, 30)), shadeInterval: 480, shadeCap: 6, shadeInitial: 2 },
    2: { name: 'Đảo Cau', seconds: T.night2_duration_s,
        islands: [[0, 0, 0], [70, 0, 0]], islandRadius: 28,
        lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
        motePoints: [[...ring(10, [0, 90, 180, 270]), ...ring(22, angles(8, 0, 45))],
            [...ring(10, [0, 90, 180, 270], [70, 0, 0]), ...ring(22, angles(8, 0, 45), [70, 0, 0])]].flat(),
        shadePoints: [...ring(26, angles(8, 22.5, 45)), ...ring(26, angles(8, 22.5, 45), [70, 0, 0])],
        shadeInterval: 420, shadeCap: 8, shadeInitial: 1,
        pads: [{ pos: [20, 0, 18], target: [70, 0, 0] }, { pos: [50, 0, -18], target: [0, 0, 0] }] },
    3: { name: 'Đảo Chuông', seconds: T.night3_duration_s, radius: 45,
        lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
        motePoints: [...ring(34, angles(18, 0, 20)), ...ring(18, angles(8, 20, 20), [0, 3, 0]), ...ring(5, [45, 135, 225, 315], [0, 6, 0])],
        shadePoints: ring(43, angles(16, 0, 22.5)), shadeInterval: 360, shadeCap: 10, shadeInitial: 1,
        pads: [{ pos: [0, 3, 13], dir: [0, 0, -1] }], wind: true },
};

function makeRng(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function validNight(night) { if (![1, 2, 3].includes(night)) throw new RangeError('night must be 1, 2 or 3'); return night; }
function initialMotes(night) {
    const points = NIGHT[night].motePoints;
    const count = Math.min(T.mote_initial_count, points.length);
    return points.slice(0, count).map((pos, i) => ({ id: `M${i + 1}`, pos: [...pos], kind: 'random', ttlTicks: null, availableTick: 0 }));
}
function pointForShade(night, i, playerPos) {
    const points = NIGHT[night].shadePoints;
    for (let offset = 0; offset < points.length; offset++) {
        const p = points[(i + offset) % points.length];
        if (distXZ(p, playerPos) >= 15) return [...p];
    }
    return null;
}
function initialShades(night, scenario, playerPos) {
    if (scenario.shades) return scenario.shades.map((s, i) => ({
        id: s.id ?? `S${i + 1}`, pos: [...s.pos], state: s.state ?? 'wander',
        stateTicksLeft: s.state_ticks_left ?? 0, stunTicks: s.state === 'stunned' ? (s.state_ticks_left ?? 0) : 0,
        pushTicks: 0, pushDir: [0, 0], recoilTicks: 0, recoilDir: [0, 0], safePushTicks: 0, safePushTarget: null,
        wanderTarget: s.wander_target ? [...s.wander_target] : null, targetLanternId: s.target_lantern_id ?? null,
    }));
    return [];
}
function normalizeIds(items, prefix) {
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const ids = new Set();
    for (const item of sorted) { if (ids.has(item.id)) throw new Error(`duplicate ${prefix} id: ${item.id}`); ids.add(item.id); }
    return sorted;
}

export function createGame(seed = 1, scenario = {}, night = 1) {
    validNight(night);
    const rng = makeRng(seed), map = NIGHT[night];
    const player = { pos: [0, 0, 0], vel: [0, 0, 0], carried: 0, flames: T.flames, successfulLights: 0,
        grounded: true, invuln: 0, dashCd: 0, pulseCd: 0, charm: 0,
        facing: [0, 1], fallTicks: 0, padFlight: false };
    Object.assign(player, scenario.player ?? {});
    player.successfulLights = scenario.player?.successful_lights ?? scenario.player?.successfulLights ?? 0;
    player.pos = [...(scenario.player?.pos ?? [0, 0, 0])];
    player.vel = [...(scenario.player?.vel ?? [0, 0, 0])];
    player.facing = [...(scenario.player?.facing ?? [0, 1])];
    const g = {
        seed: seed >>> 0, night, map, tick: 0, simTick: 0, state: 'playing',
        score: 0, campaignScore: 0, timeLeftTicks: Math.round((scenario.time_left_s ?? map.seconds) * 60),
        player,
        lanterns: map.lanterns.map((pos, i) => ({ id: `L${i + 1}`, pos: [...pos], deposited: 0, lit: false,
            fuelUnits: 0, everLit: false, relitCount: 0 })),
        motes: initialMotes(night), shades: [], drifters: [], charms: [],
        input: { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false },
        events: [], nextShade: 1, nextMote: map.motePoints.length + 1,
        nextDrifter: 1, randomMotes: scenario.random_motes !== false,
        randomShades: scenario.random_shades !== false,
        randomDrifters: scenario.random_drifters !== false,
        benchmark: scenario.benchmark === true,
        windEnabled: scenario.wind_enabled !== false && Boolean(map.wind),
        rng, droppedSerial: 1, spawnPos: [...(scenario.spawn_pos ?? [0, 0, 0])],
    };
    g.initialTimeTicks = g.timeLeftTicks;
    if (scenario.motes) g.motes = scenario.motes.map((m, i) => Array.isArray(m)
        ? { id: `M${i + 1}`, pos: [...m], kind: 'random', ttlTicks: null, availableTick: 0 }
        : { id: m.id ?? `M${i + 1}`, pos: [...m.pos], kind: m.kind ?? 'random', ttlTicks: m.ttl_ticks ?? null, availableTick: 0 });
    g.shades = initialShades(night, scenario, player.pos);
    if (scenario.drifters) g.drifters = scenario.drifters.map((d, i) => ({
        id: d.id ?? `D${i + 1}`, pos: [...d.pos], state: d.state ?? 'idle',
        stateTicksLeft: d.state_ticks_left ?? 0, stolen: d.stolen ?? 0,
    }));
    if (scenario.charms) g.charms = scenario.charms.map((c, i) => ({
        id: c.id ?? `C${i + 1}`, pos: [...(c.pos ?? (night === 2 ? [35, 0, 0] : [30, 0, 25]))],
        available: c.available !== false, respawnTicks: c.respawn_ticks ?? 0,
    }));
    else if (night === 2) g.charms = [{ id: 'C1', pos: [35, 0, 0], available: true, respawnTicks: 0 }];
    else if (night === 3) g.charms = [{ id: 'C1', pos: [30, 0, 25], available: true, respawnTicks: 0 }, { id: 'C2', pos: [-30, 0, 25], available: true, respawnTicks: 0 }];
    for (const l of scenario.lanterns ?? []) {
        const target = g.lanterns.find(x => x.id === l.id); if (!target) throw new Error(`unknown lantern ${l.id}`);
        target.pos = [...(l.pos ?? target.pos)]; target.deposited = l.deposited ?? 0;
        target.lit = Boolean(l.lit || target.deposited >= (l.ever_lit ? T.relight_cost : T.lantern_cost));
        target.fuelUnits = target.lit ? fuelUnits(l.fuel ?? T.fuel_max) : 0;
        target.everLit = l.ever_lit ?? target.lit;
        target.relitCount = l.relit_count ?? 0;
    }
    for (const k of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) {
        if (scenario.player?.[k] !== undefined) player[{ invuln_ticks: 'invuln', dash_cd_ticks: 'dashCd', pulse_cd_ticks: 'pulseCd', charm_ticks: 'charm' }[k]] = scenario.player[k];
    }
    for (const [key, value] of Object.entries(scenario)) if (key.startsWith('_')) g[key.slice(1)] = value;
    g.shades = normalizeIds(g.shades, 'shade'); g.drifters = normalizeIds(g.drifters, 'drifter'); g.charms = normalizeIds(g.charms, 'charm');
    g.nextShade = g.shades.length + 1; g.wind = wind(g);
    return g;
}

function groundAt(g, x, z, maxY = Infinity) {
    const map = g.map; let best = null;
    const offer = (y, type) => { if (y <= maxY + 0.03 && (best === null || y > best.y)) best = { y, type }; };
    if (g.night === 1) { if (Math.hypot(x, z) <= 40) offer(0, 'island'); }
    if (g.night === 2) {
        for (const c of map.islands) if (Math.hypot(x - c[0], z - c[2]) <= map.islandRadius) offer(0, 'island');
        if (x >= 26 && x <= 44 && z >= -2 && z <= 2) offer(0, 'bridge');
    }
    if (g.night === 3) {
        if (Math.hypot(x, z) <= 45) offer(0, 'island');
        const radius = Math.hypot(x, z);
        if (z > 0 && radius >= 12 && radius <= 24) offer(3, 'tier1');
        if (radius <= 8) offer(6, 'tier2');
        // Two three-metre ramps, six metres long and three metres wide.
        for (const degrees of [30, 150]) {
            const a = rad(degrees), along = x * Math.cos(a) + z * Math.sin(a);
            const across = Math.abs(-x * Math.sin(a) + z * Math.cos(a));
            if (along >= 24 && along <= 30 && across <= 1.5) offer((30 - along) / 2, 'ramp');
        }
    }
    return best;
}
function moveVector(input) {
    const [mx, mz] = input.move ?? [0, 0], yaw = rad(input.cam_yaw_deg ?? 0);
    let x = mx * Math.cos(yaw) + mz * Math.sin(yaw), z = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
    const len = Math.hypot(x, z); if (len > 1) { x /= len; z /= len; }
    return [x, z];
}
function pushAway(a, b) { let x = a[0] - b[0], z = a[2] - b[2], d = Math.hypot(x, z); if (!d) { x = 1; d = 1; } return [x / d, z / d]; }

function emit(g, name, data = {}) { g.events.push({ type: 'event', tick: g.tick, sim_tick: g.simTick, name, data }); }
function dropMotes(g, pos, amount, owner = 'player') {
    for (let i = 0; i < amount; i++) {
        const angle = g.rng() * Math.PI * 2, r = 1.5 + g.rng(), p = [...pos];
        if (owner === 'player') { p[0] += Math.cos(angle) * r; p[2] += Math.sin(angle) * r; }
        g.motes.push({ id: `D${g.droppedSerial++}`, pos: p, kind: 'dropped', ttlTicks: T.dropped_mote_ttl_ticks, availableTick: g.tick + 1, owner });
    }
    return amount;
}
function decrementTimers(g) {
    const p = g.player;
    p.invuln = Math.max(0, p.invuln - 1); p.dashCd = Math.max(0, p.dashCd - 1);
    p.pulseCd = Math.max(0, p.pulseCd - 1); p.charm = Math.max(0, p.charm - 1);
    for (const s of g.shades) { if (s.stunTicks > 0) s.stunTicks--; if (s.pushTicks > 0) s.pushTicks--; if (s.recoilTicks > 0) s.recoilTicks--; if (s.stateTicksLeft > 0) s.stateTicksLeft--; }
    for (const d of g.drifters) if (d.stateTicksLeft > 0) d.stateTicksLeft--;
    for (const c of g.charms) if (!c.available && c.respawnTicks > 0 && --c.respawnTicks === 0) c.available = true;
    for (const m of g.motes) if (m.kind === 'dropped' && m.ttlTicks > 0) m.ttlTicks--;
}
function startDash(g, input, direction) {
    const p = g.player;
    if (!input.dash || g.previousInput.dash || (p.dashCd > 0 && p.charm <= 0)) return;
    const len = Math.hypot(...direction), facing = len > 1e-9 ? [direction[0] / len, direction[1] / len] : p.facing;
    p.facing = [...facing]; p.dashTicks = Math.round(T.dash_duration_s * 60); p.dashCd = p.charm > 0 ? 0 : Math.round(T.dash_cooldown_s * 60);
    p.dashDir = [...facing]; p.vel[0] = facing[0] * T.dash_speed; p.vel[2] = facing[1] * T.dash_speed;
    emit(g, 'dash');
}
function movePlayer(g, input, direction) {
    const p = g.player, dt = DT, map = g.map;
    if (p.fallTicks > 0) {
        p.fallTicks--; p.vel = [0, 0, 0]; p.grounded = false;
        if (p.fallTicks === 0 && p.flames > 0) { p.pos = [...g.spawnPos]; p.grounded = true; p.invuln = T.invuln_ticks; emit(g, 'player_respawn'); }
        return;
    }
    const dashTick = p.dashTicks > 0;
    if (dashTick) { p.vel[0] = p.dashDir[0] * T.dash_speed; p.vel[2] = p.dashDir[1] * T.dash_speed; p.dashTicks--; }
    else if (!p.padFlight) {
        const speed = p.charm > 0 ? 7.2 : T.player_speed, targetX = direction[0] * speed, targetZ = direction[1] * speed;
        const maxChange = speed * dt / T.acceleration_time_s;
        p.vel[0] += clamp(targetX - p.vel[0], -maxChange, maxChange);
        p.vel[2] += clamp(targetZ - p.vel[2], -maxChange, maxChange);
        if (!direction[0] && Math.abs(p.vel[0]) < 1e-9) p.vel[0] = 0;
        if (!direction[1] && Math.abs(p.vel[2]) < 1e-9) p.vel[2] = 0;
    }
    if (input.jump && !g.previousInput.jump && p.grounded) { p.vel[1] = T.jump_speed; p.grounded = false; emit(g, 'jump'); }
    if (p.grounded && !p.padFlight) {
        for (const pad of map.pads ?? []) if (distXZ(p.pos, pad.pos) <= 1) {
            const dir = pad.target
                ? [pad.target[0] - pad.pos[0], pad.target[2] - pad.pos[2]]
                : [pad.dir[0], pad.dir[2]];
            const length = Math.hypot(dir[0], dir[1]);
            p.vel[0] = dir[0] / length * (g.night === 2 ? 24 : 8);
            p.vel[1] = g.night === 2 ? 14 : 12; p.vel[2] = dir[1] / length * (g.night === 2 ? 24 : 8);
            p.padFlight = true; p.grounded = false; break;
        }
    }
    const airDash = dashTick && !p.grounded;
    if (airDash) p.vel[1] = 0;
    const before = [...p.pos];
    p.pos[0] += p.vel[0] * dt; p.pos[2] += p.vel[2] * dt;
    if (p.dashTicks <= 0 && p.dashCd === Math.round(T.dash_cooldown_s * 60) && p.dashDir) p.dashTicks = 0;
    const gust = wind(g);
    if (gust.active) { p.pos[0] += Math.cos(rad(gust.dir_deg)) * 2 * dt; p.pos[2] += Math.sin(rad(gust.dir_deg)) * 2 * dt; }
    if (p.grounded) {
        // The ramps rise by at most 0.05 m per grounded tick at 6 m/s.
        // Permit that slope step while still blocking the 3 m platform edges.
        const floor = groundAt(g, p.pos[0], p.pos[2], p.pos[1] + .1);
        if (floor) { p.pos[1] = floor.y; p.vel[1] = 0; }
        else { p.grounded = false; p.vel[1] = 0; }
    }
    if (!p.grounded && !airDash) {
        p.vel[1] += T.gravity * dt; p.pos[1] += p.vel[1] * dt;
        const floor = groundAt(g, p.pos[0], p.pos[2], before[1] + Math.max(0, p.vel[1] * dt) + .04);
        if (floor && p.vel[1] <= 0 && p.pos[1] <= floor.y) {
            p.pos[1] = floor.y; p.vel[1] = 0; p.grounded = true; p.padFlight = false;
        }
    }
    if (Math.hypot(direction[0], direction[1]) > 1e-9) p.facing = [...direction];
    if (p.pos[1] < T.fall_y) {
        p.flames = Math.max(0, p.flames - 1); p.carried = 0; p.vel = [0, 0, 0]; p.grounded = false;
        p.padFlight = false; p.fallTicks = T.fall_wait_ticks;
        emit(g, 'player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost: true });
        if (p.flames === 0) finish(g, 'lost', 'no_flames');
    }
}
function wind(g) {
    if (!g.windEnabled) return { active: false, warning: false, dir_deg: 0 };
    const phase = g.simTick % 1800, cycle = Math.floor(g.simTick / 1800);
    let h = (g.seed ^ (cycle * 0x9e3779b9)) >>> 0; h = (Math.imul(h ^ (h >>> 16), 0x7feb352d)) >>> 0;
    const dir_deg = (h % 36000) / 100;
    return { active: phase >= 0 && phase < 300 && g.simTick >= 1800, warning: phase >= 1680, dir_deg };
}
function pickupMotes(g) {
    const p = g.player, remain = [];
    for (const m of g.motes) {
        if (m.availableTick <= g.tick && p.carried < playerCapacity(p) && distXZ(p.pos, m.pos) <= T.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= T.pickup_height) {
            p.carried++;
            emit(g, 'mote_picked', { mote_id: m.id, kind: m.kind, carried: p.carried });
        } else if (!(m.kind === 'dropped' && m.ttlTicks === 0)) remain.push(m);
    }
    g.motes = remain;
}
function interact(g, input, fullAtStart) {
    const p = g.player;
    if (!input.interact || g.previousInput.interact || p.carried < 1) return;
    const target = g.lanterns.filter(l => (!l.lit || l.fuelUnits < T.fuel_max * FUEL_UNITS_PER_FUEL) && !fullAtStart.has(l.id) && distXZ(l.pos, p.pos) <= T.interact_radius && Math.abs(l.pos[1] - p.pos[1]) <= T.pickup_height)
        .sort((a, b) => distXZ(a.pos, p.pos) - distXZ(b.pos, p.pos) || a.id.localeCompare(b.id))[0];
    if (!target) return;
    if (target.lit) {
        const needed = Math.ceil((T.fuel_max * FUEL_UNITS_PER_FUEL - target.fuelUnits) / (T.fuel_per_mote * FUEL_UNITS_PER_FUEL));
        const amount = Math.min(p.carried, needed);
        if (!amount) return;
        target.fuelUnits = Math.min(T.fuel_max * FUEL_UNITS_PER_FUEL,
            target.fuelUnits + amount * T.fuel_per_mote * FUEL_UNITS_PER_FUEL);
        p.carried -= amount; g.score += amount * T.score.per_mote;
        emit(g, 'refuel', { lantern_id: target.id, amount, fuel: fuelValue(target.fuelUnits) });
        if (target.fuelUnits >= T.low_fuel_threshold * FUEL_UNITS_PER_FUEL) for (const shade of g.shades) {
            if (shade.state !== 'drain' || shade.targetLanternId !== target.id) continue;
            shade.state = distXZ(shade.pos, p.pos) <= 6 ? 'chase' : 'wander';
            shade.targetLanternId = null;
        }
        return;
    }
    const cost = target.everLit ? T.relight_cost : T.lantern_cost;
    const amount = Math.min(p.carried, cost - target.deposited);
    target.deposited += amount; p.carried -= amount; g.score += amount * T.score.per_mote;
    emit(g, 'deposit', { lantern_id: target.id, amount, deposited: target.deposited });
    if (target.deposited >= cost) {
        const relight = target.everLit;
        target.lit = true; target.fuelUnits = T.fuel_max * FUEL_UNITS_PER_FUEL;
        target.everLit = true; target.relitCount += relight ? 1 : 0;
        p.successfulLights++; g.score += relight ? T.score.per_relight : T.score.per_lantern;
        emit(g, 'lantern_lit', { lantern_id: target.id, relight });
    }
}

function processFuel(g) {
    const decay = Math.round(T.fuel_decay_per_s);
    for (const lamp of g.lanterns) if (lamp.lit) lamp.fuelUnits = Math.max(0, lamp.fuelUnits - decay);
    const shades = [...g.shades].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    for (const shade of shades) {
        if (shade.state !== 'drain' || !shade.targetLanternId) continue;
        const lamp = g.lanterns.find(item => item.id === shade.targetLanternId);
        if (!lamp?.lit) continue;
        lamp.fuelUnits = Math.max(0, lamp.fuelUnits - T.drain_per_s);
        if (g.simTick % T.tick_rate === 0) emit(g, 'fuel_drain', { lantern_id: lamp.id, shade_id: shade.id, fuel: fuelValue(lamp.fuelUnits) });
    }
    for (const lamp of g.lanterns) if (lamp.lit && lamp.fuelUnits <= 0) {
        lamp.lit = false; lamp.fuelUnits = 0; lamp.deposited = 0;
        emit(g, 'lantern_out', { lantern_id: lamp.id });
    }
}
function pickupCharms(g) {
    const p = g.player;
    for (const c of g.charms) if (c.available && distXZ(c.pos, p.pos) <= T.pickup_radius && Math.abs(c.pos[1] - p.pos[1]) <= T.pickup_height) {
        c.available = false; c.respawnTicks = 2700; p.charm = 600;
        emit(g, 'charm_picked', { charm_id: c.id, charm_ticks: p.charm });
    }
}
function applyPulse(g, input) {
    const p = g.player;
    if (!input.pulse || g.previousInput.pulse || p.pulseCd > 0 || p.carried < T.pulse_cost) return;
    p.carried -= T.pulse_cost; p.pulseCd = T.pulse_cooldown_s * 60;
    const center = [p.pos[0], p.pos[1] + .8, p.pos[2]], hits = [];
    for (const s of g.shades) if (dist3(center, s.pos) <= T.pulse_radius) hits.push({ kind: 'shade', id: s.id, item: s });
    for (const d of g.drifters) if (dist3(center, d.pos) <= T.pulse_radius && d.state !== 'removed') hits.push({ kind: 'drifter', id: d.id, item: d });
    hits.sort((a, b) => a.id.localeCompare(b.id));
    for (const hit of hits) {
        if (hit.kind === 'shade') {
            const s = hit.item, dir = pushAway(s.pos, p.pos);
            const score = s.state === 'drain' ? T.score.per_drain_pulse_hit : T.score.per_pulse_hit;
            s.state = 'stunned'; s.stunTicks = T.pulse_stun_ticks; s.stateTicksLeft = T.pulse_stun_ticks;
            s.targetLanternId = null; s.pushTicks = T.pulse_push_ticks; s.pushDir = dir; g.score += score;
        } else {
            const d = hit.item;
            if (d.state === 'chase') { d.state = 'flee'; d.stateTicksLeft = 240; }
            else if (d.state === 'flee' && d.stolen > 0) {
                dropMotes(g, d.pos, d.stolen, d.id); emit(g, 'drifter_drop', { drifter_id: d.id, amount: d.stolen });
                d.stolen = 0; d.state = 'removed'; d.stateTicksLeft = 120;
            }
        }
    }
    emit(g, 'pulse', { hit_ids: hits.map(x => x.id) });
}
function moveShades(g) {
    const p = g.player, speed = g.night === 3 ? T.night3_shade_speed : T.shade_speed;
    const safe = item => g.lanterns.some(l => safeLamp(l) && distXZ(item, l.pos) < T.safe_radius);
    const nearestLamp = (items, pos) => [...items].sort((a, b) => distXZ(a.pos, pos) - distXZ(b.pos, pos) || a.id.localeCompare(b.id))[0] ?? null;
    for (const s of g.shades) {
        if (s.state === 'spawning') { s.state = 'wander'; continue; }
        if (s.safePushTicks > 0 && s.safePushTarget) {
            const remaining = Math.hypot(s.safePushTarget[0] - s.pos[0], s.safePushTarget[2] - s.pos[2]);
            const amount = remaining / s.safePushTicks;
            s.pos[0] += (s.safePushTarget[0] - s.pos[0]) / (remaining || 1) * amount;
            s.pos[2] += (s.safePushTarget[2] - s.pos[2]) / (remaining || 1) * amount;
            s.safePushTicks--; if (s.safePushTicks === 0) s.safePushTarget = null;
            continue;
        }
        if (s.pushTicks > 0) {
            const amount = T.pulse_push_m / T.pulse_push_ticks;
            const nx = s.pos[0] + s.pushDir[0] * amount, nz = s.pos[2] + s.pushDir[1] * amount;
            if (groundAt(g, nx, nz, s.pos[1] + .1)) { s.pos[0] = nx; s.pos[2] = nz; }
            continue;
        }
        if (s.state === 'stunned') {
            if (s.stunTicks > 0) continue;
            s.state = 'wander'; s.targetLanternId = null; s.wanderTarget = null;
            continue;
        }
        if (s.recoilTicks > 0) {
            const amount = T.hit_recoil_m / T.hit_recoil_ticks;
            s.pos[0] += s.recoilDir[0] * amount; s.pos[2] += s.recoilDir[1] * amount; s.state = 'recoil'; continue;
        }
        const d = distXZ(s.pos, p.pos);
        if (s.state === 'drain') {
            const target = g.lanterns.find(l => l.id === s.targetLanternId);
            if (d <= T.shade_detect_radius / 2) { s.state = 'chase'; s.targetLanternId = null; s.wanderTarget = null; }
            else if (!target?.lit || target.fuelUnits >= T.low_fuel_threshold * FUEL_UNITS_PER_FUEL || distXZ(s.pos, target.pos) > 2) {
                s.state = 'wander'; s.targetLanternId = null;
            } else continue;
        }
        if (!g.benchmark && d <= T.shade_detect_radius) { s.state = 'chase'; s.wanderTarget = null; }
        else if (!g.benchmark && d > T.shade_forget_radius) s.state = 'wander';
        if (s.state === 'chase' && d > 1e-9) {
            let nx = s.pos[0] + (p.pos[0] - s.pos[0]) / d * speed * DT;
            let nz = s.pos[2] + (p.pos[2] - s.pos[2]) / d * speed * DT;
            for (const l of g.lanterns.filter(safeLamp)) if (distXZ([nx, 0, nz], l.pos) < T.safe_radius) {
                const [x, z] = pushAway([nx, 0, nz], l.pos); nx = l.pos[0] + x * T.safe_radius; nz = l.pos[2] + z * T.safe_radius;
            }
            if (groundAt(g, nx, nz, s.pos[1] + .1)) { s.pos[0] = nx; s.pos[2] = nz; }
        } else if (s.state === 'wander') {
            const weak = nearestLamp(g.lanterns.filter(l => l.lit && l.fuelUnits < T.low_fuel_threshold * FUEL_UNITS_PER_FUEL), s.pos);
            const unlit = weak ? null : nearestLamp(g.lanterns.filter(l => !l.lit), s.pos);
            const lampTarget = weak ?? unlit;
            if (lampTarget) {
                const distance = distXZ(s.pos, lampTarget.pos);
                if (weak && distance <= 2) { s.targetLanternId = lampTarget.id; s.wanderTarget = null; s.state = 'drain'; continue; }
                if (!weak && distance <= 2) s.targetLanternId = null;
                else {
                    s.targetLanternId = lampTarget.id; s.wanderTarget = null;
                    const travel = Math.min(distance, speed * DT);
                    const nx = s.pos[0] + (lampTarget.pos[0] - s.pos[0]) / distance * travel;
                    const nz = s.pos[2] + (lampTarget.pos[2] - s.pos[2]) / distance * travel;
                    if (groundAt(g, nx, nz, s.pos[1] + .1) && !safe([nx, 0, nz])) { s.pos[0] = nx; s.pos[2] = nz; }
                    continue;
                }
            }
            s.targetLanternId = null;
            if (!s.wanderTarget || distXZ(s.pos, s.wanderTarget) <= .1 || safe(s.wanderTarget)) {
                const candidates = g.map.shadePoints
                    .map((pos, index) => ({ pos, index, distance: distXZ(s.pos, pos) }))
                    .filter(point => {
                        if (point.distance <= 1 || safe(point.pos)) return false;
                        const travel = Math.min(point.distance, speed * DT);
                        const next = [s.pos[0] + (point.pos[0] - s.pos[0]) / point.distance * travel, 0,
                            s.pos[2] + (point.pos[2] - s.pos[2]) / point.distance * travel];
                        return !safe(next);
                    })
                    .sort((a, b) => a.distance - b.distance || a.index - b.index);
                s.wanderTarget = candidates[0] ? [...candidates[0].pos] : null;
            }
            if (s.wanderTarget) {
                const dx = s.wanderTarget[0] - s.pos[0], dz = s.wanderTarget[2] - s.pos[2];
                const distance = Math.hypot(dx, dz), travel = Math.min(distance, speed * DT);
                const nx = s.pos[0] + dx / distance * travel, nz = s.pos[2] + dz / distance * travel;
                if (groundAt(g, nx, nz, s.pos[1] + .1) && !safe([nx, 0, nz])) {
                    s.pos[0] = nx; s.pos[2] = nz;
                } else s.wanderTarget = null;
            }
        }
    }
}
function moveDrifters(g) {
    const p = g.player;
    for (const d of g.drifters) {
        if (d.state === 'removed') continue;
        if (d.state === 'flee') {
            if (d.stateTicksLeft <= 0) d.state = 'removed';
            else { const [x, z] = pushAway(d.pos, p.pos); d.pos[0] += x * 7 * DT; d.pos[2] += z * 7 * DT; }
            continue;
        }
        const distance = distXZ(d.pos, p.pos);
        if (d.state === 'idle' && p.carried >= 5 && distance <= 15) d.state = 'chase';
        else if (d.state === 'chase' && (p.carried < 5 || distance > 15)) d.state = 'idle';
        const speed = d.state === 'chase' ? 7 : 2;
        if (distance > .01) { const dx = (p.pos[0] - d.pos[0]) / distance, dz = (p.pos[2] - d.pos[2]) / distance; d.pos[0] += dx * speed * DT; d.pos[2] += dz * speed * DT; }
    }
}
function enemyContact(g) {
    const p = g.player;
    for (const d of g.drifters) if (d.state === 'chase' && distXZ(d.pos, p.pos) <= 1.2) {
        const amount = Math.min(3, p.carried); p.carried -= amount; d.stolen = amount;
        d.state = 'flee'; d.stateTicksLeft = 240; emit(g, 'drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
    }
    if (p.invuln > 0 || p.fallTicks > 0) return;
    for (const s of g.shades) {
        if (s.state === 'stunned' || s.state === 'spawning' || s.state === 'recoil' || s.safePushTicks > 0) continue;
        if (distXZ(s.pos, p.pos) <= T.shade_hit_radius && Math.abs(s.pos[1] - p.pos[1]) <= T.pickup_height) {
            p.flames = Math.max(0, p.flames - 1); const dropped = Math.floor(p.carried * T.hit_drop_ratio); p.carried -= dropped;
            dropMotes(g, p.pos, dropped); p.invuln = T.invuln_ticks; s.recoilTicks = T.hit_recoil_ticks; s.recoilDir = pushAway(s.pos, p.pos); s.state = 'recoil';
            emit(g, 'player_hit', { by: 'shade', shade_id: s.id, flames: p.flames, dropped }); break;
        }
    }
}
function spawnMotes(g) {
    if (!g.randomMotes || g.simTick === 0 || g.simTick % T.mote_spawn_ticks !== 0 || g.motes.length >= T.mote_cap) return;
    const available = g.map.motePoints.filter(pos => !g.motes.some(m => distXZ(m.pos, pos) < .01));
    if (available.length) {
        const pos = available[Math.floor(g.rng() * available.length)];
        const mote = { id: `M${g.nextMote++}`, pos: [...pos], kind: 'random', ttlTicks: null, availableTick: g.tick + 1 };
        g.motes.push(mote); emit(g, 'mote_spawned', { mote_id: mote.id, pos: [...pos] }); return;
    }
    emit(g, 'mote_spawn_skipped', { reason: 'no_empty_point' });
}
function spawnEnemies(g) {
    const cfg = g.map, t = g.simTick;
    if (g.randomShades && g.shades.length < cfg.shadeCap) {
        const initial = g.night === 1 ? t === 300 : t === cfg.shadeInterval;
        const repeat = g.night === 1 ? t > 300 && (t - 300) % cfg.shadeInterval === 0 : t > cfg.shadeInterval && t % cfg.shadeInterval === 0;
        const count = initial ? cfg.shadeInitial : repeat ? 1 : 0;
        for (let i = 0; i < count && g.shades.length < cfg.shadeCap; i++) {
            const pos = pointForShade(g.night, g.nextShade - 1, g.player.pos); if (!pos) break;
            const shade = { id: `S${g.nextShade++}`, pos, state: 'spawning', stateTicksLeft: 1, stunTicks: 0, pushTicks: 0, pushDir: [0, 0], recoilTicks: 0, recoilDir: [0, 0], safePushTicks: 0, safePushTarget: null };
            g.shades.push(shade); emit(g, 'shade_spawned', { id: shade.id, pos: [...pos] });
        }
    }
    if (g.night >= 2 && g.randomDrifters && t > 0 && t % T.drifter_spawn_ticks === 0 && g.drifters.filter(d => d.state !== 'removed').length < T.drifter_cap) {
        const a = g.rng() * Math.PI * 2, r = g.night === 2 ? (g.rng() < .5 ? 25 : 70) : 40;
        const pos = g.night === 2 ? [Math.cos(a) * 25 + (g.rng() < .5 ? 0 : 70), 0, Math.sin(a) * 25] : [Math.cos(a) * r, 0, Math.sin(a) * r];
        const d = { id: `D${g.nextDrifter++}`, pos, state: 'idle', stateTicksLeft: 0, stolen: 0 };
        g.drifters.push(d); emit(g, 'drifter_spawned', { id: d.id, pos: [...pos] });
    }
}
function updateSafeZones(g) {
    for (const s of g.shades) for (const l of g.lanterns) if (safeLamp(l) && distXZ(s.pos, l.pos) < T.safe_radius && s.safePushTicks === 0) {
        const [x, z] = pushAway(s.pos, l.pos);
        s.safePushTarget = [l.pos[0] + x * T.safe_radius, s.pos[1], l.pos[2] + z * T.safe_radius]; s.safePushTicks = 30;
    }
}
function finish(g, state, reason) {
    g.state = state;
    if (state === 'won') {
        const lit = g.lanterns.filter(l => l.lit);
        g.score += lit.reduce((score, l) => score + T.score.per_lit_lantern_at_dawn + Math.floor(l.fuelUnits / FUEL_UNITS_PER_FUEL), 0)
            + g.player.flames * T.score.per_flame_left;
        g.campaignScore += g.score;
    }
    emit(g, 'game_over', { result: state, reason, night: g.night, score: g.score, campaign_score: g.campaignScore });
}

export function step(g, frame = {}) {
    if (g.state === 'won' || g.state === 'lost') return [];
    const old = g.input, input = { ...old, ...frame }; g.previousInput = old; g.input = input; g.tick++; g.events = [];
    if (input.pause && !old.pause) {
        if (g.state === 'playing') { g.state = 'paused'; emit(g, 'paused'); return g.events; }
        if (g.state === 'paused') { g.state = 'playing'; emit(g, 'resumed'); return g.events; }
    }
    if (g.state === 'paused') return g.events;
    if (g.benchmark) { g.simTick++; updateSafeZones(g); moveShades(g); return g.events; }
    const previousWind = g.wind, fullAtStart = new Set(g.lanterns.filter(l => l.lit && l.fuelUnits >= T.fuel_max * FUEL_UNITS_PER_FUEL).map(l => l.id));
    g.simTick++; decrementTimers(g); g.timeLeftTicks = Math.max(0, g.initialTimeTicks - g.simTick); g.wind = wind(g);
    processFuel(g);
    if (g.wind.warning && !previousWind.warning) emit(g, 'wind_warning', { dir_deg: Number(g.wind.dir_deg.toFixed(2)) });
    if (g.wind.active && !previousWind.active) emit(g, 'wind_start', { dir_deg: Number(g.wind.dir_deg.toFixed(2)) });
    if (g.timeLeftTicks === 600) emit(g, 'countdown_10');
    const direction = moveVector(input); startDash(g, input, direction); movePlayer(g, input, direction);
    if (g.state !== 'playing') return g.events;
    pickupMotes(g); pickupCharms(g); interact(g, input, fullAtStart); updateSafeZones(g); applyPulse(g, input);
    moveDrifters(g); moveShades(g); enemyContact(g); spawnMotes(g); spawnEnemies(g);
    g.drifters = g.drifters.filter(d => d.state !== 'removed' || d.stateTicksLeft > 0);
    if (g.player.flames <= 0) finish(g, 'lost', 'no_flames');
    else if (g.timeLeftTicks <= 0) {
        const required = Math.ceil(T.win_ratio * g.lanterns.length);
        if (g.lanterns.filter(l => l.lit).length >= required) finish(g, 'won', 'dawn_survived');
        else finish(g, 'lost', 'dawn');
    }
    return g.events;
}

function roundPos(pos) { return pos.map(n => Number(n.toFixed(3))); }
export function snapshot(g) {
    const p = g.player, gust = g.wind ?? wind(g);
    return {
        type: 'snapshot', tick: g.tick, sim_tick: g.simTick, state: g.state, night: g.night,
        time_left_s: Number((g.timeLeftTicks / 60).toFixed(6)), score: g.score,
        campaign_score: g.campaignScore, wind: { active: gust.active, dir_deg: Number(gust.dir_deg.toFixed(2)) },
        player: { pos: roundPos(p.pos), vel: roundPos(p.vel), carried: p.carried, capacity: playerCapacity(p), flames: p.flames,
            grounded: p.grounded, invuln: Number((p.invuln / 60).toFixed(3)),
            dash_cd_s: Number((p.dashCd / 60).toFixed(3)), pulse_cd_s: Number((p.pulseCd / 60).toFixed(3)),
            charm_s: Number((p.charm / 60).toFixed(3)) },
        lanterns: g.lanterns.map(l => ({ id: l.id, pos: roundPos(l.pos), deposited: l.deposited, lit: l.lit,
            fuel: fuelValue(l.fuelUnits), ever_lit: l.everLit, relit_count: l.relitCount })),
        shades: g.shades.map(s => ({ id: s.id, pos: roundPos(s.pos), state: s.state, state_ticks_left: s.stateTicksLeft,
            target_lantern_id: s.targetLanternId })),
        motes: g.motes.map(m => ({ id: m.id, pos: roundPos(m.pos), kind: m.kind, ttl_s: m.ttlTicks === null ? null : Number((m.ttlTicks / 60).toFixed(3)) })),
        drifters: g.drifters.map(d => ({ id: d.id, pos: roundPos(d.pos), state: d.state, stolen: d.stolen })),
        charms: g.charms.map(c => ({ id: c.id, available: c.available, respawn_s: Number((c.respawnTicks / 60).toFixed(3)) })),
    };
}
