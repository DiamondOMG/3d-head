import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Canvas
const canvas = document.querySelector('#webgl_canvas');

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 3);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Controls (หมุนหัวได้)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Lights
const ambient_light = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient_light);

const dir_light = new THREE.DirectionalLight(0xffffff, 2);
dir_light.position.set(2, 4, 3);
scene.add(dir_light);

// Loader: โหลดโมเดล (รอไฟล์โมเดลมาแทนที่)
const gltf_loader = new GLTFLoader();
let santa_model = null;

// ระบุ path โมเดลไว้ใน public/models/
const model_url = '/models/santa.glb';

gltf_loader.load(
  model_url,
  (gltf) => {
    santa_model = gltf.scene;
    scene.add(santa_model);
  },
  undefined,
  (error) => {
    console.log('ยังไม่พบไฟล์โมเดลที่ /models/santa.glb แสดงกล่องทดสอบชั่วคราว');
    createPlaceholder();
  }
);

// กล่อง Placeholder ระหว่างรอโมเดล
let placeholder_mesh = null;
function createPlaceholder() {
  const geometry = new THREE.SphereGeometry(0.7, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0xe74c3c,
    roughness: 0.3,
  });
  placeholder_mesh = new THREE.Mesh(geometry, material);
  scene.add(placeholder_mesh);
}

// Resize Listener
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
