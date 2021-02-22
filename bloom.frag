#version 140

uniform sampler2D scene;
uniform sampler2D blured;

void main() {
  vec2 uv = gl_TexCoord[0].xy;
  uv.y = 1.0 - uv.y;
  gl_FragColor = texture(scene,uv)*0.875 + texture(blured,uv)*0.9;
}
