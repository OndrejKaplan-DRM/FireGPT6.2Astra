import { createDescriptor, initialSettings, presets } from './catalog.js';
import { canvasBlob, exportDetailSample, exportModel, renderFlipbook } from './exporter.js';
import { applyStudy, studies } from './studies.js';
import { createViewer } from './viewer.js';

function bytes(blob) {
  return blob.arrayBuffer().then((buffer) => Array.from(new Uint8Array(buffer)));
}

export function installBakeInterface() {
  const canvas = document.createElement('canvas');
  const viewer = createViewer(canvas, { orbit: false });
  const assetById = (id) => presets.find((asset) => asset.id === id);
  window.fireBake = {
    catalog: () => presets,
    studies: () => studies,
    async still(id, quality = 'cinematic', t, width = 960, height = 592, study) {
      const asset = assetById(id);
      const settings = initialSettings(asset, quality);
      if (study) applyStudy(settings, study);
      viewer.resize(width, height, quality, { bake: true });
      viewer.configure(asset, quality, true);
      viewer.setBackdrop(Boolean(study?.backdrop));
      viewer.setLightStudio(Boolean(study?.lightStudio));
      if (study) viewer.frame(study.view, study.framing);
      const featureTime = id === 'grenade' ? .37 : asset.burst ? asset.duration * .041 : 1.44;
      viewer.render(study?.frame ?? t ?? featureTime, settings);
      return bytes(await canvasBlob(canvas, 'image/webp', .88));
    },
    async atlas(id, size, rows = 6) {
      const asset = assetById(id);
      const settings = initialSettings(asset, 'balanced');
      viewer.setBackdrop(false);
      const { png, manifest } = await renderFlipbook(viewer, canvas, asset, settings, {
        size, rows, yieldEvery: rows * 8,
      });
      return { png: await bytes(png), manifest };
    },
    async model(id, quality) {
      return Array.from(new Uint8Array(await exportModel(assetById(id), quality)));
    },
    async sample(triangles) {
      const raw = new Uint8Array(await exportDetailSample(triangles));
      // Number arrays become large over the browser protocol. Transfer base64 chunks instead.
      let data = '';
      for (let i = 0; i < raw.length; i += 0x4000) data += String.fromCharCode(...raw.subarray(i, i + 0x4000));
      return btoa(data);
    },
    descriptor(id) {
      const asset = assetById(id);
      return createDescriptor(asset, initialSettings(asset));
    },
  };
}
