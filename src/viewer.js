import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { atlasPlane } from './atlas.js';
import { frameFor, qualities, winds } from './catalog.js';
import { buildSourceModel } from './models.js';
import { createParticles } from './particles.js';
import { makeNoiseTexture, makeVolumeMaterial } from './volume.js';

const legacyBurstLook = [.5, 13, 1, 0];

export function countTriangles(root) {
  let count = 0;
  root.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    const geometry = object.geometry;
    count += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3 * (object.isInstancedMesh ? object.count : 1);
  });
  return count;
}

export function disposeModel(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of [object.material].flat()) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function makeFloor() {
  const side = 256;
  const pixels = new Uint8Array(side * side * 4);
  let state = 53264;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const grain = (state >>> 24) / 255;
      const variation = .5 + .27 * Math.sin(x * Math.PI / 16 + Math.sin(y * Math.PI / 16) * 2)
        + .2 * Math.cos(y * Math.PI / 32 + Math.cos(x * Math.PI / 32) * 3);
      const level = 63 + Math.round(10 * variation + 23 * grain ** 2);
      const i = (y * side + x) * 4;
      pixels[i] = level + 5;
      pixels[i + 1] = level;
      pixels[i + 2] = level - 3;
      pixels[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, side, side);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(72, 72);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({
    color: 0x51575e, map: texture, roughness: .93, metalness: .06,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}

function makeRefractionBackdrop() {
  const pattern = document.createElement('canvas');
  pattern.width = 768;
  pattern.height = 512;
  const ctx = pattern.getContext('2d');
  ctx.fillStyle = '#22262c';
  ctx.fillRect(0, 0, pattern.width, pattern.height);
  for (let x = 32; x < pattern.width; x += 32) {
    ctx.fillStyle = x % 128 ? '#4c555c' : '#71808b';
    ctx.fillRect(x, 0, x % 128 ? 2 : 3, pattern.height);
  }
  for (let y = 32; y < pattern.height; y += 32) {
    ctx.fillStyle = y % 128 ? '#4c555c' : '#71808b';
    ctx.fillRect(0, y, pattern.width, y % 128 ? 2 : 3);
  }
  const texture = new THREE.CanvasTexture(pattern);
  texture.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.6), new THREE.MeshBasicMaterial({ map: texture, fog: false }));
  panel.visible = false;
  return panel;
}

export function createViewer(canvas, { orbit = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance',
  });
  renderer.autoClear = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const context = renderer.getContext();
  const hdr = context.getExtension('EXT_color_buffer_float') !== null;
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, generateMipmaps: false, depthBuffer: true,
  });
  target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);

  const camera = new THREE.PerspectiveCamera(34, 1, .015, 160);
  const atlasCamera = new THREE.OrthographicCamera();
  const controls = orbit ? new OrbitControls(camera, canvas) : null;
  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = .13;
    controls.maxPolarAngle = Math.PI * .493;
    controls.rotateSpeed = .65;
    controls.zoomSpeed = .82;
    controls.panSpeed = .65;
  }
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x141519, .1);
  const floor = makeFloor();
  const backdrop = makeRefractionBackdrop();
  const grid = new THREE.GridHelper(30, 60, 0x514c43, 0x514c43);
  grid.position.y = .001;
  grid.material.transparent = true;
  grid.material.opacity = .19;
  grid.material.depthWrite = false;
  grid.visible = false;

  scene.add(floor, grid, backdrop, new THREE.HemisphereLight(0xcbd3dd, 0x39312c, 1.12));
  const key = new THREE.DirectionalLight(0xffead9, 1.27);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.bias = -.00028;
  key.shadow.normalBias = .024;
  key.shadow.radius = 2.6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9eacc9, 1.12);
  rim.position.set(2, 4, -5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xff8f44, 1.7, 8, 2);
  const pool = new THREE.PointLight(0xff752e, .55, 5, 2);
  scene.add(warm, pool);
  const sparks = createParticles();
  scene.add(sparks.group);

  const noise = makeNoiseTexture();
  const material = makeVolumeMaterial(target, noise);
  const screen = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  screen.add(quad);

  let asset;
  let model;
  let tris = 0;
  let modelQuality;
  let emissionMaterials = [];
  let displayWidth = 1;
  let displayHeight = 1;
  let pixelScale = 1;
  let cssWidth = 1;
  let cssHeight = 1;
  let useGrid = false;
  let wireframe = false;
  let useBackdrop = false;
  const center = new THREE.Vector3();
  const behind = new THREE.Vector3();
  let cameraSpan = 1;

  function frame(view = 'orbit', framing = 'scene') {
    const standard = frameFor(asset);
    let { target: height, span } = standard;
    if (framing === 'detail') {
      height = asset.base + asset.height * .42;
      span = Math.max(asset.height * 1.41, asset.width * .78, .095);
    } else if (framing === 'column') {
      const columnHeight = asset.base + asset.height * 2.04;
      height = columnHeight * .5;
      span = Math.max(standard.span, columnHeight * 1.15);
    }
    cameraSpan = span;
    const distance = span * (camera.aspect < 1 ? 1.83 / Math.max(camera.aspect, .56) : 1.77);
    center.set(asset.width * winds[asset.wind].bend * .24, height, 0);
    if (view === 'front') camera.position.set(center.x, height + span * .095, distance);
    else if (view === 'side') camera.position.set(distance, height + span * .12, 0);
    else if (view === 'top') camera.position.set(center.x, height + distance, .004);
    else camera.position.set(distance * .43, height + span * .22, distance * .9);
    camera.near = Math.max(.004, span / 250);
    camera.far = Math.max(80, span * 24);
    camera.updateProjectionMatrix();
    camera.lookAt(center);
    if (controls) {
      controls.target.copy(center);
      controls.minDistance = span * .31;
      controls.maxDistance = span * 8.7;
      controls.update();
    }
  }

  function frameAtlas(settings) {
    const plane = atlasPlane(asset, winds[settings.wind].bend);
    const half = plane.widthMeters / 2;
    const [x, y] = plane.center;
    const distance = asset.depth * 2 + 1;
    Object.assign(atlasCamera, { left: -half, right: half, top: half, bottom: -half, near: .001, far: distance * 2 });
    atlasCamera.position.set(x, y, distance);
    atlasCamera.updateProjectionMatrix();
    atlasCamera.updateMatrixWorld();
    return plane;
  }

  function setWireframe(value) {
    wireframe = value;
    model?.traverse((object) => {
      if (object.material) for (const m of [object.material].flat()) m.wireframe = wireframe;
    });
  }

  function configure(nextAsset, quality, resetCamera = false) {
    const changed = asset?.id !== nextAsset.id;
    const profile = qualities[quality];
    asset = nextAsset;
    if (changed || modelQuality !== quality) {
      if (model) {
        scene.remove(model);
        disposeModel(model);
      }
      model = buildSourceModel(asset.model, quality);
      model.scale.setScalar(asset.scale);
      emissionMaterials = [];
      model.traverse((object) => {
        if (object.isMesh) {
          for (const m of [object.material].flat()) {
            if (m?.emissiveIntensity > 0 && m.name?.includes('embers')) emissionMaterials.push([m, m.emissiveIntensity]);
          }
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      scene.add(model);
      tris = countTriangles(model);
      modelQuality = quality;
      scene.fog.density = .095 / frameFor(asset).span;
      setWireframe(wireframe);
      key.castShadow = profile.shadow > 0;
      if (key.castShadow) {
        key.shadow.mapSize.set(profile.shadow, profile.shadow);
        if (key.shadow.map) {
          key.shadow.map.dispose();
          key.shadow.map = null;
        }
        const span = frameFor(asset).span;
        key.position.set(-span * 1.7, span * 2.8, span * 1.4);
        Object.assign(key.shadow.camera, {
          left: -span * 1.7, right: span * 1.7, top: span * 1.7, bottom: -span * 1.7,
          near: .02, far: span * 8,
        });
        key.shadow.camera.updateProjectionMatrix();
      }
    }
    if (changed || resetCamera) frame();
  }

  function resize(width, height, quality, { bake = false } = {}) {
    cssWidth = Math.max(width, 1);
    cssHeight = Math.max(height, 1);
    const profile = qualities[quality];
    pixelScale = bake ? 1 : Math.min(profile.scale * Math.min(globalThis.devicePixelRatio ?? 1, 1.5),
      Math.sqrt(profile.maxPixels / (cssWidth * cssHeight)));
    displayWidth = Math.max(1, Math.round(cssWidth * pixelScale));
    displayHeight = Math.max(1, Math.round(cssHeight * pixelScale));
    renderer.setSize(displayWidth, displayHeight, false);
    target.setSize(displayWidth, displayHeight);
    camera.aspect = cssWidth / cssHeight;
    camera.updateProjectionMatrix();
  }

  function render(time, settings, options = {}) {
    if (!asset) return;
    const profile = qualities[settings.quality];
    controls?.update();
    camera.updateMatrixWorld();
    const transparent = options.transparent === true;
    const wind = winds[settings.wind].bend;
    floor.visible = !transparent;
    grid.visible = useGrid && !transparent;
    backdrop.visible = useBackdrop && !transparent;
    const shot = transparent ? atlasCamera : camera;
    if (backdrop.visible) {
      camera.getWorldDirection(behind);
      backdrop.position.copy(controls?.target ?? center).addScaledVector(behind, cameraSpan * 1.52);
      backdrop.quaternion.copy(camera.quaternion);
      backdrop.scale.setScalar(cameraSpan);
    }
    model.visible = !transparent;
    const active = settings.layers;
    const age = time / asset.duration;
    const burstLook = asset.burstLook ?? legacyBurstLook;
    for (const [i, [m, original]] of emissionMaterials.entries()) {
      m.emissiveIntensity = original * (.80 + .13 * Math.sin(time * 2.7 + i * 1.1) + .08 * Math.sin(time * 6.35 + i));
    }
    const flutter = .81 + .12 * Math.sin(time * 7.2) + .08 * Math.sin(time * 13.1 + 1.4);
    const lightActivity = asset.burst ? Math.min(age * 90, 1) * Math.exp(-age * burstLook[1]) * 1.5 : flutter;
    warm.position.set(wind * asset.width * .15, asset.base + asset.height * .18, asset.depth * .12);
    warm.intensity = (active.flame ? asset.emission : 0) * lightActivity * asset.height ** 2 * 4.15;
    warm.distance = Math.max(asset.height * 4.8, .88);
    pool.position.set(-asset.width * .13, asset.base + asset.height * .085, -asset.depth * .19);
    pool.intensity = warm.intensity * .47;
    pool.distance = warm.distance * .8;
    sparks.update(asset, settings, profile.particles, time, wind, displayHeight);

    renderer.setRenderTarget(target);
    renderer.setClearColor(transparent ? 0x000000 : scene.fog.color, transparent ? 0 : 1);
    renderer.clear();
    renderer.render(scene, shot);

    const u = material.uniforms;
    u.invProjection.value.copy(shot.projectionMatrixInverse);
    u.worldMatrix.value.copy(shot.matrixWorld);
    u.eye.value.copy(shot.position);
    u.extent.value.set(asset.width, asset.height, asset.depth);
    u.boxMin.value.set(-asset.width * .94, Math.max(-.007, asset.base - asset.height * (asset.burst ? .22 : .14)), -asset.depth * .98);
    u.boxMax.value.set(asset.width * (.98 + wind * 2.35), asset.base + asset.height * 2.04, asset.depth * .95);
    u.base.value = asset.base;
    u.burstLook.value.fromArray(burstLook);
    u.time.value = time;
    u.seed.value = (settings.seed % 2009) / 2009 * 37.1;
    u.bend.value = wind;
    u.oxygen.value = settings.oxygen;
    u.emission.value = active.flame ? asset.emission : 0;
    u.smoke.value = active.smoke ? asset.smoke : 0;
    u.dustStrength.value = asset.burst && active.dust !== false ? asset.smoke : 0;
    u.soot.value = asset.soot;
    u.turbulence.value = asset.turbulence;
    u.thermal.value = active.heat ? asset.thermal : 0;
    u.duration.value = asset.duration;
    u.transparentOutput.value = transparent ? 1 : 0;
    u.shape.value = ['wick', 'plume', 'front', 'burst'].indexOf(asset.shape);
    u.octaves.value = profile.octaves;
    u.steps.value = options.stepOverride ?? profile.steps;
    renderer.setRenderTarget(null);
    renderer.setClearColor(0, 0);
    renderer.clear();
    renderer.render(screen, camera);
  }

  return {
    configure, resize, render, frame, frameAtlas, setWireframe,
    onChange: (callback) => controls?.addEventListener('change', callback),
    setGrid: (value) => { useGrid = value; },
    setBackdrop: (value) => { useBackdrop = value; },
    setLightStudio: (value) => {
      scene.fog.color.setHex(value ? 0xa0a4a8 : 0x141519);
      floor.material.emissive.setHex(value ? 0x73777b : 0x000000);
    },
    triangles: () => tris,
    stats: () => ({ width: displayWidth, height: displayHeight, pixels: sparks.count(), hdr }),
    dispose: () => {
      controls?.dispose();
      disposeModel(scene);
      disposeModel(screen);
      floor.material.map.dispose();
      backdrop.material.map.dispose();
      target.dispose();
      noise.dispose();
      renderer.dispose();
    },
  };
}
