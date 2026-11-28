import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { Box3, Triangle } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { countTriangles, disposeModel } from '../src/viewer.js';

export function checkAtlas(bytes, spec, id) {
  const { data, width, height } = PNG.sync.read(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), { checkCRC: true });
  const w = spec.frameWidth;
  const h = spec.frameHeight;
  assert.equal(width, spec.columns * w);
  assert.equal(height, spec.rows * h);
  assert.equal(spec.frameCount, spec.rows * spec.columns);
  let translucent = 0;
  let maxBorder = 0;
  let maxAlpha = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      maxAlpha = Math.max(maxAlpha, a);
      if (a > 0 && a < 255) translucent++;
      if (x % w === 0 || x % w === w - 1 || y % h === 0 || y % h === h - 1) {
        maxBorder = Math.max(maxBorder, a);
      }
    }
  }
  assert(maxAlpha > 32 && translucent > 0, id + ' contains no visible translucent effect');
  assert(maxBorder <= 2, id + ' alpha at a cell edge = ' + maxBorder);
  const { plane } = spec;
  assert.equal(plane.projection, 'orthographic');
  assert.deepEqual(plane.viewDirection, [0, 0, -1]);
  assert(plane.widthMeters > 0 && plane.heightMeters > 0);
  assert(Math.abs(plane.center[0] + (plane.pivotUV[0] - .5) * plane.widthMeters) < 1e-6);
  assert(Math.abs(plane.center[1] + (.5 - plane.pivotUV[1]) * plane.heightMeters) < 1e-6);
}

export async function checkGlb(bytes, count, id) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const { scene } = await new GLTFLoader().parseAsync(buffer, '');
  assert.equal(countTriangles(scene), count, id + ' GLB triangle count');
  if (id.startsWith('acetylene/')) {
    assert(Math.abs(new Box3().setFromObject(scene).min.y) < 1e-6, id + ' floor contact');
  }
  const tri = new Triangle();
  scene.traverse(({ isMesh, geometry }) => {
    if (!isMesh) return;
    const { position, uv } = geometry.attributes;
    const idx = geometry.index;
    for (let i = 0; i < (idx?.count ?? position.count); i += 3) {
      const a = idx ? idx.getX(i) : i;
      const b = idx ? idx.getX(i + 1) : i + 1;
      const c = idx ? idx.getX(i + 2) : i + 2;
      tri.a.fromBufferAttribute(position, a);
      tri.b.fromBufferAttribute(position, b);
      tri.c.fromBufferAttribute(position, c);
      assert(tri.getArea() > 1e-13, id + ' degenerate triangle');
      const cross = (uv.getX(b) - uv.getX(a)) * (uv.getY(c) - uv.getY(a)) -
        (uv.getY(b) - uv.getY(a)) * (uv.getX(c) - uv.getX(a));
      assert(Math.abs(cross) > 1e-10, id + ' degenerate UV');
    }
  });
  disposeModel(scene);
}
