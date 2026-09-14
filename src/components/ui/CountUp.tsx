"use client";

import { useEffect, useRef, useState } from "react";
import { parseLocalizedNumber } from "@/lib/digits";

interface CountUpProps {
  /**
   * Target value. Accepts the raw API field, including an Arabic-Indic digit
   * string, so callers don't have to parse before handing it over.
   */
  value: number | string | null | undefined;
  /** Animation length in milliseconds. */
  durationMs?: number;
  /** Rendered before the count starts and appended after it finishes. */
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Ease-out cubic — fast start, gentle settle, so the final value reads clearly. */
const easeOut = (progress: number) => 1 - Math.pow(1 - progress, 3);

/**
 * A statistic that counts up from zero when it first scrolls into view.
 *
 * Deliberately dependency-free and driven by `requestAnimationFrame` rather
 * than a CSS transition, because the number itself has to change — not just its
 * position — and the final frame must land exactly on the target rather than
 * near it.
 *
 * Two accessibility details that are easy to get wrong:
 * - The animated text is `aria-hidden`; a visually hidden node carries the
 *   final value, so a screen reader announces `797` once instead of narrating
 *   every intermediate frame.
 * - `prefers-reduced-motion` skips the animation entirely and renders the
 *   target immediately.
 */
export default function CountUp({
  value,
  durationMs = 1600,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const target = parseLocalizedNumber(value);
  // Counting fractional statistics would render noise like "141.7532" mid-flight.
  const decimals = Number.isInteger(target) ? 0 : 1;

  const [displayed, setDisplayed] = useState(0);
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || target === 0) {
      // Deferred rather than set inline: the server renders 0 for every path,
      // so jumping to the target during the effect body would both trip
      // react-hooks/set-state-in-effect and diverge from the animated path's
      // hydration behaviour.
      frameRef.current = requestAnimationFrame(() => setDisplayed(target));
      return () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }

    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        setDisplayed(target * easeOut(progress));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          // Land exactly on the target — easing leaves a rounding residue.
          setDisplayed(target);
        }
      };
      frameRef.current = requestAnimationFrame(step);
    };

    // IntersectionObserver is missing in jsdom and very old browsers; counting
    // immediately is the right fallback, never showing a permanent zero.
    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // Count once, on first reveal — re-running on every scroll past is
        // distracting rather than informative.
        observer.disconnect();
        run();
      },
      { threshold: 0.3 }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  const formatted = displayed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const finalFormatted = target.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={nodeRef} className={className}>
      {/* `tabular-nums` stops the width jittering as digits change. */}
      <span aria-hidden="true" className="tabular-nums">
        {prefix}
        {formatted}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {finalFormatted}
        {suffix}
      </span>
    </span>
  );
}
