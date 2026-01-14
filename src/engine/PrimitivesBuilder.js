import * as THREE from 'three';

export class PrimitivesBuilder {
    constructor(scene, resourceManager) {
        this.scene = scene;
        this.resourceManager = resourceManager;
        this.padsMesh = null;
        this.tracesGroup = new THREE.Group();
        this.scene.add(this.tracesGroup);
        // Use a dummy object for matrix calculations
        this.dummy = new THREE.Object3D();
    }

    createPads(padsData) {
        // Clean up old
        if (this.padsMesh) {
            this.scene.remove(this.padsMesh);
            this.padsMesh.dispose(); // InstancedMesh dispose method? No, strictly geometry/material.
            // But we should check if we own the geometry/material to dispose.
            // Here, materials are managed by ResourceManager, Geometry shared.
        }

        if (padsData.length === 0) return;

        const geometry = this.resourceManager.getGeometry('padRaw', () =>
            new THREE.BoxGeometry(1, 1, 1) // Base size 1, scale per instance
        );

        const material = this.resourceManager.getMaterial('copper', () =>
            this.resourceManager.createCopperMaterial()
        );

        this.padsMesh = new THREE.InstancedMesh(geometry, material, padsData.length);
        this.padsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Attributes for IDs
        const ids = new Float32Array(padsData.length);

        padsData.forEach((pad, i) => {
            const { pos, size, id } = pad;
            this.dummy.position.set(pos[0], pos[1], pos[2]);
            this.dummy.scale.set(size[0], 0.1, size[1]); // Thin Y scale
            this.dummy.updateMatrix();

            this.padsMesh.setMatrixAt(i, this.dummy.matrix);

            // Map string IDs to float index for shader? 
            // Or just use index as ID and keep map in InputController?
            // Requirement: "uHovered and uSelected state". 
            // Best to use integer ID (index) in shader and map back to object in JS.
            ids[i] = i;
        });

        this.padsMesh.geometry.setAttribute('aInstanceId', new THREE.InstancedBufferAttribute(ids, 1));

        this.padsMesh.instanceMatrix.needsUpdate = true;
        this.padsMesh.userData = { isPad: true, type: 'pad', data: padsData };

        this.scene.add(this.padsMesh);
        return this.padsMesh;
    }

    createTraces(tracesData) {
        // Clear old traces
        while (this.tracesGroup.children.length > 0) {
            const child = this.tracesGroup.children[0];
            this.tracesGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            // Material is shared, don't dispose unless unique
        }

        const material = this.resourceManager.getMaterial('copper', () =>
            this.resourceManager.createCopperMaterial()
        );

        // Requirement: "Manifold geometry", "Render as flat ... geometry on the board surface"
        // Let's use ExtrudeGeometry or PlaneGeometry along path?
        // Simple straight lines for now based on schema [[x1,z1], [x2,z2]]

        tracesData.forEach(trace => {
            const points = trace.points; // 2D array [[x,y], [x,y]] mapping to X, Z
            const width = trace.width || 0.5;

            if (points.length < 2) return;

            // Generate a path
            const path = new THREE.Shape();
            // Start at first point
            // To make it a wide line rectangle:
            const p1 = new THREE.Vector2(points[0][0], points[0][1]);
            const p2 = new THREE.Vector2(points[1][0], points[1][1]);

            const dir = new THREE.Vector2().subVectors(p2, p1).normalize();
            const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(width / 2);

            // 4 corners
            const c1 = new THREE.Vector2().addVectors(p1, perp);
            const c2 = new THREE.Vector2().subVectors(p1, perp);
            const c3 = new THREE.Vector2().subVectors(p2, perp);
            const c4 = new THREE.Vector2().addVectors(p2, perp);

            const shape = new THREE.Shape();
            shape.moveTo(c1.x, c1.y);
            shape.lineTo(c2.x, c2.y);
            shape.lineTo(c3.x, c3.y);
            shape.lineTo(c4.x, c4.y);
            shape.closePath();

            const geometry = new THREE.ShapeGeometry(shape);
            // Rotate to lie on XZ plane
            geometry.rotateX(Math.PI / 2);
            // Translate Y to slightly above board or relying on polygonOffset?
            // Shader has polygonOffset. So Y=0 is fine if board is at Y=-thickness/2 (Top at 0)

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = { isTrace: true, id: trace.id, data: trace };

            // Setup InstanceID for traces?
            // If traces are individual meshes, we can't use 'aInstanceId' attribute easily unless we manually add it to geometry.
            // The shader expects 'aInstanceId'.
            // For non-instanced meshes, 'aInstanceId' attribute will be missing -> Shader might break or read 0.
            // Solution: Add attribute to geometry with single value.
            const count = geometry.attributes.position.count;
            // Use a large ID or handle mapping.
            // Let's use negative IDs or a specific offset for traces? 
            // Or just managing IDs globally.
            // Prompt says: "Interaction Uniforms ... uHovered and uSelected"
            // If I hover a trace, I need to know its ID.
            // Let's say Pads are 0..N-1. Traces are N..M.

            // We need to inject aInstanceId.
            const idVal = 10000 + (trace.numericId || 0); // Hacky ID generation
            const ids = new Float32Array(count).fill(idVal);
            geometry.setAttribute('aInstanceId', new THREE.BufferAttribute(ids, 1));

            this.tracesGroup.add(mesh);
        });
    }
}
