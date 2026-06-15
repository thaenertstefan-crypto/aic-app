"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error: string | null;
};

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
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signupAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Bitte alle Felder ausfüllen." };
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
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/onboarding");
}

export async function signoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}