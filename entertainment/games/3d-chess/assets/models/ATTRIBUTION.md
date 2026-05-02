# 3D Royal Chess Model Sources

The game attempts to load free/Creative Commons GLB files from Filer's public CDN. It uses both chess and non-chess assets: medieval soldiers, horses, castles, books, and character figures are customized into chess roles by procedural WebGPU crowns, staffs, banners, shields, gems, and team materials.

- Source listing: https://filer.dev/en/3d-model/chess-set.glb
- Medieval soldier: https://www.filer.dev/en/3d-model/medieval-soldier.glb
- Horse source listing: https://www.filer.dev/en/3d-model/chess-horse.glb
- Fantasy castle: https://www.filer.dev/en/3d-model/fantasy-tree-house-medieval-castle.glb
- Book: https://filer.dev/en/3d-model/book.glb
- Character model: https://www.filer.dev/en/3d-model/female-model.glb
- Direct model CDN host used by that listing: `https://crudblobs.blob.core.windows.net/models/`

The site labels these downloadable files as Creative Commons Attribution/free 3D models. If a model cannot be fetched by the browser, the game automatically falls back to the built-in procedural WebGPU character pieces.

Remote models referenced by `manifest.json`:

- `medieval-soldier.glb`
- `fantasy-tree-house-medieval-castle.glb`
- `chariot-horse.glb`
- `book.glb`
- `female-model.glb`
