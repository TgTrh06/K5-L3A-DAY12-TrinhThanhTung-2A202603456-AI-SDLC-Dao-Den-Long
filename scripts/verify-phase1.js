import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const dir = 'docs/evidence/phase-1-final'; fs.mkdirSync(dir, { recursive: true });
const commands = [];
function run(label, exe, args, options = {}) {
    const result = spawnSync(exe, args, { encoding: 'utf8', ...options });
    fs.writeFileSync(`${dir}/${label}.txt`, (result.stdout ?? '') + (result.stderr ?? '') + `\nexit_code=${result.status}\n`);
    commands.push({ label, command: [exe, ...args], exitCode: result.status });
    if (result.status !== 0) throw new Error(`${label} failed; see actual log`);
}
run('tests', process.execPath, ['--test']);
run('build', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { shell: process.platform === 'win32' });
run('full-playthrough', process.execPath, ['scripts/full-playthrough.js']);
for (const suffix of ['a', 'b']) run(`headless-${suffix}`, process.execPath, ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', '18000', '--inputs', `${dir}/full-playthrough-inputs.json`, '--snapshot-every', '10', '--out', `${dir}/headless-${suffix}.jsonl`]);
assert.equal(fs.readFileSync(`${dir}/headless-a.jsonl`, 'utf8'), fs.readFileSync(`${dir}/headless-b.jsonl`, 'utf8'));
const rows = file => fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
const a = rows(`${dir}/full-playthrough.jsonl`), b = rows(`${dir}/headless-a.jsonl`);
assert.deepEqual(a.filter(r => r.type !== 'snapshot'), b.filter(r => r.type !== 'snapshot'));
const manifest = {};
function scan(root) {
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
        const p = path.join(root, e.name);
        if (e.isDirectory()) scan(p);
        else manifest[p.replaceAll('\\', '/')] = createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
}
for (const root of ['src', 'tests', 'scripts']) scan(root);
for (const p of ['game.contract.json', 'package.json', 'package-lock.json', 'index.html', 'AGENTS.md']) manifest[p] = createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(`${dir}/source-hashes.json`, JSON.stringify(manifest, null, 2));
fs.writeFileSync(`${dir}/run-summary.json`, JSON.stringify({ generatedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, node: process.version, commands, deterministicByteCompare: 'pass', controllerVsCliEventsAndEnd: 'pass', note: 'Local verification; no hidden tests, no Linux or manual-browser victory claim.' }, null, 2));
console.log('Phase 1 automated verification passed; see docs/evidence/phase-1-final.');
