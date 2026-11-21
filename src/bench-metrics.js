const round1 = value => Math.round(value * 10) / 10;

export function summarizeFrameTimes(frameTimesMs) {
    if (!Array.isArray(frameTimesMs) || frameTimesMs.some(value => !Number.isFinite(value) || value <= 0)) {
        throw new TypeError('frame times must be positive finite milliseconds');
    }
    const frames = frameTimesMs.length;
    if (!frames) throw new RangeError('at least one frame interval is required');
    const sorted = [...frameTimesMs].sort((a, b) => a - b);
    const total = frameTimesMs.reduce((sum, value) => sum + value, 0);
    const k = Math.max(1, Math.ceil(.01 * frames));
    const slowestMean = sorted.slice(-k).reduce((sum, value) => sum + value, 0) / k;
    const p95Index = Math.max(0, Math.ceil(.95 * frames) - 1);
    return {
        avg_fps: round1(1000 * frames / total),
        p1_low_fps: round1(1000 / slowestMean),
        frame_ms_p95: round1(sorted[p95Index]),
        frames,
    };
}
