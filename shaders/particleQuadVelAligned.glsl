#version 300 es
// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT
precision mediump float;
precision mediump sampler2D;
layout(location = 0) in vec2 a_position;
out mediump vec2 v_uv;
out mediump vec2 v_velocity;
out mediump float v_id;
out mediump vec3 v_noise;
uniform sampler2D simulation;
uniform vec4 simulationSize;
// uniform vec4 viewportSize;
uniform vec2 particleSize;
uniform vec2 ratio;
uniform float deformationCoef;
uniform float time;

highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

vec3 noiz(float x) {
    return vec3(random(vec2(x, 0.123975)), random(vec2(x + 1.63172, -1.567321)), random(vec2(x - 1.84239, 2.98451)));
}

void main() {
    v_uv = a_position;
    float id = float(gl_InstanceID);
    v_id = id;
    float row = floor(id / simulationSize.x);
    float column = id - simulationSize.x * row;
    vec2 simCoord = vec2(column, row) * simulationSize.zw;
    vec4 particle = texture(simulation, simCoord);
    v_velocity = particle.zw;
    vec2 particlePos = 2.0 * particle.xy - 1.0;
    vec2 position = particleSize*a_position;
    float velAbs = length(particle.zw);
    vec2 velDirection = velAbs>0.001 ? particle.zw/velAbs : vec2(0.0,1.0);
    vec2 ortho = vec2(velDirection.y,-velDirection.x);
    // velDirection*=ratio.x;
    // ortho*=ratio.y;
    position = -position.y * velDirection + position.x * ortho;
    position*=ratio;
    particlePos *= ratio;
    v_velocity *= ratio;
    gl_Position = vec4(position + particlePos, 1.0, 1.0);
    v_noise = noiz(id);
}
