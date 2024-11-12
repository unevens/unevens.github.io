#version 300 es
precision mediump float;
precision mediump sampler2D;
in vec2 v_uv;
in vec2 v_velocity;
layout(location = 0) out vec4 outputColor;
void main() {
    outputColor = vec4(v_uv,0.0,1.0);
}