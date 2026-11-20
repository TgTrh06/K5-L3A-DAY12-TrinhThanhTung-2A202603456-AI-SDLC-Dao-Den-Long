// Preserve quick taps until a simulation tick consumes them, including movement.
export function readKeyboard(keys, pending, yaw) {
    const pressed = code => keys.has(code) || pending.has(code);
    // Camera looks toward +Z at yaw 0, so screen-right is -X in the contract.
    return {
        move: [Number(pressed('KeyA') || pressed('ArrowLeft')) - Number(pressed('KeyD') || pressed('ArrowRight')), Number(pressed('KeyW') || pressed('ArrowUp')) - Number(pressed('KeyS') || pressed('ArrowDown'))],
        cam_yaw_deg: yaw, jump: pressed('Space'), interact: pressed('KeyE'), pulse: pressed('KeyQ')
    };
}
