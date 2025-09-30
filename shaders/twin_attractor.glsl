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
uniform vec4 viewportSize;
uniform vec4 attractor;
uniform vec2 sideThresh;
uniform float attractToTouch;
uniform float attractToTouchPower;
uniform float dt;
uniform float maxForce;
uniform float dragCoef;
uniform float noizForce;
uniform float pulseFreq;
uniform float pulseCoef;
uniform float time;
uniform float sideForce;
uniform float hardSide;
uniform float twinChangePeriod;
uniform float attractToTwin;
uniform float attractToTwinPower;
uniform float attractTwinByVelocity;
uniform float touchObstacleRadius;

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
vec2 noiz2(vec2 uv, vec2 offset) {
    uv*=.7;
    return vec2(random(uv-offset), random(uv + vec2(-1.375547, 1.145436)+offset));
}

void main() {
    vec2 texel = floor(v_uv * viewportSize.xy);
    vec4 state = texelFetch(stateTexture, ivec2(texel), 0);
    vec2 position = state.xy;
    vec2 velocity = state.zw;
    float numParticles = viewportSize.x * viewportSize.y;

    float phase = texel.x + viewportSize.x*texel.y;
    float twinOffset = mod(floor((time + phase)*numParticles/twinChangePeriod),numParticles)/(numParticles+phase);
    vec2 noizeUv = noiz(v_uv+twinOffset);
    vec2 texel2 = mod(texel+floor(noizeUv*viewportSize.xy),viewportSize.xy);
    vec4 stateB =  texelFetch(stateTexture, ivec2(texel2), 0);
    vec2 positionB = stateB.xy;
    vec2 velocityB = stateB.zw;
    
    vec2 pToA = attractor.xy - position;
    float pToADist =  length(pToA);
    float invDist = 1.0 / pToADist;
    vec2 acc = attractToTouch * pToA * pow(invDist, 1.0 + 1.0 * attractToTouchPower);

    vec2 pToB = positionB.xy - position;
    float invDist2B = 1.0 / dot(pToB, pToB);
    vec2 accB = attractToTwin * pToA * pow(invDist2B, 0.5 + 0.5 * attractToTwinPower);
    accB *= mix(vec2(1.0), velocityB, attractTwinByVelocity);
    acc += accB;

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
    
    float idAngle = 3.1416 * (v_uv.x + v_uv.y + fract(time));
    vec2 pulseDirection = vec2(sin(idAngle), cos(idAngle));
    float pulseAmp = sin(pulseFreq * time + idAngle);
    pulseAmp *= pulseAmp;
    vec2 pulse = pulseCoef * pulseAmp * pulseAmp * pulseDirection;
    vec2 noize = noiz(position);
    acc += (2.0 * noize - 1.0) * noizForce * (acc + pulse);

    vec2 inc = 0.5 * acc * dt;
    velocity += inc;
    position += velocity * dt;

    if(pToADist < touchObstacleRadius){
        vec2 escapeVector = -pToA * invDist;
        position = attractor.xy + escapeVector * touchObstacleRadius;
        velocity = escapeVector * length(velocity);
    }

    velocity += inc;
    outputPacked = vec4(position, velocity);
}