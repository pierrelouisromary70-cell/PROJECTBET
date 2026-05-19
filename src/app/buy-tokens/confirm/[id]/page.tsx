"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ConfirmDemoPurchase() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function confirm() {
    setStatus("loading");
    const r = await fetch(`/api/packs/confirm/${params.id}`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) {
      setStatus("err");
      setMsg(j.error ?? "Erreur.");
      return;
    }
    setStatus("ok");
    setMsg(`+${j.tokens} jetons crédités.`);
    setTimeout(() => router.push("/profile"), 1200);
  }

  useEffect(() => { confirm(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="card max-w-md mx-auto mt-10 text-center space-y-3">
      <h1 className="text-xl font-bold">Confirmation (mode démo)</h1>
      <p className="text-white/70 text-sm">
        En production, ce flux passe par Stripe Checkout. Ici, on simule
        un paiement réussi pour pouvoir tester l'app sans clé.
      </p>
      {status === "loading" && <p className="text-white/60">Traitement…</p>}
      {status === "ok" && <p className="text-emerald-300">{msg}</p>}
      {status === "err" && <p className="text-red-300">{msg}</p>}
    </div>
  );
}
