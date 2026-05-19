"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { STANDARD_DISTANCES, formatTime, parseTimeToSec, predictTimeSec } from "@/lib/vdot";
import { ACH_BY_CODE, ACHIEVEMENTS } from "@/lib/achievements";
import { SKIN_TONES } from "@/lib/avatar";
import { TITLES_BY_ACHIEVEMENT, titleFor } from "@/lib/titles";

type InventoryItem = { item: { id: string; brand: string; model: string; category: string; tier: string; imageEmoji: string } };
type Loadout = {
  id: string; name: string;
  shoesId?: string | null; shirtId?: string | null; shortsId?: string | null; socksId?: string | null;
  capId?: string | null; glassesId?: string | null; watchId?: string | null; beltId?: string | null;
};
type Me = {
  id: string; displayName: string; tokens: number; trustScore: number; stravaId?: string | null;
  referralCode: string; loginStreak: number; lastDailyBonusAt?: string | null;
  profile: {
    vdot: number; gender: string; skinTone: string; selectedTitle?: string | null;
    equippedShoes?: string | null; equippedShirt?: string | null; equippedShorts?: string | null;
    equippedSocks?: string | null; equippedCap?: string | null; equippedGlasses?: string | null;
    equippedWatch?: string | null; equippedBelt?: string | null;
    loadouts: Loadout[];
  } | null;
  prs: Array<{ id: string; distanceM: number; timeSec: number; raceDate: string; source: string; status: string; evidenceUrl?: string | null }>;
  inventory: InventoryItem[];
  achievements: Array<{ code: string; unlockedAt: string }>;
  referrals: Array<{ id: string; displayName: string; createdAt: string }>;
};

const CAT_LABEL: Record<string, string> = {
  shoes: "Chaussures", shirt: "Hauts", shorts: "Shorts", socks: "Chaussettes",
  cap: "Casquettes", glasses: "Lunettes", watch: "Montres", belt: "Hydratation",
};

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ distanceM: 10000, time: "", source: "OFFICIAL", evidenceUrl: "", raceDate: new Date().toISOString().slice(0, 10) });
  const [adsRemaining, setAdsRemaining] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newLoadoutName, setNewLoadoutName] = useState("");

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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    await load();
  }

  async function changeAppearance(patch: { skinTone?: string; selectedTitle?: string | null }) {
    const r = await fetch("/api/profile/appearance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Erreur.");
    }
    await load();
  }

  async function createLoadout() {
    if (!newLoadoutName.trim()) return;
    const r = await fetch("/api/loadouts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLoadoutName.trim() }),
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur.");
    setNewLoadoutName("");
    await load();
  }

  async function equipLoadout(id: string) {
    await fetch(`/api/loadouts/${id}/equip`, { method: "POST" });
    setMsg("Tenue équipée.");
    await load();
  }

  async function deleteLoadout(id: string) {
    await fetch(`/api/loadouts/${id}`, { method: "DELETE" });
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
  const title = titleFor(me.profile?.selectedTitle);
  const inventoryByCat = me.inventory.reduce<Record<string, InventoryItem[]>>((acc, i) => {
    (acc[i.item.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <h1 className="text-2xl font-bold">{me.displayName}
            {title && <span className="ml-2 text-amber-300 text-base font-semibold align-middle">· {title}</span>}
          </h1>
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
            <p className="text-sm text-white/70 mt-1">Série de {me.loginStreak} jour(s).</p>
            <button className="btn-gold mt-3 w-full" disabled={!canClaim} onClick={claimDaily}>
              {canClaim ? "Réclamer mon bonus" : "Déjà réclamé"}
            </button>
          </div>
          <div className="card">
            <h3 className="font-bold">📺 Pubs du jour</h3>
            <p className="text-sm text-white/70 mt-1">10 jetons / vidéo (max 5/jour).</p>
            <button className="btn-gold mt-3 w-full" disabled={!adsRemaining} onClick={watchAd}>
              {adsRemaining ? `Voir une pub (${adsRemaining} restantes)` : "Limite atteinte"}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-3">🎨 Apparence de l'avatar</h3>
          <div className="mb-3">
            <label className="label">Carnation</label>
            <div className="flex gap-2 flex-wrap">
              {SKIN_TONES.map((t) => {
                const active = me.profile?.skinTone === t.key;
                return (
                  <button key={t.key}
                    onClick={() => changeAppearance({ skinTone: t.key })}
                    className={`btn-ghost text-xl ${active ? "border-accent" : ""}`}
                    title={t.label}>
                    🏃{t.modifier}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Titre affiché</label>
            <select className="input"
              value={me.profile?.selectedTitle ?? ""}
              onChange={(e) => changeAppearance({ selectedTitle: e.target.value || null })}>
              <option value="">— Aucun —</option>
              {Object.entries(TITLES_BY_ACHIEVEMENT).map(([code, label]) => (
                <option key={code} value={code} disabled={!unlocked.has(code)}>
                  {label} {unlocked.has(code) ? "" : "(verrouillé)"}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/50 mt-1">
              Débloque des succès pour gagner de nouveaux titres.
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold mb-3">👗 Tenues sauvegardées ({me.profile?.loadouts.length ?? 0}/3)</h3>
          <div className="space-y-2">
            {me.profile?.loadouts.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                <span className="font-semibold">{l.name}</span>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs" onClick={() => equipLoadout(l.id)}>Équiper</button>
                  <button className="btn-ghost text-xs" onClick={() => deleteLoadout(l.id)}>Suppr.</button>
                </div>
              </div>
            ))}
            {(me.profile?.loadouts.length ?? 0) < 3 && (
              <div className="flex gap-2 pt-2">
                <input className="input flex-1" placeholder="Nom (ex : Marathon Paris)"
                  value={newLoadoutName} onChange={(e) => setNewLoadoutName(e.target.value)} />
                <button className="btn-primary" onClick={createLoadout}>Capturer ma tenue</button>
              </div>
            )}
            {(me.profile?.loadouts.length ?? 0) === 0 && (
              <p className="text-white/50 text-sm">Capture ta tenue actuelle pour la rappeler en 1 clic plus tard.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold">🤝 Parrainage</h3>
        <p className="text-sm text-white/70 mt-1">
          +100 jetons à l'inscription, +200 au 1<sup>er</sup> chrono vérifié,
          +200 au 1<sup>er</sup> pari. Filleul : 50 jetons en bienvenue.
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
                <label className="label">Chrono</label>
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
              <label className="label">Preuve</label>
              <input className="input" placeholder="https://…" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} />
            </div>
            <button className="btn-primary w-full" type="submit">Soumettre</button>
          </form>
        </div>

        <div className="card">
          <h3 className="font-bold mb-3">Strava</h3>
          {me.stravaId ? (
            <>
              <p className="text-sm text-white/70">Compte connecté.</p>
              <button className="btn-primary w-full mt-3" onClick={importStrava}>Importer mes activités</button>
            </>
          ) : (
            <a className="btn-primary w-full" href="/api/strava/login">Connecter Strava</a>
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
          <div className="space-y-4">
            {Object.entries(inventoryByCat).map(([cat, items]) => (
              <div key={cat}>
                <div className="text-xs text-white/60 uppercase tracking-wider mb-2">{CAT_LABEL[cat] ?? cat}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {items.map((i) => (
                    <button key={i.item.id} onClick={() => equip(i.item.id)}
                      className="text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5">
                      <div className="text-2xl">{i.item.imageEmoji}</div>
                      <div className="text-xs text-white/70">{i.item.brand}</div>
                      <div className="text-sm font-semibold">{i.item.model}</div>
                      <div className={`text-xs tier-${i.item.tier}`}>{i.item.tier}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
