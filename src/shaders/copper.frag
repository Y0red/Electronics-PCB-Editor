// copper.frag

uniform float uHoveredId;
uniform float uSelectedId;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vInstanceId;

void main() {
    // Base Copper Color
    vec3 copperColor = vec3(0.72, 0.45, 0.20); 
    
    // Simple brushed metal effect (noise or stripes based on UV)
    float noise = sin(vUv.x * 100.0) * 0.1 + 0.9;
    
    // Lighting (Simple Phong-like)
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(10.0, 20.0, 10.0));
    float diff = max(dot(normal, lightDir), 0.0);
    
    vec3 viewDir = normalize(vViewPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

    vec3 finalColor = copperColor * noise * (diff + 0.3) + vec3(0.5) * spec;

    // Interaction Highlighting
    bool isHovered = abs(vInstanceId - uHoveredId) < 0.1;
    bool isSelected = abs(vInstanceId - uSelectedId) < 0.1;

    if (isSelected) {
        finalColor = mix(finalColor, vec3(1.0, 0.8, 0.0), 0.5); // Gold/Bright
        finalColor += vec3(0.2, 0.2, 0.0); // Emissive boost
    } else if (isHovered) {
        finalColor = mix(finalColor, vec3(1.0, 0.6, 0.6), 0.3); // Slight highlight
        finalColor += vec3(0.1);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
