# Fire Asset Lab · Dataset v0.2.0

Rozbalte ZIP a otevřete `catalog.json`. Index odkazuje na manifest každého efektu.
Původní procedurální modely, materiály, animace a rendery vznikly v tomto projektu.

## Použití v enginu

1. Zvolte položku v `assets/<id>/manifest.json`. `models` odkazuje na GLB
   pro profily T460 (`low`), Balanced (`balanced`) a Cinematic (`cinematic`).
   Dva čistě částicové či objemové efekty mají prázdné `models`.
2. Ukotvěte model do počátku na úrovni podlahy. Scéna používá metry,
   pravotočivou soustavu a osu +Y nahoru. Při importu respektujte konverzi
   souřadnic konkrétního enginu.
3. `flipbook.png` je barevný snímkový atlas v sRGB s přímou alfou.
   Použijte obvyklé průhledné vykreslování a odpovídající nastavení sRGB i alfy
   při importu. Každý frame leží v buňce `frameWidth × frameHeight` v pořadí
   zleva doprava a shora dolů. Používejte UV odsazení proti přetékání barev do
   sousedních buněk. Interpolace mezi snímky je volitelná. Příznak `loop` určuje,
   jestli se má animace opakovat. `bakedLayers` popisuje vrstvy ve snímku.
   Průběžné efekty mají rovnoměrné vzorky podle `frameRate`. Když je
   uvedeno pole `frameTimes`, vyberte snímky podle těchto časů v sekundách.
   U jednorázových efektů se tak vejde více vzorků do krátkého úvodního
   záblesku. Číslo `frameRate` v takovém atlasu je jmenovitý průměr.
4. Pro vlastní podmínky načtěte `variants/` jako nastavení pro procedurální
   renderer, nebo je v prohlížeči nastavte ručně a znovu exportujte flipbook.
   Přísun vzduchu je normalizovaný parametr vzhledu kouře a plamene.
5. Jako referenci měřítka a kamery použijte `preview.webp`. GLB a flipbook
   lze kombinovat. Flipbook je pohled z jedné kamery a jeho pivot a velikost
   se ve scéně nastavují podle rozměrů presetu.

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
