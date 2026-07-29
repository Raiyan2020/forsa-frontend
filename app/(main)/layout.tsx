import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/shared/ScrollToTop";
import NotificationSync from "@/components/shared/NotificationSync";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NotificationSync />
      <Header />
      <main className="main-section">
        <ScrollToTop />
        {children}
      </main>
      <Footer />
    </>
  );
}
