// Calcul des cotes pour un duel entre deux coureurs sur une distance donnée.
//
// Principe :
// 1) On prédit le chrono de chacun sur la distance via leur VDOT.
// 2) On en déduit une probabilité de victoire avec une fonction logistique
//    sur l'écart relatif de temps (en %).
// 3) On applique une marge "maison" (vig) pour rendre l'économie viable.
// 4) On ajoute un malus de fraîcheur sur les PRs anciens ou non-vérifiés
//    (réduit la confiance => cotes resserrées).

import { predictTimeSec } from "./vdot";

export type RunnerInput = {
  vdot: number;
  trustScore: number;     // 0-100 (qualité de la donnée)
  prAgeDays: number;      // âge du chrono de référence le plus récent
};

// Marge maison. Volontairement plus élevée que dans un bookmaker pro
// (typiquement 4-6 %) car l'économie est virtuelle et on veut pousser
// l'utilisateur à se réapprovisionner (pubs, parrainages, achats).
// À 7 %, le joueur médian perd ~7 % de sa mise par pari sur longue durée.
const HOUSE_VIG = 0.07;

// Sensibilité de la logistique : un écart de 5% sur le temps => p ~ 0.85.
const K = 35;

function winProb(timeA: number, timeB: number) {
  const diff = (timeB - timeA) / ((timeA + timeB) / 2); // > 0 si A plus rapide
  // Logistique centrée
  const p = 1 / (1 + Math.exp(-K * diff));
  return p;
}

// Plus le coureur a une donnée fraîche/fiable, plus on s'éloigne de 0.5.
// Sinon on tire la proba vers 0.5 (incertitude).
function applyUncertainty(p: number, conf: number) {
  // conf entre 0 et 1
  return 0.5 + (p - 0.5) * conf;
}

function confidence(r: RunnerInput) {
  const trust = Math.max(0, Math.min(1, r.trustScore / 100));
  // Décroissance : un PR vieux d'1 an perd ~30% de poids
  const age = Math.exp(-r.prAgeDays / 365);
  return 0.3 + 0.7 * trust * age; // borne basse 0.3
}

export function computeMatchupOdds(
  distanceM: number,
  a: RunnerInput,
  b: RunnerInput,
) {
  const tA = predictTimeSec(distanceM, a.vdot);
  const tB = predictTimeSec(distanceM, b.vdot);

  const rawA = winProb(tA, tB);
  const rawB = 1 - rawA;

  const conf = Math.min(confidence(a), confidence(b));
  const pA = applyUncertainty(rawA, conf);
  const pB = 1 - pA;

  // Cotes décimales avec vig
  const oddsA = (1 - HOUSE_VIG) / pA;
  const oddsB = (1 - HOUSE_VIG) / pB;

  return {
    predictedTimeA: tA,
    predictedTimeB: tB,
    probA: pA,
    probB: pB,
    oddsA: Math.max(1.01, oddsA),
    oddsB: Math.max(1.01, oddsB),
    confidence: conf,
  };
}

// Encode une cote décimale en entier *100 pour stockage SQLite sans float.
export const oddsToInt = (o: number) => Math.round(o * 100);
export const oddsFromInt = (i: number) => i / 100;
