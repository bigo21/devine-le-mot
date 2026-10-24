---
name: revue-ux
description: Audit UX, UI et motion d'un écran ou d'un parcours de Devine le mot par rapport aux docs du projet. À utiliser quand on demande une revue, un polish, ou après avoir terminé un écran.
---

# Revue UX de Devine le mot

Passe l'écran ou le parcours demandé (par défaut : tout ce qui a changé depuis le dernier commit) au crible de cette grille. Lis d'abord `docs/UX.md`, `docs/DESIGN.md`, `docs/MOTION.md` et `docs/ASSETS.md`.

## Grille

**Parcours et contexte (UX.md)**
- Combien de taps jusqu'à l'action principale ? Respecte-t-on « jouer en moins de 10 s / 3 taps » ?
- L'écran reste-t-il utilisable dans le bruit, la pénombre et en plein soleil, par quelqu'un qui découvre l'app ?
- Les cas limites de UX.md §5 qui concernent cet écran sont-ils tous gérés ?
- États vides, erreurs, chargements : pensés, avec un message utile et dans le bon ton ?
- Tous les textes sont-ils dans l'i18n, au tutoiement, courts ?

**Visuel (DESIGN.md, ASSETS.md)**
- Uniquement des tokens (couleurs, typo, espacements, rayons) ? Texte sur couleur en `on<Couleur>` ?
- Hiérarchie claire : un seul élément principal, beaucoup d'air, ≤ 5 éléments importants visibles ?
- Icônes : uniquement Phosphor pour l'UI, Fluent 3D pour les catégories, pas de mélange ?
- Cibles tactiles ≥ 48 dp, contraste ≥ 4,5:1, information jamais portée par la seule couleur ?

**Mouvement (MOTION.md)**
- Chaque tap a-t-il un retour (`press` + haptique) ?
- Entrées et sorties chorégraphiées comme dans MOTION.md, synchronisées avec le son et la vibration ?
- Mode réduit géré ? Rien de bloquant ? Fluide en build release sur entrée de gamme ?

## Rendu

1. Un tableau des problèmes : écran, problème, gravité (bloquant / gênant / détail), correction proposée.
2. Les 3 corrections qui amélioreraient le plus l'expérience.
3. Ne corrige rien sans mon accord, sauf si on te l'a demandé explicitement.
