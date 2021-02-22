#include <SFML/Graphics.hpp>
#include <iostream>
#include <cmath>
using namespace sf;

int main() {

  bool antialias = true;
  float cspeed = 0.05f;

  // Window
  int w = 800;
  int h = 600;

  float af = 1.5;

  if(antialias) {
    w=floor(w*af);
    h=floor(h*af);
  }

  // Keys
  bool keys[10] = { false,false,false,false , false,false,false,false, false,false };

  float v=1;
  if(antialias)
    v=af;

  RenderWindow window(VideoMode(floor(w/v), floor(h/v)), "Ray Tracing", Style::Titlebar | Style::Close);
  window.setFramerateLimit(120);

  // Shaders
  Shader shader;
  shader.loadFromFile("shader.frag", Shader::Fragment);
  shader.setUniform("u_resolution", Vector2f(w,h));

  Shader bright;
  bright.loadFromFile("brightFilter.frag", Shader::Fragment);

  Shader gausBlur;
  gausBlur.loadFromFile("gausBlur.frag", Shader::Fragment);

  Shader bloom;
  bloom.loadFromFile("bloom.frag", Shader::Fragment);

  Shader aas;
  aas.loadFromFile("antialias.frag", Shader::Fragment);
  aas.setUniform("u_resolution", Vector2f(w,h));
  aas.setUniform("factor", af);

  // Textures and Sprites
  RenderTexture texture;
  texture.create(w,h);
  Sprite output = Sprite(texture.getTexture());

  RenderTexture btex;
  btex.create(w,h);
  Sprite bspr = Sprite(btex.getTexture());

  RenderTexture gaus;
  gaus.create(w,h);
  Sprite gspr = Sprite(gaus.getTexture());

  RenderTexture tBloom;
  tBloom.create(w,h);
  Sprite blspr = Sprite(tBloom.getTexture());

  RenderTexture aa;
  aa.create(floor(w/af),floor(h/af));
  Sprite aspr = Sprite(aa.getTexture());

  //Transformation
  Vector2f rotation = Vector2f(0.f,0.f);
  Vector3f position = Vector3f(0.f,0.f,0.f);

  //Clock
  int time = 0;
  Clock clock;
  while(window.isOpen()) {
    Event event;
    while(window.pollEvent(event)) {
      if(event.type == Event::Closed)
        window.close();
      else if(event.type == Event::KeyPressed) {
        if(event.key.code == Keyboard::W)
          keys[0]=true;
        else if(event.key.code == Keyboard::A)
          keys[1]=true;
        else if(event.key.code == Keyboard::S)
          keys[2]=true;
        else if(event.key.code == Keyboard::D)
          keys[3]=true;

        else if(event.key.code == Keyboard::Up)
          keys[4]=true;
        else if(event.key.code == Keyboard::Down)
          keys[5]=true;
        else if(event.key.code == Keyboard::Left)
          keys[6]=true;
        else if(event.key.code == Keyboard::Right)
          keys[7]=true;

        else if(event.key.code == Keyboard::Space)
          keys[8]=true;
        else if(event.key.code == Keyboard::LShift)
          keys[9]=true;
      }
      else if(event.type == Event::KeyReleased) {
        if(event.key.code == Keyboard::W)
          keys[0]=false;
        else if(event.key.code == Keyboard::A)
          keys[1]=false;
        else if(event.key.code == Keyboard::S)
          keys[2]=false;
        else if(event.key.code == Keyboard::D)
          keys[3]=false;

        else if(event.key.code == Keyboard::Up)
          keys[4]=false;
        else if(event.key.code == Keyboard::Down)
          keys[5]=false;
        else if(event.key.code == Keyboard::Left)
          keys[6]=false;
        else if(event.key.code == Keyboard::Right)
          keys[7]=false;

        else if(event.key.code == Keyboard::Space)
          keys[8]=false;
        else if(event.key.code == Keyboard::LShift)
          keys[9]=false;
      }
    }

    float currentTime = clock.restart().asSeconds();
    float fps = 1.f / currentTime;
    if(time%30==0)
      std::cout << fps << '\n';

    float speed = cspeed;

    if(keys[4])
      rotation += Vector2f(0.f,speed);
    else if(keys[5])
      rotation += Vector2f(0.f,-speed);

    if(keys[6])
      rotation += Vector2f(-speed,0.f);
    else if(keys[7])
      rotation += Vector2f(speed,0.f);

    float mx = rotation.x;
    float my = rotation.y;

    Vector3f dir = Vector3f(0.f, 0.f, 0.f);
  	Vector3f dirTemp;

  	if (keys[0]) dir = Vector3f(1.f, 0.f, 0.f);
  	else if (keys[2]) dir = Vector3f(-1.f, 0.f, 0.f);
  	if (keys[1]) dir += Vector3f(0.f, -1.f, 0.f);
  	else if (keys[3]) dir += Vector3f(0.f, 1.f, 0.f);

  	dirTemp.z = dir.z * cos(-my) - dir.x * sin(-my);
  	dirTemp.x = dir.z * sin(-my) + dir.x * cos(-my);
  	dirTemp.y = dir.y;

  	dir.x = dirTemp.x * cos(mx) - dirTemp.y * sin(mx);
  	dir.y = dirTemp.x * sin(mx) + dirTemp.y * cos(mx);
  	dir.z = dirTemp.z;

    if(keys[8]) dir += Vector3f(0.f, 0.f, 1.f);
    else if(keys[9]) dir += Vector3f(0.f, 0.f, -1.f);

  	position += dir * speed;

    shader.setUniform("position", position);
    shader.setUniform("rotation", rotation);

    texture.clear();
    texture.draw(output, &shader);

    btex.clear();
    bright.setUniform("intex", texture.getTexture());
    btex.draw(bspr, &bright);

    gaus.clear();
    gausBlur.setUniform("intex", btex.getTexture());
    gaus.draw(gspr, &gausBlur);

    tBloom.clear();
    bloom.setUniform("scene", texture.getTexture());
    bloom.setUniform("blured", gaus.getTexture());
    tBloom.draw(blspr, &bloom);

    if(antialias) {
      aa.clear();
      aas.setUniform("intex", tBloom.getTexture());
      aa.draw(aspr, &aas);
      window.draw(aspr);
    } else
      window.draw(blspr);

    window.display();
    time++;
  }

  return 0;
}
