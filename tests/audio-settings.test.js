import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, loadSensitivity, saveSensitivity, loadDistinctPalette, saveDistinctPalette } from '../src/audio.js';

test('volume and mouse sensitivity settings survive a new audio/settings instance', () => {
    const values = new Map();
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    globalThis.localStorage = {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
    };
    try {
        assert.equal(createAudio().volume, 0.45);
        const audio = createAudio(); audio.setVolume(0.72);
        assert.equal(createAudio().volume, 0.72);
        assert.equal(loadSensitivity(), 0.4);
        assert.equal(saveSensitivity(0.85), 0.85);
        assert.equal(loadSensitivity(), 0.85);
        assert.equal(saveSensitivity(10), 1.2);
        assert.equal(saveSensitivity(0), 0.1);
        assert.equal(loadDistinctPalette(), false);
        assert.equal(saveDistinctPalette(true), true);
        assert.equal(loadDistinctPalette(), true);
        assert.equal(createAudio().volume, 0.72);
    } finally {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else delete globalThis.localStorage;
    }
});
