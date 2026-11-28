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
  uniform vec4 burstLook;
  uniform vec3 boxMin;
  uniform vec3 boxMax;
  uniform float base;
  uniform float time;
  uniform float seed;
  uniform float bend;
  uniform float oxygen;
  uniform float emission;
  uniform float smoke;
  uniform float dustStrength;
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
    if (octaves >= 5) v += n3(p * 4.12 + 17.) * .022;
    if (octaves >= 6) v += n3(p * 8.33 + 23.) * .010;
    return v;
  }

  vec3 unproject(vec2 uv, float z) {
    vec4 h = invProjection * vec4(uv * 2. - 1., z * 2. - 1., 1.);
    return (worldMatrix * vec4(h.xyz / h.w, 1.)).xyz;
  }

  vec2 intersectBox(vec3 origin, vec3 direction) {
    vec3 inverse = sign(direction + vec3(1e-8)) / max(abs(direction), vec3(1e-6));
    vec3 t0 = (boxMin - origin) * inverse;
    vec3 t1 = (boxMax - origin) * inverse;
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

  vec3 flameColor(float core, float height, float folds, float flash) {
    const vec3 dullRed = vec3(1.04, .038, .0024);
    const vec3 amber = vec3(2.45, .43, .035);
    const vec3 warmWhite = vec3(5.6, 3.62, 1.72);
    float hot = clamp(core * .68 + folds * .26 - height * .18 + flash * .21, 0., 1.);
    vec3 rgb = mix(dullRed, amber, smoothstep(.05, .68, hot));
    return mix(rgb, warmWhite, smoothstep(.5, .96, hot));
  }

  float tongue(vec2 pos, vec2 root, vec2 drift, float h, float tall, float width) {
    float relative = clamp(h / tall, 0., 1.42);
    float neck = (1. - smoothstep(.04, 1.18, relative)) * width;
    vec2 spine = root * (1. - relative * .32) + drift * relative * relative;
    return neck - length((pos - spine) * vec2(1., 1.2));
  }

  vec4 fieldAt(vec3 world) {
    vec3 p = (world - vec3(0., base, 0.)) / extent;
    float h = p.y;
    float rise = max(h, 0.);
    bool wick = shape == 0;
    bool front = shape == 2;
    bool burst = shape == 3;
    float tick = time * (wick ? 1.05 : 1.10);
    vec3 flow = p;
    flow.x -= bend * pow(rise, 1.29) * (front ? .66 : .96);
    flow.z += bend * rise * .12;
    float vortexPhase = h * 6.8 - tick * 3.6 + seed * 6.2;
    float sweep = mix(.026, .085, min(rise, 1.)) * turbulence;
    flow.xz += vec2(sin(vortexPhase), cos(vortexPhase * .88)) * sweep;
    vec3 q = flow * vec3(5.7, 4.9, 6.0);
    vec3 warp = vec3(n3(q * .66 - vec3(0., tick * .91, 0.)),
                     n3(q * .61 + vec3(12.2, -tick * .72, 6.5)),
                     n3(q * .63 + vec3(7.6, -tick * .82, 11.1))) - .5;
    vec3 f = flow + warp * (wick ? .090 : .30) * turbulence * vec3(1., .55, 1.) * (.55 + rise);
    vec3 grainCoord = f * vec3(front ? 13.5 : 9.7, wick ? 3.7 : 10.2, front ? 10.6 : 9.5);
    grainCoord.y -= tick * (2.05 + .34 * rise);
    float grain = fbm(grainCoord + warp * 2.12);
    float taper = 1. - smoothstep(.21, 1.09, h);
    float radial = length(f.xz * vec2(2., 2.22));
    float heightMask = smoothstep(-.077, .085, h) * (1. - smoothstep(.8, 1.25, h));
    float body;

    if (wick) {
      float shoulder = mix(.29, .73, smoothstep(-.01, .35, h)) * taper;
      body = shoulder - radial + (grain - .48) * (.13 + turbulence * .28);
    } else if (front) {
      float footprint = .91 - length(f.xz * vec2(1.92, 2.13));
      float roots = n3(vec3(f.x * 8.7 + tick * .19, .46 - h * .53, f.z * 8.5 + 4.2));
      float pockets = n3(vec3(f.x * 15.5 + 5.2, h * 2.79 - tick * .71, f.z * 10.3 - 3.6));
      float localHeight = .24 + smoothstep(.22, .90, roots) * 1.27;
      body = footprint - rise / localHeight * .78 + (grain - .52) * 1.13 + (pockets - .58) * .42;
      heightMask *= mix(.54, 1., smoothstep(.33, .79, roots + grain * .27));
    } else {
      vec2 lead = vec2(sin(vortexPhase * .31), cos(vortexPhase * .37));
      float left = tongue(f.xz, vec2(-.173, .039), lead * .14, h, .79, .253);
      float right = tongue(f.xz, vec2(.156, -.079), -lead.yx * .15, h, 1.03, .241);
      float middle = tongue(f.xz, vec2(-.027, -.12), lead.yx * .11, h, 1.22, .218);
      body = max(max(left, right), middle) * 2.35 + (grain - .48) * .94;
    }

    float core = smoothstep(-.063, .44, body);
    float holes = smoothstep(wick ? .19 : .25, wick ? .55 : .66, grain + core * .105);
    float fineStructure = octaves > 3 ? n3(grainCoord * 2.18 + warp * 1.45) : grain;
    float plumeSheet = 1. - smoothstep(.045, .21, abs(grain * .82 + fineStructure * .18 - (.43 + core * .085)));
    float foldedSheet = wick ? 1. : plumeSheet;
    float flame = smoothstep(-.08, .16, body) * heightMask * holes *
                  mix(.29, 1., foldedSheet) * mix(.27, 1., oxygen);
    float smRise = max(0., h);
    vec3 s = flow + warp * (.31 + smRise * .23) * turbulence;
    s.x -= bend * smRise * smRise * .16;
    vec3 smokeCoord = s * vec3(front ? 9.4 : 6.75, 6.2, 6.7);
    smokeCoord.y -= tick * (1.26 + smRise * .12);
    float largeBillows = n3(smokeCoord * .53 + 9.);
    float clouds = fbm(smokeCoord + vec3(largeBillows * 2.0, -.61, largeBillows * 1.23));
    float smokeRadius = (front ? .55 : .30) + smRise * (front ? .33 : .48);
    smokeRadius *= mix(.72, 1.24, largeBillows);
    float smokeEnvelope = 1. - smoothstep(smokeRadius * .34, smokeRadius + .19, length(s.xz * 2.));
    float smokeStart = mix(.19, .03, clamp(soot + 1. - oxygen, 0., 1.));
    smokeEnvelope *= smoothstep(smokeStart, .65, h) * (1. - smoothstep(1.16, 2.05, h));
    float density = smokeEnvelope * smoothstep(.27, .76, clouds) * (1. - flame * .33);
    float dust = 0.;
    float flash = 0.;

    if (burst) {
      float age = clamp(time / duration, 0., 1.);
      float bloom = 1. - exp(-age * (21. + burstLook.x * 9.));
      float radius = .17 + .83 * bloom;
      float compact = burstLook.x;
      float center = .045 + bloom * mix(.21, .41, compact) + age * mix(.21, .63, compact);
      vec3 bubble = vec3(f.x * mix(1.83, 2.55, compact), (h - center) * mix(2.6, 1.63, compact),
                         f.z * mix(2.0, 2.63, compact));
      float lobes = n3(bubble * 3.3 + vec3(seed, -tick * 1.14, 4.)) - .47;
      float edge = radius - length(bubble) + lobes * .59 + (grain - .49) * .71;
      flash = smoothstep(0., .012, age) * exp(-age * burstLook.y);
      core = smoothstep(-.033, .50, edge);
      flame = smoothstep(-.066, .26, edge) * holes * mix(.58, 1.2, foldedSheet) *
              flash * 1.44 * smoothstep(-.08, .075, h);
      float darkRise = center + .065 + age * mix(.2, .46, compact);
      vec3 cap = vec3(s.x * mix(2.37, 1.57, age), (h - darkRise) * mix(2.13, 1.68, age), s.z * 1.99);
      float billow = max(
        1.04 * radius - length(cap + vec3(-.27, .13, .096)),
        .93 * radius - length(cap + vec3(.34, -.205, -.11))
      ) + (clouds - .47) * .91 + (largeBillows - .49) * .47;
      density = smoothstep(-.18, .61, billow) * smoothstep(.025, .19, age) *
                (1. - smoothstep(.58, .995, age)) * smoothstep(-.19, .19, h) * burstLook.z;
      float settling = smoothstep(0., .105, age) * (1. - smoothstep(.34, .82, age));
      float dustWidth = mix(.2, 1.53, 1. - exp(-age * 12.5));
      float floorVeil = dustWidth - length(vec3(s.x * 2.07, (h + .044 - age * .27) * 8.4, s.z * 2.16));
      dust = smoothstep(-.2, .6, floorVeil + (clouds - .5) * 1.52) *
             settling * smoothstep(-.17, -.035, h) * burstLook.w;
    }

    float sootiness = clamp(soot + (1. - oxygen) * .53, 0., 1.);
    float localLight = clamp(flame * 1.9 + (1. - smoothstep(.18, 1.25, h)) *
                             (burst ? flash : .74), 0., 1.);
    float lightSide = clamp(.58 + (clouds - n3(smokeCoord + vec3(-.57, .55, .41))) * 1.4
                      - s.x * .10, .12, .95);
    float dark = mix(.35, .040, sootiness);
    vec3 smokeRgb = mix(vec3(.94, .99, 1.04), vec3(1.09, 1., .92), sootiness) * dark * lightSide;
    smokeRgb += vec3(.38, .105, .025) * localLight * min(emission, 1.) * (.52 + clouds);
    vec3 dustRgb = vec3(.25, .197, .147) * mix(.72, 1.28, lightSide) +
                   vec3(.29, .132, .054) * localLight * min(emission, 1.);
    vec3 fireRgb = flameColor(core, rise, grain, flash);
    if (wick) {
      float blueHalo = (1. - smoothstep(.09, .40, h)) * smoothstep(.15, .42, radial) * .93;
      fireRgb = mix(fireRgb, vec3(.037, .133, 1.3), blueHalo);
      float waxDarkZone = 1. - .64 * (1. - smoothstep(.13, .39, radial)) * (1. - smoothstep(.08, .30, h));
      flame *= waxDarkZone;
    }
    float fireDensity = flame * emission * (wick ? 4.66 : 3.18);
    float smokeDensity = density * smoke * (1. + (1. - oxygen) * (burst ? .19 : 1.36)) * 2.29;
    float dustDensity = dust * dustStrength * 1.51;
    return vec4(fireRgb * fireDensity + smokeRgb * smokeDensity + dustRgb * dustDensity,
                fireDensity + smokeDensity + dustDensity);
  }

  vec2 refractRay(vec3 start, vec3 direction, float distance) {
    vec2 shift = vec2(0.);
    for (int i = 0; i < 3; i++) {
      vec3 p = (start + direction * distance * ((float(i) + .5) / 3.) - vec3(0., base, 0.)) / extent;
      p.x -= bend * pow(max(p.y, 0.), 1.24) * .95;
      float radius = mix(.25, .64, smoothstep(.1, 1.4, p.y));
      float mask = (1. - smoothstep(radius * .35, radius, length(p.xz))) *
                   smoothstep(.01, .48, p.y) * (1. - smoothstep(1.21, 2.01, p.y));
      vec3 q = p * vec3(12., 6.1, 11.) - vec3(0., time * 3.8, 0.);
      float n = n3(q + n3(q * .48 - 3.) * 1.6);
      shift += vec2(n3(q + vec3(.47, 0., .13)) - n, (n3(q + vec3(.01, .49, 0.)) - n) * .58) * mask;
    }
    return shift * min(distance / extent.y, 3.1) * thermal * .0095;
  }

  void main() {
    vec2 uv = screenUv;
    float depth = texture(sceneDepth, uv).r;
    vec3 origin = transparentOutput > .5 ? unproject(uv, 0.) : eye;
    vec3 direction = normalize(unproject(uv, .9999) - origin);
    vec2 hit = intersectBox(origin, direction);
    float near = max(hit.x, .0001);
    float far = hit.y;
    if (depth < .999995 && far > near) far = min(far, length(unproject(uv, depth) - origin));
    vec4 bg = texture(sceneColor, uv);
    vec3 scattering = vec3(0.);
    float transmittance = 1.0;

    if (far > near) {
      if (thermal > .001 && transparentOutput < .5) {
        bg = texture(sceneColor, uv + refractRay(origin + direction * near, direction, far - near));
      }
      if (emission + smoke + dustStrength > 0.) {
        float stepSize = (far - near) / float(steps);
        float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
        float distanceAt = near + stepSize * mix(.20, .81, dither);
        for (int i = 0; i < 96; i++) {
          if (i >= steps || transmittance < .009) break;
          vec3 p = origin + direction * distanceAt;
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
    eye: new THREE.Vector3(), extent: new THREE.Vector3(), burstLook: new THREE.Vector4(), boxMin: new THREE.Vector3(), boxMax: new THREE.Vector3(),
    base: 0, time: 0, seed: 0, bend: 0, oxygen: 1, emission: 0, smoke: 0, dustStrength: 0, soot: 0,
    turbulence: 0, thermal: 0, duration: 1, transparentOutput: 0, shape: 1, octaves: 4, steps: 32,
  };
  const uniforms = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { value }]));
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader, fragmentShader, uniforms,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
}
