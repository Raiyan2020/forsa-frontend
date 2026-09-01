"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/shared/ScrollToTop";
import NotFound from "@/features/shared/components/NotFound";

export default function GlobalNotFound() {
  return (
    <>
      <Header />
      <main className="main-section">
        <ScrollToTop />
        <NotFound />
      </main>
      <Footer />
    </>
  );
}
