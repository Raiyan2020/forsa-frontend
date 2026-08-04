"use client";

import { useState } from "react";
import "react-multi-carousel/lib/styles.css";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Title from "./Title";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import EventCard from "./EventCard";
import type { HomeEvent } from "@/lib/api/server";

interface EventsProps {
  /** Pre-fetched events from the server (optional — client fetches if absent) */
  initialEvents?: HomeEvent[];
}

export default function Events({ initialEvents = [] }: EventsProps) {
  const { t } = useTranslation();
  const [navigationVisibility, setNavigationVisibility] = useState(false);
  const user = useAuthStore((s) => s.user);

  // The authenticated homepage renders this section with no server data, so it
  // has to fetch for itself. Seeding only from a NON-empty server list matters:
  // `initialData` counts as fresh for `staleTime`, so seeding with [] would pin
  // the section empty for two minutes instead of fetching.
  const { data: eventsData } = useQuery({
    queryKey: ["events-homepage"],
    queryFn: async () => {
      const { data } = await apiClient.get("/events/", {
        params: { page: 1, limit: 6 },
      });
      return data;
    },
    initialData: initialEvents.length > 0 ? { data: initialEvents } : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const events: HomeEvent[] = Array.isArray(eventsData?.data)
    ? eventsData.data
    : initialEvents;

  return (
    <div className="border-b border-b-[#000000]/20">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] py-[40px] mx-auto 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] relative dotlist-white">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center">
          <h2>
            <Title
              text={t("COMMON.EVENTS")}
              variant="orange"
              hasMargin={false}
            />
          </h2>

          {navigationVisibility && (
            <Link
              href="/events-and-activities"
              className="text-primary-801 font-bold lg:text-lg md:text-lg text-base 2xl:text-xl"
              aria-label={t("COMMON.SHOW_ALL_EVENTS")}
            >
              {t("COMMON.SHOW.ALL")}
            </Link>
          )}
        </div>
        <EventCard
          events={events}
          onNavigationVisibilityChange={(isVisible) =>
            setNavigationVisibility(isVisible)
          }
          is_homepage={true}
          currentUser={user}
        />
      </div>
    </div>
  );
}
