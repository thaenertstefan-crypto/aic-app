"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";

import { Card, CardContent } from "@/components/ui/card";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface StatCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  const reduced = useReducedMotion();
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;

    // Non-numeric values or reduced motion: show the final value immediately.
    if (typeof value !== "number" || reduced) {
      el.textContent = String(value);
      return;
    }

    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration: 0.8,
      ease: "power1.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.n));
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, reduced]);

  return (
    <Card size="sm" variant="glass">
      <CardContent className="flex flex-col items-center gap-1 py-1 text-center">
        {icon}
        <span
          ref={valueRef}
          className="font-heading text-2xl font-bold tabular-nums text-foreground"
        >
          {value}
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
