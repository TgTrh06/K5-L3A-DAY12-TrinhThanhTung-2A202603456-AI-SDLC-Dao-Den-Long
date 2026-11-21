import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { handleLeaderboardApi } from '../src/leaderboard-api.js';
import { leaderboardFilePath, readLeaderboard, saveLeaderboardEntry } from '../src/leaderboard-store.js';
import { serveStatic } from '../src/local-server.js';

test('leaderboard is persisted under OS data dir and exports in ranked order', async () => {
    const dir = await fs.mkdtemp(path.join(process.cwd(), '.tmp-phase4-board-')), previous = process.env.DAO_DEN_LONG_DATA_DIR;
    process.env.DAO_DEN_LONG_DATA_DIR = dir;
    try {
        const file = leaderboardFilePath();
        await saveLeaderboardEntry({ name: 'Lower', score: 20, nights_won: 1, achieved_at: '2026-01-02T00:00:00Z', seed: 4 }, file);
        await saveLeaderboardEntry({ name: 'Higher', score: 30, nights_won: 2, achieved_at: '2026-01-01T00:00:00Z', seed: 5 }, file);
        assert.deepEqual((await readLeaderboard(file)).map(item => item.name), ['Higher', 'Lower']);
        const target = path.join(dir, 'export.json');
        const result = spawnSync(process.execPath, ['src/local-server.js', '--export-leaderboard', target], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')).entries.map(item => item.name), ['Higher', 'Lower']);
    } finally {
        if (previous === undefined) delete process.env.DAO_DEN_LONG_DATA_DIR; else process.env.DAO_DEN_LONG_DATA_DIR = previous;
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('loopback API validates writes and serves leaderboard over GET', async () => {
    const dir = await fs.mkdtemp(path.join(process.cwd(), '.tmp-phase4-api-')), previous = process.env.DAO_DEN_LONG_DATA_DIR;
    process.env.DAO_DEN_LONG_DATA_DIR = dir;
    const mock = (method, url, value) => {
        const request = Object.assign(Readable.from(value === undefined ? [] : [Buffer.from(JSON.stringify(value))]), { method, url });
        const response = { status: 0, headers: {}, body: '', writeHead(status, headers = {}) { this.status = status; this.headers = headers; return this; },
            setHeader(key, value) { this.headers[key] = value; }, end(body = '') { this.body += body; } };
        return { request, response };
    };
    try {
        let pair = mock('POST', '/api/leaderboard', { name: 'Tung_01', score: 100, nights_won: 1, achieved_at: '2026-11-21T12:00:00+07:00', seed: 12 });
        assert.equal(await handleLeaderboardApi(pair.request, pair.response), true); assert.equal(pair.response.status, 201);
        pair = mock('POST', '/api/leaderboard', { name: 'not valid', score: 100, nights_won: 1, achieved_at: '2026-11-21T12:00:00Z', seed: 12 });
        await handleLeaderboardApi(pair.request, pair.response); assert.equal(pair.response.status, 400);
        pair = mock('GET', '/api/leaderboard'); await handleLeaderboardApi(pair.request, pair.response); assert.equal(pair.response.status, 200);
        assert.equal(JSON.parse(pair.response.body).entries[0].name, 'Tung_01');
    } finally {
        if (previous === undefined) delete process.env.DAO_DEN_LONG_DATA_DIR; else process.env.DAO_DEN_LONG_DATA_DIR = previous;
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('local static server serves built files and rejects traversal', async () => {
    const dir = await fs.mkdtemp(path.join(process.cwd(), '.tmp-phase4-static-'));
    try {
        await fs.writeFile(path.join(dir, 'index.html'), '<h1>game</h1>');
        let captured = { status: 200, headers: {}, body: null };
        const response = { writeHead(status, headers = {}) { captured.status = status; captured.headers = headers; return this; }, end(body) { captured.body = body; } };
        await serveStatic({ url: '/' }, response, dir); assert.equal(captured.status, 200); assert.match(String(captured.headers['content-type']), /text\/html/);
        await serveStatic({ url: '/missing.js' }, response, dir); assert.equal(captured.status, 404);
        await serveStatic({ url: '/..%2f..%2fwindows/win.ini' }, response, dir); assert.equal(captured.status, 403);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
