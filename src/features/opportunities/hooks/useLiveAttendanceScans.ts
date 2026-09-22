"use client";

import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useQuery } from "@tanstack/react-query";
import { getUserOpportunities } from "@/features/opportunities/services/opportunities";
import { getAttendanceScanWindow } from "@/features/opportunities/attendanceScanWindow";
import { isApiSuccess } from "@/lib/api/errors";

/**
 * A row of `/list-user-opportunities/`, narrowed to what the navbar needs.
 *
 * The listing serves `WebsiteVolunteerOpportunityResource` and
 * `WebsiteLearnServeOpportunityResource`, which carry a schedule and
 * `relationship_tags` but **not** `self_attendance` — so this hook says
 * *whether* someone may scan, never *which* code they need next. That is all
 * the button needs: since BE-78 B the scan endpoint derives the direction from
 * the scanned code itself.
 */
export interface LiveAttendanceOpportunity {
  id: string | number;
  opportunity_type?: string;
  title_en?: string;
  title_ar?: string;
  primary_language?: string;
  opportunity_status?: string;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  time_slots?:
    | { date?: string | null; start_time?: string | null; end_time?: string | null }[]
    | null;
  is_registered?: boolean;
  is_attended?: boolean;
  requires_check_in?: boolean;
  relationship_tags?: string[];
}

export type LiveScanKind = "volunteer" | "learn_serve";

export interface LiveAttendanceScan {
  kind: LiveScanKind;
  opportunity: LiveAttendanceOpportunity;
}

/** Minutes between re-evaluations of the time window. */
const TICK_MS = 60_000;
/** The schedule itself barely moves; only the clock does. */
const REFETCH_MS = 5 * 60_000;

/**
 * A clock that advances once a minute.
 *
 * The query result is static for five minutes at a time, but "is the session
 * live" is a function of *now* — without this the icon would appear only on
 * the next refetch, up to five minutes after the window opened, and linger
 * just as long after it shut.
 */
function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function tagsOf(item: LiveAttendanceOpportunity): string[] {
  return Array.isArray(item.relationship_tags) ? item.relationship_tags : [];
}

/**
 * The opportunities this participant could scan into right now.
 *
 * Deliberately excludes:
 *  - **organizers** — they display the code, they do not scan it;
 *  - **events** — Fursa holds no attendance for them at all (BE-41), so they
 *    never appear in this listing to begin with;
 *  - **learn & serve with `requires_check_in: false`** — workshops and
 *    consultations take no attendance, and internships are manual-only;
 *  - **anything already attended** — learn & serve is one scan ever, so once
 *    `is_attended` is true there is nothing left to point a camera at.
 *
 * A volunteering opportunity is *not* excluded once attended: it has two
 * codes, and `attended` goes true on the arrival scan while the departure scan
 * is still to come.
 */
export function useLiveAttendanceScans(enabled: boolean) {
  const tick = useMinuteTick();

  const { data } = useQuery({
    queryKey: ["live-attendance-scans"],
    queryFn: () =>
      getUserOpportunities({
        filter_type: "registered",
        opportunity_status: "inprogress",
      }),
    enabled,
    refetchInterval: enabled ? REFETCH_MS : false,
    // The window can open while the tab sits in the background all afternoon.
    refetchOnWindowFocus: true,
  });

  const rows: LiveAttendanceOpportunity[] = useMemo(() => {
    if (!data || !isApiSuccess(data)) return [];
    const payload = (data as { data?: unknown }).data;
    return Array.isArray(payload) ? (payload as LiveAttendanceOpportunity[]) : [];
  }, [data]);

  return useMemo(() => {
    const now = moment();

    return rows.flatMap<LiveAttendanceScan>((item) => {
      const tags = tagsOf(item);
      if (tags.includes("organizer")) return [];
      if (item.is_registered === false && !tags.includes("registered")) return [];

      const isLearnServe = item.opportunity_type === "learn_serve_opportunity";
      const isVolunteer = item.opportunity_type === "volunteer_opportunity";
      if (!isLearnServe && !isVolunteer) return [];

      if (isLearnServe) {
        // `requires_check_in` is explicitly false for the types that take no
        // attendance; absent means "not told", which stays visible.
        if (item.requires_check_in === false) return [];
        if (item.is_attended === true || tags.includes("attended")) return [];
      }

      if (!getAttendanceScanWindow(item, { now }).isOpen) return [];

      return [
        {
          kind: isLearnServe ? "learn_serve" : "volunteer",
          opportunity: item,
        },
      ];
    });
    // `tick` is the dependency that matters: it is what re-runs the clock
    // comparison above on a schedule the query itself does not provide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tick]);
}
