export const LEADERBOARD_LIMIT = 10;
const TIME_ZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i;

export function validateLeaderboardEntry(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('entry must be an object');
    const { name, score, nights_won, achieved_at, seed } = value;
    if (typeof name !== 'string' || !/^[A-Za-z0-9_]{3,12}$/.test(name)) throw new TypeError('name must match [A-Za-z0-9_]{3,12}');
    if (!Number.isSafeInteger(score) || score < 0) throw new TypeError('score must be a non-negative integer');
    if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new TypeError('nights_won must be between 0 and 3');
    if (typeof achieved_at !== 'string' || !TIME_ZONE_SUFFIX.test(achieved_at) || !Number.isFinite(Date.parse(achieved_at))) {
        throw new TypeError('achieved_at must be an ISO 8601 timestamp with a timezone');
    }
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new TypeError('seed must be an unsigned 32-bit integer');
    return { name, score, nights_won, achieved_at, seed };
}

export function rankLeaderboard(entries) {
    return entries.map(validateLeaderboardEntry)
        .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at))
        .slice(0, LEADERBOARD_LIMIT);
}

export function addLeaderboardEntry(entries, entry) {
    return rankLeaderboard([...entries, validateLeaderboardEntry(entry)]);
}
