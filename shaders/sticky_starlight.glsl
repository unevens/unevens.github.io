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

float sdMoon(vec2 p, float d, float ra, float rb) {
    p.y = abs(p.y);
    float a = (ra * ra - rb * rb + d * d) / (2.0 * d);
    float b = sqrt(max(ra * ra - a * a, 0.0));
    if (d * (p.x * b - p.y * a) > d * d * max(b - p.y, 0.0))
    return length(p - vec2(a, b));
    return max((length(p) - ra), -(length(p - vec2(d, 0)) - rb));
}

float sdStar(in vec2 p, in float r, in int n, in float m) {
    // next 4 lines can be precomputed for a given shape
    float an = 3.141593 / float(n);
    float en = 3.141593 / m; // m is between 2 and n
    vec2 acs = vec2(cos(an), sin(an));
    vec2 ecs = vec2(cos(en), sin(en)); // ecs=vec2(0,1) for regular polygon

    float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
    p = length(p) * vec2(cos(bn), abs(sin(bn)));
    p -= r * acs;
    p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
    return length(p) * sign(p.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    const float pi = 3.14159265359;
    float particleTime = time + v_id * 0.45543;
    float inside = 1.0 - 2.0 * thickness;

    float moonTime = 2.0 * abs(fract(particleTime * 0.3) - 0.5);
    float moonOuter = 1.0 * inside;
    float moonInner = mix(0.9, 1.4, moonTime * moonTime * moonTime) * inside;
    float moonOffset = mix(0.3, 1.6, moonTime * moonTime) * inside;
    float moon = sdMoon(v_uv, moonOffset, moonOuter, moonInner);

    float minN = 5.0;
    float deltaN = 5.0;
    float starTime = particleTime;
    float t = starTime / 16.0;
    float ft = 2.0 * abs(fract(t) - 0.5);
    float n = minN + mod(v_id, deltaN);
    float fta = 2.0 * abs(fract(ft * deltaN) - 0.5);
    float a = 0.5 + 0.5 * fta; // angle factor
    float w = 2.0 + a * a * (n - 2.0); // angle divisor, between 2 and n
    float star = sdStar(v_uv, inside, int(n), w);

    float sdf = mix(star, moon, mod(v_id, 2.0));
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
