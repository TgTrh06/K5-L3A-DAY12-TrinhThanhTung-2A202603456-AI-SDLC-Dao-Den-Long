import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'dist'), destination = path.join(root, 'release', 'dao-den-long-v1.0.0');
const releaseRoot = path.join(root, 'release');
const archive = path.join(releaseRoot, 'dao-den-long-v1.0.0.tar.gz');
const serverFiles = ['local-server.js', 'leaderboard-api.js', 'leaderboard-store.js', 'leaderboard.js'];

if (!destination.startsWith(`${releaseRoot}${path.sep}`)) throw new Error('release output must stay inside the repository release directory');
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
const webRoot = path.join(destination, 'dist');
await fs.mkdir(webRoot, { recursive: true });
await fs.copyFile(path.join(source, 'index.html'), path.join(webRoot, 'index.html'));
await fs.cp(path.join(source, 'assets'), path.join(webRoot, 'assets'), { recursive: true });
await fs.mkdir(path.join(destination, 'src'), { recursive: true });
for (const filename of serverFiles) await fs.copyFile(path.join(root, 'src', filename), path.join(destination, 'src', filename));
await fs.writeFile(path.join(destination, 'package.json'), `${JSON.stringify({ name: 'dao-den-long', version: '1.0.0', private: true, type: 'module',
    scripts: { start: 'node src/local-server.js' }, engines: { node: '>=20.19.0 <21 || >=22.12.0' } }, null, 2)}\n`, 'utf8');
for (const filename of ['LICENSE', 'CREDITS.md']) await fs.copyFile(path.join(root, filename), path.join(destination, filename));
await fs.writeFile(path.join(destination, 'RELEASE-README.md'), `# Đảo Đèn Lồng v1.0.0\n\nRequirements: Node.js 20.19+ or 22.12+ and a browser with WebGL. No npm install or API key is required.\n\nRun node src/local-server.js from this folder and open http://127.0.0.1:4173. The server binds only to loopback and stores leaderboard data in the current OS user's application-data directory.\n\nExport the same scores with node src/local-server.js --export-leaderboard leaderboard.json. To use a separate storage directory, set DAO_DEN_LONG_DATA_DIR before starting the server.\n\nThis release archive is a runnable build folder, not the source repository. The source, harness and test evidence remain in the public project repository.\n`, 'utf8');
await fs.rm(archive, { force: true });
const packed = spawnSync('tar', ['-czf', archive, '-C', releaseRoot, path.basename(destination)], { cwd: root, encoding: 'utf8', windowsHide: true });
if (packed.status !== 0) throw new Error(`tar failed while creating release archive: ${packed.stderr || packed.error?.message || packed.status}`);
console.log(`Prepared runnable release folder and archive: ${path.relative(root, archive).replaceAll('\\', '/')}`);
