# 3D Royal Chess Model Sources

The game loads local GLB models from this folder first and keeps procedural
WebGPU characters as a fallback if a model fails to load.

## Local GLB Sources

- `soldier.glb`: Three.js example Soldier model.
- `horse.glb`: Three.js example Horse model.
- `royal-robot.glb`: Three.js example RobotExpressive model, used as a royal armored figure.
- `damaged-helmet.glb`: Khronos glTF Sample Models Damaged Helmet, used as a fortress/rook artifact.
- `artifact.glb`: Khronos glTF Sample Models Avocado, used as a fantasy bishop artifact silhouette.

Source repositories:

- https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf
- https://github.com/KhronosGroup/glTF-Sample-Models

The mountain battlefield, board, effects, team markers, and procedural fallback
figures are generated in `game.js`.
