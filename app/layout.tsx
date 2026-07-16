import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import SplashScreen from "@/components/shared/SplashScreen";
import ScrollbarListener from "@/components/shared/ScrollbarListener";

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.trim() !== ""
    ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    : "100000000000-dummyclientid.apps.googleusercontent.com";

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
        <link rel="preconnect" href="https://api.joinforsa.net" />
        <link rel="dns-prefetch" href="https://api.joinforsa.net" />
      </head>
      <body suppressHydrationWarning={true}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <QueryProvider>
            <I18nProvider>
              <SplashScreen>{children}</SplashScreen>
            </I18nProvider>
          </QueryProvider>
        </GoogleOAuthProvider>
        <ScrollbarListener />
      </body>
    </html>
  );
}


