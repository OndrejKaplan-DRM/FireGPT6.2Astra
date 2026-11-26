import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';
import { winds } from '../src/catalog.js';
import { strToU8, zipSync } from 'three/addons/libs/fflate.module.js';

const args = process.argv.slice(2);
const flag = (name) => args.find((arg) => arg.startsWith('--' + name + '='))?.split('=')[1];
const selected = flag('ids')?.split(',');
const stillsOnly = args.includes('--stills-only');
const skipBuild = args.includes('--skip-build');
const sample = !args.includes('--no-detail');
const frameSize = Number(flag('size') ?? 96);
if (!Number.isInteger(frameSize) || frameSize < 32 || frameSize > 256) throw new Error('Use --size=32…256.');
if (selected && !stillsOnly) throw new Error('Subset selection requires --stills-only.');

const root = resolve('dist');
const output = resolve('public');
await mkdir(resolve(output, 'renders'), { recursive: true });
await mkdir(resolve(output, 'dataset'), { recursive: true });
if (!skipBuild) execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit' });

const executablePath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
await access(executablePath);
const browser = await chromium.launch({
  executablePath,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  timeout: 30_000,
});

const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const localOrigin = 'http://firelab-render.local';
const archive = {};
const index = [];
const allProfiles = ['low', 'balanced', 'cinematic'];

function extractModelStats(raw) {
  const jsonSize = raw.readUInt32LE(12);
  const gltf = JSON.parse(raw.subarray(20, 20 + jsonSize).toString());
  return gltf.meshes.reduce((total, mesh) => total + mesh.primitives.reduce((tris, primitive) =>
    tris + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0), 0);
}

try {
  const context = await browser.newContext();
  await context.route(localOrigin + '/**', async (route) => {
    const url = new URL(route.request().url());
    const sourcePath = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!sourcePath.startsWith(root + sep)) return route.fulfill({ status: 403 });
    try {
      await route.fulfill({ body: await readFile(sourcePath), contentType: mime[extname(sourcePath)] ?? 'application/octet-stream' });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => { browserErrors.push(error.message); console.error(error); });
  page.on('console', (message) => {
    if (message.type() === 'error') { browserErrors.push(message.text()); console.error(message.text()); }
  });
  await page.goto(localOrigin + '/?bake=1');
  await page.waitForFunction(() => Boolean(window.fireBake), { timeout: 30_000 });
  const catalog = await page.evaluate(() => window.fireBake.catalog());

  for (const asset of catalog.filter((a) => !selected || selected.includes(a.id))) {
    const id = asset.id;
    const data = await page.evaluate((name) => window.fireBake.still(name), id);
    if (browserErrors.length) throw new Error('Rendering failed for ' + id + '.');
    const still = Buffer.from(data);
    if (still.length < 500) throw new Error('Incomplete render for ' + id + '.');
    await writeFile(resolve(output, 'renders', id + '.webp'), still);
    if (stillsOnly) {
      console.log(id + ' still');
      continue;
    }
    const location = 'assets/' + id + '/';
    const { png, manifest } = await page.evaluate(([name, size]) => window.fireBake.atlas(name, size), [id, frameSize]);
    archive[location + 'preview.webp'] = [still, { level: 0 }];
    archive[location + 'flipbook.png'] = [Uint8Array.from(png), { level: 0 }];
    const descriptor = {
      ...manifest, still: 'preview.webp', models: {},
    };
    const geometry = {};
    if (asset.model !== 'none') {
      for (const profile of allProfiles) {
        const raw = Buffer.from(await page.evaluate(([name, q]) => window.fireBake.model(name, q), [id, profile]));
        const name = 'model-' + profile + '.glb';
        archive[location + name] = raw;
        geometry[profile] = extractModelStats(raw);
        descriptor.models[profile] = { file: name, triangles: geometry[profile] };
      }
    }
    archive[location + 'manifest.json'] = strToU8(JSON.stringify(descriptor, null, 2) + '\n');
    const variants = [];
    for (const [wind, condition] of winds.entries()) {
      for (const [air, oxygen] of [['full', 1], ['limited', .24]]) {
        const path = 'variants/wind-' + wind + '-air-' + air + '.json';
        const variant = { ...manifest.settings, wind, oxygen };
        variants.push({ file: path, wind: condition.label, air });
        archive[location + path] = strToU8(JSON.stringify({
          schema: manifest.schema, version: manifest.version, space: manifest.space,
          domain: manifest.domain, provenance: manifest.provenance,
          asset, settings: variant,
        }, null, 2) + '\n');
      }
    }

    index.push({
      id, name: asset.name, group: asset.group, manifest: location + 'manifest.json', geometry, variants,
    });
    console.log(id + ' · ' + Math.round((png.length + still.length) / 1024) + ' KiB · ' + JSON.stringify(geometry));
  }

  if (!stillsOnly) {
    const samples = [];
    if (sample) {
      for (const triangles of [100, 10000, 1000000]) {
        const raw = Buffer.from(await page.evaluate((n) => window.fireBake.sample(n), triangles), 'base64');
        if (extractModelStats(raw) !== triangles) throw new Error('Unexpected triangle count in sample.');
        const path = 'geometry/charcoal-' + triangles + '.glb';
        archive[path] = [raw, { level: triangles === 1000000 ? 3 : 5 }];
        samples.push({ file: path, triangles });
        console.log(path + ' · ' + Math.round(raw.length / 1024) + ' KiB');
      }
    }
    archive['catalog.json'] = strToU8(JSON.stringify({
      schema: 'fire-asset-lab/dataset@1', release: '0.1.0', assets: index, samples,
    }, null, 2) + '\n');
    archive['README.md'] = new Uint8Array(await readFile('ASSETS.md'));
    await writeFile(resolve(output, 'dataset/fire-asset-lab.zip'), zipSync(archive, { level: 5 }));
    console.log('public/dataset/fire-asset-lab.zip');
  }
} finally {
  await browser.close();
}
