export function createHUD(tuning) {
    const $ = id => document.getElementById(id);
    const flames = $('flames'), carried = $('carried'), progress = $('lantern-progress');
    const clock = $('clock'), score = $('score'), ending = $('ending'), pause = $('pause');
    const prompt = $('prompt'), status = $('status');
    let lastState = '', lastFlames = -1;
    const text = (el, value) => { if (el.textContent !== value) el.textContent = value; };
    return { update(g, paused) {
        const p = g.player, lit = g.lanterns.filter(l => l.lit).length;
        if (lastFlames !== p.flames) {
            flames.replaceChildren(...Array.from({ length: tuning.flames }, (_, i) => {
                const s = document.createElement('span'); s.className = i < p.flames ? 'flame' : 'flame empty'; s.setAttribute('aria-hidden', 'true'); return s;
            }));
            flames.setAttribute('aria-label', `Sinh lực: ${p.flames} trên ${tuning.flames}`); lastFlames = p.flames;
        }
        text(carried, `${p.carried} / ${tuning.carry_capacity}`); text($('lit-count'), `${lit} / 5`);
        progress.querySelectorAll('span').forEach((s, i) => { s.classList.toggle('lit', g.lanterns[i].lit); s.title = `Đèn ${i + 1}: ${g.lanterns[i].lit ? 'đã thắp' : `${g.lanterns[i].deposited}/${tuning.lantern_cost}`}`; });
        const secs = Math.ceil(g.time_left_s);
        text(clock, `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`); text(score, String(g.score).padStart(4, '0'));
        const near = g.lanterns.find(l => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= tuning.interact_radius);
        text(prompt, near ? `E · Nạp đèn ${near.id.slice(1)} — ${near.deposited}/${tuning.lantern_cost} đom đóm` : 'Gom đom đóm · Mang ánh sáng về năm ngọn đèn');
        pause.hidden = !paused || g.state !== 'playing'; ending.hidden = g.state === 'playing';
        if (g.state !== lastState) {
            text(status, g.state === 'won' ? 'Bạn đã thắp sáng cả hòn đảo.' : g.state === 'lost' ? 'Đêm đã khép lại. Bạn có thể chơi lại.' : 'Đêm 1 bắt đầu. Hãy thu thập đom đóm.');
            if (g.state !== 'playing') {
                text($('ending-title'), g.state === 'won' ? 'Ánh sáng trở về' : 'Hẹn một đêm trăng khác');
                text($('ending-copy'), g.state === 'won' ? 'Năm ngọn đèn đã sáng. Đảo Bến lại ấm giữa biển mây.' : 'Giữ lấy tia sáng nhỏ. Mây vẫn còn một hành trình phía trước.');
                text($('final-score'), `${g.score} điểm`); $('restart').focus();
            }
            lastState = g.state;
        }
    } };
}
