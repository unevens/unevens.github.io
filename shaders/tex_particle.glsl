#version 300 es
// Copyright © Dario Mambro 2026
// Distributed under the MIT license. https://opensource.org/licenses/MIT
precision mediump float;
precision mediump sampler2D;
in vec2 v_uv;
in float v_id;
in vec3 v_noise;
layout(location = 0) out vec4 outputColor;

uniform sampler2D atlasTexture;
uniform vec2 atlasSize;       // (cols, rows)
uniform float time;
uniform float hueVariation;
uniform float hueSpeed;
uniform float tint;           // center hue [0, 1]
uniform float tintVariation;  // hue oscillation range
uniform float saturation;
uniform float saturationVariation;
uniform float blinkSpeedMin;
uniform float blinkSpeedMax;
uniform float texSaturation;  // 0 = grayscale texture, 1 = original texture colors
uniform float tintAmount;     // 0 = original texture color, 1 = per-particle tint
uniform float brightness;
uniform float threshold;      // alpha discard threshold

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // Each particle picks a fixed random cell from the atlas based on its noise value.
    float numFrames = atlasSize.x * atlasSize.y;
    float frame = floor(v_noise.x * numFrames);
    float col = mod(frame, atlasSize.x);
    float row = floor(frame / atlasSize.x);

    // Map v_uv [-1,1] to [0,1], flip Y to match image top-down row convention
    vec2 cellUv = vec2(v_uv.x * 0.5 + 0.5, 1.0 - (v_uv.y * 0.5 + 0.5));
    vec2 uv = (vec2(col, row) + cellUv) / atlasSize;

    vec4 texColor = texture(atlasTexture, uv);

    if (texColor.a < threshold) {
        discard;
    }

    // Per-particle animated tint — same HSV logic as circle/square shaders
    float hCenter = tint + mix(-tintVariation, tintVariation, 0.5 + 0.5 * sin(time * hueSpeed));
    vec3 minHsv = vec3(hCenter - hueVariation, saturation - saturationVariation, 1.0);
    vec3 maxHsv = vec3(hCenter + hueVariation, saturation + saturationVariation, 1.0);
    vec3 noise = v_noise;
    float blinkSpeed = mix(blinkSpeedMin, blinkSpeedMax, noise.z);
    noise.z = 0.5 * sin(noise.z * 6.28 + blinkSpeed * time) + 0.5;
    vec3 particleTint = hsv2rgb(mix(minHsv, maxHsv, noise));

    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 baseColor = mix(vec3(gray), texColor.rgb, texSaturation);
    vec3 color = mix(baseColor, vec3(gray) * particleTint, tintAmount) * brightness;

    outputColor = vec4(color, texColor.a);
}
