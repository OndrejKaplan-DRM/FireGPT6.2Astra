import * as THREE from 'three';

export function makeNoiseTexture(seed = 520934) {
  const size = 48;
  const bytes = new Uint8Array(size ** 3);
  let state = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[i] = state >>> 24;
  }
  const texture = new THREE.Data3DTexture(bytes, size, size, size);
  texture.format = THREE.RedFormat;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

const vertexShader = /* glsl */`
  out vec2 screenUv;
  void main() {
    screenUv = uv;
    gl_Position = vec4(position.xy, 0., 1.);
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;
  precision highp sampler3D;
  in vec2 screenUv;
  out vec4 outputColor;

  uniform sampler2D sceneColor;
  uniform sampler2D sceneDepth;
  uniform sampler3D noiseTexture;
  uniform mat4 invProjection;
  uniform mat4 worldMatrix;
  uniform vec3 eye;
  uniform vec3 extent;
  uniform vec3 boxMin;
  uniform vec3 boxMax;
  uniform float base;
  uniform float time;
  uniform float seed;
  uniform float bend;
  uniform float oxygen;
  uniform float emission;
  uniform float smoke;
  uniform float soot;
  uniform float turbulence;
  uniform float thermal;
  uniform float duration;
  uniform float transparentOutput;
  uniform int shape;
  uniform int octaves;
  uniform int steps;

  float n3(vec3 p) {
    return texture(noiseTexture, (p + vec3(.5 + seed * 11.3, .5 - seed * 4.2, .5)) / 48.).r;
  }

  float fbm(vec3 p) {
    float v = n3(p) * .54;
    p = p * 2.04 + vec3(11., 5., 3.);
    v += n3(p) * .26;
    p = p * 2.01 + vec3(3., 13., 7.);
    v += n3(p) * .13;
    if (octaves >= 4) v += n3(p * 2.03 + 7.) * .055;
    if (octaves >= 5) v += n3(p * 4.12 + 17.) * .025;
    return v;
  }

  vec3 unproject(vec2 uv, float z) {
    vec4 h = invProjection * vec4(uv * 2. - 1., z * 2. - 1., 1.);
    return (worldMatrix * vec4(h.xyz / h.w, 1.)).xyz;
  }

  vec2 intersectBox(vec3 direction) {
    vec3 inverse = sign(direction + vec3(1e-8)) / max(abs(direction), vec3(1e-6));
    vec3 t0 = (boxMin - eye) * inverse;
    vec3 t1 = (boxMax - eye) * inverse;
    vec3 near = min(t0, t1);
    vec3 far = max(t0, t1);
    return vec2(max(max(near.x, near.y), near.z), min(min(far.x, far.y), far.z));
  }

  vec3 filmic(vec3 color) {
    color = max(color, 0.);
    return clamp((color * (2.51 * color + .03)) / (color * (2.43 * color + .59) + .14), 0., 1.);
  }

  vec3 displayColor(vec3 color) {
    vec3 x = filmic(color);
    return mix(x * 12.92, 1.055 * pow(x, vec3(1. / 2.4)) - .055, step(vec3(.0031308), x));
  }

  vec3 flameColor(float core, float h, float field) {
    vec3 red = vec3(1.8, .028, .0019);
    vec3 orange = vec3(3.1, .29, .008);
    vec3 gold = vec3(4.9, 1.5, .082);
    vec3 white = vec3(6.6, 4.1, 1.41);
    float temp = clamp(.09 + core * .64 + field * .38 - h * .3, 0., 1.);
    vec3 rgb = mix(red, orange, smoothstep(.02, .44, temp));
    rgb = mix(rgb, gold, smoothstep(.42, .74, temp));
    return mix(rgb, white, smoothstep(.75, 1., temp) * (1. - .28 * h));
  }

  vec4 fieldAt(vec3 world) {
    vec3 p = (world - vec3(0., base, 0.)) / extent;
    float h = p.y;
    float rise = max(h, 0.);
    bool wick = shape == 0;
    bool front = shape == 2;
    bool burst = shape == 3;
    vec3 flow = p;
    flow.x -= bend * pow(rise, 1.32) * (front ? .73 : 1.08);
    flow.z += bend * rise * .14;
    float tick = time * (wick ? 1.21 : .89) + seed;
    float adv = tick * (burst ? .74 : 1.);
    vec3 q = flow * vec3(5.6, 5.3, 5.4);
    vec3 warp = vec3(n3(q * .64 - vec3(0., adv * .65, 0.)),
                     n3(q * .62 + vec3(14.2, -adv * .51, 5.5)),
                     n3(q * .62 + vec3(7.6, -adv * .59, 12.1))) - .5;
    float wiggle = (wick ? .12 : .28) * turbulence;
    vec3 f = flow + warp * wiggle * vec3(1., .68, 1.) * (.36 + rise);
    f.x += sin(h * 5.2 + tick * 1.61) * (wick ? .044 : .092) * rise;
    f.z += cos(h * 4.4 - tick * 1.43) * .075 * rise;
    vec3 grainCoord = f * vec3(front ? 15.3 : 8.5, wick ? 5.4 : 11.2, front ? 10.3 : 8.5);
    grainCoord.y -= adv * 2.23;
    float grain = fbm(grainCoord + warp * 1.87);
    float taper = pow(clamp(1.17 - rise * .9, .0, 1.), wick ? .72 : 1.04);
    float radial = length(f.xz * vec2(2., 2.));
    float body = taper * (wick ? .64 : .86) - radial + (grain - .47) * (wick ? .36 : 1.01);
    float heightMask = smoothstep(-.05, .09, h) * (1. - smoothstep(.65, 1.18, h));
    float oxygenLift = mix(.29, 1., oxygen);

    if (front) {
      vec2 strip = f.xz * vec2(1.79, 1.92);
      float lobes = .56 + .26 * sin(f.x * 23. + 1.4 * f.z + tick * .52)
                        + .13 * sin(f.z * 19. - f.x * 11. - tick * .81);
      float ribs = n3(vec3(f.x * 11.3 + tick * .17, 1.6 - h * .46, f.z * 9.2));
      body = .86 - length(strip) - rise * (1.1 - .73 * lobes)
             + (grain - .48) * (1.32 + ribs * .3) + (lobes - .54) * .32;
      heightMask *= smoothstep(.24, .69, grain + lobes * .33);
    }
    if (!wick && !front && !burst) {
      float branch = length((f.xz + vec2(.18 * sin(h * 5.9), .11 * cos(h * 7.1))) * 2.5);
      body = max(body, taper * .54 - branch + (grain - .49) * 1.03);
    }

    float core = smoothstep(-.10, .45, body);
    float holes = smoothstep(wick ? .18 : .28, wick ? .57 : .61, grain + core * .12);
    float flame = smoothstep(-.067, .16, body) * heightMask * holes * oxygenLift;
    float smokeRadius = (front ? .61 : .39) + rise * (front ? .33 : .49);
    vec3 s = flow + warp * (.26 + rise * .17) * turbulence;
    vec3 smokeCoord = s * vec3(front ? 11.5 : 6.75, 8.1, 7.6);
    smokeCoord.y -= adv * 1.35;
    float clouds = fbm(smokeCoord);
    float smokeEnvelope = 1. - smoothstep(smokeRadius * .53, smokeRadius + .16, length(s.xz * 2.));
    smokeEnvelope *= smoothstep(.12, .6, h) * (1. - smoothstep(1.19, 1.91, h));
    float density = smokeEnvelope * smoothstep(.27, .67, clouds) * (1. - flame * .58);

    if (burst) {
      float age = clamp(time / duration, 0., 1.);
      float bloom = 1. - exp(-age * 29.);
      float radius = .24 + .72 * bloom;
      float center = .09 + bloom * .3 + age * .73;
      vec3 bubble = vec3(f.x * 2.05, (h - center) * 1.78, f.z * 2.05);
      float distanceToCenter = length(bubble);
      float edge = radius - distanceToCenter + (grain - .5) * .74;
      float flash = smoothstep(0., .023, age) * exp(-age * 9.8);
      core = smoothstep(-.12, .49, edge);
      flame = smoothstep(-.04, .24, edge) * holes * flash * 1.74 * smoothstep(-.1, .02, h);
      float cloudEdge = radius * 1.22 - length(vec3(s.x * 1.83, (h - center - age * .11) * 1.65, s.z * 1.83));
      density = smoothstep(-.12, .56, cloudEdge + (clouds - .47) * .86) *
             smoothstep(.04, .23, age) * (1. - smoothstep(.58, .99, age)) * smoothstep(-.1, .13, h);
    }

    float localLight = clamp(flame * 1.6 + (1. - smoothstep(.04, 1.2, h)) * .9, 0., 1.);
    float lightSide = clamp(.67 + (clouds - n3(smokeCoord + vec3(.32, .63, .4))) * 1.8 - s.x * .18, .14, 1.);
    float dark = mix(.31, .084, clamp(soot + (1. - oxygen) * .46, 0., 1.));
    vec3 smokeRgb = vec3(1., .94, .88) * dark * lightSide;
    smokeRgb += vec3(.24, .048, .008) * localLight * min(emission, 1.) * (.7 + clouds);
    vec3 fireRgb = flameColor(core, rise, grain);
    if (wick) {
      float blue = (1. - smoothstep(.035, .18, h)) * smoothstep(.058, .39, radial) * .91;
      fireRgb = mix(fireRgb, vec3(.025, .23, 2.4), blue);
    }
    float fireDensity = flame * emission * (wick ? 4.0 : 3.4);
    float smokeDensity = density * smoke * (1. + (1. - oxygen) * 1.45) * 1.75;
    return vec4(fireRgb * fireDensity + smokeRgb * smokeDensity, fireDensity + smokeDensity);
  }

  void main() {
    vec2 uv = screenUv;
    float depth = texture(sceneDepth, uv).r;
    vec3 direction = normalize(unproject(uv, .9999) - eye);
    vec2 hit = intersectBox(direction);
    float near = max(hit.x, .0001);
    float far = hit.y;
    if (depth < .999995 && far > near) far = min(far, length(unproject(uv, depth) - eye));
    vec4 bg = texture(sceneColor, uv);
    vec3 scattering = vec3(0.);
    float transmittance = 1.0;

    if (far > near) {
      if (thermal > .001 && transparentOutput < .5) {
        vec3 heatPos = eye + direction * (near + far) * .5;
        vec3 heatRel = (heatPos - vec3(0., base, 0.)) / extent;
        heatRel.x -= bend * max(heatRel.y, 0.) * .83;
        float mask = (1. - smoothstep(.25, .92, length(heatRel.xz))) *
                     smoothstep(-.04, .44, heatRel.y) * (1. - smoothstep(1.14, 2.05, heatRel.y));
        vec2 noise = vec2(n3(heatPos * 4. + vec3(0., -time * 2.6, 0.)),
                          n3(heatPos * 4. + vec3(5., -time * 2.8, 2.)));
        bg = texture(sceneColor, uv + (noise - .5) * mask * thermal * .022);
      }
      if (emission + smoke > 0.) {
        float stepSize = (far - near) / float(steps);
        float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
        float distanceAt = near + stepSize * mix(.20, .81, dither);
        for (int i = 0; i < 64; i++) {
          if (i >= steps || transmittance < .009) break;
          vec3 p = eye + direction * distanceAt;
          vec4 local = fieldAt(p);
          float alpha = 1. - exp(-local.a * stepSize / max(extent.y * .65, .01));
          scattering += transmittance * alpha * local.rgb / max(local.a, .00001);
          transmittance *= 1. - alpha;
          distanceAt += stepSize;
        }
      }
    }
    float alpha = 1. - transmittance * (1. - bg.a);
    vec3 rgb = displayColor((scattering + bg.rgb * transmittance) / max(alpha, .00001));
    if (transparentOutput < .5) {
      float vignette = smoothstep(.28, 1.16, length((uv - .5) * vec2(1.43, 1.07)));
      rgb *= 1. - vignette * .40;
      outputColor = vec4(rgb, 1.);
    } else {
      outputColor = vec4(rgb, alpha);
    }
  }
`;

export function makeVolumeMaterial(target, noiseTexture) {
  const defaults = {
    sceneColor: target.texture, sceneDepth: target.depthTexture, noiseTexture,
    invProjection: new THREE.Matrix4(), worldMatrix: new THREE.Matrix4(),
    eye: new THREE.Vector3(), extent: new THREE.Vector3(), boxMin: new THREE.Vector3(), boxMax: new THREE.Vector3(),
    base: 0, time: 0, seed: 0, bend: 0, oxygen: 1, emission: 0, smoke: 0, soot: 0,
    turbulence: 0, thermal: 0, duration: 1, transparentOutput: 0, shape: 1, octaves: 4, steps: 32,
  };
  const uniforms = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { value }]));
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader, fragmentShader, uniforms,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
}
