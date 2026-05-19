"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { STANDARD_DISTANCES, formatTime, parseTimeToSec, predictTimeSec } from "@/lib/vdot";
import { ACH_BY_CODE, ACHIEVEMENTS } from "@/lib/achievements";

type Me = {
  id: string; displayName: string; tokens: number; trustScore: number; stravaId?: string | null;
  referralCode: string; loginStreak: number; lastDailyBonusAt?: string | null;
  profile: { vdot: number; equippedShoes?: string | null; equippedShirt?: string | null; equippedShorts?: string | null; equippedSocks?: string | null; equippedCap?: string | null; equippedGlasses?: string | null } | null;
  prs: Array<{ id: string; distanceM: number; timeSec: number; raceDate: string; source: string; status: string; evidenceUrl?: string | null }>;
  inventory: Array<{ item: { id: string; brand: string; model: string; category: string; tier: string; imageEmoji: string } }>;
  achievements: Array<{ code: string; unlockedAt: string }>;
  referrals: Array<{ id: string; displayName: string; createdAt: string }>;
};

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ distanceM: 10000, time: "", source: "OFFICIAL", evidenceUrl: "", raceDate: new Date().toISOString().slice(0, 10) });
  const [adsRemaining, setAdsRemaining] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function load() {
    const u = await fetch("/api/me").then((r) => r.json());
    setMe(u);
    const a = await fetch("/api/ads/watch").then((r) => r.json());
    setAdsRemaining(a.remaining);
  }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  async function submitPR(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const sec = parseTimeToSec(form.time);
    if (!sec) { setMsg("Format chrono invalide. Ex : 35:42 ou 1:25:13."); return; }
    const r = await fetch("/api/pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distanceM: Number(form.distanceM),
        timeSec: sec,
        raceDate: form.raceDate,
        source: form.source,
        evidenceUrl: form.evidenceUrl || undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) setMsg(typeof j.error === "string" ? j.error : "Erreur.");
    else setMsg(j.needsReview ? "Chrono soumis à validation communautaire." : "Chrono vérifié, +25 jetons 🎉");
    await load();
  }

  async function importStrava() {
    const r = await fetch("/api/strava/import", { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? `Strava : ${j.created} nouveaux PRs importés.` : (j.error ?? "Erreur Strava."));
    await load();
  }

  async function watchAd() {
    setMsg("Visionnage de la publicité…");
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch("/api/ads/watch", { method: "POST" });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur pub.");
    else setMsg(`+${j.tokensEarned} jetons (${j.remaining} pubs restantes aujourd'hui).`);
    await load();
  }

  async function claimDaily() {
    const r = await fetch("/api/daily", { method: "POST" });
    const j = await r.json();
    if (j.granted) setMsg(`Bonus quotidien : +${j.reward} jetons. Série de ${j.streak} jour(s) 🔥`);
    else setMsg(j.alreadyClaimed ? "Bonus déjà réclamé aujourd'hui." : "Bonus indisponible.");
    await load();
  }

  async function equip(itemId: string) {
    await fetch("/api/shop/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    await load();
  }

  async function copyInvite() {
    if (!me) return;
    const url = `${window.location.origin}/register?ref=${me.referralCode}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!me) return <p className="text-white/60">Chargement…</p>;
  const vdot = me.profile?.vdot ?? 30;
  const today = new Date().toISOString().slice(0, 10);
  const lastClaim = me.lastDailyBonusAt?.slice(0, 10);
  const canClaim = lastClaim !== today;
  const unlocked = new Set(me.achievements.map((a) => a.code));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <h1 className="text-2xl font-bold">{me.displayName}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="chip">VDOT {vdot.toFixed(1)}</span>
            <span className="chip">Confiance {me.trustScore}/100</span>
            <span className="chip">🪙 {me.tokens.toLocaleString("fr-FR")}</span>
            <span className="chip">🔥 Série {me.loginStreak}</span>
            {me.stravaId && <span className="chip">Strava ✔︎</span>}
          </div>

          <h3 className="font-bold mt-6 mb-2">Équivalences VDOT</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {STANDARD_DISTANCES.map((d) => (
              <div key={d.m} className="flex justify-between bg-white/5 rounded-lg px-3 py-1.5">
                <span className="text-white/70">{d.label}</span>
                <span className="font-mono">{formatTime(predictTimeSec(d.m, vdot))}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Avatar profile={me.profile} />
          <div className="card">
            <h3 className="font-bold">🔥 Bonus quotidien</h3>
            <p className="text-sm text-white/70 mt-1">Série de {me.loginStreak} jour(s). Reviens chaque jour pour grossir le bonus.</p>
            <button
              className="btn-gold mt-3 w-full"
              disabled={!canClaim}
              onClick={claimDaily}>
              {canClaim ? "Réclamer mon bonus" : "Déjà réclamé"}
            </button>
          </div>
          <div className="card">
            <h3 className="font-bold">📺 Pubs du jour</h3>
            <p className="text-sm text-white/70 mt-1">10 jetons / vidéo (max 5/jour).</p>
            <button
              className="btn-gold mt-3 w-full"
              disabled={!adsRemaining}
              onClick={watchAd}>
              {adsRemaining ? `Voir une pub (${adsRemaining} restantes)` : "Limite atteinte"}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      <div className="card">
        <h3 className="font-bold">🤝 Parrainage</h3>
        <p className="text-sm text-white/70 mt-1">
          Invite des amis : +100 jetons à l'inscription, +200 à leur 1<sup>er</sup> chrono vérifié,
          +200 à leur 1<sup>er</sup> pari. Eux reçoivent 50 jetons.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <code className="bg-black/30 px-3 py-2 rounded-xl border border-white/10 text-lg tracking-widest">
            {me.referralCode}
          </code>
          <button className="btn-ghost" onClick={copyInvite}>
            {copied ? "Lien copié ✓" : "Copier le lien d'invitation"}
          </button>
        </div>
        {me.referrals.length > 0 && (
          <div className="mt-3 text-sm">
            <div className="text-white/60 mb-1">Filleuls ({me.referrals.length}) :</div>
            <div className="flex flex-wrap gap-2">
              {me.referrals.map((r) => <span key={r.id} className="chip">{r.displayName}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">🏅 Succès ({me.achievements.length}/{ACHIEVEMENTS.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.code);
            const def = ACH_BY_CODE[a.code];
            return (
              <div key={a.code}
                className={`p-3 rounded-xl border ${got ? "border-amber-300/40 bg-amber-300/5" : "border-white/5 bg-white/2 opacity-60"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{def.emoji}</span>
                  <div className="text-sm font-semibold">{def.title}</div>
                </div>
                <div className="text-xs text-white/70 mt-1">{def.description}</div>
                <div className="text-xs text-white/40 mt-1">+{def.reward} 🪙</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-3">Ajouter un chrono certifié</h3>
          <form onSubmit={submitPR} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Distance</label>
                <select className="input" value={form.distanceM} onChange={(e) => setForm({ ...form, distanceM: Number(e.target.value) })}>
                  {STANDARD_DISTANCES.map((d) => <option key={d.m} value={d.m}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Chrono (mm:ss / h:mm:ss)</label>
                <input className="input" placeholder="35:42" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Source</label>
                <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="OFFICIAL">Résultat officiel</option>
                  <option value="MANUAL">Manuel</option>
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.raceDate} onChange={(e) => setForm({ ...form, raceDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Preuve (URL résultat ou photo dossard)</label>
              <input className="input" placeholder="https://…" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} />
            </div>
            <button className="btn-primary w-full" type="submit">Soumettre</button>
          </form>
        </div>

        <div className="card">
          <h3 className="font-bold mb-3">Strava</h3>
          {me.stravaId ? (
            <>
              <p className="text-sm text-white/70">Compte connecté. Importe tes activités Run pour générer des PRs vérifiés sur 5/10/21/42 km.</p>
              <button className="btn-primary w-full mt-3" onClick={importStrava}>Importer mes activités</button>
            </>
          ) : (
            <>
              <p className="text-sm text-white/70">Connecte Strava — c'est la source la plus fiable pour tes chronos.</p>
              <a className="btn-primary w-full mt-3" href="/api/strava/login">Connecter Strava</a>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">Mes chronos</h3>
        {me.prs.length === 0 ? (
          <p className="text-white/60 text-sm">Aucun chrono encore.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr><th className="text-left">Distance</th><th className="text-left">Chrono</th><th className="text-left">Date</th><th className="text-left">Source</th><th className="text-left">Statut</th></tr>
            </thead>
            <tbody>
              {me.prs.map((pr) => (
                <tr key={pr.id} className="border-t border-white/5">
                  <td className="py-1">{pr.distanceM} m</td>
                  <td className="font-mono">{formatTime(pr.timeSec)}</td>
                  <td>{new Date(pr.raceDate).toLocaleDateString("fr-FR")}</td>
                  <td>{pr.source}</td>
                  <td>
                    <span className={`chip ${pr.status === "VERIFIED" ? "text-emerald-300" : pr.status === "REJECTED" ? "text-red-300" : "text-amber-300"}`}>{pr.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">Inventaire</h3>
        {me.inventory.length === 0 ? (
          <p className="text-white/60 text-sm">Rien encore. Va faire un tour à la boutique.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {me.inventory.map((i) => (
              <button key={i.item.id} onClick={() => equip(i.item.id)} className="text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5">
                <div className="text-2xl">{i.item.imageEmoji}</div>
                <div className="text-xs text-white/70">{i.item.brand}</div>
                <div className="text-sm font-semibold">{i.item.model}</div>
                <div className={`text-xs tier-${i.item.tier}`}>{i.item.tier}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
