"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { formatTime, STANDARD_DISTANCES } from "@/lib/vdot";

type Odds = {
  race: { id: string; name: string; distanceM: number; scheduledAt: string; status: string };
  runners: Array<{ id: string; name: string; vdot: number; trustScore: number; prAgeDays: number }>;
  matchups: Array<{
    aId: string; bId: string; aName: string; bName: string;
    oddsA: number; oddsB: number; probA: number; probB: number;
    predictedTimeA: number; predictedTimeB: number; confidence: number;
  }>;
};

export default function RaceDetail() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [data, setData] = useState<Odds | null>(null);
  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/races/${params.id}/odds`).then((x) => x.json());
    setData(r);
  }
  useEffect(() => { load(); }, [params.id]);

  async function placeBet(m: Odds["matchups"][number], pickedId: string) {
    const key = `${m.aId}_${m.bId}_${pickedId}`;
    const stake = stakes[key] ?? 50;
    const r = await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raceId: params.id, runnerAId: m.aId, runnerBId: m.bId, pickedId, stake }),
    });
    const j = await r.json();
    if (!r.ok) setMsg(typeof j.error === "string" ? j.error : "Erreur pari.");
    else setMsg(`Pari placé à la cote ${j.oddsAtTime.toFixed(2)}. Gain potentiel : ${Math.floor(stake * j.oddsAtTime)} 🪙`);
  }

  async function settle() {
    if (!data) return;
    const list = data.runners.map((r) => ({
      runnerId: r.id,
      finishSec: Number(results[r.id]),
    })).filter((r) => r.finishSec > 0);
    if (list.length !== data.runners.length) return alert("Saisis le chrono de chaque coureur.");
    const r = await fetch(`/api/races/${params.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: list }),
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur règlement.");
    else { setMsg("Course réglée — gains distribués."); load(); }
  }

  if (!data) return <p className="text-white/60">Chargement…</p>;
  const { race, matchups } = data;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold">{race.name}</h1>
        <div className="text-white/70 text-sm mt-1">
          {STANDARD_DISTANCES.find((d) => d.m === race.distanceM)?.label ?? race.distanceM + " m"} •
          {" "}{new Date(race.scheduledAt).toLocaleString("fr-FR")} •
          {" "}<span className="chip">{race.status}</span>
        </div>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      <h2 className="text-xl font-bold">Duels & cotes</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {matchups.map((m) => {
          const keyA = `${m.aId}_${m.bId}_${m.aId}`;
          const keyB = `${m.aId}_${m.bId}_${m.bId}`;
          return (
            <div key={`${m.aId}_${m.bId}`} className="card">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-bold">{m.aName}</div>
                  <div className="text-white/60">prédiction {formatTime(m.predictedTimeA)} · {(m.probA * 100).toFixed(0)} %</div>
                </div>
                <div className="text-white/40 text-xs">vs</div>
                <div className="text-right">
                  <div className="font-bold">{m.bName}</div>
                  <div className="text-white/60">prédiction {formatTime(m.predictedTimeB)} · {(m.probB * 100).toFixed(0)} %</div>
                </div>
              </div>
              <div className="text-xs text-white/40 mt-1">Confiance des données : {(m.confidence * 100).toFixed(0)} %</div>

              {race.status === "OPEN" && session?.user && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-black/30 rounded-xl p-3">
                    <div className="text-xs text-white/60">Sur {m.aName}</div>
                    <div className="text-2xl font-bold text-accent">{m.oddsA.toFixed(2)}</div>
                    <input className="input mt-2" type="number" min={10} placeholder="Mise"
                      value={stakes[keyA] ?? ""}
                      onChange={(e) => setStakes((s) => ({ ...s, [keyA]: Number(e.target.value) }))} />
                    <button className="btn-primary w-full mt-2" onClick={() => placeBet(m, m.aId)}>Parier</button>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3">
                    <div className="text-xs text-white/60">Sur {m.bName}</div>
                    <div className="text-2xl font-bold text-accent">{m.oddsB.toFixed(2)}</div>
                    <input className="input mt-2" type="number" min={10} placeholder="Mise"
                      value={stakes[keyB] ?? ""}
                      onChange={(e) => setStakes((s) => ({ ...s, [keyB]: Number(e.target.value) }))} />
                    <button className="btn-primary w-full mt-2" onClick={() => placeBet(m, m.bId)}>Parier</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {session?.user && race.status !== "SETTLED" && (
        <div className="card">
          <h3 className="font-bold">Clôturer la course (créateur uniquement)</h3>
          <p className="text-white/70 text-sm mt-1">Saisis le chrono final de chaque coureur pour distribuer les gains.</p>
          <div className="grid md:grid-cols-2 gap-2 mt-3">
            {data.runners.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="w-1/2 text-sm">{r.name}</span>
                <input className="input" placeholder="secondes (ex 2142)" type="number"
                  value={results[r.id] ?? ""} onChange={(e) => setResults((s) => ({ ...s, [r.id]: e.target.value }))} />
              </div>
            ))}
          </div>
          <button className="btn-gold mt-3" onClick={settle}>Distribuer les gains</button>
        </div>
      )}
    </div>
  );
}
