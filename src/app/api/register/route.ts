import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(40),
  gender: z.enum(["M", "F", "X"]),
  birthYear: z.number().int().min(1930).max(new Date().getFullYear() - 5),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return NextResponse.json({ error: "Email déjà utilisé." }, { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      displayName: data.displayName,
      passwordHash,
      profile: {
        create: {
          gender: data.gender,
          birthYear: data.birthYear,
          vdot: 30,
        },
      },
      tokenLogs: {
        create: { delta: 100, reason: "SIGNUP_BONUS" },
      },
    },
  });

  return NextResponse.json({ id: user.id });
}
