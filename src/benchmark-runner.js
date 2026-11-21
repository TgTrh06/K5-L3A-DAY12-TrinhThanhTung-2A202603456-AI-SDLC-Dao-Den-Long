import { summarizeFrameTimes } from './bench-metrics.js';
import { REVISION } from 'three';

export function createBenchmarkRunner({ seed, durationSeconds, startedAt, renderer }) {
    const bootAt = performance.now(), intervals = [];
    const intervalTimes = [], longTasks = [], slowFrameStages = [], profiling = new URLSearchParams(location.search).has('profile');
    let previous = null, measurementStart = null, posted = false, loadMs = null;
    let longTaskObserver = null;
    if (profiling && 'PerformanceObserver' in window) {
        try {
            longTaskObserver = new PerformanceObserver(entries => {
                for (const entry of entries.getEntries()) longTasks.push({ at_ms: entry.startTime, duration_ms: entry.duration });
            });
            longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch { /* The diagnostic remains optional on browsers without Long Tasks. */ }
    }
    const post = async () => {
        if (posted) return; posted = true;
        const summary = summarizeFrameTimes(intervals);
        // Kept outside the Contract payload by scripts/bench.js. This lets us
        // diagnose stutter without weakening or changing benchmark metrics.
        const slowest = intervals.map((duration, index) => ({ duration, at: intervalTimes[index] ?? 0 })).sort((a, b) => b.duration - a.duration);
        const debugFrameTimes = {
            max_ms: Math.round((slowest[0]?.duration ?? 0) * 10) / 10,
            over_33ms: intervals.filter(value => value > 33.333).length,
            over_50ms: intervals.filter(value => value > 50).length,
            slowest_frames: slowest.slice(0, 8).map(item => ({ at_s: Math.round(item.at / 100) / 10, duration_ms: Math.round(item.duration * 10) / 10 })),
            long_tasks: longTasks.filter(task => task.at_ms >= (measurementStart ?? 0)).map(task => ({
                at_s: Math.round((task.at_ms - measurementStart) / 100) / 10,
                duration_ms: Math.round(task.duration_ms * 10) / 10,
            })),
            slow_frame_stages: slowFrameStages,
        };
        const report = {
            contract_version: '1.3', ...summary,
            load_ms: loadMs,
            peak_mem_mb: null,
            vsync_off: true,
            renderer: `Three.js ${REVISION} · WebGLRenderer · ${navigator.userAgent}`,
            os: navigator.userAgentData?.platform ?? navigator.platform ?? 'unknown',
            seed, duration_s: durationSeconds,
            viewport: { width: innerWidth, height: innerHeight, device_pixel_ratio: devicePixelRatio },
            debug_frame_times: debugFrameTimes,
            debug_renderer: {
                calls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
                points: renderer.info.render.points,
                lines: renderer.info.render.lines,
                textures: renderer.info.memory.textures,
                geometries: renderer.info.memory.geometries,
            },
        };
        window.__daoDenLongBench = report;
        await fetch('/__bench-result', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(report) });
        longTaskObserver?.disconnect();
    };
    return {
        profiling,
        afterFrame(now, simulationMs = 0, worldMs = 0, renderMs = 0) {
            if (posted) return;
            if (loadMs === null) loadMs = Math.max(0, Math.round(Date.now() - startedAt));
            if (measurementStart === null) {
                if (now - bootAt >= 3000) { measurementStart = now; previous = now; }
                return;
            }
            const end = measurementStart + durationSeconds * 1000;
            const intervalEnd = Math.min(now, end), delta = intervalEnd - previous;
            if (delta > 0) {
                intervals.push(delta); intervalTimes.push(intervalEnd - measurementStart);
                if (profiling && delta > 33.333) slowFrameStages.push({
                    at_s: Math.round((intervalEnd - measurementStart) / 100) / 10,
                    frame_ms: Math.round(delta * 10) / 10,
                    simulation_ms: Math.round(simulationMs * 10) / 10,
                    world_ms: Math.round(worldMs * 10) / 10,
                    render_ms: Math.round(renderMs * 10) / 10,
                });
            }
            previous = intervalEnd;
            if (now >= end) void post();
        },
    };
}
