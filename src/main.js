import * as THREE from 'three';
import { createGame, step, T, NIGHT } from './core.js';
import { createWorld } from './visuals/world.js';
import { createHUD } from './visuals/hud.js';
import { readKeyboard } from './input.js';
import { createAudio, loadSensitivity, saveSensitivity } from './audio.js';
import './style.css';

let yaw = 0, accumulator = 0, last = 0, screen = 'menu', previousScreen = 'menu';
let currentNight = 1, campaignScore = 0, g = createGame(12, {}, 1);
const keys = new Set(), pending = new Set(), audio = createAudio();
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.domElement.setAttribute('aria-label', 'Đảo Đèn Lồng — cảnh game 3D, điều khiển bằng bàn phím');
renderer.domElement.tabIndex = 0; document.body.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
const world = createWorld(renderer, scene, T, g), hud = createHUD(T);
if (new URLSearchParams(location.search).has('metrics')) import('./metrics.js').then(({ attachMetrics }) => attachMetrics(renderer));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let verification;
const byId = id => document.getElementById(id);
const setScreen = next => {
    screen = next;
    for (const id of ['menu', 'night-intro', 'pause', 'settings', 'night-result', 'dawn-screen']) byId(id).hidden = id !== ({ menu: 'menu', intro: 'night-intro', paused: 'pause', settings: 'settings', result: 'night-result', dawn: 'dawn-screen' }[next]);
    const overlay = ['menu', 'intro', 'result', 'dawn', 'settings'].includes(next);
    byId('hud').hidden = overlay && next !== 'settings'; document.querySelector('.bottom-ui').hidden = overlay;
    if (next === 'playing') { renderer.domElement.focus(); last = 0; accumulator = 0; }
};
function buildNight(night, mode = 'intro') {
    currentNight = night; g = createGame(12, {}, night); g.campaignScore = campaignScore;
    const config = NIGHT[night]; byId('intro-night-label').textContent = `ĐÊM 0${night} · ${config.name.toLocaleUpperCase('vi')}`;
    byId('intro-title').textContent = config.name;
    byId('intro-copy').textContent = night === 1 ? 'Đêm đầu tiên, Mây rời bến để đánh thức năm ngọn đèn.' : night === 2 ? 'Hai đảo và một cầu tre đang chờ. Dùng bục nhảy để vượt biển mây.' : 'Ba tầng của đảo chuông bị gió lớn bao phủ. Hãy tìm đường lên đỉnh.';
    hud.update(g); verification?.reset(); setScreen(mode);
}
function startNight() { audio.unlock(); audio.startNight(currentNight); setScreen('playing'); }
function retryNight() { buildNight(currentNight, 'playing'); audio.startNight(currentNight); }
function openSettings() { previousScreen = screen; byId('volume').value = audio.volume; byId('sensitivity').value = loadSensitivity(); setScreen('settings'); }
function showResult() {
    if (g.state === 'won' && currentNight === 3) {
        campaignScore = g.campaignScore; byId('campaign-score').textContent = `${campaignScore} điểm toàn hành trình`; setScreen('dawn'); return;
    }
    if (g.state === 'won') campaignScore = g.campaignScore;
    byId('result-label').textContent = `ĐÊM 0${currentNight} · ${NIGHT[currentNight].name.toLocaleUpperCase('vi')}`;
    byId('result-title').textContent = g.state === 'won' ? 'Ngọn đèn đã sáng' : 'Đêm nay khép lại';
    byId('result-copy').textContent = g.state === 'won' ? 'Ánh sáng soi đường tới hòn đảo tiếp theo.' : 'Mây có thể thử lại đêm này khi đã sẵn sàng.';
    byId('night-score').textContent = `${g.score} điểm · ${g.lanterns.filter(l => l.lit).length}/${g.lanterns.length} đèn`;
    byId('result-primary').textContent = g.state === 'won' ? 'Tiếp tục hành trình' : 'Thử lại đêm';
    byId('result-primary').onclick = () => g.state === 'won' ? buildNight(currentNight + 1, 'intro') : retryNight();
    setScreen('result');
}
function returnToMenu() { campaignScore = 0; buildNight(1, 'menu'); }

byId('start-game').onclick = () => buildNight(1, 'intro');
byId('begin-night').onclick = startNight;
byId('resume').onclick = () => { if (g.state === 'paused') { g.input.pause = false; step(g, { pause: true }); setScreen('playing'); } };
byId('retry-night').onclick = retryNight;
byId('return-menu').onclick = returnToMenu;
byId('open-settings-menu').onclick = openSettings; byId('open-settings-pause').onclick = openSettings;
byId('close-settings').onclick = () => setScreen(previousScreen);
byId('volume').oninput = e => audio.setVolume(e.target.value);
byId('sensitivity').oninput = e => { saveSensitivity(e.target.value); };
byId('result-menu').onclick = returnToMenu; byId('dawn-menu').onclick = returnToMenu;
byId('dawn-restart').onclick = () => { campaignScore = 0; buildNight(1, 'intro'); };
setScreen('menu');
addEventListener('keydown', event => {
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
let dragging = false;
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
            const input = verification?.active ? verification.input(g.tick) : readKeyboard(keys, pending, yaw);
            frameEvents.push(...step(g, input)); pending.clear(); accumulator -= 1 / T.tick_rate;
            if (frameEvents.some(event => event.name === 'paused')) setScreen('paused');
            if (frameEvents.some(event => event.name === 'resumed')) setScreen('playing');
            if (g.state === 'won' || g.state === 'lost') { showResult(); break; }
        }
    } else { accumulator = 0; }
    world.update(g, ms / 1000, reduceMotion.matches, frameEvents);
    const p = world.player.position, a = yaw * Math.PI / 180;
    camera.position.set(p.x - Math.sin(a) * 11, p.y + 5.2, p.z - Math.cos(a) * 11);
    camera.lookAt(p.x, p.y + 1.8, p.z);
    hud.update(g); const renderStart = performance.now(); renderer.render(scene, camera);
    verification?.observe(g, ms, frameEvents, performance.now() - renderStart, g.state === 'paused');
    audioEvents(frameEvents);
}
requestAnimationFrame(animate);
