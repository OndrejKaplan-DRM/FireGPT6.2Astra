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

- **Distribuce.** Repozitář GitHub je hlavní zdroj a nese úplný ZIP.
  Soukromý webový náhled načítá ZIP přes odkaz na konkrétní commit.
  Statické náhledy a aplikace jsou součástí webového sestavení.

## 26. 11. 2026 · Druhá iterace

- **Reference a expozice.** Škála plamene jde od tlumených červenohnědých
  záhybů do světlého teplého jádra. U knotu má vlastní namodralou patu a
  stíněnou oblast. Nastavení vychází ze znaků fotografie a jednotlivých
  fází videí. Zdrojové záběry jsou evidované v [REFERENCES.md](REFERENCES.md).
- **Kouř a prach.** Krátké herní efekty mají samostatný záblesk, nízký prach
  a stoupající kouř. Scénický preset granátu dává přednost nízké a světlejší
  cloně. Velký scénický preset má členitější tmavý oblak s delším dozvukem.
  Poměr se nastavuje jako rozptyl světla a doba čitelnosti ve zvoleném záběru.
- **Dynamika.** Plameny u dřeva skládají několik jazyků. Částice chladnou
  směrem do červena, žhavé dřevo pomalu kolísá a delší stopy mají v Balanced
  a Cinematic více segmentů. Refrakce čte změnu pozadí v několika hloubkách.
- **LOD.** Rozpočet trojúhelníků profilu T460 zůstává stejný. Hustší
  geometrii dostaly vosk, uhlíky, polena a kameny, běhouny, větvení a jehličí,
  střecha a spáry. Cinematic vzorkuje objem až 82 kroky.
- **Renderové studie.** Snímek a živý náhled používají společnou definici
  kamery, času, vrstev a podmínek. Videosekvence jednorázových efektů
  vzorkují úvod hustěji a ukládají přesné časy do manifestu.
