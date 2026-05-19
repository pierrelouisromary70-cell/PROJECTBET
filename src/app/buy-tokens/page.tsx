"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Pack = {
  id: string; label: string; baseTokens: number; bonusTokens: number;
  amountCents: number; currency: string; badge?: string;
};

export default function BuyTokensPage() {
  const { status } = useSession();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/packs").then((r) => r.json()).then((j) => {
      setPacks(j.packs);
      setStripeEnabled(j.stripeEnabled);
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setMsg("Paiement reçu, jetons crédités ✨");
    else if (params.get("cancel")) setMsg("Paiement annulé.");
  }, []);

  async function buy(packId: string) {
    if (status !== "authenticated") {
      window.location.href = "/login";
      return;
    }
    setBusy(packId);
    const r = await fetch("/api/packs/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) { setMsg(j.error ?? "Erreur."); return; }
    window.location.href = j.url;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Acheter des jetons</h1>
        <p className="text-white/70 text-sm">
          Soutiens RunnerBet et accélère ton avatar.{" "}
          {stripeEnabled
            ? "Paiement sécurisé par Stripe."
            : "Mode démo activé — aucun paiement réel ne sera prélevé."}
        </p>
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        {packs.map((p) => {
          const total = p.baseTokens + p.bonusTokens;
          const price = (p.amountCents / 100).toFixed(2);
          return (
            <div key={p.id} className="card flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{p.label}</h3>
                {p.badge && <span className="chip text-amber-300">{p.badge}</span>}
              </div>
              <div className="text-3xl font-extrabold mt-2">
                {total.toLocaleString("fr-FR")} 🪙
              </div>
              {p.bonusTokens > 0 && (
                <div className="text-xs text-emerald-300">
                  + {p.bonusTokens.toLocaleString("fr-FR")} jetons offerts
                </div>
              )}
              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-white/70">{price} {p.currency}</span>
                <button className="btn-primary" disabled={busy === p.id} onClick={() => buy(p.id)}>
                  {busy === p.id ? "…" : "Acheter"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-white/40">
        Les jetons sont utilisables uniquement à l'intérieur de RunnerBet (paris,
        boutique). Aucune valeur monétaire réelle, aucun retrait possible.
      </p>
    </div>
  );
}
