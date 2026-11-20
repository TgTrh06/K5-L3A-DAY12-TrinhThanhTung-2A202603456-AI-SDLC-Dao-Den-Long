const toneByEvent = {
    mote_picked: [880, .055], deposit: [520, .12], lantern_lit: [784, .32],
    pulse: [240, .2], player_hit: [110, .18], jump: [420, .08], dash: [690, .1],
    game_over: [330, .32], shade_spawned: [155, .22], drifter_spawned: [620, .16],
    drifter_steal: [195, .2], drifter_drop: [740, .2], charm_picked: [990, .22],
    countdown_10: [660, .12], night_start: [392, .45], wind_warning: [310, .28], wind_start: [260, .35],
};

export function createAudio() {
    let context, master, musicGain, musicOscillators = [];
    let volume = Number(localStorage.getItem('dao-den-long.volume') ?? .45);
    const ensure = () => {
        if (context) { if (context.state === 'suspended') context.resume(); return; }
        const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
        context = new Audio(); master = context.createGain(); master.gain.value = volume; master.connect(context.destination);
        musicGain = context.createGain(); musicGain.gain.value = .055; musicGain.connect(master);
    };
    const stopMusic = () => { for (const oscillator of musicOscillators) { try { oscillator.stop(); } catch {} } musicOscillators = []; };
    const playMusic = night => {
        ensure(); if (!context || !musicGain) return;
        stopMusic(); const roots = [110, 130.81, 146.83][night - 1] ?? 110;
        for (const [index, frequency] of [roots, roots * 1.5].entries()) {
            const oscillator = context.createOscillator(); oscillator.type = index ? 'sine' : 'triangle'; oscillator.frequency.value = frequency;
            oscillator.connect(musicGain); oscillator.start(); musicOscillators.push(oscillator);
        }
    };
    const play = (name, multiplier = 1) => {
        ensure(); if (!context || !master) return;
        const [frequency, duration] = toneByEvent[name] ?? [440, .08];
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = name === 'player_hit' || name === 'shade_spawned' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * .72), context.currentTime + duration);
        gain.gain.setValueAtTime(Math.min(.18, .06 * multiplier), context.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
        oscillator.connect(gain); gain.connect(master); oscillator.start(); oscillator.stop(context.currentTime + duration + .01);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    };
    return {
        get volume() { return volume; },
        setVolume(value) { volume = Math.max(0, Math.min(1, Number(value))); localStorage.setItem('dao-den-long.volume', String(volume)); if (master) master.gain.setTargetAtTime(volume, context.currentTime, .02); },
        unlock() { ensure(); },
        startNight(night) { playMusic(night); play('night_start', .7); },
        event(name, night) { if (name === 'night_start') this.startNight(night); else play(name); },
        dispose() { stopMusic(); if (context) context.close(); context = null; },
    };
}

export function loadSensitivity() { return Number(localStorage.getItem('dao-den-long.sensitivity') ?? .4); }
export function saveSensitivity(value) { const sensitivity = Math.max(.1, Math.min(1.2, Number(value))); localStorage.setItem('dao-den-long.sensitivity', String(sensitivity)); return sensitivity; }
