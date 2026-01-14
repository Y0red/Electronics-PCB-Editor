import * as THREE from 'three';

export class InputController {
    constructor(canvas, camera, scene, onSelectionChange) {
        this.canvas = canvas;
        this.camera = camera;
        this.scene = scene;
        this.onSelectionChange = onSelectionChange || (() => { });

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.hoveredId = -1;
        this.selectedId = -1;

        // Bindings
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);

        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mousedown', this.onMouseDown);
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
        const interactables = this.getInteractables();
        const intersects = this.raycaster.intersectObjects(interactables, false);

        let newHoveredId = -1;
        if (intersects.length > 0) {
            const hit = intersects[0];
            const obj = hit.object;

            if (obj.isInstancedMesh) {
                // For InstancedMesh, instanceId is the index
                // In PrimitivesBuilder, we set aInstanceId attribute = index.
                newHoveredId = hit.instanceId;
            } else if (obj.userData.isTrace) {
                // For Traces, read the attribute we manually set
                if (obj.geometry.attributes.aInstanceId) {
                    newHoveredId = obj.geometry.attributes.aInstanceId.getX(0);
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
        // If we are hovering something, select it
        if (this.hoveredId !== -1) {
            this.selectedId = this.hoveredId;

            // Find object data to pass back
            let selectedData = null;
            // We need to look it up.
            // This is slightly inefficient but fine for click.
            this.scene.traverse(obj => {
                if (obj.userData.data) { // Pads
                    if (this.selectedId < obj.count) {
                        selectedData = obj.userData.data[this.selectedId];
                    }
                }
                if (obj.userData.isTrace && obj.geometry.attributes.aInstanceId) {
                    if (obj.geometry.attributes.aInstanceId.getX(0) === this.selectedId) {
                        selectedData = { type: 'trace', id: obj.userData.id };
                    }
                }
            });

            this.onSelectionChange(selectedData);
        } else {
            // Deselect if clicking empty space?
            // Should check if we clicked NOTHING.
            this.updateRaycaster(e);
            const interactables = this.getInteractables();
            const intersects = this.raycaster.intersectObjects(interactables, false);
            if (intersects.length === 0) {
                this.selectedId = -1;
                this.onSelectionChange(null);
            }
        }
        this.updateMaterials();
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
    }
}
