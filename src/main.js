import * as THREE from 'three';
import { createGame, step, T, NIGHT } from './core.js';
import { createWorld } from './visuals/world.js';
import { createHUD } from './visuals/hud.js';
import { readKeyboard, loadBindings, saveBindings, DEFAULT_BINDINGS, BINDING_ACTIONS, validateBindings } from './input.js';
import { createAudio, loadSensitivity, saveSensitivity, loadDistinctPalette, saveDistinctPalette } from './audio.js';
import { createBenchmarkScenario } from './bench-scene.js';
import { createBenchmarkRunner } from './benchmark-runner.js';
import './style.css';

const startupParams = new URLSearchParams(location.search), isBenchmark = startupParams.has('bench');
const benchSeed = Number(startupParams.get('seed') ?? 42), benchDuration = Number(startupParams.get('duration') ?? 30);
const startedAt = Number(startupParams.get('startedAt') ?? Date.now());
let yaw = 0, accumulator = 0, last = 0, screen = isBenchmark ? 'playing' : 'menu', previousScreen = 'menu';
let currentNight = 1, campaignScore = 0, campaignSeed = 12;
let g = isBenchmark ? createGame(benchSeed, createBenchmarkScenario(benchSeed), 1) : createGame(campaignSeed, {}, 1);
const keys = new Set(), pending = new Set(), audio = createAudio();
let bindings = loadBindings();
let distinctPalette = loadDistinctPalette();
document.documentElement.classList.toggle('distinct-palette', distinctPalette);
let reducedMotionEnabled = localStorage.getItem('dao-den-long.reduce-motion') === 'true';
let largeTextEnabled = localStorage.getItem('dao-den-long.large-text') === 'true';
document.documentElement.classList.toggle('reduced-motion', reducedMotionEnabled);
document.documentElement.classList.toggle('large-text', largeTextEnabled);
document.documentElement.classList.add('phase4-type');
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.domElement.setAttribute('aria-label', 'Đảo Đèn Lồng — cảnh game 3D, điều khiển bằng bàn phím');
renderer.domElement.tabIndex = 0; document.body.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
const world = createWorld(renderer, scene, T, g, () => distinctPalette), hud = createHUD(T, () => distinctPalette);
if (new URLSearchParams(location.search).has('metrics')) import('./metrics.js').then(({ attachMetrics }) => attachMetrics(renderer));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const benchmarkRunner = isBenchmark ? createBenchmarkRunner({ seed: benchSeed, durationSeconds: benchDuration, startedAt }) : null;
let verification;
const byId = id => document.getElementById(id);
const setScreen = next => {
    screen = next;
    for (const id of ['menu', 'night-intro', 'pause', 'settings', 'night-result', 'dawn-screen', 'leaderboard-screen', 'score-entry']) byId(id).hidden = id !== ({ menu: 'menu', intro: 'night-intro', paused: 'pause', settings: 'settings', result: 'night-result', dawn: 'dawn-screen', leaderboard: 'leaderboard-screen', scoreEntry: 'score-entry' }[next]);
    const overlay = ['menu', 'intro', 'result', 'dawn', 'settings', 'leaderboard', 'scoreEntry'].includes(next);
    byId('hud').hidden = overlay && next !== 'settings'; document.querySelector('.bottom-ui').hidden = overlay;
    if (isBenchmark) { byId('hud').hidden = true; document.querySelector('.bottom-ui').hidden = true; }
    if (next === 'playing') { renderer.domElement.focus(); last = 0; accumulator = 0; }
};
function buildNight(night, mode = 'intro') {
    currentNight = night; g = createGame(campaignSeed, {}, night); g.campaignScore = campaignScore;
    const config = NIGHT[night]; byId('intro-night-label').textContent = `ĐÊM 0${night} · ${config.name.toLocaleUpperCase('vi')}`;
    byId('intro-title').textContent = config.name;
    byId('intro-copy').textContent = night === 1 ? 'Đêm đầu tiên, Mây rời bến để thắp đèn và giữ đảo sáng tới bình minh.' : night === 2 ? 'Hai đảo và một cầu tre đang chờ. Giữ ít nhất bốn ngọn đèn sáng tới bình minh.' : 'Ba tầng đảo chuông bị gió lớn bao phủ. Giữ ít nhất năm ngọn đèn sáng tới bình minh.';
    hud.update(g); verification?.reset(); setScreen(mode);
}
function startNight() { audio.unlock(); audio.startNight(currentNight); setScreen('playing'); }
function retryNight() { buildNight(currentNight, 'playing'); audio.startNight(currentNight); }
function openSettings() {
    previousScreen = screen; byId('volume').value = audio.volume; byId('sensitivity').value = loadSensitivity();
    byId('distinct-palette').checked = distinctPalette; byId('reduce-motion').checked = reducedMotionEnabled; byId('large-text').checked = largeTextEnabled;
    bindings = loadBindings(); updateBindingInputs(); setScreen('settings');
}
function updateBindingInputs() {
    document.querySelectorAll('[data-key-bind]').forEach(input => {
        const code = bindings[input.dataset.keyBind];
        input.value = ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', ShiftLeft: 'Shift' })[code] ?? code.replace(/^(Key|Digit)/, '');
    });
    const validation = validateBindings(bindings); byId('key-conflict').textContent = validation.valid ? '' : validation.reason;
    byId('key-conflict').hidden = validation.valid; byId('save-key-bindings').disabled = !validation.valid;
}
function restoreAfterScoreEntry() { byId('score-entry').hidden = true; }
function promptLeaderboard(afterScreen, nightsWon) {
    previousScreen = afterScreen;
    byId('score-entry-summary').textContent = `${campaignScore} điểm · ${nightsWon}/3 Đêm thắng`;
    byId('score-entry-name').value = '';
    byId('score-entry-error').hidden = true;
    byId('score-entry').hidden = false; byId('score-entry-name').focus();
}
async function refreshLeaderboard() {
    const list = byId('leaderboard-entries'), status = byId('leaderboard-status');
    status.textContent = 'Đang tải bảng xếp hạng…'; list.replaceChildren();
    try {
        const response = await fetch('/api/leaderboard'); if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { entries } = await response.json();
        for (const [index, entry] of entries.entries()) {
            const row = document.createElement('li'); row.textContent = `${index + 1}. ${entry.name} — ${entry.score} điểm · ${entry.nights_won}/3 Đêm`; list.append(row);
        }
        status.textContent = entries.length ? '' : 'Chưa có điểm nào được lưu trên thiết bị này.';
    } catch { status.textContent = 'Không kết nối được kho điểm cục bộ. Hãy chạy game bằng npm run preview.'; }
}
function openLeaderboard(from = 'menu') { previousScreen = from; setScreen('leaderboard'); void refreshLeaderboard(); }
function showResult() {
    if (g.state === 'won' && currentNight === 3) {
        campaignScore = g.campaignScore; byId('campaign-score').textContent = `${campaignScore} điểm toàn hành trình`; setScreen('dawn'); promptLeaderboard('dawn', 3); return;
    }
    if (g.state === 'won') campaignScore = g.campaignScore;
    byId('result-label').textContent = `ĐÊM 0${currentNight} · ${NIGHT[currentNight].name.toLocaleUpperCase('vi')}`;
    byId('result-title').textContent = g.state === 'won' ? 'Bình minh đã tới' : 'Đêm nay khép lại';
    byId('result-copy').textContent = g.state === 'won' ? `Mây đã giữ ${g.lanterns.filter(l => l.lit).length} ngọn đèn sáng qua đêm.` : 'Mây có thể thử lại đêm này khi đã sẵn sàng.';
    byId('night-score').textContent = `${g.score} điểm · ${g.lanterns.filter(l => l.lit).length}/${g.lanterns.length} đèn`;
    byId('result-primary').textContent = g.state === 'won' ? 'Tiếp tục hành trình' : 'Thử lại đêm';
    byId('result-primary').onclick = () => g.state === 'won' ? buildNight(currentNight + 1, 'intro') : retryNight();
    setScreen('result');
    if (g.state === 'lost') promptLeaderboard('result', currentNight - 1);
}
function returnToMenu() { campaignScore = 0; buildNight(1, 'menu'); }

byId('start-game').onclick = () => { campaignScore = 0; campaignSeed = 12; buildNight(1, 'intro'); };
byId('begin-night').onclick = startNight;
byId('resume').onclick = () => { if (g.state === 'paused') { g.input.pause = false; step(g, { pause: true }); setScreen('playing'); } };
byId('retry-night').onclick = retryNight;
byId('return-menu').onclick = returnToMenu;
byId('open-settings-menu').onclick = openSettings; byId('open-settings-pause').onclick = openSettings;
byId('open-leaderboard-menu').onclick = () => openLeaderboard('menu');
byId('refresh-leaderboard').onclick = () => { void refreshLeaderboard(); };
byId('close-leaderboard').onclick = () => setScreen(previousScreen);
byId('close-settings').onclick = () => setScreen(previousScreen);
byId('volume').oninput = e => audio.setVolume(e.target.value);
byId('sensitivity').oninput = e => { saveSensitivity(e.target.value); };
byId('distinct-palette').onchange = e => {
    distinctPalette = saveDistinctPalette(e.target.checked);
    document.documentElement.classList.toggle('distinct-palette', distinctPalette);
};
byId('reduce-motion').onchange = e => {
    reducedMotionEnabled = e.target.checked; localStorage.setItem('dao-den-long.reduce-motion', String(reducedMotionEnabled));
    document.documentElement.classList.toggle('reduced-motion', reducedMotionEnabled);
};
byId('large-text').onchange = e => {
    largeTextEnabled = e.target.checked; localStorage.setItem('dao-den-long.large-text', String(largeTextEnabled));
    document.documentElement.classList.toggle('large-text', largeTextEnabled);
};
let rebindingAction = null;
document.querySelectorAll('[data-key-bind]').forEach(input => input.addEventListener('focus', () => {
    rebindingAction = input.dataset.keyBind; input.value = 'Nhấn phím…';
}));
byId('save-key-bindings').onclick = () => {
    try { bindings = saveBindings(bindings); updateBindingInputs(); byId('key-conflict').hidden = true; }
    catch (error) { byId('key-conflict').textContent = error.message; byId('key-conflict').hidden = false; }
};
byId('reset-key-bindings').onclick = () => { bindings = { ...DEFAULT_BINDINGS }; updateBindingInputs(); };
byId('score-entry-form').addEventListener('submit', async event => {
    event.preventDefault(); const name = byId('score-entry-name').value;
    try {
        const response = await fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, score: campaignScore, nights_won: previousScreen === 'dawn' ? 3 : currentNight - 1, achieved_at: new Date().toISOString(), seed: campaignSeed }) });
        if (!response.ok) { const data = await response.json(); throw new Error(data.error || `HTTP ${response.status}`); }
        restoreAfterScoreEntry();
    } catch (error) { byId('score-entry-error').textContent = `Không lưu được điểm: ${error.message}`; byId('score-entry-error').hidden = false; }
});
byId('skip-score-entry').onclick = restoreAfterScoreEntry;
byId('result-menu').onclick = returnToMenu; byId('dawn-menu').onclick = returnToMenu;
byId('dawn-restart').onclick = () => { campaignScore = 0; buildNight(1, 'intro'); };
setScreen(isBenchmark ? 'playing' : 'menu');
addEventListener('keydown', event => {
    if (isBenchmark) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (rebindingAction) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.code !== 'Escape') bindings[rebindingAction] = event.code;
        rebindingAction = null; updateBindingInputs(); return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && !(event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement)) event.preventDefault();
    keys.add(event.code); if (!event.repeat) pending.add(event.code);
    if (event.code === 'KeyR' && !event.repeat && ['playing', 'paused'].includes(screen)) retryNight();
    if (event.code === 'Escape' && screen === 'settings') { setScreen(previousScreen); event.preventDefault(); }
});
addEventListener('keyup', event => keys.delete(event.code));
addEventListener('blur', () => {
    keys.clear(); pending.clear();
    if (screen === 'playing' && !g.input.pause) {
        const events = step(g, { pause: true }); audioEvents(events); setScreen('paused');
    }
});
let dragging = false, benchOrbitStartedAt = null;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.focus(); audio.unlock(); });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (dragging) yaw -= e.movementX * loadSensitivity(); });
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function audioEvents(events) { for (const event of events) audio.event(event.name, g.night); }
const qaParams = new URLSearchParams(location.search);
if (import.meta.env.DEV && qaParams.get('night') === '3') buildNight(3, 'playing');
if (import.meta.env.DEV && qaParams.has('verify')) {
    screen = 'playing'; import('./verification.js').then(({ createVerification }) => { verification = createVerification(renderer, retryNight); });
    byId('menu').hidden = true; byId('hud').hidden = false; document.querySelector('.bottom-ui').hidden = false;
}
function animate(ms) {
    requestAnimationFrame(animate);
    const elapsed = Math.min((ms - last) / 1000, .1); last = ms;
    const frameEvents = [];
    if (screen === 'playing' || g.state === 'paused') {
        accumulator += elapsed;
        while (accumulator >= 1 / T.tick_rate) {
            const input = isBenchmark ? { move: [0, 0], cam_yaw_deg: 0 } : verification?.active ? verification.input(g.tick) : readKeyboard(keys, pending, yaw, bindings);
            frameEvents.push(...step(g, input)); pending.clear(); accumulator -= 1 / T.tick_rate;
            if (frameEvents.some(event => event.name === 'paused')) setScreen('paused');
            if (frameEvents.some(event => event.name === 'resumed')) setScreen('playing');
            if (g.state === 'won' || g.state === 'lost') { showResult(); break; }
        }
    } else { accumulator = 0; }
    world.update(g, ms / 1000, reduceMotion.matches || reducedMotionEnabled, frameEvents);
    const p = world.player.position, a = yaw * Math.PI / 180;
    if (isBenchmark) {
        if (benchOrbitStartedAt === null) benchOrbitStartedAt = ms;
        const angle = ((ms - benchOrbitStartedAt) / 15000) * Math.PI * 2;
        camera.position.set(30 * Math.cos(angle), 15, -30 * Math.sin(angle)); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0);
    } else { camera.position.set(p.x - Math.sin(a) * 11, p.y + 5.2, p.z - Math.cos(a) * 11); camera.lookAt(p.x, p.y + 1.8, p.z); }
    if (!isBenchmark) hud.update(g, frameEvents);
    const renderStart = performance.now(); renderer.render(scene, camera);
    benchmarkRunner?.afterFrame(ms);
    verification?.observe(g, ms, frameEvents, performance.now() - renderStart, g.state === 'paused');
    audioEvents(frameEvents);
}
requestAnimationFrame(animate);
