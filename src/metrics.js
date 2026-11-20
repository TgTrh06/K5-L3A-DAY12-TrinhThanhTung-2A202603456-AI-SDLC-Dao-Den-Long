// Opt-in production observation only. No access to gameplay state or input.
export function attachMetrics(renderer) {
    const panel = document.createElement('section'); panel.id = 'metrics';
    panel.style.cssText = 'position:fixed;z-index:20;right:12px;top:190px;width:280px;max-height:65vh;overflow:auto;background:#101d35f5;color:#f2e5c5;padding:12px;border:1px solid #c6a568;font:11px monospace';
    panel.innerHTML = '<strong>PRODUCTION · OBSERVATION ONLY</strong><p>Mẫu ngắn 5 giây hiển thị/có focus, sau 1 giây warm-up. Không replay hoặc sửa state.</p><button id="metrics-start">Bắt đầu đo</button><pre id="metrics-report" style="white-space:pre-wrap"></pre>';
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
            if (warm < 1000) warm += delta;
            else { active += delta; values.push(delta); }
        }
        if (now - lastPaint < 500 && active < 5000) return;
        lastPaint = now;
        const sorted = [...values].sort((a, b) => a - b), mean = values.length ? active / values.length : null;
        report.textContent = JSON.stringify({ mode: 'production observation, no replay; 5-second smoke sample, not long-run benchmark', complete: active >= 5000, visible, focused, activeSampleMs: active, excludedHiddenOrUnfocusedFrames: excluded, sampleCount: values.length, meanFrameMs: mean, meanFps: mean ? 1000 / mean : null, p95FrameMs: sorted.length ? sorted[Math.floor((sorted.length - 1) * .95)] : null, maxFrameMs: sorted.at(-1) ?? null, geometryCount: renderer.info.memory.geometries, textureCount: renderer.info.memory.textures, drawCalls: renderer.info.render.calls, heapBytes: performance.memory?.usedJSHeapSize ?? null, viewport: { width: innerWidth, height: innerHeight, pixelRatio: renderer.getPixelRatio() }, userAgent: navigator.userAgent, hud: document.querySelector('#hud')?.innerText }, null, 2);
        if (active >= 5000) running = false;
    }
    requestAnimationFrame(frame);
}
