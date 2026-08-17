/**
 * Terms of use — content is admin-editable (`GET /pages/terms/`).
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CmsPageView from "@/features/cms/components/CmsPageView";
import { fetchCmsPage } from "@/lib/api/server";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchCmsPage("terms");
  return { title: page?.title_en || "Terms of Use" };
}

export default async function Page() {
  const page = await fetchCmsPage("terms");
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
