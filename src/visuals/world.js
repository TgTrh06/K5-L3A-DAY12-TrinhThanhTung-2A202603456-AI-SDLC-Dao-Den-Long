import * as THREE from 'three';

export function syncEntityPosition(object, entity, verticalOffset = 0) {
    object.position.fromArray(entity.pos);
    object.position.y += verticalOffset;
    object.visible = entity.state !== 'removed' || entity.stateTicksLeft > 0;
}
import { paperTexture, cloudTexture, skyTexture, glowTexture, groundTexture, randomSource } from './paint.js';

export function createWorld(renderer, scene, tuning, initialGame, getDistinctPalette = () => false) {
    const random = randomSource(99), glow = glowTexture();
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    scene.fog = new THREE.FogExp2('#1B2350', .006);
    const ambient = new THREE.HemisphereLight('#f5f1e6', '#2f5d50', .7); scene.add(ambient);
    const moonlight = new THREE.DirectionalLight('#d5e7f1', 1.25); moonlight.position.set(-30, 50, 20); scene.add(moonlight);
    const material = (color, map, extra = {}) => new THREE.MeshStandardMaterial({ color, map, roughness: 1, ...extra });
    const mesh = (parent, geometry, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); parent.add(m); return m;
    };
    const ivory = material('#E8E2D0', paperTexture('#f2dfb3'));
    const wood = material('#6B4A2F', paperTexture('#ad9470'));
    const gold = new THREE.MeshBasicMaterial({ color: '#F2C14E' });
    const dark = material('#2F5D50', paperTexture('#73807a'));
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
    const night1Map = new THREE.Group(); scene.add(night1Map);
    mesh(night1Map, new THREE.CylinderGeometry(40, 32, 5, 96), material('#12384A', paperTexture('#627a80')), 0, -2.65);
    const surface = mesh(night1Map, new THREE.CircleGeometry(40, 96), material('#2F5D50', groundTexture()), 0, -.025);
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
    const night2Map = new THREE.Group(), night3Map = new THREE.Group(); scene.add(night2Map, night3Map);
    const islandMaterial = material('#2F5D50', groundTexture()), cliffMaterial = material('#6B4A2F', paperTexture('#967451'));
    for (const x of [0, 70]) {
        mesh(night2Map, new THREE.CylinderGeometry(28, 25, 4, 64), cliffMaterial, x, -2);
        const island = mesh(night2Map, new THREE.CircleGeometry(28, 64), islandMaterial, x, .02); island.rotation.x = -Math.PI / 2;
    }
    mesh(night2Map, new THREE.BoxGeometry(18, .45, 4), wood, 35, -.12, 0);
    for (let x = 26.5; x <= 43.5; x += 1.5) mesh(night2Map, new THREE.BoxGeometry(.16, .08, 4.1), gold, x, .13, 0);
    const night3Floor = mesh(night3Map, new THREE.CircleGeometry(45, 80), islandMaterial, 0, .02); night3Floor.rotation.x = -Math.PI / 2;
    const terraceShape = new THREE.Shape(); terraceShape.moveTo(24, 0);
    terraceShape.absarc(0, 0, 24, 0, Math.PI, false);
    terraceShape.lineTo(-12, 0); terraceShape.absarc(0, 0, 12, Math.PI, 0, true); terraceShape.closePath();
    const terrace = mesh(night3Map, new THREE.ShapeGeometry(terraceShape, 48), material('#C9B48A', groundTexture()), 0, 3, 0); terrace.rotation.x = Math.PI / 2;
    mesh(night3Map, new THREE.CylinderGeometry(8, 8, .35, 48, 1, true), cliffMaterial, 0, 5.82, 0);
    mesh(night3Map, new THREE.CircleGeometry(8, 48), material('#C9B48A', groundTexture()), 0, 6, 0).rotation.x = -Math.PI / 2;
    const deckRim = mesh(night3Map, new THREE.TorusGeometry(8, .065, 6, 64), gold, 0, 6.04, 0);
    deckRim.rotation.x = Math.PI / 2;
    const tier2Tower = new THREE.Group(); tier2Tower.position.set(-3.5, 0, 5.5); night3Map.add(tier2Tower);
    const towerFloor = 6.1, towerTop = 8.55;
    const towerWood = material('#8C6842', paperTexture('#bd9f6b'), { emissive: '#F2C14E', emissiveIntensity: .16 });
    mesh(tier2Tower, new THREE.CylinderGeometry(1.25, 1.4, towerTop - towerFloor, 24), towerWood, 0, (towerFloor + towerTop) / 2, 0);
    mesh(tier2Tower, new THREE.ConeGeometry(1.45, .65, 8), wood, 0, towerTop + .3, 0);
    const towerRibs = [];
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        towerRibs.push(Math.cos(a) * 1.41, towerFloor + .05, Math.sin(a) * 1.41,
            Math.cos(a) * 1.26, towerTop - .05, Math.sin(a) * 1.26);
    }
    const towerRibGeo = new THREE.BufferGeometry();
    towerRibGeo.setAttribute('position', new THREE.Float32BufferAttribute(towerRibs, 3));
    tier2Tower.add(new THREE.LineSegments(towerRibGeo, new THREE.LineBasicMaterial({ color: '#F2C14E', transparent: true, opacity: .7 })));
    for (const y of [towerFloor + .08, towerTop]) {
        const band = mesh(tier2Tower, new THREE.TorusGeometry(y === towerTop ? 1.29 : 1.43, .055, 6, 32), gold, 0, y, 0);
        band.rotation.x = Math.PI / 2;
    }
    for (const angle of [30, 150]) {
        const a = angle * Math.PI / 180, ramp = mesh(night3Map, new THREE.BoxGeometry(6.2, .14, 3), material('#C9B48A', paperTexture('#bca77e')), Math.cos(a) * 27, 1.5, Math.sin(a) * 27);
        ramp.rotation.y = -a; ramp.rotation.z = -.46;
    }
    for (const [x, z] of [[20, 18], [50, -18]]) {
        const pad = mesh(night2Map, new THREE.CylinderGeometry(1, 1, .22, 24), new THREE.MeshStandardMaterial({ color: '#C8102E', emissive: '#C8102E', emissiveIntensity: .5 }), x, .14, z);
        pad.material.roughness = 1;
    }
    mesh(night3Map, new THREE.CylinderGeometry(1, 1, .22, 24), new THREE.MeshStandardMaterial({ color: '#C8102E', emissive: '#C8102E', emissiveIntensity: .5 }), 0, 3.14, 13);
    const player = new THREE.Group(); scene.add(player);
    const body = new THREE.Group(); player.add(body);
    mesh(body, new THREE.CylinderGeometry(.29, .48, 1.05, 12), material('#E8E2D0', paperTexture('#d99c7d')), 0, .95);
    const scarf = mesh(body, new THREE.TorusGeometry(.34, .09, 6, 12), new THREE.MeshStandardMaterial({ color: '#C8102E', roughness: 1 }), 0, 1.3); scarf.rotation.x = Math.PI / 2;
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
    const lanterns = new THREE.Group(); scene.add(lanterns);
    const createLantern = (l, i) => {
        const p = new THREE.Group(); p.position.fromArray(l.pos);
        mesh(p, new THREE.CylinderGeometry(.65, .8, .22, 12), dark, 0, .1);
        mesh(p, new THREE.CylinderGeometry(.12, .2, 2.7, 10), wood, 0, 1.4);
        mesh(p, new THREE.BoxGeometry(1.6, .12, .12), wood, .58, 2.7);
        const paper = material('#5B5F6E', paperTexture('#e9d6a8', 16), { emissive: '#FFB347', emissiveIntensity: .07 });
        const bulb = mesh(p, new THREE.SphereGeometry(.6, 20, 12), paper, .9, 2.2); bulb.scale.y = 1.2;
        for (let j = 0; j < 8; j++) {
            const a = j * Math.PI / 8;
            const rib = mesh(p, new THREE.TorusGeometry(.6, .012, 4, 30), gold, .9, 2.2);
            rib.rotation.y = a; rib.scale.y = 1.2;
        }
        for (const y of [1.48, 2.92]) mesh(p, new THREE.CylinderGeometry(.18, .18, .09, 12), wood, .9, y);
        mesh(p, new THREE.CylinderGeometry(.015, .015, .32, 5), gold, .9, 1.28);
        const aura = sprite(p, 5, 0); aura.position.set(.9, 2.2, 0);
        const light = new THREE.PointLight('#FFB347', 0, 17, 1.5); light.position.set(.9, 2.2, 0); p.add(light);
        const safe = mesh(p, new THREE.RingGeometry(tuning.safe_radius - .04, tuning.safe_radius, 80), new THREE.MeshBasicMaterial({ color: '#d8bc7e', transparent: true, opacity: .16, side: THREE.DoubleSide }), 0, .02);
        safe.rotation.x = -Math.PI / 2;
        const tear = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#372b2c', linewidth: 2 }));
        tear.geometry.setAttribute('position', new THREE.Float32BufferAttribute([.8, 2.38, -.55, 1, 2.23, -.61, 1.08, 2.08, -.56, .96, 1.94, -.52], 3));
        p.add(tear);
        const fuelBar = new THREE.Group(); p.add(fuelBar);
        const barBack = mesh(fuelBar, new THREE.PlaneGeometry(1.45, .14), new THREE.MeshBasicMaterial({ color: '#111827', transparent: true, opacity: .86 }), 0, 0, 0);
        const barFill = mesh(fuelBar, new THREE.PlaneGeometry(1.37, .07), new THREE.MeshBasicMaterial({ color: '#F2C14E' }), 0, 0, .01);
        fuelBar.position.set(.9, 3.35, 0); fuelBar.visible = false;
        fuelBar.userData.parts = { back: barBack, fill: barFill };
        const plaque = document.createElement('canvas'); plaque.width = 128; plaque.height = 128;
        const ctx = plaque.getContext('2d'); ctx.fillStyle = '#FFE9B0'; ctx.font = '48px Georgia'; ctx.textAlign = 'center'; ctx.fillText(l.id.slice(1).padStart(2, '0'), 64, 82);
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(plaque), transparent: true, depthWrite: false })); label.position.set(0, 3.4, 0); label.scale.set(.75, .75, 1); p.add(label);
        p.userData.parts = { bulb, aura, light, safe, tear, fuelBar }; p.userData.dispose = () => {
            p.traverse(o => { o.geometry?.dispose(); if (o.material) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) { m.map?.dispose(); m.dispose(); } } });
        };
        return p;
    };
    const motes = new THREE.Group(), shades = new THREE.Group(), drifters = new THREE.Group(), charms = new THREE.Group(); scene.add(motes, shades, drifters, charms);
    const moteGeo = new THREE.SphereGeometry(.09, 6, 4), moteMat = new THREE.MeshBasicMaterial({ color: '#FFF6C2' });
    const shadeGeo = new THREE.SphereGeometry(.65, 12, 10), shadeMat = material('#120A1A', paperTexture('#5c4967'), { color: '#120A1A', emissive: '#7A3CFF', emissiveIntensity: .04, transparent: true, opacity: .88 });
    const eyeGeo = new THREE.SphereGeometry(.06, 6, 4), eyeMat = new THREE.MeshBasicMaterial({ color: '#d4b5d9' });
    const drifterMaterial = new THREE.MeshBasicMaterial({ color: '#8FA3B8', transparent: true, opacity: .82, side: THREE.DoubleSide });
    const drifterGeometry = new THREE.PlaneGeometry(1.2, .45);
    const charmMaterial = new THREE.MeshStandardMaterial({ color: '#C8102E', emissive: '#C8102E', emissiveIntensity: .25, roughness: 1 });
    const charmGeometry = new THREE.SphereGeometry(.25, 12, 8), charmSeal = new THREE.TorusGeometry(.38, .035, 6, 24);
    const windRibbon = new THREE.Group(); scene.add(windRibbon);
    for (let i = 0; i < 10; i++) {
        const leaf = mesh(windRibbon, new THREE.PlaneGeometry(.75, .12), new THREE.MeshBasicMaterial({ color: '#C9B48A', transparent: true, opacity: .72, side: THREE.DoubleSide }), i * 2.2 - 10, 1.3 + (i % 3) * .25, (i % 2 ? 1 : -1) * (3 + i % 4));
        leaf.rotation.y = i * .6; leaf.rotation.x = -.35;
    }
    const pulse = mesh(scene, new THREE.RingGeometry(.96, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffe1a0', side: THREE.DoubleSide, transparent: true, opacity: 0 })); pulse.rotation.x = -Math.PI / 2;
    let pulseStart = -1000, lastTick = -1;
    function sync(group, items, factory) {
        while (group.children.length > items.length) {
            const removed = group.children.at(-1); removed.userData.dispose?.(); group.remove(removed);
        }
        while (group.children.length < items.length) group.add(factory(items[group.children.length], group.children.length));
    }
    return {
        update(g, time, reduceMotion, events = []) {
            night1Map.visible = g.night === 1; night2Map.visible = g.night === 2; night3Map.visible = g.night === 3;
            ambient.intensity = .15 + .55 * g.lanterns.filter(l => l.lit).length / Math.max(1, g.lanterns.length);
            sky.position.copy(player.position);
            const moving = Math.hypot(...g.input.move) > 0 && g.state === 'playing';
            player.position.fromArray(g.player.pos); body.position.y = !reduceMotion && moving ? Math.sin(g.tick * .22) * .055 : 0;
            playerGlow.material.opacity = .45 + (reduceMotion ? 0 : Math.sin(time * 3) * .06);
            sync(lanterns, g.lanterns, createLantern);
            lanterns.children.forEach((root, i) => {
                const l = root.userData.parts, entity = g.lanterns[i], lit = entity.lit;
                const lowFuel = lit && entity.fuelUnits < tuning.low_fuel_threshold * tuning.tick_rate;
                const blink = !lowFuel || Math.floor(g.simTick / 30) % 2 === 0;
                root.position.fromArray(entity.pos);
                l.bulb.material.color.set(lit ? '#FFE9B0' : '#5B5F6E');
                l.bulb.scale.y = lit ? 1.2 : .96; l.bulb.visible = !lit || blink;
                l.bulb.material.emissiveIntensity = lit && blink ? 1.4 : .07; l.aura.material.opacity = lit && blink ? .7 : .08;
                l.light.intensity = lit && blink ? 22 : 0; l.safe.material.opacity = entity.fuelUnits >= tuning.low_fuel_threshold * tuning.tick_rate && lit ? .55 : .1;
                l.tear.visible = !lit; l.fuelBar.visible = lit && blink;
                const ratio = Math.max(0, Math.min(1, entity.fuelUnits / (tuning.fuel_max * tuning.tick_rate)));
                l.fuelBar.position.set(.9, 3.35, 0); l.fuelBar.lookAt(player.position);
                l.fuelBar.userData.parts.fill.scale.x = ratio;
                l.fuelBar.userData.parts.fill.position.x = -.685 * (1 - ratio);
            });
            sync(motes, g.motes, () => { const p = new THREE.Group(); mesh(p, moteGeo, moteMat); const glow = sprite(p, 1.3, .7); p.userData.dispose = () => glow.material.dispose(); return p; });
            g.motes.forEach((m, i) => { const p = motes.children[i]; p.position.fromArray(m.pos); p.position.y += .65 + (reduceMotion ? 0 : Math.sin(time * 1.7 + i * 3) * .14); });
            sync(shades, g.shades, () => {
                const p = new THREE.Group(); const head = mesh(p, shadeGeo, shadeMat); head.scale.set(.85, 1.25, .85);
                const haze = mesh(p, shadeGeo, new THREE.MeshBasicMaterial({ color: '#7A3CFF', transparent: true, opacity: .12, depthWrite: false })); haze.scale.set(1.3, 1.4, 1.3);
                const eyes = new THREE.Group(); p.add(eyes); for (const x of [-.18, .18]) mesh(eyes, eyeGeo, eyeMat, x, .12, -.48);
                p.userData.dispose = () => haze.material.dispose();
                return p;
            });
            g.shades.forEach((s, i) => {
                const p = shades.children[i]; syncEntityPosition(p, s, .9);
                p.lookAt(player.position.x, p.position.y, player.position.z); p.rotation.y += Math.PI;
                const stunned = s.state === 'stunned'; p.children[2].rotation.z = stunned ? Math.PI / 4 : 0;
                const shadeColor = getDistinctPalette() ? '#00B3FF' : '#7A3CFF';
                p.children[0].material.emissive.set(shadeColor); p.children[1].material.color.set(stunned ? '#3A3450' : shadeColor);
                p.children[2].children.forEach(eye => eye.material.color.set(shadeColor));
            });
            sync(drifters, g.drifters, () => { const ribbon = new THREE.Group(); const cloth = mesh(ribbon, drifterGeometry, drifterMaterial); cloth.rotation.y = Math.PI / 4; cloth.rotation.x = -.3; const halo = sprite(ribbon, 1.8, .18); ribbon.userData.halo = halo; return ribbon; });
            g.drifters.forEach((d, i) => {
                const obj = drifters.children[i]; syncEntityPosition(obj, d, 1.25);
                if (d.state !== 'removed') { obj.lookAt(player.position); obj.rotation.z = Math.sin(time * 3 + i) * .12; }
            });
            sync(charms, g.charms, () => { const obj = new THREE.Group(); mesh(obj, charmGeometry, charmMaterial); const seal = mesh(obj, charmSeal, gold); seal.rotation.x = Math.PI / 2; return obj; });
            g.charms.forEach((c, i) => { charms.children[i].position.fromArray(c.pos); charms.children[i].position.y += .8 + Math.sin(time * 2 + i) * .1; charms.children[i].visible = c.available; });
            windRibbon.visible = Boolean(g.wind?.active || g.wind?.warning);
            windRibbon.rotation.y = (g.wind?.dir_deg ?? 0) * Math.PI / 180;
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
