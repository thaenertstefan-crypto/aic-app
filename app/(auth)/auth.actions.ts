"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { failed, ok, type ActionResult } from "@/lib/actions/action-result";
import { createClient } from "@/lib/supabase/server";

// Diese Actions sind die EINZIGEN, die `withUser` nicht nutzen — und zwar aus
// dem Grund, der withUser ausmacht: sie laufen vor der Anmeldung. Login,
// Signup und der Reset-Link haben per Definition keinen angemeldeten User,
// updatePasswordAction arbeitet auf der Recovery-Session aus dem Mail-Link.
// Die gemeinsame Ergebnisform gilt trotzdem: ActionResult<T> statt drei
// eigener State-Typen.

/** Map common (English) Supabase auth errors to warm German microcopy. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "E-Mail oder Passwort stimmt nicht. Versuch es nochmal.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return "Mit dieser E-Mail gibt es schon ein Konto. Magst du dich anmelden?";
  }
  if (m.includes("password should be at least")) {
    return "Dein Passwort sollte mindestens 6 Zeichen lang sein.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Diese E-Mail-Adresse sieht nicht ganz richtig aus.";
  }
  if (m.includes("email not confirmed")) {
    return "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.";
  }
  return message;
}

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return failed("Bitte E-Mail und Passwort eingeben.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return failed(friendlyAuthError(error.message));
  }

  redirect("/dashboard");
}

export async function signupAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return failed("Bitte alle Felder ausfüllen.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (error) {
    return failed(friendlyAuthError(error.message));
  }

  redirect("/onboarding");
}

export async function signoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Schickt einen Passwort-Reset-Link. Bewusst enumeration-safe: bei gültiger
 * Eingabe immer „abgeschickt", egal ob die E-Mail existiert (Supabase
 * verrät es ebenfalls nicht). So erfährt niemand, welche Adressen registriert
 * sind.
 *
 * Die Nutzlast ist genau dieses „abgeschickt": das Formular startet auf
 * `ok(false)` und tauscht die Ansicht erst, wenn hier `ok(true)` ankommt.
 */
export async function requestPasswordResetAction(
  _prevState: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  const email = formData.get("email") as string;

  if (!email) {
    return failed("Bitte gib deine E-Mail-Adresse ein.");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/passwort-neu`,
  });

  return ok(true);
}

/**
 * Setzt ein neues Passwort auf die aktuell aktive Session (kommt aus dem
 * Recovery-Link über /auth/callback). Danach ist die Person direkt drin.
 */
export async function updatePasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const password = formData.get("password") as string;

  if (!password || password.length < 6) {
    return failed("Dein Passwort sollte mindestens 6 Zeichen lang sein.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return failed(friendlyAuthError(error.message));
  }

  redirect("/dashboard");
}