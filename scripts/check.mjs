import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'three/addons/libs/fflate.module.js';
import { createDescriptor, frameFor, groups, initialSettings, presets, qualities, SCHEMA, winds } from '../src/catalog.js';
import { buildDetailSample, buildSourceModel } from '../src/models.js';
import { countTriangles, disposeModel } from '../src/viewer.js';

const profiles = Object.keys(qualities);
const models = new Map();
const ids = new Set();
for (const preset of presets) {
  assert(!ids.has(preset.id), 'Duplicate preset id ' + preset.id);
  ids.add(preset.id);
  assert(groups.some(({ id }) => id === preset.group));
  assert(winds[preset.wind] && preset.oxygen >= 0 && preset.oxygen <= 1);
  assert(preset.width > 0 && preset.height > 0 && preset.depth > 0 && preset.duration > 0);
  assert(frameFor(preset).span > 0);
  const descriptor = createDescriptor(preset, initialSettings(preset));
  assert.equal(descriptor.schema, SCHEMA);
  assert.equal(descriptor.space.units, 'm');
  assert.equal(descriptor.asset.id, preset.id);
  if (models.has(preset.model)) continue;

  const counts = {};
  for (const profile of profiles) {
    const model = buildSourceModel(preset.model, profile);
    const triangles = countTriangles(model);
    counts[profile] = triangles;
    if (preset.model === 'none') assert.equal(triangles, 0);
    else assert(triangles >= 100 && triangles < 1_000_000, preset.model + '/' + profile);
    model.traverse((part) => {
      if (!part.isMesh) return;
      const geom = part.geometry;
      const position = geom.getAttribute('position');
      const normal = geom.getAttribute('normal');
      assert(position && normal && normal.count === position.count);
      assert(position.array.every(Number.isFinite));
      assert(geom.index.array.every((index) => index < position.count));
    });
    disposeModel(model);
  }
  assert(counts.low <= counts.balanced && counts.balanced <= counts.cinematic, preset.model);
  models.set(preset.model, counts);
}
assert.equal(presets.length, 17);
for (const count of [100, 10_000, 1_000_000]) {
  const sample = buildDetailSample(count);
  assert.equal(countTriangles(sample), count);
  disposeModel(sample);
}
console.log(presets.length + ' presets, ' + (models.size - 1) + ' unique source meshes in 3 LODs, detail range 100…1,000,000.');

let zip;
try {
  zip = await readFile('public/dataset/fire-asset-lab.zip');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (zip) {
  const files = unzipSync(zip);
  const get = (name) => {
    assert(files[name], 'Missing ' + name);
    return files[name];
  };
  const json = (name) => JSON.parse(strFromU8(get(name)));
  const catalog = json('catalog.json');
  assert.equal(catalog.assets.length, presets.length);
  let variantCount = 0;
  for (const asset of catalog.assets) {
    const preset = presets.find(({ id }) => id === asset.id);
    assert(preset);
    const folder = asset.manifest.slice(0, -'manifest.json'.length);
    const manifest = json(asset.manifest);
    assert.equal(manifest.asset.id, asset.id);
    assert.equal(manifest.schema, SCHEMA);
    const atlas = get(folder + manifest.flipbook.file);
    const png = new DataView(atlas.buffer, atlas.byteOffset, atlas.byteLength);
    assert.equal(png.getUint32(0), 0x89504e47);
    assert.equal(png.getUint32(16), manifest.flipbook.columns * manifest.flipbook.frameWidth);
    assert.equal(png.getUint32(20), manifest.flipbook.rows * manifest.flipbook.frameHeight);
    assert.equal(png.getUint8(25), 6, 'Atlas must contain alpha');
    assert.equal(manifest.flipbook.loop, !preset.burst);
    assert.equal(asset.variants.length, winds.length * 2);
    assert.equal(strFromU8(get(folder + manifest.still).subarray(8, 12)), 'WEBP');
    for (const variant of asset.variants) {
      const { settings, asset: ref } = json(folder + variant.file);
      assert.equal(ref.id, asset.id);
      assert.equal(winds[settings.wind].label, variant.wind);
      assert(settings.oxygen === 1 || settings.oxygen === .24);
      variantCount++;
    }
    assert.equal(Object.keys(manifest.models).length, preset.model === 'none' ? 0 : 3);
    for (const [profile, model] of Object.entries(manifest.models)) {
      assert.equal(model.triangles, models.get(preset.model)[profile]);
      assert.equal(strFromU8(get(folder + model.file).subarray(0, 4)), 'glTF');
    }
  }
  assert.deepEqual(catalog.samples.map(({ triangles }) => triangles), [100, 10_000, 1_000_000]);
  for (const sample of catalog.samples) assert.equal(strFromU8(get(sample.file).subarray(0, 4)), 'glTF');
  console.log('ZIP verified: ' + catalog.assets.length + ' stills and atlases, ' + variantCount + ' condition presets, 45 prop GLBs and 3 detail samples.');
} else {
  console.log('No baked distribution ZIP present. Run npm run bake to generate it.');
}
