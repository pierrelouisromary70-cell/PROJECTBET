# 🏃 RunnerBet

Application de paris virtuels entre coureurs à pied. Les cotes sont calculées
à partir des chronos certifiés de chaque coureur, normalisés via **VDOT
(Jack Daniels)** pour permettre les équivalences entre distances.

> ⚠️ **Jetons virtuels uniquement.** Aucun argent réel n'est en jeu. C'est un
> jeu social / gamification, pas du gambling au sens légal.

## Fonctionnalités

- 🔐 Authentification email/mot de passe (NextAuth).
- 📈 **VDOT** : conversion chrono ↔ équivalents toutes distances (1500 m → marathon).
- 🎯 **Cotes** : logistique sur l'écart de temps prédit, avec vig 5 % et facteur
  de confiance basé sur la fraîcheur du chrono et la source.
- 🏅 **PRs certifiés** : Strava OAuth + import des activités, ou saisie manuelle
  avec preuve (lien résultat, photo dossard). Validation communautaire pour les
  cas douteux.
- 🛡️ **Anti-triche** : plafond VDOT physiologique (~87), cooldown 24h par
  distance, score de confiance utilisateur, validation par 3 votes net.
- 💰 **Paris binaires** entre 2 coureurs d'une même course. Mise en jetons,
  cote figée à la prise du pari. Interdiction de parier sur soi.
- 🛒 **Boutique** inspirée du marché 2026 : Pegasus 41, Mach 6, Endorphin
  Speed 5, Superblast 2, et carbones (Alphafly 3, Adios Pro 4, Metaspeed Sky
  Paris, Endorphin Elite 2, Cloudboom Strike LS…) à prix très élevés.
- 👕 Textile : Nike Miler, Satisfy TechSilk, Soar Race Split, Ciele GOCap,
  Oakley Radar EV, District Vision…
- 🧍 Avatar customisable par emojis (par catégorie d'équipement).
- 📺 **Pubs** : jusqu'à 5 vidéos / jour, 10 jetons chacune.
- 🤝 **Parrainage** : code unique par utilisateur, +100 jetons à l'inscription
  du filleul, +200 à son 1ᵉʳ chrono vérifié, +200 à son 1ᵉʳ pari. Le filleul
  reçoit 50 jetons en bienvenue.
- 💳 **Achats de jetons** : 4 packs (Découverte, Runner, Athlete, Elite) avec
  bonus croissants. Stripe Checkout en prod ; mode démo activé si
  `STRIPE_SECRET_KEY` est vide (confirmation in-app pour pouvoir tester le flux).
- 🔥 **Streak quotidien** : bonus de 5 → 50 jetons progressif sur 7 jours,
  +200 jetons aux paliers de 30 jours.
- 🏅 **15 succès** : 1ᵉʳ pari, 1ᵉʳ chrono, BIG_WIN à cote ≥ 5, paliers VDOT
  50/60/70, CARBON_OWNER, FULL_OUTFIT, REFERRER_1/5/25, MARATHON_FINISHER…
- 📊 **Classements** : tokens, VDOT, taux de paris gagnés.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma + SQLite (dev) — facile à basculer vers Postgres en prod
- NextAuth (Credentials provider)
- Tailwind CSS
- Zod pour la validation d'entrée

## Démarrage

```bash
cp .env.example .env       # personnaliser NEXTAUTH_SECRET, Strava…
npm install
npx prisma db push         # crée la base SQLite
npm run db:seed            # catalogue + 4 utilisateurs démo + 1 course
npm run dev
```

Comptes de démo (mot de passe `demo1234`) :

- `alex@demo.run` — 35:00 / 10 km
- `marie@demo.run` — 45:00 / 10 km
- `leo@demo.run` — 1:25 / semi
- `sara@demo.run` — 19:30 / 5 km

## Exemple de calcul de cotes

Pour le duel **Alex (35:00 / 10k, VDOT ~57.5) vs Marie (45:00 / 10k, VDOT
~45)** sur 10 km :

- Temps prédit Alex ≈ 35:00 → proba ~92 %
- Temps prédit Marie ≈ 45:00 → proba ~8 %
- Cote sur Alex ≈ **1.03**, sur Marie ≈ **~12.0**

Plus l'écart est faible, plus les cotes se rapprochent. La confiance dans les
données (Strava récent vs manuel non vérifié) resserre la cote en cas de doute.

## Sécurité / anti-triche

| Mécanisme | Protection |
|---|---|
| Plafond VDOT 87 | Refuse les chronos surhumains |
| Cooldown 24h / distance | Empêche le spam de PRs |
| Hiérarchie de sources | STRAVA > OFFICIAL > MANUAL |
| Preuve requise | URL résultat ou photo dossard pour la saisie manuelle |
| Validation communautaire | 3 votes net pour valider/rejeter |
| Interdiction de parier sur soi | Évite l'auto-sabotage |
| Cote figée au moment du pari | Pas de manipulation a posteriori |
| Trust score utilisateur | Pondère la confiance des cotes |

## Stripe en prod

Pour activer les paiements réels :

1. Renseigne `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans `.env`.
2. Crée un endpoint webhook côté Stripe pointant sur `/api/packs/webhook`
   avec l'événement `checkout.session.completed`.
3. C'est tout — `/api/packs/checkout` détecte la clé et passe en mode Stripe.

Sans clé Stripe, le système crée la commande en DEMO et propose une page
interne `/buy-tokens/confirm/[id]` qui complète l'achat instantanément.
Idéal pour le dev.

## Roadmap (idées futures)

- Suspension après n PRs rejetés
- Cotes dynamiques type "marché" (book maker automatisé)
- Saisons (reset mensuel / récompenses)
- Notifications quand un coureur que tu suis publie un PR
- App mobile React Native (partage du backend)
- Mode "course chronométrée live" via webhook Strava
- Cosmétiques exclusifs achetables uniquement avec un certain VDOT
- Système de clubs / équipes
