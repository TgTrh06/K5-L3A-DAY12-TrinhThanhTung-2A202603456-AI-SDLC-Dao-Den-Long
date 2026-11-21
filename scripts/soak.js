import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createGame, NIGHT, step } from '../src/core.js';
import { createSoakController } from '../src/soak-input.js';

function parse(args) {
    const result = { seed: 7, nights: 10, out: 'soak.json' };
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i], value = args[i + 1];
        if (!['--seed', '--nights', '--out'].includes(key) || value === undefined) throw new Error('Usage: npm run soak -- --seed 7 --nights 10 --out soak.json');
        result[{ '--seed': 'seed', '--nights': 'nights', '--out': 'out' }[key]] = key === '--out' ? value : Number(value);
    }
    if (!Number.isInteger(result.seed) || result.seed < 0 || result.seed > 0xffffffff || !Number.isInteger(result.nights) || result.nights < 1) throw new RangeError('seed or nights is out of range');
    return result;
}

const rssMb = () => process.memoryUsage().rss / 1048576;

async function main() {
    const { seed, nights, out } = parse(process.argv.slice(2)), started = performance.now();
    let game = null, memStart = null, crashes = 0; const results = [];
    for (let i = 0; i < nights; i++) {
        const night = i % 3 + 1, nightSeed = (seed + i + 1) >>> 0;
        try {
            game = createGame(nightSeed, { random_motes: true, random_shades: true, random_drifters: true, wind_enabled: true }, night);
            if (i === 0) memStart = rssMb();
            const input = createSoakController(nightSeed), maxTicks = NIGHT[night].seconds * 60;
            while (game.tick < maxTicks && (game.state === 'playing' || game.state === 'paused')) step(game, input(game.tick));
            if (game.state !== 'won' && game.state !== 'lost') throw new Error(`night ${i + 1} did not reach a terminal state`);
            results.push(game.state);
        } catch (error) {
            crashes++; results.push('crashed'); console.error(`Night ${i + 1} simulation error: ${error.message}`);
        }
        game = null;
        if (global.gc) global.gc();
    }
    if (global.gc) global.gc();
    const report = { nights, crashes, results, mem_start_mb: Math.round((memStart ?? rssMb()) * 10) / 10,
        mem_end_mb: Math.round(rssMb() * 10) / 10, duration_s: Math.round((performance.now() - started) / 10) / 100 };
    const target = path.resolve(out); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(report, null, 2));
    if (crashes > 0) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 2; });
