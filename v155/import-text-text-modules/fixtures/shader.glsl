#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;

void main() {
  float wave = sin(v_uv.x * 12.0 + u_time) * 0.5 + 0.5;
  fragColor = vec4(wave, v_uv.y, 1.0 - wave, 1.0);
}
