import Link from "next/link";

export default function Landing() {
  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="text-center pt-12 relative">
        <div className="inline-flex items-center gap-2 chip mb-6 text-white/70">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Application bêta — 100 % jetons virtuels
        </div>
        <h1 className="hero-title text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
          Cours. Parie.
          <br />Habille ton avatar.
        </h1>
        <p className="text-white/65 mt-6 max-w-2xl mx-auto text-lg leading-relaxed">
          RunnerBet transforme tes chronos en cotes équitables. Défie tes potes,
          parie sur des duels, monte un club, gagne des paires <span className="tier-carbon font-semibold">carbones</span> que tu ne pourrais pas t'offrir en vrai.
        </p>
        <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
          <Link href="/register" className="btn-primary text-base px-6 py-3">Créer mon compte</Link>
          <Link href="/challenges" className="btn-ghost text-base px-6 py-3">Voir les défis</Link>
        </div>
      </section>

      {/* 4 piliers */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Pillar emoji="⚡" title="Défis quotidiens" text="Pas d'attente d'une course officielle : lance un défi sur ton entraînement (chrono, volume, streak) et fais venir les parieurs." />
        <Pillar emoji="⚔️" title="Duels 1v1" text="Affronte un autre coureur sur une métrique commune. Le gagnant rafle le pot, les spectateurs parient en plus." />
        <Pillar emoji="🛡️" title="Clubs & guerres" text="Rejoins un club, alimente le trésor, déclare la guerre à un club rival sur 7 jours façon Clash of Clans." />
        <Pillar emoji="🚀" title="Boutique vivante" text="Cinq marques fictives, des paires d'entrée au carbone numéroté. Les drops limités disparaissent à date." />
      </section>

      {/* Comment ça marche */}
      <section className="card">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <div className="brand mb-2">Le concept</div>
            <h2 className="text-2xl font-bold">Cotes équitables, sans tricherie possible.</h2>
            <p className="text-white/65 mt-3">
              Les cotes sont calculées par la formule de VDOT (Jack Daniels) à partir
              de tes chronos certifiés — via Strava ou résultats officiels. Plus tes
              données sont récentes et fiables, plus tes cotes sont précises. Pas de
              référence solide ? Le moteur resserre automatiquement les cotes vers le
              50/50 pour bloquer le sandbagging.
            </p>
          </div>
          <ol className="space-y-3">
            {[
              ["1", "Crée ton compte", "Bonus de 100 jetons offerts."],
              ["2", "Connecte Strava ou ajoute un chrono", "C'est ta base VDOT."],
              ["3", "Lance ou rejoins un défi / duel", "Mise des jetons, fixe les enjeux."],
              ["4", "Gagne, équipe ton avatar", "Chaussures, montres, textile, carbones rares."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex items-start gap-3">
                <span className="size-7 rounded-full bg-accent/15 border border-accent/30 text-accent grid place-items-center font-bold text-sm shrink-0">{n}</span>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-white/55">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats / call-out */}
      <section className="grid sm:grid-cols-3 gap-4">
        <Stat value="7%" label="Vig sur les paris" hint="Calibrée pour pousser à l'engagement, pas pour ruiner." />
        <Stat value="5" label="Pubs gratuites / jour" hint="10 jetons chacune, sans limite de qualité." />
        <Stat value="56+" label="Items en boutique" hint="Chaussures, montres, textile — drops limités inclus." />
      </section>
    </div>
  );
}

function Pillar({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="card">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-white/65 text-sm mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint: string }) {
  return (
    <div className="card text-center">
      <div className="stat-num text-4xl text-accent">{value}</div>
      <div className="font-semibold mt-1">{label}</div>
      <div className="text-xs text-white/50 mt-1">{hint}</div>
    </div>
  );
}
