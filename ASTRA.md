# ASTRA

Fire Asset Lab je knihovna originálních herních VFX s nezávislým
datasetem a webovým prohlížečem. Tento soubor je projektová paměť.
Codex a další agenty sem směruje kořenový `AGENTS.md`.

## Start

- Instalace `npm ci`, lokální vývoj `npm run dev`, kontrola `npm run check`.
- Produkce `npm run build`. Výstup je statické `dist/`.
- Po změně geometrie, vizuálních parametrů nebo formátu spusť
  `npm run bake` a znovu `npm run build`. Bake vyžaduje Chromium.
- Před úpravou přečti `TODO.md` a dotčenou část `ARCHITECTURE.md`.
  Významná návrhová rozhodnutí zapiš do `DECISIONS.md`.

## Konvence

- Kód a stabilní identifikátory anglicky, UI a projektová dokumentace česky.
- Vstupní hodnoty a schéma ukládej v `src/catalog.js`. Preset ID zůstává
  stabilní napříč názvy, rendery a exporty.
- Používej metry, osu Y vzhůru, pravotočivé souřadnice a pivot na podlaze.
- Procedurální výsledky musí fungovat s pevným seedem. Hodnoty přísunu
  vzduchu jsou v intervalu 0–1, vítr má čtyři indexované stupně.
- Nová geometrie má zůstat v původním zdrojovém kódu a mít tři úrovně.
  U externího podkladu zaznamenej zdroj a licenci. Aktuální grafická data
  jsou vlastní procedurální tvorba.
- Chraň kompatibilitu exportního schématu. Při nekompatibilní změně verzi
  zvyš a popiš dopad na import.
- Udržuj statickou aplikaci bez síťových závislostí za běhu. Neukládej
  tokeny, propojení relací ani soubory z `work/` do historie.
- Při editaci profilů uváděj skutečné limity. Výkon konkrétního hardwaru
  uváděj po měření. Požáry a exploze modeluj jako herní obrazové efekty.

Po dokončení vývojového kroku zaznamenej provedené kontroly a uprav stav
v `TODO.md`, aby další relace mohla navázat přímo v repozitáři.
