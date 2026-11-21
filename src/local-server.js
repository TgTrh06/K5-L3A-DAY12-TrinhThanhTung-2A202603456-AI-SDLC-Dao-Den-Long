import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleLeaderboardApi } from './leaderboard-api.js';
import { readLeaderboard } from './leaderboard-store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.webp', 'image/webp'], ['.ico', 'image/x-icon']]);

export async function serveStatic(request, response, baseDirectory = dist) {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400).end('Bad request'); return; }
    if (pathname === '/') pathname = '/index.html';
    const target = path.resolve(baseDirectory, `.${pathname}`);
    const prefix = `${path.resolve(baseDirectory)}${path.sep}`;
    if (target !== path.resolve(baseDirectory, 'index.html') && !target.startsWith(prefix)) { response.writeHead(403).end('Forbidden'); return; }
    try {
        const body = await fs.readFile(target);
        response.writeHead(200, { 'content-type': mime.get(path.extname(target)) ?? 'application/octet-stream', 'x-content-type-options': 'nosniff' });
        response.end(body);
    } catch (error) {
        if (error.code !== 'ENOENT') { response.writeHead(500).end('Internal server error'); return; }
        if (path.extname(pathname)) { response.writeHead(404).end('Not found'); return; }
        try { response.writeHead(200, { 'content-type': mime.get('.html') }); response.end(await fs.readFile(path.join(baseDirectory, 'index.html'))); }
        catch { response.writeHead(503).end('Build the game first with npm run build.'); }
    }
}

async function main() {
    const args = process.argv.slice(2), exportIndex = args.indexOf('--export-leaderboard');
    if (exportIndex >= 0) {
        const target = args[exportIndex + 1];
        if (!target) { console.error('Usage: node src/local-server.js --export-leaderboard out.json'); process.exitCode = 2; return; }
        const output = path.resolve(target); await fs.mkdir(path.dirname(output), { recursive: true });
        await fs.writeFile(output, `${JSON.stringify({ entries: await readLeaderboard() }, null, 2)}\n`, 'utf8');
        console.log(`Exported leaderboard to ${output}`); return;
    }
    const portIndex = args.indexOf('--port'), port = portIndex >= 0 ? Number(args[portIndex + 1]) : Number(process.env.PORT || 4173);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError('invalid --port');
    const server = http.createServer(async (request, response) => {
        if (await handleLeaderboardApi(request, response)) return;
        if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { allow: 'GET, HEAD' }).end(); return; }
        await serveStatic(request, response);
    });
    server.listen(port, '127.0.0.1', () => console.log(`Đảo Đèn Lồng đang chạy tại http://127.0.0.1:${server.address().port}`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
