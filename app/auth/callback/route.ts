import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Landepunkt für Supabase-Recovery-/Confirm-Links (PKCE). Tauscht den `code`
 * gegen eine Session und leitet auf `next` weiter. Öffentlich erreichbar —
 * liegt bewusst außerhalb der (app)-Schutzschicht.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/passwort-neu";

  // Hinter Proxy/Vercel die echte externe Origin rekonstruieren.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const origin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : new URL(request.url).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/passwort-vergessen?fehler=link`);
}
