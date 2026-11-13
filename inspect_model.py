import bpy
import os

model_path = r"C:\OMG\3d-head\public\models\santa.glb"

# ล้าง Scene เก่า
bpy.ops.wm.read_factory_settings(use_empty=True)

# นำเข้าโมเดล
bpy.ops.import_scene.gltf(filepath=model_path)

print("=== วัตถุในโมเดล ===")
for obj in bpy.context.scene.objects:
    print(f"Name: {obj.name}, Type: {obj.type}")
    if obj.type == 'MESH':
        print(f" - Vertices: {len(obj.data.vertices)}")
        print(f" - Materials: {[m.name for m in obj.data.materials if m]}")
        if obj.data.shape_keys:
            print(f" - Shape Keys: {[k.name for k in obj.data.shape_keys.key_blocks]}")
        else:
            print(" - Shape Keys: ไม่มี")

