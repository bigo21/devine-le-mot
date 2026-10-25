# PROJET — Vision, stack, architecture

## 1. Vision

Le meilleur jeu de devinettes de soirée **gratuit**, pensé d'abord pour le Cameroun et l'Afrique francophone, mais ouvert au monde : des catégories qui parlent vraiment aux joueurs (artistes, plats, quartiers, expressions locales) à côté des classiques internationaux, une interface qui donne envie d'y jouer, et la liberté de créer ses propres paquets.

**Cibles** : 15–40 ans, soirées entre amis, familles, fêtes, voyages. Téléphones Android de toutes gammes, connexion parfois absente.

**Principes**
1. Lancer une partie en moins de 3 taps depuis l'ouverture.
2. Hors ligne d'abord, léger (APK raisonnable), fluide sur entrée de gamme.
3. Beau et vivant : chaque interaction a un retour (mouvement, son, vibration).
4. Gratuit sans contrepartie cachée : pas de pub, pas de compte obligatoire, pas de collecte de données.

## 2. Stack technique

| Besoin | Choix | Remarque |
|---|---|---|
| Framework | **Expo SDK 58** (React Native 0.88, React 19.3, New Architecture uniquement) + TypeScript | `npx create-expo-app@latest` ; Node 22.13+ ou 24.3+ (versions paires) |
| Navigation | **Expo Router** | navigation par fichiers |
| Build | **Development build** (`expo-dev-client`) + **EAS Build** | Expo Go ne suffira pas (Skia, 3D) |
| Animations | **react-native-reanimated** + **react-native-gesture-handler** | toutes les animations UI |
| Effets graphiques | **@shopify/react-native-skia** | dégradés animés, particules, confettis, flou |
| Animations illustrées | **Lottie** (`lottie-react-native`) | icônes animées des variantes, animation « téléphone sur le front ». La mascotte démarre en code (Reanimated/Skia, ASSETS.md §2 option A) ; version illustrée en Lottie possible plus tard. Rive retiré de la stack de base |
| 3D (tutoriel) | **@react-three/fiber v9** (`@react-three/fiber/native`) + **three** + **expo-gl** | **sans drei** : modèles construits avec des primitives. Fps mesurés dès le prototype de la Phase 4.1 ; voir DESIGN.md §6 |
| Capteurs | **expo-sensors** (DeviceMotion) | détection d'inclinaison |
| Orientation / écran | **expo-screen-orientation**, **expo-keep-awake** | paysage forcé en partie, écran allumé |
| Retours | **expo-haptics**, **expo-audio** | vibrations, sons |
| État | **Zustand** | stores légers, persistance sélective |
| Base de données | **expo-sqlite** (+ **Drizzle ORM** optionnel) | catégories, mots, historique ; requêtes rapides sur des milliers de mots |
| Préférences | **`expo-sqlite/kv-store`** | réglages, onboarding vu, etc. (pas de MMKV : une lib native de moins) |
| i18n | **i18next** + **react-i18next** + **expo-localization** | FR / EN |
| Import / export | **expo-file-system** (sélecteur `File.pickFileAsync`, lecture, écriture), **expo-sharing** (feuille de partage et réception de partages) | fichiers `.devine.json` de paquets ; pas d'expo-document-picker : le sélecteur d'expo-file-system suffit (une lib native de moins) |
| Clavier | **react-native-keyboard-controller** (`KeyboardProvider` à la racine, `KeyboardScreen`) | suit le clavier sur le thread UI, garde le champ actif visible (UX.md §5) ; décision du 25/10/2026 |
| Validation | **zod** | validation des paquets importés |
| Polices | **expo-font** | voir DESIGN.md |
| Tests | **jest** + **@testing-library/react-native** | logique du jeu en priorité |

> Vérifier la compatibilité de chaque lib avec la version du SDK au moment de l'installation (doc Expo / skills). Si une lib (3D notamment) pose problème avec la New Architecture, le signaler et proposer l'alternative avant de forcer.

**Points d'attention du SDK 58**
- `File.write()` (expo-file-system) est **asynchrone** : toujours l'`await` ; `File.writeSync()` seulement si le synchrone est voulu.
- `InteractionManager` est supprimé de React Native : différer un travail avec `requestIdleCallback` / `setTimeout` ou les callbacks de fin d'animation Reanimated.
- API TypeScript stricte de React Native par défaut : pas d'import profond `react-native/Libraries/*`.
- **R8 activé en release** : tester Skia (et toute lib native ajoutée) dans un build release dès la Phase 0, pas seulement en dev build.
- `StatusBar` n'a plus `backgroundColor` / `translucent` ; `ImageBackground` est déprécié.

## 3. Architecture des dossiers

Convention du SDK 58 : les routes Expo Router vivent dans `src/app/` (tout le code applicatif est sous `src/`, alias `@/*` → `src/*`). `assets/` à la racine ne contient que ce que lit `app.json` (icône, splash) ; les assets de l'app vont dans `src/assets/` (voir ASSETS.md §3).

```
src/
  app/                       # Expo Router (chaque fichier = un écran)
    _layout.tsx              # providers, polices, splash, base de données, thème
    index.tsx                # Accueil
    categories/
      index.tsx              # Explorer les catégories (filtres, recherche)
      [id].tsx               # Détail d'une catégorie
    play/
      setup.tsx              # Choix variante, durée, équipes
      ready.tsx              # "Pose le téléphone sur ton front" + calibration
      game.tsx               # Partie (paysage)
      results.tsx            # Résultats de la manche
    create/
      index.tsx              # Mes catégories
      editor.tsx             # Créer / modifier une catégorie
    tutorial.tsx             # Tutoriel interactif avec 3D
    settings.tsx
  features/
    game/                    # moteur de jeu (logique pure, testée)
      engine.ts              # état de la manche, tirage des cartes, score
      tilt.ts                # détection d'inclinaison (logique pure)
      useTilt.ts             # hook capteur → événements "correct" / "pass"
      variants.ts            # définition des variantes
    packs/                   # catégories et mots
      schema.ts              # zod, aligné sur docs/pack.schema.json
      repository.ts          # accès SQLite
      import.ts / export.ts
      seed/                  # paquets intégrés (JSON), un fichier par catégorie
    tutorial/                # scènes 3D, étapes
  ui/                        # design system : tokens, composants de base
    tokens.ts
    components/              # Button, Card, Chip, Sheet, Timer, ScoreBadge…
    motion/                  # presets d'animation (springs, durées)
  lib/                       # i18n, db, sons, haptics, storage
  assets/                    # polices, sons, fichiers Lottie (.json/.lottie), images
```

## 4. Modèle de données (SQLite)

- `packs` : id, nom (fr/en), description, région, langue, auteur, emoji/icône, couleur, source (`builtin` | `user` | `imported`), version, créé/modifié le.
- `categories` : id, pack_id, nom (fr/en), description, tags, couleur, icône, variantes compatibles (liste, `NULL` = défaut, voir GAMEPLAY.md §3), `duplicated_from` (id de la catégorie intégrée d'origine, optionnel), `is_favorite`, `is_hidden`. La **région est celle du pack** (pas de colonne région ni de difficulté par défaut sur la catégorie).
- `words` : id, category_id, texte, indice optionnel, difficulté (1–3), mots interdits (liste, données propres à la variante « Mots interdits »). Pas de liste de variantes au niveau du mot.
- `matches` (parties en équipes, multi-manches) : id, date de début / fin, nombre de manches prévu, équipes (nom, couleur, ordre), statut (`in_progress` | `finished`).
- `rounds` (historique local) : date, catégorie(s), variante, durée, score, mots trouvés / passés, `match_id` et équipe (optionnels, mode équipes).
- `seen_words` (mots vus récemment) : word_id, dernière date de tirage. Sert à éviter de reproposer les mêmes mots ; purgé automatiquement au-delà d'une ancienneté ou d'un volume.

**Limites** : 5 000 mots max par catégorie, 20 000 mots max par paquet, 100 catégories max par paquet ; fichier importé ≤ 2 Mo.

**Paquets intégrés** : livrés en JSON (`src/features/packs/seed/`) et insérés en base au premier lancement **et** à chaque mise à jour de l'app (upsert par `id` + `version`, sans toucher aux paquets utilisateur ni importés). Lors de la mise à jour :
- `is_favorite` et `is_hidden` des catégories intégrées sont **préservés** ;
- les mots retirés de la nouvelle version sont **supprimés**, ainsi que leurs lignes dans `seen_words` ;
- les catégories intégrées sont **en lecture seule** : l'action « Dupliquer pour modifier » crée une copie utilisateur (source `user`, `duplicated_from` renseigné).

**Catégories créées** : une catégorie de l'éditeur vit dans **son propre paquet** (source `user`, id `perso-<nom>-<suffixe>`, région `custom`) : l'export partage exactement cette catégorie. Un paquet importé à plusieurs catégories reste groupé (décision du 25/10/2026).

**Préférences** (réglages, onboarding vu, sensibilité, mode tap…) : `expo-sqlite/kv-store`.

## 5. Feuille de route

**Phase 0 — Fondations** : projet Expo (identifiant Android `com.gaetanango.devinelemot`, fixé avant tout build EAS), dev build Android, design system (tokens, typo, composants de base), i18n, SQLite + seed. **Valider un build release (R8) avec Skia** dès cette phase.
**Phase 1 — Cœur du jeu (MVP jouable)** : détection d'inclinaison fiable, écran de partie, timer, sons/vibrations, résultats. 5 à 10 catégories de test.
**Phase 2 — Catégories** : explorateur (régions, recherche, favoris), 40+ catégories intégrées, création/édition, import/export JSON.
**Phase 3 — Variantes** : toutes les variantes de GAMEPLAY.md, mode équipes, mode « Mix ».
**Phase 4 — Finition visuelle** : animations de transition, confettis, mascotte (géométrique en code, ASSETS.md §2), tutoriel 3D (prototype + mesure des fps d'abord), onboarding.
**Phase 5 — Publication** : icône, splash, captures Play Store, fiche en FR/EN, build AAB via EAS, tests sur 3+ téléphones réels (dont un entrée de gamme).

**Plus tard** : enregistrement vidéo des joueurs, iOS, partage de paquets par QR code / lien, statistiques avancées, packs de contenu en anglais (le champ `language` est déjà géré), mascotte interactive en Rive (après prototype).
