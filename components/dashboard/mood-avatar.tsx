"use client";

import { Mascot } from "@/components/brand/mascot";
import type { MoodFace } from "@/lib/utils/mood";

/** Dünner, mood-spezifischer Wrapper um den generischen Mascot — exakt
 *  gleiche API wie bisher, damit mood-checkin.tsx unverändert bleibt. */
export function MoodAvatar({
  face,
  pulseSeconds,
}: {
  face: MoodFace;
  pulseSeconds: number;
}) {
  return <Mascot expression={face} pulseSeconds={pulseSeconds} size="lg" />;
}
