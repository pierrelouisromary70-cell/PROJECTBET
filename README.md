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
- ⚡ **Défis quotidiens** : pour combler les semaines sans course officielle,
  chaque coureur peut lancer un défi sur lui-même (4 types : Chrono cible,
  Sortie longue, Volume sur N jours, Streak). Cotes auto-calculées à partir
  du VDOT et de la difficulté de la cible. Les autres parient YES (réussit)
  ou NO (échoue). Résolution par Strava (auto via `/check-strava`) ou
  preuve manuelle (URL résultat / capture). Délai 12 h à 14 jours.
  Expiration automatique = NO. Limite 3 défis ouverts par coureur.

## Duels 1v1 entre coureurs

Deux coureurs se défient sur une même métrique avec mise égale. Trois types :
**FASTEST_TIME** (meilleur chrono sur D km), **LONG_RUN** (sortie la + longue),
**VOLUME** (km cumulés). Le gagnant rafle le pot (vig 7 %). Les spectateurs
parient en plus avec cotes basées sur les VDOT et plafonnées par la confiance.

Garde-fous : les deux coureurs doivent avoir un PR vérifié, la confiance
moyenne doit être ≥ 25 %, parrain/filleul direct ne peuvent pas s'affronter
ni se parier dessus.

## Clubs

- 1 utilisateur = 1 club à la fois.
- Création : 500 🪙, requiert au moins 1 chrono certifié.
- Trésor commun alimenté par donations.
- Rôles : Capitaine / Officier / Membre. Capitaine seul peut déclarer/accepter
  les guerres et muter le rôle.
- Politique : OPEN (rejoindre librement) ou INVITE_ONLY.

## Guerre de clubs (style Clash of Clans)

- Capitaine A propose la guerre au club B avec une mise. Les deux trésors
  bloquent la mise. Durée 1 à 14 jours (par défaut 7).
- Pendant la guerre, chaque membre accumule des points :
  - Victoire défi (challenge) → +100 pts
  - Victoire duel 1v1 → +150 pts
  - PR vérifié → +VDOT/2 pts (à venir)
- À l'issue : club avec le plus de points gagne le pot, **vig 5 %** prélevé.
- Distribution : 50 % au trésor du club gagnant, 50 % réparti aux contributeurs
  du club gagnant au prorata de leurs points.
- Égalité parfaite → mises rendues aux deux clubs.
- Reset auto des warPoints des deux camps après règlement.

Le cron `/api/wars/cron` doit tourner régulièrement (Vercel cron) pour
expirer les guerres dépassées et les duels.

## Anti-sandbagging & calibration des défis

Le risque évident d'un défi auto-arbitré : créer une cible trivialement à
sa portée ou exploiter un PR ancien (sandbagging). Mesures combinées :

| Faille | Défense |
|---|---|
| Nouveau user (VDOT default 30) | Création bloquée tant qu'aucun PR vérifié n'est enregistré. |
| Cible trivialement facile (p>85 %) | Refus à la création (« Vise plus ambitieux »). |
| Cible quasi impossible (p<10 %) | Refus à la création (« Vise plus réaliste »). |
| PR ancien / pas de Strava | Score de **confiance** ∈ [0..1] qui rétrécit la proba vers 50 % → les cotes s'écrasent. Ex : un sandbagger qui devrait offrir 8.00 sur YES voit sa cote tassée à 2.38. |
| Mise du sandbagger | Plafond proportionnel à la confiance (max 2 000 🪙 × confiance). Stake parieur plafonné de la même façon. |
| Volume / Streak sans Strava | Refusés (impossible à arbitrer fiablement sans données d'activité). |
| Grinding | Cooldown 4 h après chaque règlement, max 3 défis ouverts. |
| Sandbagging persistant | Un défi TIME réussi avec preuve Strava crée automatiquement un PR vérifié → le VDOT remonte → les défis suivants se calibrent sur le vrai niveau. |
| 3 succès consécutifs sur p<0.30 | Trust score automatiquement décrémenté (-10) → confiance future réduite. |
| Cote figée au pari | Aucune manipulation rétroactive possible. |

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
