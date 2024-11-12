#version 300 es
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputColor;
uniform sampler2D srcTexture;

void main() {
    vec4 color = texture(srcTexture, v_uv);
    outputColor = vec4(color.rgb, 1.0);
}