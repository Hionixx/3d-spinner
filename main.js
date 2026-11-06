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

const shadowPlaneGeo = new THREE.PlaneGeometry(50, 50);
const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.14 });
const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.position.z = -2.5;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const spinnerGroup = new THREE.Group();
scene.add(spinnerGroup);

let rotor = new THREE.Group();
spinnerGroup.add(rotor);

const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2196f3,
    roughness: 0.22,
    metalness: 0.1,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12
});

const weightsMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8d8d8,
    metalness: 0.95,
    roughness: 0.18
});

const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.6,
    roughness: 0.4
});

const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('./spinner.glb', (gltf) => {
    while (rotor.children.length > 0) {
        rotor.remove(rotor.children[0]);
    }
    while (spinnerGroup.children.length > 0) {
        spinnerGroup.remove(spinnerGroup.children[0]);
    }

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
});

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
