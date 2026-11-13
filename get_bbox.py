import bpy
import mathutils

model_path = r"C:\OMG\3d-head\public\models\santa.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model_path)

mesh_obj = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH'][0]

# หา bounding box min, max
bbox = [mesh_obj.matrix_world @ mathutils.Vector(corner) for corner in mesh_obj.bound_box]
min_x = min(v.x for v in bbox)
max_x = max(v.x for v in bbox)
min_y = min(v.y for v in bbox)
max_y = max(v.y for v in bbox)
min_z = min(v.z for v in bbox)
max_z = max(v.z for v in bbox)

print(f"BBOX: X({min_x:.3f}, {max_x:.3f}), Y({min_y:.3f}, {max_y:.3f}), Z({min_z:.3f}, {max_z:.3f})")

