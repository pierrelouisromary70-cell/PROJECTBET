"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setErr("Identifiants invalides.");
    else router.push("/profile");
  }

  return (
    <div className="max-w-sm mx-auto card mt-8">
      <h1 className="text-xl font-bold mb-4">Connexion</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" type="submit">Se connecter</button>
      </form>
      <p className="text-white/60 text-sm mt-4">
        Comptes démo : <code>alex@demo.run</code> / <code>marie@demo.run</code> — mdp <code>demo1234</code>
      </p>
    </div>
  );
}
