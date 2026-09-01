import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/providers/providers";
import SplashScreen from "@/components/shared/SplashScreen";
import ScrollbarListener from "@/components/shared/ScrollbarListener";

export const metadata: Metadata = {
  title: {
    default: "Fursa | Volunteer & Community Platform",
    template: "%s | Fursa",
  },
  description:
    "Fursa connects volunteers with organizations to create meaningful community impact through opportunities, events, and learning.",
  keywords: ["volunteer", "community", "opportunities", "events", "Kuwait"],
  icons: {
    icon: "/assets/homepage/favicon.svg",
    shortcut: "/assets/homepage/favicon.svg",
    apple: "/assets/homepage/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Fursa",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* Preconnect to the API origin so image/data fetches start earlier */}
        <link rel="preconnect" href="https://portal.fursa.raiyan.cc" />
        <link rel="dns-prefetch" href="https://portal.fursa.raiyan.cc" />
      </head>
      <body suppressHydrationWarning={true}>
        <Providers>
          <SplashScreen>{children}</SplashScreen>
        </Providers>
        <ScrollbarListener />
      </body>
    </html>
  );
}

