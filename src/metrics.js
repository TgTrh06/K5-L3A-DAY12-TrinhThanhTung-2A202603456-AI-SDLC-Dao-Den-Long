// Opt-in production observation only. No access to gameplay state or input.
export function attachMetrics(renderer) {
    const WARMUP_MS = 10000, SAMPLE_MS = 60000;
    const panel = document.createElement('section'); panel.id = 'metrics';
    panel.style.cssText = 'position:fixed;z-index:20;right:12px;top:190px;width:280px;max-height:65vh;overflow:auto;background:#101d35f5;color:#f2e5c5;padding:12px;border:1px solid #c6a568;font:11px monospace';
    panel.innerHTML = '<strong>PRODUCTION · OBSERVATION ONLY</strong><p>Warm-up 10 giây, sau đó đo 60 giây khi trang hiển thị và có focus. Không replay hoặc sửa state.</p><button id="metrics-start">Bắt đầu đo</button><pre id="metrics-report" style="white-space:pre-wrap"></pre>';
    document.body.append(panel);
    const report = panel.querySelector('#metrics-report');
    let running = false, prev = null, warm = 0, active = 0, values = [], excluded = 0, lastPaint = 0;
    panel.querySelector('#metrics-start').onclick = () => {
        running = true; prev = null; warm = 0; active = 0; values = []; excluded = 0;
        renderer.domElement.focus();
    };
    function frame(now) {
        requestAnimationFrame(frame);
        if (!running) return;
        const visible = document.visibilityState === 'visible', focused = document.hasFocus();
        if (!visible || !focused) { excluded++; prev = null; }
        else if (prev === null) prev = now;
        else {
            const delta = now - prev; prev = now;
            if (warm < WARMUP_MS) warm += delta;
            else { active += delta; values.push(delta); }
        }
        if (now - lastPaint < 500 && active < SAMPLE_MS) return;
        lastPaint = now;
        const sorted = [...values].sort((a, b) => a - b), mean = values.length ? active / values.length : null;
        const viewport = { width: innerWidth, height: innerHeight, pixelRatio: renderer.getPixelRatio() };
        const complete = active >= SAMPLE_MS;
        const viewportMatchesTarget = viewport.width === 1280 && viewport.height === 720;
        report.textContent = JSON.stringify({ mode: 'production observation, no replay; 60-second benchmark after warm-up', complete, acceptanceCandidate: complete && viewportMatchesTarget && visible && focused && excluded === 0 && mean !== null && 1000 / mean >= 30, targetViewport: { width: 1280, height: 720 }, viewportMatchesTarget, warmupTargetMs: WARMUP_MS, activeSampleMs: active, visible, focused, excludedHiddenOrUnfocusedFrames: excluded, sampleCount: values.length, meanFrameMs: mean, meanFps: mean ? 1000 / mean : null, p95FrameMs: sorted.length ? sorted[Math.floor((sorted.length - 1) * .95)] : null, maxFrameMs: sorted.at(-1) ?? null, geometryCount: renderer.info.memory.geometries, textureCount: renderer.info.memory.textures, drawCalls: renderer.info.render.calls, heapBytes: performance.memory?.usedJSHeapSize ?? null, viewport, userAgent: navigator.userAgent, hud: document.querySelector('#hud')?.innerText }, null, 2);
        if (active >= SAMPLE_MS) running = false;
    }
    requestAnimationFrame(frame);
}
