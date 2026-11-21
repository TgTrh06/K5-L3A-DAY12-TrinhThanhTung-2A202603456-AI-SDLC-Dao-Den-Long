import { readLeaderboard, saveLeaderboardEntry } from './leaderboard-store.js';

function sendJson(response, status, value) {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(`${JSON.stringify(value)}\n`);
}

async function readBody(request, maxBytes = 8192) {
    const chunks = []; let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > maxBytes) throw new RangeError('request body too large');
        chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function handleLeaderboardApi(request, response) {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname !== '/api/leaderboard') return false;
    try {
        if (request.method === 'GET') { sendJson(response, 200, { entries: await readLeaderboard() }); return true; }
        if (request.method === 'POST') { const entries = await saveLeaderboardEntry(await readBody(request)); sendJson(response, 201, { entries }); return true; }
        response.setHeader('allow', 'GET, POST'); sendJson(response, 405, { error: 'method_not_allowed' }); return true;
    } catch (error) {
        const status = error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError ? 400 : 500;
        sendJson(response, status, { error: status === 400 ? error.message : 'storage_error' }); return true;
    }
}
