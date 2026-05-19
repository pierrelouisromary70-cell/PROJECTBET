import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Trois classements :
//  - tokens (richesse)
//  - vdot (niveau coureur)
//  - winrate (taux de réussite des paris, min 5 paris réglés)
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "tokens";

  if (type === "tokens") {
    const users = await prisma.user.findMany({
      orderBy: { tokens: "desc" },
      take: 50,
      select: { id: true, displayName: true, tokens: true },
    });
    return NextResponse.json({ type, rows: users });
  }
  if (type === "vdot") {
    const profiles = await prisma.runnerProfile.findMany({
      orderBy: { vdot: "desc" },
      take: 50,
      include: { user: { select: { id: true, displayName: true } } },
    });
    return NextResponse.json({
      type,
      rows: profiles.map((p) => ({ id: p.user.id, displayName: p.user.displayName, vdot: p.vdot })),
    });
  }
  if (type === "winrate") {
    const stats = await prisma.bet.groupBy({
      by: ["bettorId"],
      _count: { _all: true },
      where: { status: { in: ["WON", "LOST"] } },
    });
    const wonGroups = await prisma.bet.groupBy({
      by: ["bettorId"],
      _count: { _all: true },
      where: { status: "WON" },
    });
    const wonMap = new Map(wonGroups.map((g) => [g.bettorId, g._count._all]));
    const filtered = stats.filter((s) => s._count._all >= 5);
    const enriched = await Promise.all(
      filtered.map(async (s) => {
        const u = await prisma.user.findUnique({
          where: { id: s.bettorId },
          select: { id: true, displayName: true },
        });
        const won = wonMap.get(s.bettorId) ?? 0;
        return u
          ? { id: u.id, displayName: u.displayName, total: s._count._all, won, rate: won / s._count._all }
          : null;
      }),
    );
    const rows = enriched.filter(Boolean).sort((a, b) => (b!.rate - a!.rate));
    return NextResponse.json({ type, rows: rows.slice(0, 50) });
  }
  return NextResponse.json({ error: "type inconnu" }, { status: 400 });
}
