"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { STANDARD_DISTANCES } from "@/lib/vdot";

type RaceEntry = { runnerId: string; runner: { id: string; displayName: string; profile: { vdot: number } | null } };
type Race = { id: string; name: string; distanceM: number; scheduledAt: string; location?: string | null; status: string; entries: RaceEntry[]; _count: { bets: number } };

export default function RacesPage() {
  const { status } = useSession();
  const [races, setRaces] = useState<Race[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; displayName: string }>>([]);
  const [form, setForm] = useState({
    name: "", distanceM: 10000, scheduledAt: nextWeek(), location: "",
    runnerIds: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  function nextWeek() {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  async function load() {
    const [r, u] = await Promise.all([
      fetch("/api/races").then((x) => x.json()),
      fetch("/api/users").then((x) => x.json()),
    ]);
    setRaces(r);
    setUsers(u);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (form.runnerIds.length < 2) return alert("Sélectionne au moins 2 coureurs.");
    const r = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, distanceM: Number(form.distanceM), scheduledAt: new Date(form.scheduledAt).toISOString() }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(typeof j.error === "string" ? j.error : "Erreur."); return; }
    setCreating(false);
    setForm({ name: "", distanceM: 10000, scheduledAt: nextWeek(), location: "", runnerIds: [] });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        {status === "authenticated" && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "+ Créer une course"}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={create} className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="label">Nom</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="label">Lieu</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div>
              <label className="label">Distance</label>
              <select className="input" value={form.distanceM} onChange={(e) => setForm({ ...form, distanceM: Number(e.target.value) })}>
                {STANDARD_DISTANCES.map((d) => <option key={d.m} value={d.m}>{d.label}</option>)}
              </select>
            </div>
            <div><label className="label">Date / heure</label><input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Coureurs ({form.runnerIds.length} sélectionnés)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-48 overflow-auto p-2 bg-black/30 rounded-xl border border-white/10">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.runnerIds.includes(u.id)} onChange={(e) => {
                    setForm((f) => ({ ...f, runnerIds: e.target.checked ? [...f.runnerIds, u.id] : f.runnerIds.filter((x) => x !== u.id) }));
                  }} />
                  {u.displayName}
                </label>
              ))}
            </div>
          </div>
          <button className="btn-primary" type="submit">Créer</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {races.map((r) => (
          <Link key={r.id} href={`/races/${r.id}`} className="card hover:border-accent/40 transition">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{r.name}</h3>
              <span className="chip">{r.status}</span>
            </div>
            <div className="text-sm text-white/70 mt-1">
              {STANDARD_DISTANCES.find((d) => d.m === r.distanceM)?.label ?? `${r.distanceM} m`} • {new Date(r.scheduledAt).toLocaleString("fr-FR")}
              {r.location ? ` • ${r.location}` : ""}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.entries.map((e) => (
                <span key={e.runnerId} className="chip">
                  {e.runner.displayName}
                  {e.runner.profile && (
                    <span className="text-white/50"> · VDOT {e.runner.profile.vdot.toFixed(0)}</span>
                  )}
                </span>
              ))}
            </div>
            <div className="text-xs text-white/40 mt-2">{r._count.bets} paris placés</div>
          </Link>
        ))}
        {races.length === 0 && <p className="text-white/60">Aucune course pour le moment.</p>}
      </div>
    </div>
  );
}
