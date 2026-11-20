import { NIGHT } from '../core.js';

export function createHUD(tuning) {
    const $ = id => document.getElementById(id);
    const flames = $('flames'), carried = $('carried'), progress = $('lantern-progress');
    const clock = $('clock'), score = $('score'), prompt = $('prompt');
    const text = (el, value) => { if (el.textContent !== value) el.textContent = value; };
    const moteSlots = $('mote-slots');
    moteSlots.replaceChildren(...Array.from({ length: tuning.carry_capacity }, (_, i) => {
        const slot = document.createElement('i'); slot.className = 'mote-slot'; slot.dataset.index = i; slot.setAttribute('aria-hidden', 'true'); return slot;
    }));
    let previousFlames = -1, lanternCount = 0, night = 0;
    return {
        update(g) {
            const p = g.player, lit = g.lanterns.filter(l => l.lit).length;
            if (previousFlames !== p.flames) {
                flames.replaceChildren(...Array.from({ length: tuning.flames }, (_, i) => {
                    const icon = document.createElement('span'); icon.className = i < p.flames ? 'flame' : 'flame empty'; icon.setAttribute('aria-hidden', 'true'); return icon;
                }));
                flames.setAttribute('aria-label', `Ngọn lửa: ${p.flames} trên ${tuning.flames}`); previousFlames = p.flames;
            }
            if (lanternCount !== g.lanterns.length) {
                progress.replaceChildren(...g.lanterns.map(() => { const item = document.createElement('span'); return item; }));
                lanternCount = g.lanterns.length;
            }
            if (night !== g.night) {
                const name = NIGHT[g.night].name; text($('night-label'), `ĐÊM 0${g.night} · ${name.toLocaleUpperCase('vi')}`);
                document.title = `Đảo Đèn Lồng · ${name}`; night = g.night;
            }
            text(carried, `${p.carried} / ${tuning.carry_capacity}`); text($('lit-count'), `${lit} / ${g.lanterns.length}`);
            progress.querySelectorAll('span').forEach((item, i) => {
                item.classList.toggle('lit', g.lanterns[i].lit); item.title = `${g.lanterns[i].id}: ${g.lanterns[i].lit ? 'đã thắp' : `${g.lanterns[i].deposited}/${tuning.lantern_cost}`}`;
            });
            moteSlots.querySelectorAll('.mote-slot').forEach((slot, i) => slot.classList.toggle('filled', i < p.carried));
            const seconds = Math.ceil(g.timeLeftTicks / tuning.tick_rate);
            text(clock, `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
            clock.classList.toggle('danger', seconds <= 30); text(score, String(g.score).padStart(4, '0'));
            const near = g.lanterns.filter(l => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= tuning.interact_radius)
                .sort((a, b) => Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) - Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]) || a.id.localeCompare(b.id))[0];
            text(prompt, near ? `E — Nạp ánh sáng (${p.carried}/${tuning.carry_capacity})` : g.wind?.warning ? 'Gió mạnh sắp tới — tìm chỗ vững chân' : g.wind?.active ? 'Gió mạnh đang thổi qua đảo' : 'Gom đom đóm · Mang ánh sáng về ngọn đèn');
            const target = [...g.lanterns].filter(l => !l.lit).sort((a, b) => Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) - Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]) || a.id.localeCompare(b.id))[0];
            const arrow = $('lantern-arrow');
            if (target) {
                const bearing = Math.atan2(target.pos[0] - p.pos[0], target.pos[2] - p.pos[2]) * 180 / Math.PI;
                let relative = ((bearing - (g.input.cam_yaw_deg ?? 0) + 540) % 360) - 180;
                arrow.hidden = Math.abs(relative) <= 50; arrow.style.transform = `translateX(-50%) rotate(${relative}deg)`; arrow.title = `Đèn gần nhất chưa sáng: ${target.id}`;
            } else arrow.hidden = true;
            const dashReady = p.charm > 0 || p.dashCd === 0;
            text($('dash-status'), dashReady ? 'Lướt · Sẵn sàng' : `Lướt · ${(p.dashCd / 60).toFixed(1)}s`);
            text($('pulse-status'), p.pulseCd ? `Tỏa sáng · ${(p.pulseCd / 60).toFixed(1)}s` : `Tỏa sáng · ${p.carried >= tuning.pulse_cost ? 'Sẵn sàng' : '3 ✧'}`);
            const charm = $('charm-status'); charm.hidden = p.charm <= 0; text(charm, `Bùa Gió · ${(p.charm / 60).toFixed(0)}s`);
        },
    };
}
