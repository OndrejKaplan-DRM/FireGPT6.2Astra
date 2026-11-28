import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { unzipSync, strFromU8 } from 'three/addons/libs/fflate.module.js';

const executable = process.env.GODOT_PATH ?? 'godot4';
const ids = ['candle', 'tires', 'barrel'];
const zip = unzipSync(await readFile('public/dataset/fire-asset-lab.zip'), {
  filter: ({ name }) => ids.some((id) => name.startsWith('assets/' + id + '/')) &&
    /\/(manifest\.json|flipbook\.png|model-low\.glb)$/.test(name),
});
await mkdir('work', { recursive: true });
const root = await mkdtemp(resolve('work/godot-audit-'));
await writeFile(join(root, 'project.godot'), `config_version=5
[application]
config/name="Fire Asset Lab import check"
[display]
window/size/viewport_width=192
window/size/viewport_height=192
[rendering]
renderer/rendering_method="gl_compatibility"
[importer_defaults]
texture={
"process/fix_alpha_border": false,
"process/premult_alpha": false,
"detect_3d/compress_to": 0,
"mipmaps/generate": false
}
`);
for (const id of ids) {
  const dir = 'assets/' + id + '/';
  const { flipbook, models } = JSON.parse(strFromU8(zip[dir + 'manifest.json']));
  await writeFile(join(root, id + '.json'), JSON.stringify(flipbook));
  await writeFile(join(root, id + '.png'), zip[dir + flipbook.file]);
  await writeFile(join(root, id + '.glb'), zip[dir + models.low.file]);
}
await copyFile('scripts/check-godot.gd', join(root, 'check.gd'));
console.log('Godot import checks and comparison renders: ' + root);
const run = (args) => execFileSync(executable, ['--path', root, ...args], { stdio: 'inherit', timeout: 180000 });
run(['--headless', '--editor', '--import']);
run(['--rendering-method', 'gl_compatibility', '--audio-driver', 'Dummy', '--script', 'check.gd']);
