import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { BoardBuilder } from './BoardBuilder';
import { ResourceManager } from './ResourceManager';
import { PrimitivesBuilder } from './PrimitivesBuilder';
import { InputController } from './InputController';

export class SceneManager {
    constructor(canvas, onSelectionChange) {
        this.canvas = canvas;
        this.onSelectionChange = onSelectionChange;

        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.width / this.height,
            0.1,
            1000
        );
        this.camera.position.set(0, 50, 50);
        this.camera.lookAt(0, 0, 0);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 80, 50);
        this.scene.add(dirLight);

        // Managers
        this.resourceManager = new ResourceManager();
        this.boardBuilder = new BoardBuilder(this.scene);
        this.primitivesBuilder = new PrimitivesBuilder(this.scene, this.resourceManager);

        // Controls
        this.transformControls = new TransformControls(this.camera, this.canvas);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            // Optional: Disable other controls if we had them
        });
        this.transformControls.showY = false; // XZ plane only

        try {
            this.scene.add(this.transformControls);
        } catch (e) {
            console.warn("TransformControls add FAILED:", e);
            // Fallback for duplicates or API differences
            if (this.transformControls.isObject3D) {
                console.log("Forcing push to children (Duplicate Three.js instance detected)");
                this.scene.children.push(this.transformControls);
                this.transformControls.parent = this.scene;
            } else if (this.transformControls._gizmo) {
                console.log("Adding _gizmo instead (Non-Object3D Controls detected)");
                this.scene.add(this.transformControls._gizmo);
            }
        }

        // Input
        this.inputController = new InputController(this.canvas, this.camera, this.scene, (data) => {
            this.handleSelection(data);
            if (this.onSelectionChange) this.onSelectionChange(data);
        });

        // Loop
        this.isRunning = true;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Initial Setup
        this.load100SampleData();

        // Helpers
        const gridHelper = new THREE.GridHelper(200, 200, 0x888888, 0x444444);
        gridHelper.position.y = -2;
        this.scene.add(gridHelper);

        window.addEventListener('resize', this.onResize.bind(this));
    }

    load100SampleData() {
        // Create the board
        this.boardBuilder.createBoard(100, 80, 1.6, 0x2e8b57);

        // Generate 100 pads in a 10x10 grid with offset positions
        const pads = [];
        const gridSize = 10; // 10x10 = 100 pads
        const spacingX = 8; // Spacing between pads in X direction
        const spacingZ = 6; // Spacing between pads in Z direction
        const startX = -36; // Starting X position (centered on board)
        const startZ = -27; // Starting Z position (centered on board)

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const index = row * gridSize + col;
                const x = startX + col * spacingX;
                const z = startZ + row * spacingZ;

                pads.push({
                    id: `pad-${index}`,
                    pos: [x, 0.05, z],
                    size: [2, 2] // 2x2 pad size
                });
            }
        }

        // Create all pads at once
        this.primitivesBuilder.createPads(pads);

        // Generate a trace that connects all pads in a snake pattern
        const tracePoints = [];
        for (let row = 0; row < gridSize; row++) {
            if (row % 2 === 0) {
                // Even rows: left to right
                for (let col = 0; col < gridSize; col++) {
                    const x = startX + col * spacingX;
                    const z = startZ + row * spacingZ;
                    tracePoints.push([x, z]);
                }
            } else {
                // Odd rows: right to left (snake pattern)
                for (let col = gridSize - 1; col >= 0; col--) {
                    const x = startX + col * spacingX;
                    const z = startZ + row * spacingZ;
                    tracePoints.push([x, z]);
                }
            }
        }

        // Create the continuous trace connecting all pads
        this.primitivesBuilder.createTraces([
            { id: 'trace-all', points: tracePoints, width: 0.25, numericId: 1 }
        ]);
    }


    loadSampleData() {
        this.boardBuilder.createBoard(100, 80, 1.6, 0x2e8b57);
        this.primitivesBuilder.createPads([
            { id: 'pad-1', pos: [10, 0.05, 10], size: [10, 10] },
            { id: 'pad-2', pos: [-10, 0.05, -10], size: [3, 3] },
            { id: 'pad-3', pos: [20, 0.05, -5], size: [4, 6] },
        ]);
        this.primitivesBuilder.createTraces([
            { id: 'trace-1', points: [[10, 10], [-10, -10]], width: 10, numericId: 1 },
            { id: 'trace-2', points: [[11, 11], [-11, -11]], width: 10, numericId: 2 },
        ]);
    }
    handleSelection(data) {
        this.transformControls.detach();
        this.selectedInstance = null;

        if (!data) {
            if (this.dummy) this.scene.remove(this.dummy);
            return;
        }

        if (data.id && data.type !== 'path') { // Pad
            // Find index in pads data
            const index = this.primitivesBuilder.padsMesh.userData.data.findIndex(p => p.id === data.id);
            if (index !== -1) {
                this.attachGizmoToInstance(this.primitivesBuilder.padsMesh, index);
            }
        } else if (data.type === 'path') { // Trace
            const trace = this.primitivesBuilder.tracesGroup.children.find(c => c.userData.id === data.id);
            if (trace) {
                this.transformControls.attach(trace);
            }
        }
    }

    attachGizmoToInstance(mesh, index) {
        if (!this.dummy) this.dummy = new THREE.Object3D();
        this.scene.add(this.dummy);

        mesh.getMatrixAt(index, this.dummy.matrix);
        this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

        this.transformControls.attach(this.dummy);
        this.selectedInstance = { mesh, index };
    }

    animate() {
        if (!this.isRunning) return;

        // Sync Gizmo -> Instance
        if (this.selectedInstance && this.transformControls.object === this.dummy) {
            // Update Dummy matrix from controls (happens automatically if attached)
            // We need to write Dummy transform to Instance Matrix
            this.dummy.updateMatrix();
            this.selectedInstance.mesh.setMatrixAt(this.selectedInstance.index, this.dummy.matrix);
            this.selectedInstance.mesh.instanceMatrix.needsUpdate = true;

            // Update source data (simple position sync)
            const p = this.dummy.position;
            // Ideally updates userData.data too, but keeping it simple
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.animate);
    }

    exportJSON() {
        // Collect data
        // For robustness, this should read from current scene state, 
        // but since we update instance matrices, userData.data might be stale unless updated.
        // For this demo, we return the initial/tracked data.
        const pads = [];
        if (this.primitivesBuilder.padsMesh && this.primitivesBuilder.padsMesh.userData.data) {
            pads.push(...this.primitivesBuilder.padsMesh.userData.data);
        }

        const traces = [];
        this.primitivesBuilder.tracesGroup.children.forEach(child => {
            if (child.userData.isTrace) {
                console.log(child.userData);
                traces.push({
                    id: child.userData.id,
                    type: 'path',
                    points: child.userData.data.points,
                    width: child.userData.data.width,
                    numericId: child.userData.data.numericId
                });
            }
        });

        return {
            board: { width: 100, height: 80, thickness: 1.6 },
            components: [...pads, ...traces]
        };
    }

    loadJSON(data) {
        if (!data) return;
        //console.log("Loading JSON:", data.board);
        if (data.board) {
            this.boardBuilder.createBoard(data.board.width, data.board.height, data.board.thickness || 1.6, 0x2e8b57);
        }

        const pads = [];
        const traces = [];
        if (data.components) {
            data.components.forEach(c => {
                if (c.type === 'pad' || c.pos || c.size) pads.push(c);
                if (c.type === 'trace' || c.points) traces.push(c);
            });
        }

        this.primitivesBuilder.createPads(pads);
        this.primitivesBuilder.createTraces(traces);
    }

    onResize() {
        if (!this.canvas) return;
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    dispose() {
        this.isRunning = false;
        window.removeEventListener('resize', this.onResize);
        if (this.transformControls) {
            this.transformControls.detach();
            this.transformControls.dispose();
        }
        if (this.inputController) this.inputController.dispose();

        this.scene.traverse((object) => {
            if (!object.isMesh) return;
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                else object.material.dispose();
            }
        });

        if (this.resourceManager) this.resourceManager.disposeAll();
        this.renderer.dispose();
    }
}
