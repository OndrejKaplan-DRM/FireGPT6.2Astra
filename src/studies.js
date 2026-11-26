const shot = (id, asset, title, frame, options = {}) => ({ id, asset, title, frame, ...options });
const smokeOnly = { flame: false, sparks: false, heat: false };

export const studies = [
  shot('wax-macro', 'candle', 'Svíčka · knot a vosk', 1.43, { framing: 'detail', view: 'front' }),
  shot('wax-side', 'candle', 'Svíčka · boční profil', 2.23, { framing: 'detail', view: 'side', wind: 1 }),
  shot('torch-heat-clear', 'torch', 'Louč · refrakční pozadí', 1.71, { backdrop: true, layers: { heat: false } }),
  shot('torch-heat-active', 'torch', 'Louč · chvění vzduchu', 1.71, { backdrop: true }),
  shot('ember-bed', 'campfire', 'Ohniště · popel a uhlíky', 2.48, { view: 'top', framing: 'detail', layers: { flame: false, smoke: false, sparks: false, heat: false } }),
  shot('campfire-detail', 'campfire', 'Ohniště · jazyky plamene', 2.48, { framing: 'detail', view: 'side' }),
  shot('campfire-still-air', 'campfire', 'Ohniště · bezvětří', 1.89, { wind: 0 }),
  shot('campfire-gale', 'campfire', 'Ohniště · vichr', 1.89, { wind: 3 }),
  shot('campfire-low-air', 'campfire', 'Ohniště · omezený vzduch', 2.35, { oxygen: .24, wind: 0 }),
  shot('kindling-distant', 'kindling', 'Ohýnek · čelní pohled', 2.91, { view: 'front' }),
  shot('spark-trails', 'spark', 'Jiskry · světelné stopy', 1.17, { framing: 'detail' }),
  shot('tire-ash', 'tires', 'Pneumatiky · samotný kouř', 2.81, { layers: smokeOnly, oxygen: .24, wind: 0 }),
  shot('tire-ventilated', 'tires', 'Pneumatiky · plný přísun vzduchu', 2.81, { oxygen: 1, wind: 0 }),
  shot('hay-flanks', 'hay', 'Stoh · okraj plamene', 3.31, { view: 'side', wind: 2 }),
  shot('diesel-front', 'diesel', 'Kapalina · ohnivý lem', 1.11, { view: 'front', wind: 1 }),
  shot('car-smoke', 'car', 'Auto · kouř za světla', 3.58, { view: 'side', wind: 1, layers: smokeOnly }),
  shot('forest-smoke', 'forest', 'Les · kouř v poryvu', 3.4, { wind: 3 }),
  shot('house-profile', 'house', 'Dům · boční pohled', 2.73, { view: 'side' }),
  shot('drum-flash', 'barrel', 'Sud · první záblesk', .078),
  shot('drum-flame', 'barrel', 'Sud · odtržený výšleh', .44),
  shot('drum-smoke', 'barrel', 'Sud · kouř po záblesku', 1.6),
  shot('cylinder-flash', 'acetylene', 'Tlaková lahev · světelný impuls', .073),
  shot('cylinder-tail', 'acetylene', 'Tlaková lahev · dozvuk', 1.42),
  shot('grenade-flash', 'grenade', 'Granát · krátký záblesk', .048),
  shot('grenade-dust', 'grenade', 'Granát · nízký prach', .45, { layers: { ...smokeOnly, smoke: false } }),
  shot('grenade-smoke', 'grenade', 'Granát · samotný kouř', .62, { layers: { ...smokeOnly, dust: false } }),
  shot('grenade-clearing', 'grenade', 'Granát · rozpouštění oblaku', 1.54),
  shot('tnt-flash', 'tnt', 'Velký sud · světelný impuls', .11),
  shot('tnt-billow', 'tnt', 'Velký sud · rozvinutý oblak', 1.25),
  shot('tnt-smoke', 'tnt', 'Velký sud · samotný kouř', 1.25, { layers: { ...smokeOnly, dust: false } }),
  shot('tnt-late', 'tnt', 'Velký sud · doznívající oblak', 3.35),
];

export function applyStudy(settings, study) {
  if (study.wind !== undefined) settings.wind = study.wind;
  if (study.oxygen !== undefined) settings.oxygen = study.oxygen;
  Object.assign(settings.layers, study.layers);
  return settings;
}
