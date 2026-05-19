"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Detail = {
  id: string; kind: string; description: string;
  ownerId: string; owner: { id: string; displayName: string; profile: { vdot: number } | null };
  startAt: string; deadline: string; status: string;
  probSuccess: number; oddsYesX100: number; oddsNoX100: number;
  ownerStake: number; yesPool: number; noPool: number;
  evidenceUrl?: string | null;
  bets: Array<{
    id: string; side: string; stake: number; oddsX100: number; status: string;
    isOwner: boolean; payout: number; bettor: { id: string; displayName: string };
  }>;
};

export default function ChallengeDetail() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [c, setC] = useState<Detail | null>(null);
  const [stake, setStake] = useState(50);
  const [msg, setMsg] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");

  async function load() {
    const r = await fetch(`/api/challenges/${params.id}`).then((r) => r.json());
    setC(r);
  }
  useEffect(() => { load(); }, [params.id]);

  async function placeBet(side: "YES" | "NO") {
    const r = await fetch(`/api/challenges/${params.id}/bet`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side, stake }),
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur");
    else setMsg(`Pari ${side} placé pour ${stake} 🪙.`);
    load();
  }

  async function submitProof() {
    if (!evidenceUrl) return setMsg("Lien requis.");
    const r = await fetch(`/api/challenges/${params.id}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceUrl }),
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur.");
    else setMsg("Défi réussi — gains distribués.");
    load();
  }

  async function checkStrava() {
    setMsg("Vérification via Strava…");
    const r = await fetch(`/api/challenges/${params.id}/check-strava`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur.");
    else setMsg(j.satisfied ? "Défi vérifié et validé via Strava ✓" : "Pas d'activité Strava correspondante encore.");
    load();
  }

  if (!c) return <p className="text-white/60">Chargement…</p>;
  const isOwner = session?.user?.id === c.ownerId;
  const canBet = c.status === "OPEN" && session?.user && !isOwner;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs text-white/60">par {c.owner.displayName} · VDOT {c.owner.profile?.vdot.toFixed(1) ?? "—"}</div>
        <h1 className="text-2xl font-bold">{c.description}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="chip">{c.status}</span>
          <span className="chip">Deadline {new Date(c.deadline).toLocaleString("fr-FR")}</span>
          <span className="chip">Proba estimée {(c.probSuccess * 100).toFixed(0)} %</span>
          <span className="chip">Mise du créateur : {c.ownerStake} 🪙</span>
        </div>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-emerald-300">Réussit</div>
          <div className="text-3xl font-bold">{(c.oddsYesX100 / 100).toFixed(2)}</div>
          <div className="text-xs text-white/40">Pool : {c.yesPool} 🪙</div>
          {canBet && (
            <button className="btn-primary w-full mt-3" onClick={() => placeBet("YES")}>Parier POUR</button>
          )}
        </div>
        <div className="card">
          <div className="text-xs text-red-300">Échoue</div>
          <div className="text-3xl font-bold">{(c.oddsNoX100 / 100).toFixed(2)}</div>
          <div className="text-xs text-white/40">Pool : {c.noPool} 🪙</div>
          {canBet && (
            <button className="btn-primary w-full mt-3" onClick={() => placeBet("NO")}>Parier CONTRE</button>
          )}
        </div>
      </div>

      {canBet && (
        <div className="card flex items-center gap-3">
          <span className="text-sm text-white/70">Mise :</span>
          <input className="input flex-1" type="number" min={10} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
        </div>
      )}

      {isOwner && c.status === "OPEN" && (
        <div className="card space-y-3">
          <h3 className="font-bold">Soumettre la preuve</h3>
          <p className="text-sm text-white/70">
            Colle un lien Strava ou une URL de capture, ou laisse RunnerBet
            vérifier automatiquement via Strava.
          </p>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="https://www.strava.com/activities/…"
              value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
            <button className="btn-primary" onClick={submitProof}>Valider</button>
          </div>
          <button className="btn-ghost" onClick={checkStrava}>Vérifier via Strava (auto)</button>
        </div>
      )}

      <div className="card">
        <h3 className="font-bold mb-3">Paris ({c.bets.length})</h3>
        {c.bets.length === 0 && <p className="text-white/60 text-sm">Aucun pari extérieur encore.</p>}
        <div className="space-y-1">
          {c.bets.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-1.5">
              <span>
                {b.bettor.displayName}
                {b.isOwner && <span className="ml-2 text-amber-300 text-xs">(créateur)</span>}
              </span>
              <span>
                <span className={b.side === "YES" ? "text-emerald-300" : "text-red-300"}>{b.side}</span>
                {" "}· {b.stake} 🪙 @ {(b.oddsX100 / 100).toFixed(2)}
                <span className="text-white/40 ml-2">{b.status}{b.payout > 0 ? ` +${b.payout}` : ""}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {c.evidenceUrl && (
        <a className="text-xs text-accent" href={c.evidenceUrl} target="_blank">📎 voir la preuve</a>
      )}
    </div>
  );
}
