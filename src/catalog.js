export const SCHEMA = 'fire-asset-lab/preset@1';
export const VERSION = '0.2.0';

export const groups = [
  { id: 'detail', label: 'Drobné efekty', icon: 'flame' },
  { id: 'fire', label: 'Otevřený oheň', icon: 'flame-kindling' },
  { id: 'material', label: 'Materiály', icon: 'layers-3' },
  { id: 'scene', label: 'Velké scény', icon: 'trees' },
  { id: 'burst', label: 'Exploze · VFX', icon: 'zap' },
];

export const qualities = {
  low: { label: 'T460', scale: 0.68, maxPixels: 355_000, steps: 22, octaves: 3, particles: 72, shadow: 0, exposure: 1 },
  balanced: { label: 'Balanced', scale: 0.9, maxPixels: 850_000, steps: 44, octaves: 4, particles: 210, shadow: 512, exposure: 1 },
  cinematic: { label: 'Cinematic', scale: 1.15, maxPixels: 1_600_000, steps: 82, octaves: 6, particles: 420, shadow: 1024, exposure: 1 },
};

export const winds = [
  { label: 'Bezvětří', bend: 0 },
  { label: 'Vánek', bend: 0.21 },
  { label: 'Vítr', bend: 0.52 },
  { label: 'Vichr', bend: 0.88 },
];

export const layers = [
  { id: 'flame', label: 'Plamen', color: '#fa813c' },
  { id: 'smoke', label: 'Kouř', color: '#b9b0aa' },
  { id: 'sparks', label: 'Jiskry', color: '#ffbf69' },
  { id: 'heat', label: 'Chvění vzduchu', color: '#7ca0ac' },
  { id: 'dust', label: 'Prach', color: '#b59576', burstOnly: true },
];

const preset = (id, group, name, material, description, model, dims, art, options = {}) => ({
  id, group, name, material, description, model,
  width: dims[0], height: dims[1], base: dims[2],
  depth: options.depth ?? dims[0],
  scale: options.scale ?? 1,
  emission: art[0], smoke: art[1], soot: art[2], spark: art[3],
  turbulence: options.turbulence ?? 0.65,
  thermal: options.thermal ?? 0.45,
  shape: options.shape ?? 'plume',
  duration: options.duration ?? 8,
  wind: options.wind ?? 1,
  oxygen: options.oxygen ?? 1,
  burst: group === 'burst',
  // Artistic clip controls in order: plume shape, flash fade, smoke opacity, dust opacity.
  burstLook: options.burstLook ?? null,
  tags: options.tags ?? [],
});

export const presets = [
  preset('spark', 'detail', 'Jiskra', 'Žhavé částice', 'Krátké dráhy žhavých částic se světelnými stopami.', 'none',
    [0.46, 0.58, 0.035], [0, 0, 0, 0.84], { duration: 3, wind: 0, tags: ['částice', 'mikro'] }),
  preset('candle', 'detail', 'Plamen svíčky', 'Vosk', 'Úzký plamen s namodralou patou a jemným chvěním nad knotem.', 'candle',
    [0.042, 0.112, 0.548], [1.22, 0.04, 0.04, 0], { shape: 'wick', scale: 1.12, turbulence: 0.24, thermal: 0.17, wind: 0, tags: ['stabilní', 'mikro'] }),
  preset('torch', 'detail', 'Louč', 'Dřevo a tkanina', 'Protáhlý plamen se světelným spádem podél topůrka.', 'torch',
    [0.41, 0.92, 1.17], [1.27, 0.2, 0.22, 0.28], { shape: 'wick', tags: ['stabilní', 'mobilní'] }),
  preset('kindling', 'fire', 'Ohýnek', 'Třísky a větve', 'Drobná ohniska mezi třískami s přerušovanými plamínky.', 'campfire',
    [0.66, 0.63, 0.12], [0.92, 0.21, 0.18, 0.25], { scale: 0.62, tags: ['dřevo', 'malý'] }),
  preset('campfire', 'fire', 'Táborový oheň', 'Dřevo a uhlíky', 'Žhavá polena, propletené jazyky plamene a obláčky kouře nad ohništěm.', 'campfire',
    [1.32, 1.72, 0.16], [1.38, 0.43, 0.28, 0.77], { tags: ['dřevo', 'střední'] }),
  preset('blaze', 'fire', 'Rozvinutý požár', 'Smíšené trosky', 'Více ohnisek s nepravidelným okrajem, hustým sloupcem kouře a uhlíky.', 'crate',
    [3.3, 3.75, 0.18], [1.34, 0.76, 0.61, 0.73], { shape: 'front', tags: ['více ohnisek', 'velký'] }),
  preset('hay', 'material', 'Hořící stoh', 'Sláma', 'Rozptýlený plamen přes slámu s lehkými odlétajícími uhlíky.', 'hay',
    [3.1, 2.95, 0.86], [1.27, 0.64, 0.29, 0.85], { shape: 'front', depth: 2.05, tags: ['vlákna', 'rozptýlený'] }),
  preset('tires', 'material', 'Hořící pneumatiky', 'Pryž a saze', 'Tmavý, opticky hustý kouř se záblesky plamenů mezi pneumatikami.', 'tires',
    [2.17, 2.55, 0.35], [0.71, 1.73, 0.94, 0.23], { shape: 'front', oxygen: 0.43, tags: ['saze', 'hutný kouř'] }),
  preset('diesel', 'material', 'Rozlitá nafta · 20 l', 'Kapalina', 'Mělká louže s ohnivým lemem a nepravidelnými výšlehy po hladině.', 'spill',
    [2.74, 1.47, 0.04], [1.3, 0.96, 0.76, 0.18], { shape: 'front', depth: 1.65, tags: ['povrch', 'kapalina'] }),
  preset('car', 'scene', 'Požár auta', 'Kov, plast a sklo', 'Nepravidelný požár karoserie se zřetelným zdrojem nad přední částí.', 'car',
    [3.65, 2.62, 0.48], [1.19, 1.03, 0.78, 0.54], { shape: 'front', depth: 1.32, tags: ['vozidlo', 'saze'] }),
  preset('brush', 'scene', 'Požár suchého křoví', 'Větve a listí', 'Nízká, roztřepená fronta nad suchými větvemi.', 'brush',
    [4.24, 2.28, 0.11], [1.23, 0.48, 0.34, 0.83], { shape: 'front', depth: 2.14, wind: 2, tags: ['vegetace', 'fronta'] }),
  preset('forest', 'scene', 'Lesní požár', 'Jehličnany', 'Plameny ve spodních patrech několika stromů s rozptýleným kouřem.', 'forest',
    [7.6, 5.2, 0.43], [0.98, 0.75, 0.51, 0.8], { shape: 'front', depth: 4.6, wind: 2, tags: ['vegetace', 'velký'] }),
  preset('house', 'scene', 'Požár domu', 'Dřevo a zdivo', 'Plameny podél fasády a střechy s kouřem v horní části záběru.', 'house',
    [5.6, 4.76, 0.62], [1.26, 1.1, 0.65, 0.64], { shape: 'front', depth: 3.45, tags: ['stavba', 'velký'] }),
  preset('barrel', 'burst', 'Výbuch sudu s benzínem', 'Filmová ohnivá koule', 'Krátký oranžový záblesk se stoupající ohnivou koulí a doznívajícím kouřem.', 'drum',
    [2.72, 3.2, 0.62], [1.5, 0.95, 0.61, 0.86], { shape: 'burst', duration: 5, burstLook: [.38, 13.8, .95, .27], tags: ['záblesk', 'jednorázový'] }),
  preset('acetylene', 'burst', 'Výbuch tlakové lahve', 'Filmový VFX · acetylen', 'Úzký světelný impuls s rychle rozvinutým kouřovým oblakem.', 'cylinder',
    [1.94, 3.25, 0.66], [1.68, 0.65, 0.32, 0.64], { shape: 'burst', duration: 5, burstLook: [.98, 23, .52, .27], tags: ['záblesk', 'jednorázový'] }),
  preset('grenade', 'burst', 'Výbuch granátu', 'Filmový VFX', 'Nízký světelný impuls, zrnitý prach při zemi a malý neutrální oblak.', 'none',
    [1.9, 1.6, 0.24], [1.47, 0.89, 0.23, .58], { shape: 'burst', duration: 4, wind: 0, burstLook: [.08, 76, .34, 1.79], tags: ['prach', 'jednorázový'] }),
  preset('tnt', 'burst', 'Výbuch ve velkém sudu', 'Filmový VFX · 1 t TNT', 'Krátký teplý záblesk přechází do členitého tmavého oblaku a prachového závoje.', 'drum',
    [9.4, 10.5, 0.68], [1.82, 1.4, 0.81, 0.9], { shape: 'burst', duration: 8, scale: 2.2, burstLook: [.51, 19, 1.72, .8], tags: ['kouřový oblak', 'jednorázový'] }),
];

const modelHeights = { candle: 0.56, torch: 1.26, campfire: 0.35, hay: 1.1, tires: 0.9, car: 1.2, drum: 1.08, cylinder: 1.03, forest: 4.5, house: 3.8, brush: 1 };
const modelWidths = { candle: 0.22, torch: 0.55, campfire: 1.7, hay: 3.1, tires: 2.5, spill: 2.9, car: 4.1, drum: 0.85, cylinder: 0.55, forest: 8, house: 6, brush: 4, crate: 2.7 };
export function frameFor(asset) {
  const modelWidth = (modelWidths[asset.model] ?? 0) * asset.scale;
  const modelHeight = (modelHeights[asset.model] ?? 0) * asset.scale;
  const top = asset.base + asset.height * (asset.burst ? 1.25 : 1.35);
  return { target: (top + modelHeight * 0.15) * 0.405, span: Math.max(top * 0.99, modelWidth * 0.94, 0.56) };
}

export function createDescriptor(asset, settings) {
  return {
    schema: SCHEMA, version: VERSION,
    space: { units: 'm', up: '+Y', forward: '+Z', handedness: 'right' },
    provenance: 'Fire Asset Lab. Original procedural source.',
    domain: 'Art-directed game VFX',
    asset: structuredClone(asset),
    settings: {
      quality: settings.quality, wind: settings.wind, oxygen: settings.oxygen,
      seed: settings.seed, layers: { ...settings.layers },
    },
  };
}

export function initialSettings(asset, quality = 'balanced') {
  return {
    quality,
    wind: asset.wind,
    oxygen: asset.oxygen,
    seed: 37,
    layers: { flame: true, smoke: true, sparks: true, heat: true, dust: true },
  };
}
