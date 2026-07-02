# Guia de contingut i preferences — apps d'estudi per a oposicions

Aquest document recopila **totes les indicacions** que en Sergi ha anat donant sobre
com vol el material d'estudi i l'app. Serveix per a aquesta oposició (Montornès del
Vallès) i per a **les properes oposicions**. Cada vegada que arribi una indicació nova,
s'ha d'**afegir o modificar** aquí.

> Manteniment: actualitza aquest fitxer **abans o just després** d'aplicar qualsevol
> canvi de criteri nou. És la font de veritat de les preferències.

---

## 1. Resums dels temes

- **Glossari d'abreviacions al principi de cada resum.** Sovint s'usen sigles de lleis i
  reglaments (TRLUC, LRBRL, ROAS, TREBEP…) que no s'identifiquen fàcilment. Cada resum
  ha de començar amb una llista *abreviació → nom complet* de totes les normes que hi
  surten. *(Implementat de manera automàtica: es genera a partir de les sigles
  detectades al text i de les fonts del tema.)*
- **Sempre citar de quina norma és cada article.** No escriure mai "art. X" tot sol:
  indicar sempre la norma ("art. 14 de la Llei 39/2015", "art. 187 TRLUC"). A més,
  **enllaçar** la referència al text de la norma i, quan es pugui, **a l'article concret**
  (els textos del BOE admeten àncora `#a<N>`; el Portal Jurídic enllaça a la norma).
- **Extensió:** com a mínim una pàgina A4 per resum; han de ser suficients per a l'examen.
- **Sense scroll horitzontal.** Res de blocs de text que es desplacin lateralment: tot
  en text normal que s'ajusti a la pantalla (llistes/jerarquies indentades, no taules amples).
- **Clau / repàs esquemàtic.** Al final de cada resum, a més d'un text de clau, hi ha
  d'haver un **esquema jeràrquic (llista/arbre) dels conceptes clau** per fer un repàs
  visual ràpid i de qualitat, sense haver de rellegir tot el resum. Les claus han de ser
  **substancioses**, no fluixes.
- **Gramàtica.** El català ha de ser correcte i fàcil d'entendre; revisar la redacció.
- **Exportació.** Mantenir un fitxer únic amb **tots els resums de tots els temes**
  (per poder passar-los a una altra IA per revisió d'idees). Veure `docs/resums-tots.md`.

## 2. Preguntes tipus test (Prova 1)

- 4 opcions, una de correcta. Correcció automàtica amb penalització −25% per errada;
  les no contestades no resten (Base 7.7).
- **Explicacions riques:** dir què es pregunta, per què la correcta ho és (amb l'article
  de la llei) i per què les altres no ho són.
- **Enunciats ben redactats i contextualitzats.**
- **Longitud de les opcions:** la resposta correcta **no** ha de ser sistemàticament la
  més llarga (és una pista). Però **tampoc** s'ha de fer que mai ho sigui (seria la pista
  inversa: "la més llarga mai és la bona"). Objectiu: que **no es vegi clarament** que la
  correcta està desenvolupada i les altres no. Longituds equilibrades i barrejades; la
  posició de la correcta, variada. No cal refer en bloc el que ja està fet si no cal.
- Objectiu de volum: ~1000 preguntes (es van afegint per fases). Tots els temes amb un
  mínim raonable de preguntes.

## 3. Casos teòrico-pràctics (Prova 2)

- Correcció **dins l'app**, sense dependre de claude.ai: rúbrica de criteris amb pesos i
  paraules clau (motor offline) + resposta model. Opció de correcció amb Claude via clau
  API pròpia de l'usuari.
- Com a mínim un cas per tema (objectiu inicial complert per als temes 25–90).

## 4. App (PWA)

- Web real que funcioni a **PC i mòbil**, desplegada a GitHub Pages (deploy des de `main`).
- **Offline:** tot el contingut (resums, tests, casos) disponible sense connexió
  (service worker). El **progrés es desa al dispositiu** (localStorage) i es manté offline.
- **Enllaços a fonts oficials** han d'obrir-se bé també al mòbil.
- **Configuració d'examen:** poder triar **més d'un tema alhora** i/o **per blocs**
  (els 18 blocs en què s'organitza el temari), no només un sol tema.
- **Estadístiques per tema** a la llista d'estudi: sota l'estat "repassat", mostrar el
  **% de preguntes test encertades** acumulat de tots els exàmens i la **puntuació dels
  casos**, amb **color** (verd si alt, vermell si baix; llindar de referència ~75%).
- **Sincronització del progrés entre dispositius (mòbil ↔ PC).** El progrés s'ha de poder
  moure entre dispositius. Com que l'app és estàtica (GitHub Pages, sense servidor), es fa
  amb un **codi de sincronització xifrat amb un PIN**: es genera a un dispositiu i s'importa
  a l'altre (la importació **fusiona**, no substitueix). Requisit clau: **ningú amb accés a
  l'enllaç públic no pot llegir ni modificar el progrés** sense el PIN; res no s'envia a cap
  servidor de tercers. *(Si algun dia es vol sincronització automàtica en viu, caldria un
  backend o un servei extern amb autenticació — no fet per no dependre de tercers.)*

## 5. Procés de treball

- **Mostrar un parell d'exemples abans de canviar-ho tot** quan es tracti d'un canvi
  massiu (resums, format de respostes, etc.). Validar el format amb en Sergi i després
  desplegar a tots els temes.
- Llengua de treball: **català**.
- Avís permanent: el material està **generat amb IA**; cal contrastar-lo amb la
  normativa vigent abans de l'examen.

---

*Última actualització: 2026-06-28.*
