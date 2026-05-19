// Garde-fous anti-triche.
// 1) Plafond physiologique de VDOT.
// 2) Hiérarchie de sources et cooldowns.
// 3) Votes communautaires pondérés par le trust score.
// 4) Sanity check des activités Strava.

import { vdotFromPerf } from "./vdot";

export const HUMAN_VDOT_CEILING = 87; // ~Kipchoge / Cheptegei tier
export const HUMAN_VDOT_FLOOR = 5;

export type SubmissionCheck = {
  ok: boolean;
  reason?: string;
  needsCommunityReview?: boolean;
  computedVdot: number;
};

export function validatePRSubmission(opts: {
  distanceM: number;
  timeSec: number;
  source: "STRAVA" | "MANUAL" | "OFFICIAL";
  hasEvidence: boolean;
  currentVdot: number;
}): SubmissionCheck {
  const v = vdotFromPerf(opts.distanceM, opts.timeSec);

  if (v > HUMAN_VDOT_CEILING) {
    return { ok: false, reason: "Chrono surhumain — refusé.", computedVdot: v };
  }
  if (v < HUMAN_VDOT_FLOOR) {
    return { ok: false, reason: "Chrono incohérent (trop lent).", computedVdot: v };
  }

  if (opts.source === "MANUAL" && !opts.hasEvidence) {
    if (v > opts.currentVdot + 2) {
      return {
        ok: true,
        needsCommunityReview: true,
        reason: "Manuel sans preuve — validation communautaire requise.",
        computedVdot: v,
      };
    }
  }

  if (v > opts.currentVdot + 5 && opts.source !== "STRAVA") {
    return {
      ok: true,
      needsCommunityReview: true,
      reason: "Progression importante — soumis à validation.",
      computedVdot: v,
    };
  }

  return { ok: true, computedVdot: v };
}

// Seuils de votes pour valider/rejeter un PR. Pondéré par trust score.
// score = somme des votes : approve = +trust/50, reject = -trust/50.
// Validation si score ≥ APPROVAL_SCORE et au moins MIN_DISTINCT_VOTERS.
export const APPROVAL_SCORE = 3.0;
export const MIN_DISTINCT_VOTERS = 3;

export type PRVoteRecord = {
  voterId: string;
  approve: boolean;
  voterTrust: number; // 0..100
};

export function computePRVoteOutcome(votes: PRVoteRecord[]): {
  score: number;
  approveCount: number;
  rejectCount: number;
  decision: "APPROVE" | "REJECT" | "PENDING";
} {
  let score = 0;
  let approveCount = 0;
  let rejectCount = 0;
  for (const v of votes) {
    const weight = Math.max(0.2, Math.min(2.0, v.voterTrust / 50)); // 0.2..2.0
    score += v.approve ? weight : -weight;
    if (v.approve) approveCount++;
    else rejectCount++;
  }
  const distinctVoters = new Set(votes.map((v) => v.voterId)).size;
  if (distinctVoters >= MIN_DISTINCT_VOTERS) {
    if (score >= APPROVAL_SCORE) return { score, approveCount, rejectCount, decision: "APPROVE" };
    if (score <= -APPROVAL_SCORE) return { score, approveCount, rejectCount, decision: "REJECT" };
  }
  return { score, approveCount, rejectCount, decision: "PENDING" };
}

// Sanity check d'une activité Strava avant de l'accepter comme PR.
// On rejette si la vitesse moyenne dépasse les seuils élite mondial absolus.
// On rejette aussi si une activité « marathon » a une vitesse de 800m (cycliste,
// elliptique mal taggé, etc.).
export type StravaActivityForCheck = {
  type: string;
  sport_type?: string;
  distance: number;        // mètres
  moving_time: number;     // secondes
  elapsed_time?: number;
  average_speed?: number;  // m/s
  has_heartrate?: boolean;
  trainer?: boolean;       // tapis
  manual?: boolean;        // saisie manuelle Strava
};

export const ABSOLUTE_VDOT_CEILING = 90;

export function stravaActivityLooksLegit(a: StravaActivityForCheck): {
  ok: boolean;
  reason?: string;
} {
  const isRun = a.type === "Run" || a.sport_type === "Run";
  if (!isRun) return { ok: false, reason: "Pas une course à pied." };
  if (a.manual) return { ok: false, reason: "Activité Strava saisie manuellement — non acceptée comme PR." };
  if (a.trainer) return { ok: false, reason: "Activité sur tapis — non acceptée comme PR officiel." };

  const v = vdotFromPerf(a.distance, a.moving_time);
  if (v > ABSOLUTE_VDOT_CEILING) {
    return { ok: false, reason: `VDOT calculé ${v.toFixed(1)} > plafond mondial.` };
  }
  if (v < HUMAN_VDOT_FLOOR) {
    return { ok: false, reason: "Activité trop lente pour être de la course." };
  }

  // Filtre vitesse moyenne : > 8 m/s ≈ 28.8 km/h ≈ record du monde 100m projeté sur la durée.
  const avgSpeed = a.average_speed ?? a.distance / Math.max(1, a.moving_time);
  if (avgSpeed > 8) {
    return { ok: false, reason: "Vitesse moyenne implausible (> 28 km/h)." };
  }

  return { ok: true };
}
