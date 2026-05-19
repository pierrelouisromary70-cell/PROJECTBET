"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Club = {
  id: string; name: string; tag: string; emoji: string; description?: string | null;
  treasury: number; joinPolicy: string;
  captain: { displayName: string };
  _count: { members: number };
};

export default function ClubsPage() {
  const { status } = useSession();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/clubs").then((r) => r.json());
    setClubs(r);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Clubs</h1>
        {status === "authenticated" && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "+ Fonder un club (500 🪙)"}
          </button>
        )}
      </div>
      <p className="text-white/70 text-sm">
        Rejoins un club et participe aux guerres hebdomadaires. Tu ne peux être que
        dans <strong>1 club à la fois</strong>. Trésor commun, alimenté par les
        donations des membres. Le capitaine déclare et accepte les guerres.
      </p>

      {creating && <CreateClub onDone={() => { setCreating(false); load(); }} />}

      <div className="grid md:grid-cols-2 gap-3">
        {clubs.map((c) => (
          <Link key={c.id} href={`/clubs/${c.id}`} className="card hover:border-accent/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{c.emoji}</span>
                <div>
                  <div className="font-bold">{c.name} <span className="text-white/40 text-xs">[{c.tag}]</span></div>
                  <div className="text-xs text-white/60">capitaine : {c.captain.displayName}</div>
                </div>
              </div>
              <span className="chip">{c.joinPolicy === "OPEN" ? "Ouvert" : "Sur invitation"}</span>
            </div>
            {c.description && <p className="text-sm text-white/70 mt-2">{c.description}</p>}
            <div className="flex items-center justify-between mt-3 text-xs">
              <span>{c._count.members} membre(s)</span>
              <span>Trésor : {c.treasury.toLocaleString("fr-FR")} 🪙</span>
            </div>
          </Link>
        ))}
        {clubs.length === 0 && <p className="text-white/60 text-sm">Aucun club encore.</p>}
      </div>
    </div>
  );
}

function CreateClub({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", tag: "", emoji: "🏃", description: "", joinPolicy: "OPEN" as "OPEN" | "INVITE_ONLY" });
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/clubs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tag: form.tag.toUpperCase() }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(typeof j.error === "string" ? j.error : "Erreur."); return; }
    onDone();
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <div><label className="label">Nom</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={30} />
        </div>
        <div><label className="label">Tag (2-5 lettres)</label>
          <input className="input uppercase" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })} required minLength={2} maxLength={5} />
        </div>
        <div><label className="label">Emoji</label>
          <input className="input text-center text-xl" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={4} />
        </div>
      </div>
      <div><label className="label">Description</label>
        <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} rows={2} />
      </div>
      <div>
        <label className="label">Politique d'adhésion</label>
        <select className="input" value={form.joinPolicy} onChange={(e) => setForm({ ...form, joinPolicy: e.target.value as "OPEN" | "INVITE_ONLY" })}>
          <option value="OPEN">Ouvert (tout le monde peut rejoindre)</option>
          <option value="INVITE_ONLY">Sur invitation</option>
        </select>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button className="btn-primary w-full" type="submit">Fonder (500 🪙)</button>
    </form>
  );
}
