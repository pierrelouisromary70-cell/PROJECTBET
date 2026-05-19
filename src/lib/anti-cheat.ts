// Garde-fous anti-triche pour les PRs (Personal Records).
//
// Approche :
//  1) Plafond physiologique : un chrono saisi qui dépasse un VDOT humainement
//     plausible (records du monde) est refusé.
//  2) Plancher : un chrono trop lent qui ferait régresser le coureur de
//     façon absurde n'est pas accepté en remplacement.
//  3) Source : STRAVA > OFFICIAL > MANUAL en termes de score de confiance.
//  4) Cohérence : un nouveau PR ne peut pas dépasser le VDOT courant de plus
//     de +5 sans validation communautaire (3 votes "approve").
//  5) Cooldown : pas plus d'un PR vérifié par distance toutes les 24h.

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

  // Source manuelle sans preuve : exige validation communautaire au-delà
  // d'un certain delta.
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

  // Saut de niveau important : communauté requise même avec preuve.
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

export const APPROVAL_THRESHOLD = 3; // 3 votes "approve" net pour valider
