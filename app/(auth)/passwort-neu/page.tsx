import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/supabase/get-user";
import { UpdatePasswordForm } from "./update-password-form";

export default async function PasswortNeuPage() {
  const user = await getCachedUser();

  // Diese Seite ist nur über einen gültigen Recovery-Link erreichbar, der über
  // /auth/callback eine Session gesetzt hat. Ohne Session zurück zur Anforderung.
  if (!user) {
    redirect("/passwort-vergessen?fehler=link");
  }

  return <UpdatePasswordForm />;
}
