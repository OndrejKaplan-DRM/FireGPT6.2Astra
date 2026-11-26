# Rozhodnutí

## 26. 11. 2026 · První verze knihovny

- **WebGL 2 a Three.js.** Interaktivní validaci a export lze spustit z jednoho
  malého frontend projektu. Statické výstupy odpojují cílový herní engine
  od závislostí na prohlížeči.
- **Geometrie a objem.** Solidní zdroje jsou původní parametrické PBR modely.
  Oheň a kouř sdílejí vlastní raymarchingový shader. Samostatné rozpočty pro
  modely, vzorky shaderu a částice umožňují škálování podle odlišných úzkých
  hrdel GPU.
- **Vzhled podle materiálů.** Presety stojí na znovupoužitelných tvarech knotu,
  sloupce, fronty a jednorázového výšlehu. Složení tvaru, hustota, barevný
  spád, emisivita a kouř se liší podle scény. Zadané objemy a hmotnost jsou
  označení výtvarných scénářů.
- **Přenositelnost.** Výchozí balík nese GLB, WebP a sRGB atlas PNG s alfou.
  JSON doplňuje čas, rozměry, vrstvy a nastavení, aby stejný efekt šel
  znovu vyrobit. V prohlížeči je možné interaktivně vyrenderovat libovolnou
  kombinaci větru a přísunu vzduchu.
- **Rozpočet.** T460 redukuje rozlišení renderu, kroky raymarchingu, geometrii a
  počet částic a vynechává stínovou mapu. Cinematic používá více vzorků a
  detailnější geometrii. Milionový model je samostatný zdroj pro import
  nebo redukci a zbytečně nezatěžuje běžný katalog.
- **Projektová paměť.** `AGENTS.md` je standardní vstup Codexu.
  Obsah poznámek, postup a omezení jsou v uživatelem požadovaném
  `ASTRA.md` a ve zbývajících projektových souborech.
