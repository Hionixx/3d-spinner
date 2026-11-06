const container = document.getElementById('canvas-container');
const colorPicker = document.getElementById('color-picker');

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

const shadowPlaneGeo = new THREE.PlaneGeometry(50, 50);
const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.15 });
const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.position.z = -2.5;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const spinnerGroup = new THREE.Group();
scene.add(spinnerGroup);

const rotor = new THREE.Group();
spinnerGroup.add(rotor);

const capGroup = new THREE.Group();
spinnerGroup.add(capGroup);

const R = 3.2;
const r_o = 1.6;
const r_w = 1.35;
const delta = r_o - r_w;
const D_f = (R * R - delta * delta) / (R + 2 * delta);
const r_f = D_f - r_w;

const shapePoints = [];
const N = 40;

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

const extrudeSettings = {
    steps: 1,
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 5,
    curveSegments: 36
};

const bodyGeometry = new THREE.ExtrudeGeometry(spinnerShape, extrudeSettings);
bodyGeometry.center();

const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2196f3,
    roughness: 0.25,
    metalness: 0.12,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15
});

const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
bodyMesh.castShadow = true;
bodyMesh.receiveShadow = true;
rotor.add(bodyMesh);

const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xdcdcdc,
    metalness: 0.95,
    roughness: 0.15
});

const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.05
});

const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.25
});

const darkRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.7,
    roughness: 0.5
});

function createWeightAssembly() {
    const weightGroup = new THREE.Group();

    const outerRingGeo = new THREE.CylinderGeometry(1.09, 1.09, 0.54, 36, 1, true);
    const outerRing = new THREE.Mesh(outerRingGeo, metalMaterial);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.castShadow = true;
    weightGroup.add(outerRing);

    const brassRingGeo = new THREE.CylinderGeometry(0.96, 0.96, 0.5, 36, 1, true);
    const brassRing = new THREE.Mesh(brassRingGeo, brassMaterial);
    brassRing.rotation.x = Math.PI / 2;
    weightGroup.add(brassRing);

    const innerCoreGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.5, 36);
    const innerCore = new THREE.Mesh(innerCoreGeo, darkRingMaterial);
    innerCore.rotation.x = Math.PI / 2;
    innerCore.castShadow = true;
    weightGroup.add(innerCore);

    const centerPinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.52, 32);
    const centerPin = new THREE.Mesh(centerPinGeo, metalMaterial);
    centerPin.rotation.x = Math.PI / 2;
    centerPin.castShadow = true;
    weightGroup.add(centerPin);

    const ballCount = 6;
    const ballRadius = 0.1;
    const ringRadius = 0.84;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 16, 16);

    for (let j = 0; j < ballCount; j++) {
        const ballAngle = (j * 2 * Math.PI) / ballCount;
        const ball = new THREE.Mesh(ballGeo, ballMaterial);
        ball.position.set(ringRadius * Math.cos(ballAngle), ringRadius * Math.sin(ballAngle), 0);
        ball.castShadow = true;
        weightGroup.add(ball);
    }

    return weightGroup;
}

for (let i = 0; i < 3; i++) {
    const theta_c = (i * 2 * Math.PI) / 3;
    const Cx = R * Math.cos(theta_c);
    const Cy = R * Math.sin(theta_c);
    const weight = createWeightAssembly();
    weight.position.set(Cx, Cy, 0);
    rotor.add(weight);
}

const centerBearingGroup = new THREE.Group();

const centerOuterRingGeo = new THREE.CylinderGeometry(1.09, 1.09, 0.52, 36, 1, true);
const centerOuterRing = new THREE.Mesh(centerOuterRingGeo, metalMaterial);
centerOuterRing.rotation.x = Math.PI / 2;
centerBearingGroup.add(centerOuterRing);

const centerBallCount = 8;
const centerBallRadius = 0.11;
const centerOrbitRadius = 0.82;
const centerBallGeo = new THREE.SphereGeometry(centerBallRadius, 16, 16);

for (let j = 0; j < centerBallCount; j++) {
    const ballAngle = (j * 2 * Math.PI) / centerBallCount;
    const ball = new THREE.Mesh(centerBallGeo, ballMaterial);
    ball.position.set(centerOrbitRadius * Math.cos(ballAngle), centerOrbitRadius * Math.sin(ballAngle), 0);
    centerBearingGroup.add(ball);
}

rotor.add(centerBearingGroup);

const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f1f1f,
    roughness: 0.35,
    metalness: 0.6
});

function createCap(zPos, flip) {
    const cap = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(0.88, 0.92, 0.16, 40);
    const base = new THREE.Mesh(baseGeo, capMaterial);
    base.rotation.x = Math.PI / 2;
    base.castShadow = true;
    cap.add(base);

    const rimGeo = new THREE.TorusGeometry(0.72, 0.05, 16, 40);
    const rim = new THREE.Mesh(rimGeo, metalMaterial);
    rim.position.z = flip ? -0.08 : 0.08;
    cap.add(rim);

    const padGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.08, 40);
    const pad = new THREE.Mesh(padGeo, capMaterial);
    pad.rotation.x = Math.PI / 2;
    pad.position.z = flip ? -0.06 : 0.06;
    cap.add(pad);

    cap.position.z = zPos;
    return cap;
}

const topCap = createCap(0.32, false);
const bottomCap = createCap(-0.32, true);
capGroup.add(topCap);
capGroup.add(bottomCap);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isDraggingSpinner = false;
let previousPointerAngle = 0;
let previousPointerTime = 0;
let angularVelocity = 0;
let velocityHistory = [];

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

window.addEventListener('pointerdown', (e) => {
    if (e.target === colorPicker) return;

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
    controls.enabled = true;

    if (velocityHistory.length > 0) {
        const sum = velocityHistory.reduce((acc, v) => acc + v, 0);
        angularVelocity = sum / velocityHistory.length;
        const maxVelocity = 90;
        angularVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, angularVelocity));
    }
}

window.addEventListener('pointerup', endSpinnerDrag);
window.addEventListener('pointercancel', endSpinnerDrag);

window.addEventListener('dblclick', (e) => {
    if (e.target === colorPicker) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(rotor.children, true);
    if (hits.length > 0) {
        const boost = (Math.random() > 0.5 ? 1 : -1) * (35 + Math.random() * 25);
        angularVelocity += boost;
    }
});

colorPicker.addEventListener('input', (e) => {
    bodyMaterial.color.setStyle(e.target.value);
});

const colorPresets = [
    '#2196f3',
    '#e91e63',
    '#4caf50',
    '#ff9800',
    '#9c27b0',
    '#00bcd4',
    '#212121',
    '#ffffff'
];

window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key >= '1' && key <= '8') {
        const idx = parseInt(key, 10) - 1;
        const col = colorPresets[idx];
        colorPicker.value = col;
        bodyMaterial.color.setStyle(col);
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
