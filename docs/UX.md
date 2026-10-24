# UX — Expérience utilisateur de « Devine le mot »

## 1. Le contexte réel d'utilisation

On ne conçoit pas pour un bureau calme, mais pour une soirée :
- **bruit, musique forte** : on n'entend pas toujours les sons → toujours doubler par la vibration et l'image ;
- **lumière faible ou très forte** (dehors) → gros contrastes, gros textes ;
- **téléphone qui passe de main en main**, parfois tenu par quelqu'un qui découvre l'app → zéro apprentissage nécessaire pour jouer une manche ;
- **attention dispersée**, rires, interruptions → tout doit être reprenable (pause, reprise) ;
- **téléphones variés**, souvent d'entrée de gamme, batterie entamée, notifications qui arrivent ;
- **pas toujours de réseau** → tout hors ligne.

## 2. Principes

1. **Jouer en moins de 10 secondes** depuis l'ouverture, en 3 taps maximum : Jouer → catégorie → C'est parti (variante et durée pré-remplies avec le dernier choix).
2. **Pas de compte, pas de permission inutile.** L'app ne demande aucune permission au lancement.
3. **Tutoriel proposé, jamais imposé.** On peut jouer tout de suite ; l'aide arrive au bon moment (voir §4).
4. **Pardonner les erreurs.** Retour arrière accidentel, mauvais geste, mot validé par erreur : tout se rattrape.
5. **Lisible à 1 mètre.** L'écran de jeu est lu par les autres joueurs, pas par celui qui tient le téléphone.
6. **Ton chaleureux et complice** : tutoiement, phrases courtes, une pointe d'humour et de couleur locale sans tomber dans la caricature (« Bien joué ! », « Ça chauffe ! », « On remet ça ? »).

## 3. Parcours principaux

**Premier lancement**
Accueil (mascotte qui salue) → bulle discrète « Première fois ? Voir comment jouer (30 s) » avec deux boutons : « Montre-moi » (tutoriel 3D) / « Je connais ». Jamais de carrousel d'onboarding de plusieurs écrans avant de pouvoir jouer.

**Partie rapide**
Accueil → Jouer → Catégories (dernière utilisée en premier, favoris ensuite) → Préparation (variante et durée mémorisées) → Front + calibration → 3‑2‑1 → Jeu → Résultats → « Rejouer » (même réglages, mots différents).

**Mode équipes**
Préparation → « Équipes » → nombre d'équipes (noms et couleurs auto, modifiables mais facultatifs) → nombre de manches → écran de passage « Au tour de *Équipe X* » (le mot n'est **jamais** visible sur cet écran) → manche → résultats de la manche → écran de passage suivant → … → podium final.

**Créer une catégorie**
Mes catégories → « + Créer » → nom + couleur + icône → coller ou saisir les mots → aperçu → « Jouer avec » directement.

**Importer**
Mes catégories → « Importer » → explication courte (fichier reçu sur WhatsApp, etc.) → sélecteur de fichiers → aperçu (nom, nombre de catégories et de mots) → « Ajouter ».

## 4. Aide au bon moment (plutôt qu'un long tutoriel)

- Sur l'écran « front », la première fois : mini-rappel animé des deux gestes.
- Après une première manche avec beaucoup de mots « passés » très rapidement (faux déclenchements probables) : proposer « La détection est trop sensible ? Ajuste-la » → réglage direct.
- Si la calibration échoue 2 fois : proposer le mode tap.
- Première fois dans une variante : consigne affichée en grand 2 s avant le compte à rebours.

## 5. Cas limites à gérer

| Situation | Comportement attendu |
|---|---|
| Bouton retour / geste retour pendant une manche | Pause + feuille « Reprendre / Recommencer / Quitter ». Jamais de sortie directe. |
| Appel entrant, notification, app en arrière-plan | Pause automatique, timer figé ; à la reprise, compte à rebours 3‑2‑1 avant de relancer. |
| Téléphone tenu dans le mauvais sens | Détecté via l'orientation : message « Retourne le téléphone » avec animation. |
| Calibration impossible (téléphone qui bouge) | Message après 6 s + bouton « Passer en mode tap ». |
| Mot validé par erreur | Corrigeable sur l'écran des résultats (tap sur le mot → bascule trouvé/passé, score recalculé). |
| Tous les mots d'une catégorie déjà vus récemment | On les remélange et on prévient : « Tu as fait le tour, on remélange ! ». |
| Catégorie trop petite pour la durée | Avertissement avant la partie et suggestion de mélanger avec une autre catégorie. |
| Mot très long | Taille réduite automatiquement ; au-delà de 2 lignes, interdit à la création (limite du schéma). |
| Import invalide | Message clair en français expliquant **quoi** ne va pas et **comment** corriger ; jamais de message technique brut. |
| Batterie faible | Aucun traitement particulier, mais pas d'effet coûteux inutile (3D seulement dans le tutoriel). |
| Police système agrandie | Mise en page qui s'adapte ; le mot en jeu garde son auto-fit. |

## 6. États vides et messages

Chaque écran a un état vide pensé : « Mes catégories » vide (mascotte qui réfléchit + bouton Créer + bouton Importer), recherche sans résultat (proposition de créer la catégorie), aucun favori (explication de l'appui long ou de l'étoile).

Tous les textes sont dans les fichiers i18n, relus pour le ton (§2.6). Pas de point d'exclamation partout : on le garde pour les moments de célébration.

## 7. Réglages (minimalistes)

Son · Vibrations · Sensibilité de détection (faible / normale / forte, avec zone de test intégrée) · Mode tap · Durée par défaut · Langue · Réduire les animations (en plus du réglage système) · Revoir le tutoriel · À propos / crédits / contact.

## 8. Mesurer sans collecter

Pas d'analytics (promesse de l'app). On valide l'expérience par des **tests réels** :
- À la fin des Phases 1, 3 et 4 : au moins **3 soirées de test** avec des personnes qui ne connaissent pas l'app, sur des téléphones différents.
- À observer : temps jusqu'à la première manche, faux déclenchements, moments d'hésitation, ce que les gens disent à voix haute, ce qui les fait rire.
- Noter les retours dans `docs/TESTS-UTILISATEURS.md` et en tirer une liste de corrections priorisées.
- Dans l'app, un lien « Donne ton avis » (WhatsApp ou e-mail) dans À propos.
