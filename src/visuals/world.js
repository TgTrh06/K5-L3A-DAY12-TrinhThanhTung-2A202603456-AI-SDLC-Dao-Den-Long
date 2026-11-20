import * as THREE from 'three';
import { paperTexture, cloudTexture, skyTexture, glowTexture, groundTexture, randomSource } from './paint.js';

export function createWorld(renderer, scene, tuning, initialLanterns) {
    const random = randomSource(99), glow = glowTexture();
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    scene.fog = new THREE.FogExp2('#344b64', .006);
    scene.add(new THREE.HemisphereLight('#c7dce8', '#3b493e', 2.4));
    const moonlight = new THREE.DirectionalLight('#d5e7f1', 2.5); moonlight.position.set(-30, 50, 20); scene.add(moonlight);
    const material = (color, map, extra = {}) => new THREE.MeshStandardMaterial({ color, map, roughness: 1, ...extra });
    const mesh = (parent, geometry, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); parent.add(m); return m;
    };
    const ivory = material('#eed8a8', paperTexture('#f2dfb3'));
    const wood = material('#584d40', paperTexture('#ad9470'));
    const gold = new THREE.MeshBasicMaterial({ color: '#c7ac71' });
    const dark = material('#263c4b', paperTexture('#73807a'));
    const sprite = (parent, size, opacity = 1) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, opacity, depthWrite: false }));
        s.scale.set(size, size, 1); parent.add(s); return s;
    };
    const sky = mesh(scene, new THREE.SphereGeometry(240, 40, 24), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }));
    const moon = new THREE.Group(); moon.position.set(-32, 12, 105); scene.add(moon);
    mesh(moon, new THREE.SphereGeometry(9, 32, 24), new THREE.MeshBasicMaterial({ color: '#fff0ce', map: paperTexture('#eee5ce', 41), fog: false }));
    sprite(moon, 42, .38);
    const cloudMap = cloudTexture(), clouds = [];
    for (let i = 0; i < 34; i++) {
        const angle = i * 2.399, radius = i < 18 ? 58 + random() * 18 : 120 + random() * 40;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, transparent: true, depthWrite: false, color: i < 18 ? '#a9bac6' : '#c9d2d3', opacity: i < 18 ? .72 : .85, fog: false }));
        s.position.set(Math.cos(angle) * radius, i < 18 ? -4 - random() * 3 : 5 + random() * 20, Math.sin(angle) * radius);
        s.scale.set(i < 18 ? 35 : 65, i < 18 ? 13 : 24, 1); s.userData.baseY = s.position.y; scene.add(s); clouds.push(s);
    }
    mesh(scene, new THREE.CylinderGeometry(39, 32, 5, 96), material('#83939a', paperTexture('#627a80')), 0, -2.65);
    const surface = mesh(scene, new THREE.CircleGeometry(39, 96), material('#9ba597', groundTexture()), 0, -.025);
    surface.rotation.x = -Math.PI / 2;
    const water = mesh(scene, new THREE.PlaneGeometry(500, 500), material('#2d4a63', paperTexture('#667b8e'), { metalness: .25 }), 0, -7);
    water.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 18; i++) {
        const ring = mesh(scene, new THREE.TorusGeometry(41 + i * 2.7, .035 + random() * .04, 3, 100), new THREE.MeshBasicMaterial({ color: '#b7c5bf', transparent: true, opacity: .12 }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = -6.8;
    }
    // Scenery is decorative; it does not introduce invisible collision obstacles.
    const rockGeo = new THREE.DodecahedronGeometry(1, 0), leafGeo = new THREE.SphereGeometry(1, 7, 5);
    const leafMats = ['#3f605f', '#516f66', '#6c8070'].map((c, j) => material(c, paperTexture('#889787', j + 4)));
    for (let i = 0; i < 58; i++) {
        const a = i * 2.399, r = 33 + random() * 4.7;
        const rock = mesh(scene, rockGeo, dark, Math.cos(a) * r, .2, Math.sin(a) * r);
        rock.scale.set(.5 + random() * 1.4, .4 + random(), .6 + random()); rock.rotation.y = random() * 6;
        if (i % 3 === 0) {
            const tree = new THREE.Group(); tree.position.set(Math.cos(a) * (r - 1), 0, Math.sin(a) * (r - 1)); scene.add(tree);
            mesh(tree, new THREE.CylinderGeometry(.12, .2, 3.8, 7), wood, 0, 1.9);
            for (let j = 0; j < 3; j++) {
                const leaf = mesh(tree, leafGeo, leafMats[j], (j - 1) * .8, 3.4 + j * .4, 0);
                leaf.scale.set(1.7, 1.05, 1.3);
            }
        }
    }
    // Fine grass marks, batched into a single draw call.
    const grassPoints = [];
    for (let i = 0; i < 1800; i++) {
        const a = random() * 6.283, r = Math.sqrt(random()) * 37, x = Math.cos(a) * r, z = Math.sin(a) * r;
        grassPoints.push(x, 0, z, x + .1, .1 + random() * .23, z + .05);
    }
    const grassGeo = new THREE.BufferGeometry(); grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(grassPoints, 3));
    scene.add(new THREE.LineSegments(grassGeo, new THREE.LineBasicMaterial({ color: '#a3ac86', transparent: true, opacity: .22 })));
    const player = new THREE.Group(); scene.add(player);
    const body = new THREE.Group(); player.add(body);
    mesh(body, new THREE.CylinderGeometry(.29, .48, 1.05, 12), material('#b86950', paperTexture('#d99c7d')), 0, .95);
    mesh(body, new THREE.SphereGeometry(.3, 16, 12), ivory, 0, 1.65);
    for (const x of [-.19, .19]) mesh(body, new THREE.CylinderGeometry(.11, .1, .5, 8), dark, x, .28);
    const hat = mesh(body, new THREE.ConeGeometry(.92, .6, 40, 1, true), ivory, 0, 1.99);
    hat.material.side = THREE.DoubleSide;
    const brim = mesh(body, new THREE.TorusGeometry(.92, .025, 5, 48), gold, 0, 1.69); brim.rotation.x = Math.PI / 2;
    const ribs = [];
    for (let i = 0; i < 28; i++) {
        const a = i * Math.PI * 2 / 28;
        ribs.push(0, 2.29, 0, Math.sin(a) * .92, 1.69, Math.cos(a) * .92);
    }
    const ribGeo = new THREE.BufferGeometry(); ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribs, 3));
    body.add(new THREE.LineSegments(ribGeo, new THREE.LineBasicMaterial({ color: '#b1955a', transparent: true, opacity: .7 })));
    const smallLamp = mesh(body, new THREE.SphereGeometry(.18, 12, 8), material('#ffcc77', null, { emissive: '#ffa837', emissiveIntensity: 2 }), .64, 1.4);
    mesh(body, new THREE.CylinderGeometry(.012, .012, .35, 5), gold, .64, 1.7);
    const playerGlow = sprite(body, 2.8, .5); playerGlow.position.copy(smallLamp.position);
    const lamp = new THREE.PointLight('#ffbd64', 6, 9, 1.5); lamp.position.copy(smallLamp.position); body.add(lamp);
    const lanterns = initialLanterns.map((l, i) => {
        const p = new THREE.Group(); p.position.fromArray(l.pos); scene.add(p);
        mesh(p, new THREE.CylinderGeometry(.65, .8, .22, 12), dark, 0, .1);
        mesh(p, new THREE.CylinderGeometry(.12, .2, 2.7, 10), wood, 0, 1.4);
        mesh(p, new THREE.BoxGeometry(1.6, .12, .12), wood, .58, 2.7);
        const paper = material('#af9973', paperTexture('#e9d6a8', 16), { emissive: '#ffbd65', emissiveIntensity: .07 });
        const bulb = mesh(p, new THREE.SphereGeometry(.6, 20, 12), paper, .9, 2.2); bulb.scale.y = 1.2;
        for (let j = 0; j < 8; j++) {
            const a = j * Math.PI / 8;
            const rib = mesh(p, new THREE.TorusGeometry(.6, .012, 4, 30), gold, .9, 2.2);
            rib.rotation.y = a; rib.scale.y = 1.2;
        }
        for (const y of [1.48, 2.92]) mesh(p, new THREE.CylinderGeometry(.18, .18, .09, 12), wood, .9, y);
        mesh(p, new THREE.CylinderGeometry(.015, .015, .32, 5), gold, .9, 1.28);
        const aura = sprite(p, 5, 0); aura.position.set(.9, 2.2, 0);
        const light = new THREE.PointLight('#ffc76b', 0, 17, 1.5); light.position.set(.9, 2.2, 0); p.add(light);
        const safe = mesh(p, new THREE.RingGeometry(tuning.safe_radius - .04, tuning.safe_radius, 80), new THREE.MeshBasicMaterial({ color: '#d8bc7e', transparent: true, opacity: .16, side: THREE.DoubleSide }), 0, .02);
        safe.rotation.x = -Math.PI / 2;
        const plaque = document.createElement('canvas'); plaque.width = 128; plaque.height = 128;
        const ctx = plaque.getContext('2d'); ctx.fillStyle = '#f0dcaa'; ctx.font = '48px Georgia'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1).padStart(2, '0'), 64, 82);
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(plaque), transparent: true, depthWrite: false })); label.position.set(0, 3.4, 0); label.scale.set(.75, .75, 1); p.add(label);
        return { bulb, aura, light, safe };
    });
    const motes = new THREE.Group(), shades = new THREE.Group(); scene.add(motes, shades);
    const moteGeo = new THREE.SphereGeometry(.09, 6, 4), moteMat = new THREE.MeshBasicMaterial({ color: '#fff3bd' });
    const shadeGeo = new THREE.SphereGeometry(.65, 12, 10), shadeMat = material('#262037', paperTexture('#5c4967'), { transparent: true, opacity: .88 });
    const eyeGeo = new THREE.SphereGeometry(.06, 6, 4), eyeMat = new THREE.MeshBasicMaterial({ color: '#d4b5d9' });
    const pulse = mesh(scene, new THREE.RingGeometry(.96, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffe1a0', side: THREE.DoubleSide, transparent: true, opacity: 0 })); pulse.rotation.x = -Math.PI / 2;
    let pulseStart = -1000, lastTick = -1;
    function sync(group, items, factory) {
        while (group.children.length > items.length) {
            const removed = group.children.at(-1); removed.userData.dispose?.(); group.remove(removed);
        }
        while (group.children.length < items.length) group.add(factory());
    }
    return {
        update(g, time, reduceMotion, events = []) {
            sky.position.copy(player.position);
            const moving = Math.hypot(...g.input.move) > 0 && g.state === 'playing';
            player.position.fromArray(g.player.pos); body.position.y = !reduceMotion && moving ? Math.sin(g.tick * .22) * .055 : 0;
            playerGlow.material.opacity = .45 + (reduceMotion ? 0 : Math.sin(time * 3) * .06);
            lanterns.forEach((l, i) => {
                const lit = g.lanterns[i].lit;
                l.bulb.material.emissiveIntensity = lit ? 1.4 : .07; l.aura.material.opacity = lit ? .7 : .08;
                l.light.intensity = lit ? 22 : 0; l.safe.material.opacity = lit ? .55 : .1;
            });
            sync(motes, g.motes, () => { const p = new THREE.Group(); mesh(p, moteGeo, moteMat); const glow = sprite(p, 1.3, .7); p.userData.dispose = () => glow.material.dispose(); return p; });
            g.motes.forEach((m, i) => { const p = motes.children[i]; p.position.fromArray(m.pos); p.position.y = .65 + (reduceMotion ? 0 : Math.sin(time * 1.7 + i * 3) * .14); });
            sync(shades, g.shades, () => {
                const p = new THREE.Group(); const head = mesh(p, shadeGeo, shadeMat); head.scale.set(.85, 1.25, .85);
                const haze = mesh(p, shadeGeo, new THREE.MeshBasicMaterial({ color: '#574369', transparent: true, opacity: .12, depthWrite: false })); haze.scale.set(1.3, 1.4, 1.3);
                const eyes = new THREE.Group(); p.add(eyes); for (const x of [-.18, .18]) mesh(eyes, eyeGeo, eyeMat, x, .12, -.48);
                p.userData.dispose = () => haze.material.dispose();
                return p;
            });
            g.shades.forEach((s, i) => {
                const p = shades.children[i]; p.position.fromArray(s.pos); p.position.y += .9;
                p.lookAt(player.position.x, p.position.y, player.position.z); p.rotation.y += Math.PI;
                const stunned = s.state === 'stunned'; p.children[2].rotation.z = stunned ? Math.PI / 4 : 0;
                p.children[1].material.color.set(stunned ? '#e6c779' : '#574369');
            });
            if (events.some(e => e.name === 'pulse')) { pulseStart = time; pulse.position.set(...g.player.pos); pulse.position.y = .06; }
            if (g.tick < lastTick) pulseStart = -1000;
            lastTick = g.tick;
            const age = time - pulseStart; pulse.visible = age < .7;
            if (pulse.visible) { pulse.scale.setScalar(reduceMotion ? tuning.pulse_radius : 1 + age / .7 * (tuning.pulse_radius - 1)); pulse.material.opacity = (1 - age / .7) * .7; }
            clouds.forEach((c, i) => { c.position.y = c.userData.baseY + (reduceMotion ? 0 : Math.sin(time * .15 + i) * .18); });
        },
        player
    };
}
