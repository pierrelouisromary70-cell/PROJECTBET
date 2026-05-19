import { NextResponse } from "next/server";

// Démarre le flow OAuth Strava. L'app doit être enregistrée sur strava.com/settings/api.
export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId)
    return NextResponse.json({ error: "STRAVA_CLIENT_ID manquant côté serveur." }, { status: 500 });

  const redirect = `${process.env.NEXTAUTH_URL}/api/strava/callback`;
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");

  return NextResponse.redirect(url.toString());
}
