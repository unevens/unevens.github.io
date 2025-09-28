#version 300 es
// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT
#ifndef PERIODIC
#define PERIODIC 1
#endif
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputPacked;
uniform sampler2D stateTexture;
uniform vec4 attractor;
uniform vec2 sideThresh;
uniform float forceCoef;
uniform float forcePow;
uniform float dt;
uniform float maxForce;
uniform float dragCoef;
uniform float noizForce;
uniform float pulseFreq;
uniform float pulseCoef;
uniform float time;
uniform float sideForce;
uniform float hardSide;

highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

vec2 noiz(vec2 uv) {
    return vec2(random(uv), random(uv + vec2(1.76565, -1.97465)));
}

void main() {
    vec4 state = texture(stateTexture, v_uv);
    vec2 position = state.xy;
    vec2 velocity = state.zw;
    vec2 pToA = attractor.xy - position;
    float invDist2 = 1.0 / dot(pToA, pToA);
    vec2 acc = forceCoef * pToA * pow(invDist2, 0.5 + 0.5 * forcePow);
    float velMag = length(velocity);
    vec2 drag = -velocity * velMag * dragCoef;
    acc += drag;
    acc = min(abs(acc), maxForce) * sign(acc);
    vec2 relPos = 2.0 * position - 1.0;
    vec2 absPos = abs(relPos);
    if(absPos.x > sideThresh.x) {
#if (PERIODIC==1)
        position.x = 0.5 * (1.0 - relPos.x);
#else
        float dir = sign(-relPos.x);
        float soft = acc.x + sideForce * dir;
        float hard = abs(acc.x) * dir;
        acc.x = mix(soft, hard, hardSide);
        float hardSpeed = abs(velocity.x) * dir;
        velocity.x = mix(velocity.x, hardSpeed, hardSide);
#endif
    }
    if(absPos.y > sideThresh.y) {
#if (PERIODIC==1)
        position.y = 0.5 * (1.0 - relPos.y);
#else
        float dir = sign(-relPos.y);
        float soft = acc.y + sideForce * dir;
        float hard = abs(acc.y) * dir;
        acc.y = mix(soft, hard, hardSide);
        float hardSpeed = abs(velocity.y) * dir;
        velocity.y = mix(velocity.y, hardSpeed, hardSide);
#endif
    }
    vec2 noize = noiz(position);
    float idAngle = 3.1416 * (v_uv.x + v_uv.y + fract(time));
    vec2 pulseDirection = vec2(sin(idAngle), cos(idAngle));
    float pulseAmp = sin(pulseFreq * time + idAngle);
    pulseAmp *= pulseAmp;
    vec2 pulse = pulseCoef * pulseAmp * pulseAmp * pulseDirection;
    acc += (2.0 * noize - 1.0) * noizForce * (acc + pulse);
    vec2 inc = 0.5 * acc * dt;
    velocity += inc;
    position += velocity * dt;
    velocity += inc;
    outputPacked = vec4(position, velocity);
}