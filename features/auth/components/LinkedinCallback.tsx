"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";
import {
  checkUserRequest,
  passSocialInfoRequest,
} from "@/features/auth/api/authApi";
import { API_BASE_URL } from "@/lib/api/config";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useAuthStore } from "@/store/authStore";

export default function LinkedinCallback() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);

  const checkUserMutation = useMutation({ mutationFn: checkUserRequest });
  const passSocialInfoMutation = useMutation({
    mutationFn: passSocialInfoRequest,
  });

  // The callback must fire exactly once; React 18+ StrictMode double-invokes effects.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const stateParam = searchParams.get("state");

        if (!code || !stateParam) {
          toast.error(t("COMMON.TOAST.MISSING_PARAMETERS"));
          router.replace("/");
          return;
        }

        // Decode state
        const decodedState = JSON.parse(atob(stateParam));
        const { user_type, redirect_uri, original_path } = decodedState;

        // Exchange code for token
        const response = await fetch(`${API_BASE_URL}/linkedin/callback/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri }),
        });
        const data = await response.json();

        if (
          (data?.key === "success" || data?.status === "success") &&
          data?.data?.access_token
        ) {
          localStorage.setItem("access_token", data.data.access_token);

          const userData = data.data;
          userData.social_media_provider = "linkedin";
          userData.social_profile_pic_url = userData.picture;
          userData.social_media_id = userData.linkedin_id;

          const checkUserResponse = await checkUserMutation.mutateAsync({
            email: userData.email,
          });
          const isNewUser = checkUserResponse?.data?.email?.is_new_user;

          if (isNewUser) {
            toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));

            // For new users, stash the payload so the opportunity detail page can
            // pick it up and show the volunteer mandate modal.
            setNavState(NAV_STATE_KEYS.linkedinNewUser, userData);

            router.replace(original_path || "/");
            return;
          }

          const finalUserData = {
            social_media_id: userData.linkedin_id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            social_profile_pic_url: userData.picture,
            access_token: data.data.access_token,
            user_type: user_type as "volunteer" | "organization",
            social_media_provider: "linkedin",
          };

          const socialResponse =
            await passSocialInfoMutation.mutateAsync(finalUserData);
          setUser(socialResponse.data);
          toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));

          router.replace(original_path || "/");
        } else {
          toast.error(t("COMMON.TOAST.LINKEDIN_LOGIN_FAILED"));
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error during LinkedIn login:", error);
        toast.error(t("COMMON.TOAST.LINKEDIN_LOGIN_ERROR"));
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex flex-col justify-center items-center">
      {isLoading && <Loader />}
    </div>
  );
}
