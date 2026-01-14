import * as THREE from 'three';
import copperVert from '../shaders/copper.vert?raw';
import copperFrag from '../shaders/copper.frag?raw';

export class ResourceManager {
    constructor() {
        this.materials = new Map();
        this.geometries = new Map();
    }

    getMaterial(name, createFn) {
        if (!this.materials.has(name)) {
            this.materials.set(name, createFn());
        }
        return this.materials.get(name);
    }

    getGeometry(name, createFn) {
        if (!this.geometries.has(name)) {
            this.geometries.set(name, createFn());
        }
        return this.geometries.get(name);
    }

    createCopperMaterial() {
        return new THREE.ShaderMaterial({
            vertexShader: copperVert,
            fragmentShader: copperFrag,
            uniforms: {
                uHoveredId: { value: -1 },
                uSelectedId: { value: -1 },
                uTime: { value: 0 }
            },
            polygonOffset: true,
            polygonOffsetFactor: -1, // Pull towards camera
            polygonOffsetUnits: -1
        });
    }

    disposeAll() {
        this.materials.forEach(mat => mat.dispose());
        this.materials.clear();

        this.geometries.forEach(geo => geo.dispose());
        this.geometries.clear();
    }
}
