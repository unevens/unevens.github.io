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
uniform float touchObstacleRadius;
uniform float touchObstacleRepulsion;
uniform float numParticles;
uniform float lifetimeMin;
uniform float lifetimeMax;
uniform float spawnSpeedMin;
uniform float spawnSpeedMax;
uniform float burstPercentage;
uniform float burstInterval;
uniform float spawnEpoch;

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
    // particle state
    ivec2 texel = ivec2(floor(v_uv * viewportSize.xy));
    vec4 state = texelFetch(stateTexture, texel, 0);
    vec2 position = state.xy;
    vec2 velocity = state.zw;

    // Burst scheduling: particles are split into groups; group g spawns at t = g*burstInterval (mod cyclePeriod).
    // Burst size is derived so that, at burstPercentage=1, the average alive count equals numParticles:
    //   cyclesAlive = lifetimeMax / burstInterval     (number of bursts that overlap during one max lifetime)
    //   bSize       = burstPercentage * numParticles / cyclesAlive
    float id = float(texel.x) + float(texel.y) * viewportSize.x;
    float bInt = max(0.0001, burstInterval);
    float cyclesAlive = max(1.0, lifetimeMax / bInt);
    float bSize = max(1.0, burstPercentage * numParticles / cyclesAlive);
    float group = floor(id / bSize);
    float numGroups = max(1.0, ceil(numParticles / bSize));
    float cyclePeriod = numGroups * bInt;
    // Anchor the burst schedule to the per-layer epoch (set at init), not to absolute `time`.
    // Otherwise groups whose cycle-0 spawn happens to lie before init are missed and have to
    // wait a full cyclePeriod, leaving the screen empty until they catch up.
    float simTime = time - spawnEpoch;
    float relTime = simTime - group * bInt;
    float spawnIndex = floor(relTime / cyclePeriod);
    float spawnIndexPrev = floor((relTime - dt) / cyclePeriod);
    float timeSinceSpawn = relTime - spawnIndex * cyclePeriod;
    float lifetime = mix(lifetimeMin, lifetimeMax, random(v_uv + vec2(0.331, 0.667) + spawnIndex * 0.041));

    bool justSpawned = spawnIndex != spawnIndexPrev;
    bool alive = timeSinceSpawn < lifetime;

    if (justSpawned) {
        float angleSeed = random(v_uv + vec2(0.541, 0.213) + spawnIndex * 0.07);
        float speedSeed = random(v_uv + vec2(0.823, 0.412) + spawnIndex * 0.13);
        float angle = 6.28318530718 * angleSeed;
        float speed = mix(spawnSpeedMin, spawnSpeedMax, speedSeed);
        position = attractor.xy;
        velocity = vec2(cos(angle), sin(angle)) * speed;
        outputPacked = vec4(position, velocity);
        return;
    }

    if (!alive) {
        // Park dead particles off-screen until their group's next burst.
        outputPacked = vec4(2.0, 2.0, 0.0, 0.0);
        return;
    }

    // attract or reject to/from interaction point
    vec2 pToA = attractor.xy - position;
    float pToADist = length(pToA);
    float invDist = 1.0 / pToADist;
    vec2 acc = attractToTouch * pToA * pow(invDist, 1.0 + 1.0 * attractToTouchPower);
    // drag
    float velMag = length(velocity);
    vec2 drag = -velocity * velMag * dragCoef;
    acc += drag;
    acc = min(abs(acc), maxForce) * sign(acc);
    // screen border: loop or reflect
    vec2 relPos = 2.0 * position - 1.0;
    vec2 absPos = abs(relPos);
    if (absPos.x > sideThresh.x) {
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
    if (absPos.y > sideThresh.y) {
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
    // noise
    vec2 noize = noiz(position + v_uv);
    vec2 noizeVec = (2.0 * noize - 1.0) * noizForce;
    vec2 noize2 = noiz2(v_uv, vec2(-.342,.653));
    // obstacle at interaction
    vec2 inc;
    if (pToADist <= touchObstacleRadius) {
        vec2 escapeDirection = -pToA * invDist;
        position = attractor.xy + escapeDirection * touchObstacleRadius;
        inc = 0.5 * escapeDirection * touchObstacleRepulsion * dt;
    } else {
        if (velMag < 0.00001) {
            velocity = noizeVec * maxForce * dt;
        }
        float idAngle = 3.1416 * (v_uv.x*numParticles+v_uv.y)/numParticles;
        vec2 pulseDirection = vec2(sin(idAngle), cos(idAngle));
        float pulseAmp = sin(pulseFreq * time + idAngle);
        pulseAmp *= pulseAmp;
        vec2 pulse = pulseCoef * pulseAmp * pulseAmp * pulseDirection;
        acc += noizeVec * (acc + pulse) ;
        inc = 0.5 * acc * dt;
    }
    // integration
    velocity += inc;
    position += velocity * dt;
    velocity += inc;
    outputPacked = vec4(position, velocity);
}
