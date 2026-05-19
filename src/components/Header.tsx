"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me").then((r) => r.json()).then((u) => setTokens(u?.tokens ?? null));
  }, [status]);

  return (
    <header className="border-b border-white/5 bg-black/30 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-extrabold tracking-tight text-lg">
          🏃 RunnerBet
        </Link>
        <nav className="flex items-center gap-4 text-sm text-white/80">
          <Link href="/challenges" className="hover:text-white">Défis</Link>
          <Link href="/races" className="hover:text-white">Courses</Link>
          <Link href="/bets" className="hover:text-white">Mes paris</Link>
          <Link href="/shop" className="hover:text-white">Boutique</Link>
          <Link href="/leaderboard" className="hover:text-white">Classement</Link>
          <Link href="/validate" className="hover:text-white">Valider</Link>
          <Link href="/buy-tokens" className="hover:text-white">+ Jetons</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {status === "authenticated" ? (
            <>
              {tokens != null && (
                <span className="chip" title="Jetons">🪙 {tokens.toLocaleString("fr-FR")}</span>
              )}
              <Link href="/profile" className="hover:text-white">{session.user?.name ?? "Profil"}</Link>
              <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>Sortir</button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">Connexion</Link>
              <Link href="/register" className="btn-primary">Créer un compte</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
