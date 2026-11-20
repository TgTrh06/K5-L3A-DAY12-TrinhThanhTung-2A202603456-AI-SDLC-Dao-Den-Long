// Development-only observation/input harness. Never mutates simulation state.
export function createVerification(renderer, restart) {
    const panel = document.createElement('section');
    panel.id = 'verification';
    panel.style.cssText = 'position:fixed;z-index:20;right:12px;top:190px;width:300px;max-height:65vh;overflow:auto;background:#101d35f5;color:#f2e5c5;border:1px solid #c6a568;padding:12px;font:12px monospace';
    panel.innerHTML = '<strong>QA · DEVELOPMENT ONLY</strong><p>Replay hợp lệ từ game mặc định, không thay state. Đây không phải chơi tay.</p><label>File inputs JSON <input id="verify-input" type="file" accept=".json"></label><button id="verify-fixture">Nạp fixture seed 12</button><p id="verify-file">Chưa có input</p><button id="verify-start" disabled>Chạy replay từ đầu</button><button id="verify-download">Tải báo cáo</button><pre id="verify-report" style="white-space:pre-wrap"></pre>';
    document.body.append(panel);
    let frames = [], index = 0, playing = false, previous = {}, frameTimes = [], renderTimes = [], inputLatency = [], keyTime = null, previousTime = null, first = 0, finalTick = 0, pickups = 0, hits = 0, lampEvents = [], lastSummary = '', observedState = 'playing';
    const field = panel.querySelector('#verify-input'), start = panel.querySelector('#verify-start'), report = panel.querySelector('#verify-report');
    let sourceName = null, runMode = 'manual keyboard';
    const load = (parsed, name) => {
        let tick = -1;
        if (!Array.isArray(parsed.frames) || !parsed.frames.every(f => Number.isInteger(f.tick) && f.tick > tick && (tick = f.tick) >= 0 && (!f.move || (f.move.length === 2 && f.move.every(n => Number.isFinite(n) && Math.abs(n) <= 1))))) throw new Error('Invalid inputs');
        frames = parsed.frames; sourceName = name; start.disabled = false; panel.querySelector('#verify-file').textContent = `${frames.length} input frames loaded`;
    };
    field.onchange = async () => {
        try {
            load(JSON.parse(await field.files[0].text()), field.files[0].name);
        } catch (e) { start.disabled = true; panel.querySelector('#verify-file').textContent = e.message; }
    };
    panel.querySelector('#verify-fixture').onclick = async () => {
        try {
            const r = await fetch('/docs/evidence/phase-1-final/full-playthrough-inputs.json');
            if (!r.ok) throw new Error(`Fixture HTTP ${r.status}`);
            load(await r.json(), 'generated seed12 fixture');
        } catch (e) { start.disabled = true; panel.querySelector('#verify-file').textContent = e.message; }
    };
    start.onclick = () => {
        restart(); index = 0; playing = true; runMode = 'input replay'; previous = {}; frameTimes = []; renderTimes = []; inputLatency = []; previousTime = null;
        pickups = 0; hits = 0; lampEvents = []; first = performance.now(); observedState = 'playing'; lastSummary = '';
    };
    addEventListener('keydown', () => { if (!playing) keyTime = performance.now(); });
    panel.querySelector('#verify-download').onclick = () => {
        const a = document.createElement('a'), url = URL.createObjectURL(new Blob([lastSummary], { type: 'application/json' }));
        a.href = url; a.download = `browser-verification-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    };
    const stats = values => {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        return { samples: values.length, meanMs: values.reduce((a, b) => a + b, 0) / values.length, p95Ms: sorted[Math.floor((sorted.length - 1) * .95)], maxMs: sorted.at(-1) };
    };
    return {
        reset() {
            playing = false; runMode = 'manual keyboard'; frameTimes = []; renderTimes = []; inputLatency = [];
            previousTime = null; first = performance.now(); finalTick = 0; pickups = 0; hits = 0; lampEvents = []; lastSummary = ''; observedState = 'playing';
        },
        get active() { return playing; },
        input(tick) {
            if (frames[index]?.tick === tick) previous = { ...previous, ...frames[index++] };
            return previous;
        },
        observe(g, now, events, renderMs, paused) {
            if (g.state !== 'playing' && observedState === g.state) return;
            if (previousTime !== null && !paused && observedState === 'playing' && frameTimes.length < 18000) frameTimes.push(now - previousTime);
            previousTime = now; if (renderTimes.length < 18000 && !paused) renderTimes.push(renderMs);
            if (keyTime !== null) { inputLatency.push(performance.now() - keyTime); keyTime = null; }
            pickups += events.filter(e => e.name === 'mote_picked').length; hits += events.filter(e => e.name === 'player_hit').length;
            for (const e of events.filter(e => e.name === 'lantern_lit')) lampEvents.push({ tick: e.tick, id: e.data.lantern_id });
            finalTick = g.tick; observedState = g.state;
            if (g.state !== 'playing') playing = false;
            const value = { mode: 'development QA; legal input replay or manual controls; not a production benchmark', inputMode: runMode, replayFile: sourceName, state: g.state, tick: finalTick, paused, player: g.player, carriedPickups: pickups, playerHits: hits, lanternsLit: g.lanterns.filter(l => l.lit).length, lampEvents, score: g.score, timeLeft: g.time_left_s, wallElapsedMs: first ? performance.now() - first : null, frameIntervals: stats(frameTimes), renderCpu: stats(renderTimes), keyToNextRender: stats(inputLatency), renderer: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }, heapBytes: performance.memory?.usedJSHeapSize ?? null, userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight, pixelRatio: renderer.getPixelRatio() } };
            // Updating a modest DOM report at ~4 Hz avoids measuring the logger itself every frame.
            if (!lastSummary || g.state !== 'playing' || Math.floor(now / 250) !== Math.floor((now - (frameTimes.at(-1) ?? 16)) / 250)) {
                lastSummary = JSON.stringify(value, null, 2); report.textContent = lastSummary;
            }
        }
    };
}
