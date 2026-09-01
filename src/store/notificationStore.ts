import { create } from "zustand";

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  setNotifications: (n: any[]) => void;
  setUnreadCount: (count: number) => void;
  updateReadStatus: (id: number, isRead: boolean) => void;
  markAllRead: () => void;
  removeNotification: (id: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => set({ notifications }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  updateReadStatus: (id, isRead) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find((n) => n.id === id);
    const newCount = target
      ? !target.is_read && isRead
        ? Math.max(0, unreadCount - 1)
        : target.is_read && !isRead
        ? unreadCount + 1
        : unreadCount
      : unreadCount;

    set({
      notifications: notifications.map((n) =>
        n.id === id ? { ...n, is_read: isRead } : n
      ),
      unreadCount: newCount,
    });
  },

  /** Optimistic twin of `POST /notifications/mark-read/ {mark_all: true}`. */
  markAllRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    });
  },

  removeNotification: (id) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find((n) => n.id === id);
    set({
      notifications: notifications.filter((n) => n.id !== id),
      unreadCount: target && !target.is_read
        ? Math.max(0, unreadCount - 1)
        : unreadCount,
    });
  },
}));
