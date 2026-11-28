# Fire Asset Lab

Původní procedurální knihovna ohně, kouře a souvisejících 3D efektů pro FPS
a další hry. Webový prohlížeč má 17 scénářů, živou kameru, časovou osu, čtyři
podmínky větru, ovládání přísunu vzduchu a přepínače vrstev.

Soukromý webový náhled vyžaduje přihlášení k účtu ChatGPT vlastníka.
[Otevřít Fire Asset Lab](https://fire-asset-lab-astra.ondrejkaplandrm.chatgpt.site)

## Spuštění

Potřebujete Node.js 20.19+ nebo 22.12+ a pro živou scénu prohlížeč s WebGL 2.

```sh
npm ci
npm run dev
```

V terminálu se vypíše adresa prohlížeče. Pro produkční sestavení použijte
`npm run build` a servírujte složku `dist/`. Aplikace pracuje bez CDN, API i
databáze. Bez WebGL 2 zůstává dostupný katalog se statickými rendery a stažení dat.

## Opravy ve v0.2.1

Atlasy mají 160 × 160 px na snímek. Rozměry billboardu, směr pohledu a pivot
jsou přímo v manifestu. V inspektoru lze zapnout světlé studiové pozadí
pro posouzení tmavého kouře. Opravy UV a dosednutí modelu jsou vidět při importu
do Blenderu. Postup importu do Godotu a snímky před a po shrnuje [audit](AUDIT.md).

## Vizuální studie z v0.2.0

V galerii přepni ze **Scén** na **Studie**. Kliknutí na studii otevře
odpovídající čas animace, pohled, vrstvy a podmínky v živém náhledu.
Refrakční pozadí za loučí ukáže, kde chvění vzduchu deformuje obraz.

[Rešerše 100 referencí](REFERENCES.md) popisuje výběr, jednotlivé zdroje
a způsob, jakým se jejich obrazové znaky promítly do renderu.

| Model | Cinematic v0.1 | Cinematic v0.2 |
| --- | ---: | ---: |
| Svíčka | 992 | 8 880 |
| Ohniště | 5 260 | 35 982 |
| Pneumatiky | 14 612 | 43 508 |
| Les | 50 432 | 84 800 |
| Dům | 4 178 | 21 266 |

Pro srovnání otevři [detail knotu](public/renders/studies/wax-macro.webp),
[žhavé lože](public/renders/studies/ember-bed.webp),
[nízký prach](public/renders/studies/grenade-dust.webp) nebo
[stoupající kouřový oblak](public/renders/studies/tnt-smoke.webp).

## Dataset

[Stáhnout Fire Asset Lab ZIP](public/dataset/fire-asset-lab.zip)

Balík obsahuje 48 renderů v rozlišení 960 × 592 px, z toho 31 studií,
17 animačních atlasů s alfou,
GLB ve třech profilech pro 15 scén s geometrií, 136 presetů
podmínek a tři hustoty vzorku dřevěného uhlí od 100 do 1 000 000
trojúhelníků. Specifikaci importu do enginu najdete v [ASSETS.md](ASSETS.md).
Živý inspektor exportuje aktuální nastavení, GLB, PNG snímek i nový flipbook
podle zvolených podmínek.

| Profil | Kroků raymarchingu | Limit částic | Účel |
| --- | ---: | ---: | --- |
| T460 | 22 | 72 | Nižší renderovací rozlišení, jednoduchá geometrie a vypnuté mapy stínů |
| Balanced | 44 | 210 | Interaktivní práce s rozumným rozpočtem |
| Cinematic | 82 | 420 | Jemnější objem, podrobnější geometrie a vyšší rozlišení stínů |

T460 je cílový profil pro integrovanou grafiku, jeho výkon na konkrétním
Lenovu nebyl změřen. Vzhled je procedurální a referenční. Knihovna používá
filmové VFX a metrové souřadnice pro scénu, bez inženýrské kalibrace hoření.

## Vývoj a návaznost

- [ForGPT.md](ForGPT.md) popisuje konvence a postup spuštění.
- [ARCHITECTURE.md](ARCHITECTURE.md) popisuje moduly rendereru a formáty.
- [DECISIONS.md](DECISIONS.md) obsahuje záznam rozhodnutí.
- [TODO.md](TODO.md) obsahuje aktuální stav a zbývající ověření.

`npm run check` ověří presety, geometrii a exportovaný balík.
`npm run bake` obnoví rendery i ZIP pomocí místního Chromia. Cestu k
Chromiu lze nastavit přes `CHROMIUM_PATH`. Volby `--stills-only`,
`--ids=campfire,candle`, `--study-ids=grenade-dust,tnt-smoke` a `--size=160` řídí rozsah. Po změně exportů
spusťte sestavení znovu, aby se soubory z `public/` zkopírovaly do `dist/`.
