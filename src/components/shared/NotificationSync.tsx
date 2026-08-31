"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/features/notification/services/notificationApi";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

/**
 * Single polling instance for the whole app — replaces the React app's
 * NotificationProvider. Mounted once in the main layout; everything else reads
 * the synced values out of `useNotificationStore`.
 */
export default function NotificationSync() {
  const authToken = useAuthStore((s) => s.user?.auth_token);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: getNotifications,
    enabled: Boolean(authToken),
    refetchInterval: 10000, // 10 seconds
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (Array.isArray(data?.data)) {
      setNotifications(data.data);
    }
    if (data?.unread_count !== undefined) {
      setUnreadCount(data.unread_count);
    }
  }, [data, setNotifications, setUnreadCount]);

  // Clear the badge as soon as the user signs out.
  useEffect(() => {
    if (!authToken) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [authToken, setNotifications, setUnreadCount]);

  return null;
}
