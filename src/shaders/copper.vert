// copper.vert

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Instancing support
attribute float aInstanceId;
varying float vInstanceId;



void main() {
    vUv = uv;
    vInstanceId = aInstanceId; // Pass ID to fragment

    #ifdef USE_INSTANCING
        mat4 localInstanceMatrix = instanceMatrix;
        mat3 localNormalMatrix = mat3(instanceMatrix);
    #else
        mat4 localInstanceMatrix = mat4(1.0);
        mat3 localNormalMatrix = mat3(1.0);
    #endif

    // Standard Normal/Position calc
    vec4 mvPosition = modelViewMatrix * localInstanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * localNormalMatrix * normal);
}
