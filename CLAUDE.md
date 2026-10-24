@AGENTS.md

# Projet : « Devine le mot », jeu de devinettes mobile

Jeu de soirée type Heads Up! / Charades : un joueur pose le téléphone sur son front, les autres lui font deviner le mot affiché ; il incline le téléphone vers le bas (trouvé) ou vers le haut (passer).

**Objectifs produit** : entièrement gratuit (pas de pub, pas d'achat) pour toucher le maximum de joueurs ; Android d'abord ; énormément de catégories (Cameroun, Afrique, France, États‑Unis, monde…) ; création et import de catégories ; plusieurs variantes de jeu ; **UI/UX très soignée, épurée, animée, avec de la 3D dans le tutoriel**.

## Documents de référence (à lire avant toute tâche de la zone concernée)

- @docs/PROJET.md — stack, architecture, conventions, feuille de route
- @docs/GAMEPLAY.md — règles, capteurs, variantes, catégories, import/export
- @docs/DESIGN.md — direction artistique, animations, 3D
- @docs/MOTION.md — motion design : principes, chorégraphies des moments clés, implémentation
- @docs/UX.md — contexte d'usage, parcours, cas limites, ton des textes, tests utilisateurs
- @docs/ASSETS.md — icônes, illustrations 2D/3D, mascotte, sons, licences
- `docs/pack.schema.json` — format des paquets de catégories
- `PRODUCT.md` — fiche produit lue par la skill impeccable (résumé de PROJET/GAMEPLAY/UX ; ces docs font foi)

## Skills du projet

- `animer` : à utiliser pour toute animation, transition, micro-interaction, retour haptique/sonore.
- `revue-ux` : audit d'un écran ou d'un parcours. **Pas après chaque écran** : les revues (revue-ux et impeccable) se font une seule fois, quand tous les écrans sont créés (étape 4.2).

**Revues** : une revue produit d'abord un **rapport** (problème, gravité, correction proposée) ; on ne corrige que les points que je valide. Les captures d'écran prises pour les revues ou les tests restent locales (`.impeccable/review/`, ignoré par git) et ne sont **jamais** commitées ni envoyées sur GitHub.

## Règles de travail

- Langue de l'interface : français par défaut, anglais disponible (i18n dès le départ, aucune chaîne en dur dans les composants).
- TypeScript strict. Pas de `any` sans commentaire justificatif.
- Installer les paquets Expo avec `npx expo install` (versions alignées sur le SDK), jamais `npm install` direct pour un module Expo.
- Avant d'utiliser une API Expo, vérifier la doc correspondant à la version du SDK du projet (skills/MCP Expo) plutôt que de se fier à la mémoire.
- Le jeu doit fonctionner **100 % hors ligne**.
- Animations : Reanimated (UI thread), jamais d'`Animated` legacy ni d'animations JS bloquantes. Viser 60 fps sur un Android d'entrée de gamme.
- Toute nouvelle interface suit `docs/DESIGN.md` (tokens, typo, rayons, mouvements). Ne pas inventer de nouvelles couleurs hors tokens.
- Contenu des mots : pas de contenu offensant, haineux, sexuel ou moquant une ethnie ; personnalités publiques uniquement (pas de particuliers).
- Après chaque fonctionnalité : `npx tsc --noEmit`, lint, et tests unitaires sur la logique pure (moteur de jeu, détection d'inclinaison, validation des paquets).
- Petits commits clairs, en français, un par fonctionnalité.
- Si une décision n'est pas couverte par les docs et a un impact durable (lib, architecture, format de données), me demander avant.
