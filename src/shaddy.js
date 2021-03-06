/**
 * @license MIT
 * @author Baptiste Crespy <baptiste.crespy@gmail.com>
 * 
 * Simple shader to apply 2d transformations to the screen, such as mirrors, translations
 */

export default {
  vertex: `
    varying vec2 vUv;

    void main() {
      vUv = position.xy;
      gl_Position = vec4(position.x, position.y, 0.0, 0.5);
    }
  `,

  /*
  fragment: `
    uniform sampler2D texture;
    uniform float time;
    
    varying vec2 vUv;

    void main() {
      vec2 texCoor = vUv;
      
      
      if (vUv.x > 0.0) {
        texCoor.x = -texCoor.x;
      }

      if (vUv.y > 0.0) {
        texCoor.y = -texCoor.y;
      }
      
      if (vUv.x >= vUv.y) {
        texCoor*=-1.0;
      }

      if (vUv.y >= -vUv.x) {
        texCoor*=-1.0;
      }

      if (vUv.y >= 0.5*vUv.x) {
        texCoor*=-1.0;
      }

      if (vUv.y >= -0.5*vUv.x) {
        texCoor*= -1.0;
      }

      if (vUv.y >= 2.0*vUv.x) {
        texCoor*= -1.0;
      }

      if (vUv.y >= -2.0*vUv.x) {
        texCoor*= -1.0;
      }

      // for texture coordinates match
      texCoor = texCoor+0.5;

      float scale = (cos(time/10000.0)+1.)/2.;

      vec4 color = texture2D(texture, texCoor*scale);
      
      gl_FragColor = vec4(color.r, color.r, 0.0, 1.0);
    }
  `*/

  fragment: `
    const float PI = 3.141592658;
    const float TAU = 2.0*PI;
    const float sections = 10.0;

    uniform sampler2D texture;
    uniform float time;
    uniform float realTime;
    uniform float iResolution;
    uniform float colorStrength;
    uniform vec3 backgroundColor;
    uniform float seed;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float peakValue;
    uniform int mode;

    varying vec2 vUv;

    /**
     * Randomness is also created by the difference between time and real time. Time is influenced by the audio, therefore its 
     * curve over time is unique for each audio piece provided as an input  
     **/

    vec3 HUEtoRGB (float H) {
      float R = abs(H * 6.0 - 3.0) - 1.;
      float G = 2. - abs(H * 6. - 2.);
      float B = 2. - abs(H * 6. - 4.);
      return vec3(R,G,B);
    }

    vec3 interpolate (vec3 start, vec3 end, float t) {
      return start + (end-start)*t;
    }

    /**
     * t is between [-1;1] 
     **/
    vec3 colorFrom2 (vec3 c1, vec3 c2, float t) {
      float u = abs(t); // distance from middle point, 0
      return interpolate(c1, c2, u);
    }

    float spike (float x)	{	
      float f = floor(x);
      if (mod(f, 2.0) == 0.0) return 1.0 - 2.0 * (x-f); 
      else return -1.0 + 2.0 * (x-f);	
    }

    vec3 clampColor (vec3 colorIn) {
      return vec3(clamp(colorIn.r, 0.0, 1.0), clamp(colorIn.g, 0.0, 1.0), clamp(colorIn.b, 0.0, 1.0));
    }

    vec3 invert (vec3 colorIn) {
      return vec3(1.0,1.0,1.0)-clampColor(colorIn);
    }

    float rand (const in vec2 uv) {
      const highp float a = 12.9898, b = 78.233, c = 43758.5453;
      highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
      return fract(sin(sn) * c);
    }

    vec3 HSVtoRGB (vec3 HSV) {
      vec3 RGB = HUEtoRGB(HSV.x);
      return ((RGB - 1.0) * HSV.y + 1.0) * HSV.z;
    }

    void main() {
      vec2 uvs = vec2(vUv.x, vUv.y/iResolution);

      // scale to add some randomness to the visuals 
      float scale = ((cos(realTime/(15000.0+seed))+1.0)/4.0+0.5)*1.2;
      vec2 pos = uvs*scale;

      // kaleidoscope 
      float rad = length(pos);
      float angle = atan(pos.y, pos.x) + length(uvs)*tan(time/20000.0);

      float ma = mod(angle, TAU/sections);
      ma = abs(ma - PI/sections);

      vec2 p = vec2(cos(ma), sin(ma))*rad +0.5;

      vec4 color = texture2D(texture, mod(p+sin(time/24000.0), 1.0));

      // color effects 
      //float hue = mod(length(uvs)*2.0, 1.0);
      //float rgb = HSVtoRGB(vec3(hue, 1.0, 1.0));

      float grey = (color.r+color.g+color.b)/3.0;
      grey = clamp(grey+0.2, 0.0, 1.0);
      grey = grey*grey;

      //float ang = angle + rad*3.0;
      //let nPos = vec2(cos(ang)*rad, sin(ang)*rad);

      float hue = mod(length(uvs)*2.0 + spike(time/5000.0), 1.0);
      vec3 hsv = vec3(hue, 1.0, 1.0);
      vec3 rgb = HSVtoRGB(hsv);
      rgb = rgb*colorStrength;

      vec3 foreground = colorFrom2(color1, color2, spike(realTime/6000.0 + rad));

      //vec3 finalColor = backgroundColor + rgb*grey;
      //vec3 finalColor = interpolate(backgroundColor, foreground, grey);

      if (mode == 1) {

        grey = grey*1.2;
      } else {
        grey = grey*1.0+peakValue*0.5;
      }

      vec3 fragColor = backgroundColor + foreground*(grey);

      // noise is being added to the whole comp 
      float nse = rand(vUv+cos(realTime)*15000.0);

      fragColor+= nse*(0.1+0.15*peakValue);

      gl_FragColor = vec4(fragColor, 1.0);
    }
  `
}