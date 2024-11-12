#version 300 es
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputColor;
uniform sampler2D hdrTexture;

void main() {
    vec4 hdr = texture(hdrTexture, v_uv);
    //todo tonemapping
    outputColor = vec4(hdr.rgb, 1.);
}