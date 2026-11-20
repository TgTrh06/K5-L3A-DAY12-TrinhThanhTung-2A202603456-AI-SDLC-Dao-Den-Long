import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readKeyboard } from '../src/input.js';
import { createGame, step } from '../src/core.js';

for (const yaw of [0, 90, 180]) for (const [key, screenSide] of [['KeyA', -1], ['KeyD', 1]]) {
    test(`${key} projects to screen ${screenSide < 0 ? 'left' : 'right'} at camera yaw ${yaw}`, () => {
        const angle = yaw * Math.PI / 180, camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
        camera.position.set(-Math.sin(angle) * 11, 5.2, -Math.cos(angle) * 11); camera.lookAt(0, 1.8, 0); camera.updateMatrixWorld();
        const game = createGame(1, { random_motes: false, random_shades: false });
        step(game, readKeyboard(new Set([key]), new Set(), yaw));
        assert.ok(new THREE.Vector3(...game.player.pos).project(camera).x * screenSide > 0);
    });
}
test('keyboard adapter exposes jump, interaction, pulse, dash and both pause keys', () => {
    const input = readKeyboard(new Set(['Space', 'KeyE', 'KeyQ', 'ShiftLeft', 'KeyP']), new Set(), 35);
    assert.deepEqual([input.jump, input.interact, input.pulse, input.dash, input.pause, input.cam_yaw_deg], [true, true, true, true, true, 35]);
    assert.equal(readKeyboard(new Set(['Escape']), new Set(), 0).pause, true);
});
test('air dash keeps altitude fixed through all 12 dash ticks', () => {
    const game = createGame(1, { random_motes: false, random_shades: false, player: { pos: [0, 3, 0], grounded: false, vel: [0, -3, 0] } });
    for (let i = 0; i < 12; i++) step(game, { dash: true, move: [0, 1] });
    assert.equal(game.player.pos[1], 3); assert.equal(game.player.vel[1], 0);
});
