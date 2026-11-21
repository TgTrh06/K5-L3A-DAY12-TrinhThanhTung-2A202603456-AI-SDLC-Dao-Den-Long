function seededRandom(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

export function createBenchmarkScenario(seed = 42) {
    const random = seededRandom(seed), shades = [], motes = [];
    for (let i = 0; i < 200; i++) {
        const angle = (i + random() * .35) * Math.PI * 2 / 200;
        const radius = 15 + Math.sqrt(random()) * 22;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        const targetAngle = angle + (random() * 2 - 1) * Math.PI / 2;
        const targetRadius = 15 + Math.sqrt(random()) * 22;
        shades.push({ id: `S${i + 1}`, pos: [x, 0, z], state: 'wander', wander_target: [Math.cos(targetAngle) * targetRadius, 0, Math.sin(targetAngle) * targetRadius] });
    }
    for (let i = 0; i < 100; i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 37;
        motes.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    }
    return {
        benchmark: true, random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
        player: { pos: [0, 0, 0] }, shades, motes,
        lanterns: ['L1', 'L2', 'L3'].map(id => ({ id, lit: true, fuel: 100 })),
    };
}
