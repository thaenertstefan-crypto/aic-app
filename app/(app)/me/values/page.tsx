import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";
import { getValueDescription } from "@/lib/utils/values-descriptions";

export default async function MeValuesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let values: string[] = [];

  if (user) {
    const { data: hypothesis } = await supabase
      .from("values_hypothesis")
      .select("values")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    values = (hypothesis?.values as string[] | null) ?? [];
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me" title="Meine Werte" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        {values.length > 0 ? (
          <div className="space-y-3">
            {values.map((id) => (
              <Card key={id}>
                <CardContent className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {getValueEmoji(id)}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading text-base font-semibold text-foreground">
                      {getValueLabel(id)}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Dir ist wichtig, dass {getValueDescription(id)}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Du hast noch keine Werte entdeckt.
          </p>
        )}

        <Button
          className="mt-auto w-full gap-2"
          render={<Link href="/me/values/journey" />}
        >
          Geh auf Werteentdeckung
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
