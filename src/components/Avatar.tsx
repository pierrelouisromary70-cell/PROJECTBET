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

export default function Avatar({ profile }: { profile: EquippedProfile | null }) {
  const e = (id?: string | null) => (id ? findItem(id)?.imageEmoji ?? "" : "");
  const body = runnerEmoji(profile?.gender ?? null, profile?.skinTone ?? "medium");

  return (
    <div className="card flex items-center gap-4">
      <div className="avatar-ring">
        <div className="avatar-inner text-4xl leading-none">{body}</div>
      </div>
      <div className="flex-1">
        <div className="brand mb-2">Équipement</div>
        <div className="grid grid-cols-4 gap-2 text-2xl">
          <Slot icon={e(profile?.equippedCap)} fallback="🎩" tip="Casquette" />
          <Slot icon={e(profile?.equippedGlasses)} fallback="👓" tip="Lunettes" />
          <Slot icon={e(profile?.equippedShirt)} fallback="👔" tip="Haut" />
          <Slot icon={e(profile?.equippedShorts)} fallback="🩲" tip="Short" />
          <Slot icon={e(profile?.equippedSocks)} fallback="🧦" tip="Chaussettes" />
          <Slot icon={e(profile?.equippedShoes)} fallback="🩴" tip="Chaussures" />
          <Slot icon={e(profile?.equippedWatch)} fallback="⌚" tip="Montre" />
          <Slot icon={e(profile?.equippedBelt)} fallback="🎒" tip="Hydratation" />
        </div>
      </div>
    </div>
  );
}

function Slot({ icon, fallback, tip }: { icon: string; fallback: string; tip: string }) {
  return (
    <div
      title={tip}
      className={`size-10 grid place-items-center rounded-lg border border-white/5 bg-white/[0.03] ${
        icon ? "" : "opacity-30"
      }`}>
      {icon || fallback}
    </div>
  );
}
