import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/shared/ScrollToTop";
import NotificationSync from "@/components/shared/NotificationSync";
import { fetchHomeCms } from "@/features/cms/services/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Footer links, socials and copyright are admin-editable. The payload is
  // ISR-cached (60 s) and shared with the homepage, so this costs one request
  // per revalidation window, not one per visitor.
  const cms = await fetchHomeCms();

  return (
    <div className="min-h-screen flex flex-col">
      <NotificationSync />
      <Header />
      <main className="main-section flex-1">
        <ScrollToTop />
        {children}
      </main>
      <Footer footer={cms?.footer ?? null} />
    </div>
  );
}
