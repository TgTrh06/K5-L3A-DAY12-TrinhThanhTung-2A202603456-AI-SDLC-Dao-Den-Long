import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { serveStatic } from '../src/local-server.js';
import { handleLeaderboardApi } from '../src/leaderboard-api.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const psMonitor = path.join(root, 'scripts/rss-monitor.ps1');
function options(args) {
    const result = { seed: 42, duration: 30, out: 'bench.json', debugOut: null };
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i], value = args[i + 1];
        if (!['--seed', '--duration', '--out', '--debug-out'].includes(key) || value === undefined) throw new Error('Usage: node scripts/bench.js --seed 42 --duration 30 --out bench.json [--debug-out bench-profile.json]');
        result[{ '--seed': 'seed', '--duration': 'duration', '--out': 'out', '--debug-out': 'debugOut' }[key]] = ['--out', '--debug-out'].includes(key) ? value : Number(value);
    }
    if (!Number.isInteger(result.seed) || result.seed < 0 || result.seed > 0xffffffff || !Number.isFinite(result.duration) || result.duration <= 0) throw new RangeError('seed and duration are out of range');
    return result;
}
function browserPath() {
    if (process.env.CHROME_BIN || process.env.CHROME_PATH) return process.env.CHROME_BIN || process.env.CHROME_PATH;
    const candidates = process.platform === 'win32'
        ? [path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'), path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google/Chrome/Application/chrome.exe'), path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')]
        : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
            : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
    for (const candidate of candidates) if (candidate && spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0) return candidate;
    throw new Error('Chrome/Chromium not found. Set CHROME_BIN or CHROME_PATH to a Chrome-family browser executable.');
}
function processTreeRss(pid) {
    if (process.platform === 'linux') {
        try {
            const pids = fsSyncReaddir('/proc').filter(name => /^\d+$/.test(name)).map(Number), parents = new Map(), rss = new Map();
            for (const id of pids) {
                try {
                    const stat = fsSyncRead(`/proc/${id}/stat`), close = stat.lastIndexOf(')'), fields = stat.slice(close + 2).split(' ');
                    parents.set(id, Number(fields[1]));
                    const status = fsSyncRead(`/proc/${id}/status`), match = status.match(/VmRSS:\s+(\d+)\s+kB/);
                    rss.set(id, match ? Number(match[1]) * 1024 : 0);
                } catch { /* process ended while enumerating */ }
            }
            const ids = new Set([pid]); let changed = true;
            while (changed) { changed = false; for (const [id, parent] of parents) if (ids.has(parent) && !ids.has(id)) { ids.add(id); changed = true; } }
            return [...ids].reduce((sum, id) => sum + (rss.get(id) ?? 0), 0) / 1048576;
        } catch { return null; }
    }
    if (process.platform === 'darwin') {
        const rows = spawnSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' }).stdout?.trim().split(/\r?\n/) ?? [];
        const table = new Map(rows.map(row => row.trim().split(/\s+/).map(Number)).filter(values => values.length === 3).map(([id, parent, kb]) => [id, { parent, mb: kb / 1024 }]));
        const ids = new Set([pid]); let changed = true;
        while (changed) { changed = false; for (const [id, item] of table) if (ids.has(item.parent) && !ids.has(id)) { ids.add(id); changed = true; } }
        return [...ids].reduce((sum, id) => sum + (table.get(id)?.mb ?? 0), 0);
    }
    return null;
}
let fsSyncReaddir, fsSyncRead;
try {
    const fs = await import('node:fs'); fsSyncReaddir = fs.readdirSync; fsSyncRead = fs.readFileSync;
} catch { /* Node always provides this module */ }

async function main() {
    const processStartedAt = Date.now();
    const config = options(process.argv.slice(2)), chrome = browserPath();
    let profile;
    try { profile = await fs.mkdtemp(path.join(os.tmpdir(), 'dao-den-long-bench-')); }
    catch { profile = await fs.mkdtemp(path.join(root, '.bench-profile-')); }
    let reportResolve, reportReject, maxRss = 0, monitor;
    const reportPromise = new Promise((resolve, reject) => { reportResolve = resolve; reportReject = reject; });
    const server = http.createServer(async (request, response) => {
        if (request.method === 'POST' && request.url === '/__bench-result') {
            const chunks = []; for await (const chunk of request) chunks.push(chunk);
            try { reportResolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); response.writeHead(200).end('ok'); }
            catch { response.writeHead(400).end('invalid JSON'); }
            return;
        }
        if (await handleLeaderboardApi(request, response)) return;
        await serveStatic(request, response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/?bench=1&seed=${config.seed}&duration=${config.duration}&startedAt=${processStartedAt}${config.debugOut ? '&profile=1' : ''}`;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (!response.ok) throw new Error(`benchmark server returned HTTP ${response.status}`);
    } catch (error) {
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
        throw new Error(`Benchmark loopback preflight failed: ${error.cause?.code ?? error.message}. The local browser runner needs TCP access to 127.0.0.1.`);
    }
    const args = ['--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--force-device-scale-factor=1',
        '--window-size=1280,720', `--user-data-dir=${profile}`, `--app=${url}`];
    if (process.platform !== 'win32' && process.getuid?.() === 0) args.unshift('--no-sandbox');
    const child = spawn(chrome, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', error => reportReject(error));
    const monitorPath = path.join(root, 'scripts/rss-monitor.ps1');
    if (process.platform === 'win32') {
        monitor = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', monitorPath, '-RootProcessId', String(child.pid)], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
        monitor.on('error', () => { monitor = null; });
        monitor.stdout.setEncoding('utf8'); monitor.stdout.on('data', data => { for (const line of data.trim().split(/\r?\n/)) maxRss = Math.max(maxRss, Number(line) || 0); });
    }
    const rssTimer = setInterval(() => { const value = processTreeRss(child.pid); if (value !== null) maxRss = Math.max(maxRss, value); }, process.platform === 'win32' ? 1000 : 500);
    const timeout = setTimeout(() => reportReject(new Error('Benchmark timed out before the browser posted a result')), (config.duration + 90) * 1000);
    try {
        const result = await reportPromise;
        await delay(550);
        const output = {
            contract_version: '1.3', avg_fps: result.avg_fps, p1_low_fps: result.p1_low_fps,
            frame_ms_p95: result.frame_ms_p95, frames: result.frames, load_ms: result.load_ms,
            peak_mem_mb: maxRss ? Math.round(maxRss * 10) / 10 : null,
            vsync_off: true, renderer: result.renderer, os: `${os.type()} ${os.release()} (${os.arch()})`,
            ...(maxRss ? {} : { peak_mem_note: 'RSS process-tree sampling was unavailable on this platform; this browser-rendered web build reports null as permitted by Contract 1.3.' }),
        };
        await fs.mkdir(path.dirname(path.resolve(config.out)), { recursive: true });
        await fs.writeFile(path.resolve(config.out), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
        if (config.debugOut) {
            const debugTarget = path.resolve(config.debugOut);
            await fs.mkdir(path.dirname(debugTarget), { recursive: true });
            await fs.writeFile(debugTarget, `${JSON.stringify({ contract_version: '1.3', seed: config.seed, duration_s: config.duration,
                viewport: result.viewport, renderer: result.renderer, debug_frame_times: result.debug_frame_times,
                debug_renderer: result.debug_renderer }, null, 2)}\n`, 'utf8');
        }
        console.log(JSON.stringify(output, null, 2));
    } finally {
        clearInterval(rssTimer); clearTimeout(timeout);
        if (monitor && !monitor.killed) monitor.kill();
        if (!child.killed) child.kill();
        if (process.platform === 'win32' && child.pid) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        await new Promise(resolve => server.close(resolve));
        try { await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); }
        catch (error) { console.error(`Benchmark completed, but its temporary Chrome profile was retained: ${error.code ?? error.message}`); }
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
