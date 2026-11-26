import * as THREE from 'three';

const pointVertex = /* glsl */`
  attribute float energy;
  varying float heat;
  uniform float pixels;
  uniform float scale;
  void main() {
    vec4 p = modelViewMatrix * vec4(position, 1.);
    gl_Position = projectionMatrix * p;
    gl_PointSize = clamp(pixels * scale / max(.1, -p.z) * (.78 + energy * .95), 1.5, 17.);
    heat = energy;
  }
`;

const pointFragment = /* glsl */`
  varying float heat;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    float hot = exp(-d*d*13.);
    float halo = exp(-d*d*4.9) * .24;
    float alpha = (hot + halo) * heat * (1. - smoothstep(.78, 1., d));
    vec3 color = mix(vec3(2.1,.14,.012), vec3(5.4,1.45,.21), hot);
    gl_FragColor = vec4(color, alpha);
  }
`;

const lineVertex = /* glsl */`
  attribute float energy;
  varying float heat;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    heat = energy;
  }
`;

const lineFragment = /* glsl */`
  varying float heat;
  void main() {
    gl_FragColor = vec4(3.3, .64, .08, heat * .66);
  }
`;

function seeded(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

export function createParticles(maxParticles = 420) {
  const group = new THREE.Group();
  const points = new THREE.BufferGeometry();
  const lines = new THREE.BufferGeometry();
  function streams(geometry, count) {
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('energy', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
    return geometry.attributes;
  }
  const p = streams(points, maxParticles);
  const l = streams(lines, maxParticles * 2);
  const pointMaterial = new THREE.ShaderMaterial({
    vertexShader: pointVertex, fragmentShader: pointFragment,
    uniforms: { pixels: { value: 500 }, scale: { value: .01 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const lineMaterial = new THREE.ShaderMaterial({
    vertexShader: lineVertex, fragmentShader: lineFragment,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const heads = new THREE.Points(points, pointMaterial);
  const trails = new THREE.LineSegments(lines, lineMaterial);
  heads.frustumCulled = trails.frustumCulled = false;
  group.add(trails, heads);

  let lastSeed;
  let samples;
  function update(asset, settings, count, time, bend, pixels) {
    group.visible = settings.layers.sparks && asset.spark > 0;
    if (!group.visible) return;
    if (lastSeed !== settings.seed) {
      lastSeed = settings.seed;
      const random = seeded(settings.seed);
      samples = Array.from({ length: maxParticles }, () => Array.from({ length: 8 }, random));
    }
    const single = asset.id === 'spark';
    const amount = Math.min(maxParticles, Math.round(count * asset.spark * (single ? .37 : 1)));
    let alive = 0;
    pointMaterial.uniforms.pixels.value = pixels;
    pointMaterial.uniforms.scale.value = Math.max(asset.height, .33) * (single ? .032 : .012);
    for (let i = 0; i < amount; i++) {
      const [angle, place, phase, life, speed, flare, drift, streak] = samples[i];
      const lifeTime = asset.burst ? .55 + life * 1.42 : single ? .5 + life * .7 : .85 + life * 1.96;
      const age = asset.burst ? (time - .022 - phase * .33) / lifeTime : (time / lifeTime + phase) % 1;
      if (age <= 0 || age >= 1) continue;
      const theta = angle * Math.PI * 2;
      const cosine = Math.cos(theta);
      const sine = Math.sin(theta);
      const strength = Math.sin(Math.PI * age) ** .55 * (.22 + flare * .77);
      const position = (t) => {
        const dist = asset.burst ? .95 * (1 - Math.exp(-t * 2.6)) * (.1 + speed)
          : (single ? .025 : .18) * place + t * (.12 + .28 * speed);
        const arc = asset.burst ? (1.22 - .55 * t) * t * (.35 + speed * 1.3)
          : (single ? (2.62 - 2.18 * t) : 1.46 - t * .2) * t * (.31 + speed * .79);
        const wobble = Math.sin(t * 7 + drift * 27) * .074 * t;
        return [
          (cosine * dist + bend * t * t * .86 + wobble) * asset.width,
          asset.base + Math.max(-.03 / asset.height, arc) * asset.height,
          (sine * dist + Math.cos(t * 8 + theta) * .077 * t) * asset.depth,
        ];
      };
      const head = position(age);
      const tail = position(Math.max(0, age - (single || asset.burst ? .025 + streak * .05 : .012 + streak * .021)));
      p.position.setXYZ(alive, ...head);
      p.energy.setX(alive, strength);
      l.position.setXYZ(alive * 2, ...tail);
      l.position.setXYZ(alive * 2 + 1, ...head);
      l.energy.setX(alive * 2, 0);
      l.energy.setX(alive * 2 + 1, strength);
      alive++;
    }
    for (const attr of [p.position, p.energy, l.position, l.energy]) attr.needsUpdate = true;
    points.setDrawRange(0, alive);
    lines.setDrawRange(0, alive * 2);
  }

  return { group, update, count: () => points.drawRange.count };
}
