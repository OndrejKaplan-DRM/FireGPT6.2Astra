# Architektura

Fire Asset Lab používá statický Vite frontend s Three.js a WebGL 2.
Přenositelné soubory lze využít přímo v enginu nebo s jeho vlastním VFX systémem.

| Modul | Zodpovědnost |
| --- | --- |
| `src/catalog.js` | Stabilní ID, názvy, rozměry, objemové parametry a profily kvality, konstrukce descriptoru |
| `src/models.js` | Deterministická původní geometrie, PBR materiály, vertex barvy a tři LOD |
| `src/particles.js` | Seedované žhavé částice, konce stop a jejich časový vývoj |
| `src/volume.js` | Periodický 3D šum, tvar a advekce plamene a kouře, raymarching a kompozice |
| `src/viewer.js` | Scéna, GPU render target s hloubkou, světla, kamera, rozpočty a životnost GPU zdrojů |
| `src/main.js` | Katalog, transport animace, inspektor, nastavení a fallback snímek |
| `src/exporter.js` | Serializace GLB a JSON a průhledný flipbook ze stejného rendereru |
| `src/bake.js`, `scripts/bake.mjs` | Reprodukovatelné dávkové rendery, scény GLB, manifesty a ZIP |
| `public/renders/`, `public/dataset/` | Snímky galerie a vygenerované distribuční soubory |

## Renderovací pipeline

1. Z katalogu se vytvoří nastavení efektu a z profilu příslušný model.
   Kamera má předvolby perspektiva, zepředu, z boku a shora.
2. Renderer kreslí pozadí, podlahu, scénickou geometrii a žhavé částice
   do barevného a hloubkového render targetu. Pokud je dostupný plovoucí
   formát, používá lineární HDR.
3. Obrazový shader rekonstruuje paprsek z projekce, ořízne jej boxem objemu
   a hloubkou geometrie. Skládá emisi a extinkci od kamery dozadu.
   Parametry větru, turbulence a přísunu vzduchu řídí deformaci a hustotu.
4. Chvění vzduchu posune čtení pozadí uvnitř objemu. Finální průchod
   převádí lineární barvu filmovou křivkou do sRGB.
5. Bake používá shodný renderer v řízeném čase a průhledném režimu.
   Profil určuje počet vzorků objemu, rozpočet částic, stíny a LOD.
   Průhledný atlas používá jednu kameru a sRGB s přímou alfou.

## Datové rozhraní

`fire-asset-lab/preset@1` popisuje jednotky, geometrii zdroje, čas efektu a
vzhledové parametry. Objekt `settings` drží uživatelské volby. `models`
a `flipbook` v distribučním manifestu odkazují na přenositelné assety.
`fire-asset-lab/dataset@1` indexuje jednotlivé manifesty a ukázky rozpočtů.
`ASSETS.md` popisuje kameru, barevný prostor a pořadí snímků.
