import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { challengeConfidence } from "@/lib/challenge-engine";

// Renvoie l'éligibilité actuelle du user à créer un défi.
// Utilisé par l'UI pour gater le formulaire de création et expliquer pourquoi.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ eligible: false, reason: "unauth" });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      prs: true,
      challenges: { where: { status: "OPEN" } },
    },
  });
  if (!user) return NextResponse.json({ eligible: false, reason: "no user" });

  const ageDays = (Date.now() - user.createdAt.getTime()) / 86400000;
  if (ageDays < 3) {
    return NextResponse.json({
      eligible: false,
      reason: "Ton compte est trop récent (< 3 jours). Reviens plus tard.",
    });
  }

  const verified = user.prs.filter((p) => p.status === "VERIFIED");
  if (verified.length === 0) {
    return NextResponse.json({
      eligible: false,
      reason: "Tu n'as aucun chrono certifié. Connecte Strava ou soumets un résultat officiel.",
    });
  }

  const latestPR = verified
    .slice()
    .sort((a, b) => b.raceDate.getTime() - a.raceDate.getTime())[0];
  const prAgeDays = (Date.now() - latestPR.raceDate.getTime()) / 86400000;

  const conf = challengeConfidence({
    trustScore: user.trustScore,
    hasStrava: !!user.stravaId,
    prVerifiedCount: verified.length,
    latestPRAgeDays: prAgeDays,
    hasPRonDistance: false, // dépend de la cible, calculé à la création
  });

  if (conf < 0.20) {
    return NextResponse.json({
      eligible: false,
      reason: "Tes données sont trop anciennes (PR > 18 mois ou trust faible). Connecte Strava ou ajoute un chrono récent.",
      confidence: conf,
    });
  }

  if (user.challenges.length >= 3) {
    return NextResponse.json({
      eligible: false,
      reason: `Tu as déjà 3 défis ouverts.`,
      confidence: conf,
    });
  }

  const maxOwnerStake = Math.max(50, Math.floor(2000 * conf));

  return NextResponse.json({
    eligible: true,
    confidence: conf,
    prAgeDays: Math.round(prAgeDays),
    maxOwnerStake,
    hasStrava: !!user.stravaId,
  });
}
