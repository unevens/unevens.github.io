#version 300 es
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputColor;
uniform sampler2D srcTexture;
uniform sampler2D bloomTexture;
uniform float bloomCoef;
void main() {
    vec3 src = texture(srcTexture, v_uv).rgb;
    vec3 bloom = bloomCoef * texture(bloomTexture, v_uv).rgb;
    vec3 color = max(src, bloom);
    outputColor = vec4(color, 1.0);
}