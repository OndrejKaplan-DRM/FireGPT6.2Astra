import '@fontsource-variable/inter/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles.css';
import { groups, initialSettings, layers, presets, qualities, winds } from './catalog.js';
import { applyStudy, studies } from './studies.js';
import { icon } from './icons.js';
import { createViewer } from './viewer.js';

const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);

if (query.has('bake')) {
  document.body.replaceChildren();
  const { installBakeInterface } = await import('./bake.js');
  installBakeInterface();
} else {
  runLab();
}

function runLab() {
  if (import.meta.env.VITE_DATASET_URL) $('dataset').href = import.meta.env.VITE_DATASET_URL;
  document.querySelectorAll('[data-icon]').forEach((node) => { node.innerHTML = icon(node.dataset.icon); });
  const byId = new Map(presets.map((p) => [p.id, p]));
  const collapsed = new Set();
  const formatNumber = new Intl.NumberFormat('cs-CZ');
  const timeFormat = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const savedQuality = (() => { try { return localStorage.getItem('firelab-quality'); } catch { return null; } })();
  const quality = Object.hasOwn(qualities, savedQuality) ? savedQuality : 'balanced';
  let asset = byId.get(query.get('asset')) ?? byId.get('campfire');
  let settings = initialSettings(asset, quality);
  let time = asset.burst ? .38 : .84;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let looping = true;
  let speed = 1;
  let grid = false;
  let wire = false;
  let backdrop = false;
  let selectedStudy = null;
  let galleryMode = 'scenes';
  let dirty = true;
  let viewer;
  let exporting = false;
  let bakingAtlas = false;
  let suspendedViewer;

  const canvas = $('live');
  try {
    viewer = createViewer(canvas);
  } catch {
    showFallback();
  }
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    suspendedViewer = viewer;
    viewer = null;
    showFallback();
    syncInspector();
  });

  function showFallback() {
    canvas.hidden = true;
    $('fallback-frame').hidden = false;
    $('render-indicator').classList.add('offline');
    $('render-mode').textContent = 'VYRENDEROVANÝ SNÍMEK';
    $('fps').textContent = '';
    $('view-message').textContent = 'Živý náhled vyžaduje WebGL 2.';
    $('view-message').hidden = false;
    setStageEnabled(false);
    ['export-png', 'export-atlas'].forEach((id) => { $(id).disabled = true; });
    $('fallback-frame').src = selectedStudy ? stillUrl(selectedStudy.id, true) : stillUrl(asset.id);
  }

  function setStageEnabled(enabled) {
    document.querySelectorAll('#stage button, #stage select, #stage input').forEach((control) => {
      if (control.id !== 'maximize') control.disabled = !enabled;
    });
    document.querySelector('#view .view-bottom').hidden = !enabled;
  }

  canvas.addEventListener('webglcontextrestored', () => {
    if (!suspendedViewer) return;
    viewer = suspendedViewer;
    suspendedViewer = null;
    canvas.hidden = false;
    $('fallback-frame').hidden = true;
    $('view-message').hidden = true;
    $('render-indicator').classList.remove('offline');
    $('render-mode').textContent = 'WEBGL 2';
    setStageEnabled(true);
    resize();
    viewer.configure(asset, settings.quality, true);
    viewer.frame($('camera').value, selectedStudy?.framing);
    viewer.setBackdrop(backdrop);
    viewer.setLightStudio($('light-studio').checked);
    viewer.setWireframe(wire);
    viewer.setGrid(grid);
    $('export-png').disabled = $('export-atlas').disabled = exporting;
    syncInspector();
    dirty = true;
  });

  function stillUrl(id, study = false) { return import.meta.env.BASE_URL + 'renders/' + (study ? 'studies/' : '') + id + '.webp'; }
  const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  function renderCatalog() {
    const search = normalize($('search').value.trim());
    let count = 0;
    $('catalog').innerHTML = groups.map((group) => {
      const results = presets.filter((p) => p.group === group.id &&
        (!search || normalize([p.name, p.material, p.description, ...p.tags].join(' ')).includes(search)));
      if (!results.length) return '';
      count += results.length;
      const expanded = Boolean(search) || !collapsed.has(group.id);
      const rows = results.map((p) => `<button class="asset-row" type="button" data-asset="${p.id}" aria-current="${p.id === asset.id}"><i class="item-marker"></i><span>${p.name}</span></button>`).join('');
      return `<div class="catalog-group">
        <button class="group-head" type="button" data-group="${group.id}" aria-controls="group-${group.id}" aria-expanded="${expanded}">${icon(group.icon)}<span>${group.label}</span><span class="group-arrow">${icon('chevron-down')}</span></button>
        <div id="group-${group.id}" ${expanded ? '' : 'hidden'}>${rows}</div>
      </div>`;
    }).join('') || '<p class="no-results">Žádný odpovídající efekt.</p>';
    $('catalog-status').textContent = search ? count + ' / ' + presets.length + ' efektů' : presets.length + ' efektů';
  }

  function renderGallery() {
    const lead = ['campfire', 'candle', 'tires', 'forest', 'barrel', 'spark', 'car'];
    const scenes = [...lead.map((id) => byId.get(id)), ...presets.filter((p) => !lead.includes(p.id))];
    const studyMode = galleryMode === 'studies';
    const items = studyMode ? studies : scenes;
    $('gallery-mode').querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.gallery === galleryMode);
    });
    $('gallery-caption').textContent = studyMode ? 'Podmínky, detaily a fáze animace. Kliknutím otevřeš konkrétní snímek.' : 'Snímky ze stejného 3D rendereru.';
    $('gallery-track').innerHTML = items.map((p) => {
      const title = studyMode ? p.title : p.name;
      const active = studyMode ? p.id === selectedStudy?.id : p.id === asset.id;
      return `
        <button class="preview-card" type="button" ${studyMode ? 'data-study' : 'data-asset'}="${p.id}" aria-current="${active}" aria-label="Otevřít efekt ${title}">
          <img src="${stillUrl(p.id, studyMode)}" alt="" loading="lazy" decoding="async" width="960" height="592">
          <span class="preview-copy"><span>${title}</span>${icon(studyMode ? 'image' : 'play')}</span>
        </button>`;
    }).join('');
    $('gallery-track').querySelectorAll('img').forEach((image) => image.addEventListener('error', () => { image.hidden = true; }));
  }

  function syncInspector() {
    $('asset-kind').textContent = asset.material;
    $('asset-name').textContent = asset.name;
    $('asset-description').textContent = asset.description;
    $('height').textContent = asset.emission > 0 ? formatNumber.format(asset.height) + ' m' : '—';
    $('triangles').textContent = viewer ? formatNumber.format(viewer.triangles()) : '—';
    $('wind').value = settings.wind;
    $('oxygen').value = Math.round(settings.oxygen * 100);
    updateOxygen();
    $('seed').value = settings.seed;
    $('quality').querySelectorAll('button').forEach((node) => node.setAttribute('aria-pressed', node.dataset.quality === settings.quality));
    const q = qualities[settings.quality];
    $('light-studio').disabled = !viewer;
    $('quality-info').textContent = q.steps + ' kroků objemu · až ' + q.particles + ' částic';
    $('layers').querySelectorAll('[data-burst-only]').forEach((row) => { row.hidden = !asset.burst; });
    $('layers').querySelectorAll('input').forEach((node) => { node.checked = settings.layers[node.value]; });
    $('export-glb').disabled = asset.model === 'none' || exporting;
    $('export-glb').title = asset.model === 'none' ? 'Efekt obsahuje pouze VFX vrstvy' : '';
  }

  function updateOxygen() {
    const percent = Math.round(settings.oxygen * 100);
    $('oxygen-value').textContent = percent + ' %';
    $('oxygen').style.setProperty('--fill', percent + '%');
  }

  function syncTime() {
    $('timeline').max = asset.duration;
    $('timeline').value = time;
    $('timeline').style.setProperty('--fill', (100 * time / asset.duration).toFixed(1) + '%');
    $('time').textContent = timeFormat.format(time) + ' s';
    $('duration').textContent = asset.duration + ' s';
  }

  function updatePlay() {
    $('play').innerHTML = icon(playing ? 'pause' : 'play');
    $('play').title = playing ? 'Pozastavit' : 'Přehrát';
    $('play').setAttribute('aria-label', $('play').title);
  }

  function resize() {
    if (!viewer) return;
    const rect = $('view').getBoundingClientRect();
    viewer.resize(rect.width, rect.height, settings.quality);
    dirty = true;
  }

  function select(id, fromGallery = false, restore = Boolean(selectedStudy)) {
    if (!byId.has(id)) return;
    const next = byId.get(id);
    if (next.id !== asset.id || restore) {
      selectedStudy = null;
      $('light-studio').checked = false;
      viewer?.setLightStudio(false);
      backdrop = false;
      $('backdrop').setAttribute('aria-pressed', 'false');
      viewer?.setBackdrop(false);
      asset = next;
      settings = initialSettings(asset, settings.quality);
      time = asset.burst && playing ? .017 : asset.id === 'grenade' ? .37 : asset.burst ? asset.duration * .041 : .84;
      $('camera').value = 'orbit';
      if (viewer) {
        viewer.configure(asset, settings.quality, true);
      } else $('fallback-frame').src = stillUrl(id);
      $('catalog').querySelectorAll('[data-asset]').forEach((node) => node.setAttribute('aria-current', node.dataset.asset === id));
      $('gallery-track').querySelectorAll('.preview-card').forEach((node) => node.setAttribute('aria-current', node.dataset.asset === id));
      const url = new URL(location.href);
      url.searchParams.set('asset', id);
      history.replaceState(null, '', url);
      syncInspector();
      syncTime();
      dirty = true;
    }
    if (fromGallery) $('stage').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  $('quality').innerHTML = Object.entries(qualities).map(([key, profile]) =>
    `<button data-quality="${key}" type="button" aria-pressed="false">${profile.label}</button>`).join('');
  $('wind').innerHTML = winds.map((wind, i) => `<option value="${i}">${wind.label}</option>`).join('');
  $('layers').innerHTML = layers.map(({ id, label, color, burstOnly }) =>
    `<label class="layer" ${burstOnly ? 'data-burst-only' : ''}><span><i class="layer-dot" style="--layer-color:${color}"></i>${label}</span><input type="checkbox" role="switch" value="${id}" aria-label="${label}"></label>`).join('');

  $('search').addEventListener('input', renderCatalog);
  $('catalog').addEventListener('click', (event) => {
    const row = event.target.closest('[data-asset]');
    const group = event.target.closest('[data-group]');
    if (row) select(row.dataset.asset);
    if (group) {
      const expanded = group.getAttribute('aria-expanded') === 'true';
      group.setAttribute('aria-expanded', !expanded);
      $(group.getAttribute('aria-controls')).hidden = expanded;
      if (expanded) collapsed.add(group.dataset.group);
      else collapsed.delete(group.dataset.group);
    }
  });
  $('gallery-track').addEventListener('click', (event) => {
    const card = event.target.closest('.preview-card');
    if (card?.dataset.asset) select(card.dataset.asset, true);
    if (card?.dataset.study) openStudy(studies.find(({ id }) => id === card.dataset.study));
  });
  $('gallery-mode').addEventListener('click', (event) => {
    const next = event.target.closest('[data-gallery]')?.dataset.gallery;
    if (!next || next === galleryMode) return;
    galleryMode = next;
    renderGallery();
    $('gallery-track').scrollLeft = 0;
  });

  function openStudy(study) {
    select(study.asset, true, true);
    selectedStudy = study;
    time = study.frame;
    playing = false;
    updatePlay();
    applyStudy(settings, study);
    $('light-studio').checked = Boolean(study.lightStudio);
    viewer?.setLightStudio($('light-studio').checked);
    backdrop = Boolean(study.backdrop);
    $('backdrop').setAttribute('aria-pressed', backdrop);
    $('camera').value = study.view ?? 'orbit';
    if (viewer) {
      viewer.setBackdrop(backdrop);
      viewer.frame(study.view, study.framing);
    } else {
      $('fallback-frame').src = stillUrl(study.id, true);
    }
    $('gallery-track').querySelectorAll('[data-study]').forEach((node) => node.setAttribute('aria-current', node.dataset.study === study.id));
    syncInspector();
    syncTime();
    dirty = true;
  }
  for (const [id, direction] of [['gallery-back', -1], ['gallery-next', 1]]) {
    $(id).addEventListener('click', () => $('gallery-track').scrollBy({ left: direction * $('gallery-track').clientWidth * .72, behavior: 'smooth' }));
  }

  $('wind').addEventListener('change', () => { settings.wind = Number($('wind').value); dirty = true; });
  $('oxygen').addEventListener('input', () => { settings.oxygen = Number($('oxygen').value) / 100; updateOxygen(); dirty = true; });
  $('layers').addEventListener('change', (event) => { settings.layers[event.target.value] = event.target.checked; dirty = true; });
  $('seed').addEventListener('change', () => {
    settings.seed = Math.max(0, Math.min(999999, Math.round(Number($('seed').value)) || 0));
    $('seed').value = settings.seed;
    dirty = true;
  });
  $('quality').addEventListener('click', (event) => {
    const button = event.target.closest('[data-quality]');
    if (!button) return;
    settings.quality = button.dataset.quality;
    try { localStorage.setItem('firelab-quality', settings.quality); } catch { /* storage can be disabled */ }
    resize();
    viewer?.configure(asset, settings.quality);
    syncInspector();
  });

  for (const [id, apply] of [['grid', () => viewer?.setGrid(grid = !grid)], ['wire', () => viewer?.setWireframe(wire = !wire)]]) {
    $(id).addEventListener('click', () => {
      apply();
      $(id).setAttribute('aria-pressed', id === 'grid' ? grid : wire);
      dirty = true;
    });
  }
  $('light-studio').addEventListener('change', () => {
    viewer?.setLightStudio($('light-studio').checked);
    dirty = true;
  });
  $('backdrop').addEventListener('click', () => {
    backdrop = !backdrop;
    viewer?.setBackdrop(backdrop);
    $('backdrop').setAttribute('aria-pressed', backdrop);
    dirty = true;
  });
  $('camera').addEventListener('change', () => { viewer?.frame($('camera').value); dirty = true; });
  $('maximize').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await $('stage').requestFullscreen();
    } catch {
      $('view-message').textContent = 'Prohlížeč nepovolil celou obrazovku.';
      $('view-message').hidden = false;
      setTimeout(() => { if (viewer) $('view-message').hidden = true; }, 1800);
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const full = Boolean(document.fullscreenElement);
    $('maximize').innerHTML = icon(full ? 'minimize' : 'maximize');
    $('maximize').setAttribute('aria-pressed', full);
    resize();
  });
  $('play').addEventListener('click', () => {
    if (!playing && time >= asset.duration) time = 0;
    playing = !playing;
    dirty = true;
    updatePlay();
  });
  $('restart').addEventListener('click', () => { time = 0; syncTime(); dirty = true; });
  $('loop').addEventListener('click', () => { looping = !looping; $('loop').setAttribute('aria-pressed', looping); });
  $('speed').addEventListener('change', () => { speed = Number($('speed').value); });
  $('timeline').addEventListener('input', () => {
    time = Number($('timeline').value);
    playing = false;
    updatePlay();
    syncTime();
    dirty = true;
  });

  function openTab(name, focus = false) {
    for (const pane of ['params', 'export']) {
      const active = name === pane;
      const tab = $('tab-' + pane);
      tab.setAttribute('aria-selected', active);
      tab.tabIndex = active ? 0 : -1;
      $('pane-' + pane).hidden = !active;
      if (active && focus) tab.focus();
    }
    resize();
  }
  for (const name of ['params', 'export']) {
    const tab = $('tab-' + name);
    tab.addEventListener('click', () => openTab(name));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      openTab(event.key === 'Home' ? 'params' : event.key === 'End' ? 'export' : name === 'params' ? 'export' : 'params', true);
    });
  }

  function wireExport(id, run) {
    $(id).addEventListener('click', async () => {
      if (exporting) return;
      exporting = true;
      const selected = asset;
      const snapshot = structuredClone(settings);
      const output = $('export-status');
      const progress = $('export-progress');
      const savedTime = time;
      if (id === 'export-atlas') {
        bakingAtlas = true;
        progress.hidden = false;
        progress.value = 0;
      }
      $('export-actions')?.setAttribute('aria-busy', 'true');
      output.textContent = 'Připravuji soubor…';
      const buttons = [...$('pane-export').querySelectorAll('button')];
      buttons.forEach((button) => { button.disabled = true; });
      try {
        await run(await import('./exporter.js'), selected, snapshot, savedTime,
          (fraction) => { progress.value = Math.round(fraction * 100); });
        output.textContent = 'Soubor je připraven ke stažení.';
      } catch (error) {
        output.textContent = error?.message || 'Export se nezdařil.';
      } finally {
        bakingAtlas = false;
        exporting = false;
        progress.hidden = true;
        $('export-actions')?.removeAttribute('aria-busy');
        buttons.forEach((button) => { button.disabled = false; });
        $('export-glb').disabled = asset.model === 'none';
        $('export-png').disabled = $('export-atlas').disabled = !viewer;
      }
    });
  }
  wireExport('export-json', (tools, selected, snapshot) => tools.download(tools.descriptorBlob(selected, snapshot), selected.id + '.json'));
  wireExport('export-glb', async (tools, selected, snapshot) => {
    const buffer = await tools.exportModel(selected, snapshot.quality);
    tools.download(new Blob([buffer], { type: 'model/gltf-binary' }), selected.id + '-' + snapshot.quality + '.glb');
  });
  wireExport('export-png', async (tools, selected, snapshot, savedTime) => {
    if (!viewer || selected.id !== asset.id) throw new Error('Snímek je dostupný v živém náhledu vybraného efektu.');
    viewer.render(savedTime, snapshot);
    tools.download(await tools.canvasBlob(canvas), selected.id + '.png');
  });
  wireExport('export-atlas', async (tools, selected, snapshot, savedTime, progress) => {
    tools.download(await tools.makeFlipbookZip(selected, snapshot, progress), selected.id + '-flipbook.zip');
  });

  renderCatalog();
  renderGallery();
  resize();
  viewer?.configure(asset, settings.quality, true);
  viewer?.onChange?.(() => { dirty = true; });
  new ResizeObserver(resize).observe($('view'));
  syncInspector();
  syncTime();
  updatePlay();

  let previous = performance.now();
  let lastFps = previous;
  let totalFrames = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const delta = Math.min(Math.max((now - previous) / 1000, 0), .16);
    previous = now;
    if (document.hidden || !viewer) return;
    if (playing && !bakingAtlas) {
      time += delta * speed;
      if (time >= asset.duration) {
        time = looping ? time % asset.duration : asset.duration;
        if (!looping) { playing = false; updatePlay(); }
      }
      syncTime();
      dirty = true;
    }
    if (dirty) {
      dirty = false;
      viewer.render(time, settings);
      totalFrames++;
    }
    if (now - lastFps > 950) {
      const rate = totalFrames * 1000 / (now - lastFps);
      $('fps').textContent = playing ? Math.round(rate) + ' FPS' : '';
      lastFps = now;
      totalFrames = 0;
    }
  }
  requestAnimationFrame(tick);
}
