import * as THREE from 'three';

export class BoardBuilder {
    constructor(scene) {
        this.scene = scene;
        this.boardMesh = null;
    }

    createBoard(width = 100, height = 80, thickness = 1.6, color = 0x2e8b57) {
        if (this.boardMesh) {
            this.scene.remove(this.boardMesh);
            this.boardMesh.geometry.dispose();
            if (Array.isArray(this.boardMesh.material)) {
                this.boardMesh.material.forEach(m => m.dispose());
            } else {
                this.boardMesh.material.dispose();
            }
        }

        const geometry = new THREE.BoxGeometry(width, thickness, height);
        // Green FR4 color
        const material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            specular: 0x111111
        });

        this.boardMesh = new THREE.Mesh(geometry, material);
        // Position so top surface is at Y = 0 (Wait, usually better to center at 0 or have top at 0?)
        // Requirement: "no Z-fighting between the board surface and the copper elements".
        // If copper is at Y=0, Board top should be slightly below or explicitly at Y=0 with polygonOffset on copper.
        // Let's put Board center at Y = -thickness/2, so Top Surface is Y = 0.
        this.boardMesh.position.y = -thickness / 2;

        this.boardMesh.userData = { isBoard: true };

        this.scene.add(this.boardMesh);
        return this.boardMesh;
    }
}
