"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { oddsFromInt } from "@/lib/odds";

type Bet = {
  id: string; raceId: string; pickedId: string; runnerAId: string; runnerBId: string;
  stake: number; oddsX100: number; status: string; payout: number; createdAt: string;
  race: { name: string; distanceM: number; scheduledAt: string };
};

export default function BetsPage() {
  const { status } = useSession();
  const [bets, setBets] = useState<Bet[]>([]);
  useEffect(() => {
    if (status === "authenticated") fetch("/api/bets").then((r) => r.json()).then(setBets);
  }, [status]);

  if (status !== "authenticated") return <p className="text-white/60">Connecte-toi pour voir tes paris.</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Mes paris</h1>
      {bets.length === 0 && <p className="text-white/60">Tu n'as encore parié sur rien.</p>}
      {bets.map((b) => (
        <Link key={b.id} href={`/races/${b.raceId}`} className="card flex items-center justify-between hover:border-accent/40">
          <div>
            <div className="font-semibold">{b.race.name}</div>
            <div className="text-xs text-white/60">{new Date(b.race.scheduledAt).toLocaleString("fr-FR")}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-mono">{b.stake} 🪙 @ {oddsFromInt(b.oddsX100).toFixed(2)}</div>
            <div className={
              b.status === "WON" ? "text-emerald-300"
              : b.status === "LOST" ? "text-red-300"
              : b.status === "VOID" ? "text-white/60" : "text-amber-300"
            }>
              {b.status} {b.payout > 0 && `+${b.payout}`}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
