"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { verifyVolunteerReport } from "@/features/services/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";

type VerificationStatus = "loading" | "success" | "error";

interface VerifyReportProps {
  uuid: string;
}

export default function VerifyReport({ uuid }: VerifyReportProps) {
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState<string>("");
  const { t } = useTranslation();

  const verifyMutation = useMutation({
    mutationFn: verifyVolunteerReport,
  });

  useEffect(() => {
    const runVerification = async () => {
      if (!uuid) {
        setStatus("error");
        setMessage(t("VERIFY_REPORT.INVALID_UUID"));
        return;
      }

      try {
        const response = await verifyMutation.mutateAsync({ uuid });
        setStatus("success");
        setMessage(response.msg || response.message || t("VERIFY_REPORT.SUCCESS"));
        toast.success(t("VERIFY_REPORT.SUCCESS"));
      } catch (error: any) {
        setStatus("error");
        if (error?.response?.data?.msg || error?.response?.data?.message) {
          setMessage(error.response.data.msg || error.response.data.message);
        } else {
          setMessage(t("VERIFY_REPORT.ERROR"));
        }
        toast.error(t("VERIFY_REPORT.ERROR"));
      }
    };

    runVerification();
  }, [uuid, t]);

  if (verifyMutation.isPending || status === "loading") {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className={`p-6 ${status === "success" ? "bg-green-50" : "bg-red-50"}`}>
          <h2 className="text-2xl font-bold mb-4">
            {status === "success" 
              ? t("VERIFY_REPORT.VERIFICATION_SUCCESSFUL") 
              : t("VERIFY_REPORT.VERIFICATION_FAILED")}
          </h2>
          <p className="text-gray-700">{message}</p>
          
          {status === "success" && (
            <div className="mt-6 bg-green-100 p-4 rounded-md">
              <p className="text-green-800">{t("VERIFY_REPORT.THANK_YOU")}</p>
            </div>
          )}
          
          {status === "error" && (
            <div className="mt-6 bg-red-100 p-4 rounded-md">
              <p className="text-red-800">{t("VERIFY_REPORT.TRY_AGAIN")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
