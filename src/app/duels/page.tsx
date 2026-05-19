"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { STANDARD_DISTANCES } from "@/lib/vdot";

type Duel = {
  id: string; kind: string; targetDistanceM: number | null;
  deadline: string; status: string; stakePerSide: number; pot: number;
  confidence: number; oddsChallengerX100: number; oddsOpponentX100: number;
  challenger: { id: string; displayName: string; profile: { vdot: number } | null };
  opponent: { id: string; displayName: string; profile: { vdot: number } | null };
  _count: { bets: number };
};

const KIND_LABEL: Record<string, string> = {
  FASTEST_TIME: "Chrono",
  LONG_RUN: "Sortie longue",
  VOLUME: "Volume",
};

export default function DuelsPage() {
  const { status, data: session } = useSession();
  const [items, setItems] = useState<Duel[]>([]);
  const [scope, setScope] = useState<"open" | "mine">("open");
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; displayName: string }>>([]);

  async function load() {
    const r = await fetch(`/api/duels?scope=${scope}`).then((r) => r.json());
    setItems(r);
    const u = await fetch("/api/users").then((r) => r.json());
    setUsers(u);
  }
  useEffect(() => { load(); }, [scope]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Duels 1v1</h1>
        {status === "authenticated" && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "+ Lancer un duel"}
          </button>
        )}
      </div>
      <p className="text-white/70 text-sm">
        Défie un autre coureur sur une métrique commune (chrono, sortie longue,
        volume). Les deux mises sont bloquées, le gagnant rafle le pot (vig 7 %).
        Les spectateurs parient en plus.
      </p>

      <div className="flex gap-2">
        {(["open", "mine"] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)} className={`chip ${scope === s ? "border-accent" : ""}`}>
            {s === "open" ? "Tous ouverts" : "Mes duels"}
          </button>
        ))}
      </div>

      {creating && session?.user && <CreateDuel users={users.filter((u) => u.id !== session.user!.id)} onDone={() => { setCreating(false); load(); }} />}

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((d) => (
          <Link key={d.id} href={`/duels/${d.id}`} className="card hover:border-accent/40">
            <div className="text-xs text-white/60 mb-1">{KIND_LABEL[d.kind]}{d.targetDistanceM ? ` · ${(d.targetDistanceM / 1000).toFixed(0)} km` : ""}</div>
            <div className="flex items-center justify-between font-semibold">
              <span>{d.challenger.displayName}</span>
              <span className="text-white/40 text-xs">vs</span>
              <span>{d.opponent.displayName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div className="bg-cyan-300/5 border border-cyan-300/20 rounded-xl px-3 py-2 text-center">
                <div className="text-xs text-cyan-300">{d.challenger.displayName}</div>
                <div className="font-bold">{(d.oddsChallengerX100 / 100).toFixed(2)}</div>
              </div>
              <div className="bg-purple-300/5 border border-purple-300/20 rounded-xl px-3 py-2 text-center">
                <div className="text-xs text-purple-300">{d.opponent.displayName}</div>
                <div className="font-bold">{(d.oddsOpponentX100 / 100).toFixed(2)}</div>
              </div>
            </div>
            <div className="text-xs text-white/40 mt-2 flex items-center gap-2 flex-wrap">
              <span className="chip">{d.status}</span>
              <span>Pot : {d.pot} 🪙</span>
              <span>· {d._count.bets} pari(s)</span>
              <span className={`chip ${d.confidence >= 0.7 ? "text-emerald-300" : d.confidence >= 0.4 ? "text-amber-300" : "text-red-300"}`}>
                🛡️ {Math.round(d.confidence * 100)} %
              </span>
            </div>
          </Link>
        ))}
        {items.length === 0 && <p className="text-white/60 text-sm">Aucun duel.</p>}
      </div>
    </div>
  );
}

function CreateDuel({ users, onDone }: { users: Array<{ id: string; displayName: string }>; onDone: () => void }) {
  const [opponentId, setOpponentId] = useState("");
  const [kind, setKind] = useState<"FASTEST_TIME" | "LONG_RUN" | "VOLUME">("FASTEST_TIME");
  const [distance, setDistance] = useState(10000);
  const [stake, setStake] = useState(200);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!opponentId) { setErr("Choisis un adversaire."); return; }
    const r = await fetch("/api/duels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opponentId, kind,
        targetDistanceM: kind === "VOLUME" ? undefined : distance,
        deadline: new Date(deadline).toISOString(),
        stakePerSide: stake,
      }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(typeof j.error === "string" ? j.error : "Erreur."); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Adversaire</label>
          <select className="input" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
            <option value="">— Choisir —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "FASTEST_TIME" | "LONG_RUN" | "VOLUME")}>
            <option value="FASTEST_TIME">Meilleur chrono sur D km</option>
            <option value="LONG_RUN">Sortie la plus longue</option>
            <option value="VOLUME">Plus de km cumulés</option>
          </select>
        </div>
      </div>
      {kind !== "VOLUME" && (
        <div>
          <label className="label">Distance</label>
          <select className="input" value={distance} onChange={(e) => setDistance(Number(e.target.value))}>
            {STANDARD_DISTANCES.map((d) => <option key={d.m} value={d.m}>{d.label}</option>)}
          </select>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Mise (chacun)</label>
          <input className="input" type="number" min={50} max={10000} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Deadline</label>
          <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button className="btn-primary w-full" type="submit">Proposer le duel</button>
    </form>
  );
}
