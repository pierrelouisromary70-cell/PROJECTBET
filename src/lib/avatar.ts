// Helpers d'affichage de l'avatar.

export const SKIN_TONES = [
  { key: "light",       label: "Très clair",  modifier: "\u{1F3FB}" },
  { key: "lightMedium", label: "Clair",       modifier: "\u{1F3FC}" },
  { key: "medium",      label: "Médium",      modifier: "\u{1F3FD}" },
  { key: "darkMedium",  label: "Foncé",       modifier: "\u{1F3FE}" },
  { key: "dark",        label: "Très foncé",  modifier: "\u{1F3FF}" },
] as const;

export type SkinTone = (typeof SKIN_TONES)[number]["key"];

const TONE_MAP: Record<string, string> = Object.fromEntries(
  SKIN_TONES.map((t) => [t.key, t.modifier]),
);

// Compose l'emoji de course en fonction du genre et du skin tone.
// Format Unicode : person + skin tone modifier + ZWJ + gender symbol.
export function runnerEmoji(gender: string | null, skinTone: string): string {
  const tone = TONE_MAP[skinTone] ?? TONE_MAP.medium;
  if (gender === "F") return `\u{1F3C3}${tone}‍♀️`;
  if (gender === "M") return `\u{1F3C3}${tone}‍♂️`;
  return `\u{1F3C3}${tone}`;
}
