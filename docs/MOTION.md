# MOTION — Motion design de « Devine le mot »

Complète DESIGN.md §3 (presets). Ici : **pourquoi** on anime, **quoi** exactement à chaque moment clé, et **comment** le faire sans perdre en fluidité.

## 1. Principes

1. **Le mouvement explique.** Chaque animation dit quelque chose : d'où vient un élément, où il part, ce qui vient de se passer. Pas d'animation décorative qui retarde l'action.
2. **Physique, pas mécanique.** Des ressorts (springs) plutôt que des durées linéaires : les éléments ont du poids, rebondissent légèrement, se posent.
3. **Une seule star à la fois.** À chaque instant, un seul élément porte l'animation principale ; le reste suit en retrait (stagger, fondu léger).
4. **Son + vibration + image en même temps.** Les trois partent sur la même frame. Un retour décalé de 100 ms paraît « cassé ».
5. **Rapide en jeu, généreux hors jeu.** Pendant une manche, tout est sec et lisible (< 250 ms). Sur l'accueil et les résultats, on peut célébrer.
6. **Jamais bloquant.** Toute animation est interruptible ; un tap pendant une transition est pris en compte.

## 2. Vocabulaire de mouvement (en plus des presets de DESIGN.md)

| Nom | Description | Utilisation |
|---|---|---|
| `press` | scale 1 → 0,96 en `spring.snappy`, retour au relâchement | tout élément tappable |
| `pop` | scale 0,6 → 1 + opacité 0 → 1, `spring.bouncy` | apparition d'un badge, d'un chiffre, d'une icône |
| `rise` | translateY +16 → 0 + opacité, `spring.gentle` | entrée de cartes, de lignes de liste (en cascade) |
| `breathe` | scale 1 ↔ 1,03 en boucle, 2,4 s, ease in-out | bouton Jouer, mascotte au repos |
| `shake` | translateX ±8 × 3, 300 ms | erreur (import invalide, champ vide) |
| `count` | compteur numérique qui défile jusqu'à la valeur | scores, nombre de mots |
| `flash` | calque plein écran opacité 0 → 0,9 → 0 en 500 ms : montée 75 ms, palier, fondu (220 ms jugés trop courts sur appareil) | trouvé / passer |

## 3. Chorégraphie des moments clés

### Lancement de l'app
1. Splash natif (couleur `bg`, logo) → fondu vers l'accueil, **sans** écran de chargement intermédiaire.
2. Accueil : la mascotte fait `pop` (0 ms), le titre `rise` (+80 ms), le bouton Jouer `rise` (+160 ms) puis passe en `breathe`, les raccourcis `rise` en cascade (+40 ms chacun).
3. Durée totale perçue : < 700 ms. Au deuxième lancement de la journée, version courte (tout en fondu, 250 ms).

### Choix de catégorie
- Grille : entrée en cascade (`rise`, 35 ms par carte, max 12 cartes animées ; au-delà, apparition directe).
- Changement de filtre : les cartes sortantes s'effacent (120 ms), les entrantes `rise`. La pilule active glisse sous le libellé (indicateur partagé, `spring.snappy`).
- Tap sur une carte : `press`, puis la carte s'agrandit vers l'écran suivant (transition d'élément partagé si disponible dans la version de Reanimated installée ; sinon zoom + fondu croisé).

### « Pose le téléphone sur ton front » et calibration
- Animation Lottie en boucle du geste.
- Quand le téléphone est détecté stable : un anneau se remplit (0,8 s). S'il bouge, l'anneau redescend doucement (pas de reset brutal).
- Anneau plein → haptique `success` → enchaîne directement sur le compte à rebours.

### Compte à rebours 3-2-1
- Chaque chiffre : `pop` géant (scale 1,6 → 1) + son « tic » + haptique light ; le précédent sort en scale 0,8 + fondu.
- « C'est parti ! » : `pop` + son de départ + haptique medium, puis le premier mot arrive.

### En jeu (le cœur)
| Événement | Image | Son | Vibration | Durée |
|---|---|---|---|---|
| Nouveau mot | entre depuis le haut (translateY -40 → 0) + `pop` léger (0,92 → 1), `spring.bouncy` | — | — | ~250 ms |
| Trouvé | `flash` palm (500 ms) ; le mot part vers le bas (translateY +120, scale 0,8, fondu, 220 ms) ; « ✓ Trouvé » `pop` au centre ; compteur +1 `pop` | « trouvé » | success | mot suivant après 220 ms, sous le flash qui s'estompe |
| Passer | `flash` pass (500 ms) ; le mot part vers le haut (translateY -120, fondu, 220 ms) ; « ⏭ Passé » `pop` au centre | « passer » | warning | mot suivant après 220 ms |
| 10 dernières s | anneau du timer passe au `danger`, pulse à chaque seconde (scale 1 → 1,04 → 1) | tic par seconde | light par seconde | — |
| Fin | le mot se fige, tout l'écran fait un fondu vers `bg`, « Temps écoulé ! » `pop` | gong de fin | heavy | 600 ms |

Règles spécifiques au jeu :
- Le mot ne doit **jamais** être illisible plus de 250 ms : pas d'effets qui flouttent ou déforment le texte.
- Animer **uniquement** `transform` et `opacity` sur cet écran (pas de layout, pas de changement de taille de police animé).
- Le calcul auto-fit de la taille du mot est fait **avant** l'entrée du mot, jamais pendant.

### Résultats
Séquence (timeline totale ≈ 1,6 s, interruptible par un tap qui affiche tout immédiatement) :
1. 0 ms : titre `rise`.
2. 150 ms : score en `count` (de 0 à la valeur, ~600 ms, ralentit à la fin), son de score qui monte.
3. 750 ms : si bon score → confettis Skia (≤ 80 particules, 1,5 s) + mascotte « célèbre » ; si record → badge `sun` `pop` + son record.
4. 900 ms : liste des mots en cascade (`rise`, 25 ms par ligne, max 15 animées).
5. Boutons d'action `rise` en dernier.

### Mode équipes
- Écran de passage « Au tour de *Équipe Hibiscus* » : bandeau de la couleur de l'équipe qui balaie l'écran de gauche à droite (`spring.gentle`), nom en `pop`.
- Tableau des scores : les barres/positions se réordonnent avec un ressort ; l'équipe en tête reçoit une couronne `pop`.

### Mascotte (états)
`repos` (breathe + clignement d'yeux aléatoire toutes les 3–6 s) · `salut` (au lancement) · `attention` (pendant la calibration) · `célèbre` (bon score) · `moue` (score faible, toujours bienveillant) · `réfléchit` (états vides, chargement).

## 4. Implémentation

- **Reanimated 4** pour tout : `useSharedValue`, `withSpring`, `withTiming`, `withSequence`, `withDelay`, animations d'entrée/sortie de layout (`entering`/`exiting`) **hors écran de jeu**. Pour les transitions simples d'état, l'API de transitions/animations CSS de Reanimated 4 est acceptable.
- **Skia** pour : dégradés animés, confettis/particules, motifs Ndop animés, anneau du timer (un chemin + `end` animé).
- **Lottie** pour : mascotte (si dessinée par un humain), icônes animées des variantes, animation « téléphone sur le front ».
- Tous les presets et les mouvements nommés (§2) vivent dans `src/ui/motion/` ; **aucune valeur de durée ou de ressort en dur** dans un écran.
- Un hook `useFeedback()` centralise `son + haptique + animation` pour garantir la synchronisation (§1.4).
- `useReducedMotion()` : quand c'est activé, `pop`/`rise` deviennent des fondus de 150 ms, `flash` un fondu de 300 ms (plus court, il passerait inaperçu), pas de confettis, pas de `breathe`, mascotte figée sur son état.

## 5. Vérification

- Tester sur un **Android d'entrée de gamme** (2–3 Go de RAM) en build release : aucune saccade visible sur l'écran de jeu, le compte à rebours et les résultats.
- Activer « Échelle d'animation ×5 » dans les options développeur Android pour vérifier la chorégraphie au ralenti (ordre, synchronisation, absence de saut).
- Activer « Supprimer les animations » dans Android pour vérifier le mode réduit.
- Enregistrer l'écran pendant une manche complète et revoir la vidéo image par image sur les transitions trouvé / passer.
