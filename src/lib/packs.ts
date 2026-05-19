// Packs d'achat de jetons. Prix en centimes d'euros.
// Plus le pack est gros, plus le bonus est généreux.
//
// Économie : 100 jetons ≈ une paire d'entrée de gamme dans la boutique.
// 15 000 jetons = une paire carbone basique.

export type TokenPack = {
  id: string;
  label: string;
  baseTokens: number;
  bonusTokens: number;
  amountCents: number;
  currency: "EUR";
  badge?: string;
};

export const PACKS: TokenPack[] = [
  {
    id: "starter",
    label: "Pack Découverte",
    baseTokens: 500,
    bonusTokens: 0,
    amountCents: 499,
    currency: "EUR",
  },
  {
    id: "runner",
    label: "Pack Runner",
    baseTokens: 2000,
    bonusTokens: 200,
    amountCents: 1499,
    currency: "EUR",
    badge: "+10 %",
  },
  {
    id: "athlete",
    label: "Pack Athlete",
    baseTokens: 5000,
    bonusTokens: 1000,
    amountCents: 2999,
    currency: "EUR",
    badge: "+20 %",
  },
  {
    id: "elite",
    label: "Pack Elite",
    baseTokens: 15000,
    bonusTokens: 5000,
    amountCents: 7999,
    currency: "EUR",
    badge: "+33 % • carbone à portée",
  },
];

export const findPack = (id: string) => PACKS.find((p) => p.id === id);
export const packTotal = (p: TokenPack) => p.baseTokens + p.bonusTokens;
