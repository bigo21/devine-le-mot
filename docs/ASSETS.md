# ASSETS — Icônes, illustrations, 2D/3D, sons

Principe : **une seule famille visuelle par type d'élément**, des licences propres et tracées, et un poids total maîtrisé. Claude Code peut produire tout ce qui se construit en code (icônes SVG simples, motifs, formes, 3D en primitives, mascotte géométrique). Ce qui demande un vrai dessin (mascotte illustrée, illustrations sur mesure, icône de l'app) passe par un humain ou un outil de design, puis est intégré par Claude Code.

## 1. Inventaire

| Élément | Source retenue | Qui le produit | Format livré |
|---|---|---|---|
| Icônes d'interface (retour, réglages, partager, etc.) | **Phosphor Icons** (`phosphor-react-native`, licence MIT), une seule famille, poids `duotone` pour les icônes mises en avant, `bold` ailleurs | Claude Code | composants SVG |
| Icônes des catégories | **Microsoft Fluent Emoji, style 3D** (licence MIT) | Claude Code (sélection + intégration) | PNG → WebP 256 px, embarqués |
| Drapeaux (filtres de région, catégorie pays) | Fluent Emoji n'inclut probablement pas les drapeaux : à vérifier ; sinon **flag-icons** (MIT) | Claude Code | SVG |
| Icônes de catégories propres au Cameroun / à l'Afrique sans équivalent emoji (ndolé, makossa, bend skin…) | Illustrations sur mesure **dans le style Fluent 3D** | Humain : illustrateur, ou génération par IA puis retouche | PNG → WebP 256 px |
| Icônes animées des variantes (mime, onomatopées, chant…) | Lottie | Lottie simples faites sur mesure (LottieFiles Creator, Jitter) ou Lottie libres de droits vérifiés | `.lottie` / `.json` |
| Mascotte | Voir §2 | Humain ou Claude Code selon l'option | Lottie ou composant Skia |
| Motifs Ndop en filigrane | Tuiles géométriques générées en code (Skia / react-native-svg) | Claude Code | code |
| 3D du tutoriel | Primitives three.js (tête, téléphone) | Claude Code | code |
| Animation « téléphone sur le front » | Lottie | Humain, ou Claude Code en fausse 3D (Reanimated) | Lottie ou code |
| Confettis, particules, dégradés | Skia | Claude Code | code |
| Icône de l'app (adaptative + monochrome Android 13+) | Sur mesure | Humain, dans Figma | PNG 1024 + calques foreground/background |
| Splash screen | Logo + `bg` | Claude Code à partir du logo | via `expo-splash-screen` |
| Logo / logotype « Devine le mot » | Sur mesure, typo Unbounded retravaillée | Humain | SVG |
| Sons | Bibliothèques **CC0** : Kenney (audio), Freesound filtré CC0, Pixabay Sound Effects (licence à relire) | Claude Code (sélection) + toi (validation à l'oreille) | `.m4a`/`.ogg` mono, normalisés |
| Captures Play Store | Captures réelles de l'app + cadres | Claude Code peut générer les cadres ; captures sur téléphone | PNG |

## 2. La mascotte : deux options

**Option A, géométrique, faite en code (recommandée pour démarrer).** Un personnage simple construit en formes (par exemple une bulle de dialogue ronde avec des yeux et une bouche expressive, aux couleurs des tokens), animé en Reanimated/Skia. Avantages : aucun besoin de designer, très léger, états faciles à ajouter, cohérent avec la 3D en primitives. Claude Code peut la créer et la faire évoluer.

**Option B, illustrée, animée en Lottie.** Un personnage dessiné (plus de caractère), animé dans un outil de motion (After Effects + Bodymovin, LottieFiles Creator ou Jitter). Demande un illustrateur et un animateur, ou beaucoup de temps de ta part.

On démarre avec A. B reste possible plus tard sans rien casser, puisque la mascotte est isolée dans un composant `<Mascot state="..." />`.

## 3. Règles de production

- **Licences** : tout fichier tiers est listé dans `assets/CREDITS.md` (nom, source, URL, licence, date). Pas de ressource sans licence claire autorisant l'usage commercial et la modification. Pas d'images de personnes réelles, de logos de marques, ni de personnages protégés (super-héros, dessins animés) : les catégories correspondantes n'affichent que du texte et une icône générique.
- **Poids** : images en WebP ; icônes de catégories en 256 px max ; budget total des assets embarqués **≤ 15 Mo**. Les Lottie de plus de 150 Ko sont à alléger.
- **Cohérence** : on ne mélange pas les styles (pas d'emoji système à côté de Fluent 3D, pas d'autre famille d'icônes que Phosphor). Les emoji du schéma des paquets (`emoji`) servent d'identifiant : l'app les remplace par l'image Fluent correspondante, et affiche l'emoji système seulement pour les catégories importées sans équivalent.
- **Rangement** : `src/assets/` → `icons/`, `categories/`, `flags/`, `lottie/`, `sounds/`, `fonts/`, `brand/`. Noms en kebab-case, sans accent.

## 4. Outils

- **Figma** : maquettes des écrans clés, icône de l'app, logo, et validation visuelle avant intégration. Le serveur MCP Figma peut être ajouté à Claude Code pour qu'il lise les maquettes et s'en serve comme référence.
- **LottieFiles Creator** ou **Jitter** : animations Lottie sans After Effects.
- **Squoosh** ou `cwebp` : conversion WebP.
- **Audacity** : découpe et normalisation des sons (‑14 LUFS environ, attaque nette, pas de silence au début).
