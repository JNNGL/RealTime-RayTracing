#version 140

uniform sampler2D intex;
const int samples = 6;
const float total = pow(samples*2+1,2);
const float ax = 0.002;

void main() {
  vec2 uv = gl_TexCoord[0].xy;
  uv.y = 1.0 - uv.y;

  vec3 color = vec3(0.0);

  for(int i = -samples; i <= samples; i++) {
    for(int j = -samples; j <= samples; j++) {
      vec2 nuv = uv + vec2(i*ax,j*ax);
      color += texture(intex, nuv).rgb/0.1;
    }
  }
  color/=total;
  gl_FragColor = vec4(color*5,1);
}
