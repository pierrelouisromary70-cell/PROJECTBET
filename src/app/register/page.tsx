"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    gender: "M",
    birthYear: 1995,
  });
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, birthYear: Number(form.birthYear) }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Inscription impossible.");
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/profile");
  }

  return (
    <div className="max-w-sm mx-auto card mt-8">
      <h1 className="text-xl font-bold mb-4">Créer un compte</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><label className="label">Pseudo</label>
          <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
        </div>
        <div><label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div><label className="label">Mot de passe</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sexe</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="M">M</option><option value="F">F</option><option value="X">X</option>
            </select>
          </div>
          <div>
            <label className="label">Année de naissance</label>
            <input className="input" type="number" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: Number(e.target.value) })} />
          </div>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" type="submit">Créer</button>
      </form>
    </div>
  );
}
