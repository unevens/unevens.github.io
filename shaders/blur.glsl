#version 300 es
#ifndef NUM_TAPS
#define NUM_TAPS 4
#endif 
precision mediump float;
precision mediump sampler2D;
in highp vec2 v_uv;
layout(location = 0) out vec4 outputColor;
uniform sampler2D srcTexture;
uniform vec2 offset[NUM_TAPS];
uniform float weight[NUM_TAPS];
void main() {
    vec3 color = vec3(0.0);
    for(int i = NUM_TAPS - 1; i > 0; i--){
        color += weight[i] * texture(srcTexture, v_uv - offset[i]).rgb;
    }
    color += weight[0] * texture(srcTexture, v_uv).rgb;
    for(int i = 1; i < NUM_TAPS; i++){
        color += weight[i] * texture(srcTexture, v_uv + offset[i]).rgb;
    }
    outputColor = vec4(color, 1.0);
}