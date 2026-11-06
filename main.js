const container = document.getElementById('canvas-container');
const colorModal = document.getElementById('color-modal');
const hexInput = document.getElementById('hex-input');
const nativePicker = document.getElementById('native-picker');
const paletteGrid = document.getElementById('palette-grid');

const paletteColors = [
    '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#F44336', '#E91E63',
    '#9C27B0', '#673AB7', '#3F51B5', '#1A237E', '#B76E79', '#E0A96D',
    '#00E5FF', '#76FF03', '#FF4081', '#607D8B', '#212121', '#FFFFFF'
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
keyLight.position.set(5, 8, 10);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xeef2ff, 0.45);
fillLight.position.set(-7, -4, 6);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
rimLight.position.set(0, -9, -8);
scene.add(rimLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xd0d5dd, 0.4);
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

let capGroup = new THREE.Group();
spinnerGroup.add(capGroup);

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

const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x252525,
    metalness: 0.8,
    roughness: 0.35
});

const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.05
});

function buildSpinnerModel() {
    while (rotor.children.length > 0) rotor.remove(rotor.children[0]);
    while (capGroup.children.length > 0) capGroup.remove(capGroup.children[0]);
    while (spinnerGroup.children.length > 0) spinnerGroup.remove(spinnerGroup.children[0]);

    spinnerGroup.add(rotor);
    spinnerGroup.add(capGroup);

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
        bevelThickness: 0.08,
        bevelSize: 0.08,
        bevelSegments: 6,
        curveSegments: 64
    });
    bodyGeometry.translate(0, 0, -0.23);
    bodyGeometry.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    rotor.add(bodyMesh);

    for (let i = 0; i < 3; i++) {
        const theta_c = (i * 2 * Math.PI) / 3;
        const Cx = R * Math.cos(theta_c);
        const Cy = R * Math.sin(theta_c);

        const outerRaceGeo = new THREE.CylinderGeometry(1.095, 1.095, 0.48, 48);
        const outerRace = new THREE.Mesh(outerRaceGeo, weightsMaterial);
        outerRace.rotation.x = Math.PI / 2;
        outerRace.position.set(Cx, Cy, 0);
        outerRace.castShadow = true;
        rotor.add(outerRace);

        const racewayGeo = new THREE.CylinderGeometry(0.96, 0.96, 0.49, 48);
        const raceway = new THREE.Mesh(racewayGeo, darkMetalMaterial);
        raceway.rotation.x = Math.PI / 2;
        raceway.position.set(Cx, Cy, 0);
        rotor.add(raceway);

        const ballGeo = new THREE.SphereGeometry(0.10, 16, 16);
        for (let b = 0; b < 7; b++) {
            const bAng = (b * 2 * Math.PI) / 7;
            const ball = new THREE.Mesh(ballGeo, ballMaterial);
            ball.position.set(Cx + 0.83 * Math.cos(bAng), Cy + 0.83 * Math.sin(bAng), 0);
            ball.castShadow = true;
            rotor.add(ball);
        }

        const coreGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.50, 48);
        const core = new THREE.Mesh(coreGeo, brassMaterial);
        core.rotation.x = Math.PI / 2;
        core.position.set(Cx, Cy, 0);
        core.castShadow = true;
        rotor.add(core);

        const pinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.51, 36);
        const pin = new THREE.Mesh(pinGeo, weightsMaterial);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(Cx, Cy, 0);
        rotor.add(pin);
    }

    const centerOuterGeo = new THREE.CylinderGeometry(1.095, 1.095, 0.48, 48);
    const centerOuter = new THREE.Mesh(centerOuterGeo, darkMetalMaterial);
    centerOuter.rotation.x = Math.PI / 2;
    centerOuter.castShadow = true;
    rotor.add(centerOuter);

    const centerBallGeo = new THREE.SphereGeometry(0.09, 16, 16);
    for (let cb = 0; cb < 8; cb++) {
        const cAng = (cb * 2 * Math.PI) / 8;
        const cBall = new THREE.Mesh(centerBallGeo, ballMaterial);
        cBall.position.set(0.82 * Math.cos(cAng), 0.82 * Math.sin(cAng), 0);
        rotor.add(cBall);
    }

    function createFingerCap(zPos, flip) {
        const capG = new THREE.Group();

        const baseCapGeo = new THREE.CylinderGeometry(0.88, 0.92, 0.16, 48);
        const baseCap = new THREE.Mesh(baseCapGeo, capMaterial);
        baseCap.rotation.x = Math.PI / 2;
        baseCap.castShadow = true;
        capG.add(baseCap);

        const torusRimGeo = new THREE.TorusGeometry(0.72, 0.04, 16, 48);
        const torusRim = new THREE.Mesh(torusRimGeo, weightsMaterial);
        torusRim.position.z = flip ? -0.08 : 0.08;
        capG.add(torusRim);

        const gripDishGeo = new THREE.CylinderGeometry(0.64, 0.64, 0.06, 48);
        const gripDish = new THREE.Mesh(gripDishGeo, capMaterial);
        gripDish.rotation.x = Math.PI / 2;
        gripDish.position.z = flip ? -0.06 : 0.06;
        capG.add(gripDish);

        capG.position.z = zPos;
        return capG;
    }

    const topCap = createFingerCap(0.32, false);
    const bottomCap = createFingerCap(-0.32, true);
    capGroup.add(topCap);
    capGroup.add(bottomCap);
}

buildSpinnerModel();

function applyColor(val) {
    let cleanHex = val.trim();
    if (!cleanHex.startsWith('#')) cleanHex = '#' + cleanHex;
    if (/^#[0-9A-Fa-f]{3}$/.test(cleanHex)) {
        cleanHex = '#' + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] + cleanHex[3] + cleanHex[3];
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        bodyMaterial.color.setStyle(cleanHex);
        hexInput.value = cleanHex.toUpperCase();
        nativePicker.value = cleanHex;
    }
}

function openColorPicker() {
    colorModal.classList.remove('hidden');
    hexInput.value = '#' + bodyMaterial.color.getHexString().toUpperCase();
    nativePicker.value = '#' + bodyMaterial.color.getHexString();
    hexInput.focus();
    hexInput.select();
}

function closeColorPicker() {
    colorModal.classList.add('hidden');
}

colorModal.addEventListener('click', (e) => {
    if (e.target === colorModal) {
        closeColorPicker();
    }
});

hexInput.addEventListener('input', (e) => {
    applyColor(e.target.value);
});

hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
        closeColorPicker();
    }
});

nativePicker.addEventListener('input', (e) => {
    applyColor(e.target.value);
});

let audioCtx = null;
let bearingNoiseNode = null;
let bearingNoiseFilter = null;
let bearingToneOsc = null;
let bearingToneFilter = null;
let bearingGain = null;
let isAudioInitialized = false;

function initAudio() {
    if (isAudioInitialized) {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();

    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
    }

    bearingNoiseNode = audioCtx.createBufferSource();
    bearingNoiseNode.buffer = noiseBuffer;
    bearingNoiseNode.loop = true;

    bearingNoiseFilter = audioCtx.createBiquadFilter();
    bearingNoiseFilter.type = 'bandpass';
    bearingNoiseFilter.frequency.value = 600;
    bearingNoiseFilter.Q.value = 3.2;

    bearingToneOsc = audioCtx.createOscillator();
    bearingToneOsc.type = 'triangle';
    bearingToneOsc.frequency.value = 100;

    bearingToneFilter = audioCtx.createBiquadFilter();
    bearingToneFilter.type = 'lowpass';
    bearingToneFilter.frequency.value = 900;

    const toneGain = audioCtx.createGain();
    toneGain.gain.value = 0.3;

    bearingGain = audioCtx.createGain();
    bearingGain.gain.value = 0;

    bearingNoiseNode.connect(bearingNoiseFilter);
    bearingNoiseFilter.connect(bearingGain);

    bearingToneOsc.connect(bearingToneFilter);
    bearingToneFilter.connect(toneGain);
    toneGain.connect(bearingGain);

    bearingGain.connect(audioCtx.destination);

    bearingNoiseNode.start();
    bearingToneOsc.start();

    isAudioInitialized = true;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function updateAudio() {
    if (!isAudioInitialized || !audioCtx || !bearingGain) return;

    const speed = Math.abs(angularVelocity);
    if (speed < 0.2) {
        bearingGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
        return;
    }

    const normSpeed = Math.min(speed / 90, 1.4);
    const targetGain = Math.min(0.35, normSpeed * 0.28);
    const targetToneFreq = Math.min(680, 75 + speed * 6.8);
    const targetFilterFreq = Math.min(3400, 380 + speed * 30);

    bearingGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.03);
    bearingToneOsc.frequency.setTargetAtTime(targetToneFreq, audioCtx.currentTime, 0.03);
    bearingNoiseFilter.frequency.setTargetAtTime(targetFilterFreq, audioCtx.currentTime, 0.03);
}

function playFlickSound(strength) {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500 + Math.random() * 150, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.07);

    const s = Math.min(1.0, Math.max(0.25, (strength || 30) / 60));
    gain.gain.setValueAtTime(s * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);

    const snapNoise = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.05), audioCtx.sampleRate);
    const data = snapNoise.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = snapNoise;

    const nFilter = audioCtx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.value = 1400;

    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(s * 0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noiseSource.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(audioCtx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.05);
}

function playBrakeSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isPointerDown = false;
let isMoving = false;
let isRotating = false;
let pointerDownOnRotor = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let dragDistance = 0;
let downTime = 0;

let rotVelocityX = 0;
let rotVelocityY = 0;
let angularVelocity = 0;

let clickCount = 0;
let clickTimer = null;
let lastClickX = 0;
let lastClickY = 0;

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('click', (e) => {
    initAudio();
    if (!colorModal.classList.contains('hidden')) return;

    const dist = Math.hypot(e.clientX - lastClickX, e.clientY - lastClickY);
    lastClickX = e.clientX;
    lastClickY = e.clientY;

    if (dist > 35) {
        clickCount = 1;
    } else {
        clickCount++;
    }

    if (clickTimer) clearTimeout(clickTimer);

    if (e.detail === 3 || clickCount >= 3) {
        clickCount = 0;
        openColorPicker();
    } else {
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 400);
    }
});

window.addEventListener('dblclick', (e) => {
    initAudio();
    if (!colorModal.classList.contains('hidden')) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(rotor.children, true);
    if (hits.length > 0) {
        const dir = Math.sign(angularVelocity) || (Math.random() > 0.5 ? 1 : -1);
        angularVelocity = dir * (65 + Math.random() * 25);
        playFlickSound(70);
    }
});

window.addEventListener('pointerdown', (e) => {
    initAudio();
    if (!colorModal.classList.contains('hidden')) return;

    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    dragDistance = 0;
    downTime = performance.now();

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const capHits = raycaster.intersectObjects(capGroup.children, true);
    const rotorHits = raycaster.intersectObjects(rotor.children, true);

    pointerDownOnRotor = rotorHits.length > 0;

    if (e.button === 2 || e.button === 1 || e.shiftKey || capHits.length > 0) {
        isMoving = true;
        isRotating = false;
        document.body.style.cursor = 'move';
    } else {
        isRotating = true;
        isMoving = false;
        rotVelocityX = 0;
        rotVelocityY = 0;
        document.body.style.cursor = 'grab';
    }
});

window.addEventListener('pointermove', (e) => {
    if (!isPointerDown) {
        if (!colorModal.classList.contains('hidden')) {
            document.body.style.cursor = 'default';
            return;
        }
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const capHits = raycaster.intersectObjects(capGroup.children, true);
        if (capHits.length > 0) {
            document.body.style.cursor = 'move';
            return;
        }
        const rotorHits = raycaster.intersectObjects(rotor.children, true);
        document.body.style.cursor = rotorHits.length > 0 ? 'pointer' : 'default';
        return;
    }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    dragDistance += Math.hypot(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;

    if (isMoving) {
        const dist = camera.position.z - spinnerGroup.position.z;
        const factor = (2 * Math.tan((camera.fov * Math.PI) / 360) * dist) / window.innerHeight;
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        spinnerGroup.position.addScaledVector(camRight, dx * factor);
        spinnerGroup.position.addScaledVector(camUp, -dy * factor);
    } else if (isRotating) {
        document.body.style.cursor = 'grabbing';
        const rotSpeed = 0.007;
        rotVelocityX = dx * rotSpeed;
        rotVelocityY = dy * rotSpeed;

        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        const qYaw = new THREE.Quaternion().setFromAxisAngle(camUp, rotVelocityX);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(camRight, rotVelocityY);

        spinnerGroup.quaternion.premultiply(qYaw);
        spinnerGroup.quaternion.premultiply(qPitch);
    }
});

function endPointer(e) {
    if (!isPointerDown) return;

    const duration = performance.now() - downTime;

    if (isRotating && pointerDownOnRotor) {
        if (dragDistance < 10 && duration < 350) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            const boost = dir * (30 + Math.random() * 20);
            angularVelocity += boost;
            playFlickSound(Math.abs(boost));
        } else if (duration < 300 && dragDistance >= 10) {
            const flickSpeed = Math.hypot(rotVelocityX, rotVelocityY) * 2200;
            const sign = Math.sign(rotVelocityX || 1);
            const boost = sign * Math.min(90, flickSpeed);
            angularVelocity += boost;
            playFlickSound(Math.abs(boost));
        }
    }

    isPointerDown = false;
    isMoving = false;
    isRotating = false;
    pointerDownOnRotor = false;
    document.body.style.cursor = 'default';
}

window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

window.addEventListener('wheel', (e) => {
    initAudio();
    if (!colorModal.classList.contains('hidden')) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(rotor.children, true);
    if (hits.length > 0 && !e.ctrlKey) {
        angularVelocity += Math.sign(-e.deltaY) * 12;
        playFlickSound(25);
    } else {
        camera.position.z = Math.max(6, Math.min(30, camera.position.z + Math.sign(e.deltaY) * 0.8));
    }
}, { passive: true });

window.addEventListener('keydown', (e) => {
    initAudio();
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
    } else if (key === 'c' || key === 'C') {
        const rCol = paletteColors[Math.floor(Math.random() * paletteColors.length)];
        applyColor(rCol);
    } else if (key === ' ' || key === 'Spacebar') {
        const boost = (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 25);
        angularVelocity = boost;
        playFlickSound(Math.abs(boost));
    } else if (key === 'b' || key === 'B') {
        if (Math.abs(angularVelocity) > 0.1) {
            playBrakeSound();
        }
        angularVelocity = 0;
    } else if (key === 'ArrowLeft') {
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const q = new THREE.Quaternion().setFromAxisAngle(camUp, -0.1);
        spinnerGroup.quaternion.premultiply(q);
    } else if (key === 'ArrowRight') {
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const q = new THREE.Quaternion().setFromAxisAngle(camUp, 0.1);
        spinnerGroup.quaternion.premultiply(q);
    } else if (key === 'ArrowUp') {
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const q = new THREE.Quaternion().setFromAxisAngle(camRight, -0.1);
        spinnerGroup.quaternion.premultiply(q);
    } else if (key === 'ArrowDown') {
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const q = new THREE.Quaternion().setFromAxisAngle(camRight, 0.1);
        spinnerGroup.quaternion.premultiply(q);
    } else if (key === 'q' || key === 'Q') {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const q = new THREE.Quaternion().setFromAxisAngle(camDir, -0.1);
        spinnerGroup.quaternion.premultiply(q);
    } else if (key === 'e' || key === 'E') {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const q = new THREE.Quaternion().setFromAxisAngle(camDir, 0.1);
        spinnerGroup.quaternion.premultiply(q);
    } else if (key === 'w' || key === 'W' || key === 's' || key === 'S' || key === 'a' || key === 'A' || key === 'd' || key === 'D') {
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const speed = 0.4;
        if (key === 'w' || key === 'W') spinnerGroup.position.addScaledVector(camUp, speed);
        if (key === 's' || key === 'S') spinnerGroup.position.addScaledVector(camUp, -speed);
        if (key === 'd' || key === 'D') spinnerGroup.position.addScaledVector(camRight, speed);
        if (key === 'a' || key === 'A') spinnerGroup.position.addScaledVector(camRight, -speed);
    } else if (key === 'r' || key === 'R') {
        spinnerGroup.position.set(0, 0, 0);
        spinnerGroup.quaternion.set(0, 0, 0, 1);
        rotVelocityX = 0;
        rotVelocityY = 0;
        if (Math.abs(angularVelocity) > 0.1) {
            playBrakeSound();
        }
        angularVelocity = 0;
        camera.position.set(0, 0, 14);
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
});

let isTabActive = true;
document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive) {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        lastTime = performance.now();
        requestAnimationFrame(animate);
    } else {
        if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend();
        }
    }
});

let lastTime = performance.now();

function animate(currentTime) {
    if (!isTabActive) return;
    requestAnimationFrame(animate);

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (!isPointerDown && (Math.abs(rotVelocityX) > 0.00005 || Math.abs(rotVelocityY) > 0.00005)) {
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        const qYaw = new THREE.Quaternion().setFromAxisAngle(camUp, rotVelocityX);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(camRight, rotVelocityY);

        spinnerGroup.quaternion.premultiply(qYaw);
        spinnerGroup.quaternion.premultiply(qPitch);

        rotVelocityX *= 0.92;
        rotVelocityY *= 0.92;
    }

    if (Math.abs(angularVelocity) > 0.0001) {
        rotor.rotation.z += angularVelocity * dt;
        const airFactor = 0.004 + 0.00008 * Math.abs(angularVelocity);
        const damping = Math.max(0, 1 - airFactor * (dt * 60));
        angularVelocity *= damping;
    } else {
        angularVelocity = 0;
    }

    updateAudio();

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    shadowPlane.position.copy(spinnerGroup.position).addScaledVector(camDir, 0.45);
    shadowPlane.quaternion.copy(camera.quaternion);

    renderer.render(scene, camera);
}

requestAnimationFrame(animate);
