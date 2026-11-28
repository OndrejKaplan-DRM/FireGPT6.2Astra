# Architektura

Fire Asset Lab používá statický Vite frontend s Three.js a WebGL 2.
Přenositelné soubory lze využít přímo v enginu nebo s jeho vlastním VFX systémem.

| Modul | Zodpovědnost |
| --- | --- |
| `src/catalog.js` | Stabilní ID, názvy, rozměry, objemové parametry a profily kvality, konstrukce descriptoru |
| `src/models.js` | Deterministická původní geometrie, PBR materiály, vertex barvy a tři LOD |
| `src/particles.js` | Seedované žhavé částice, změny barvy při chladnutí a segmentované stopy |
| `src/volume.js` | Periodický 3D šum, doménové deformace a raymarching emisivních a rozptylujících vrstev |
| `src/viewer.js` | Scéna, GPU render target s hloubkou, světla, kamera, rozpočty a životnost GPU zdrojů |
| `src/studies.js` | Definice studiových záběrů a aplikace jejich parametrů v náhledu i při bake |
| `src/main.js` | Katalog, transport animace, inspektor, nastavení a fallback snímek |
| `src/atlas.js` | Výpočet společného záběru pro celý atlas, rozměry v metrech a kotevní bod v UV |
| `src/exporter.js` | Serializace GLB a JSON a průhledný flipbook ze stejného rendereru |
| `src/bake.js`, `scripts/bake.mjs` | Reprodukovatelné dávkové rendery, scény GLB, manifesty a ZIP |
| `scripts/check.mjs`, `scripts/check-import.mjs` | Kontrola distribučních PNG po dekódování, skutečný import GLB, kontrola 3D ploch, UV a souladu manifestů |
| `scripts/check-godot.mjs`, `scripts/check-godot.gd` | Samostatný spotřebitelský test ve skutečném enginu, složení tří atlasů přes černou a bílou |
| `public/renders/`, `public/dataset/` | Snímky galerie a vygenerované distribuční soubory |

## Renderovací pipeline

1. Z katalogu se vytvoří nastavení efektu a z profilu příslušný model.
   Kamera má předvolby perspektiva, zepředu, z boku a shora. Studie mohou
   vyžádat záběr celého sloupce a neutrální světlé studio.
2. Renderer kreslí pozadí, podlahu, scénickou geometrii a žhavé částice
   do barevného a hloubkového render targetu. Pokud je dostupný plovoucí
   formát, používá lineární HDR.
3. Obrazový shader rekonstruuje paprsek z projekce, ořízne jej boxem objemu
   a hloubkou geometrie. Skládá emisi a extinkci od kamery dozadu.
   Parametry větru, turbulence a přísunu vzduchu řídí deformaci a hustotu.
   Pro krátké efekty se samostatně skládá emisivní záblesk, stoupající
   kouř a nízký rozptýlený prach.
4. Chvění vzduchu posune čtení pozadí podle směrových rozdílů šumu
   vzorkovaných podél paprsku. Finální průchod
   převádí lineární barvu filmovou křivkou do sRGB.
5. Bake používá shodný renderer v řízeném čase a průhledném režimu.
   Profil určuje počet vzorků objemu, rozpočet částic, stíny a LOD.
   Galerie používá perspektivu. Průhledný atlas používá čelní ortografickou
   kameru. Každý paprsek začíná na odpovídajícím místě přední roviny kamery.
   Záběr je pevný po délku klipu a zohledňuje zvolený vítr. Výsledkem je sRGB s přímou alfou. U burstů
   jsou časy jednotlivých vzorků uložené v `frameTimes`.

## Datové rozhraní

`fire-asset-lab/preset@1` popisuje jednotky, geometrii zdroje, čas efektu a
vzhledové parametry. Objekt `settings` drží uživatelské volby. `models`
a `flipbook` v distribučním manifestu odkazují na přenositelné assety.
`fire-asset-lab/dataset@1` indexuje jednotlivé manifesty a ukázky rozpočtů.
`ASSETS.md` popisuje kameru, barevný prostor a pořadí snímků.
