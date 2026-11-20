import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/evidence/phase-3-final');
const fixtureFile = path.join(root, 'tests/scenarios/phase3.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-den-long-phase3-'));
fs.mkdirSync(path.join(out, 'fixtures'), { recursive: true });
const commands = [], fixtureSummary = [];
function run(label, exe, args, options = {}) {
    const result = spawnSync(exe, args, { cwd: root, encoding: 'utf8', ...options });
    const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    fs.writeFileSync(path.join(out, `${label}.txt`), `${text}\nexit_code=${result.status}\n`);
    commands.push({ label, command: [exe, ...args], exitCode: result.status });
    assert.equal(result.status, 0, `${label} failed; see docs/evidence/phase-3-final/${label}.txt`);
    return text;
}
function runHeadless(label, item, target) {
    const scenarioPath = path.join(temp, `${item.name}-scenario.json`);
    const inputPath = path.join(temp, `${item.name}-inputs.json`);
    fs.writeFileSync(scenarioPath, JSON.stringify(item.scenario));
    fs.writeFileSync(inputPath, JSON.stringify(item.inputs));
    run(label, process.execPath, ['src/headless.js', '--seed', '12', '--night', String(item.night), '--ticks', String(item.ticks),
        '--snapshot-every', String(Math.max(1, item.ticks)), '--scenario', scenarioPath, '--inputs', inputPath, '--out', target]);
    return fs.readFileSync(target, 'utf8');
}

try {
    run('tests', process.execPath, ['--test']);
    run('build', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { shell: process.platform === 'win32' });
    const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
    for (const item of fixture.cases) {
        const target = path.join(out, 'fixtures', `${item.name}.jsonl`);
        const first = runHeadless(`fixture-${item.name}`, item, target);
        const secondPath = path.join(temp, `${item.name}-repeat.jsonl`);
        const second = runHeadless(`repeat-${item.name}`, item, secondPath);
        assert.equal(first, second, `${item.name} output is not byte deterministic`);
        const rows = first.trim().split('\n').map(JSON.parse), events = rows.filter(row => row.type === 'event');
        const eventNames = events.map(row => row.name), final = rows.at(-1), finalSnapshot = rows.findLast(row => row.type === 'snapshot');
        for (const name of item.expect.events) assert.ok(eventNames.includes(name), `${item.name} missing ${name}`);
        assert.equal(final.type, 'end'); assert.equal(final.state, item.expect.state);
        const terminal = events.findLast(row => row.name === 'game_over');
        if (item.expect.reason) assert.equal(terminal?.data.reason, item.expect.reason);
        if (item.expect.lit !== undefined) assert.equal(finalSnapshot.lanterns.filter(l => l.lit).length, item.expect.lit);
        if (item.expect.fuel !== undefined) assert.equal(finalSnapshot.lanterns.find(l => l.id === 'L1').fuel, item.expect.fuel);
        if (item.expect.capacity !== undefined) assert.equal(finalSnapshot.player.capacity, item.expect.capacity);
        if (item.expect.carried !== undefined) assert.equal(finalSnapshot.player.carried, item.expect.carried);
        if (item.expect.score !== undefined) assert.equal(final.score, item.expect.score);
        if (item.expect.target_lantern_id) assert.equal(finalSnapshot.shades[0].target_lantern_id, item.expect.target_lantern_id);
        fixtureSummary.push({ name: item.name, night: item.night, ticks: item.ticks, events: eventNames, state: final.state,
            reason: terminal?.data.reason ?? null, finalSnapshot });
    }

    const fullNightScenario = path.join(temp, 'full-night-scenario.json');
    fs.writeFileSync(fullNightScenario, JSON.stringify({ random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false }));
    for (const [night, seconds] of [[1, 240], [2, 270], [3, 300]]) {
        const target = path.join(out, `full-night-${night}.jsonl`), start = performance.now();
        run(`full-night-${night}`, process.execPath, ['src/headless.js', '--seed', '12', '--night', String(night), '--ticks', String(seconds * 60),
            '--snapshot-every', '600', '--scenario', fullNightScenario, '--out', target]);
        const elapsedMs = performance.now() - start, rows = fs.readFileSync(target, 'utf8').trim().split('\n').map(JSON.parse);
        const terminal = rows.find(row => row.name === 'game_over');
        assert.equal(rows.at(-1).ticks, seconds * 60); assert.equal(rows.at(-1).state, 'lost');
        assert.equal(terminal?.data.reason, 'dawn'); assert.ok(elapsedMs < 30000, `night ${night} exceeded 30 seconds`);
        fixtureSummary.push({ name: `full-night-${night}`, night, ticks: seconds * 60, elapsedMs, state: rows.at(-1).state, reason: terminal.data.reason });
    }
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}

const sourceHashes = {};
function scan(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const filename = path.join(folder, entry.name);
        if (entry.isDirectory()) scan(filename);
        else sourceHashes[path.relative(root, filename).replaceAll('\\', '/')] = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    }
}
for (const folder of ['src', 'tests', 'scripts']) scan(path.join(root, folder));
for (const filename of ['game.contract.json', 'package.json', 'package-lock.json', 'index.html', 'AGENTS.md', 'README.md', 'CHANGELOG.md',
    'docs/adr/0003-fuel-and-dawn.md', 'docs/phases/phase-3-spec.md', 'docs/evidence/phase-3-final/browser-review.md',
    '.github/workflows/verify-phase-3.yml']) {
    sourceHashes[filename] = createHash('sha256').update(fs.readFileSync(path.join(root, filename))).digest('hex');
}
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout?.trim() ?? 'unavailable';
const gitStatus = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }).stdout ?? '';
const dirtyPaths = gitStatus.split(/\r?\n/).filter(Boolean).map(line => line.slice(3).replaceAll('\\', '/'))
    .filter(filename => !filename.startsWith('docs/evidence/phase-3-final/')).sort();
const worktreeDirty = dirtyPaths.length > 0;
fs.writeFileSync(path.join(out, 'source-hashes.json'), JSON.stringify(sourceHashes, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'run-summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseCommit: revision,
    worktreeDirty, dirtyPaths, platform: process.platform, arch: process.arch, node: process.version, commands, fixtures: fixtureSummary,
    browser: 'manual production UI inspection is recorded separately; this verifier does not claim browser or FPS evidence' }, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'README.md'), `# Phase 3 verification\n\nContract 1.2 local verification. Tested working tree based on commit: \`${revision}\`.\n\n- Worktree was ${worktreeDirty ? 'dirty' : 'clean'} during verification; changed paths are listed in \`run-summary.json\`.\n- Test suite and production build logs are stored beside this file.\n- Feature fixtures run twice and compare JSONL bytes. Their outputs are under \`fixtures/\`.\n- Three full-duration headless nights reach dawn with no lamps lit and no shades enabled. This validates tick duration and terminal handling, not campaign balance or a human win.\n- Source hashes are in \`source-hashes.json\`; command and runtime details are in \`run-summary.json\`.\n- Browser rendering, manual gameplay and FPS are not claimed by this CLI verifier.\n`);
console.log(`Phase 3 verification passed; evidence written to docs/evidence/phase-3-final (working tree based on ${revision}, ${dirtyPaths.length} changed paths).`);
