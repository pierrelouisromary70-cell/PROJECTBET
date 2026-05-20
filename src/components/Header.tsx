"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/challenges", label: "Défis" },
  { href: "/duels", label: "Duels" },
  { href: "/races", label: "Courses" },
  { href: "/clubs", label: "Clubs" },
  { href: "/shop", label: "Boutique" },
  { href: "/leaderboard", label: "Classement" },
  { href: "/bets", label: "Mes paris" },
];

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me").then((r) => r.json()).then((u) => setTokens(u?.tokens ?? null));
  }, [status, pathname]);

  return (
    <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-extrabold tracking-tight text-lg flex items-center gap-2">
          <span className="size-7 rounded-lg bg-gradient-to-br from-cyan-400 to-amber-400 grid place-items-center text-black font-black">R</span>
          RunnerBet
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm text-white/70">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-lg transition ${
                  active ? "text-white bg-white/10" : "hover:text-white hover:bg-white/[0.04]"
                }`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {status === "authenticated" ? (
            <>
              {tokens != null && (
                <Link href="/buy-tokens" className="chip border-amber-400/30 text-amber-300 hover:bg-white/5"
                  title="Acheter des jetons">
                  🪙 {tokens.toLocaleString("fr-FR")}
                </Link>
              )}
              <Link href="/profile" className="hover:text-white hidden sm:inline">
                {session.user?.name ?? "Profil"}
              </Link>
              <button className="btn-ghost text-sm" onClick={() => signOut({ callbackUrl: "/" })}>Sortir</button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">Connexion</Link>
              <Link href="/register" className="btn-primary text-sm">Créer un compte</Link>
            </>
          )}
        </div>
      </div>
      {/* Nav mobile */}
      <div className="md:hidden border-t border-white/5 overflow-x-auto">
        <div className="flex gap-1 px-4 py-2 text-xs text-white/70">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${active ? "bg-white/10 text-white" : ""}`}>
                {n.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
