import * as THREE from 'three';
import { createGame, step, T } from './core.js';
import { createWorld } from './visuals/world.js';
import { createHUD } from './visuals/hud.js';
import { readKeyboard } from './input.js';
import './style.css';
let g = createGame(12), yaw = 0, paused = false, accumulator = 0, last = 0;
const keys = new Set(), pending = new Set();
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.domElement.setAttribute('aria-label', 'Đảo Đèn Lồng — cảnh game 3D, điều khiển bằng bàn phím');
renderer.domElement.tabIndex = 0;
document.body.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
const world = createWorld(renderer, scene, T, g.lanterns), hud = createHUD(T);
if (new URLSearchParams(location.search).has('metrics')) {
    import('./metrics.js').then(({ attachMetrics }) => attachMetrics(renderer));
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let verification;
if (import.meta.env.DEV && new URLSearchParams(location.search).has('verify')) {
    import('./verification.js').then(({ createVerification }) => { verification = createVerification(renderer, restart); });
}
function restart() {
    g = createGame(12); paused = false; keys.clear(); pending.clear(); accumulator = 0;
    verification?.reset();
    document.activeElement?.blur(); renderer.domElement.focus();
}
document.querySelector('#restart').onclick = restart;
document.querySelector('#resume').onclick = () => { paused = false; renderer.domElement.focus(); };
addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !(e.target instanceof HTMLButtonElement)) e.preventDefault();
    keys.add(e.code); if (!e.repeat) pending.add(e.code);
    if (e.code === 'KeyR') restart();
    if (e.code === 'Escape' && !e.repeat) { paused = !paused; accumulator = 0; }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pending.clear(); paused = true; });
let dragging = false;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.focus(); });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (dragging) yaw -= e.movementX * .4; });
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
// Camera looks toward +Z at yaw 0: screen-right corresponds to -X.
function animate(ms) {
    requestAnimationFrame(animate);
    const elapsed = Math.min((ms - last) / 1000, .1); last = ms;
    const frameEvents = [];
    if (!paused && g.state === 'playing') {
        accumulator += elapsed;
        while (accumulator >= 1 / 60) {
            const input = verification?.active ? verification.input(g.tick) : readKeyboard(keys, pending, yaw);
            frameEvents.push(...step(g, input));
            pending.clear(); accumulator -= 1 / 60;
        }
    }
    world.update(g, ms / 1000, reduceMotion.matches, frameEvents);
    const p = world.player.position, a = yaw * Math.PI / 180;
    camera.position.set(p.x - Math.sin(a) * 11, p.y + 5.2, p.z - Math.cos(a) * 11);
    camera.lookAt(p.x, p.y + 1.8, p.z);
    hud.update(g, paused);
    const renderStart = performance.now(); renderer.render(scene, camera);
    verification?.observe(g, ms, frameEvents, performance.now() - renderStart, paused);
}
requestAnimationFrame(animate);
