"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { startRecipeAction } from "@/app/(app)/recipes/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Wird geladen …" : label}
    </Button>
  );
}

export function StartRecipeButton({
  slug,
  label,
}: {
  slug: string;
  label: string;
}) {
  return (
    <form action={startRecipeAction} className="mt-8">
      <input type="hidden" name="recipeSlug" value={slug} />
      <SubmitButton label={label} />
    </form>
  );
}
