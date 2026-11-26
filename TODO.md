# Stav projektu

## v0.1.0

- [x] Katalog 17 původních efektů včetně čtyř filmových explozí.
- [x] Vlastní geometrie ve třech profilech, parametrický objem, kouř,
  jiskry, světlo a chvění vzduchu.
- [x] Český prohlížeč s ovládáním kamery, časovou osou, náhledy a inspektorem.
- [x] Větrné režimy, přísun vzduchu, přepínače vrstev a deterministický seed.
- [x] Export GLB, JSON, PNG a flipbooku ze zvolených parametrů.
- [x] Distribuční ZIP se 17 rendery, 17 atlasy, 45 GLB a 136 presety podmínek.
- [x] Zdrojový vzorek 100, 10 000 a 1 000 000 trojúhelníků.
- [x] Produkční sestavení, ověření LOD a obsahu ZIP, kontrola alfy všech 17 atlasů.
- [x] Soukromé nasazení webové aplikace. Odkaz je v `README.md`.
- [ ] Změřit FPS na fyzickém T460 a na současné herní grafice při shodné
  velikosti viewportu. Zapsat GPU, ovladač, scénář, rozlišení a časy snímků.
- [ ] Ověřit barevný prostor a import alfy v cílovém herním enginu při
  výběru jeho konkrétní verze a render pipeline.
- [ ] Více pohledů pro snímkové atlasy a další detail povrchů podle referencí.

## v0.2.0

- [x] Zdokumentovat 100 obrazových referencí v `REFERENCES.md`.
- [x] Změna barevné palety a tvarů plamene, kouře, jisker a refrakce.
- [x] Oddělit prach od kouře a samostatně zobrazit fáze krátkých efektů.
- [x] Zvýšit detail pěti rodin geometrie a zachovat nízké rozpočty LOD.
- [x] Přidat opakovatelné záběry pro detaily, podmínky a fáze animací.
- [x] Ověřit produkční sestavení, 48 renderů, alfu 17 atlasů, integritu ZIP
  a shodu všech počtů trojúhelníků T460 s v0.1.0.
- [ ] Porovnat render a import atlasu s `frameTimes` v cílovém enginu.
