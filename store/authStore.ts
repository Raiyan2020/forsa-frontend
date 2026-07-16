import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic: string | null;
  social_media_id: string | null;
  social_media_provider: "google" | "linkedin" | null;
  user_type: "individual" | "organization" | "volunteer";
  manual_id: string;
  is_new_user: boolean;
  is_verified: boolean | null;
  is_banned?: boolean;
  auth_token: string;
  organization?: {
    id: number;
    organization_status: "pending" | "approved" | "rejected";
  };
}

interface AuthState {
  user: User | null;
  isActiveLogout: boolean;
  profilePicTimestamp: number | null;
  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  updateProfilePic: (url: string) => void;
  updateUser: (data: Partial<User>) => void;
  resetLogoutFlag: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isActiveLogout: false,
      profilePicTimestamp: null,

      setUser: (user) =>
        set({ user, isActiveLogout: false }),

      logout: () =>
        set({ user: null, isActiveLogout: true, profilePicTimestamp: null }),

      updateProfilePic: (url) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, profile_pic: url }, profilePicTimestamp: Date.now() });
        }
      },

      updateUser: (data) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      resetLogoutFlag: () => set({ isActiveLogout: false }),
    }),
    {
      name: "fursa-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
