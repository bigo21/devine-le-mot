# DESIGN — Direction artistique, UI/UX, animations, 3D

## 1. Direction : « Nuit de fête »

Une interface **épurée mais chaleureuse** : fond sombre et profond comme une soirée, couleurs vives et chaudes qui éclatent dessus, typographie généreuse, beaucoup d'air. L'identité vient de détails maîtrisés, pas d'une surcharge :

- **Motifs géométriques inspirés des textiles d'Afrique centrale** (type Ndop, losanges, lignes) utilisés **en filigrane** (opacité 4–8 %) sur les fonds et dans les cartes de catégories. Jamais en décor plein.
- **Grandes formes arrondies**, cartes aux coins très ronds, effet de légère profondeur (ombre douce + reflet subtil).
- **Une mascotte** simple qui réagit : salue au lancement, célèbre un bon score, fait la moue sur un mauvais. Au départ, mascotte géométrique faite en code (Reanimated/Skia) ; version illustrée en Lottie possible plus tard (voir ASSETS.md §2).

> Les détails du mouvement sont dans **MOTION.md**, les éléments graphiques dans **ASSETS.md**, l'expérience utilisateur dans **UX.md**.

Ce qu'on évite : drapeau camerounais en aplat, dégradés arc-en-ciel génériques, icônes de stock, ombres dures, tout effet « template ».

## 2. Tokens (`src/ui/tokens.ts`)

Valeurs de départ, à ajuster à l'œil sur un vrai téléphone. Toute couleur de l'app passe par ces tokens.

**Couleurs (thème sombre par défaut)**
| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#120E1F` | fond principal (violet nuit) |
| `bgElevated` | `#1C1730` | cartes, sheets |
| `bgSunken` | `#0B0814` | zones enfoncées |
| `text` | `#F7F3EA` | texte principal (blanc cassé chaud) |
| `textMuted` | `#A79FBF` | texte secondaire |
| `mango` | `#FF9F1C` | accent principal, boutons primaires |
| `hibiscus` | `#FF4D7E` | accent secondaire, mode équipes |
| `palm` | `#2ED47A` | ✅ Trouvé |
| `sun` | `#FFD23F` | mise en avant, étoiles, records |
| `lagoon` | `#3DA9FC` | info, variante active |
| `pass` | `#FF7A45` | ⏭️ Passer |
| `danger` | `#FF5A5F` | fin du timer, suppression |

Thème clair : prévu dans les tokens (structure `light`/`dark`), mais secondaire pour le lancement.

Chaque catégorie a une couleur parmi `mango / hibiscus / palm / sun / lagoon` + 3 teintes supplémentaires (`plum #9B5DE5`, `clay #E07A5F`, `teal #00BBA7`).

**Texte posé sur une couleur : tokens `on<Couleur>`**

Chaque couleur de catégorie et de feedback a un token `on<Couleur>` pour le texte et les icônes posés dessus (mot en jeu, libellés de boutons, badges). On garde des fonds vifs ; c'est le texte qui s'adapte. Objectif : **≥ 4,5:1 partout**, mot en jeu compris. Ratios WCAG 2.x calculés :

| Fond | Valeur | Texte foncé `#120E1F` | Texte clair `#F7F3EA` | Token |
|---|---|---|---|---|
| `mango` | `#FF9F1C` | **9,23** | 1,85 | `onMango` = `#120E1F` |
| `hibiscus` | `#FF4D7E` | **5,97** | 2,87 | `onHibiscus` = `#120E1F` |
| `palm` | `#2ED47A` | **9,76** | 1,75 | `onPalm` = `#120E1F` |
| `sun` | `#FFD23F` | **13,12** | 1,30 | `onSun` = `#120E1F` |
| `lagoon` | `#3DA9FC` | **7,47** | 2,29 | `onLagoon` = `#120E1F` |
| `pass` | `#FF7A45` | **7,33** | 2,33 | `onPass` = `#120E1F` |
| `danger` | `#FF5A5F` | **6,21** | 2,76 | `onDanger` = `#120E1F` |
| `plum` | `#9B5DE5` | **4,59** | 3,72 | `onPlum` = `#120E1F` |
| `clay` | `#E07A5F` | **6,42** | 2,66 | `onClay` = `#120E1F` |
| `teal` | `#00BBA7` | **7,82** | 2,19 | `onTeal` = `#120E1F` |

Toutes les couleurs vives passent avec le texte foncé ; aucune ne passe avec le blanc cassé, et aucune teinte n'a dû être modifiée. Les `on*` restent des tokens distincts, au cas où une couleur changerait plus tard. Points de vigilance :
- `plum` est juste au-dessus du seuil (4,59) : ne pas l'éclaircir ni lui appliquer d'opacité sous le texte.
- Les couleurs vives utilisées **comme couleur de texte** sur `bg` restent ≥ 4,5:1, sauf `plum` sur `bgElevated` (4,19) : réserver `plum` aux fonds, pas au petit texte sur les cartes.
- `text` sur `bg` : 17,1:1 ; `textMuted` sur `bg` / `bgElevated` / `bgSunken` : 7,5 / 6,9 / 7,9:1.
- Un flash ou un fond semi-transparent posé sur une couleur doit être recalculé avant d'y mettre du texte.
- Ces ratios sont vérifiés par un test (`src/ui/__tests__/tokens.test.ts`) : modifier une teinte qui casse le contraste fait échouer les tests.

**Dérivés translucides** (jamais sous du texte sans recalcul de contraste)
| Token | Valeur | Usage |
|---|---|---|
| `hairline` | `rgba(247, 243, 234, 0.08)` | bordures fines, séparateurs, contour des surfaces sombres |
| `highlight` | `rgba(255, 255, 255, 0.22)` | reflet subtil en haut des surfaces colorées (ombre interne de 1 px) |
| `scrim` | `rgba(11, 8, 20, 0.72)` | voile derrière une feuille du bas (`bgSunken` translucide) |
| `shadow` | `rgba(5, 3, 10, 0.55)` | couleur des ombres douces |

**Ombres** (décalage + flou, jamais d'ombre dure) : `soft` = `0 6px 18px shadow` (boutons, cartes) ; `lifted` = `0 14px 32px shadow` (éléments flottants). Les surfaces colorées ajoutent l'ombre interne `highlight` pour le reflet. Pas d'ombre sur un grand élément animé (coût de rendu sur Android).

**Filigrane** : opacité `patternOpacity.screen` = 5 % sur les fonds d'écran, `patternOpacity.card` = 8 % dans les cartes colorées.

**Typographie** (Google Fonts via `@expo-google-fonts/*`)
- Titres et **mot à deviner** : **Unbounded** (700–900), large, joueuse, très lisible de loin.
- Texte courant : **Plus Jakarta Sans** (400–700).
- **Police lisible du mot** : **Atkinson Hyperlegible Next** (800), conçue pour la lisibilité (lettres impossibles à confondre : I/l/1, O/0). Réglage « Police du mot » : Expressive (Unbounded, par défaut) ou Lisible (Atkinson). Il ne change **que le mot affiché en partie** ; titres et interface gardent Unbounded. Tokens `wordFonts.expressive` / `wordFonts.readable`, hook `useWordFont()`.
- Échelle : 12 / 14 / 16 / 20 / 24 / 32 / 44 / 64. Le mot en jeu s'ajuste automatiquement (auto-fit) pour remplir ~80 % de la largeur sur une ou deux lignes.
- **Rôles** (`typography` dans les tokens) : les écrans choisissent un rôle, jamais une taille.

| Rôle | Police | Taille / interligne |
|---|---|---|
| `hero` | Unbounded 900 | 44 / 48 |
| `display` | Unbounded 800 | 32 / 38 |
| `title` | Unbounded 700 | 24 / 30 |
| `heading` | Unbounded 700 | 20 / 26 |
| `bodyLarge` | Plus Jakarta Sans 500 | 20 / 28 |
| `body` | Plus Jakarta Sans 400 | 16 / 24 |
| `bodyStrong` | Plus Jakarta Sans 600 | 16 / 24 |
| `label` | Plus Jakarta Sans 700 | 16 / 20 |
| `labelSmall` | Plus Jakarta Sans 600 | 14 / 18 |
| `caption` | Plus Jakarta Sans 500 | 12 / 16 |

- Unbounded étant très large, les titres sont légèrement resserrés (−2 % sur `hero` et `display`).
- Taille de police système respectée jusqu'à **×1,6** (`maxFontScale`).

**Espacements** : base 4 (4, 8, 12, 16, 24, 32, 48). **Rayons** : 12 (petits), 20 (cartes), 32 (grandes cartes), 999 (pilules). **Cible tactile** : 48 dp minimum (`touchTarget`) ; un élément visuellement plus petit (pilule de 40 dp) compense avec une zone de toucher élargie.

**États des composants** : une pilule sélectionnée et l'indicateur du choix segmenté sont en `text` (blanc cassé) avec texte `bg` (17:1) ; le `mango` reste réservé à l'action principale de l'écran. Un élément désactivé passe à 40 % d'opacité.

## 3. Mouvement (`src/ui/motion/`)

Toutes les animations en **Reanimated**, sur le thread UI. Presets partagés :

| Preset | Réglage indicatif | Usage |
|---|---|---|
| `spring.snappy` | damping 18, stiffness 260 | boutons, chips |
| `spring.bouncy` | damping 12, stiffness 180 | apparition de cartes, score |
| `spring.gentle` | damping 22, stiffness 120 | sheets, transitions de page |
| `timing.fast` | 150 ms, easing out | flashs, fondus |
| `timing.base` | 280 ms | transitions standard |

Règles :
- **Chaque tap a un retour** : léger scale (0,96) + haptique « light ».
- Listes : entrée en cascade (stagger 30–40 ms), jamais tout d'un coup.
- Transitions entre écrans : éléments partagés quand c'est pertinent (carte de catégorie → écran détail).
- Respecter « Réduire les animations » du système (`AccessibilityInfo.isReduceMotionEnabled`) : remplacer les mouvements par des fondus.
- Rien ne doit bloquer l'interaction plus de 300 ms.

## 4. Écrans clés

**Accueil** : gros bouton « Jouer » vivant (dégradé Skia qui respire lentement), mascotte, raccourcis « Rejouer la dernière catégorie », « Catégories », « Créer ». Pas plus de 5 éléments visibles.

**Catégories** : filtres en pilules par région (🇨🇲 🌍 🇫🇷 🇺🇸 🌐 🎉 Soirée), plus une pilule ✏️ Mes catégories (créées, dupliquées ou importées), recherche, grille de cartes colorées (icône/emoji, nom, nombre de mots, motif en filigrane). Appui long → aperçu de quelques mots. Favoris en tête.

**Préparation de la partie** : sélection de la variante en carrousel horizontal de cartes animées (chaque carte montre l'icône animée de la variante), durée en segmented control, bouton « C'est parti ».

**Écran « Pose le téléphone sur ton front »** : animation (Lottie) d'un téléphone qui monte sur un front ; jauge circulaire de stabilisation pendant la calibration.

**Partie (paysage)** :
- Fond plein de la couleur de la catégorie, mot énorme au centre dans la couleur `on<Couleur>` correspondante, consigne de variante en petit dessous (même token).
- Mode tap : chaque moitié affiche son libellé et son icône (droite « ✓ Trouvé », gauche « ⏭ Passer »), discrets mais toujours visibles, avec un retour visuel au toucher.
- Timer : anneau fin qui se vide sur le bord ; dans les 10 dernières secondes il passe au rouge, pulse, et un tic sonore accompagne chaque seconde.
- Trouvé : l'écran entier flashe en `palm`, le mot s'envole vers le bas avec un ✓, compteur +1 qui rebondit.
- Passer : flash `pass`, le mot glisse vers le haut.
- Changement de mot : nouvelle carte qui arrive avec `spring.bouncy`.

**Résultats** : confettis Skia si bon score, score en grand avec compteur animé, liste des mots (verts / gris) apparaissant en cascade, record battu → badge `sun` animé.

**Éditeur de catégorie** : clair et rapide, zone « coller une liste », compteur de mots, aperçu de la carte de catégorie en temps réel.

## 5. Son et vibrations

- Sons courts, ronds, cohérents entre eux (une même « famille ») : départ, trouvé, passer, tic des 10 dernières secondes, fin, record. Formats légers (`.m4a`/`.ogg`), libres de droits.
- Haptique : light (taps), success (trouvé), warning (passer), heavy (fin).
- Réglages : son on/off, vibrations on/off, volume.

## 6. 3D dans le tutoriel

**Objectif** : montrer, de façon interactive et ludique, comment tenir le téléphone et quels gestes faire.

- Scène **@react-three/fiber v9** (`@react-three/fiber/native`) + **expo-gl**, **sans drei**, chargée uniquement sur l'écran tutoriel (lazy) pour ne pas alourdir le démarrage.
- Contenu : une tête stylisée low-poly (formes simples, pas réaliste) et un téléphone 3D aux coins arrondis dont l'écran affiche un mot.
- Étapes (4 à 5 cartes en bas d'écran, swipe) :
  1. Le téléphone vient se poser sur le front (animation de caméra douce).
  2. Inclinaison vers le bas → l'écran du téléphone 3D devient vert, ✓.
  3. Inclinaison vers le haut → orange, passer.
  4. **Essaie toi-même** : le téléphone 3D suit les mouvements réels du téléphone de l'utilisateur (DeviceMotion) ; on valide l'étape quand il a réussi les deux gestes.
  5. Présentation rapide des variantes.
- L'utilisateur peut faire tourner la scène au doigt.
- Lumières douces, matériaux mats aux couleurs des tokens, ombre de contact au sol.
- Budget : modèles **construits en code avec des primitives** (pas de `.glb`, pas de drei) ; 60 fps visé, 30 fps minimum sur entrée de gamme. Les fps sont mesurés dès le prototype (Phase 4.1), avant de construire le tutoriel complet.
- **Plan B** si la 3D native pose problème de compatibilité ou de performance : même tutoriel en animations Lottie / Reanimated (fausse 3D), décision à prendre avec moi.

## 7. Accessibilité

- Contraste ≥ 4,5:1 pour tout texte (y compris le mot en jeu et les gros titres) : texte sur couleur via les tokens `on<Couleur>` (§2).
- Cibles tactiles ≥ 48 dp.
- Respect de la taille de police système (jusqu'à un plafond raisonnable).
- Mode tap (sans inclinaison) pour les joueurs qui ne peuvent pas incliner : droite = Trouvé, gauche = Passer, libellé + icône visibles.
- Ne jamais transmettre une information uniquement par la couleur (toujours icône ou texte en plus).
