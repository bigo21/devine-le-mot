# Devine le mot : kit de démarrage (jeu type Heads Up!)

Ce kit prépare le projet pour travailler avec **Claude Code dans VS Code**. Il ne contient pas encore de code : c'est Claude Code qui va générer le projet Expo, en s'appuyant sur les documents de `docs/`.

> Nom de l'application : **Devine le mot**. Identifiant technique (slug) : `devine-le-mot`. Identifiant de paquet Android : `com.<ton-identifiant>.devinelemot` (à confirmer avant la première publication, il ne pourra plus changer).

---

## 1. Prérequis sur ta machine (Ubuntu)

- Node.js LTS (via NVM) et Git
- Android Studio + un émulateur, **ou** un téléphone Android en mode développeur (USB ou Wi‑Fi)
- Un compte Expo (gratuit) pour EAS Build : https://expo.dev
- VS Code

## 2. Installer Claude Code et l'extension VS Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

Dans VS Code : Extensions → chercher **Claude Code** (éditeur : Anthropic) → Installer. Le panneau Claude s'ouvre via l'icône dans la barre latérale.

## 3. Installer les skills et plugins

Dans un terminal (une seule fois, installation globale) :

```bash
# Skills officiels Expo + serveur MCP Expo (docs à jour, EAS, logs de build)
claude plugin install expo@claude-plugins-official
```

Puis dans une session Claude Code (`claude` dans le terminal ou le panneau VS Code) :

```text
# Bonnes pratiques React Native / performance (Callstack)
/plugin marketplace add callstackincubator/agent-skills
/plugin install react-native-best-practices@callstack-agent-skills

# Design d'interface soigné, non générique (Anthropic)
/plugin
   → chercher "frontend-design" et l'installer
```

Optionnel, depuis la racine du projet :

```bash
# Règles React Native / Expo de Vercel (performance des listes, animations…)
npx skills@latest add vercel-labs/agent-skills
#   → choisir la skill React Native dans la liste proposée
```

Redémarre la session Claude Code après les installations, puis vérifie avec `/plugin` et `/skills`.

## 4. Démarrer

Ce dossier (`devine-le-mot/`) est déjà la racine du futur projet : pas besoin de lancer `create-expo-app` toi-même.

1. Ouvre `devine-le-mot/` dans VS Code : `code ~/Dev/perso/games/devine-le-mot`
2. Lance Claude Code (panneau Claude dans VS Code).
3. Donne-lui le **prompt 0.1** de `docs/PROMPTS.md`, puis le **0.2**, qui crée le projet Expo **dans ce dossier** en conservant `CLAUDE.md` et `docs/`, et en reprenant les fichiers `AGENTS.md` et `.claude/settings.json` générés par Expo.
4. Continue phase par phase.

## 5. Contenu du kit

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Lu automatiquement par Claude Code à chaque session : règles du projet et pointeurs vers les docs |
| `docs/PROJET.md` | Vision, stack technique, architecture, conventions, feuille de route |
| `docs/GAMEPLAY.md` | Règles du jeu, détection d'inclinaison, variantes, catégories, import/export |
| `docs/DESIGN.md` | Direction artistique, tokens, écrans clés, 3D du tutoriel |
| `docs/MOTION.md` | Motion design : principes, chorégraphies, implémentation |
| `docs/UX.md` | Contexte d'usage, parcours, cas limites, ton, tests utilisateurs |
| `docs/ASSETS.md` | Icônes, illustrations 2D/3D, mascotte, sons, licences |
| `.claude/skills/animer` | Skill du projet : appliquer la spec de motion |
| `.claude/skills/revue-ux` | Skill du projet : auditer un écran ou un parcours |
| `docs/pack.schema.json` | Format JSON d'un paquet de catégories (import/export) |
| `docs/exemple-pack.json` | Exemple de paquet valide |
| `docs/PROMPTS.md` | Les prompts à donner à Claude Code, dans l'ordre |
