# Stav projektu

## Otevřeno po auditu v0.2.1

- [ ] Změřit časy snímků na fyzickém Lenovu T460 a samostatné herní GPU. Uvést GPU, ovladač, velikost viewportu, scénu a profil.
- [ ] Projít rozhraní v živém náhledu v prohlížeči včetně přerušení WebGL. Při tomto auditu neotevřelo prostředí Sites port 4173.
- [ ] Ověřit import ve zvolené verzi Unreal nebo Unity a rozšířit zkoušku více pohledů při obcházení ohně.

## v0.2.1 · opraveno

- [x] Odstranit řezy siluet v atlasech. Exportovat metrické rozměry, pivot, orientaci a aktivní obrazové vrstvy.
- [x] Opravit patku a póly lahve a UV panelů. Doložit texturování a kontakt s rovinou srovnávacími rendery z Blenderu.
- [x] Při dlouhém exportu zachovat nové rozhodnutí uživatele o přehrávání. Zpracovat ztrátu a návrat WebGL. U obou větví proběhl jednotkový test se simulovaným rendererem.
- [x] Zpřístupnit projektové instrukce z `AGENTS.md` přes `ForGPT.md`. Podrobnosti metod a nálezů jsou v [AUDIT.md](AUDIT.md).
- [x] Znovu načíst všech 48 vydaných GLB v Blenderu a vyhodnotit hranice všech 816 políček atlasů.
- [x] Ověřit barvu, přímou alfu a výběr času ve třech scénách v Godotu 4.7.2 nad černým a bílým pozadím.
- [x] Zpřístupnit světlé studio a v něm opravit záběr dvou kouřových studií.

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
## v0.2.0

- [x] Zdokumentovat 100 obrazových referencí v `REFERENCES.md`.
- [x] Změna barevné palety a tvarů plamene, kouře, jisker a refrakce.
- [x] Oddělit prach od kouře a samostatně zobrazit fáze krátkých efektů.
- [x] Zvýšit detail pěti rodin geometrie a zachovat nízké rozpočty LOD.
- [x] Přidat opakovatelné záběry pro detaily, podmínky a fáze animací.
- [x] Ověřit produkční sestavení, 48 renderů, alfu 17 atlasů, integritu ZIP
  a shodu všech počtů trojúhelníků T460 s v0.1.0.
