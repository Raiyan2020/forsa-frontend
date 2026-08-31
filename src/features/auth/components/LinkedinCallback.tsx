"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";
import {
  checkUserRequest,
  linkedinCallbackRequest,
  passSocialInfoRequest,
} from "@/features/auth/services/authApi";
import { getApiErrorMessage, isApiSuccess } from "@/lib/api/errors";
import { getLinkedinRedirectUri, decodeLinkedinState } from "@/lib/auth/linkedin";
import {
  clearSocialSignupState,
  stashSocialProfile,
} from "@/lib/auth/socialSignup";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

/**
 * The single landing spot for every LinkedIn sign-in on the site — LinkedIn only
 * accepts pre-registered redirect URIs, so login, the registration forms and the
 * opportunity modals all come back here and are told apart by the `state` the
 * entry point encoded (see lib/auth/linkedin.ts).
 */
export default function LinkedinCallback() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const selectedLanguage = useLanguageStore((s) => s.language);

  const linkedinCallbackMutation = useMutation({
    mutationFn: linkedinCallbackRequest,
  });
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

        // LinkedIn reports a declined consent screen as ?error=… rather than ?code=….
        const oauthError = searchParams.get("error");
        if (oauthError) {
          toast.error(
            searchParams.get("error_description") ||
              t("COMMON.TOAST.LINKEDIN_LOGIN_FAILED")
          );
          router.replace("/login");
          return;
        }

        if (!code || !stateParam) {
          toast.error(t("COMMON.TOAST.MISSING_PARAMETERS"));
          router.replace("/login");
          return;
        }

        const state = decodeLinkedinState(stateParam);
        if (!state) {
          toast.error(t("COMMON.TOAST.INVALID_LINKEDIN_CALLBACK_STATE"));
          router.replace("/login");
          return;
        }

        const { user_type, return_to, original_path } = state;

        // The backend replays this to LinkedIn, which compares it byte for byte
        // against the authorize call — so send back exactly what was sent out.
        const response = await linkedinCallbackMutation.mutateAsync({
          code,
          redirect_uri: state.redirect_uri || getLinkedinRedirectUri(),
        });

        const profile = response?.data;
        if (response?.key !== "success" || !profile?.email) {
          toast.error(
            response?.msg || t("COMMON.TOAST.LINKEDIN_LOGIN_FAILED")
          );
          router.replace("/login");
          return;
        }

        const userData = {
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          social_media_id: profile.linkedin_id,
          social_media_provider: "linkedin",
          social_profile_pic_url: profile.picture,
        };

        const checkUserResponse = await checkUserMutation.mutateAsync({
          email: userData.email,
        });

        if (checkUserResponse?.data?.email?.is_new_user) {
          toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));

          // A modal-hosted sign-up returns to the page it started on, which
          // re-opens the modal on the volunteer mandate step. Everything else
          // navigates to the matching onboarding route.
          if (original_path) {
            setNavState(NAV_STATE_KEYS.linkedinNewUser, userData);
            router.replace(original_path);
            return;
          }

          stashSocialProfile(userData);
          if (user_type === "volunteer") {
            router.replace("/volunteer-mandate-details");
          } else if (user_type === "organization") {
            router.replace("/complete-details");
          } else {
            router.replace("/joinus");
          }
          return;
        }

        // A returning user has already supplied civil_id / company details, so
        // social-auth can issue the token straight away — and nothing parked by
        // the sign-up form they came from is needed any more.
        const socialResponse = await passSocialInfoMutation.mutateAsync({
          ...userData,
          user_type: user_type ?? null,
        });
        if (!isApiSuccess(socialResponse)) {
          toast.error(
            socialResponse?.msg || t("COMMON.TOAST.LINKEDIN_LOGIN_FAILED")
          );
          router.replace("/login");
          return;
        }
        clearSocialSignupState();
        setUser(socialResponse.data);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        router.replace(return_to || original_path || "/");
      } catch (error) {
        console.error("Error during LinkedIn login:", error);
        toast.error(
          getApiErrorMessage(
            error,
            selectedLanguage,
            t("COMMON.TOAST.LINKEDIN_LOGIN_ERROR")
          )
        );
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
