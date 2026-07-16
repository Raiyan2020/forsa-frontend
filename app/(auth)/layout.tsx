import RedirectIfLoggedIn from "@/components/shared/RedirectIfLoggedIn";
import ScrollToTop from "@/components/shared/ScrollToTop";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RedirectIfLoggedIn>
      <Header />
      <main className="main-section">
        <ScrollToTop />
        {children}
      </main>
      <Footer />
    </RedirectIfLoggedIn>
  );
}
