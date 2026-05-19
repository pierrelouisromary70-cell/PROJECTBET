import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Échange le code OAuth contre des tokens et lie le compte Strava à l'utilisateur courant.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code manquant" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?from=strava`);

  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) return NextResponse.json({ error: "Strava token error" }, { status: 502 });
  const data = (await r.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number };
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      stravaId: String(data.athlete.id),
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaExpiresAt: data.expires_at,
    },
  });

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/profile?strava=ok`);
}
