/**
 * Terms of use — content is admin-editable (`GET /pages/terms/`).
 */
import type { Metadata } from "next";
import CmsPageView from "@/features/cms/components/CmsPageView";
import TermsOfUse from "@/features/info/components/TermsOfUse";
import { fetchCmsPage } from "@/features/cms/services/server";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchCmsPage("terms");
  return { title: page?.title_en || "Terms of Use" };
}

export default async function Page() {
  const page = await fetchCmsPage("terms");

  // The CMS page is admin-editable; until one is published, fall back to the
  // static translated terms instead of rendering the not-found page.
  if (!page) return <TermsOfUse />;

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
