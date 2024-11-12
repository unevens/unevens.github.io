// Copyright Dario Mambro 2018 - 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

precision mediump float; 
 
varying vec2 screen_coord; 
uniform float iTime;
uniform vec2 iResolution;

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 coord = (fragCoord)/iResolution.y;

    float coord_scale = 60.0;
    float coord_speed = 4.0;
    float coord_wave = 3.3;
    vec2 icoord = floor(coord * coord_scale)/coord_scale;

    vec2 border = coord-icoord;
    border *= 100.0;
    border = step(.75/coord_scale,coord-icoord);
    float bmask = clamp(border.x+border.y,0.0,1.0);
    float b_alpha = mix(0.1,0.9, 0.5+0.5*sin(coord_speed*iTime+coord.y*coord_wave));
    bmask = 1. - bmask;
    bmask = mix(1.0, bmask, b_alpha);
      
    vec2 uvn = vec2(fragCoord.x/iResolution.x,fragCoord.y/iResolution.y)-0.5;
    float rho = dot(uvn,uvn);
    float argg = rho * 80.0 - iTime * 1.2 + 0.625;
    float s = sin(argg);
    s = s * s;
    s = mix(.5,1.6,s)*rho*0.75;
    fragColor = vec4(vec3(clamp(s,0.,1.)* bmask),1.0);
    float sat = .3;
    float hue = fract(argg*0.04);
    float value = 0.321;
    vec3 hsv = vec3(hue,sat,value);
    vec3 tint = hsv2rgb(hsv);
    fragColor *= vec4(tint,1.);
    
}

void main() {
    vec4 fragColor;
    mainImage( fragColor, screen_coord * iResolution );
    //fragColor.rgb *= 0.5;
    gl_FragColor = fragColor;
}