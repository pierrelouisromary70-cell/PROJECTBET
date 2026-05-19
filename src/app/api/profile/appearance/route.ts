import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  skinTone: z.enum(["light", "lightMedium", "medium", "darkMedium", "dark"]).optional(),
  selectedTitle: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });
  const data = parsed.data;

  // Si l'utilisateur veut afficher un titre, vérifier qu'il possède
  // l'achievement correspondant.
  if (data.selectedTitle) {
    const a = await prisma.achievement.findUnique({
      where: { userId_code: { userId: session.user.id, code: data.selectedTitle } },
    });
    if (!a) return NextResponse.json({ error: "Titre non débloqué." }, { status: 403 });
  }

  await prisma.runnerProfile.update({
    where: { userId: session.user.id },
    data: {
      ...(data.skinTone ? { skinTone: data.skinTone } : {}),
      ...(data.selectedTitle !== undefined ? { selectedTitle: data.selectedTitle } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
