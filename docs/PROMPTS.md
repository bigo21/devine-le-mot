# PROMPTS — Séquence de travail avec Claude Code

Copie-colle ces prompts **un par un**, dans l'ordre. Attends que chaque étape soit terminée, testée sur ton téléphone et commitée avant de passer à la suivante. Pour les étapes lourdes, commence par demander un plan (mode plan : `Shift+Tab` dans Claude Code) avant d'exécuter.

---

## Phase 0 — Fondations

**0.1 Vérification**
```
Lis CLAUDE.md et tous les fichiers de docs/. Résume-moi en 10 lignes ce que tu as compris du projet, puis liste les questions ou incohérences que tu vois avant de commencer. Vérifie aussi quelle est la dernière version stable du SDK Expo et signale toute lib de docs/PROJET.md qui ne serait pas compatible avec elle.
```

**0.2 Création du projet et socle technique**
```
Ce dossier ne contient pour l'instant que CLAUDE.md, README.md et docs/. Crée le projet Expo "Devine le mot" (slug devine-le-mot) ici même : génère-le avec create-expo-app@latest dans un dossier temporaire puis déplace son contenu à la racine, sans écraser docs/ ni README.md. Garde AGENTS.md et .claude/settings.json générés par Expo, et fusionne le CLAUDE.md généré avec le nôtre (le nôtre commence déjà par @AGENTS.md). Déplace docs/skills/animer et docs/skills/revue-ux vers .claude/skills/ (skills du projet). Initialise git et fais un premier commit.
Ensuite mets en place les fondations (Phase 0 de docs/PROJET.md) : expo-dev-client, Expo Router avec l'arborescence prévue (écrans vides avec un titre), TypeScript strict, ESLint/Prettier, i18n FR/EN, Zustand, expo-sqlite avec le schéma de la section 4, et le chargement des polices. Configure EAS pour un build Android "development" et "preview" (APK). Donne-moi ensuite les commandes exactes pour lancer le dev build sur mon téléphone Android.
```

**0.3 Design system**
```
Utilise la skill frontend-design. Crée le design system décrit dans docs/DESIGN.md : src/ui/tokens.ts, les presets de mouvement Reanimated, et les composants de base (Button avec retour haptique et animation de pression, Card, Chip/Pill, SegmentedControl, BottomSheet, Screen avec fond à motif en filigrane). Crée aussi le vocabulaire de mouvement de docs/MOTION.md §2 (press, pop, rise, breathe, shake, count, flash), le hook useFeedback() et useReducedMotion(), en suivant la skill animer. Ajoute un écran caché /dev/ui qui affiche tous les composants et joue chaque mouvement, pour que je les valide visuellement.
```

**0.4 Assets de base**
```
Suis docs/ASSETS.md : installe Phosphor (phosphor-react-native), crée l'arborescence src/assets/ et assets/CREDITS.md, intègre les polices, sélectionne les premiers sons CC0 (départ, tic, trouvé, passer, fin, record) et vérifie si Fluent Emoji 3D contient des drapeaux. Prépare un script qui récupère une icône Fluent Emoji 3D à partir d'un emoji et la convertit en WebP 256 px. Crée la mascotte géométrique (option A) avec ses états, en suivant la skill animer, et montre-la dans /dev/ui.
```

## Phase 1 — Cœur du jeu

**1.1 Moteur et inclinaison**
```
Implémente le moteur de jeu (src/features/game/engine.ts) et la détection d'inclinaison (tilt.ts en fonction pure + useTilt.ts) selon docs/GAMEPLAY.md §1–2 : calibration, seuils avec hystérésis, anti-rebond, lissage, gestion paysage gauche/droit. Écris des tests unitaires complets pour engine.ts et tilt.ts (séquences d'angles simulées, tremblements, gestes rapides).
```

**1.2 Écrans de partie**
```
Crée le parcours de partie : play/setup → play/ready (calibration) → compte à rebours → play/game → play/results, en suivant docs/DESIGN.md §4–5, docs/MOTION.md §3 et docs/UX.md §5 (flashs plein écran, timer en anneau, animations des mots, sons, vibrations, paysage forcé, écran allumé). Utilise 5 catégories de test temporaires. Ajoute un écran /dev/tilt qui affiche les angles en direct et les événements détectés, pour que je règle les seuils. Termine par la skill revue-ux sur ce parcours.
```

## Phase 2 — Catégories

**2.1 Données et explorateur**
```
Implémente le chargement des paquets intégrés (seed JSON → SQLite, upsert par id+version), la validation zod alignée sur docs/pack.schema.json, et l'écran Catégories (filtres par région, recherche, favoris, appui long pour aperçu) selon docs/DESIGN.md.
```

**2.2 Contenu**  *(à répéter par lot de 4–5 catégories)*
```
Génère les catégories suivantes de docs/GAMEPLAY.md §4 au format de docs/exemple-pack.json, 120 mots minimum chacune, uniquement des mots ou noms connus du grand public visé, avec difficulté et 3 mots interdits par mot : [LISTE DES CATÉGORIES]. Signale-moi les entrées dont tu n'es pas sûr pour que je les vérifie.
```

**2.3 Création et import**
```
Implémente la création/édition de catégories, l'export en .devine.json via la feuille de partage, et l'import (fichier, fichier partagé vers l'app, collage de texte brut) avec aperçu, gestion des conflits et messages d'erreur clairs, selon docs/GAMEPLAY.md §5.
```

## Phase 3 — Variantes et équipes
```
Implémente toutes les variantes de docs/GAMEPLAY.md §3 (consignes, icônes animées, couleurs, restrictions par catégorie, mode Mix) et le mode équipes avec tableau des scores animé.
```

## Phase 4 — Finition visuelle et tutoriel 3D

**4.1 Tutoriel 3D**
```
Fais d'abord un prototype minimal : une scène @react-three/fiber/native + expo-gl avec un téléphone 3D (primitives) qui suit l'inclinaison réelle de mon téléphone. Mesure les fps sur le dev build Android et dis-moi si c'est viable avant d'aller plus loin. Si oui, construis le tutoriel complet de docs/DESIGN.md §6 ; sinon, propose le plan B.
```

**4.2 Polish**
```
Lance la skill revue-ux sur toute l'app, puis corrige avec les skills frontend-design et animer : transitions entre écrans, éléments partagés, entrées en cascade, confettis Skia sur les résultats, mascotte, états vides, onboarding au premier lancement, support de "réduire les animations". Liste ce que tu changes, écran par écran.
```

**4.3 Tests utilisateurs**
```
Prépare docs/TESTS-UTILISATEURS.md selon docs/UX.md §8 : déroulé d'une soirée de test, points à observer, grille de notes. Après chaque soirée, je te donnerai mes notes et tu en tireras une liste de corrections priorisées.
```

**4.4 Performance**
```
Utilise la skill react-native-best-practices pour auditer les performances (re-renders, listes, animations, taille de l'APK, temps de démarrage). Corrige les problèmes et donne-moi un avant/après.
```

## Phase 5 — Publication
```
Prépare la publication Play Store : icône adaptative, splash, nom et identifiant d'application, version, build AAB "production" via EAS, et un brouillon de fiche Play Store en FR et EN (description courte, description longue, liste des captures à faire). Rappelle-moi les étapes à faire moi-même dans la Play Console.
```
