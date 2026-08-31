"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Splash screen that shows the Fursa logo while the app initialises.
 *
 * The artificial 2-second minimum wait has been removed.
 * The logo is visible only during the natural JS hydration window
 * (~300–700 ms on a fast connection) so it never blocks LCP.
 *
 * The component hides itself as soon as React has mounted, with a
 * short 300 ms fade-out so the transition still feels polished.
 */
export default function SplashScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Hide on first paint after hydration — no artificial delay.
    setFadeOut(true);
    const timer = setTimeout(() => setShow(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Splash overlay — fades out immediately after hydration */}
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${
          fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden="true"
      >
        <div className="relative w-[148px] h-[69px] mobilescreen:w-[100px] mobilescreen:h-[44px]">
          <Image
            src="/assets/auth/logo.svg"
            alt="Fursa"
            fill
            sizes="(max-width: 768px) 100px, 148px"
            className="object-contain"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Page content is rendered immediately — not blocked behind splash */}
      <div>{children}</div>
    </>
  );
}
