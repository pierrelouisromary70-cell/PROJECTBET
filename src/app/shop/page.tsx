"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ShopItem = {
  id: string; category: string; brand: string; model: string; tier: string;
  priceTokens: number; imageEmoji: string; description: string;
  availableUntil?: string | null;
};

const CAT_LABELS: Record<string, string> = {
  shoes: "Chaussures", shirt: "Hauts", shorts: "Shorts", socks: "Chaussettes",
  cap: "Casquettes", glasses: "Lunettes", watch: "Montres", belt: "Hydratation",
};

const TIER_LABEL: Record<string, string> = {
  entry: "Essentiel", mid: "Confirmé", premium: "Premium",
  carbon: "Carbone", limited: "Édition limitée",
};

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(until).getTime() - now;
  if (diff <= 0) return <span className="text-red-300 text-xs">Drop expiré</span>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return <span className="text-pink-300 text-xs font-medium">⏳ {days}j {hours}h</span>;
}

export default function ShopPage() {
  const { status } = useSession();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [me, setMe] = useState<{ tokens: number; inventory: Array<{ itemId: string }> } | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
    setBusy(id);
    const r = await fetch("/api/shop/buy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id }),
    });
    const j = await r.json();
    setBusy(null);
    setMsg(r.ok ? "Achat effectué ✓" : (j.error ?? "Erreur"));
    load();
  }

  const owned = new Set(me?.inventory.map((i) => i.itemId) ?? []);
  const filtered =
    filter === "all" ? items
    : filter === "drops" ? items.filter((i) => i.tier === "limited")
    : filter === "carbon" ? items.filter((i) => i.tier === "carbon")
    : items.filter((i) => i.category === filter);

  return (
    <div className="space-y-6">
      {/* Hero boutique */}
      <div className="card flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Boutique</h1>
          <p className="text-white/60 text-sm mt-1">
            Cinq marques fictives, du basique à la plaque carbone. Plus tu pries gros, plus le carbone est proche.
          </p>
        </div>
        {me && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-white/40">Ton solde</div>
            <div className="text-3xl stat-num text-amber-300">🪙 {me.tokens.toLocaleString("fr-FR")}</div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Tout</FilterChip>
        <FilterChip active={filter === "drops"} onClick={() => setFilter("drops")} accent="pink">
          🔥 Drops
        </FilterChip>
        <FilterChip active={filter === "carbon"} onClick={() => setFilter("carbon")} accent="amber">
          🚀 Carbones
        </FilterChip>
        <span className="w-px bg-white/10 mx-1" />
        {Object.entries(CAT_LABELS).map(([k, lbl]) => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>{lbl}</FilterChip>
        ))}
      </div>

      {msg && <div className="card text-sm">{msg}</div>}

      {/* Grille */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((i) => {
          const isOwned = owned.has(i.id);
          const tooExpensive = me && me.tokens < i.priceTokens;
          const tierClass = `shop-${i.tier}`;
          const shine = i.tier === "carbon" || i.tier === "limited";
          return (
            <div key={i.id} className={`shop-card ${tierClass} ${shine ? "tier-shine" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="brand">{i.brand}</div>
                  <div className="font-bold text-lg leading-tight">{i.model}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`tier-badge b-${i.tier}`}>{TIER_LABEL[i.tier]}</span>
                  {i.availableUntil && <Countdown until={i.availableUntil} />}
                </div>
              </div>

              <div className="flex items-center justify-center my-5">
                <div className="shop-glyph">{i.imageEmoji}</div>
              </div>

              <p className="text-xs text-white/65 leading-relaxed min-h-[3rem]">{i.description}</p>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Prix</div>
                  <div className="font-extrabold tabular-nums">{i.priceTokens.toLocaleString("fr-FR")} 🪙</div>
                </div>
                {isOwned ? (
                  <span className="chip text-emerald-300 border-emerald-300/30">✓ Possédé</span>
                ) : (
                  <button
                    className="btn-primary text-sm"
                    disabled={!me || !!tooExpensive || busy === i.id}
                    onClick={() => buy(i.id)}>
                    {busy === i.id ? "…" : tooExpensive ? "Trop cher" : "Acheter"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-white/50">Aucun item dans cette catégorie.</p>
      )}
    </div>
  );
}

function FilterChip({
  active, onClick, accent, children,
}: {
  active: boolean; onClick: () => void; accent?: "pink" | "amber"; children: React.ReactNode;
}) {
  const border =
    active
      ? accent === "pink" ? "border-pink-300"
      : accent === "amber" ? "border-amber-300"
      : "border-accent"
      : "border-white/10";
  return (
    <button
      onClick={onClick}
      className={`chip ${border} ${active ? "bg-white/10" : "hover:bg-white/5"} transition`}>
      {children}
    </button>
  );
}
