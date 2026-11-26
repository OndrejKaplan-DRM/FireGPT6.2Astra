import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const LOD = {
  low: { round: 8, cross: 6, details: 0.23 },
  balanced: { round: 16, cross: 10, details: 0.58 },
  cinematic: { round: 28, cross: 16, details: 1 },
};

function randomStream(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeContext(name, quality) {
  const lod = Object.hasOwn(LOD, quality) ? LOD[quality] : LOD.balanced;
  const seed = Array.from(name).reduce((hash, char) => Math.imul(hash, 31) + char.charCodeAt(0), 317);
  const random = randomStream(seed);
  const range = (min, max) => min + random() * (max - min);
  const batches = new Map();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const transform = new THREE.Matrix4();
  const neutralUv = (count) => new THREE.BufferAttribute(new Float32Array(count * 2), 2);

  function surface(name, color, { roughness = 0.85, metalness = 0, heat = 0, variation = 0.12 } = {}) {
    const material = new THREE.MeshStandardMaterial({
      name, color, roughness, metalness, vertexColors: true,
      emissive: heat ? color : 0x000000, emissiveIntensity: heat,
    });
    batches.set(material, { variation, geometry: [] });
    return material;
  }

  function add(geometry, material, at = [0, 0, 0], euler = [0, 0, 0], size = [1, 1, 1]) {
    position.fromArray(at);
    if (euler.isQuaternion) rotation.copy(euler);
    else rotation.setFromEuler(new THREE.Euler(...euler));
    transform.compose(position, rotation, scale.fromArray(size));
    geometry.applyMatrix4(transform);
    if (!geometry.index) {
      const count = geometry.attributes.position.count;
      const index = count > 65535 ? new Uint32Array(count) : new Uint16Array(count);
      for (let vertex = 0; vertex < count; vertex++) index[vertex] = vertex;
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
    }
    const { variation, geometry: batch } = batches.get(material);
    const points = geometry.attributes.position;
    const incident = geometry.attributes.normal;
    const tint = new Float32Array(points.count * 3);
    const drift = range(-0.28, 0.28);
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i);
      const y = points.getY(i);
      const z = points.getZ(i);
      const grain = Math.sin(x * 37.4 + y * 7.1 + z * 16.3) * 0.35
        + Math.sin(x * 11.8 - y * 19.1 + z * 30.9) * 0.29
        + Math.sin(x * 5.2 + y * 11.5 - z * 4.9) * 0.37;
      const facing = incident.getY(i) * 0.15;
      const value = 1 - variation * (0.6 + grain + facing + drift);
      const offset = i * 3;
      tint[offset] = THREE.MathUtils.clamp(value + grain * variation * 0.04, 0, 1);
      tint[offset + 1] = THREE.MathUtils.clamp(value - grain * variation * 0.03, 0, 1);
      tint[offset + 2] = THREE.MathUtils.clamp(value - grain * variation * 0.08, 0, 1);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(tint, 3));
    if (!geometry.hasAttribute('uv')) geometry.setAttribute('uv', neutralUv(points.count));
    batch.push(geometry);
  }

  function box(size, at, material, rotation = [0, 0, 0]) {
    add(new THREE.BoxGeometry(...size), material, at, rotation);
  }

  function roundBox(size, at, material, amount = 0.05, rotation = [0, 0, 0]) {
    const shortest = Math.min(...size);
    const radius = Math.min(shortest * 0.48, amount);
    const geometry = new THREE.BoxGeometry(...size, 3, 3, 3);
    const vertex = geometry.attributes.position;
    const flat = size.map((side) => side / 2 - radius);
    const edge = new THREE.Vector3();
    const point = new THREE.Vector3();
    for (let i = 0; i < vertex.count; i++) {
      point.fromBufferAttribute(vertex, i);
      edge.set(
        THREE.MathUtils.clamp(point.x, -flat[0], flat[0]),
        THREE.MathUtils.clamp(point.y, -flat[1], flat[1]),
        THREE.MathUtils.clamp(point.z, -flat[2], flat[2]),
      );
      point.sub(edge).normalize().multiplyScalar(radius).add(edge);
      vertex.setXYZ(i, point.x, point.y, point.z);
    }
    geometry.computeVertexNormals();
    add(geometry, material, at, rotation);
  }

  function cylinder(top, base, length, at, material, segments = lod.round, rotation = [0, 0, 0]) {
    add(new THREE.CylinderGeometry(top, base, length, segments), material, at, rotation);
  }

  function rod(from, to, top, base, material, segments = lod.cross, bark = 0) {
    const origin = new THREE.Vector3().fromArray(from);
    const end = new THREE.Vector3().fromArray(to);
    const axis = new THREE.Vector3().subVectors(end, origin);
    const length = axis.length();
    if (length < 0.000001) return;
    const rotation = new THREE.Quaternion().setFromUnitVectors(UP, axis.multiplyScalar(1 / length));
    const center = origin.lerp(end, 0.5).toArray();
    if (bark === 0) {
      cylinder(top, base, length, center, material, segments, rotation);
      return;
    }
    const geometry = new THREE.CylinderGeometry(top, base, length, segments, 4);
    const points = geometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i);
      const y = points.getY(i);
      const z = points.getZ(i);
      const angle = Math.atan2(z, x);
      const lines = 0.49 * Math.sin(angle * 5 + y * 0.9)
        + 0.35 * Math.sin(angle * 8 + y * 4.1)
        + 0.16 * Math.cos(angle * 3 - y * 11.6);
      const spread = 1 + bark * lines;
      points.setXYZ(i, x * spread, y, z * spread);
    }
    geometry.computeVertexNormals();
    add(geometry, material, center, rotation);
  }

  function rock(at, size, material, detail = 0) {
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const points = geometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i);
      const y = points.getY(i);
      const z = points.getZ(i);
      const waveform = 1 + 0.16 * Math.sin(x * 5.4 + y * 6.2 + z * 4.8) + 0.06 * Math.cos(x * 17 - z * 8);
      points.setXYZ(i, x * waveform, y * waveform, z * waveform);
    }
    geometry.computeVertexNormals();
    add(geometry, material, at, [range(0, Math.PI), range(0, Math.PI), range(0, Math.PI)], size);
  }

  function finish() {
    const result = new THREE.Group();
    result.name = name;
    for (const [material, { geometry }] of batches) {
      if (geometry.length === 0) {
        material.dispose();
        continue;
      }
      const merged = geometry.length === 1 ? geometry[0] : mergeGeometries(geometry);
      if (geometry.length > 1) geometry.forEach((primitive) => primitive.dispose());
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = material.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      result.add(mesh);
    }
    return result;
  }

  return { lod, random, range, surface, add, box, roundBox, cylinder, rod, rock, finish };
}

function candle(c) {
  const wax = c.surface('Beeswax', 0xddb481, { roughness: 0.7, variation: 0.13 });
  const warmWax = c.surface('Melted wax', 0xedb976, { roughness: 0.48, variation: 0.09 });
  const wick = c.surface('Cotton wick', 0x29201b, { variation: 0.55 });
  c.cylinder(0.106, 0.113, 0.51, [0, 0.255, 0], wax);
  c.cylinder(0.095, 0.104, 0.021, [0, 0.51, 0], warmWax);
  c.rod([0, 0.51, 0], [0.006, 0.553, -0.004], 0.0035, 0.0055, wick);
  for (let i = 0; i < Math.ceil(11 * c.lod.details); i++) {
    const angle = c.range(0, TAU);
    const x = 0.106 * Math.cos(angle);
    const z = 0.106 * Math.sin(angle);
    const end = c.range(0.31, 0.49);
    c.rod([x * 1.03, end, z * 1.03], [x, 0.518, z], c.range(0.009, 0.014), 0.002, warmWax);
  }
}

function torch(c) {
  const wood = c.surface('Scorched ashwood', 0x563121, { variation: 0.41 });
  const burnt = c.surface('Charred cloth', 0x211b19, { variation: 0.65 });
  const band = c.surface('Torch binding', 0x574136, { variation: 0.36 });
  const metal = c.surface('Forged stand', 0x333339, { metalness: 0.64, variation: 0.35 });
  c.cylinder(0.22, 0.275, 0.045, [0, 0.0225, 0], metal);
  c.cylinder(0.065, 0.095, 0.12, [0, 0.09, 0], metal);
  c.rod([-0.012, 0.11, 0], [0.023, 1.15, 0.01], 0.043, 0.036, wood);
  c.rod([0.022, 0.91, 0.009], [0.025, 1.24, 0.014], 0.117, 0.076, burnt);
  for (let i = 0; i < 6; i++) {
    const profile = 0.079 + i * 0.006;
    c.cylinder(profile, profile, 0.014, [0.022, 0.925 + i * 0.049, 0.01], band, c.lod.round, [0, 0, 0.045 * Math.sin(i * 2.3)]);
  }
  for (let i = 0; i < Math.ceil(12 * c.lod.details); i++) {
    const a = c.range(0, TAU);
    c.rock([0.02 + Math.cos(a) * 0.079, c.range(1.19, 1.246), Math.sin(a) * 0.079], [0.039, 0.018, 0.031], burnt);
  }
}

function campfire(c) {
  const stone = c.surface('River stone', 0x514747, { variation: 0.46 });
  const wood = c.surface('Cracked bark', 0x352521, { variation: 0.5 });
  const core = c.surface('Wood grain', 0x674534, { variation: 0.42 });
  const char = c.surface('Charcoal', 0x1b191b, { variation: 0.55 });
  const ember = c.surface('Live embers', 0xff501a, { heat: 1.45, variation: 0.47 });
  const emberEdge = c.surface('Cooling embers', 0x84220c, { heat: 0.65, variation: 0.37 });
  const stones = 6 + Math.round(c.lod.details * 10);
  for (let i = 0; i < stones; i++) {
    const angle = i / stones * TAU + c.range(-0.075, 0.075);
    const radius = c.range(0.62, 0.72);
    c.rock([Math.cos(angle) * radius, c.range(0.08, 0.13), Math.sin(angle) * radius],
      [c.range(0.13, 0.22), c.range(0.08, 0.16), c.range(0.12, 0.19)], stone, Number(c.lod.details >= 0.58));
  }
  for (let i = 0; i < 5; i++) {
    const angle = 0.7 + i * 1.37;
    const dir = [Math.cos(angle), Math.sin(angle)];
    const half = c.range(0.44, 0.56);
    const level = 0.085 + i * 0.038;
    const cross = i % 2 ? 0.095 : -0.055;
    const here = (distance, lift = 0, spread = 0) => [
      dir[0] * distance - dir[1] * (cross + spread),
      level + lift + distance * 0.04,
      dir[1] * distance + dir[0] * (cross + spread),
    ];
    c.rod(here(-half), here(half), 0.076, 0.103, wood, c.lod.round, 0.24);
    const offset = i % 2 === 0 ? 1 : -1;
    c.rod(here(offset * (half - 0.01)), here(offset * (half + 0.006)), 0.062, 0.069, core);
    const strips = 2 + Math.round(c.lod.details * 7);
    for (let j = 0; j < strips; j++) {
      const spread = c.range(-0.052, 0.052);
      const from = c.range(-half, half - 0.12);
      const to = Math.min(half, from + c.range(0.12, 0.58));
      const lift = c.range(0.058, 0.088);
      c.rod(here(from, lift, spread), here(to, lift, spread), 0.002, c.range(0.007, 0.019), j % 3 === 1 ? emberEdge : char, 5);
    }
  }
  for (let i = 0; i < Math.ceil(68 * c.lod.details); i++) {
    const angle = c.range(0, TAU);
    const radius = c.range(0.01, 0.57);
    const width = c.range(0.015, 0.057);
    c.rock([Math.cos(angle) * radius, c.range(0.016, 0.115), Math.sin(angle) * radius],
      [width, width * 0.6, width * 0.7], i % 4 === 0 ? ember : (i % 3 === 0 ? emberEdge : char));
  }
}

function hay(c) {
  const straw = c.surface('Compressed straw', 0x9b652a, { variation: 0.53 });
  const strands = c.surface('Loose straw', 0x88612c, { variation: 0.7 });
  const light = c.surface('Dry stalks', 0xb79045, { variation: 0.48 });
  const char = c.surface('Charred straw', 0x3e2719, { variation: 0.65 });
  const binding = c.surface('Bale binding', 0x51391e, { variation: 0.52 });
  const bales = [
    { x: -1.02, y: 0.24, z: 0.04, yaw: -0.05, w: 1.02 },
    { x: 0.03, y: 0.24, z: -0.11, yaw: 0.06, w: 1.05 },
    { x: 1.06, y: 0.24, z: 0.03, yaw: -0.08, w: 0.98 },
    { x: -0.56, y: 0.71, z: -0.08, yaw: 0.07, w: 1.1 },
    { x: 0.56, y: 0.71, z: 0.01, yaw: -0.09, w: 1.05 },
  ];
  for (const { x, y, z, yaw, w } of bales) {
    c.roundBox([w, 0.48, 0.84], [x, y, z], straw, 0.09, [0, yaw, 0]);
    for (const offset of [-0.23, 0.23]) {
      c.box([0.009, 0.005, 0.85], [x + offset, y + 0.236, z], binding, [0, yaw, 0]);
      c.box([0.009, 0.478, 0.012], [x + offset, y, z + 0.414 - Math.sin(yaw) * offset], binding, [0, yaw, 0]);
    }
    for (let i = 0; i < Math.ceil(133 * c.lod.details); i++) {
      const sx = c.range(-w * 0.43, w * 0.43);
      const sy = c.range(-0.20, 0.235);
      const front = i % 3 === 0 ? -1 : 1;
      const sz = front * c.range(0.402, 0.438) - Math.sin(yaw) * sx;
      const start = [x + sx, y + sy, z + sz];
      const end = [
        start[0] + Math.min(c.range(-0.17, 0.17), w * 0.47 - sx),
        start[1] + c.range(-0.025, 0.025),
        start[2] + c.range(-0.021, 0.037),
      ];
      const material = i % 5 === 0 ? light : (sy > 0.09 && i % 3 === 0 ? char : strands);
      c.rod(start, end, 0.0012, c.range(0.0019, 0.004), material, 3);
    }
  }
}

function tireGeometry(radius, tube, round, cross, rotation = [0, 0, 0]) {
  const geometry = new THREE.TorusGeometry(radius, tube, cross, round);
  const points = geometry.attributes.position;
  const transform = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
  const point = new THREE.Vector3();
  for (let i = 0; i < points.count; i++) {
    point.fromBufferAttribute(points, i);
    const angle = Math.atan2(point.y, point.x);
    const tread = (0.5 + 0.5 * Math.cos(angle * (round / 2))) ** 4;
    const height = Math.atan2(point.z, Math.hypot(point.x, point.y) - radius);
    const outer = 0.5 + 0.5 * Math.cos(height);
    const deform = tread * outer * outer * tube * 0.22;
    point.x += Math.cos(angle) * deform;
    point.y += Math.sin(angle) * deform;
    point.z *= 0.86;
    point.applyQuaternion(transform);
    points.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function tires(c) {
  const rubber = c.surface('Rubber carcass', 0x232128, { roughness: 0.92, variation: 0.54 });
  const sidewall = c.surface('Tire shoulder', 0x37333a, { roughness: 0.85, variation: 0.34 });
  const slag = c.surface('Melted rubber', 0x211a19, { roughness: 0.58, variation: 0.65 });
  const stack = [
    [-0.81, 0.12, 0.07, 0.43, 0.007, 0.00, 0.05],
    [-0.76, 0.31, 0.09, 0.41, 0.09, 0.05, -0.04],
    [-0.71, 0.51, 0.05, 0.41, -0.15, 0.19, 0.03],
    [0.37, 0.13, 0.27, 0.43, 0.06, -0.019, 0.13],
    [0.72, 0.34, -0.11, 0.43, 0.37, 0.21, 0.30],
    [0.08, 0.41, -0.42, 0.43, -0.54, 0.15, -0.39],
  ];
  for (const [x, y, z, radius, rx, ry, rz] of stack) {
    const orientation = [Math.PI / 2 + rx, ry, rz];
    c.add(tireGeometry(radius, 0.104, c.lod.round * 2, c.lod.cross, orientation), rubber, [x, y, z]);
    c.add(new THREE.TorusGeometry(radius - 0.042, 0.012, 5, c.lod.round * 2), sidewall,
      [x, y + 0.075, z], orientation);
  }
  for (let i = 0; i < Math.ceil(25 * c.lod.details); i++) {
    c.rock([c.range(-1.1, 1.14), c.range(0.022, 0.05), c.range(-0.5, 0.55)], [0.12, 0.026, 0.098], slag);
  }
}

function spill(c) {
  const liquid = c.surface('Oil sheen', 0x40372d, { roughness: 0.2, metalness: 0.54, variation: 0.44 });
  const edge = c.surface('Spill edge', 0x60513b, { roughness: 0.26, metalness: 0.4, variation: 0.45 });
  const sheen = c.surface('Reflective film', 0x58535a, { roughness: 0.27, metalness: 0.73, variation: 0.4 });
  function patch(cx, cz, xSize, zSize, level, material, phase) {
    const shape = new THREE.Shape();
    const count = c.lod.round * 2 + 4;
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU;
      const organic = 1 + 0.11 * Math.sin(a * 3 + phase) + 0.075 * Math.cos(a * 5 - phase * 2) + 0.04 * Math.sin(a * 8);
      const x = Math.cos(a) * xSize * organic;
      const z = Math.sin(a) * zSize * organic;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
    c.add(new THREE.ShapeGeometry(shape), material, [cx, level, cz], [-Math.PI / 2, 0, 0]);
  }
  patch(0, 0, 1.45, 0.77, 0.012, edge, 1.7);
  patch(0, 0, 1.41, 0.733, 0.017, liquid, 1.7);
  patch(0.28, -0.35, 0.50, 0.24, 0.018, sheen, 2.9);
  patch(-0.63, 0.15, 0.27, 0.37, 0.019, liquid, 3.1);
  patch(1.28, -0.57, 0.11, 0.072, 0.016, liquid, 0.6);
  patch(-1.19, 0.57, 0.095, 0.063, 0.016, sheen, 1.2);
}

function panel(c, points, material, facing) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(points.flat());
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const a = new THREE.Vector3().fromArray(points[0]);
  const b = new THREE.Vector3().fromArray(points[1]).sub(a);
  const d = new THREE.Vector3().fromArray(points[2]).sub(a);
  const backwards = b.cross(d).dot(new THREE.Vector3().fromArray(facing)) < 0;
  const index = [];
  for (let i = 1; i < points.length - 1; i++) {
    if (backwards) index.push(0, i + 1, i);
    else index.push(0, i, i + 1);
  }
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  c.add(geometry, material);
}

function car(c) {
  const panelPaint = c.surface('Heat-damaged paint', 0x48332d, { roughness: 0.65, metalness: 0.43, variation: 0.39 });
  const frame = c.surface('Steel frame', 0x30292b, { roughness: 0.65, metalness: 0.6, variation: 0.45 });
  const hood = c.surface('Bare sheet metal', 0x563d35, { roughness: 0.56, metalness: 0.61, variation: 0.49 });
  const glass = c.surface('Blackened glass', 0x2a3036, { roughness: 0.27, metalness: 0.42, variation: 0.26 });
  const rub = c.surface('Tire compound', 0x202025, { roughness: 0.91, variation: 0.53 });
  const alloy = c.surface('Oxidized alloy', 0x565055, { roughness: 0.66, metalness: 0.55, variation: 0.32 });
  const lens = c.surface('Clouded lamps', 0x645146, { roughness: 0.35, metalness: 0.25, variation: 0.29 });
  const lensRed = c.surface('Fractured tail lamps', 0x4e1917, { roughness: 0.55, variation: 0.31 });
  const cuts = c.surface('Panel seams', 0x252126, { roughness: 0.9, metalness: 0.32, variation: 0.35 });
  const stations = [
    { x: -2.04, low: 0.29, sill: 0.52, top: 0.65, width: 0.72 },
    { x: -1.85, low: 0.28, sill: 0.61, top: 0.72, width: 0.84 },
    { x: -1.18, low: 0.64, sill: 0.69, top: 0.78, width: 0.87 },
    { x: -0.73, low: 0.31, sill: 0.64, top: 0.75, width: 0.83 },
    { x: 0.65, low: 0.28, sill: 0.6, top: 0.71, width: 0.84 },
    { x: 1.21, low: 0.6, sill: 0.65, top: 0.73, width: 0.87 },
    { x: 1.8, low: 0.27, sill: 0.58, top: 0.64, width: 0.83 },
    { x: 2.05, low: 0.3, sill: 0.54, top: 0.59, width: 0.72 },
  ];
  const section = ({ x, low, sill, top, width }) => [
    [x, low, -width * 0.92], [x, sill, -width], [x, top, -width * 0.83],
    [x, top, width * 0.83], [x, sill, width], [x, low, width * 0.92],
  ];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = section(stations[i]);
    const b = section(stations[i + 1]);
    const facing = [[0, 0, -1], [0, 1, -1], [0, 1, 0], [0, 1, 1], [0, 0, 1], [0, -1, 0]];
    for (let j = 0; j < facing.length; j++) {
      const next = (j + 1) % facing.length;
      const material = j === 2 && i % 2 === 0 ? hood : (j === 5 ? frame : panelPaint);
      panel(c, [a[j], a[next], b[next], b[j]], material, facing[j]);
    }
  }
  panel(c, section(stations[0]), frame, [-1, 0, 0]);
  panel(c, section(stations.at(-1)), frame, [1, 0, 0]);
  c.roundBox([0.15, 0.11, 1.4], [-1.99, 0.365, 0], frame, 0.035);
  c.roundBox([0.15, 0.12, 1.43], [2, 0.365, 0], frame, 0.035);
  c.roundBox([1.24, 0.076, 1.19], [-0.18, 1.115, 0], hood, 0.032, [0, 0, 0.018]);
  for (const sign of [-1, 1]) {
    const z = sign;
    const fore = [-1.16, 0.755, z * 0.687];
    const highFore = [-0.79, 1.105, z * 0.554];
    const highAft = [0.42, 1.127, z * 0.54];
    const aft = [0.96, 0.72, z * 0.667];
    const midHigh = [-0.14, 1.116, z * 0.548];
    const midLow = [-0.11, 0.732, z * 0.687];
    panel(c, [fore, highFore, highAft, aft], glass, [0, 0, sign]);
    c.rod(fore, highFore, 0.034, 0.046, frame, 5);
    c.rod(highAft, aft, 0.049, 0.037, frame, 5);
    c.rod(midLow, midHigh, 0.028, 0.044, frame, 5);
    c.rod(fore, aft, 0.018, 0.017, frame, 4);
    c.rod([-0.11, 0.713, z * 0.77], [-0.09, 0.3, z * 0.78], 0.006, 0.005, cuts, 4);
    c.box([0.15, 0.026, 0.04], [-0.31, 0.61, z * 0.826], frame);
    c.roundBox([0.18, 0.067, 0.11], [-0.87, 0.78, z * 0.817], frame, 0.03);
    c.box([0.021, 0.118, 0.29], [-2.043, 0.528, z * 0.514], lens);
    c.box([0.021, 0.099, 0.31], [2.05, 0.514, z * 0.514], lensRed);
    for (const x of [-1.23, 1.25]) {
      const facing = [Math.PI / 2, 0, 0];
      c.add(tireGeometry(0.261, 0.082, c.lod.round * 2, c.lod.cross), rub, [x, 0.33, z * 0.752], [], [1, 1, 1.65]);
      c.cylinder(0.225, 0.225, 0.2, [x, 0.33, z * 0.754], frame, c.lod.round, facing);
      c.cylinder(0.184, 0.189, 0.022, [x, 0.33, z * 0.861], alloy, c.lod.round, facing);
      c.cylinder(0.079, 0.079, 0.027, [x, 0.33, z * 0.884], frame, c.lod.cross, facing);
      for (let i = 0; i < 5; i++) {
        const theta = TAU * (i + 0.13) / 5;
        const rotation = [0, 0, theta + 0.2];
        c.box([0.088, 0.036, 0.025], [x + Math.cos(theta) * 0.129, 0.33 + Math.sin(theta) * 0.129, z * 0.88], frame, rotation);
      }
    }
  }
  panel(c, [[-1.16, 0.755, -0.687], [-0.79, 1.105, -0.554], [-0.79, 1.105, 0.554], [-1.16, 0.755, 0.687]], glass, [-1, 0.8, 0]);
  panel(c, [[0.42, 1.127, -0.54], [0.96, 0.72, -0.667], [0.96, 0.72, 0.667], [0.42, 1.127, 0.54]], glass, [1, 0.8, 0]);
  c.box([0.031, 0.082, 0.412], [-2.054, 0.45, 0], cuts);
  c.box([0.026, 0.076, 0.27], [2.065, 0.472, 0], alloy);
}

function drum(c) {
  const steel = c.surface('Weathered rolled steel', 0x534542, { roughness: 0.61, metalness: 0.61, variation: 0.48 });
  const edge = c.surface('Rust rims', 0x765040, { roughness: 0.77, metalness: 0.45, variation: 0.55 });
  const carbon = c.surface('Sooted lid', 0x2e2625, { roughness: 0.82, metalness: 0.32, variation: 0.38 });
  const patina = c.surface('Oxide flakes', 0x53332b, { roughness: 0.92, metalness: 0.18, variation: 0.39 });
  c.cylinder(0.399, 0.408, 0.96, [0, 0.49, 0], steel);
  for (const y of [0.024, 0.119, 0.345, 0.66, 0.871, 0.976]) {
    c.add(new THREE.TorusGeometry(0.4, y > 0.95 || y < 0.05 ? 0.024 : 0.015, c.lod.cross, c.lod.round), edge, [0, y, 0], [Math.PI / 2, 0, 0]);
  }
  c.cylinder(0.378, 0.379, 0.016, [0, 0.988, 0], carbon);
  for (let i = 0; i < Math.ceil(30 * c.lod.details); i++) {
    const a = c.range(0, TAU);
    const y = c.range(0.12, 0.83);
    const length = c.range(0.08, 0.21);
    const w = c.range(0.009, 0.032);
    const pt = (angle, height) => [Math.cos(angle) * 0.406, height, Math.sin(angle) * 0.406];
    panel(c, [pt(a - w, y), pt(a + w, y + 0.014), pt(a, y + length)], patina, [Math.cos(a), 0, Math.sin(a)]);
  }
}

function cylinderProp(c) {
  const enamel = c.surface('Scuffed enamel', 0x4c3c35, { roughness: 0.64, metalness: 0.5, variation: 0.39 });
  const dark = c.surface('Scorched coating', 0x342c2a, { roughness: 0.7, metalness: 0.54, variation: 0.43 });
  const points = [
    [0, 0.02], [0.239, 0.02], [0.268, 0.065], [0.271, 0.73],
    [0.26, 0.83], [0.217, 0.91], [0.145, 0.969], [0.062, 0.988], [0, 0.99],
  ];
  c.add(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), c.lod.round), enamel);
  c.cylinder(0.269, 0.257, 0.052, [0, 0.044, 0], dark);
}

function forest(c) {
  const bark = c.surface('Pine bark', 0x383027, { variation: 0.63 });
  const bare = c.surface('Dead branches', 0x2c2524, { variation: 0.71 });
  const tips = c.surface('Needle clusters', 0x373b30, { variation: 0.62 });
  const shadow = c.surface('Dense needles', 0x30372e, { variation: 0.61 });
  const pineGreen = c.surface('Dry pine needles', 0x44412e, { variation: 0.58 });
  const trees = [
    [-3.56, -2.22, 3.82, 0.66], [-2.39, -2.01, 4.46, 0.86], [-1.02, -2.83, 3.11, 0.8],
    [0.42, -2.74, 4.17, 0.91], [2.04, -2.65, 3.55, 0.68], [3.34, -1.86, 4.22, 0.73],
    [-2.67, 0.78, 3.29, 0.77], [2.91, 0.52, 2.91, 0.69], [-1.55, -0.63, 2.55, 0.55],
    [1.65, -0.95, 3.06, 0.7],
  ];

  function foliage(at, length, width, height, angle, material) {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const narrowing = 0.45 + 0.55 * (1 - x);
      vertices.setY(i, vertices.getY(i) * narrowing - x * 0.4);
      vertices.setZ(i, vertices.getZ(i) * narrowing);
    }
    geometry.computeVertexNormals();
    c.add(geometry, material, at, [0, -angle, 0], [length, height, width]);
  }

  for (const [x, z, height, width] of trees) {
    const twist = c.range(-0.18, 0.18);
    const slope = c.range(-0.19, 0.19);
    const pt = (y) => [x + slope * (y / height), y, z + twist * (y / height)];
    c.rod(pt(0), pt(height), 0.016, height * 0.033, bark, c.lod.cross);
    const dry = x === -1.55 || x === 1.65;
    const layers = dry ? 4 : 4 + Math.round(2 * c.lod.details);
    for (let tier = 0; tier < layers; tier++) {
      const f = tier / layers;
      const y = height * (0.36 + f * 0.57);
      const radius = width * (1 - f * 0.85);
      const center = pt(y);
      const branchCount = 4 + Math.floor(c.lod.details * 3);
      for (let i = 0; i < branchCount; i++) {
        const a = i / branchCount * TAU + y * 2.26 + c.range(-0.12, 0.12);
        const extent = radius * c.range(0.73, 1.41);
        const pitch = c.range(-0.29, 0.055);
        const tip = [center[0] + Math.cos(a) * extent, y + pitch, center[2] + Math.sin(a) * extent];
        c.rod(center, tip, 0.006, 0.042 - f * 0.023, bare, 4);
        if (dry && i % 4 !== 0) continue;
        const leaf = i % 4 === 0 ? pineGreen : (i % 3 === 0 ? tips : shadow);
        const fan = 3 + Math.floor(c.lod.details * 3);
        for (let j = 0; j < fan; j++) {
          const t = 0.25 + j * 0.62 / fan;
          const pitch = a + (j % 2 === 0 ? 0.67 : -0.67) * (1 - t * 0.56);
          const length = extent * c.range(0.3, 0.51) * (1 - t * 0.5);
          const at = [
            center[0] * (1 - t) + tip[0] * t + Math.cos(pitch) * length * 0.52,
            y - t * 0.07 + 0.025 + c.range(-0.055, 0.078),
            center[2] * (1 - t) + tip[2] * t + Math.sin(pitch) * length * 0.52,
          ];
          foliage(at, length, length * 0.43, Math.min(0.19, length * 0.42), pitch, j % 4 === 1 ? tips : leaf);
        }
      }
    }
    if (!dry) {
      c.rod(pt(height * 0.79), pt(height * 1.018), 0.011, width * 0.29, shadow, c.lod.cross, 0.22);
    }
  }
}

function house(c) {
  const siding = c.surface('Smoked timber siding', 0x5e4d40, { variation: 0.59 });
  const darkSiding = c.surface('Blackened timber siding', 0x392e2c, { variation: 0.62 });
  const wood = c.surface('Exposed roof frame', 0x40312c, { variation: 0.61 });
  const roof = c.surface('Weathered slate roof', 0x3e3638, { variation: 0.54 });
  const brightRoof = c.surface('Roof weathering', 0x504245, { variation: 0.58 });
  const char = c.surface('Soot deposits', 0x282326, { variation: 0.68 });
  const brick = c.surface('Discolored brick', 0x694538, { variation: 0.48 });
  const glass = c.surface('Dark window well', 0x232027, { roughness: 0.51, variation: 0.26 });
  const lit = c.surface('Warm window light', 0xf9752e, { heat: 0.57, roughness: 0.69, variation: 0.18 });
  const stone = c.surface('Foundation', 0x494148, { variation: 0.63 });
  const depth = 1.55;
  const eave = 2.13;
  const ridge = 3.37;
  const halfWidth = 2.9;
  c.box([5.8, 0.18, 3.13], [0, 0.09, 0], stone);
  const windows = [
    { left: -2.43, right: -1.29, bottom: 0.91, top: 1.8 },
    { left: 1.19, right: 2.34, bottom: 0.91, top: 1.8 },
    { left: -0.48, right: 0.49, bottom: 0.18, top: 1.74 },
  ];

  function span(parts, left, right) {
    return parts.flatMap(([a, b]) => {
      if (a >= right || b <= left) return [[a, b]];
      return [[a, Math.max(a, left)], [Math.min(b, right), b]].filter(([p, q]) => q - p > 0.001);
    });
  }

  const rows = c.lod.details < 0.3 ? 12 : 18;
  const rowSize = (eave - 0.17) / rows;
  for (let row = 0; row < rows; row++) {
    const bottom = 0.17 + row * rowSize;
    const height = bottom + rowSize * 0.49;
    let sections = [[-halfWidth, halfWidth]];
    for (const { left, right, bottom: sill, top } of windows) {
      if (bottom + rowSize > sill && bottom < top) sections = span(sections, left, right);
    }
    for (const [a, b] of sections) {
      c.box([b - a, rowSize + 0.006, 0.088], [(a + b) / 2, height, depth], row % 5 === 1 ? darkSiding : siding, [0.05, 0, 0]);
    }
    c.box([5.8, rowSize + 0.006, 0.082], [0, height, -depth], row % 3 === 0 ? darkSiding : siding);
    for (const x of [-halfWidth, halfWidth]) {
      c.box([0.083, rowSize + 0.008, depth * 2], [x, height, 0], row % 5 === 2 ? darkSiding : siding, [0, 0, 0.033]);
    }
  }

  for (const { left, right, bottom, top } of windows) {
    const center = (left + right) * 0.5;
    const level = (bottom + top) * 0.5;
    const fullHeight = top - bottom;
    const fullWidth = right - left;
    const isDoor = bottom < 0.2;
    c.box([fullWidth + 0.015, fullHeight + 0.018, 0.079], [center, level, depth - 0.075], glass);
    if (!isDoor) {
      const offset = fullWidth * 0.243;
      c.box([offset * 1.86, fullHeight * 0.92, 0.032], [center - offset, level, depth - 0.025], lit);
      if (center < 0) c.box([offset * 1.86, fullHeight * 0.9, 0.031], [center + offset, level, depth - 0.023], lit);
      c.box([fullWidth, 0.044, 0.085], [center, level, depth + 0.025], char);
      c.box([0.062, fullHeight, 0.08], [center, level, depth + 0.025], char);
    }
    for (const x of [left, right]) c.box([0.086, fullHeight + 0.09, 0.148], [x, level, depth + 0.018], wood);
    for (const y of [bottom, top]) c.box([fullWidth + 0.1, 0.09, 0.18], [center, y, depth + 0.028], wood);
  }
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-depth, depth]) {
      c.box([0.125, 2.01, 0.12], [x, 1.13, z], darkSiding);
    }
    panel(c, [[x, eave - 0.02, -depth], [x, eave - 0.02, depth], [x, ridge, 0]], darkSiding, [Math.sign(x), 0, 0]);
    for (let i = 1; i <= 8; i++) {
      const y = eave + i * (ridge - eave) / 9;
      const width = depth * 2 * (1 - (y - eave) / (ridge - eave));
      c.box([0.048, 0.115, width], [x * 1.003, y, 0], i % 2 === 0 ? siding : darkSiding);
    }
  }

  const roofDepth = 1.78;
  const rise = 1.34;
  const slope = Math.atan2(rise, roofDepth);
  const slopeLength = Math.hypot(rise, roofDepth);
  for (const sign of [-1, 1]) {
    const rotation = [sign * (slope - Math.PI / 2), 0, 0];
    const xAngle = sign * slope;
    c.box([6.2, 0.112, slopeLength], [0, ridge - rise / 2, sign * roofDepth / 2], roof, [xAngle, 0, 0]);
    const courses = 7;
    const tiles = 13;
    for (let j = 0; j < courses; j++) {
      const t = (j + 0.45) / courses;
      const z = sign * roofDepth * t;
      const y = ridge - rise * t + 0.07;
      if (c.lod.details < 0.3) {
        c.box([6.13, 0.022, slopeLength / courses * 0.85], [0, y, z], j % 3 === 0 ? brightRoof : roof, [xAngle, 0, 0]);
        continue;
      }
      for (let i = 0; i < tiles; i++) {
        const tileW = 6.2 / tiles;
        const x = -3.1 + (i + 0.5) * tileW;
        const shade = x > 0.8 && j < 4 && i % 3 !== 1 ? char : (i % 5 === 0 ? brightRoof : roof);
        c.box([tileW - 0.019, 0.028, slopeLength / courses * 0.9], [x, y, z], shade, [xAngle, c.range(-0.032, 0.032), 0]);
      }
    }
    c.box([6.24, 0.129, 0.119], [0, ridge - rise, sign * roofDepth], wood, [xAngle, 0, 0]);
    for (const x of [-3.08, 3.08]) {
      c.box([0.105, slopeLength, 0.117], [x, ridge - rise / 2, sign * roofDepth / 2], wood, rotation);
    }
  }
  c.box([6.22, 0.079, 0.157], [0, ridge + 0.055, 0], roof);
  c.box([0.46, 0.74, 0.54], [-1.86, 3.36, -0.39], brick);
  c.box([0.55, 0.09, 0.64], [-1.86, 3.753, -0.39], stone);
  c.box([0.33, 0.026, 0.4], [-1.86, 3.805, -0.39], char);
  for (let i = 0; i < 6; i++) {
    c.box([0.471, 0.014, 0.551], [-1.86, 3.075 + i * 0.107, -0.39], char);
  }
}

function brush(c) {
  const bark = c.surface('Scrub bark', 0x473529, { variation: 0.67 });
  const twigs = c.surface('Dry brush', 0x5d4530, { variation: 0.62 });
  const leaves = c.surface('Desiccated leaves', 0x665131, { variation: 0.67 });
  const ash = c.surface('Scorched brush', 0x3c3028, { variation: 0.73 });
  const grass = c.surface('Dry ground reeds', 0x735835, { variation: 0.61 });
  const clusters = [[-1.57, 0.14], [-1.04, -0.25], [-0.43, 0.35], [0.15, -0.43], [0.76, 0.18], [1.37, -0.14]];
  for (const [x, z] of clusters) {
    for (let i = 0; i < 4 + Math.ceil(6 * c.lod.details); i++) {
      const height = c.range(0.26, 0.79);
      const root = [x + c.range(-0.1, 0.1), 0.015, z + c.range(-0.07, 0.07)];
      const angle = i * 2.399963;
      const reach = c.range(0.19, 0.55);
      const tip = [root[0] + Math.cos(angle) * reach, height, root[2] + Math.sin(angle) * reach];
      c.rod(root, tip, 0.004, c.range(0.015, 0.028), i % 3 === 0 ? ash : bark, 4);
      const count = 2 + Math.ceil(c.lod.details * 4);
      for (let j = 1; j <= count; j++) {
        const t = 0.28 + j / count * 0.64;
        const branch = root.map((coordinate, axis) => coordinate * (1 - t) + tip[axis] * t);
        const fork = angle + (j % 2 === 0 ? 1.35 : -1.35);
        const extent = c.range(0.09, 0.28) * (1.1 - t * 0.67);
        const end = [branch[0] + Math.cos(fork) * extent, branch[1] + c.range(0.031, 0.18), branch[2] + Math.sin(fork) * extent];
        c.rod(branch, end, 0.001, 0.008, j % 2 === 0 ? twigs : ash, 3);
        if (j % 4 === 1) c.rock(end, [0.049, 0.012, 0.028], leaves);
      }
    }
  }
  for (let i = 0; i < Math.ceil(71 * c.lod.details); i++) {
    const x = c.range(-1.98, 1.88);
    const z = c.range(-0.61, 0.61);
    c.rod([x, 0.002, z], [x + c.range(-0.085, 0.085), c.range(0.07, 0.37), z + c.range(-0.095, 0.095)], 0.0005, 0.005, grass, 3);
  }
}

function crate(c) {
  const boards = c.surface('Broken crate planks', 0x573d2c, { variation: 0.65 });
  const ends = c.surface('Split wood', 0x795743, { variation: 0.56 });
  const char = c.surface('Burned wood', 0x342829, { variation: 0.74 });
  const nail = c.surface('Iron fasteners', 0x4e4243, { metalness: 0.62, variation: 0.36 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = side * 0.71;
      if (i === 3 && side > 0) continue;
      c.box([1.18, 0.121, 0.062], [x, 0.112 + i * 0.156, 0.42], i === 2 ? char : boards, [0, side * 0.05, 0]);
      c.box([1.18, 0.121, 0.062], [x, 0.112 + i * 0.156, -0.44], boards);
      c.box([0.054, 0.118, 0.85], [side * 1.29, 0.109 + i * 0.156, -0.01], i % 2 === 0 ? char : boards);
    }
  }
  for (const x of [-1.3, -0.14, 0.12, 1.3]) {
    for (const z of [-0.44, 0.44]) {
      c.box([0.105, 0.69, 0.11], [x, 0.348, z], boards, [0, 0, x * 0.035]);
      if (c.lod.details > 0.3) {
        for (const y of [0.14, 0.42, 0.6]) c.cylinder(0.015, 0.015, 0.011, [x, y, z * 1.13], nail, 5, [Math.PI / 2, 0, 0]);
      }
    }
  }
  for (let i = 0; i < 9 + Math.round(c.lod.details * 8); i++) {
    const x = c.range(-1.22, 1.21);
    const y = c.range(0.1, 0.69);
    const z = c.range(-0.32, 0.25);
    c.box([c.range(0.47, 0.94), 0.057, c.range(0.085, 0.138)], [x, y, z], i % 5 === 0 ? ends : char,
      [c.range(-0.28, 0.28), c.range(-0.57, 0.57), c.range(-0.38, 0.55)]);
  }
  c.box([0.13, 0.98, 0.083], [-0.74, 0.5, -0.295], boards, [-0.11, 0.1, -0.35]);
}

const BUILDERS = { candle, torch, campfire, hay, tires, spill, car, drum, cylinder: cylinderProp, forest, house, brush, crate };

export function buildSourceModel(model = 'none', quality = 'balanced') {
  const name = typeof model === 'string' ? model : 'none';
  const context = makeContext(name, quality);
  const build = Object.hasOwn(BUILDERS, name) ? BUILDERS[name] : undefined;
  build?.(context);
  return context.finish();
}

// Indexed charcoal surface for testing triangle budgets and offline asset imports.
export function buildDetailSample(maxTriangles = 1_000_000) {
  const budget = Number.isFinite(maxTriangles) ? THREE.MathUtils.clamp(Math.floor(maxTriangles), 100, 1_000_000) : 1_000_000;
  const columns = Math.max(10, Math.floor(Math.sqrt(budget) / 2));
  const rows = Math.max(2, Math.floor(budget / (columns * 2)) + 1);
  const geometry = new THREE.SphereGeometry(1, columns, rows);
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i);
    const y = points.getY(i);
    const z = points.getZ(i);
    const main = 1 + 0.085 * Math.cos(x * 13.2 + y * 5.4 + z * 3.8)
      + 0.075 * Math.sin(x * 6.7 - z * 11.3) + 0.016 * Math.cos(x * 43 - y * 17 + z * 38)
      + 0.0065 * Math.sin(x * 176 + y * 222 - z * 78);
    const fissure = Math.max(0, 1 - Math.abs(Math.sin(13 * y + x * 8 + Math.sin(z * 11))) * 4) ** 2;
    points.setXYZ(i, x * main * 0.57, y * (main - fissure * 0.044) * 0.46, z * main * 0.47);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const sample = makeContext('charcoal-detail', 'cinematic');
  const char = sample.surface('Charcoal surface', 0x3f3030, { roughness: 0.9, variation: 0.65 });
  sample.add(geometry, char, [0, -geometry.boundingBox.min.y, 0]);
  return sample.finish();
}
