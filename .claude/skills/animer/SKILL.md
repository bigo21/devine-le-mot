---
name: animer
description: À utiliser pour toute animation, transition, micro-interaction, retour haptique ou sonore, effet Skia, Lottie ou 3D dans Devine le mot. Applique la spec de motion du projet (docs/MOTION.md) et les presets de src/ui/motion.
---

# Animer dans Devine le mot

## Avant d'écrire du code

1. Lis `docs/MOTION.md` (principes, chorégraphies) et `docs/DESIGN.md` §2–3 (tokens, presets).
2. Identifie le moment concerné dans MOTION.md §3. S'il existe, suis sa chorégraphie à la lettre (ordre, délais, son, vibration). S'il n'existe pas, propose une chorégraphie courte en suivant les principes de MOTION.md §1 avant de coder.
3. Vérifie ce qui existe déjà dans `src/ui/motion/` et réutilise-le. N'invente pas de nouveau preset si un existant convient ; si un nouveau est nécessaire, ajoute-le dans `src/ui/motion/` avec un nom explicite.

## En écrivant le code

- Reanimated (thread UI) pour les mouvements ; Skia pour particules, dégradés, anneaux, motifs ; Lottie pour les illustrations animées ; three.js (R3F v9, sans drei) uniquement dans le tutoriel.
- Aucune durée ni valeur de ressort en dur dans un écran : toujours via les presets.
- Image, son et haptique déclenchés ensemble via `useFeedback()`.
- Sur l'écran de jeu : uniquement `transform` et `opacity`, pas d'animation de layout, pas de re-render React à chaque frame.
- Toute animation est interruptible et ne bloque pas un tap.
- Gère `useReducedMotion()` : version fondu 150 ms, pas de particules, pas de boucle.
- Les couleurs viennent des tokens ; le texte sur couleur utilise `on<Couleur>`.

## Avant de dire que c'est fini

- Décris la chorégraphie implémentée en une liste horodatée (0 ms, +80 ms…).
- Indique comment la vérifier : échelle d'animation ×5 dans les options développeur Android, et « Supprimer les animations » pour le mode réduit.
- Signale tout risque de performance (nombre de particules, Lottie lourde, re-renders).
