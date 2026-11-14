# Fiche Play Store — Devine le mot

Textes à coller dans la Play Console (Présence sur le Store → Fiche principale). Limites Google : titre ≤ 30 caractères, description courte ≤ 80, description complète ≤ 4 000.

Ne rien affirmer qui ne soit pas vrai dans l'app (pas d'avis, de chiffres ni de récompenses : l'app n'est pas encore publiée).

## Réglages de la fiche

| Champ | Valeur |
|---|---|
| Nom de l'application | Devine le mot |
| Catégorie | Jeux → Mots |
| Tags (jusqu'à 5) | Mots, Soirée, Multijoueur local, Hors ligne, Famille |
| Coordonnées | adresse de contact de « Donne ton avis » (voir `src/app/settings.tsx`) |
| Politique de confidentialité | URL publique de `docs/store/confidentialite.md` (à publier) |
| Publicités | Non |
| Achats intégrés | Non |
| Classification du contenu | Questionnaire IARC : pas de violence, pas de contenu sexuel, pas de jeux d'argent, pas d'échanges entre utilisateurs. Attendu : PEGI 3 / Tout public |
| Public cible | 13 ans et plus (le contenu vise 15–40 ans ; ne pas cocher « enfants » pour éviter le programme Familles) |

## Français (langue par défaut)

**Titre**
Devine le mot

**Description courte**
Le jeu de soirée : téléphone sur le front, tes amis te font deviner le mot !

**Description complète**

Pose le téléphone sur ton front. Tes amis voient le mot et te le font deviner : en le décrivant, en le mimant, en chantant… Tu penches le téléphone vers le bas quand tu as trouvé, vers le haut pour passer. Le chrono tourne, les rires suivent.

**Des catégories qui te parlent**
Plus de 45 catégories intégrées, dont beaucoup pensées pour le Cameroun et l'Afrique : artistes camerounais et africains, plats et boissons, camfranglais, villes et quartiers, footballeurs, Nollywood… À côté, les classiques du monde entier : films, séries, animaux, métiers, pays, et des catégories spéciales soirée.

**Plusieurs façons de jouer**
• Classique : décris le mot sans le dire
• Mime : aucun son autorisé
• Onomatopées, Un seul mot, Chante, Dessin dans les airs
• Mots interdits : décris sans utiliser les mots affichés
• Imitation : imite la personnalité
• Mix : la consigne change à chaque mot

**En solo ou en équipes**
Joue une manche rapide, ou lance une partie en équipes (jusqu'à 6) avec tableau des scores et podium final.

**Crée tes propres catégories**
Crée une catégorie en quelques secondes : colle une liste de mots et c'est prêt. Partage-la avec tes amis par WhatsApp ou Bluetooth, ou importe les paquets qu'on t'envoie.

**Pensé pour les vraies soirées**
• 100 % hors ligne : aucune connexion nécessaire
• Gratuit, sans publicité, sans achat, sans compte
• Aucune donnée collectée
• Mot en très grand, lisible à un mètre
• Vibrations et sons pour savoir ce qui se passe, même dans le bruit
• Mode tap pour jouer sans incliner le téléphone
• Tutoriel en 3D, proposé mais jamais imposé

Prêt ? Téléphone sur le front, et c'est parti !

## English

**Title**
Devine le mot – Party game

**Short description**
The party game: phone on your forehead, your friends make you guess the word!

**Full description**

Put the phone on your forehead. Your friends see the word and help you guess it: by describing it, miming it, singing it… Tilt the phone down when you get it, up to pass. The clock is ticking, the laughs follow.

**Categories that speak to you**
More than 45 built-in categories, many made for Cameroon and Africa: Cameroonian and African artists, food and drinks, Camfranglais, cities and districts, footballers, Nollywood… Plus classics from around the world: movies, TV shows, animals, jobs, countries and party specials.

Note: the words are in French for now. The interface is available in French and English.

**Many ways to play**
• Classic: describe the word without saying it
• Mime: no sound allowed
• Sound effects, One word, Sing, Air drawing
• Taboo words: describe it without the words shown
• Impression: imitate the celebrity
• Mix: the rule changes with every word

**Solo or in teams**
Play a quick round, or start a team game (up to 6 teams) with a scoreboard and a final podium.

**Make your own categories**
Create a category in seconds: paste a list of words and you're done. Share it with friends over WhatsApp or Bluetooth, or import the packs they send you.

**Made for real parties**
• 100% offline: no connection needed
• Free, no ads, no purchases, no account
• No data collected
• Huge word, readable from a meter away
• Vibrations and sounds so you know what happened, even in the noise
• Tap mode to play without tilting
• 3D tutorial, offered but never forced

Ready? Phone on your forehead, and go!

## Sécurité des données (questionnaire Play Console)

| Question | Réponse |
|---|---|
| L'application collecte-t-elle ou partage-t-elle des données utilisateur ? | **Non** |
| Données chiffrées en transit | Sans objet (aucune donnée ne quitte le téléphone ; pas de permission INTERNET en production) |
| Suppression des données | Les données (catégories créées, historique des manches, réglages) restent sur le téléphone et disparaissent à la désinstallation |
| Partage de paquets | Fait par l'utilisateur, via la feuille de partage Android : l'app n'envoie rien elle-même |

## Visuels à fournir

| Visuel | Format | État |
|---|---|---|
| Icône | 512 × 512 PNG | **provisoire** : `assets/store/play-store-icon-512.png` (mascotte) ; à remplacer par l'icône définitive |
| Image de présentation | 1024 × 500 PNG/JPG | à créer |
| Captures téléphone | 2 à 8, 16:9 ou 9:16, ≥ 1080 px | à prendre sur le build release : accueil, préparation, partie (paysage, flash Trouvé), résultats, catégories, éditeur |
