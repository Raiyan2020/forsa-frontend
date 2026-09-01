/**
 * Privacy policy — content is admin-editable (`GET /pages/privacy/`).
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CmsPageView from "@/features/cms/components/CmsPageView";
import { fetchCmsPage } from "@/features/cms/services/server";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchCmsPage("privacy");
  return { title: page?.title_en || "Privacy Policy" };
}

export default async function Page() {
  const page = await fetchCmsPage("privacy");
  if (!page) notFound();

  return (
    <CmsPageView
      titleEn={page.title_en}
      titleAr={page.title_ar}
      contentEn={sanitizeCmsHtml(page.content_en)}
      contentAr={sanitizeCmsHtml(page.content_ar)}
      withBanner={false}
    />
  );
}
