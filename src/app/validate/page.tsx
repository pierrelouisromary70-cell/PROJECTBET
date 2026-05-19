"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatTime } from "@/lib/vdot";

type PR = {
  id: string; userId: string; distanceM: number; timeSec: number; raceDate: string;
  source: string; evidenceUrl?: string | null; status: string;
  user: { id: string; displayName: string; profile: { vdot: number } | null };
  votes: Array<{ approve: boolean; voterId: string }>;
};

export default function ValidatePage() {
  const { data: session } = useSession();
  const [prs, setPrs] = useState<PR[]>([]);
  async function load() {
    const r = await fetch("/api/pr/pending").then((r) => r.json());
    setPrs(r);
  }
  useEffect(() => { load(); }, []);

  async function vote(id: string, approve: boolean) {
    await fetch(`/api/pr/${id}/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Validation communautaire</h1>
        <p className="text-white/70 text-sm">3 votes net pour valider ou rejeter un chrono.</p>
      </div>
      {prs.length === 0 && <p className="text-white/60">Aucun chrono en attente — bravo à la communauté.</p>}
      <div className="grid md:grid-cols-2 gap-3">
        {prs.map((pr) => {
          const score = pr.votes.reduce((a, v) => a + (v.approve ? 1 : -1), 0);
          const myVote = session?.user?.id ? pr.votes.find((v) => v.voterId === session.user!.id) : undefined;
          const isMine = session?.user?.id === pr.userId;
          return (
            <div key={pr.id} className="card">
              <div className="flex items-center justify-between">
                <div className="font-bold">{pr.user.displayName}</div>
                <span className="chip">score {score}</span>
              </div>
              <div className="text-sm mt-2">
                <div>{pr.distanceM} m en <span className="font-mono">{formatTime(pr.timeSec)}</span></div>
                <div className="text-white/60 text-xs">{new Date(pr.raceDate).toLocaleDateString("fr-FR")} · source {pr.source}</div>
                {pr.evidenceUrl
                  ? <a className="text-accent text-xs" href={pr.evidenceUrl} target="_blank">📎 voir preuve</a>
                  : <div className="text-amber-300 text-xs">⚠️ aucune preuve fournie</div>}
              </div>
              {!isMine && (
                <div className="flex gap-2 mt-3">
                  <button className={`btn-ghost flex-1 ${myVote?.approve ? "border-emerald-400" : ""}`} onClick={() => vote(pr.id, true)}>✅ Crédible</button>
                  <button className={`btn-ghost flex-1 ${myVote && !myVote.approve ? "border-red-400" : ""}`} onClick={() => vote(pr.id, false)}>❌ Douteux</button>
                </div>
              )}
              {isMine && <div className="text-xs text-white/50 mt-2">Tu ne peux pas voter ton propre chrono.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
