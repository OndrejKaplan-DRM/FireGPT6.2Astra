import * as THREE from 'three';

const pointVertex = /* glsl */`
  attribute float energy;
  attribute float cooling;
  varying float heat;
  varying float age;
  uniform float pixels;
  uniform float scale;
  void main() {
    vec4 p = modelViewMatrix * vec4(position, 1.);
    gl_Position = projectionMatrix * p;
    float screenScale = projectionMatrix[3][3] > .5 ? projectionMatrix[1][1] * .31 : 1. / max(.1, -p.z);
    gl_PointSize = clamp(pixels * scale * screenScale * (.78 + energy * .95), 1.5, 17.);
    heat = energy;
    age = cooling;
  }
`;

const pointFragment = /* glsl */`
  varying float heat;
  varying float age;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    float hot = exp(-d*d*13.);
    float halo = exp(-d*d*4.9) * .24;
    float alpha = (hot + halo) * heat * (1. - smoothstep(.78, 1., d));
    vec3 fresh = mix(vec3(1.9,.37,.06), vec3(5.4,2.45,.94), hot);
    vec3 cooled = mix(vec3(.42,.017,.003), vec3(2.9,.21,.022), hot);
    vec3 color = mix(fresh, cooled, smoothstep(.04, .89, age));
    gl_FragColor = vec4(color, alpha);
  }
`;

const lineVertex = /* glsl */`
  attribute float energy;
  attribute float cooling;
  varying float heat;
  varying float age;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    heat = energy;
    age = cooling;
  }
`;

const lineFragment = /* glsl */`
  varying float heat;
  varying float age;
  void main() {
    vec3 color = mix(vec3(3.6, .91, .23), vec3(.88, .043, .005), smoothstep(.08,.95,age));
    gl_FragColor = vec4(color, heat * .60);
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
  const maxSegments = 3;
  function streams(geometry, count) {
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('energy', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('cooling', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
    return geometry.attributes;
  }
  const p = streams(points, maxParticles);
  const l = streams(lines, maxParticles * maxSegments * 2);
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
    const segments = settings.quality === 'low' ? 1 : maxSegments;
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
        const wobble = (Math.sin(t * 9 + drift * 27) * .074 + Math.sin(t * 23 + phase * 14) * .016) * t;
        return [
          (cosine * dist + bend * t * t * .86 + wobble) * asset.width,
          asset.base + Math.max(-.03 / asset.height, arc) * asset.height,
          (sine * dist + Math.cos(t * 8 + theta) * .077 * t) * asset.depth,
        ];
      };
      const head = position(age);
      const trail = single || asset.burst ? .027 + streak * .066 : .009 + streak * .036;
      p.position.setXYZ(alive, ...head);
      p.energy.setX(alive, strength);
      p.cooling.setX(alive, age);
      let next = head;
      for (let segment = 0; segment < segments; segment++) {
        const u = segment / segments;
        const v = (segment + 1) / segments;
        const i = (alive * segments + segment) * 2;
        const t = Math.max(0, age - trail * v);
        const previous = position(t);
        l.position.setXYZ(i, ...next);
        l.position.setXYZ(i + 1, ...previous);
        l.energy.setX(i, strength * (1 - u) ** 1.5);
        l.energy.setX(i + 1, strength * (1 - v) ** 1.5);
        l.cooling.setX(i, Math.min(age + u * .55, 1));
        l.cooling.setX(i + 1, Math.min(age + v * .55, 1));
        next = previous;
      }
      alive++;
    }
    for (const attr of [...Object.values(p), ...Object.values(l)]) attr.needsUpdate = true;
    points.setDrawRange(0, alive);
    lines.setDrawRange(0, alive * segments * 2);
  }

  return { group, update, count: () => points.drawRange.count };
}
