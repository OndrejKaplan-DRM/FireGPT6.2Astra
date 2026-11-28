# Fire Asset Lab · Dataset v0.2.1

Rozbalte ZIP a otevřete `catalog.json`. Index odkazuje na manifest každého efektu.
Původní procedurální modely, materiály, animace a rendery vznikly v tomto projektu.

## Použití v enginu

1. Zvolte položku v `assets/<id>/manifest.json`. `models` odkazuje na GLB
   pro profily T460 (`low`), Balanced (`balanced`) a Cinematic (`cinematic`).
   Dva čistě částicové či objemové efekty mají prázdné `models`.
2. Ukotvěte model do počátku na úrovni podlahy. Scéna používá metry,
   pravotočivou soustavu a osu +Y nahoru. Při importu respektujte konverzi
   souřadnic konkrétního enginu. Některé části ohniště a pneumatik přesahují
   pod terén. Pro výměnu LOD ponechte stejný autorský počátek. Automatické
   zarovnání každého LOD podle nejnižšího vrcholu může modelem při přepnutí pohnout.
3. `flipbook.png` je barevný snímkový atlas v sRGB s přímou alfou.
   Použijte obvyklé průhledné vykreslování a odpovídající nastavení sRGB i alfy
   při importu. Každý frame leží v buňce `frameWidth × frameHeight` v pořadí
   zleva doprava a shora dolů. Pro bilineární filtr držte UV uvnitř buňky
   s odsazením poloviny texelu.
   Vypněte automatické mipmapy celého atlasu, nebo je vytvořte pro každou buňku zvlášť.
   Interpolace mezi snímky je volitelná. Příznak `loop` určuje,
   jestli se má animace opakovat. `bakedLayers` popisuje vrstvy ve snímku.
   Průběžné efekty mají rovnoměrné vzorky podle `frameRate`. Když je
   uvedeno pole `frameTimes`, vyberte snímky podle těchto časů v sekundách.
   U jednorázových efektů se tak vejde více vzorků do krátkého úvodního
   záblesku. Číslo `frameRate` v takovém atlasu je jmenovitý průměr.
4. Pro vlastní podmínky načtěte `variants/` jako nastavení pro procedurální
   renderer, nebo je v prohlížeči nastavte ručně a znovu exportujte flipbook.
   Přísun vzduchu je normalizovaný parametr vzhledu kouře a plamene.
5. Jako referenci měřítka a kamery použijte `preview.webp`. GLB a flipbook
   lze kombinovat. Atlas v0.2.1 používá pevnou ortografickou kameru z +Z a 48 polí po 160 × 160 px.
   Nastavte rozměry roviny podle `flipbook.plane.widthMeters` a `heightMeters`.
   `pivotUV` je poloha počátku modelu v buňce s počátkem vlevo nahoře (U doprava, V dolů).
   Pro billboard s ukotvením měřeným odspodu použijte `(u, 1 − v)`. Pivot může
   ležet mimo buňku, například u plamene umístěného vysoko nad podlahou.
   Alternativně umístěte střed roviny do `plane.center` v metrech. Použijte jen jeden
   z těchto způsobů umístění. Starší atlasy v0.2.0 měly perspektivní pohled,
   bez pole `plane`; jejich měřítko dolaďte podle náhledu.

`studies/` obsahuje 31 renderů detailů, podmínek a fází v rozlišení
960 × 592 px. Pole `studies` v katalogu uvádí presety, kameru, čas a vrstvy.

`geometry/` obsahuje stejný samostatný vzorek dřevěného uhlí s třemi
rozpočty až do 1 000 000 trojúhelníků. Nejhustší varianta slouží jako
zdroj pro test importu či redukce geometrie.

Chvění vzduchu se počítá před kompozicí a potřebuje obraz pozadí. Náhled má
tuto vrstvu a volitelné refrakční pozadí. Průhledné atlasy ukládají
plamen, kouř, jiskry a prach podle manifestu. Presety
exploze popisují výhradně stylizovaný herní obraz. Dataset neobsahuje fyzikálně
kalibrované údaje o požárech nebo tlakových vlnách.

## Godot 4 · referenční nastavení importu

Použijte bezeztrátový import PNG, vypněte `Process > Fix Alpha Border`,
`Premult Alpha`, VRAM kompresi a generování mipmap atlasu. Zvolte
`StandardMaterial3D` s `Shading Mode = Unshaded` a `Transparency = Alpha`.
Test přesné shody používá filtr Nearest. Pro zvolenou buňku nastavte
`UV1 Scale` na `(1 / columns, 1 / rows)` a `UV1 Offset` na
`(column / columns, row / rows)`. Počítejte od nuly. U jednorázového klipu
vyberte poslední položku `frameTimes` s časem menším nebo rovným času přehrávání.
