import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { rankLeaderboard, addLeaderboardEntry } from './leaderboard.js';

export function leaderboardFilePath(env = process.env, home = os.homedir(), platform = process.platform) {
    if (env.DAO_DEN_LONG_DATA_DIR) return path.join(env.DAO_DEN_LONG_DATA_DIR, 'leaderboard.json');
    if (platform === 'win32') return path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'DaoDenLong', 'leaderboard.json');
    if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'DaoDenLong', 'leaderboard.json');
    return path.join(env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'dao-den-long', 'leaderboard.json');
}

export async function readLeaderboard(filename = leaderboardFilePath()) {
    try {
        const value = JSON.parse(await fs.readFile(filename, 'utf8'));
        return rankLeaderboard(Array.isArray(value.entries) ? value.entries : []);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

export async function saveLeaderboardEntry(entry, filename = leaderboardFilePath()) {
    const entries = addLeaderboardEntry(await readLeaderboard(filename), entry);
    await fs.mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, filename);
    return entries;
}
