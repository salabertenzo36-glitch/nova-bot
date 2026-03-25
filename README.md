# Nova Bot

Base de bot Discord public en TypeScript pour un projet tres developpe:

- architecture modulaire `discord.js`
- slash commands extensibles
- IA locale via Ollama
- chat interserveur
- tickets
- giveaways
- architecture pour plus de 500 actions slash compatibles avec Discord

## Point important

Discord ne permet pas 500 commandes slash top-level sur une seule application. En pratique, il faut:

- regrouper les fonctionnalites dans des commandes parent
- utiliser beaucoup de sous-commandes et sous-groupes
- reserver les commandes top-level aux grands modules

Le projet ci-joint te donne deja:

- `5` modules fonctionnels reels: `ping`, `ai`, `bridge`, `ticket`, `giveaway`
- gros modules reels `/mod`, `/util`, `/fun` avec un grand catalogue de sous-commandes
- modules seed restants pour `admin` et `eco`
- un deployeur compatible avec la limite Discord des commandes top-level

## Installation

1. Installer les dependances:

```bash
npm install
```

2. Configurer les variables:

```bash
cp .env.example .env
```

3. Remplir dans `.env`:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_DEV_GUILD_ID` pour tester vite sur un serveur
- `OLLAMA_BASE_URL` pour l'instance Ollama
- `OLLAMA_MODEL` pour le modele local

4. Installer et lancer Ollama:

```bash
ollama pull llama3.1:8b
ollama serve
```

5. Lancer en dev:

```bash
npm run dev
```

6. Deployer les commandes:

```bash
npm run deploy:commands
```

## Site public

Le site statique est dans `website/`.

Preview locale:

```bash
npm run site:serve
```

Puis ouvrir `http://localhost:4173`.

Deploiement public simple:

- `Vercel`: le projet contient deja `vercel.json`
- `Netlify`: le projet contient deja `netlify.toml`

Pages du site:

- `/`
- `/features`
- `/commands`
- `/support`

Liens deja branches:

- ajout du bot
- serveur support

## Structure

- `src/index.ts`: entree du bot
- `src/register-commands.ts`: enregistrement des commandes slash
- `src/commands/index.ts`: commandes principales + generation du catalogue
- `src/commands/catalog.ts`: generation des 550 actions seed
- `src/events/*`: gestion des events Discord
- `src/features/ai/*`: integration IA
- `src/features/bridge/*`: chat interserveur
- `src/features/tickets/*`: tickets
- `src/features/giveaway/*`: giveaways
- `src/lib/json-store.ts`: stockage JSON simple

## Ce qu'il faut faire ensuite

Pour un bot public vraiment solide, les etapes suivantes sont les bonnes:

1. Remplacer le stockage JSON par PostgreSQL ou MongoDB.
2. Remplacer progressivement les actions seed par de vraies features.
3. Ajouter anti-spam, logs, permissions avancees, cooldowns, localisation et sharding.
4. Ajouter un vrai worker pour terminer les giveaways automatiquement.
5. Renforcer l'IA locale avec moderation, cache, outils et limites par utilisateur.

## IA Ollama

Nova supporte maintenant:

- memoire courte par salon
- cooldown par utilisateur
- styles `balanced`, `strict`, `friendly`, `developer`, `short`
- activation ou coupure des reponses par mention
- override de modele par serveur dans le stockage local

Commandes utiles:

- `/ai ask`
- `/ai reset`
- `/ai status`
- `/ai style`
- `/ai cooldown`
- `/ai mentions`

## Base conseillee pour 500+ features

Au lieu de faire `500` commandes top-level:

- `/admin ...`
- `/mod ...`
- `/ticket ...`
- `/giveaway ...`
- `/economy ...`
- `/fun ...`
- `/ai ...`
- `/config ...`

Puis tu mets des dizaines de sous-commandes sous chaque domaine.
