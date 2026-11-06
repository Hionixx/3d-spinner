const container = document.getElementById('canvas-container');
const colorModal = document.getElementById('color-modal');
const hexInput = document.getElementById('hex-input');
const nativePicker = document.getElementById('native-picker');
const paletteGrid = document.getElementById('palette-grid');

const paletteColors = [
    '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#F44336', '#E91E63',
    '#9C27B0', '#673AB7', '#3F51B5', '#607D8B', '#212121', '#FFFFFF'
];

paletteColors.forEach((hex) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'palette-swatch';
    swatch.style.backgroundColor = hex;
    swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        applyColor(hex);
    });
    paletteGrid.appendChild(swatch);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(6, 10, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -6;
dirLight.shadow.camera.right = 6;
dirLight.shadow.camera.top = 6;
dirLight.shadow.camera.bottom = -6;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
dirLight2.position.set(-6, -8, -6);
scene.add(dirLight2);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xe8e8e8, 0.4);
scene.add(hemisphereLight);

const shadowPlaneGeo = new THREE.PlaneGeometry(12, 12);
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = 512;
shadowCanvas.height = 512;
const sCtx = shadowCanvas.getContext('2d');
const sGrad = sCtx.createRadialGradient(256, 256, 20, 256, 256, 240);
sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.26)');
sGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.1)');
sGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.02)');
sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
sCtx.fillStyle = sGrad;
sCtx.fillRect(0, 0, 512, 512);
const shadowTex = new THREE.CanvasTexture(shadowCanvas);
const shadowPlaneMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false
});
const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.position.z = -0.45;
scene.add(shadowPlane);

const spinnerGroup = new THREE.Group();
scene.add(spinnerGroup);

let rotor = new THREE.Group();
spinnerGroup.add(rotor);

const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2196f3,
    roughness: 0.2,
    metalness: 0.08,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9
});

const weightsMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8,
    metalness: 0.98,
    roughness: 0.12
});

const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.25
});

const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x181818,
    metalness: 0.5,
    roughness: 0.35
});

const hexByteMap = new Uint8Array(256);
for (let i = 0; i < 10; i++) hexByteMap[48 + i] = i;
for (let i = 0; i < 6; i++) {
    hexByteMap[97 + i] = 10 + i;
    hexByteMap[65 + i] = 10 + i;
}

function hexToArrayBuffer(hex) {
    const len = hex.length >>> 1;
    const bytes = new Uint8Array(len);
    for (let i = 0, j = 0; i < len; i++, j += 2) {
        bytes[i] = (hexByteMap[hex.charCodeAt(j)] << 4) | hexByteMap[hex.charCodeAt(j + 1)];
    }
    return bytes.buffer;
}

function buildFallbackModel() {
    while (rotor.children.length > 0) rotor.remove(rotor.children[0]);
    while (spinnerGroup.children.length > 0) spinnerGroup.remove(spinnerGroup.children[0]);

    rotor = new THREE.Group();
    spinnerGroup.add(rotor);

    const R = 3.2;
    const r_o = 1.6;
    const r_w = 1.35;
    const delta = r_o - r_w;
    const D_f = (R * R - delta * delta) / (R + 2 * delta);
    const r_f = D_f - r_w;

    const shapePoints = [];
    const N = 80;

    for (let i = 0; i < 3; i++) {
        const theta_c = (i * 2 * Math.PI) / 3;
        const Cx = R * Math.cos(theta_c);
        const Cy = R * Math.sin(theta_c);

        const theta_f_prev = (theta_c - Math.PI / 3 + 2 * Math.PI) % (2 * Math.PI);
        const Fx_prev = D_f * Math.cos(theta_f_prev);
        const Fy_prev = D_f * Math.sin(theta_f_prev);
        const ang_start = Math.atan2(Fy_prev - Cy, Fx_prev - Cx);

        const theta_f = theta_c + Math.PI / 3;
        const Fx = D_f * Math.cos(theta_f);
        const Fy = D_f * Math.sin(theta_f);
        const ang_end = Math.atan2(Fy - Cy, Fx - Cx);

        let sweep = ang_end - ang_start;
        while (sweep < 0) sweep += 2 * Math.PI;

        for (let s = 0; s <= N; s++) {
            const a = ang_start + (sweep * s) / N;
            shapePoints.push(new THREE.Vector2(Cx + r_o * Math.cos(a), Cy + r_o * Math.sin(a)));
        }

        const next_theta_c = ((i + 1) % 3) * 2 * Math.PI / 3;
        const next_Cx = R * Math.cos(next_theta_c);
        const next_Cy = R * Math.sin(next_theta_c);

        const f_ang_start = Math.atan2(Cy - Fy, Cx - Fx);
        const f_ang_end = Math.atan2(next_Cy - Fy, next_Cx - Fx);
        let f_sweep = f_ang_end - f_ang_start;
        while (f_sweep > 0) f_sweep -= 2 * Math.PI;

        for (let s = 1; s <= N; s++) {
            const a = f_ang_start + (f_sweep * s) / N;
            shapePoints.push(new THREE.Vector2(Fx + r_f * Math.cos(a), Fy + r_f * Math.sin(a)));
        }
    }

    const spinnerShape = new THREE.Shape(shapePoints);
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 1.1, 0, Math.PI * 2, true);
    spinnerShape.holes.push(centerHole);

    for (let i = 0; i < 3; i++) {
        const theta_c = (i * 2 * Math.PI) / 3;
        const Cx = R * Math.cos(theta_c);
        const Cy = R * Math.sin(theta_c);
        const outerHole = new THREE.Path();
        outerHole.absarc(Cx, Cy, 1.1, 0, Math.PI * 2, true);
        spinnerShape.holes.push(outerHole);
    }

    const bodyGeometry = new THREE.ExtrudeGeometry(spinnerShape, {
        steps: 1,
        depth: 0.46,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 6,
        curveSegments: 64
    });
    bodyGeometry.center();
    bodyGeometry.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    rotor.add(bodyMesh);

    for (let i = 0; i < 3; i++) {
        const theta_c = (i * 2 * Math.PI) / 3;
        const Cx = R * Math.cos(theta_c);
        const Cy = R * Math.sin(theta_c);

        const outerRaceGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.52, 48, 1, true);
        const outerRace = new THREE.Mesh(outerRaceGeo, weightsMaterial);
        outerRace.rotation.x = Math.PI / 2;
        outerRace.position.set(Cx, Cy, 0);
        outerRace.castShadow = true;
        rotor.add(outerRace);

        const innerRaceGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.52, 48, 1, true);
        const innerRace = new THREE.Mesh(innerRaceGeo, weightsMaterial);
        innerRace.rotation.x = Math.PI / 2;
        innerRace.position.set(Cx, Cy, 0);
        innerRace.castShadow = true;
        rotor.add(innerRace);

        const ballGeo = new THREE.SphereGeometry(0.12, 16, 16);
        for (let b = 0; b < 7; b++) {
            const bAng = (b * 2 * Math.PI) / 7;
            const ball = new THREE.Mesh(ballGeo, weightsMaterial);
            ball.position.set(Cx + 0.89 * Math.cos(bAng), Cy + 0.89 * Math.sin(bAng), 0);
            ball.castShadow = true;
            rotor.add(ball);
        }

        const coreGeo = new THREE.CylinderGeometry(0.67, 0.67, 0.48, 36);
        const core = new THREE.Mesh(coreGeo, brassMaterial);
        core.rotation.x = Math.PI / 2;
        core.position.set(Cx, Cy, 0);
        core.castShadow = true;
        rotor.add(core);
    }

    const centerOuterGeo = new THREE.CylinderGeometry(1.09, 1.09, 0.52, 48, 1, true);
    const centerOuter = new THREE.Mesh(centerOuterGeo, weightsMaterial);
    centerOuter.rotation.x = Math.PI / 2;
    centerOuter.castShadow = true;
    rotor.add(centerOuter);

    const centerBallGeo = new THREE.SphereGeometry(0.11, 16, 16);
    for (let cb = 0; cb < 8; cb++) {
        const cAng = (cb * 2 * Math.PI) / 8;
        const cBall = new THREE.Mesh(centerBallGeo, weightsMaterial);
        cBall.position.set(0.85 * Math.cos(cAng), 0.85 * Math.sin(cAng), 0);
        rotor.add(cBall);
    }

    function createFingerCap(zPos, flip) {
        const capGroup = new THREE.Group();

        const baseCapGeo = new THREE.CylinderGeometry(0.88, 0.92, 0.16, 48);
        const baseCap = new THREE.Mesh(baseCapGeo, capMaterial);
        baseCap.rotation.x = Math.PI / 2;
        baseCap.castShadow = true;
        capGroup.add(baseCap);

        const torusRimGeo = new THREE.TorusGeometry(0.72, 0.04, 16, 48);
        const torusRim = new THREE.Mesh(torusRimGeo, weightsMaterial);
        torusRim.position.z = flip ? -0.08 : 0.08;
        capGroup.add(torusRim);

        const gripDishGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.06, 48);
        const gripDish = new THREE.Mesh(gripDishGeo, capMaterial);
        gripDish.rotation.x = Math.PI / 2;
        gripDish.position.z = flip ? -0.06 : 0.06;
        capGroup.add(gripDish);

        capGroup.position.z = zPos;
        return capGroup;
    }

    const topCap = createFingerCap(0.32, false);
    const bottomCap = createFingerCap(-0.32, true);
    spinnerGroup.add(topCap);
    spinnerGroup.add(bottomCap);
}

function setupLoadedModel(gltf) {
    while (rotor.children.length > 0) rotor.remove(rotor.children[0]);
    while (spinnerGroup.children.length > 0) spinnerGroup.remove(spinnerGroup.children[0]);

    rotor = new THREE.Group();
    spinnerGroup.add(rotor);

    const loadedRotor = gltf.scene.getObjectByName('Rotor');
    const loadedCap = gltf.scene.getObjectByName('Cap');

    if (loadedRotor) {
        loadedRotor.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.name === 'Body') {
                    child.material = bodyMaterial;
                } else {
                    child.material = weightsMaterial;
                }
            }
        });
        rotor.add(loadedRotor);
    }

    if (loadedCap) {
        loadedCap.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material = capMaterial;
            }
        });
        spinnerGroup.add(loadedCap);
    }
}

buildFallbackModel();

if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined' && typeof SPINNER_MODEL_HEX !== 'undefined') {
    try {
        const loader = new THREE.GLTFLoader();
        const buf = hexToArrayBuffer(SPINNER_MODEL_HEX);
        loader.parse(buf, '', (gltf) => {
            setupLoadedModel(gltf);
        });
    } catch (e) {
    }
}

function applyColor(val) {
    let cleanHex = val.trim();
    if (!cleanHex.startsWith('#')) cleanHex = '#' + cleanHex;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        bodyMaterial.color.setStyle(cleanHex);
        hexInput.value = cleanHex.toUpperCase();
        nativePicker.value = cleanHex;
    }
}

function openColorPicker() {
    colorModal.classList.remove('hidden');
    controls.enabled = false;
    hexInput.value = '#' + bodyMaterial.color.getHexString().toUpperCase();
    nativePicker.value = '#' + bodyMaterial.color.getHexString();
    hexInput.focus();
    hexInput.select();
}

function closeColorPicker() {
    colorModal.classList.add('hidden');
    controls.enabled = true;
}

colorModal.addEventListener('click', (e) => {
    if (e.target === colorModal) {
        closeColorPicker();
    }
});

hexInput.addEventListener('input', (e) => {
    applyColor(e.target.value);
});

nativePicker.addEventListener('input', (e) => {
    applyColor(e.target.value);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isDraggingSpinner = false;
let previousPointerAngle = 0;
let previousPointerTime = 0;
let angularVelocity = 0;
let velocityHistory = [];

let clickCount = 0;
let clickTimer = null;

function getPointerAngle(clientX, clientY) {
    const spinnerCenter = new THREE.Vector3();
    spinnerGroup.getWorldPosition(spinnerCenter);
    const screenCenter = spinnerCenter.clone().project(camera);
    const cx = ((screenCenter.x + 1) * window.innerWidth) / 2;
    const cy = ((-screenCenter.y + 1) * window.innerHeight) / 2;
    return Math.atan2(clientY - cy, clientX - cx);
}

function getRotorAlignmentSign() {
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(spinnerGroup.matrixWorld);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    return normal.dot(camDir) < 0 ? -1 : 1;
}

function normalizeAngleDelta(delta) {
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
}

window.addEventListener('click', (e) => {
    if (!colorModal.classList.contains('hidden')) return;

    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);

    if (e.detail === 3 || clickCount >= 3) {
        clickCount = 0;
        openColorPicker();
    } else {
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 350);
    }
});

window.addEventListener('pointerdown', (e) => {
    if (!colorModal.classList.contains('hidden')) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(rotor.children, true);

    if (hits.length > 0) {
        isDraggingSpinner = true;
        controls.enabled = false;
        previousPointerAngle = getPointerAngle(e.clientX, e.clientY);
        previousPointerTime = performance.now();
        velocityHistory = [];
        angularVelocity = 0;
    }
});

window.addEventListener('pointermove', (e) => {
    if (!isDraggingSpinner) return;

    const currentTime = performance.now();
    const dt = (currentTime - previousPointerTime) / 1000;
    const currentAngle = getPointerAngle(e.clientX, e.clientY);
    const rawDelta = normalizeAngleDelta(currentAngle - previousPointerAngle);
    const sign = getRotorAlignmentSign();
    const delta = rawDelta * sign;

    rotor.rotation.z += delta;

    if (dt > 0.005) {
        const instantVelocity = delta / dt;
        velocityHistory.push(instantVelocity);
        if (velocityHistory.length > 5) velocityHistory.shift();
        previousPointerTime = currentTime;
        previousPointerAngle = currentAngle;
    }
});

function endSpinnerDrag() {
    if (!isDraggingSpinner) return;
    isDraggingSpinner = false;
    if (colorModal.classList.contains('hidden')) {
        controls.enabled = true;
    }

    if (velocityHistory.length > 0) {
        const sum = velocityHistory.reduce((acc, v) => acc + v, 0);
        angularVelocity = sum / velocityHistory.length;
        const maxVelocity = 90;
        angularVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, angularVelocity));
    }
}

window.addEventListener('pointerup', endSpinnerDrag);
window.addEventListener('pointercancel', endSpinnerDrag);

window.addEventListener('keydown', (e) => {
    const key = e.key;

    if (!colorModal.classList.contains('hidden')) {
        if (key === 'Escape' || key === 'Enter') {
            closeColorPicker();
        }
        return;
    }

    if (key >= '1' && key <= '8') {
        const idx = parseInt(key, 10) - 1;
        applyColor(paletteColors[idx]);
    } else if (key === ' ' || key === 'Spacebar') {
        const boost = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 20);
        angularVelocity = boost;
    } else if (key === 'ArrowLeft') {
        spinnerGroup.rotation.y -= 0.1;
    } else if (key === 'ArrowRight') {
        spinnerGroup.rotation.y += 0.1;
    } else if (key === 'ArrowUp') {
        spinnerGroup.rotation.x -= 0.1;
    } else if (key === 'ArrowDown') {
        spinnerGroup.rotation.x += 0.1;
    } else if (key === 'w' || key === 'W') {
        spinnerGroup.position.y += 0.2;
    } else if (key === 's' || key === 'S') {
        spinnerGroup.position.y -= 0.2;
    } else if (key === 'a' || key === 'A') {
        spinnerGroup.position.x -= 0.2;
    } else if (key === 'd' || key === 'D') {
        spinnerGroup.position.x += 0.2;
    } else if (key === 'r' || key === 'R') {
        controls.reset();
        spinnerGroup.position.set(0, 0, 0);
        spinnerGroup.rotation.set(0, 0, 0);
        angularVelocity = 0;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let lastTime = performance.now();

function animate(currentTime) {
    requestAnimationFrame(animate);

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (!isDraggingSpinner) {
        if (Math.abs(angularVelocity) > 0.0001) {
            rotor.rotation.z += angularVelocity * dt;
            const damping = Math.pow(0.993, dt * 60);
            angularVelocity *= damping;
        } else {
            angularVelocity = 0;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

requestAnimationFrame(animate);
