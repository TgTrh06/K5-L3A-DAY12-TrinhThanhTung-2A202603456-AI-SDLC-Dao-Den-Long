export const DEFAULT_BINDINGS = Object.freeze({
    left: 'KeyA', right: 'KeyD', forward: 'KeyW', back: 'KeyS', jump: 'Space', dash: 'ShiftLeft',
    interact: 'KeyE', pulse: 'KeyQ', pause: 'KeyP',
});
export const BINDING_ACTIONS = Object.freeze(Object.keys(DEFAULT_BINDINGS));
const VALID_CODE = /^(?:Key[A-Z]|Digit[0-9]|Numpad[0-9]|Space|Arrow(?:Up|Down|Left|Right)|Shift(?:Left|Right)|Control(?:Left|Right)|Alt(?:Left|Right)|Enter|Escape|Tab|Backspace|CapsLock|F(?:[1-9]|1[0-2]))$/;

export function validateBindings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, reason: 'Thiếu bảng phím.' };
    for (const action of BINDING_ACTIONS) if (typeof value[action] !== 'string' || !VALID_CODE.test(value[action])) return { valid: false, reason: `Phím không hợp lệ cho ${action}.` };
    const used = new Map();
    const claim = (code, action) => {
        const previous = used.get(code);
        if (previous && previous !== action) return `${code} đang được gán cho cả ${previous} và ${action}.`;
        used.set(code, action); return null;
    };
    for (const action of BINDING_ACTIONS) {
        const reason = claim(value[action], action); if (reason) return { valid: false, reason };
    }
    const aliases = { left: 'ArrowLeft', right: 'ArrowRight', forward: 'ArrowUp', back: 'ArrowDown', dash: 'ShiftRight' };
    for (const [action, alias] of Object.entries(aliases)) if (value[action] === DEFAULT_BINDINGS[action]) {
        const reason = claim(alias, action); if (reason) return { valid: false, reason };
    }
    const escapeConflict = claim('Escape', 'pause'); if (escapeConflict) return { valid: false, reason: escapeConflict };
    return { valid: true, bindings: Object.fromEntries(BINDING_ACTIONS.map(action => [action, value[action]])) };
}

export function loadBindings(storage = globalThis.localStorage) {
    try {
        const saved = storage?.getItem('dao-den-long.key-bindings');
        if (!saved) return { ...DEFAULT_BINDINGS };
        const parsed = validateBindings(JSON.parse(saved));
        return parsed.valid ? parsed.bindings : { ...DEFAULT_BINDINGS };
    } catch { return { ...DEFAULT_BINDINGS }; }
}

export function saveBindings(bindings, storage = globalThis.localStorage) {
    const checked = validateBindings(bindings);
    if (!checked.valid) throw new TypeError(checked.reason);
    storage?.setItem('dao-den-long.key-bindings', JSON.stringify(checked.bindings));
    return checked.bindings;
}

// Preserve quick taps until a simulation tick consumes them, including movement.
export function readKeyboard(keys, pending, yaw, bindings = DEFAULT_BINDINGS) {
    const pressed = code => keys.has(code) || pending.has(code);
    // Camera looks toward +Z at yaw 0, so screen-right is -X in the contract.
    return {
        move: [Number(pressed(bindings.left) || (bindings.left === DEFAULT_BINDINGS.left && pressed('ArrowLeft'))) - Number(pressed(bindings.right) || (bindings.right === DEFAULT_BINDINGS.right && pressed('ArrowRight'))),
            Number(pressed(bindings.forward) || (bindings.forward === DEFAULT_BINDINGS.forward && pressed('ArrowUp'))) - Number(pressed(bindings.back) || (bindings.back === DEFAULT_BINDINGS.back && pressed('ArrowDown')))],
        cam_yaw_deg: yaw, jump: pressed(bindings.jump), interact: pressed(bindings.interact), pulse: pressed(bindings.pulse),
        dash: pressed(bindings.dash) || (bindings.dash === DEFAULT_BINDINGS.dash && pressed('ShiftRight')),
        pause: pressed('Escape') || pressed(bindings.pause)
    };
}
