"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import jsQR from "jsqr";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface SelfScanModalProps {
  open: boolean;
  onClose: () => void;
  /** Dialog heading — e.g. "Scan the arrival code". */
  title: string;
  /** One line telling the participant which printed sheet to point at. */
  hint?: string;
  /**
   * Submits the decoded payload. Resolve to close the dialog; reject to keep it
   * open and re-arm the camera, so a wrong or expired sheet can be re-scanned
   * without reopening anything.
   */
  onScan: (code: string) => Promise<void>;
  isPending?: boolean;
}

/**
 * BE-61 — the participant's own camera, pointed at the organizer's printed code.
 *
 * This is the mirror image of `profile/ScanQR.tsx`, which is the *organizer*
 * scanning a volunteer's personal QR — the flow the client retired. The camera
 * plumbing is the same proven one (getUserMedia → canvas → `jsqr` per frame);
 * what differs is who holds the phone and what the payload means.
 *
 * A file picker sits alongside the camera because `getUserMedia` needs a secure
 * context and a camera: it is unavailable on desktop browsers without one, and
 * over plain http on a LAN address during testing. Without the fallback the
 * feature is simply untestable outside a phone on https.
 */
export default function SelfScanModal({
  open,
  onClose,
  title,
  hint,
  onScan,
  isPending = false,
}: SelfScanModalProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  /** Guards against jsQR firing again while the first submit is in flight. */
  const submittingRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  const submit = useCallback(
    async (code: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      stopCamera();
      try {
        await onScan(code);
        onClose();
      } catch {
        // The caller has already surfaced the reason; re-arm so the participant
        // can point at the other sheet without reopening the dialog.
        submittingRef.current = false;
        setScanning(true);
      }
    },
    [onClose, onScan, stopCamera]
  );

  // Decode a still image — the fallback when there is no usable camera.
  const decodeFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0);
        const { data, width, height } = context.getImageData(
          0,
          0,
          image.width,
          image.height
        );
        const found = jsQR(data, width, height);
        if (found) {
          submit(found.data);
        } else {
          setCameraError(t("COMMON.NO_QR_FOUNDED"));
        }
      };
      image.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    submittingRef.current = false;
    setCameraError(null);

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          try {
            const found = jsQR(imageData.data, imageData.width, imageData.height);
            if (found) {
              submit(found.data);
              return;
            }
          } catch (error) {
            console.error("QR scanning error:", error);
          }
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);
        tick();
      } catch (error) {
        console.error("Camera unavailable:", error);
        if (!cancelled) setCameraError(t("COMMON.CAMERA_UNAVAILABLE"));
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // `submit` and `stopCamera` are stable callbacks; re-running on them would
    // restart the camera mid-scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={title}
      size="sm"
    >
      <div className="flex flex-col items-center gap-4 pb-4">
        {hint ? (
          <p className="text-center text-base font-semibold text-secondary-102">
            {hint}
          </p>
        ) : null}

        <div className="relative w-full overflow-hidden rounded-[16px] bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
          {/* A frame to aim with — the decoder reads the whole frame, so this is
              guidance only and deliberately not a crop. */}
          <div className="pointer-events-none absolute inset-8 rounded-[12px] border-4 border-white/80" />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {cameraError ? (
          <p className="text-center text-sm font-semibold text-red-500">
            {cameraError}
          </p>
        ) : (
          <p className="text-center text-sm text-secondary-102">
            {scanning ? t("COMMON.POINT_CAMERA_AT_QR") : t("COMMON.LOADING")}
          </p>
        )}

        <label className="w-full">
          <span className="sr-only">{t("COMMON.UPLOAD_QR_IMAGE")}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) decodeFile(file);
              event.target.value = "";
            }}
          />
          <span className="block cursor-pointer rounded-[20px] bg-[#F4F4F7] py-3 text-center text-sm font-bold text-primary-5">
            {t("COMMON.UPLOAD_QR_IMAGE")}
          </span>
        </label>

        <Button
          variant="secondary"
          size="medium"
          type="button"
          className="xss:!w-full"
          disabled={isPending}
          onClick={() => {
            stopCamera();
            onClose();
          }}
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </Modal>
  );
}
