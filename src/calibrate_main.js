import Peer from 'peerjs';

const connection_badge = document.querySelector('#connection_badge');
const connect_box = document.querySelector('#connect_box');
const input_room_id = document.querySelector('#input_room_id');
const btn_connect = document.querySelector('#btn_connect');

const val_face_status = document.querySelector('#val_face_status');
const val_cam_x = document.querySelector('#val_cam_x');
const val_cam_y = document.querySelector('#val_cam_y');
const val_cam_size = document.querySelector('#val_cam_size');

const slider_yaw = document.querySelector('#slider_yaw');
const slider_pitch = document.querySelector('#slider_pitch');
const slider_roll = document.querySelector('#slider_roll');
const label_yaw = document.querySelector('#label_yaw');
const label_pitch = document.querySelector('#label_pitch');
const label_roll = document.querySelector('#label_roll');

const btn_reset_rot = document.querySelector('#btn_reset_rot');
const btn_save_point = document.querySelector('#btn_save_point');
const points_count = document.querySelector('#points_count');
const points_list = document.querySelector('#points_list');
const btn_clear_points = document.querySelector('#btn_clear_points');
const btn_export_json = document.querySelector('#btn_export_json');
const file_import_json = document.querySelector('#file_import_json');

let peer = null;
let conn = null;
let latest_cam_data = null;
let saved_points = [];

// ดึง room id จาก URL query param (?room=xxxx)
const url_params = new URLSearchParams(window.location.search);
const initial_room = url_params.get('room');

// เริ่ม PeerJS Client
peer = new Peer();

peer.on('open', (id) => {
  console.log('Mobile Peer ID:', id);
  if (initial_room) {
    input_room_id.value = initial_room;
    connectToScreen(initial_room);
  }
});

btn_connect.addEventListener('click', () => {
  const room = input_room_id.value.trim();
  if (room) connectToScreen(room);
});

function connectToScreen(roomId) {
  conn = peer.connect(roomId);

  conn.on('open', () => {
    connection_badge.textContent = 'Connected ✅';
    connection_badge.className = 'badge connected';
    connect_box.style.display = 'none';

    // ร้องขอ points ล่าสุดจากหน้าจอ
    conn.send({ type: 'REQ_POINTS' });
  });

  conn.on('data', (data) => {
    if (data.type === 'FACE_UPDATE') {
      latest_cam_data = data.payload;
      val_face_status.textContent = data.payload.hasFace ? 'ตรวจพบใบหน้า' : 'ไม่พบคน';
      val_face_status.style.color = data.payload.hasFace ? '#10b981' : '#ef4444';
      val_cam_x.textContent = data.payload.x.toFixed(3);
      val_cam_y.textContent = data.payload.y.toFixed(3);
      val_cam_size.textContent = data.payload.size.toFixed(3);
    } else if (data.type === 'SYNC_POINTS') {
      saved_points = data.payload;
      renderPointsList();
    }
  });

  conn.on('close', () => {
    connection_badge.textContent = 'Disconnected';
    connection_badge.className = 'badge disconnected';
    connect_box.style.display = 'block';
  });
}

function sendRotationUpdate() {
  const yaw = parseFloat(slider_yaw.value);
  const pitch = parseFloat(slider_pitch.value);
  const roll = parseFloat(slider_roll.value);

  label_yaw.textContent = yaw.toFixed(2);
  label_pitch.textContent = pitch.toFixed(2);
  label_roll.textContent = roll.toFixed(2);

  if (conn && conn.open) {
    conn.send({
      type: 'MANUAL_ROTATION',
      payload: { yaw, pitch, roll },
    });
  }
}

slider_yaw.addEventListener('input', sendRotationUpdate);
slider_pitch.addEventListener('input', sendRotationUpdate);
slider_roll.addEventListener('input', sendRotationUpdate);

btn_reset_rot.addEventListener('click', () => {
  slider_yaw.value = 0;
  slider_pitch.value = 0;
  slider_roll.value = 0;
  sendRotationUpdate();
});

btn_save_point.addEventListener('click', () => {
  if (!latest_cam_data || !latest_cam_data.hasFace) {
    alert('ไม่สามารถบันทึกได้: กล้องยังตรวจไม่พบใบหน้าคน');
    return;
  }

  const point = {
    id: Date.now(),
    cam: {
      x: latest_cam_data.x,
      y: latest_cam_data.y,
      size: latest_cam_data.size,
    },
    rot: {
      yaw: parseFloat(slider_yaw.value),
      pitch: parseFloat(slider_pitch.value),
      roll: parseFloat(slider_roll.value),
    },
    timestamp: new Date().toLocaleTimeString(),
  };

  saved_points.push(point);
  renderPointsList();

  if (conn && conn.open) {
    conn.send({ type: 'SAVE_POINT', payload: point });
  }
});

function renderPointsList() {
  points_count.textContent = saved_points.length;
  points_list.innerHTML = '';

  saved_points.forEach((p, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="point-info">
        <strong>จุดที่ ${index + 1} (${p.timestamp})</strong>
        <span>Cam: [${p.cam.x.toFixed(2)}, ${p.cam.y.toFixed(2)}] Size: ${p.cam.size.toFixed(2)}</span>
        <span>Rot: Yaw ${p.rot.yaw.toFixed(2)} | Pitch ${p.rot.pitch.toFixed(2)}</span>
      </div>
      <button class="btn-del-point" data-id="${p.id}">ลบ</button>
    `;
    points_list.appendChild(li);
  });

  document.querySelectorAll('.btn-del-point').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      saved_points = saved_points.filter((item) => item.id !== id);
      renderPointsList();
      if (conn && conn.open) {
        conn.send({ type: 'DELETE_POINT', payload: id });
      }
    });
  });
}

btn_clear_points.addEventListener('click', () => {
  if (confirm('คุณต้องการลบจุด Calibration ทั้งหมดใช่หรือไม่?')) {
    saved_points = [];
    renderPointsList();
    if (conn && conn.open) {
      conn.send({ type: 'CLEAR_POINTS' });
    }
  }
});

btn_export_json.addEventListener('click', () => {
  const json_str = JSON.stringify(saved_points, null, 2);
  const blob = new Blob([json_str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `santa_calibration_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

file_import_json.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data)) {
        saved_points = data;
        renderPointsList();
        if (conn && conn.open) {
          conn.send({ type: 'IMPORT_POINTS', payload: data });
        }
      }
    } catch (err) {
      alert('ไฟล์ JSON ไม่ถูกต้อง');
    }
  };
  reader.readAsText(file);
});

