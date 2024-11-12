#version 300 es
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputColor;
uniform sampler2D srcTexture;
uniform mediump float threshold;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

void main() {
    vec4 color = texture(srcTexture, v_uv);
    vec3 hsv = rgb2hsv(color.rgb);
    if(hsv.z < threshold) {
        outputColor = vec4(vec3(0.0), 1.0);
    } else {
        outputColor = vec4(color.rgb, 1.0);
    }
}