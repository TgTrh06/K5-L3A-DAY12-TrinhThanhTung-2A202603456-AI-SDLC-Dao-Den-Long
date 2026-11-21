import { summarizeFrameTimes } from './bench-metrics.js';
import { REVISION } from 'three';

export function createBenchmarkRunner({ seed, durationSeconds, startedAt }) {
    const bootAt = performance.now(), intervals = [];
    let previous = null, measurementStart = null, posted = false, loadMs = null;
    const post = async () => {
        if (posted) return; posted = true;
        const summary = summarizeFrameTimes(intervals);
        const report = {
            contract_version: '1.3', ...summary,
            load_ms: loadMs,
            peak_mem_mb: null,
            vsync_off: true,
            renderer: `Three.js ${REVISION} · WebGLRenderer · ${navigator.userAgent}`,
            os: navigator.userAgentData?.platform ?? navigator.platform ?? 'unknown',
            seed, duration_s: durationSeconds,
            viewport: { width: innerWidth, height: innerHeight, device_pixel_ratio: devicePixelRatio },
        };
        window.__daoDenLongBench = report;
        await fetch('/__bench-result', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(report) });
    };
    return {
        afterFrame(now) {
            if (posted) return;
            if (loadMs === null) loadMs = Math.max(0, Math.round(Date.now() - startedAt));
            if (measurementStart === null) {
                if (now - bootAt >= 3000) { measurementStart = now; previous = now; }
                return;
            }
            const end = measurementStart + durationSeconds * 1000;
            const intervalEnd = Math.min(now, end), delta = intervalEnd - previous;
            if (delta > 0) intervals.push(delta);
            previous = intervalEnd;
            if (now >= end) void post();
        },
    };
}
