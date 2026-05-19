import { findItem } from "@/lib/shop-catalog";
import { runnerEmoji } from "@/lib/avatar";

type EquippedProfile = {
  gender?: string | null;
  skinTone?: string | null;
  equippedShoes?: string | null;
  equippedShirt?: string | null;
  equippedShorts?: string | null;
  equippedSocks?: string | null;
  equippedCap?: string | null;
  equippedGlasses?: string | null;
  equippedWatch?: string | null;
  equippedBelt?: string | null;
};

// Avatar = corps emoji (gender + skin tone) + slots d'équipement.
export default function Avatar({ profile }: { profile: EquippedProfile | null }) {
  const e = (id?: string | null) => (id ? findItem(id)?.imageEmoji ?? "" : "");
  const body = runnerEmoji(profile?.gender ?? null, profile?.skinTone ?? "medium");

  return (
    <div className="card flex items-center gap-4">
      <div className="text-5xl" style={{ lineHeight: 1 }}>{body}</div>
      <div className="flex flex-wrap gap-2 text-2xl">
        <Slot icon={e(profile?.equippedCap)} fallback="🎩" tip="Casquette" />
        <Slot icon={e(profile?.equippedGlasses)} fallback="👓" tip="Lunettes" />
        <Slot icon={e(profile?.equippedShirt)} fallback="👔" tip="Haut" />
        <Slot icon={e(profile?.equippedShorts)} fallback="🩲" tip="Short" />
        <Slot icon={e(profile?.equippedSocks)} fallback="🧦" tip="Chaussettes" />
        <Slot icon={e(profile?.equippedShoes)} fallback="🩴" tip="Chaussures" />
        <Slot icon={e(profile?.equippedWatch)} fallback="⌚" tip="Montre" />
        <Slot icon={e(profile?.equippedBelt)} fallback="🎒" tip="Ceinture / hydratation" />
      </div>
    </div>
  );
}

function Slot({ icon, fallback, tip }: { icon: string; fallback: string; tip: string }) {
  return (
    <span title={tip} className={icon ? "" : "opacity-30"}>
      {icon || fallback}
    </span>
  );
}
