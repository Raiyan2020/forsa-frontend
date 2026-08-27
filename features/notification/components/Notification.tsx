"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TfiEye } from "react-icons/tfi";
import { HiEye } from "react-icons/hi";
import { RxCross1 } from "react-icons/rx";

import Title from "@/components/shared/Title";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { NOTIFICATIONS_QUERY_KEY } from "@/components/shared/NotificationSync";
import {
  deleteNotifications,
  getNotifications,
  markNotificationsRead,
} from "@/features/services/api";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useNotificationStore } from "@/store/notificationStore";

type NotificationType = "message" | "registration" | "reminder";

interface NotificationItem {
  id: string;
  type: NotificationType;
  message_en: string;
  message_ar: string;
  title_en: string;
  title_ar: string;
  date: string;
  read: boolean;
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export default function Notification() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const selectedLanguage = useLanguageStore((s) => s.language);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);

  // Shares its cache entry with NotificationSync's poller, so this only
  // re-fetches when the cached page is stale.
  const authToken = useAuthStore((s) => s.user?.auth_token);
  const { data, isLoading } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: getNotifications,
    enabled: Boolean(authToken),
  });
  const apiNotifications = data?.data;

  // Local store updates keep the header badge in sync without waiting for a poll.
  const updateReadStatus = useNotificationStore((s) => s.updateReadStatus);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  const refetchNotifications = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const markReadMutation = useMutation({ mutationFn: markNotificationsRead });
  const deleteMutation = useMutation({ mutationFn: deleteNotifications });

  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const notifications: NotificationItem[] = useMemo(() => {
    if (!Array.isArray(apiNotifications)) {
      return [];
    }

    // The API nests the localized copy under a `notification` object:
    // { id, is_read, created_at, notification: { title_en, title_ar, message_en, message_ar } }
    return apiNotifications.map((item) => {
      let type: NotificationType = "message";
      const messageEnLower = item.notification?.message_en?.toLowerCase() || "";
      if (messageEnLower.includes("registered")) {
        type = "registration";
      } else if (messageEnLower.includes("reminder")) {
        type = "reminder";
      }

      return {
        id: item.id.toString(),
        type,
        message_en: item.notification?.message_en || "",
        message_ar: item.notification?.message_ar || "",
        title_en: item.notification?.title_en || "",
        title_ar: item.notification?.title_ar || "",
        date: formatDate(item.created_at),
        read: item.is_read,
      };
    });
  }, [apiNotifications]);

  const [displayNotifications, setDisplayNotifications] =
    useState<NotificationItem[]>(notifications);

  useEffect(() => {
    setDisplayNotifications(notifications);
  }, [notifications]);

  const openNotificationModal = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setOpen(true);
  };

  const markAsRead = async (id: string, currentReadStatus: boolean) => {
    try {
      const newReadStatus = !currentReadStatus;
      await markReadMutation.mutateAsync({
        notification_ids: [parseInt(id)],
        is_read: newReadStatus,
      });

      // Update local display state
      setDisplayNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: newReadStatus }
            : notification
        )
      );

      // Update the shared store so the header badge reacts immediately
      updateReadStatus(parseInt(id), newReadStatus);

      // Still refetch for consistency
      refetchNotifications();

      toast.success(
        t(
          newReadStatus
            ? "COMMON.TOAST.NOTIFICATION_MARKED_SUCCESS"
            : "COMMON.TOAST.NOTIFICATION_MARKED_UNREAD_SUCCESS"
        )
      );
    } catch (err) {
      console.error("Failed to update notification read status:", err);
      toast.error(t("COMMON.TOAST.NOTIFICATION_MARK_FAILED"));
    }
  };

  const markAllAsRead = async () => {
    try {
      await markReadMutation.mutateAsync({ mark_all: true, is_read: true });

      setDisplayNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      // Zeroes the header badge without waiting for the next poll
      markAllRead();
      refetchNotifications();

      toast.success(t("COMMON.TOAST.NOTIFICATION_MARKED_SUCCESS"));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      toast.error(t("COMMON.TOAST.NOTIFICATION_MARK_FAILED"));
    }
  };

  const removeNotificationHandler = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ notification_ids: [parseInt(id)] });

      // Update local display state
      setDisplayNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      );

      // Update the shared store so the header badge reacts immediately
      removeNotification(parseInt(id));

      // Still refetch for consistency
      refetchNotifications();

      toast.success(t("COMMON.TOAST.NOTIFICATION_DELETE_SUCCESS"));
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error(t("COMMON.TOAST.NOTIFICATION_DELETE_FAILED"));
    }
  };

  const getNotificationIcon = (read: boolean) => (
    <Image
      src={
        read
          ? "/assets/notification/notificationtrue.svg"
          : "/assets/notification/notificationicn.svg"
      }
      alt=""
      width={32}
      height={32}
    />
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSelectedNotification(null);
        }}
        title={t("COMMON.NOTIFICATION_DETAIL")}
        size="md"
      >
        {selectedNotification && (
          <div dir={selectedLanguage === "ar" ? "rtl" : "ltr"}>
            <h2 className="text-primary-5 text-lg font-bold pb-1">
              {selectedLanguage === "ar"
                ? selectedNotification.title_ar
                : selectedNotification.title_en}
            </h2>
            <p className="text-sm text-[#717171] pb-4">
              {selectedNotification.date}
            </p>
            <p className="whitespace-pre-line text-[#222222] leading-relaxed">
              {(selectedLanguage === "ar"
                ? selectedNotification.message_ar
                : selectedNotification.message_en
              ).replace(/<br>/g, "\n")}
            </p>
          </div>
        )}
      </Modal>

      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] py-[40px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex">
            <Title text={t("COMMON.NOTIFICATIONS")} variant="default" />
          </h2>

          {displayNotifications.some((notification) => !notification.read) && (
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markReadMutation.isPending}
              className="text-primary-5 hover:text-primary-6 disabled:opacity-50 underline text-base mobilescreen:text-sm"
            >
              {t("COMMON.MARK_ALL_AS_READ")}
            </button>
          )}
        </div>

        <div className="bg-[#e8e8e8]">
          {displayNotifications.length === 0 ? (
            <div className="py-8 2xl:px-5 px-3 text-center text-[#717171]">
              {t("COMMON.NO_NOTIFICATIONS")}
            </div>
          ) : (
            displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative flex items-center gap-4 py-8 2xl:px-5 px-3 ${
                  notification.read
                    ? "bg-[#E8E8E8] border-b border-[#000]/20"
                    : "bg-white border-b border-[#000]/20"
                }`}
              >
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.read)}
                </div>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => openNotificationModal(notification)}
                >
                  <p className="text-[#222222] font-semibold 2xl:text-lg lg:text-base md:text-base xss:text-sm xss:leading-[18px]">
                    {selectedLanguage === "ar"
                      ? notification.title_ar
                      : notification.title_en}
                  </p>
                  <p className="text-base text-[#717171] mobilescreen:text-xs xss:pt-1">
                    {notification.date}
                  </p>
                </div>
                <div
                  className={`flex flex-shrink-0 items-center gap-2 mobilescreen:absolute ${
                    selectedLanguage === "ar"
                      ? "mobilescreen:left-0"
                      : "mobilescreen:right-0"
                  } mobilescreen:top-0`}
                >
                  <button
                    onClick={() => markAsRead(notification.id, notification.read)}
                    className="rounded-full p-1 hover:bg-[#e8e8e8]"
                    aria-label="Mark as read/unread"
                  >
                    {notification.read ? (
                      <TfiEye size={windowWidth <= 767 ? 20 : 24} />
                    ) : (
                      <HiEye size={windowWidth <= 767 ? 20 : 24} />
                    )}
                  </button>
                  <button
                    onClick={() => removeNotificationHandler(notification.id)}
                    className="rounded-full p-1 hover:bg-[#e8e8e8]"
                    aria-label="Dismiss"
                  >
                    <RxCross1 size={windowWidth <= 767 ? 16 : 20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
