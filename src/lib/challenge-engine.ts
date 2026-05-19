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
