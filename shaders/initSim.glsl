#version 300 es
// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputPacked;
uniform vec2 cellRadius;
uniform vec2 noizAmount;
uniform vec2 noizSeed;

highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

vec4 noiz(vec2 uv) {
    return vec4(random(uv), random(uv + 1.63172), random(uv - 1.84239), random(uv + 2.54176));
}

void main() {
    vec4 noiz = 2.0 * noiz(v_uv) - 1.0;
    vec2 position = v_uv + noizAmount.x * noiz.xy * cellRadius;
    vec2 velocity = noizAmount.y * noiz.zw * cellRadius;
    outputPacked = vec4(position, velocity);
    // outputPacked = vec4(v_uv, 0.2,0.);
}