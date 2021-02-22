#version 140

uniform sampler2D intex;

void main() {
  vec2 uv = gl_TexCoord[0].xy;
  uv.y = 1.0 - uv.y;
  vec4 color = texture(intex, uv);
  float brightness = (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
  if(brightness>0.9)
    gl_FragColor = clamp(color*pow(brightness,5)/10,0,1);
  else
    gl_FragColor = vec4(0,0,0,1);
}
