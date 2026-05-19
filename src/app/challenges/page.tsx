"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { parseTimeToSec, STANDARD_DISTANCES } from "@/lib/vdot";

type Challenge = {
  id: string; kind: string; description: string;
  ownerId: string; owner: { displayName: string; profile: { vdot: number } | null };
  startAt: string; deadline: string; status: string;
  probSuccess: number; probRaw: number; confidence: number;
  oddsYesX100: number; oddsNoX100: number; maxBetStake: number;
  ownerStake: number; yesPool: number; noPool: number;
  _count: { bets: number };
};

type Eligibility =
  | { eligible: true; confidence: number; prAgeDays: number; maxOwnerStake: number; hasStrava: boolean }
  | { eligible: false; reason: string; confidence?: number };

const KIND_LABELS: Record<string, string> = {
  TIME: "Chrono cible", LONG_RUN: "Sortie longue", VOLUME: "Volume", STREAK: "Streak",
};

function countdown(d: string) {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "expiré";
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `${Math.floor(h / 24)}j ${h % 24}h`;
  if (h >= 1) return `${h}h${String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0")}`;
  return `${Math.floor(ms / 60000)} min`;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "text-emerald-300"
    : value >= 0.4 ? "text-amber-300"
    : "text-red-300";
  return <span className={`chip ${color}`} title="Fiabilité des données du coureur">🛡️ {pct} %</span>;
}

export default function ChallengesPage() {
  const { status } = useSession();
  const [items, setItems] = useState<Challenge[]>([]);
  const [scope, setScope] = useState<"open" | "mine" | "all">("open");
  const [creating, setCreating] = useState(false);
  const [elig, setElig] = useState<Eligibility | null>(null);

  async function load() {
    const r = await fetch(`/api/challenges?scope=${scope}`).then((r) => r.json());
    setItems(r);
    if (status === "authenticated") {
      const e = await fetch("/api/challenges/eligibility").then((r) => r.json());
      setElig(e);
    }
  }
  useEffect(() => { load(); }, [scope, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Défis quotidiens</h1>
        {status === "authenticated" && elig?.eligible && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "+ Créer un défi"}
          </button>
        )}
      </div>
      <p className="text-white/70 text-sm">
        Tu ne cours pas une compétition tous les week-ends ? Lance un défi sur toi-même.
        Les cotes sont calibrées par ton VDOT et un score de confiance dans tes données.
      </p>

      {status === "authenticated" && elig && !elig.eligible && (
        <div className="card border-amber-300/40 bg-amber-300/5">
          <h3 className="font-bold">🛡️ Tu ne peux pas créer de défi pour le moment</h3>
          <p className="text-sm text-white/80 mt-1">{elig.reason}</p>
        </div>
      )}

      <div className="flex gap-2">
        {(["open", "mine", "all"] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`chip ${scope === s ? "border-accent" : ""}`}>
            {s === "open" ? "Ouverts" : s === "mine" ? "Mes défis" : "Tous"}
          </button>
        ))}
      </div>

      {creating && elig?.eligible && <CreateForm elig={elig} onDone={() => { setCreating(false); load(); }} />}

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((c) => (
          <Link key={c.id} href={`/challenges/${c.id}`} className="card hover:border-accent/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/60">{KIND_LABELS[c.kind] ?? c.kind} · {c.owner.displayName}</div>
                <h3 className="font-bold mt-1">{c.description}</h3>
              </div>
              <span className="chip">{c.status === "OPEN" ? "⏳ " + countdown(c.deadline) : c.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-emerald-300/5 border border-emerald-300/20 rounded-xl px-3 py-2">
                <div className="text-xs text-emerald-300">Réussit</div>
                <div className="font-bold">{(c.oddsYesX100 / 100).toFixed(2)}</div>
                <div className="text-xs text-white/40">Pool {c.yesPool} 🪙</div>
              </div>
              <div className="bg-red-300/5 border border-red-300/20 rounded-xl px-3 py-2">
                <div className="text-xs text-red-300">Échoue</div>
                <div className="font-bold">{(c.oddsNoX100 / 100).toFixed(2)}</div>
                <div className="text-xs text-white/40">Pool {c.noPool} 🪙</div>
              </div>
            </div>
            <div className="text-xs text-white/40 mt-2 flex items-center gap-2 flex-wrap">
              <span>{c._count.bets} pari(s)</span>
              <span>· proba {(c.probSuccess * 100).toFixed(0)} %</span>
              <ConfidenceBadge value={c.confidence} />
              <span>· plafond/parieur {c.maxBetStake} 🪙</span>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-white/60 text-sm">Aucun défi pour le moment.</p>
        )}
      </div>
    </div>
  );
}

function CreateForm({
  elig,
  onDone,
}: {
  elig: { eligible: true; confidence: number; prAgeDays: number; maxOwnerStake: number; hasStrava: boolean };
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"TIME" | "LONG_RUN" | "VOLUME" | "STREAK">("TIME");
  const [distance, setDistance] = useState(10000);
  const [time, setTime] = useState("");
  const [totalKm, setTotalKm] = useState(50);
  const [days, setDays] = useState(7);
  const [streak, setStreak] = useState(5);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 48 * 3600 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [stake, setStake] = useState(Math.min(50, elig.maxOwnerStake));
  const [err, setErr] = useState<string | null>(null);

  const requiresStrava = kind === "VOLUME" || kind === "STREAK";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (stake > elig.maxOwnerStake) {
      setErr(`Mise plafonnée à ${elig.maxOwnerStake} 🪙 (confiance ${(elig.confidence * 100).toFixed(0)} %).`);
      return;
    }
    const body: Record<string, unknown> = {
      kind, deadline: new Date(deadline).toISOString(), ownerStake: stake,
    };
    if (kind === "TIME") {
      const sec = parseTimeToSec(time);
      if (!sec) { setErr("Chrono invalide."); return; }
      body.targetDistanceM = distance; body.targetTimeSec = sec;
    }
    if (kind === "LONG_RUN") body.targetDistanceM = distance;
    if (kind === "VOLUME") { body.targetTotalKm = totalKm; body.targetDays = days; }
    if (kind === "STREAK") body.targetDays = streak;

    const r = await fetch("/api/challenges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) { setErr(typeof j.error === "string" ? j.error : "Erreur."); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="chip text-emerald-300">🛡️ Confiance {(elig.confidence * 100).toFixed(0)} %</span>
        <span className="chip">PR le plus récent : {elig.prAgeDays} jour(s)</span>
        <span className="chip">Plafond mise : {elig.maxOwnerStake} 🪙</span>
        {!elig.hasStrava && <span className="chip text-amber-300">Strava non connecté</span>}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Type de défi</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "TIME" | "LONG_RUN" | "VOLUME" | "STREAK")}>
            <option value="TIME">Chrono cible (D km sous T)</option>
            <option value="LONG_RUN">Sortie longue (1 run ≥ D km)</option>
            <option value="VOLUME">Volume (X km en N jours) — Strava requis</option>
            <option value="STREAK">Streak (N jours d'affilée) — Strava requis</option>
          </select>
        </div>
        <div>
          <label className="label">Deadline</label>
          <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>

      {requiresStrava && !elig.hasStrava && (
        <div className="text-sm text-amber-300">
          Les défis {kind} exigent Strava pour un arbitrage fiable. Connecte ton compte avant.
        </div>
      )}

      {kind === "TIME" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Distance</label>
            <select className="input" value={distance} onChange={(e) => setDistance(Number(e.target.value))}>
              {STANDARD_DISTANCES.map((d) => <option key={d.m} value={d.m}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Chrono cible</label>
            <input className="input" placeholder="50:00" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      )}
      {kind === "LONG_RUN" && (
        <div>
          <label className="label">Distance minimum (mètres)</label>
          <input className="input" type="number" min={3000} step={500} value={distance}
            onChange={(e) => setDistance(Number(e.target.value))} />
        </div>
      )}
      {kind === "VOLUME" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Total km</label>
            <input className="input" type="number" min={5} value={totalKm} onChange={(e) => setTotalKm(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Sur N jours</label>
            <input className="input" type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
        </div>
      )}
      {kind === "STREAK" && (
        <div>
          <label className="label">Jours consécutifs</label>
          <input className="input" type="number" min={2} max={14} value={streak} onChange={(e) => setStreak(Number(e.target.value))} />
        </div>
      )}

      <div>
        <label className="label">Ta mise (max {elig.maxOwnerStake} 🪙)</label>
        <input className="input" type="number" min={10} max={elig.maxOwnerStake}
          value={stake} onChange={(e) => setStake(Number(e.target.value))} />
        <p className="text-xs text-white/50 mt-1">
          Le moteur refusera les cibles trop faciles (p &gt; 85 %) ou quasi impossibles (p &lt; 10 %).
        </p>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button className="btn-primary w-full" type="submit" disabled={requiresStrava && !elig.hasStrava}>
        Créer le défi
      </button>
    </form>
  );
}
