// Moteur des duels 1v1. Deux coureurs s'affrontent sur une métrique commune
// (chrono sur distance / sortie la plus longue / volume cumulé) durant
// une fenêtre temporelle. Cotes calibrées par les VDOT.

import { predictTimeSec } from "./vdot";
import { challengeConfidence } from "./challenge-engine";

const HOUSE_VIG = 0.07;

export type DuelKind = "FASTEST_TIME" | "LONG_RUN" | "VOLUME";

export type DuelistInput = {
  vdot: number;
  trustScore: number;
  hasStrava: boolean;
  prVerifiedCount: number;
  latestPRAgeDays: number | null;
  hasPRonDistance: boolean;
};

function confidence(d: DuelistInput) {
  return challengeConfidence({
    trustScore: d.trustScore,
    hasStrava: d.hasStrava,
    prVerifiedCount: d.prVerifiedCount,
    latestPRAgeDays: d.latestPRAgeDays,
    hasPRonDistance: d.hasPRonDistance,
  });
}

const K = 35;
function logistic(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export function duelOdds(
  kind: DuelKind,
  targetDistanceM: number | null,
  challenger: DuelistInput,
  opponent: DuelistInput,
) {
  // Pour les trois types, on compare via une "vitesse pure" estimée par VDOT
  // sur la distance pertinente (ou 10 km par défaut).
  const distance = targetDistanceM ?? 10000;
  const tA = predictTimeSec(distance, challenger.vdot);
  const tB = predictTimeSec(distance, opponent.vdot);
  const rawDiff = (tB - tA) / ((tA + tB) / 2); // >0 si challenger plus rapide
  const pAraw = logistic(K * rawDiff);

  const conf = Math.min(confidence(challenger), confidence(opponent));
  const pA = 0.5 + (pAraw - 0.5) * conf;
  const pB = 1 - pA;

  const oddsChallenger = (1 - HOUSE_VIG) / Math.max(0.05, pA);
  const oddsOpponent = (1 - HOUSE_VIG) / Math.max(0.05, pB);

  return {
    confidence: conf,
    pChallenger: pA,
    pOpponent: pB,
    oddsChallenger: Math.max(1.01, oddsChallenger),
    oddsOpponent: Math.max(1.01, oddsOpponent),
  };
}

export function describeDuel(args: { kind: DuelKind; targetDistanceM?: number | null }): string {
  switch (args.kind) {
    case "FASTEST_TIME":
      return `Meilleur chrono sur ${(args.targetDistanceM! / 1000).toFixed(0)} km`;
    case "LONG_RUN":
      return `Sortie la plus longue (cible ≥ ${(args.targetDistanceM! / 1000).toFixed(0)} km)`;
    case "VOLUME":
      return "Plus de kilomètres cumulés";
  }
}

// Détermine le gagnant d'après les résultats finaux.
// FASTEST_TIME : chrono le + bas (en secondes)
// LONG_RUN / VOLUME : distance la + grande (en mètres)
export function decideWinner(kind: DuelKind, a: number | null, b: number | null) {
  if (a == null && b == null) return "DRAW" as const;
  if (a == null) return "OPPONENT" as const;
  if (b == null) return "CHALLENGER" as const;
  if (kind === "FASTEST_TIME") {
    if (a < b) return "CHALLENGER" as const;
    if (b < a) return "OPPONENT" as const;
    return "DRAW" as const;
  }
  if (a > b) return "CHALLENGER" as const;
  if (b > a) return "OPPONENT" as const;
  return "DRAW" as const;
}
