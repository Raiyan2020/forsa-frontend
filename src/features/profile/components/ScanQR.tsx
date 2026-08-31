"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Formik, Form } from "formik";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import jsQR from "jsqr";

import Loader from "@/components/ui/Loader";
import { markVolunteerAttendance } from "@/features/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface ScanQRProps {
  /** From `/scan-qr/[opportunityId]/[eventId]`; the query string is also honoured. */
  opportunityId?: string;
  eventId?: string;
}

export default function ScanQR({
  opportunityId: opportunityIdProp,
  eventId: eventIdProp,
}: ScanQRProps) {
  const initialValues: { qrCodeImage: File | null } = { qrCodeImage: null };
  const router = useRouter();
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const [qrScannerOpen, setQrScannerOpen] = useState(true);
  const searchParams = useSearchParams();

  const opportunityId =
    opportunityIdProp || searchParams.get("opportunity_id") || undefined;
  const eventId = eventIdProp || searchParams.get("event_id") || undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const { mutateAsync: markAttendance, isPending: isLoading } = useMutation({
    mutationFn: markVolunteerAttendance,
  });

  const stopScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const handleScannedQR = useCallback(
    async (qrData: string) => {
      stopScanner();
      setQrScannerOpen(false);

      // Extract UUID from the verification URL
      let volunteerUuid = qrData;

      try {
        // Check if the scanned data is a URL
        if (qrData.includes("/verify-report/")) {
          const urlParts = qrData.split("/verify-report/");
          if (urlParts.length > 1) {
            volunteerUuid = urlParts[1];
          }
        }

        await markAttendance({
          opportunity_id: opportunityId,
          volunteer_uuid: volunteerUuid,
          event_id: eventId,
        });
        toast.success(t("COMMON.TOAST.ATTENDANCE_MARKED_SUCCESS"));
        // Re-open the scanner so the next volunteer can be scanned
        setTimeout(() => setQrScannerOpen(true), 2500);
      } catch (err: any) {
        const payload = err?.response?.data;
        if (payload?.errors && Object.keys(payload.errors).length > 0) {
          // Handle errors object if it exists
          const errors = payload.errors;
          Object.keys(errors).forEach((key) => {
            const errorMessage =
              errors[key][selectedLanguage] ||
              t("COMMON.TOAST.ATTENDANCE_MARKED_FAILED");
            toast.error(errorMessage);
          });
        } else if (payload?.data?.registration) {
          // Handle nested registration error messages
          const errorMessage =
            payload.data.registration[selectedLanguage] ||
            t("COMMON.TOAST.ATTENDANCE_MARKED_FAILED");
          toast.error(errorMessage);
        } else if (payload?.message_en || payload?.message_ar) {
          // Handle top-level message_en or message_ar
          const errorMessage =
            payload[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.ATTENDANCE_MARKED_FAILED");
          toast.error(errorMessage);
        } else {
          // Fallback for any other error cases
          toast.error(t("COMMON.TOAST.ATTENDANCE_MARKED_FAILED"));
        }

        setTimeout(() => setQrScannerOpen(true), 2500);
      }
    },
    [eventId, markAttendance, opportunityId, selectedLanguage, stopScanner, t]
  );

  const extractQRFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new window.Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleScannedQR(code.data);
        } else {
          toast.error(t("COMMON.NO_QR_FOUNDED"));
          setQrScannerOpen(true);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!qrScannerOpen) return;

    let cancelled = false;

    const scanQRCodeFrames = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const scan = () => {
        if (cancelled) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context?.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = context?.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          if (imageData) {
            try {
              const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height
              );
              if (code) {
                handleScannedQR(code.data);
                return;
              }
            } catch (err) {
              console.error("QR scanning error:", err);
            }
          }
        }
        animationRef.current = requestAnimationFrame(scan);
      };

      scan();
    };

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
        scanQRCodeFrames();
      } catch (err) {
        console.error("Error accessing camera:", err);
        toast.error(t("COMMON.NO_CAMERA_PERMISSIONS"));
        setQrScannerOpen(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [qrScannerOpen, handleScannedQR, stopScanner, t]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="organize-modal" id="qrContainer">
      <div className="modal-content relative pb-5">
        <Formik
          initialValues={initialValues}
          onSubmit={(values) => {
            if (values.qrCodeImage) {
              extractQRFromFile(values.qrCodeImage);
            }
          }}
        >
          {() => (
            <Form>
              <div className="pt-5 flex flex-col items-center">
                <div
                  className="close w-full cursor-pointer"
                  onClick={() => router.back()}
                >
                  <Image
                    src="/assets/auth/rightarrow.svg"
                    alt="Close"
                    width={24}
                    height={24}
                  />
                </div>
                <h2 className="text-2xl font-bold pb-5 pt-10">
                  {t("COMMON.SCAN_QR_CODE")}
                </h2>
                <p className="pb-[55px] text-lg font-normal xss:w-[65%] extrasmall:w-[90%]">
                  {t("COMMON.PLEASE_SCAN_QR_CODE")}
                </p>

                {!qrScannerOpen ? (
                  <div className="qr-scan-area relative flex justify-center items-center">
                    <Image
                      src="/assets/auth/scanner.svg"
                      alt="Scanner"
                      width={280}
                      height={280}
                      className="relative"
                    />
                    <Image
                      src="/assets/auth/qrline.png"
                      className="absolute z-20 scan-line"
                      alt="Scan line"
                      width={280}
                      height={8}
                    />
                  </div>
                ) : (
                  <div className="camera-container relative">
                    <video
                      ref={videoRef}
                      className="w-full max-w-md h-auto rounded-lg"
                      autoPlay
                      playsInline
                      muted
                    />

                    <canvas ref={canvasRef} className="hidden" />
                    <Image
                      src="/assets/auth/qrline.png"
                      className="absolute z-20 scan-line"
                      alt="Scan line"
                      width={280}
                      height={8}
                    />
                    <div className="absolute -inset-1 rounded-3xl pointer-events-none">
                      <div className="absolute -top-0 -left-0 w-16 h-16 border-l-[6px] border-t-[6px] rounded-tl-3xl border-white" />
                      <div className="absolute -top-0 -right-0 w-16 h-16 border-r-[6px] border-t-[6px] rounded-tr-3xl border-white" />
                      <div className="absolute -bottom-0 -left-0 w-16 h-16 border-l-[6px] border-b-[6px] rounded-bl-3xl border-white" />
                      <div className="absolute -bottom-0 right-0 w-16 h-16 border-r-[6px] border-b-[6px] rounded-br-3xl border-white" />
                    </div>
                  </div>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
