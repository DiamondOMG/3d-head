import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Peer from 'peerjs';

// Elements
const canvas = document.querySelector('#webgl_canvas');
const video = document.querySelector('#webcam_video');

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true, // โปร่งใสเพื่อโชว์ background ด้านหลัง
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

// Lights
const ambient_light = new THREE.AmbientLight(0xfff4e6, 1.8); // แสงอุ่นเข้ากับธีมคริสต์มาส
scene.add(ambient_light);

const dir_light = new THREE.DirectionalLight(0xffffff, 2.8);
dir_light.position.set(5, 10, 7);
scene.add(dir_light);

const fill_light = new THREE.DirectionalLight(0x8ec5fc, 1.2); // แสงสะท้อนโทนหิมะ
fill_light.position.set(-5, -5, -5);
scene.add(fill_light);

// 2. Load Santa Model
const gltf_loader = new GLTFLoader();
let santa_head = null;
const model_url = '/models/santa.glb';

gltf_loader.load(
  model_url,
  (gltf) => {
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= center.y;
    model.position.z -= center.z;

    santa_head = new THREE.Group();
    santa_head.add(model);
    scene.add(santa_head);

    const max_dim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let camera_z = Math.abs(max_dim / 2 / Math.tan(fov / 2)) * 1.5;

    camera.position.set(0, 0, camera_z);
    camera.lookAt(0, 0, 0);
  },
  undefined,
  (err) => console.error('Error loading model:', err)
);

// 3. Calibration Data & State
let calibration_points = JSON.parse(localStorage.getItem('santa_calib_points') || '[]');
let current_target_rot = { yaw: 0, pitch: 0, roll: 0 };
let current_actual_rot = { yaw: 0, pitch: 0, roll: 0 };
let manual_override = false;

function savePointsToLocal() {
  localStorage.setItem('santa_calib_points', JSON.stringify(calibration_points));
}

// 4. Background PeerJS Server (รอรับการเชื่อมต่อจากหน้าจูนเนอร์/มือถือแบบเงียบๆ)
const room_id = 'santa-main'; // รหัสคงที่เพื่อให้หน้า config เข้ามาเชื่อมต่อง่าย
const peer = new Peer(room_id);
let active_conn = null;

peer.on('open', (id) => {
  console.log('Background Peer Host ready:', id);
});

peer.on('connection', (conn) => {
  active_conn = conn;

  conn.on('data', (data) => {
    if (data.type === 'REQ_POINTS') {
      conn.send({ type: 'SYNC_POINTS', payload: calibration_points });
    } else if (data.type === 'MANUAL_ROTATION') {
      manual_override = true;
      current_target_rot = data.payload;
    } else if (data.type === 'SAVE_POINT') {
      calibration_points.push(data.payload);
      savePointsToLocal();
      manual_override = false;
    } else if (data.type === 'DELETE_POINT') {
      calibration_points = calibration_points.filter((p) => p.id !== data.payload);
      savePointsToLocal();
    } else if (data.type === 'CLEAR_POINTS') {
      calibration_points = [];
      savePointsToLocal();
      manual_override = false;
    } else if (data.type === 'IMPORT_POINTS') {
      calibration_points = data.payload;
      savePointsToLocal();
    }
  });

  conn.on('close', () => {
    active_conn = null;
    manual_override = false;
  });
});

// 5. MediaPipe Face Detection
function setupMediaPipe() {
  if (!window.FaceMesh || !window.Camera) return;

  const faceMesh = new window.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults((results) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const nose = landmarks[1];
      const left_eye = landmarks[33];
      const right_eye = landmarks[263];

      const face_size = Math.hypot(left_eye.x - right_eye.x, left_eye.y - right_eye.y);
      const cam_x = 1.0 - nose.x;
      const cam_y = nose.y;

      const face_data = {
        hasFace: true,
        x: cam_x,
        y: cam_y,
        size: face_size,
      };

      if (active_conn && active_conn.open) {
        active_conn.send({ type: 'FACE_UPDATE', payload: face_data });
      }

      if (!manual_override) {
        computeLookAt(face_data);
      }
    } else {
      const empty_data = { hasFace: false, x: 0.5, y: 0.5, size: 0 };
      if (active_conn && active_conn.open) {
        active_conn.send({ type: 'FACE_UPDATE', payload: empty_data });
      }

      if (!manual_override) {
        current_target_rot = { yaw: 0, pitch: 0, roll: 0 };
      }
    }
  });

  const cam_instance = new window.Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480,
  });

  cam_instance.start().catch((err) => {
    console.warn('Camera error or blocked:', err);
  });
}

window.addEventListener('load', setupMediaPipe);

// 6. LookAt Computation
function computeLookAt(cam) {
  if (calibration_points.length === 0) {
    const yaw = (cam.x - 0.5) * 1.5;
    const pitch = (cam.y - 0.5) * 1.0;
    current_target_rot = { yaw, pitch, roll: 0 };
    return;
  }

  if (calibration_points.length === 1) {
    const p = calibration_points[0];
    const diff_x = cam.x - p.cam.x;
    const diff_y = cam.y - p.cam.y;
    current_target_rot = {
      yaw: p.rot.yaw + diff_x * 1.5,
      pitch: p.rot.pitch + diff_y * 1.0,
      roll: p.rot.roll,
    };
    return;
  }

  let total_weight = 0;
  let target_yaw = 0;
  let target_pitch = 0;
  let target_roll = 0;

  for (const pt of calibration_points) {
    const dist = Math.hypot(cam.x - pt.cam.x, cam.y - pt.cam.y) + 0.0001;
    const weight = 1.0 / Math.pow(dist, 2);

    target_yaw += pt.rot.yaw * weight;
    target_pitch += pt.rot.pitch * weight;
    target_roll += pt.rot.roll * weight;
    total_weight += weight;
  }

  current_target_rot = {
    yaw: target_yaw / total_weight,
    pitch: target_pitch / total_weight,
    roll: target_roll / total_weight,
  };
}

// 7. Render Loop
function animate() {
  requestAnimationFrame(animate);

  if (santa_head) {
    const smooth = 0.08;
    current_actual_rot.yaw += (current_target_rot.yaw - current_actual_rot.yaw) * smooth;
    current_actual_rot.pitch += (current_target_rot.pitch - current_actual_rot.pitch) * smooth;
    current_actual_rot.roll += (current_target_rot.roll - current_actual_rot.roll) * smooth;

    santa_head.rotation.y = current_actual_rot.yaw;
    santa_head.rotation.x = current_actual_rot.pitch;
    santa_head.rotation.z = current_actual_rot.roll;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
