import bpy
import mathutils
import math

model_path = r"C:\OMG\3d-head\public\models\santa.glb"
output_path = r"C:\OMG\3d-head\public\models\santa_rigged.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model_path)

mesh_obj = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH'][0]
bpy.context.view_layer.objects.active = mesh_obj

print("1. ลด Poly (Decimate)...")
# ลดเหลือ ~5% (จาก 1,000,000 จุด เหลือประมาณ 50,000 จุด เพื่อความลื่นบน Playbox)
decimate = mesh_obj.modifiers.new(name="Decimate", type='DECIMATE')
decimate.ratio = 0.05
bpy.ops.object.modifier_apply(modifier="Decimate")

print(f"จำนวน Vertices ใหม่: {len(mesh_obj.data.vertices)}")

print("2. สร้าง Base Shape Key...")
mesh_obj.shape_key_add(name="Basis", from_mix=False)

# ฟังก์ชันช่วยคำนวณระยะทาง
def gaussian_weight(dist, radius):
    if dist > radius:
        return 0.0
    return math.exp(- (dist / (radius * 0.5)) ** 2)

# --- 2.1 ปากขยับ / อ้าปาก (jawOpen) ---
print("3. สร้าง Shape Key: jawOpen...")
key_mouth = mesh_obj.shape_key_add(name="jawOpen", from_mix=False)
mouth_center = mathutils.Vector((0.0, -0.22, 0.38)) # บริเวณปากล่าง/หนวด
mouth_radius = 0.16

for i, v in enumerate(mesh_obj.data.vertices):
    pos = v.co
    # สนใจเฉพาะส่วนล่างของปาก
    if pos.z < 0.44 and pos.y < 0:
        dist = (pos - mouth_center).length
        weight = gaussian_weight(dist, mouth_radius)
        if weight > 0:
            # ดึงกรามลงและถอยหลังเล็กน้อย
            delta = mathutils.Vector((0.0, 0.015 * weight, -0.06 * weight))
            key_mouth.data[i].co = pos + delta

# --- 2.2 ยกคิ้วทั้งสองข้าง (browsUp) ---
print("4. สร้าง Shape Key: browsUp...")
key_brows = mesh_obj.shape_key_add(name="browsUp", from_mix=False)
brow_left = mathutils.Vector((-0.12, -0.26, 0.58))
brow_right = mathutils.Vector((0.12, -0.26, 0.58))
brow_radius = 0.12

for i, v in enumerate(mesh_obj.data.vertices):
    pos = v.co
    if pos.z > 0.50 and pos.y < 0:
        dist_l = (pos - brow_left).length
        dist_r = (pos - brow_right).length
        weight = max(gaussian_weight(dist_l, brow_radius), gaussian_weight(dist_r, brow_radius))
        if weight > 0:
            delta = mathutils.Vector((0.0, -0.01 * weight, 0.04 * weight))
            key_brows.data[i].co = pos + delta

# --- 2.3 กะพริบตา (eyesBlink) ---
print("5. สร้าง Shape Key: eyesBlink...")
key_eyes = mesh_obj.shape_key_add(name="eyesBlink", from_mix=False)
eye_left = mathutils.Vector((-0.10, -0.23, 0.52))
eye_right = mathutils.Vector((0.10, -0.23, 0.52))
eye_radius = 0.09

for i, v in enumerate(mesh_obj.data.vertices):
    pos = v.co
    if 0.46 < pos.z < 0.58 and pos.y < 0:
        dist_l = (pos - eye_left).length
        dist_r = (pos - eye_right).length
        weight = max(gaussian_weight(dist_l, eye_radius), gaussian_weight(dist_r, eye_radius))
        if weight > 0:
            # ดึงเปลือกตาบนลงมาประกบเปลือกตาล่าง
            delta = mathutils.Vector((0.0, 0.005 * weight, -0.025 * weight))
            key_eyes.data[i].co = pos + delta

print("6. Export โมเดลใหม่เป็น GLB พร้อม Shape Keys...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_morph=True,
    export_materials='EXPORT',
    export_apply=False
)
print("สำเร็จ! บันทึกที่:", output_path)

