import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE : supprime un loadout.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const loadout = await prisma.loadout.findUnique({
    where: { id: params.id },
    include: { profile: true },
  });
  if (!loadout || loadout.profile.userId !== session.user.id)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.loadout.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
