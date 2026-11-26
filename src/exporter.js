import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { strToU8, zipSync } from 'three/addons/libs/fflate.module.js';
import { createDescriptor } from './catalog.js';
import { buildDetailSample, buildSourceModel } from './models.js';
import { countTriangles, createViewer, disposeModel } from './viewer.js';

const json = (value) => JSON.stringify(value, null, 2) + '\n';

export const canvasBlob = (canvas, format = 'image/png', quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Snímek nelze uložit.')), format, quality);
});

export async function exportModel(asset, quality) {
  const mesh = buildSourceModel(asset.model, quality);
  mesh.name = asset.id;
  mesh.scale.setScalar(asset.scale);
  mesh.userData = { assetId: asset.id, profile: quality, triangles: countTriangles(mesh), units: 'm' };
  try {
    return await new GLTFExporter().parseAsync(mesh, { binary: true, trs: true });
  } finally {
    disposeModel(mesh);
  }
}

export async function exportDetailSample(triangles) {
  const model = buildDetailSample(triangles);
  model.userData = { triangles: countTriangles(model), units: 'm' };
  try {
    return await new GLTFExporter().parseAsync(model, { binary: true, trs: true });
  } finally {
    disposeModel(model);
  }
}

const nextPaint = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function renderFlipbook(viewer, source, asset, settings, options = {}) {
  const { columns = 8, rows = 6, size = 128, progress = () => {}, yieldEvery = 4 } = options;
  const frameCount = columns * rows;
  const canvas = document.createElement('canvas');
  canvas.width = columns * size;
  canvas.height = rows * size;
  const ctx = canvas.getContext('2d');
  viewer.resize(size, size, settings.quality, { bake: true });
  viewer.configure(asset, settings.quality, true);
  const frameRate = frameCount / asset.duration;
  // Explicit sample times preserve the first flash of one-shot clips.
  const frameTimes = asset.burst ? Array.from({ length: frameCount }, (_, n) => {
    const progress = n / frameCount;
    return asset.duration * progress * progress;
  }) : null;
  const tailFrames = !asset.burst ? Math.min(5, Math.floor(frameCount / 8)) : 0;
  for (let n = 0; n < frameCount; n++) {
    const x = n % columns * size;
    const y = Math.floor(n / columns) * size;
    const overlap = Math.max(n - (frameCount - tailFrames) + 1, 0) / (tailFrames + 1);
    const mix = overlap ** 2 * (3 - 2 * overlap);
    viewer.render(frameTimes?.[n] ?? (n + tailFrames) / frameRate, settings, { transparent: true });
    ctx.globalAlpha = 1 - mix;
    ctx.drawImage(source, x, y, size, size);
    if (overlap) {
      viewer.render((n - (frameCount - tailFrames)) / frameRate, settings, { transparent: true });
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = mix;
      ctx.drawImage(source, x, y, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    if ((n + 1) % yieldEvery === 0 || n === frameCount - 1) {
      progress((n + 1) / frameCount);
      if (yieldEvery < frameCount) await nextPaint();
    }
  }
  const manifest = {
    ...createDescriptor(asset, settings),
    flipbook: {
      file: 'flipbook.png', frameCount, frameRate, columns, rows,
      ...(frameTimes ? { frameTimes, sampling: 'nonuniform; interpolate using frameTimes (seconds)' } : {}),
      frameWidth: size, frameHeight: size, order: 'row-major, left-to-right, top-to-bottom',
      alpha: 'straight', colorSpace: 'sRGB', camera: 'orbit',
      loop: !asset.burst, bakedLayers: ['flame', 'smoke', 'sparks', ...(asset.burst ? ['dust'] : [])].filter((id) => settings.layers[id]),
    },
  };
  return { png: await canvasBlob(canvas), manifest };
}

export async function makeFlipbookZip(asset, settings, progress) {
  const source = document.createElement('canvas');
  const renderer = createViewer(source, { orbit: false });
  try {
    const { png, manifest } = await renderFlipbook(renderer, source, asset, settings, { size: 160, progress });
    return new Blob([zipSync({
      'flipbook.png': new Uint8Array(await png.arrayBuffer()),
      'manifest.json': strToU8(json(manifest)),
    }, { level: 0 })], { type: 'application/zip' });
  } finally {
    renderer.dispose();
  }
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 20_000);
}

export const descriptorBlob = (asset, settings) => new Blob([json(createDescriptor(asset, settings))], { type: 'application/json' });
