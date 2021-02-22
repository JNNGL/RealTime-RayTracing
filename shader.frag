#version 140

uniform vec2 u_resolution;
uniform vec3 position;
uniform vec2 rotation;

const vec3 light = normalize(vec3(1,1,1));
const float ambient = 0.5;

vec4 plight = vec4(-1,-0.25,-0.49,2);

struct sphere
{
	float ra;
	vec3 color;
	vec3 pos;
	float reflectivity;
	bool light;
};

struct box
{
	vec3 rad;
	vec3 color;
	vec3 pos;
	float reflectivity;
	bool light;
};

struct plane
{
	vec3 color;
	vec3 normal;
	float reflectivity;
	bool light;
};

plane[999] planes; int totalPlanes = 0;
box[999] boxes; int totalBoxes = 0;
sphere[999] spheres; int totalSpheres = 0;

mat2 rotationMatrix(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s, s, c);
}

vec3 getSky(vec3 rd) {
	vec3 col = vec3(0.3, 0.6, 1.0);
	vec3 sun = vec3(0.95, 0.9, 1.0);
	sun *= max(0.0, pow(dot(rd, light), 256.0));
	col += max(0.0, dot(light, vec3(0.0, 0.0, 1.0)))*0.15;
	return col + sun;
}

vec2 sphIntersect(in vec3 ro, in vec3 rd, float ra) {
	float b = dot(ro, rd);
	float c = dot(ro, ro) - ra * ra;
	float h = b * b - c;
	if(h < 0.0) return vec2(-1.0);
	h = sqrt(h);
	return vec2(-b - h, -b + h);
}

vec2 boxIntersect(in vec3 ro, in vec3 rd, in vec3 rad, out vec3 oN) {
	vec3 m = 1.0 / rd;
	vec3 n = m * ro;
	vec3 k = abs(m) * rad;
	vec3 t1 = -n - k;
	vec3 t2 = -n + k;
	float tN = max(max(t1.x, t1.y), t1.z);
	float tF = min(min(t2.x, t2.y), t2.z);
	if(tN > tF || tF < 0.0) return vec2(-1.0);
	oN = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
	return vec2(tN,tF);
}

float plaIntersect(in vec3 ro, in vec3 rd, in vec4 p) {
	return -(dot(ro, p.xyz) + p.w) / dot(rd, p.xyz);
}

vec4 getLight(vec3 n, vec3 p, vec3 ro, int i, vec3 lightPos) {
  vec3 l = normalize(lightPos - p);
  float dif = clamp(dot(n, l) * 0.5 + 0.5, 0, 1);
  float d = length(normalize(lightPos) * 0.5);
  d+=1;
  d=clamp(d, 0, 1);
  dif *= d;
  vec4 col = vec4(dif, dif, dif, 1);
  float occ = (float(i) / 100000 * 2);
  occ = 1 - occ;
  occ *= occ;
  col.rgb *= occ;
	vec3 np = ro+p;
	float fog = length(np) + length(ro);
	fog /= 175;
	fog = clamp(fog, 0, 1);
	col.rgb = mix(col.rgb, vec3(0.25), fog);
  return col;
}

vec3 gammaCorrect(vec3 col) {
	float scale = 1;
	vec3 ncol;
	ncol.r = sqrt(scale*col.r);
	ncol.g = sqrt(scale*col.g);
	ncol.b = sqrt(scale*col.b);
	return ncol;
}

void initSphere(inout sphere o, float ra, vec3 color, vec3 pos, float reflectivity, bool light) {
	o.ra=ra;
	o.color=color;
	o.pos=pos;
	o.reflectivity=reflectivity;
	o.light=light;
}

void initBox(inout box o, vec3 rad, vec3 color, vec3 pos, float reflectivity, bool light) {
	o.rad=rad;
	o.color=color;
	o.pos=pos;
	o.reflectivity=reflectivity;
	o.light=light;
}

void initPlane(inout plane o, vec3 normal, vec3 color, float reflectivity, bool light) {
	o.normal=normal;
	o.color=color;
	o.reflectivity=reflectivity;
	o.light=light;
}

void addSphere(float ra, vec3 color, vec3 pos, float reflectivity, bool light) {
	initSphere(spheres[totalSpheres], ra, color, pos, reflectivity, light);
	totalSpheres++;
}

void addBox(vec3 rad, vec3 color, vec3 pos, float reflectivity, bool light) {
	initBox(boxes[totalBoxes], rad, color, pos, reflectivity, light);
	totalBoxes++;
}

void addPlane(vec3 normal, vec3 color, float reflectivity, bool light) {
	initPlane(planes[totalPlanes], normal, color, reflectivity, light);
	totalPlanes++;
}

float castLength(inout vec3 ro, inout vec3 rd) {
	vec2 it = vec2(99999);
	vec3 n;
	vec3 col;

	for(int i = 0; i < totalPlanes; i++) {
		vec3 pN = planes[i].normal;
		vec2 it3 = vec2(plaIntersect(ro, rd, vec4(pN,1.0)));
		if(it3.x > 0.0 && it3.x < it.x) {
			it = it3;
			n = pN;
			col = planes[i].color;
		}
	}
	for(int i = 0; i < totalSpheres; i++) {
	  vec2 it1 = sphIntersect(ro-spheres[i].pos, rd, spheres[i].ra);
		if(it1.x > 0.0 && it1.x < it.x) {
			it = it1;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - spheres[i].pos);
			col = spheres[i].color;
		}
	}
	for(int i = 0; i < totalBoxes; i++) {
		vec3 boxN;
		vec2 it2 = boxIntersect(ro-boxes[i].pos, rd, boxes[i].rad, boxN);
		if(it2.x > 0.0 && it2.x < it.x) {
			it = it2;
			n = boxN;
			col = boxes[i].color;
		}
	}
	return it.x;
}

bool castShadow(vec3 ro, vec3 rd) {
	bool glowing;
	vec2 it = vec2(99999);
	vec3 n;
	vec3 col;

	for(int i = 0; i < totalPlanes; i++) {
		vec3 pN = planes[i].normal;
		vec2 it3 = vec2(plaIntersect(ro, rd, vec4(pN,1.0)));
		if(it3.x > 0.0 && it3.x < it.x) {
			it = it3;
			n = pN;
			col = planes[i].color;
			glowing = planes[i].light;
		}
	}
	for(int i = 0; i < totalSpheres; i++) {
	  vec2 it1 = sphIntersect(ro-spheres[i].pos, rd, spheres[i].ra);
		if(it1.x > 0.0 && it1.x < it.x) {
			it = it1;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - spheres[i].pos);
			col = spheres[i].color;
			glowing = spheres[i].light;
		}
	}
	for(int i = 0; i < totalBoxes; i++) {
		vec3 boxN;
		vec2 it2 = boxIntersect(ro-boxes[i].pos, rd, boxes[i].rad, boxN);
		if(it2.x > 0.0 && it2.x < it.x) {
			it = it2;
			n = boxN;
			col = boxes[i].color;
			glowing = boxes[i].light;
		}
	}
  if(it.x<0.0||it.x>=99999||glowing) return false;
	return true;
}

vec3 castRay(inout vec3 ro, inout vec3 rd, out float reflective, out vec4 color) {
	vec2 it = vec2(99999);
	vec3 n;
	vec3 col;

	float reflectivity = 0.0;

	bool lights;

	for(int i = 0; i < totalPlanes; i++) {
		vec3 pN = planes[i].normal;
		vec2 it3 = vec2(plaIntersect(ro, rd, vec4(pN,1.0)));
		if(it3.x > 0.0 && it3.x < it.x) {
			it = it3;
			n = pN;
			col = planes[i].color;
			reflectivity = planes[i].reflectivity;
			lights = planes[i].light;
		}
	}
	for(int i = 0; i < totalSpheres; i++) {
	  vec2 it1 = sphIntersect(ro-spheres[i].pos, rd, spheres[i].ra);
		if(it1.x > 0.0 && it1.x < it.x) {
			it = it1;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - spheres[i].pos);
			col = spheres[i].color;
			reflectivity = spheres[i].reflectivity;
			lights = spheres[i].light;
		}
	}
	for(int i = 0; i < totalBoxes; i++) {
		vec3 boxN;
		vec2 it2 = boxIntersect(ro-boxes[i].pos, rd, boxes[i].rad, boxN);
		if(it2.x > 0.0 && it2.x < it.x) {
			it = it2;
			n = boxN;
			col = boxes[i].color;
			reflectivity = boxes[i].reflectivity;
			lights = boxes[i].light;
		}
	}
	if(lights)
		color = vec4(col,1);
	else
		color = vec4(col,0);
	reflective = reflectivity;
  if(it.x<0.0||it.x>=99999) return vec3(-1.0);
	vec3 reflected = reflect(rd, n);
	float diffuse = max(0.0, dot(light, n));
	float specular = pow(max(0.0, dot(reflected, light)),48);
	col = col;
	vec3 ol = light;
	vec3 outc = col*getLight(n, rd*it.x, ro, int(it.x), ol).rgb * (diffuse+0.5) + specular * 0.66;
	ro += rd * (it.x - 0.001);
	rd = n;
  return outc;
}

float getPointLight(vec4 pl, vec3 lp, vec3 rd, vec3 n) {
	vec3 reflected = reflect(rd,n);
	vec3 pld = normalize(pl.xyz-lp);
	float diffuse = max(0.0,dot(pld,n));
	float specular = pow(max(0.0,dot(reflected, pld)),48);
	return diffuse + specular * 0.66;
}

vec3 traceSRay(inout vec3 ro, inout vec3 rad, out float refl, vec4 toc, bool ads) {

	float dump;

	float reflectivity;
	bool reflected = false;
	vec4 tc;
	vec3 rd = rad;
	vec3 col = castRay(ro, rd, reflectivity, tc);
	if(col.x == -1.0) return getSky(rd)*ambient;
	if(reflectivity>0)
		reflected = true;
	vec3 ocol = col;
	col*=ambient;
	col += ocol*getPointLight(plight, ro, rad, rd)*plight.w*(1.0-ambient);
	vec3 lightDir = light;
	if(dot(rd,light) > 0) {

		float maxAx = 0.025;
		int maxSamples = 1;

		if(!ads) {
			maxAx = 0;
			maxSamples = 0;
		}

		vec3 npl = plight.xyz;
		vec3 pld = normalize(npl-ro);
		float it = castLength(ro,pld);
		float lit = castLength(ro,lightDir);

		float ax;
		int samples;

		ax = clamp(it,0,maxAx);
		samples = int(floor(clamp(it,0,float(maxSamples))));

		if(it==99999) {
			ax = maxAx;
			samples = maxSamples;
		}

		int shadow = 0;

		float totalSamples = 0;
		for(int i = -samples; i < samples+1; i++) {
			for(int j = -samples; j < samples+1; j++) {
				vec3 cro = ro+vec3(ax*i,ax*j,0);
				totalSamples++;
				if(castShadow(cro, pld)&&dot(rd,pld)>0) shadow++;
			}
		}
		float factor = (1.0-clamp(pow(it*0.75*10,0.66)/20,0.01,1.0));
		col *= 1.0-shadow/totalSamples*factor;
	}
	if(tc.w>0&&!reflected)
		col = tc.xyz;
	rad = rd;
	refl = reflectivity;
	toc = tc;
	return gammaCorrect(col);
}

vec3 traceRRay(inout vec3 ro, inout vec3 rad, out float refl, out float orf) {
	vec4 tc;
	float dump;
	vec3 rd = rad;
	float reflectivity;

	vec3 col = traceSRay(ro,rd,reflectivity,tc,true);

	refl = 0;
	orf = reflectivity;
	if(reflectivity>0.0) {
		vec3 ror = ro;
		vec3 reflected = reflect(rad, rd);
		rad = reflected;
		float nrfl;
		vec3 ref = traceSRay(ror, reflected, nrfl, tc, false);
		refl = nrfl;
		if(tc.w>0)
			ref = tc.rgb;
		if(ref.x == -1.0)
			col = col * (1.0-reflectivity) + getSky(reflected)*ambient * reflectivity;
		else
			col = col * (1.0-reflectivity) + ref * reflectivity;
	}
	return col;
}

vec3 traceRay(vec3 oro, vec3 orad) {
	vec3 ro = oro;
	vec3 rad = orad;
	float dump;
	float orf;
	float reflectivity;
	vec3 col = traceRRay(ro,rad,reflectivity,orf);
	if(reflectivity>0) {
		vec3 ref = traceRRay(ro,rad,dump,dump);
		col = col * (1.0-orf) + ref * orf;
	}
	return col;
}

void main()
{
	addPlane(vec3(0.0,0.0,1.0), vec3(0.8),0.1, false);
	addSphere(1, vec3(0.95,0.75,0.23), vec3(-0.2,1,0.0),0.005, false);
	addSphere(1, vec3(0.88), vec3(2,-1.5,0.0),0.1, false);
	addBox(vec3(1.0), vec3(0), vec3(10,0.25,0.0),0.1, false);
	addSphere(1, vec3(1), vec3(5,-5,0.0),1, false);
	addSphere(0.5, vec3(1.0), vec3(2.5,3.25,1.5),1, false);

	addSphere(0.5, vec3(1.0), vec3(-1,-0.25,-0.5),0, true);

  vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_resolution / u_resolution.y;
  vec3 rayOrigin = vec3(-5.0, 0.0, 0.0)+position; // z x y
  vec3 rayDirection = normalize(vec3(1.0, uv));

	rayDirection.zx *= rotationMatrix(-rotation.y);
	rayDirection.xy *= rotationMatrix(rotation.x);

	vec3 col;
	col = traceRay(rayOrigin,rayDirection);

	gl_FragColor = vec4(col,1.0);

}
