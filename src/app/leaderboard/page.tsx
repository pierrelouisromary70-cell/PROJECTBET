"use client";
import { useEffect, useState } from "react";

type Row = { id: string; displayName: string; tokens?: number; vdot?: number; total?: number; won?: number; rate?: number };

const TABS = [
  { key: "tokens", label: "Jetons" },
  { key: "vdot", label: "VDOT" },
  { key: "winrate", label: "Taux de paris gagnés" },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState("tokens");
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    fetch(`/api/leaderboard?type=${tab}`).then((r) => r.json()).then((j) => setRows(j.rows ?? []));
  }, [tab]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Classements</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`chip ${tab === t.key ? "border-accent" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left w-10">#</th>
              <th className="text-left">Coureur</th>
              <th className="text-right">
                {tab === "tokens" && "Jetons"}
                {tab === "vdot" && "VDOT"}
                {tab === "winrate" && "Win-rate"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-1.5">{i + 1}</td>
                <td>{r.displayName}</td>
                <td className="text-right font-mono">
                  {tab === "tokens" && (r.tokens ?? 0).toLocaleString("fr-FR")}
                  {tab === "vdot" && (r.vdot ?? 0).toFixed(1)}
                  {tab === "winrate" && (
                    <>
                      {((r.rate ?? 0) * 100).toFixed(1)} %
                      <span className="text-white/40 text-xs"> ({r.won}/{r.total})</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="text-white/50 text-center py-3">Aucun résultat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
