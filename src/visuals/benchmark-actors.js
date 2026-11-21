import * as THREE from 'three';

export const BENCHMARK_DRAW_BATCHES = Object.freeze({ shade: 4, mote: 2 });

export function benchmarkRenderPlan(game) {
    if (!game?.benchmark) throw new TypeError('benchmark render plan requires a benchmark game');
    return {
        shades: game.shades.length,
        motes: game.motes.length,
        shade_draw_batches: BENCHMARK_DRAW_BATCHES.shade,
        mote_draw_batches: BENCHMARK_DRAW_BATCHES.mote,
    };
}

export function createBenchmarkActors({ scene, moteGeo, moteMat, shadeGeo, shadeMat, eyeGeo, eyeMat, glowTexture }) {
    const group = new THREE.Group(); group.name = 'benchmark-actors'; scene.add(group);
    const hazeMat = new THREE.MeshBasicMaterial({ color: '#7A3CFF', transparent: true, opacity: .12, depthWrite: false });
    const heads = new THREE.InstancedMesh(shadeGeo, shadeMat, 200);
    const hazes = new THREE.InstancedMesh(shadeGeo, hazeMat, 200);
    const leftEyes = new THREE.InstancedMesh(eyeGeo, eyeMat, 200);
    const rightEyes = new THREE.InstancedMesh(eyeGeo, eyeMat, 200);
    const moteCores = new THREE.InstancedMesh(moteGeo, moteMat, 100);
    // These matrices are streamed every rendered frame. Declaring the usage
    // avoids needless static-buffer synchronization in the benchmark path.
    for (const batch of [heads, hazes, leftEyes, rightEyes, moteCores]) {
        batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    const motePositions = new Float32Array(100 * 3);
    const moteGlowGeo = new THREE.BufferGeometry();
    const motePositionAttribute = new THREE.BufferAttribute(motePositions, 3);
    motePositionAttribute.setUsage(THREE.DynamicDrawUsage);
    moteGlowGeo.setAttribute('position', motePositionAttribute);
    const moteGlowMat = new THREE.PointsMaterial({ map: glowTexture, color: '#FFF6C2', size: 1.3, sizeAttenuation: true, transparent: true, opacity: .7, depthWrite: false });
    const moteGlows = new THREE.Points(moteGlowGeo, moteGlowMat);
    group.add(heads, hazes, leftEyes, rightEyes, moteCores, moteGlows);

    const root = new THREE.Object3D(), matrix = new THREE.Matrix4();
    const headLocal = new THREE.Matrix4().makeScale(.85, 1.25, .85);
    const hazeLocal = new THREE.Matrix4().makeScale(1.3, 1.4, 1.3);
    const leftEyeLocal = new THREE.Matrix4().makeTranslation(-.18, .12, -.48);
    const rightEyeLocal = new THREE.Matrix4().makeTranslation(.18, .12, -.48);
    const moteMatrix = new THREE.Matrix4();
    let currentShadeColor = '';

    return {
        update(game, time, target, distinctPalette) {
            const plan = benchmarkRenderPlan(game), shadeColor = distinctPalette ? '#00B3FF' : '#7A3CFF';
            if (currentShadeColor !== shadeColor) {
                currentShadeColor = shadeColor;
                shadeMat.emissive.set(shadeColor); hazeMat.color.set(shadeColor); eyeMat.color.set(shadeColor);
            }
            heads.count = hazes.count = leftEyes.count = rightEyes.count = plan.shades;
            for (let i = 0; i < plan.shades; i++) {
                const shade = game.shades[i];
                root.position.set(shade.pos[0], shade.pos[1] + .9, shade.pos[2]);
                root.lookAt(target.x, root.position.y, target.z); root.rotation.y += Math.PI; root.updateMatrix();
                matrix.multiplyMatrices(root.matrix, headLocal); heads.setMatrixAt(i, matrix);
                matrix.multiplyMatrices(root.matrix, hazeLocal); hazes.setMatrixAt(i, matrix);
                matrix.multiplyMatrices(root.matrix, leftEyeLocal); leftEyes.setMatrixAt(i, matrix);
                matrix.multiplyMatrices(root.matrix, rightEyeLocal); rightEyes.setMatrixAt(i, matrix);
            }
            heads.instanceMatrix.needsUpdate = true; hazes.instanceMatrix.needsUpdate = true;
            leftEyes.instanceMatrix.needsUpdate = true; rightEyes.instanceMatrix.needsUpdate = true;

            moteCores.count = plan.motes;
            for (let i = 0; i < plan.motes; i++) {
                const mote = game.motes[i], y = mote.pos[1] + .65 + Math.sin(time * 1.7 + i * 3) * .14;
                moteMatrix.makeTranslation(mote.pos[0], y, mote.pos[2]); moteCores.setMatrixAt(i, moteMatrix);
                motePositions[i * 3] = mote.pos[0]; motePositions[i * 3 + 1] = y; motePositions[i * 3 + 2] = mote.pos[2];
            }
            moteCores.instanceMatrix.needsUpdate = true; motePositionAttribute.needsUpdate = true;
        },
        dispose() {
            group.removeFromParent(); hazeMat.dispose(); moteGlowGeo.dispose(); moteGlowMat.dispose();
        },
    };
}
