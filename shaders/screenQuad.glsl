#version 300 es
precision mediump float;
precision mediump sampler2D;
layout(location = 0) in vec2 position;
out highp vec2 v_uv;
void main() {
    v_uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}