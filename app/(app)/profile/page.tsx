import { redirect } from "next/navigation";

/**
 * /profile wurde durch /me (Identität + Self-Knowledge) und /settings (Stats +
 * Logout) abgelöst. Bestehende Bookmarks/PWA-Verknüpfungen leiten auf /me um.
 */
export default function ProfilePage() {
  redirect("/me");
}
