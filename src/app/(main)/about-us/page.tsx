/**
 * About us — the prose block is admin-editable (`GET /pages/about/`), while the
 * founders / how-it-works sections stay in the app.
 */
import type { Metadata } from "next";
import AboutUs from "@/features/about/components/AboutUs";
import { fetchCmsPage, fetchHomeCms } from "@/features/cms/services/server";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchCmsPage("about");
  return {
    title: page?.title_en || "About Us",
    description:
      "Learn about Fursa, our founders, vision, mission, and how we connect volunteers with organizations to create community impact.",
  };
}

export default async function Page() {
  const [page, cms] = await Promise.all([fetchCmsPage("about"), fetchHomeCms()]);

  return (
    <AboutUs
      page={
        page
          ? {
              titleEn: page.title_en,
              titleAr: page.title_ar,
              contentEn: sanitizeCmsHtml(page.content_en),
              contentAr: sanitizeCmsHtml(page.content_ar),
            }
          : null
      }
      whyFursa={cms?.why_fursa ?? []}
    />
  );
}
