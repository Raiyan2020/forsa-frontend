import RedirectIfLoggedIn from "@/components/shared/RedirectIfLoggedIn";
import ScrollToTop from "@/components/shared/ScrollToTop";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { fetchHomeCms } from "@/features/cms/services/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cms = await fetchHomeCms();

  return (
    <RedirectIfLoggedIn>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="main-section flex-1">
          <ScrollToTop />
          {children}
        </main>
        <Footer footer={cms?.footer ?? null} />
      </div>
    </RedirectIfLoggedIn>
  );
}
