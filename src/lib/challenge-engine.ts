// Modèle de probabilité de réussite des défis quotidiens.
//
// Pour chaque type, on estime p(success) à partir du VDOT du coureur et,
// quand pertinent, de son volume hebdo récent (PRs Strava ou défis passés).
// Plus la cible est éloignée de la "norme" du coureur, plus la côte est forte.

import { predictTimeSec } from "./vdot";

export type ChallengeKind = "TIME" | "LONG_RUN" | "VOLUME" | "STREAK";

const HOUSE_VIG = 0.07; // aligné sur les paris de course

function logistic(x: number) {
  return 1 / (1 + Math.exp(-x));
}

// --- TIME ---
// "Courir D mètres en moins de T secondes"
// On prédit le chrono attendu du coureur via VDOT puis on compare.
// Si target = prediction, p = 0.5. Si target plus exigeante de 5 %, p ≈ 0.27.
function probTime(vdot: number, distanceM: number, targetSec: number) {
  const predicted = predictTimeSec(distanceM, vdot);
  const ratio = (targetSec - predicted) / predicted; // > 0 si la cible est plus lente (plus facile)
  // pente : un écart de ±5 % décale p de ±0.35
  return logistic(20 * ratio);
}

// --- LONG_RUN ---
// "Sortie unique > D km".
// Plafond pratique basé sur VDOT (table empirique des sorties longues
// confortables que peut faire un coureur récréatif).
function probLongRun(vdot: number, distanceM: number) {
  // Distance de sortie longue confortable estimée (en km) ~ f(VDOT)
  const comfortableKm = 4 + (vdot - 30) * 1.0; // VDOT 30 -> 4 km ; VDOT 60 -> 34 km
  const targetKm = distanceM / 1000;
  const ratio = (comfortableKm - targetKm) / Math.max(5, comfortableKm);
  return logistic(3 * ratio);
}

// --- VOLUME ---
// "Cumuler X km en N jours".
// Volume hebdo estimé ~ VDOT × 1.4 km/semaine (approximation grossière mais
// monotone), ajusté à la fenêtre N.
function probVolume(vdot: number, totalKm: number, days: number) {
  const weeklyExpected = Math.max(10, vdot * 1.4); // VDOT 45 -> ~63 km/sem
  const expectedInWindow = (weeklyExpected * days) / 7;
  const ratio = (expectedInWindow - totalKm) / Math.max(5, expectedInWindow);
  return logistic(2.5 * ratio);
}

// --- STREAK ---
// "Courir tous les jours pendant N jours" — peu lié au VDOT, plus à l'habitude.
// On part d'une base 0.7 pour 3 jours, qui décroît exponentiellement.
function probStreak(days: number) {
  return Math.max(0.05, 0.85 * Math.exp(-0.08 * days));
}

export function probabilityOfSuccess(args: {
  kind: ChallengeKind;
  vdot: number;
  targetDistanceM?: number | null;
  targetTimeSec?: number | null;
  targetTotalKm?: number | null;
  targetDays?: number | null;
}): number {
  switch (args.kind) {
    case "TIME":
      if (!args.targetDistanceM || !args.targetTimeSec) return 0.5;
      return probTime(args.vdot, args.targetDistanceM, args.targetTimeSec);
    case "LONG_RUN":
      if (!args.targetDistanceM) return 0.5;
      return probLongRun(args.vdot, args.targetDistanceM);
    case "VOLUME":
      if (!args.targetTotalKm || !args.targetDays) return 0.5;
      return probVolume(args.vdot, args.targetTotalKm, args.targetDays);
    case "STREAK":
      if (!args.targetDays) return 0.5;
      return probStreak(args.targetDays);
  }
}

export function challengeOdds(p: number) {
  const pYes = Math.min(0.95, Math.max(0.05, p));
  const pNo = 1 - pYes;
  const oddsYes = (1 - HOUSE_VIG) / pYes;
  const oddsNo = (1 - HOUSE_VIG) / pNo;
  return {
    pYes,
    pNo,
    oddsYes: Math.max(1.01, oddsYes),
    oddsNo: Math.max(1.01, oddsNo),
  };
}

// ============== CONFIANCE & ÉLIGIBILITÉ ==============
//
// Le moteur ne peut produire des cotes équitables que si on a une idée
// fiable du niveau du coureur. Le score de confiance combine :
//   - fraîcheur du PR le plus récent (décroissance exponentielle 1 an)
//   - présence d'un PR sur la distance pertinente du défi
//   - score de confiance utilisateur (trust score 0..100)
//   - connexion Strava (transparence forte des entraînements)
// Une confiance faible RÉTRÉCIT la probabilité vers 0.5, donc tasse les
// cotes : on empêche d'offrir 6.0 sur YES à quelqu'un dont on ignore tout.

export function challengeConfidence(args: {
  trustScore: number;
  hasStrava: boolean;
  prVerifiedCount: number;
  latestPRAgeDays: number | null;
  hasPRonDistance: boolean;
}): number {
  if (args.prVerifiedCount === 0) return 0;

  const trust = Math.min(1, Math.max(0, args.trustScore / 100));
  const freshness =
    args.latestPRAgeDays == null ? 0 : Math.exp(-args.latestPRAgeDays / 365);

  // Multiplicateurs : Strava +15 %, PR distance pertinente +10 %.
  const stravaMul = args.hasStrava ? 1.15 : 1.0;
  const distanceMul = args.hasPRonDistance ? 1.10 : 1.0;

  return Math.min(1, 0.2 + 0.8 * trust * freshness * stravaMul * distanceMul);
}

// Rétrécit p_raw vers 0.5 proportionnellement à (1 - confidence).
// confidence = 1.0 → pas de rétrécissement, on garde p_raw.
// confidence = 0.3 → on perd 70 % de l'écart à 0.5.
export function applyConfidence(pRaw: number, conf: number): number {
  return 0.5 + (pRaw - 0.5) * conf;
}

// Distances "proches" : on considère qu'avoir un PR sur 10 km informe
// pour une cible 8-12 km, etc. Tolérance 25 %.
function isCloseDistance(have: number, target: number) {
  return Math.abs(have - target) / target < 0.25;
}

export type ChallengeOwnerCheck =
  | {
      eligible: false;
      reason: string;
      confidence: number;
      maxOwnerStake: 0;
      maxBetStake: 0;
    }
  | {
      eligible: true;
      confidence: number;
      maxOwnerStake: number;
      maxBetStake: number;
      probRaw: number;
      probShrunk: number;
    };

const MIN_ACCOUNT_AGE_DAYS = 3;
const MIN_CONFIDENCE_TO_CREATE = 0.20;
const OWNER_COOLDOWN_HOURS = 4;
const PROB_MIN = 0.10;
const PROB_MAX = 0.85;
const MAX_OWNER_STAKE_BASE = 2000;
const MAX_BET_STAKE_BASE = 5000;
const MIN_BET_STAKE = 100;

export function checkOwnerEligibility(args: {
  createdAt: Date;
  trustScore: number;
  hasStrava: boolean;
  prs: Array<{ status: string; distanceM: number; raceDate: Date }>;
  recentlySettledChallenges: Array<{ resolvedAt: Date | null }>;
  vdot: number;
  kind: ChallengeKind;
  targetDistanceM?: number | null;
  targetTimeSec?: number | null;
  targetTotalKm?: number | null;
  targetDays?: number | null;
}): ChallengeOwnerCheck {
  const denied = (reason: string, confidence = 0): ChallengeOwnerCheck => ({
    eligible: false,
    reason,
    confidence,
    maxOwnerStake: 0,
    maxBetStake: 0,
  });

  const ageDays = (Date.now() - args.createdAt.getTime()) / 86400000;
  if (ageDays < MIN_ACCOUNT_AGE_DAYS) {
    return denied(
      `Compte trop récent (< ${MIN_ACCOUNT_AGE_DAYS} jours). Reviens plus tard.`,
    );
  }

  const verifiedPRs = args.prs.filter((p) => p.status === "VERIFIED");
  if (verifiedPRs.length === 0) {
    return denied(
      "Aucun chrono certifié. Connecte Strava ou ajoute un résultat officiel avant de créer un défi.",
    );
  }

  const latestPR = verifiedPRs
    .slice()
    .sort((a, b) => b.raceDate.getTime() - a.raceDate.getTime())[0];
  const prAgeDays =
    (Date.now() - latestPR.raceDate.getTime()) / 86400000;
  const hasPRonDistance =
    !!args.targetDistanceM &&
    verifiedPRs.some((p) => isCloseDistance(p.distanceM, args.targetDistanceM!));

  const confidence = challengeConfidence({
    trustScore: args.trustScore,
    hasStrava: args.hasStrava,
    prVerifiedCount: verifiedPRs.length,
    latestPRAgeDays: prAgeDays,
    hasPRonDistance,
  });

  if (confidence < MIN_CONFIDENCE_TO_CREATE) {
    return denied(
      "Tes données sont trop anciennes ou peu fiables. Connecte Strava ou ajoute un chrono récent pour activer les défis.",
      confidence,
    );
  }

  // Cooldown
  const last = args.recentlySettledChallenges
    .filter((c) => c.resolvedAt)
    .sort((a, b) => b.resolvedAt!.getTime() - a.resolvedAt!.getTime())[0];
  if (last && Date.now() - last.resolvedAt!.getTime() < OWNER_COOLDOWN_HOURS * 3600 * 1000) {
    const remaining = Math.ceil(
      (OWNER_COOLDOWN_HOURS * 3600 * 1000 -
        (Date.now() - last.resolvedAt!.getTime())) /
        60000,
    );
    return denied(
      `Cooldown : attends encore ${remaining} min avant de créer un nouveau défi.`,
      confidence,
    );
  }

  // Probabilité brute
  const probRaw = probabilityOfSuccess({
    kind: args.kind,
    vdot: args.vdot,
    targetDistanceM: args.targetDistanceM,
    targetTimeSec: args.targetTimeSec,
    targetTotalKm: args.targetTotalKm,
    targetDays: args.targetDays,
  });

  if (probRaw > PROB_MAX) {
    return denied(
      "Cette cible est trivialement à ta portée selon le moteur. Vise plus ambitieux.",
      confidence,
    );
  }
  if (probRaw < PROB_MIN) {
    return denied(
      "Cette cible est quasiment impossible selon le moteur. Vise plus réaliste.",
      confidence,
    );
  }

  const probShrunk = applyConfidence(probRaw, confidence);
  const maxOwnerStake = Math.max(50, Math.floor(MAX_OWNER_STAKE_BASE * confidence));
  const maxBetStake = Math.max(MIN_BET_STAKE, Math.floor(MAX_BET_STAKE_BASE * confidence));

  return {
    eligible: true,
    confidence,
    maxOwnerStake,
    maxBetStake,
    probRaw,
    probShrunk,
  };
}

export function describeChallenge(args: {
  kind: ChallengeKind;
  targetDistanceM?: number | null;
  targetTimeSec?: number | null;
  targetTotalKm?: number | null;
  targetDays?: number | null;
}): string {
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}h${String(m).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };
  switch (args.kind) {
    case "TIME":
      return `${(args.targetDistanceM! / 1000).toFixed(args.targetDistanceM! % 1000 ? 1 : 0)} km en moins de ${fmtTime(args.targetTimeSec!)}`;
    case "LONG_RUN":
      return `Sortie longue ≥ ${(args.targetDistanceM! / 1000).toFixed(1)} km`;
    case "VOLUME":
      return `${args.targetTotalKm} km cumulés en ${args.targetDays} jour(s)`;
    case "STREAK":
      return `Courir ${args.targetDays} jour(s) consécutifs`;
  }
}

// Vérifie qu'une activité Strava satisfait un défi.
// Pour TIME et LONG_RUN, on regarde une activité unique ; pour VOLUME, on
// somme les activités sur la fenêtre ; pour STREAK, on vérifie un par un.
export type StravaActivity = {
  id: number;
  type: string;
  sport_type?: string;
  distance: number;     // m
  moving_time: number;  // s
  start_date: string;
};

function isRun(a: StravaActivity) {
  return a.type === "Run" || a.sport_type === "Run";
}

export function checkChallengeFromActivities(
  challenge: {
    kind: string;
    targetDistanceM: number | null;
    targetTimeSec: number | null;
    targetTotalKm: number | null;
    targetDays: number | null;
    startAt: Date;
    deadline: Date;
  },
  acts: StravaActivity[],
): { satisfied: boolean; evidenceUrl?: string } {
  const inWindow = acts.filter((a) => {
    if (!isRun(a)) return false;
    const d = new Date(a.start_date);
    return d >= challenge.startAt && d <= challenge.deadline;
  });

  if (challenge.kind === "TIME") {
    const need = challenge.targetDistanceM!;
    const tol = need * 0.02;
    const found = inWindow.find(
      (a) => a.distance >= need - tol && a.moving_time <= challenge.targetTimeSec!,
    );
    return found
      ? { satisfied: true, evidenceUrl: `https://www.strava.com/activities/${found.id}` }
      : { satisfied: false };
  }
  if (challenge.kind === "LONG_RUN") {
    const need = challenge.targetDistanceM!;
    const found = inWindow.find((a) => a.distance >= need);
    return found
      ? { satisfied: true, evidenceUrl: `https://www.strava.com/activities/${found.id}` }
      : { satisfied: false };
  }
  if (challenge.kind === "VOLUME") {
    const totalKm = inWindow.reduce((acc, a) => acc + a.distance / 1000, 0);
    return { satisfied: totalKm >= challenge.targetTotalKm! };
  }
  if (challenge.kind === "STREAK") {
    const days = new Set(inWindow.map((a) => new Date(a.start_date).toISOString().slice(0, 10)));
    return { satisfied: days.size >= challenge.targetDays! };
  }
  return { satisfied: false };
}
