# PCB Editor and Viewer built with React and vanila Three.js

T# 3D PCB Viewer & Editor Walkthrough

I have built a high-performance 3D PCB Editor (Demo) using React and Vanilla Three.js (no R3F).

## Architecture
- **Engine**: A `SceneManager` class encapsulates the Three.js logic (Renderer, Loop, Scene).
- **React Bridge**: `CanvasContainer` instantiates `SceneManager` and manages its lifecycle using `useRef` and `useEffect`.
- **Managers**:
  - `BoardBuilder`: Creates the parametric FR4 substrate.
  - `PrimitivesBuilder`: Manages `InstancedMesh` for Pads and Geometry for Traces.
  - `ResourceManager`: Handles `ShaderMaterial` creation and disposal.
  - `InputController`: Manages Raycasting, Hover, and Selection.

## Performance Strategy
- **Instancing**: pads are rendered using `THREE.InstancedMesh`, allowing thousands of pads with a single draw call.
- **Buffers**: Trace geometry uses shared materials.
- **Disposal**: Strict `dispose()` methods on all managers ensure memory is freed when the component unmounts.

## Visuals & Shaders
- **Custom Shaders**: `copper.vert` and `copper.frag` implement a brushed copper look.
- **Interaction**:
  - **Hover**: The shader receives a `uHoveredId` uniform. Pad logic uses an attribute `aInstanceId` to check against the uniform in GLSL.
  - **Selection**: Similar logic with `uSelectedId` + `TransformControls` for movement.
- **Z-Fighting**: Handled via `polygonOffset` in the material and physical Y-layering (Board center offset).

## Persistence
- **JSON Schema**: The app supports exporting and loading a simple JSON format defining `board` and `components`.
- **Integration**: The `Sidebar` component allows exporting the current state (to console) and pasting JSON to dry-load a layout.

## Verification
- **Functional**: Pads and Traces render on the board.
- **Interactive**: Hovering highlights components. Clicking selects them and enables `TransformControls` (XZ plane).
- **Code Quality**: Modular architecture separating Engine, Logic, and UI.

## Contributer Y0red
