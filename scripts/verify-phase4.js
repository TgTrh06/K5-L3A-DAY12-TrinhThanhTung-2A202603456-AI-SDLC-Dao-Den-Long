import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/evidence/phase-4-final');
fs.mkdirSync(out, { recursive: true });
const commands = [];
function run(label, args, { timeout = 8 * 60 * 1000 } = {}) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout, maxBuffer: 24 * 1024 * 1024, windowsHide: true });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    fs.writeFileSync(path.join(out, `${label}.txt`), `${output}\nexit_code=${result.status}\n`);
    commands.push({ label, command: [process.execPath, ...args], exitCode: result.status, signal: result.signal ?? null, timedOut: Boolean(result.error?.code === 'ETIMEDOUT') });
    assert.equal(result.status, 0, `${label} failed; see docs/evidence/phase-4-final/${label}.txt`);
    return output;
}

run('tests', ['--test']);
run('build', ['node_modules/vite/bin/vite.js', 'build']);
run('soak', ['--jitless', '--expose-gc', '--max-old-space-size=16', '--max-semi-space-size=1',
    'scripts/soak.js', '--seed', '7', '--nights', '10', '--out', path.join(out, 'soak.json')]);
run('release-package', ['scripts/package-release.js']);
run('benchmark', ['scripts/bench.js', '--seed', '42', '--duration', '30', '--out', path.join(out, 'bench.json')], { timeout: 180000 });

const bench = JSON.parse(fs.readFileSync(path.join(out, 'bench.json'), 'utf8'));
assert.equal(bench.contract_version, '1.3');
for (const field of ['avg_fps', 'p1_low_fps', 'frame_ms_p95', 'frames', 'load_ms', 'vsync_off', 'renderer', 'os']) assert.ok(field in bench, `bench missing ${field}`);
assert.ok(bench.peak_mem_mb === null || Number.isFinite(bench.peak_mem_mb));
const soak = JSON.parse(fs.readFileSync(path.join(out, 'soak.json'), 'utf8'));
assert.equal(soak.nights, 10); assert.equal(soak.results.length, 10); assert.equal(soak.crashes, 0);
assert.ok(soak.mem_end_mb <= 1.2 * soak.mem_start_mb, 'soak RSS end exceeds 1.2× start');
for (const file of ['dist/index.html', 'dist/assets', 'src/local-server.js', 'src/leaderboard-api.js', 'src/leaderboard-store.js', 'src/leaderboard.js', 'LICENSE', 'CREDITS.md']) {
    assert.ok(fs.existsSync(path.join(root, 'release/dao-den-long-v1.0.0', file)), `release package missing ${file}`);
}
for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md', 'CREDITS.md', 'docs/retro.md', 'docs/phases/phase-4-spec.md']) assert.ok(fs.existsSync(path.join(root, file)), `required delivery file missing: ${file}`);

const hashes = {};
function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) scan(filename);
        else hashes[path.relative(root, filename).replaceAll('\\', '/')] = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    }
}
for (const directory of ['src', 'tests', 'scripts']) scan(path.join(root, directory));
for (const file of ['game.contract.json', 'package.json', 'package-lock.json', 'index.html', 'vite.config.js', 'AGENTS.md', 'README.md', 'CHANGELOG.md',
    'CREDITS.md', 'LICENSE', 'docs/adr/0004-local-runtime-and-phase4-metrics.md', 'docs/phases/phase-4-spec.md']) {
    hashes[file] = createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout?.trim() ?? 'unavailable';
const status = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }).stdout ?? '';
const dirtyPaths = status.split(/\r?\n/).filter(Boolean).map(line => line.slice(3).replaceAll('\\', '/')).filter(file => !file.startsWith('docs/evidence/phase-4-final/')).sort();
fs.writeFileSync(path.join(out, 'source-hashes.json'), `${JSON.stringify(hashes, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'run-summary.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), baseCommit: revision, worktreeDirty: dirtyPaths.length > 0,
    dirtyPaths, platform: process.platform, arch: process.arch, node: process.version, os: `${os.type()} ${os.release()}`, commands,
    benchmark: 'Chrome/Chromium renderer. Local host data is reference only; instructor machine determines FPS acceptance.',
    soak: 'V8 JIT disabled and heap semi-space bounded to reduce first-run code-cache RSS noise while stressing repeated headless state allocation; simulation inputs/rules are unchanged.',
    browser: 'Manual settings, menu, leaderboard reload, shade alerts and large-text layout are documented separately.' }, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'README.md'), `# Phase 4 verification — Contract 1.3\n\n- The full public test suite includes Phase 1–3 regression cases; the production build log is beside this file.\n- Chrome benchmark and one-process ten-night soak results are stored as bench.json and soak.json. Raw commands, host and source hashes are recorded in run-summary.json and source-hashes.json.\n- Benchmark FPS is host-specific and does not predict the instructor-machine result. VSync and peak RSS are reported as observed by the runner.\n- The runnable release folder and archive are prepared under release/; they still need to be attached to an authorized GitHub Release.\n- Manual browser review, human gameplay recording, remote Phase 4 Ubuntu run, tag phase-4 and GitHub Release v1.0.0 remain separate gates until their evidence/actions are recorded.\n`);
console.log(`Phase 4 verification passed; evidence written to docs/evidence/phase-4-final (base ${revision}).`);
