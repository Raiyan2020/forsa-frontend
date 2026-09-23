"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import EmailVerificationForm from "@/features/auth/components/EmailVerificationForm";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import LoginForm from "@/features/auth/components/LoginForm";
import RegisterVolunteerModalForm from "@/features/auth/components/RegisterVolunteerModalForm";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import VolunteerMandateDetails from "@/features/auth/components/VolunteerMandateDetails";
import { NAV_STATE_KEYS, clearNavState, getNavState } from "@/lib/navigationState";
import ConfirmVolunteerRegistrationModal from "../ConfirmVolunteerRegistrationModal";
import UnregisterConfirmationModal from "../UnregisterConfirmationModal";
import VolunteerRegisterRoleModal, {
  VOLUNTEER_ROLE_REGISTRATION_FORM_ID,
  type OpportunityRegistrationDetails,
} from "../VolunteerRegisterRoleModal";

/**
 * Which body the main dialog shows. Named, where the page used to pass the
 * magic numbers 1–5 around and a comment to decode them.
 */
export type RegistrationStep =
  | "login"
  | "signup"
  | "roles"
  | "confirm"
  | "unregister";

const STEP_TITLE_KEYS: Record<RegistrationStep, string> = {
  login: "COMMON.JOINUS",
  signup: "COMMON.SIGN.UP",
  roles: "COMMON.ROLE",
  confirm: "COMMON.CONFIRM_REGISTRATION",
  unregister: "COMMON.CONFIRM_UNREGISTRATION",
};

interface RegistrationFlowModalsProps {
  /** The open step, or null when the flow is closed. */
  step: RegistrationStep | null;
  onStepChange: (step: RegistrationStep | null) => void;
  opportunityId: string;
  organizationId?: string;
  opportunityDetails: OpportunityRegistrationDetails;
  refetch: () => void;
}

/**
 * Everything between "Register" and a registration: sign in, sign up, email
 * verification, forgot / reset password, profile completion, the role picker
 * and the two confirmations.
 *
 * The page only decides *where the flow starts* — which step `step` opens on.
 * Every hop after that (login → sign-up, login → forgot password, verification
 * → reset → back to login) happens in here, which is why the five secondary
 * dialogs and their state live here too rather than on the page.
 *
 * It also owns the LinkedIn hand-off: a LinkedIn sign-up bounces through
 * `/linkedin-callback` and lands back on this page with the new user's profile
 * stashed, and profile completion is one of this flow's dialogs.
 */
export default function RegistrationFlowModals({
  step,
  onStepChange,
  opportunityId,
  organizationId,
  opportunityDetails,
  refetch,
}: RegistrationFlowModalsProps) {
  const { t } = useTranslation();

  /** The role picker's form reports its own submit state to the footer button. */
  const [isSubmittingRoles, setIsSubmittingRoles] = useState(false);

  const [verification, setVerification] = useState<{
    email: string;
    otpType: string;
  } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState<{
    email: string;
    token: string;
  } | null>(null);
  // The mandate form types its user payload loosely; this is its input.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mandateUser, setMandateUser] = useState<any>(null);

  const close = () => onStepChange(null);

  // Pick up a LinkedIn sign-up once and clear it, so a refresh does not
  // reopen profile completion.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkedinNewUser = getNavState<any>(NAV_STATE_KEYS.linkedinNewUser);
    if (!linkedinNewUser) return;
    clearNavState(NAV_STATE_KEYS.linkedinNewUser);
    // Reading sessionStorage is the external system being synchronized here;
    // it is unavailable during render, so this cannot move into state init.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMandateUser(linkedinNewUser);
  }, []);

  const showEmailVerification = (email: string, otpType: string) =>
    setVerification({ email, otpType });

  const showLogin = () => onStepChange("login");

  const showForgot = () => {
    setShowForgotPassword(true);
    close();
  };

  const showReset = (email: string, token: string) => {
    setResetPassword({ email, token });
    setVerification(null);
  };

  return (
    <>
      <Modal
        open={step !== null}
        onClose={close}
        title={step ? t(STEP_TITLE_KEYS[step]) : ""}
        size={step === "signup" ? "md" : "sm"}
        disableFilterModalClass
        footer={
          step === "roles" ? (
            <div className="flex justify-center w-full gap-5">
              <Button
                variant="primary"
                size="medium"
                type="submit"
                form={VOLUNTEER_ROLE_REGISTRATION_FORM_ID}
                className="xss:!w-full"
                disabled={isSubmittingRoles}
              >
                {t("COMMON.CONFIRM")}
              </Button>
            </div>
          ) : null
        }
      >
        {step === "login" ? (
          <LoginForm
            isModal
            onClose={close}
            onShowEmailVerification={(email) => {
              close();
              showEmailVerification(email, "register");
            }}
            onShowRegistration={() => onStepChange("signup")}
            onShowVolunteerMandateDetails={setMandateUser}
            onShowForgotPassword={showForgot}
          />
        ) : step === "signup" ? (
          <RegisterVolunteerModalForm
            onClose={close}
            onShowEmailVerification={showEmailVerification}
            onShowVolunteerMandateDetails={setMandateUser}
          />
        ) : step === "confirm" ? (
          <ConfirmVolunteerRegistrationModal
            opportunityId={opportunityId}
            onClose={close}
            refetch={refetch}
            organizationId={organizationId}
            opportunityDetails={opportunityDetails}
          />
        ) : step === "unregister" ? (
          <UnregisterConfirmationModal
            opportunityId={opportunityId}
            onClose={close}
            refetch={refetch}
          />
        ) : step === "roles" ? (
          <VolunteerRegisterRoleModal
            opportunityId={opportunityId}
            organizationId={organizationId}
            onLoadingChange={setIsSubmittingRoles}
            onClose={close}
            opportunityDetails={opportunityDetails}
          />
        ) : null}
      </Modal>

      <Modal
        open={verification !== null}
        onClose={() => setVerification(null)}
        title={t("COMMON.EMAIL_VERIFICATION")}
        size="md"
      >
        <EmailVerificationForm
          email={verification?.email ?? ""}
          otp_type={verification?.otpType ?? ""}
          onClose={() => setVerification(null)}
          onShowLogin={showLogin}
          onShowResetPassword={showReset}
          isModal
        />
      </Modal>

      <Modal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        title={t("COMMON.FORGOT_PASSWORD")}
        size="sm"
      >
        <ForgotPasswordForm
          onShowEmailVerification={showEmailVerification}
          onClose={() => setShowForgotPassword(false)}
          isModal
        />
      </Modal>

      <Modal
        open={resetPassword !== null}
        onClose={() => setResetPassword(null)}
        title={t("COMMON.RESET_PASSWORD")}
        size="md"
      >
        <ResetPasswordForm
          email={resetPassword?.email ?? ""}
          token={resetPassword?.token ?? ""}
          onClose={() => setResetPassword(null)}
          onShowLogin={showLogin}
          isModal
        />
      </Modal>

      <Modal
        open={mandateUser !== null}
        onClose={() => setMandateUser(null)}
        title={t("COMMON.COMPLETEYOURDETAILS")}
        size="md"
      >
        <VolunteerMandateDetails
          userData={mandateUser}
          onClose={() => setMandateUser(null)}
          isModal
        />
      </Modal>
    </>
  );
}
