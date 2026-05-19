import Link from "next/link";

export default function Landing() {
  return (
    <div className="space-y-12">
      <section className="text-center pt-10">
        <h1 className="text-5xl font-black tracking-tight">Parie sur ton prochain duel.</h1>
        <p className="text-white/70 mt-4 max-w-2xl mx-auto">
          RunnerBet calcule les cotes à partir de tes chronos certifiés (Strava ou résultats
          officiels). Mise des jetons virtuels, gagne des paires <span className="tier-carbon">carbones</span> et
          du textile premium pour ton avatar.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/register" className="btn-primary">Créer mon compte</Link>
          <Link href="/races" className="btn-ghost">Voir les courses</Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-bold">⚡ Défis quotidiens</h3>
          <p className="text-white/70 text-sm mt-2">
            Pas besoin d'attendre une course officielle : chaque coureur peut
            lancer un défi sur lui-même (chrono, volume, streak) et les autres
            parient pour ou contre.
          </p>
        </div>
        <div className="card">
          <h3 className="font-bold">🛡️ Anti-triche</h3>
          <p className="text-white/70 text-sm mt-2">
            Strava OAuth, résultats officiels, validation communautaire et plafond physiologique.
          </p>
        </div>
        <div className="card">
          <h3 className="font-bold">👟 Boutique vivante</h3>
          <p className="text-white/70 text-sm mt-2">
            De la Pegasus à l'Alphafly 3 et la <span className="tier-carbon">On Cloudboom Strike LS</span>.
            Les carbones se méritent.
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-2">Comment ça marche ?</h2>
        <ol className="list-decimal pl-6 text-white/80 space-y-1">
          <li>Crée ton compte (bonus de bienvenue : 100 jetons).</li>
          <li>Connecte Strava ou saisis tes chronos avec preuve (lien de résultat / photo dossard).</li>
          <li>Rejoins une course et parie face à un autre coureur.</li>
          <li>Gagne des jetons → équipe ton avatar : chaussures, textile, lunettes.</li>
          <li>Regarde jusqu'à 5 pubs par jour pour booster ton solde.</li>
        </ol>
      </section>
    </div>
  );
}
