"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Detail = {
  id: string; kind: string; description: string;
  status: string; deadline: string; pot: number; stakePerSide: number;
  confidence: number; oddsChallengerX100: number; oddsOpponentX100: number;
  maxBetStake: number; targetDistanceM: number | null;
  challenger: { id: string; displayName: string; profile: { vdot: number } | null };
  opponent: { id: string; displayName: string; profile: { vdot: number } | null };
  challengerResult: number | null; opponentResult: number | null;
  challengerEvidence: string | null; opponentEvidence: string | null;
  challengerPool: number; opponentPool: number;
  bets: Array<{
    id: string; pickedId: string; stake: number; oddsX100: number; status: string;
    payout: number; bettor: { id: string; displayName: string };
  }>;
};

export default function DuelDetail() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [d, setD] = useState<Detail | null>(null);
  const [stake, setStake] = useState(50);
  const [result, setResult] = useState("");
  const [evidence, setEvidence] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/duels/${params.id}`).then((r) => r.json());
    setD(r);
  }
  useEffect(() => { load(); }, [params.id]);

  async function accept() {
    const r = await fetch(`/api/duels/${params.id}/accept`, { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Duel accepté." : j.error);
    load();
  }
  async function decline() {
    const r = await fetch(`/api/duels/${params.id}/decline`, { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Duel annulé, mise rendue." : j.error);
    load();
  }
  async function placeBet(pickedId: string) {
    const r = await fetch(`/api/duels/${params.id}/bet`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickedId, stake }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Pari placé pour ${stake} 🪙.` : j.error);
    load();
  }
  async function submitResult() {
    const n = Number(result);
    if (!n || !evidence) return setMsg("Résultat + preuve requis.");
    const r = await fetch(`/api/duels/${params.id}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: n, evidenceUrl: evidence }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Résultat soumis." : j.error);
    load();
  }

  if (!d) return <p className="text-white/60">Chargement…</p>;
  const isChallenger = session?.user?.id === d.challenger.id;
  const isOpponent = session?.user?.id === d.opponent.id;
  const isDuelist = isChallenger || isOpponent;
  const canBet = d.status === "OPEN" && session?.user && !isDuelist;

  const resultUnit = d.kind === "FASTEST_TIME" ? "secondes" : "mètres";

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs text-white/60">{d.description}</div>
        <h1 className="text-2xl font-bold mt-1">
          {d.challenger.displayName} <span className="text-white/40 text-base">vs</span> {d.opponent.displayName}
        </h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="chip">{d.status}</span>
          <span className="chip">Pot : {d.pot} 🪙 ({d.stakePerSide} × 2)</span>
          <span className="chip">Deadline {new Date(d.deadline).toLocaleString("fr-FR")}</span>
          <span className={`chip ${d.confidence >= 0.7 ? "text-emerald-300" : d.confidence >= 0.4 ? "text-amber-300" : "text-red-300"}`}>
            🛡️ Confiance {Math.round(d.confidence * 100)} %
          </span>
          <span className="chip">Plafond mise spectateur : {d.maxBetStake} 🪙</span>
        </div>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      {d.status === "PROPOSED" && isOpponent && (
        <div className="card flex gap-2">
          <button className="btn-primary flex-1" onClick={accept}>Accepter ({d.stakePerSide} 🪙)</button>
          <button className="btn-ghost flex-1" onClick={decline}>Refuser</button>
        </div>
      )}
      {d.status === "PROPOSED" && isChallenger && (
        <div className="card text-sm">En attente d'acceptation par {d.opponent.displayName}.</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-xs text-cyan-300">{d.challenger.displayName}</div>
          <div className="text-3xl font-bold">{(d.oddsChallengerX100 / 100).toFixed(2)}</div>
          <div className="text-xs text-white/40">Pool : {d.challengerPool} 🪙</div>
          {d.challengerResult != null && (
            <div className="text-xs text-emerald-300 mt-2">Résultat : {d.challengerResult} {resultUnit}</div>
          )}
          {canBet && (
            <button className="btn-primary w-full mt-3" onClick={() => placeBet(d.challenger.id)}>Parier sur lui</button>
          )}
        </div>
        <div className="card text-center">
          <div className="text-xs text-purple-300">{d.opponent.displayName}</div>
          <div className="text-3xl font-bold">{(d.oddsOpponentX100 / 100).toFixed(2)}</div>
          <div className="text-xs text-white/40">Pool : {d.opponentPool} 🪙</div>
          {d.opponentResult != null && (
            <div className="text-xs text-emerald-300 mt-2">Résultat : {d.opponentResult} {resultUnit}</div>
          )}
          {canBet && (
            <button className="btn-primary w-full mt-3" onClick={() => placeBet(d.opponent.id)}>Parier sur lui</button>
          )}
        </div>
      </div>

      {canBet && (
        <div className="card flex items-center gap-2">
          <span className="text-sm">Mise (max {d.maxBetStake}) :</span>
          <input className="input flex-1" type="number" min={10} max={d.maxBetStake} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
        </div>
      )}

      {d.status === "OPEN" && isDuelist && (
        <div className="card space-y-3">
          <h3 className="font-bold">Soumettre ton résultat</h3>
          <p className="text-sm text-white/70">
            Saisis {d.kind === "FASTEST_TIME" ? "le chrono en secondes" : "la distance en mètres"}
            {" + un lien Strava vers l'activité."}
          </p>
          <input className="input" type="number" placeholder={resultUnit} value={result} onChange={(e) => setResult(e.target.value)} />
          <input className="input" placeholder="https://strava.com/activities/…" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
          <button className="btn-primary w-full" onClick={submitResult}>Soumettre</button>
        </div>
      )}

      <div className="card">
        <h3 className="font-bold mb-3">Paris ({d.bets.length})</h3>
        {d.bets.length === 0 && <p className="text-white/60 text-sm">Aucun pari spectateur.</p>}
        <div className="space-y-1">
          {d.bets.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-1.5">
              <span>{b.bettor.displayName}</span>
              <span>
                <span className={b.pickedId === d.challenger.id ? "text-cyan-300" : "text-purple-300"}>
                  {b.pickedId === d.challenger.id ? d.challenger.displayName : d.opponent.displayName}
                </span>
                {" "}· {b.stake} 🪙 @ {(b.oddsX100 / 100).toFixed(2)}
                <span className="text-white/40 ml-2">{b.status}{b.payout > 0 ? ` +${b.payout}` : ""}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
