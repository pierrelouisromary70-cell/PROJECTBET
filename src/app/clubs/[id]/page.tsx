"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type WarRef = { id: string; status: string; startAt: string; endAt: string; scoreA: number; scoreB: number; pot: number; stakePerSide: number; clubA?: { name: string; tag: string }; clubB?: { name: string; tag: string } };
type Club = {
  id: string; name: string; tag: string; emoji: string; description?: string | null;
  treasury: number; joinPolicy: string; captainId: string;
  captain: { id: string; displayName: string };
  members: Array<{ id: string; role: string; warPoints: number; user: { id: string; displayName: string; profile: { vdot: number } | null } }>;
  warsAttack: WarRef[];
  warsDefend: WarRef[];
};

export default function ClubDetail() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [club, setClub] = useState<Club | null>(null);
  const [donate, setDonate] = useState(100);
  const [warStake, setWarStake] = useState(1000);
  const [warOpponent, setWarOpponent] = useState("");
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; tag: string }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/clubs/${params.id}`).then((r) => r.json());
    setClub(r);
    const c = await fetch("/api/clubs").then((r) => r.json());
    setClubs(c.filter((cc: { id: string }) => cc.id !== params.id));
  }
  useEffect(() => { load(); }, [params.id]);

  async function join() {
    const r = await fetch(`/api/clubs/${params.id}/join`, { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Bienvenue !" : j.error);
    load();
  }
  async function leave() {
    const r = await fetch(`/api/clubs/${params.id}/leave`, { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Tu as quitté le club." : j.error);
    load();
  }
  async function makeDonation() {
    const r = await fetch(`/api/clubs/${params.id}/donate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: donate }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Don de ${donate} 🪙 effectué.` : j.error);
    load();
  }
  async function declareWar() {
    if (!warOpponent) return setMsg("Sélectionne un club adverse.");
    const r = await fetch(`/api/wars`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentClubId: warOpponent, stakePerSide: warStake, durationDays: 7 }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Guerre déclarée." : j.error);
    load();
  }
  async function warAct(warId: string, action: "accept" | "decline") {
    const r = await fetch(`/api/wars/${warId}/${action}`, { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "OK." : j.error);
    load();
  }

  if (!club) return <p className="text-white/60">Chargement…</p>;
  const myMembership = club.members.find((m) => m.user.id === session?.user?.id);
  const amCaptain = myMembership?.role === "CAPTAIN";
  const allWars = [...club.warsAttack.map((w) => ({ ...w, side: "A" as const })), ...club.warsDefend.map((w) => ({ ...w, side: "B" as const }))];

  return (
    <div className="space-y-4">
      <div className="card flex items-start gap-4">
        <div className="text-5xl">{club.emoji}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{club.name} <span className="text-white/40 text-base">[{club.tag}]</span></h1>
          <p className="text-sm text-white/70 mt-1">{club.description}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-sm">
            <span className="chip">capitaine : {club.captain.displayName}</span>
            <span className="chip">{club.members.length} membre(s)</span>
            <span className="chip">Trésor : {club.treasury.toLocaleString("fr-FR")} 🪙</span>
            <span className="chip">{club.joinPolicy === "OPEN" ? "Ouvert" : "Sur invitation"}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {!myMembership && session?.user && (
            <button className="btn-primary" onClick={join}>Rejoindre</button>
          )}
          {myMembership && !amCaptain && (
            <button className="btn-ghost" onClick={leave}>Quitter</button>
          )}
        </div>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      {myMembership && (
        <div className="card flex items-center gap-2">
          <span className="text-sm">Donner au trésor :</span>
          <input className="input flex-1" type="number" min={10} value={donate} onChange={(e) => setDonate(Number(e.target.value))} />
          <button className="btn-primary" onClick={makeDonation}>Donner</button>
        </div>
      )}

      {amCaptain && allWars.length === 0 && (
        <div className="card space-y-2">
          <h3 className="font-bold">⚔️ Déclarer une guerre</h3>
          <p className="text-sm text-white/70">Les deux clubs misent depuis leur trésor. 7 jours pour cumuler le plus de points.</p>
          <div className="grid md:grid-cols-2 gap-2">
            <select className="input" value={warOpponent} onChange={(e) => setWarOpponent(e.target.value)}>
              <option value="">— Club adverse —</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} [{c.tag}]</option>)}
            </select>
            <input className="input" type="number" min={500} step={100} value={warStake} onChange={(e) => setWarStake(Number(e.target.value))} placeholder="Mise (chaque club)" />
          </div>
          <button className="btn-gold w-full" onClick={declareWar}>Déclarer la guerre</button>
        </div>
      )}

      {allWars.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-bold">⚔️ Guerre{allWars.length > 1 ? "s" : ""} en cours</h3>
          {allWars.map((w) => {
            const isDefender = w.side === "B" && w.status === "PROPOSED";
            const opponent = w.side === "A" ? w.clubB : w.clubA;
            const ourScore = w.side === "A" ? w.scoreA : w.scoreB;
            const theirScore = w.side === "A" ? w.scoreB : w.scoreA;
            return (
              <div key={w.id} className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">vs {opponent?.name} [{opponent?.tag}]</div>
                  <span className="chip">{w.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div className="bg-emerald-300/5 rounded-lg px-3 py-1.5">Nous : <span className="font-bold">{ourScore}</span> pts</div>
                  <div className="bg-red-300/5 rounded-lg px-3 py-1.5">Eux : <span className="font-bold">{theirScore}</span> pts</div>
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Pot {w.pot} 🪙 · fin {new Date(w.endAt).toLocaleString("fr-FR")}
                </div>
                {isDefender && amCaptain && (
                  <div className="flex gap-2 mt-2">
                    <button className="btn-primary flex-1" onClick={() => warAct(w.id, "accept")}>Accepter ({w.stakePerSide} 🪙)</button>
                    <button className="btn-ghost flex-1" onClick={() => warAct(w.id, "decline")}>Refuser</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h3 className="font-bold mb-3">Membres ({club.members.length})</h3>
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr><th className="text-left">Pseudo</th><th className="text-left">Rôle</th><th className="text-left">VDOT</th><th className="text-right">Pts guerre</th></tr>
          </thead>
          <tbody>
            {club.members.map((m) => (
              <tr key={m.id} className="border-t border-white/5">
                <td className="py-1">{m.user.displayName}</td>
                <td>{m.role === "CAPTAIN" ? "👑 Capitaine" : m.role === "OFFICER" ? "⭐ Officier" : "Membre"}</td>
                <td>{m.user.profile?.vdot.toFixed(1) ?? "—"}</td>
                <td className="text-right font-mono">{m.warPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
