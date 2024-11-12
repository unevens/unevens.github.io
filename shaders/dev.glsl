#version 300 es
precision mediump float;
precision mediump sampler2D;
in vec2 v_uv;
layout(location = 0) out vec4 outputColor;

highp float random(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

void main() {
    outputColor = vec4(vec3(random(v_uv)),1.0);
}