import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class InputController {
    constructor(canvas, camera, scene, onSelectionChange, transformControls) {
        this.canvas = canvas;
        this.camera = camera;
        this.scene = scene;
        this.onSelectionChange = onSelectionChange || (() => { });
        this.transformControls = transformControls; // Reference to check if clicking on gizmo

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.hoveredId = -1;
        this.selectedId = -1;

        // Dragging state
        this.isDragging = false;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane at Y=0
        this.dragOffset = new THREE.Vector3();
        this.dragIntersection = new THREE.Vector3();
        this.selectedObject = null; // The actual object being dragged
        this.selectedInstanceIndex = -1; // For instanced meshes

        // Orbit Controls - for camera rotation and zoom
        this.orbitControls = new OrbitControls(camera, canvas);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.enablePan = false; // Disable panning, we handle object movement
        this.orbitControls.enableZoom = true;
        this.orbitControls.zoomSpeed = 1.2;
        this.orbitControls.rotateSpeed = 0.8;
        this.orbitControls.minDistance = 10;
        this.orbitControls.maxDistance = 200;
        this.orbitControls.maxPolarAngle = Math.PI / 2; // Don't go below the ground
        // Only rotate with right mouse button
        this.orbitControls.mouseButtons = {
            LEFT: null, // We handle left click for selection/dragging
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };

        // Bindings
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);

        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
        this.canvas.addEventListener('wheel', this.onWheel);
        this.canvas.addEventListener('contextmenu', this.onContextMenu);
    }

    onContextMenu(e) {
        // Prevent default context menu when right-clicking
        e.preventDefault();
    }

    getInteractables() {
        const interactables = [];
        this.scene.traverse(obj => {
            if (obj.userData.isPad || obj.userData.isTrace) {
                interactables.push(obj);
            }
        });
        return interactables;
    }

    updateRaycaster(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    onMouseMove(e) {
        this.updateRaycaster(e);

        // Handle dragging
        if (this.isDragging && this.selectedObject) {
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
                const newPosition = this.dragIntersection.sub(this.dragOffset);

                if (this.selectedObject.isInstancedMesh && this.selectedInstanceIndex !== -1) {
                    // Update instanced mesh position
                    const matrix = new THREE.Matrix4();
                    this.selectedObject.getMatrixAt(this.selectedInstanceIndex, matrix);

                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();
                    matrix.decompose(position, quaternion, scale);

                    position.x = newPosition.x;
                    position.z = newPosition.z;

                    matrix.compose(position, quaternion, scale);
                    this.selectedObject.setMatrixAt(this.selectedInstanceIndex, matrix);
                    this.selectedObject.instanceMatrix.needsUpdate = true;

                    // Update the data array as well
                    if (this.selectedObject.userData.data && this.selectedObject.userData.data[this.selectedInstanceIndex]) {
                        this.selectedObject.userData.data[this.selectedInstanceIndex].pos[0] = position.x;
                        this.selectedObject.userData.data[this.selectedInstanceIndex].pos[2] = position.z;
                    }
                } else if (this.selectedObject.isGroup) {
                    // For trace groups, move the entire group
                    this.selectedObject.position.x = newPosition.x;
                    this.selectedObject.position.z = newPosition.z;
                }
            }
            return; // Skip hover detection while dragging
        }

        // Hover detection
        const interactables = this.getInteractables();
        const intersects = this.raycaster.intersectObjects(interactables, true);

        let newHoveredId = -1;
        if (intersects.length > 0) {
            const hit = intersects[0];
            const obj = hit.object;

            if (obj.isInstancedMesh) {
                // For InstancedMesh, instanceId is the index
                // In PrimitivesBuilder, we set aInstanceId attribute = index.
                newHoveredId = hit.instanceId;
            } else {
                // For Traces, the hit object may be a segment mesh inside a group
                // We need to find the parent group that has isTrace userData
                let traceGroup = obj;
                while (traceGroup && !traceGroup.userData.isTrace) {
                    traceGroup = traceGroup.parent;
                }
                if (traceGroup && traceGroup.userData.isTrace) {
                    // Read the aInstanceId from the hit segment's geometry
                    if (obj.geometry && obj.geometry.attributes.aInstanceId) {
                        newHoveredId = obj.geometry.attributes.aInstanceId.getX(0);
                    }
                }
            }
        }

        if (newHoveredId !== this.hoveredId) {
            this.hoveredId = newHoveredId;
            this.updateMaterials();
            this.canvas.style.cursor = newHoveredId !== -1 ? 'pointer' : 'default';
        }
    }

    onMouseDown(e) {
        // Only handle left click for selection/dragging
        if (e.button !== 0) return;

        // Check gizmo interaction first
        if (this.transformControls && this.transformControls.axis) {
            return;
        }

        this.updateRaycaster(e);

        // If we are hovering something, select it and start dragging
        if (this.hoveredId !== -1) {
            console.log("InputController: Selected ID", this.hoveredId);
            this.selectedId = this.hoveredId;

            // Find object data to pass back and store reference for dragging
            let selectedData = null;
            this.selectedObject = null;
            this.selectedInstanceIndex = -1;

            const interactables = this.getInteractables();
            const intersects = this.raycaster.intersectObjects(interactables, true);

            if (intersects.length > 0) {
                const hit = intersects[0];
                const obj = hit.object;

                // Calculate drag offset
                if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
                    if (obj.isInstancedMesh) {
                        // For instanced meshes (pads), don't enable manual dragging
                        // The TransformControls gizmo in SceneManager handles pad movement
                        this.selectedObject = null;
                        this.selectedInstanceIndex = hit.instanceId;
                        selectedData = obj.userData.data ? obj.userData.data[hit.instanceId] : null;
                        // Don't set isDragging for pads - TransformControls handles it
                    } else {
                        // Find trace group
                        let traceGroup = obj;
                        while (traceGroup && !traceGroup.userData.isTrace) {
                            traceGroup = traceGroup.parent;
                        }
                        if (traceGroup && traceGroup.userData.isTrace) {
                            this.selectedObject = traceGroup;
                            this.dragOffset.copy(this.dragIntersection).sub(traceGroup.position);
                            selectedData = { type: 'path', id: traceGroup.userData.id };
                            // Only enable manual dragging for traces
                            this.isDragging = true;
                            this.orbitControls.enabled = false; // Disable orbit controls while dragging
                        }
                    }
                }
            }

            console.log("InputController: Sending Selection Data:", selectedData);
            this.onSelectionChange(selectedData);
        } else {
            // Deselect if clicking empty space
            const interactables = this.getInteractables();
            const intersects = this.raycaster.intersectObjects(interactables, true);
            if (intersects.length === 0) {
                this.selectedId = -1;
                this.selectedObject = null;
                this.selectedInstanceIndex = -1;
                this.onSelectionChange(null);
            }
        }
        this.updateMaterials();
    }

    onMouseUp(e) {
        if (e.button === 0) {
            this.isDragging = false;
            this.orbitControls.enabled = true; // Re-enable orbit controls
        }
    }

    onWheel(e) {
        // OrbitControls handles this, but we can add custom behavior if needed
    }

    update() {
        // Call this in the animation loop to update orbit controls damping
        if (this.orbitControls) {
            this.orbitControls.update();
        }
    }

    updateMaterials() {
        this.scene.traverse(obj => {
            if (obj.material && obj.material.uniforms) {
                if (obj.material.uniforms.uHoveredId) obj.material.uniforms.uHoveredId.value = this.hoveredId;
                if (obj.material.uniforms.uSelectedId) obj.material.uniforms.uSelectedId.value = this.selectedId;
            }
        });
    }

    dispose() {
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('contextmenu', this.onContextMenu);

        if (this.orbitControls) {
            this.orbitControls.dispose();
        }
    }
}
