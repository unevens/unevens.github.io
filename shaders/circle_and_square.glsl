#version 300 es
// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT
// SDF functions by Inigo Quilez
// Copyright © 2019 Inigo Quilez
// The MIT License
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

precision mediump float;
precision mediump sampler2D;
in vec2 v_uv;
in vec2 v_velocity;
in vec3 v_noise;
in float v_id;
layout(location = 0) out vec4 outputColor;
uniform float time;
uniform float hueVariation;
uniform float hueSpeed;
uniform float tint;
uniform float tintVariation;
uniform float saturation;
uniform float saturationVariation;
uniform float lightness;
uniform float lightnessVariation;
uniform vec3 maxColorHsv;
uniform float blinkSpeedMin;
uniform float blinkSpeedMax;
uniform float thickness;
uniform float falloff;
uniform float threshold;
uniform float radiusPulseFreq;
uniform float radiusPulsePercentage;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    const float pi = 3.14159265359;
    float particleTime = time + v_id * 0.45543;
    float inside = 1.0 - 2.0 * thickness;

    float radiusPulseAlpha = 0.5+0.5*sin(pi * time * radiusPulseFreq + v_id * 1.2);
    float radiusPulse = mix(radiusPulsePercentage, 1.0, radiusPulseAlpha);
    float radius = (1.0 - thickness) * radiusPulse; 
    float sdfSquare = max(abs(v_uv.x),abs(v_uv.y)) - radius;
    float sdfCirlce = length(v_uv) - radius;
    float sdf = mix(sdfSquare, sdfCirlce, mod(v_id, 2.0));

    float borderDistance = abs(sdf);
    float outline = 1.0 - smoothstep(thickness * (1.0 - falloff), thickness, borderDistance);

    if (outline < threshold) {
        discard;
    }

    float hCenter = tint + mix(-tintVariation, tintVariation, 0.5 + 0.5 * sin(time * hueSpeed));
    float hMin = hCenter - hueVariation;
    float hMax = hCenter + hueVariation;
    vec3 minHsv = vec3(hMin,saturation-saturationVariation,lightness-lightnessVariation);
    vec3 maxHsv =  vec3(hMax,saturation+saturationVariation,lightness+lightnessVariation);
    vec3 noise = v_noise;
    float blinkSpeed = mix(blinkSpeedMin, blinkSpeedMax, noise.z);
    noise.z = 0.5 * sin(noise.z * 6.28 + blinkSpeed * time) + 0.5;
    vec3 color = hsv2rgb(mix(minHsv, maxHsv, noise));
    outputColor = vec4(color, outline);
}
