# Fire Asset Lab

Původní procedurální knihovna ohně, kouře a souvisejících 3D efektů pro FPS
a další hry. Webový prohlížeč má 17 scénářů, živou kameru, časovou osu, čtyři
podmínky větru, ovládání přísunu vzduchu a přepínače vrstev.

## Spuštění

Potřebujete Node.js 20.19+ nebo 22.12+ a pro živou scénu prohlížeč s WebGL 2.

```sh
npm ci
npm run dev
```

V terminálu se vypíše adresa prohlížeče. Pro produkční sestavení použijte
`npm run build` a servírujte složku `dist/`. Aplikace pracuje bez CDN, API i
databáze. Bez WebGL 2 zůstává dostupný katalog se statickými rendery a stažení dat.

## Dataset

[Stáhnout Fire Asset Lab ZIP](public/dataset/fire-asset-lab.zip)

Balík obsahuje 17 náhledových renderů, 17 animačních atlasů s alfou,
GLB ve třech profilech pro 15 scén s geometrií, 136 presetů
podmínek a tři hustoty vzorku dřevěného uhlí od 100 do 1 000 000
trojúhelníků. Specifikaci importu do enginu najdete v [ASSETS.md](ASSETS.md).
Živý inspektor exportuje aktuální nastavení, GLB, PNG snímek i nový flipbook
podle zvolených podmínek.

| Profil | Kroků raymarchingu | Limit částic | Účel |
| --- | ---: | ---: | --- |
| T460 | 22 | 72 | Nižší renderovací rozlišení, jednoduchá geometrie a vypnuté mapy stínů |
| Balanced | 39 | 210 | Interaktivní práce s rozumným rozpočtem |
| Cinematic | 62 | 420 | Jemnější objem, podrobnější geometrie a vyšší rozlišení stínů |

T460 je cílový profil pro integrovanou grafiku, jeho výkon na konkrétním
Lenovu nebyl změřen. Vzhled je procedurální a referenční. Knihovna používá
filmové VFX a metrové souřadnice pro scénu, bez inženýrské kalibrace hoření.

## Vývoj a návaznost

- [ASTRA.md](ASTRA.md) popisuje konvence a postup spuštění.
- [ARCHITECTURE.md](ARCHITECTURE.md) popisuje moduly rendereru a formáty.
- [DECISIONS.md](DECISIONS.md) obsahuje záznam rozhodnutí.
- [TODO.md](TODO.md) obsahuje aktuální stav a zbývající ověření.

`npm run check` ověří presety, geometrii a exportovaný balík.
`npm run bake` obnoví rendery i ZIP pomocí místního Chromia. Cestu k
Chromiu lze nastavit přes `CHROMIUM_PATH`. Volby `--stills-only`,
`--ids=campfire,candle` a `--size=96` řídí rozsah. Po změně exportů
spusťte sestavení znovu, aby se soubory z `public/` zkopírovaly do `dist/`.
