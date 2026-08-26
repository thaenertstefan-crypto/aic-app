"use client";

import { useRouter } from "next/navigation";

import { useBoosterFlug } from "@/components/booster/booster-flug";
import {
  SubPageHeader,
  type SubPageHeaderProps,
} from "@/components/layout/sub-page-header";

/**
 * Der Kopf einer Booster-Übung — derselbe wie überall, nur mit dem Rückweg des
 * Kopfwetter-Flugs am Zurück-Pfeil (KAN-60).
 *
 * Ein Hinflug ohne Rückflug behauptet eine Beziehung, die der Rückweg widerruft
 * (KAN-30). Deshalb sitzt der Auslöser genau dort, wo der Nutzer den Weg zurück
 * ohnehin sucht.
 *
 * **Kein gemerkter Abflug = kein Rückflug.** Bei Direkt-Load einer Sub-Page
 * (Deeplink, Reload, vom Homescreen) gibt es keinen Start, auf den man
 * zurückfliegen könnte — dann rendert der Pfeil als schlichter `<Link>` und der
 * generische Übergang trägt den Wechsel. Das ist die Regel, kein Sonderfall.
 */
export function BoosterBackHeader(
  props: Omit<SubPageHeaderProps, "backHref" | "onBack">,
) {
  const router = useRouter();
  const { kannZurueck, flyBack } = useBoosterFlug();

  return (
    <SubPageHeader
      {...props}
      backHref="/booster"
      // `onBack` nur setzen, wenn wirklich ein Flug daran hängt: ohne ihn bleibt
      // es beim `<Link href="/booster">` samt allem, was ein Link kann.
      onBack={
        kannZurueck
          ? () => flyBack(() => router.push("/booster"))
          : undefined
      }
    />
  );
}
