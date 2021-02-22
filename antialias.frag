#version 140

uniform vec2 u_resolution;
uniform sampler2D intex;
uniform float factor;

void main() {
  vec2 uv = gl_TexCoord[0].xy;
  uv.y = 1.0-uv.y;
  float af = factor-1.0;
  float ax = 1.0/u_resolution.x*af;
  float ay = 1.0/u_resolution.y*af;

  vec4 c1 = texture(intex,uv);
  vec4 c2 = texture(intex,uv+vec2( 0,ay));
  vec4 c3 = texture(intex,uv+vec2(ax, 0));
  vec4 c4 = texture(intex,uv+vec2(ax,ay));

  vec4 c = c1*0.25+c2*0.25+c3*0.25+c4*0.25;
  gl_FragColor=c;

}
