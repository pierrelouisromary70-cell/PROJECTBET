"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ShopItem = { id: string; category: string; brand: string; model: string; tier: string; priceTokens: number; imageEmoji: string; description: string };

const CAT_LABELS: Record<string, string> = {
  shoes: "Chaussures", shirt: "Hauts", shorts: "Shorts", socks: "Chaussettes", cap: "Casquettes", glasses: "Lunettes",
};

export default function ShopPage() {
  const { status } = useSession();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [me, setMe] = useState<{ tokens: number; inventory: Array<{ itemId: string }> } | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const it = await fetch("/api/shop").then((r) => r.json());
    setItems(it);
    if (status === "authenticated") {
      const u = await fetch("/api/me").then((r) => r.json());
      setMe(u ? { tokens: u.tokens, inventory: u.inventory.map((i: { item: { id: string } }) => ({ itemId: i.item.id })) } : null);
    }
  }
  useEffect(() => { load(); }, [status]);

  async function buy(id: string) {
    const r = await fetch("/api/shop/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erreur");
    else setMsg("Achat effectué !");
    load();
  }

  const owned = new Set(me?.inventory.map((i) => i.itemId) ?? []);
  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Boutique</h1>
        {me && <span className="chip text-base">🪙 {me.tokens.toLocaleString("fr-FR")}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={`chip ${filter === "all" ? "border-accent" : ""}`} onClick={() => setFilter("all")}>Tout</button>
        {Object.entries(CAT_LABELS).map(([k, lbl]) => (
          <button key={k} className={`chip ${filter === k ? "border-accent" : ""}`} onClick={() => setFilter(k)}>{lbl}</button>
        ))}
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((i) => {
          const isOwned = owned.has(i.id);
          const tooExpensive = me && me.tokens < i.priceTokens;
          return (
            <div key={i.id} className="card flex flex-col">
              <div className="flex items-start justify-between">
                <div className="text-4xl">{i.imageEmoji}</div>
                <span className={`chip tier-${i.tier}`}>{i.tier}</span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-white/60">{i.brand}</div>
                <div className="font-bold">{i.model}</div>
                <p className="text-xs text-white/70 mt-1 min-h-[2.5rem]">{i.description}</p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="font-mono">{i.priceTokens.toLocaleString("fr-FR")} 🪙</span>
                {isOwned ? (
                  <span className="chip text-emerald-300">Possédé</span>
                ) : (
                  <button className="btn-primary" disabled={!me || !!tooExpensive} onClick={() => buy(i.id)}>
                    {tooExpensive ? "Trop cher" : "Acheter"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
