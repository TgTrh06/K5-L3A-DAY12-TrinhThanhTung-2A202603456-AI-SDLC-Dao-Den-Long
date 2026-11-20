import * as THREE from 'three';

// Visual randomness is independent of the gameplay seed and never touches simulation.
export function randomSource(seed = 73) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function canvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return [c, c.getContext('2d')];
}
function texture(c) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
function grain(ctx, w, h, random, amount = 16000) {
    for (let i = 0; i < amount; i++) {
        ctx.fillStyle = random() > .5 ? 'rgba(255,245,211,.045)' : 'rgba(5,17,37,.06)';
        ctx.fillRect(random() * w, random() * h, 1 + random() * 3, random() * 2 + 1);
    }
}
export function paperTexture(base, seed = 1) {
    const [c, ctx] = canvas(512, 512), random = randomSource(seed);
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 110; i++) {
        const x = random() * 512, y = random() * 512, r = 15 + random() * 100;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, i % 2 ? '#e8dcc01a' : '#071f3924'); g.addColorStop(1, '#ffffff00');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    }
    grain(ctx, 512, 512, random);
    return texture(c);
}
export function cloudTexture() {
    const [c, ctx] = canvas(1024, 384);
    const random = randomSource(81);
    for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath(); ctx.moveTo(30, 285);
        ctx.bezierCurveTo(70, 265, 90, 185, 175, 218);
        ctx.bezierCurveTo(145, 118, 260, 68, 325, 126);
        ctx.bezierCurveTo(370, 25, 500, 65, 515, 140);
        ctx.bezierCurveTo(590, 81, 677, 146, 656, 213);
        ctx.bezierCurveTo(790, 201, 825, 287, 995, 233);
        ctx.bezierCurveTo(833, 349, 733, 290, 620, 310);
        ctx.bezierCurveTo(410, 356, 245, 294, 30, 285);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, 60, 0, 340);
        g.addColorStop(0, ['#bbc3be', '#9aaebb', '#71879c'][layer]);
        g.addColorStop(1, ['#566e89', '#455c79', '#304761'][layer]);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = layer === 0 ? '#d6c397aa' : '#c9d5d343'; ctx.lineWidth = 2; ctx.stroke();
        ctx.translate(12, 13); ctx.scale(.96, .96);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = 'round';
    for (const [x, y, r] of [[300, 185, 56], [465, 174, 43], [610, 248, 26]]) {
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += .06) {
            const rr = r * (1 - a / (Math.PI * 3.7));
            const xx = x + Math.cos(a) * rr, yy = y + Math.sin(a) * rr * .8;
            if (a === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.lineWidth = 5; ctx.strokeStyle = '#d9dcc28a'; ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = '#e4c9929c'; ctx.stroke();
    }
    // Clip the paper grain to the painted cloud, retaining transparent outer edges.
    ctx.globalCompositeOperation = 'source-atop'; grain(ctx, 1024, 384, random, 20000);
    return texture(c);
}
export function skyTexture() {
    const [c, ctx] = canvas(2048, 1024), random = randomSource(12);
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, '#091327'); g.addColorStop(.5, '#213854'); g.addColorStop(.75, '#697f8c'); g.addColorStop(1, '#a1a894');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2048, 1024);
    grain(ctx, 2048, 1024, random, 22000);
    for (let i = 0; i < 450; i++) {
        ctx.fillStyle = `rgba(245,231,193,${random() * .6})`;
        ctx.fillRect(random() * 2048, random() * 490, 1.5, 1.5);
    }
    return texture(c);
}
export function glowTexture() {
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, '#fff9df'); g.addColorStop(.09, '#ffe5a5e0');
    g.addColorStop(.3, '#ffc86b48'); g.addColorStop(1, '#ffc86b00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return texture(c);
}
export function groundTexture() {
    const [c, ctx] = canvas(1024, 1024), random = randomSource(33);
    ctx.fillStyle = '#405d60'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = ['#65807820', '#a0a48415', '#203c4d28'][i % 3];
        ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 1024, random() * 35 + 2, random() * 20 + 1, random() * 3, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#b1a88624'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.moveTo(512, 512); ctx.quadraticCurveTo(512 + Math.sin(a + .25) * 180, 512 + Math.cos(a + .25) * 180, 512 + Math.sin(a) * 328, 512 + Math.cos(a) * 328); ctx.stroke();
    }
    grain(ctx, 1024, 1024, random, 40000);
    return texture(c);
}
