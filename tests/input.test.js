import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readKeyboard } from '../src/input.js';
import { createGame, step } from '../src/core.js';
for (const yaw of [0, 90, 180]) for (const [key, side] of [['KeyA', -1], ['ArrowLeft', -1], ['KeyD', 1], ['ArrowRight', 1]]) {
    test(`${key} projects ${side < 0 ? 'left' : 'right'} on actual camera at yaw ${yaw}`, () => {
        const a = yaw * Math.PI / 180, camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
        camera.position.set(-Math.sin(a) * 11, 5.2, -Math.cos(a) * 11); camera.lookAt(0, 1.8, 0); camera.updateMatrixWorld();
        const g = createGame(1, { random_motes: false, random_shades: false });
        step(g, readKeyboard(new Set([key]), new Set(), yaw));
        assert.ok(new THREE.Vector3(...g.player.pos).project(camera).x * side > 0);
    });
}
test('quick movement tap survives keyup before the next tick then clears', () => {
    const pending = new Set(['KeyW']);
    assert.deepEqual(readKeyboard(new Set(), pending, 0).move, [0, 1]);
    pending.clear(); assert.deepEqual(readKeyboard(new Set(), pending, 0).move, [0, 0]);
});
test('diagonal keys normalize in simulation and action taps persist for one tick', () => {
    const g = createGame(1, { random_motes: false, random_shades: false });
    const input = readKeyboard(new Set(['KeyW', 'KeyD']), new Set(['Space', 'KeyQ', 'KeyE']), 0);
    assert.equal(input.jump, true); assert.equal(input.pulse, true); assert.equal(input.interact, true);
    step(g, input); assert.ok(Math.abs(Math.hypot(g.player.pos[0], g.player.pos[2]) - .1) < 1e-10);
    assert.ok(g.player.pos[1] > 0); assert.equal(g.player.flames, 4);
});
