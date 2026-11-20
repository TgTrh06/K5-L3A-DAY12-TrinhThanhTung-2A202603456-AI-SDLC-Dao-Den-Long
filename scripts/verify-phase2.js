import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/evidence/phase-2-final');
const fixtureFile = path.join(root, 'tests/scenarios/phase2.json');
fs.mkdirSync(path.join(out, 'fixtures'), { recursive: true });
const commands = [];
function run(label, exe, args, options = {}) {
    const result = spawnSync(exe, args, { cwd: root, encoding: 'utf8', ...options });
    const stdout = result.stdout ?? '', stderr = result.stderr ?? '';
    fs.writeFileSync(path.join(out, `${label}.txt`), `${stdout}${stderr}\nexit_code=${result.status}\n`);
    commands.push({ label, command: [exe, ...args], exitCode: result.status });
    assert.equal(result.status, 0, `${label} failed; see docs/evidence/phase-2-final/${label}.txt`);
    return stdout;
}

run('tests', process.execPath, ['--test']);
run('build', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { shell: process.platform === 'win32' });
run('campaign-diagnosis', process.execPath, ['scripts/phase2-campaign-check.js']);
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const fixtureSummary = [];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-den-long-phase2-'));
try {
    for (const item of fixture.cases) {
        const scenarioPath = path.join(temporary, `${item.name}-scenario.json`);
        const inputPath = path.join(temporary, `${item.name}-inputs.json`);
        const target = path.join(out, 'fixtures', `${item.name}.jsonl`);
        fs.writeFileSync(scenarioPath, JSON.stringify(item.scenario)); fs.writeFileSync(inputPath, JSON.stringify(item.inputs));
        run(`fixture-${item.name}`, process.execPath, ['src/headless.js', '--seed', '12', '--night', String(item.night), '--ticks', String(item.ticks), '--snapshot-every', String(Math.max(1, item.ticks)), '--scenario', scenarioPath, '--inputs', inputPath, '--out', target]);
        const rows = fs.readFileSync(target, 'utf8').trim().split('\n').map(JSON.parse);
        const names = rows.filter(row => row.type === 'event').map(row => row.name);
        for (const name of item.expect.events) assert.ok(names.includes(name), `${item.name} is missing expected event ${name}`);
        for (const [name, count] of Object.entries(item.expect.counts ?? {})) assert.equal(names.filter(event => event === name).length, count, `${item.name} event count for ${name}`);
        assert.equal(rows.at(-1).type, 'end');
        assert.equal(rows.findLast(row => row.type === 'snapshot').tick, item.expect.snapshot_tick);
        fixtureSummary.push({ name: item.name, night: item.night, ticks: item.ticks, events: names, state: rows.at(-1).state, finalSnapshot: rows.findLast(row => row.type === 'snapshot') });
    }
    const fullNightScenario = path.join(temporary, 'full-night-scenario.json');
    fs.writeFileSync(fullNightScenario, JSON.stringify({ random_shades: false, random_drifters: false, wind_enabled: false }));
    for (const [night, seconds] of [[1, 300], [2, 330], [3, 360]]) {
        const target = path.join(out, `full-night-${night}.jsonl`);
        const start = performance.now();
        run(`full-night-${night}`, process.execPath, ['src/headless.js', '--seed', '12', '--night', String(night), '--ticks', String(seconds * 60), '--snapshot-every', '600', '--scenario', fullNightScenario, '--out', target]);
        const elapsedMs = performance.now() - start;
        const rows = fs.readFileSync(target, 'utf8').trim().split('\n').map(JSON.parse);
        const finalEvent = rows.find(row => row.name === 'game_over');
        assert.equal(finalEvent?.data.reason, 'dawn'); assert.ok(elapsedMs < 30000, `night ${night} headless run exceeded 30 seconds`);
        fixtureSummary.push({ name: `full-night-${night}`, night, ticks: seconds * 60, elapsedMs, state: rows.at(-1).state, reason: finalEvent.data.reason });
    }
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }

const manifest = {};
function scan(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const filename = path.join(folder, entry.name);
        if (entry.isDirectory()) scan(filename);
        else manifest[path.relative(root, filename).replaceAll('\\', '/')] = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    }
}
for (const folder of ['src', 'tests', 'scripts']) scan(path.join(root, folder));
for (const filename of ['game.contract.json', 'package.json', 'package-lock.json', 'index.html', 'AGENTS.md', 'docs/phases/phase-2-spec.md', '.github/workflows/verify-phase-2.yml']) manifest[filename] = createHash('sha256').update(fs.readFileSync(path.join(root, filename))).digest('hex');
fs.writeFileSync(path.join(out, 'source-hashes.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(out, 'run-summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, node: process.version, commands, fixtures: fixtureSummary, browserPerformance: 'not measured by this CLI verifier' }, null, 2));
console.log(`Phase 2 verification passed; fresh evidence written to ${path.relative(root, out).replaceAll('\\', '/')}.`);
