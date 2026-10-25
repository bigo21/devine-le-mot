# GAMEPLAY — Règles, capteurs, variantes, catégories

## 1. Déroulé d'une manche

1. **Choix** : catégorie (ou plusieurs, mélangées) → variante → durée (30 / 60 / 90 / 120 s, défaut 60) → solo ou équipes.
2. **Préparation** : écran « Pose le téléphone sur ton front ». L'app passe en paysage, garde l'écran allumé, et **calibre** la position neutre quand le téléphone est stable sur le front pendant ~0,8 s.
3. **Compte à rebours** 3‑2‑1 (animé, sonore, vibrant).
4. **Jeu** : un mot s'affiche en très grand. Les autres font deviner selon la variante.
   - Incliner **vers le bas** (écran vers le sol) → ✅ Trouvé : flash vert, son, vibration courte, mot suivant.
   - Incliner **vers le haut** (écran vers le plafond) → ⏭️ Passer : flash orange, son, vibration différente, mot suivant.
   - Le joueur doit revenir en position neutre avant que le geste suivant soit pris en compte.
   - Alternative accessible (« Mode tap », activable dans les réglages) : tap sur la **moitié droite = ✅ Trouvé**, **moitié gauche = ⏭️ Passer**. En mode tap, chaque moitié affiche en permanence son libellé et son icône (jamais la couleur seule).
5. **Fin du temps** : son de fin, vibration longue, retour en portrait.
6. **Résultats** : score, liste des mots trouvés / passés (on peut corriger un mot en le touchant), boutons « Rejouer », « Changer de catégorie », « Équipe suivante ».

## 2. Détection d'inclinaison (`src/features/game/tilt.ts`)

- Source : `DeviceMotion` d'expo-sensors, intervalle ~50 ms. L'angle de l'écran est calculé à partir du **vecteur de gravité** (`accelerationIncludingGravity`) plutôt que des angles d'Euler : robuste dans tous les sens de tenue, sans saut près de ±90°.
- En paysage, l'axe pertinent dépend du sens de rotation (paysage gauche / droit) : il est lu dans le champ `orientation` de chaque mesure DeviceMotion, et le sens de l'axe est fixé à la calibration. **Retourner le téléphone** (paysage gauche ↔ droit) relance automatiquement la calibration. (`expo-screen-orientation` sert seulement à forcer le paysage pendant la partie.)
- Le signe « écran vers le sol » (`SCREEN_DOWN_SIGN` dans `tilt.ts`) a été confirmé sur appareil le 25/10/2026 : DeviceMotion renvoie z ≈ +9,8 écran vers le sol.
- **Calibration** : angle de référence mesuré au départ (le front n'est jamais parfaitement vertical), quand l'angle lissé varie de moins de 6° pendant 0,8 s **et** que les mesures brutes restent dans 15° (sinon une oscillation rapide passerait pour de la stabilité).
- **Seuils** (réglables, valeurs de départ) : déclenchement à ±40° par rapport à la référence ; réarmement quand on revient à moins de ±20°. Hystérésis indispensable.
- **Anti-rebond** : ignorer tout geste pendant 400 ms après un déclenchement.
- **Geste maintenu** : l'inclinaison doit rester au-delà du seuil au moins **100 ms** pour compter (une secousse, un rire ou un hochement ne valident rien).
- **Retour à l'équilibre obligatoire** : après un geste, il faut revenir sous le seuil de réarmement et **y rester 300 ms** avant que le geste suivant soit pris en compte. Le rebond de la tête après un « trouvé » ne peut donc pas déclencher un « passer » (retour terrain du 25/10/2026 : des mots étaient sautés sans être vus).
- **Lissage** : moyenne mobile ou filtre passe-bas sur 3–5 mesures pour éviter les faux positifs dus aux tremblements.
- La logique (angles → événements) est une **fonction pure** testable sans capteur ; le hook `useTilt` ne fait que brancher le capteur dessus.
- Réglage « Sensibilité » (faible / normale / forte) qui ajuste les seuils.

## 3. Variantes

Chaque variante a : un nom, une icône animée, une consigne courte affichée sous le mot, une couleur d'accent.

| Variante | Consigne aux autres joueurs |
|---|---|
| **Classique** | Décris le mot sans le prononcer |
| **Mime** | Mime-le, aucun son |
| **Onomatopées** | Uniquement des bruits et des sons |
| **Un seul mot** | Un seul mot d'indice à la fois |
| **Chante / fredonne** | Fais-le deviner en chantant ou fredonnant |
| **Mots interdits** | Décris sans utiliser les mots interdits affichés (style Taboo) |
| **Dessin dans les airs** | Dessine-le avec ton doigt dans l'air |
| **Imitation** | Imite la personne / le personnage (catégories qui la déclarent uniquement) |
| **Mix** | La variante change aléatoirement à chaque carte |

**Compatibilité** (définie **au niveau de la catégorie**, champ `variants` du schéma, qui fait foi) :
- `variants` absent → toutes les variantes **sauf Imitation**.
- `variants` présent → uniquement la liste donnée.
- **Imitation** n'est proposée que si elle figure explicitement dans `variants`. Les catégories de personnalités intégrées doivent la déclarer.
- **Mots interdits** : seuls les mots ayant **au moins 3 mots interdits** sont tirés dans cette variante (on en affiche 3). La variante n'est proposée que si la catégorie (ou la sélection de catégories) compte **au moins 20 mots éligibles**, qu'elle soit déclarée dans `variants` ou non.
- **Mix** tire au hasard parmi les variantes compatibles de la carte en cours (même règles d'éligibilité).
- Au niveau du mot, on ne stocke que les données propres à une variante (mots interdits), jamais de liste de variantes.

**Mélange de catégories** (décision du 25/10/2026) : plusieurs catégories peuvent être choisies pour une manche ; une variante n'est proposée que si elle convient à toutes, et les 20 mots éligibles de « Mots interdits » se comptent sur l'ensemble. Une catégorie est jugée trop petite pour la durée sous un mot toutes les 3 s.

**Première fois dans une variante** : sa consigne s'affiche en grand **5 s** avant le compte à rebours (UX.md §4), le temps que tout le groupe la lise.

**Mix : temps de lecture** : à chaque nouveau mot, le chrono s'arrête **3 s** le temps de lire la consigne (« Chrono en pause : lisez la consigne ») ; la durée choisie reste du temps de jeu effectif. Un mot trouvé ou passé pendant la lecture relance aussitôt le chrono (retour terrain du 25/10/2026).

**Mode équipes** : 2 à 6 équipes nommées (noms et couleurs auto, modifiables), manches à tour de rôle, tableau des scores animé, nombre de manches au choix. Une partie en équipes est enregistrée dans `matches` (reprise possible si l'app est fermée).

## 4. Catégories

Organisées en **packs régionaux** : la **région est définie sur le pack** et ses catégories en héritent. Filtres par région (pilules 🇨🇲 🌍 🇫🇷 🇺🇸 🌐 🎉 Soirée, plus ✏️ Mes catégories pour les catégories créées ou importées), thème (tags), recherche. Cible : **40+ catégories au lancement**, 80 à 200 mots chacune (plus les mots sont nombreux, moins on retombe dessus). Tirage sans remise par session ; on évite de reproposer les mots vus récemment (table `seen_words`).

**Langue** : au lancement, seule l'interface est traduite (FR / EN). Tout le contenu intégré est en français (`language: "fr"`). Le champ `language` du pack est déjà stocké et affiché pour accueillir des packs en anglais plus tard.

**Contenu intégré** : catégories en lecture seule (« Dupliquer pour modifier » crée une copie utilisateur). Chaque mot a **exactement 3 mots interdits** (vérifié par un test sur les fichiers de seed), et les catégories de personnalités déclarent `imitation` dans `variants`.

### 🇨🇲 Cameroun
Artistes et musiciens camerounais · Plats et boissons camerounais · Villes et quartiers · Expressions et camfranglais · Footballeurs (Lions Indomptables, Lionnes) · Marques et produits du quotidien · Lieux et monuments · Danses et rythmes (makossa, bikutsi, bend skin…) · Proverbes (à compléter) · Séries, films et humoristes

### 🌍 Afrique
Artistes africains (afrobeats, coupé-décalé, ndombolo, etc.) · Pays et capitales africaines · Plats africains · Footballeurs africains · Personnalités historiques africaines · Animaux de la savane · Nollywood et séries africaines

### 🇫🇷 France / francophonie
Chanteurs et rappeurs francophones · Films français · Plats français · Villes de France · Expressions françaises · Personnalités TV et internet

### 🇺🇸 États-Unis / international
Films hollywoodiens · Séries · Stars de la musique · Super-héros (noms uniquement, pas d'images) · Sportifs NBA / NFL · Marques mondiales · Dessins animés

### 🌐 Universel
Animaux · Métiers · Objets du quotidien · Sports · Pays et drapeaux du monde · Instruments de musique · Actions à mimer · Émotions · Fruits et légumes · Monuments du monde · Jeux vidéo · Applications et réseaux sociaux · Enfants (mots simples)

### 🎉 Spécial soirée
Situations gênantes · Choses qu'on dit en soirée · Années 2000 · Tendances TikTok

> Le contenu est généré progressivement par Claude Code, catégorie par catégorie, puis **relu par un humain** (surtout pour le Cameroun et l'Afrique, où les erreurs se voient vite). Chaque mot doit être connu du public visé ; pas de noms obscurs.

## 5. Création et import de catégories

**Éditeur** (écran `create/editor`) :
- Nom, emoji/icône, couleur (palette des tokens), description.
- Ajout de mots un par un **ou** en collant une liste (un mot par ligne, doublons retirés automatiquement).
- Minimum 10 mots pour pouvoir jouer ; avertissement sous 30.
- Mots interdits optionnels par mot (au moins 3 pour que le mot soit tiré en variante « Mots interdits » ; l'éditeur affiche le nombre de mots éligibles et le seuil de 20).
- Catégories intégrées : non modifiables ; bouton « Dupliquer pour modifier ».

**Export** : un paquet → fichier `nom-du-pack.devine.json` (format `docs/pack.schema.json`), partagé via la feuille de partage Android (WhatsApp, Bluetooth, etc.).

**Import** :
- **Voie principale** : sélecteur de fichiers (document picker) sur un `.json` / `.devine.json`.
- **Best effort** : fichier partagé vers l'app depuis WhatsApp, un gestionnaire de fichiers… (intent `SEND` Android via expo-sharing, types `application/json`, `application/octet-stream`, `text/plain`). Un texte ou un fichier `.txt` partagé devient une liste de mots dans l'éditeur. Selon l'app d'origine et le type MIME envoyé, ça peut ne pas marcher : l'écran d'import l'explique simplement (« Si le fichier ne s'ouvre pas directement, enregistre-le puis choisis-le ici »).
- Collage d'un texte brut (une ligne = un mot) → crée une catégorie.
- Validation zod stricte ; message d'erreur clair et en français si invalide ; aperçu avant import.
- **Conflits** : un paquet intégré n'est **jamais remplacé**. Un import portant l'`id` d'un paquet intégré est importé comme copie (nouvel `id`, nom suffixé « (copie) »). Même `id` qu'un paquet utilisateur / importé → choix « Remplacer » ou « Garder les deux » (la copie suit la même règle de nommage).
- Limites de sécurité : fichier ≤ 2 Mo, 100 catégories max par paquet, 5 000 mots max par catégorie, 20 000 mots max par paquet, mot ≤ 60 caractères.
