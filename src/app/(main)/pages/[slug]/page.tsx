/**
 * Generic renderer for any page published in the dashboard's "Pages" section.
 * Slugs that own a bespoke route (`about`, `privacy`, `terms`) redirect there
 * so each page keeps a single canonical URL.
 */
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import CmsPageView from "@/features/cms/components/CmsPageView";
import { CMS_PAGE_ROUTES } from "@/features/shared";
import { fetchCmsPage, fetchCmsPages } from "@/features/cms/services/server";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";

export const revalidate = 300;

export async function generateStaticParams() {
  const pages = await fetchCmsPages();
  return pages
    .filter((page) => !CMS_PAGE_ROUTES[page.slug])
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchCmsPage(slug);
  if (!page) return { title: "Page not found" };
  return { title: page.title_en || page.title_ar || page.slug };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (CMS_PAGE_ROUTES[slug]) redirect(CMS_PAGE_ROUTES[slug]);

  const page = await fetchCmsPage(slug);
  if (!page) notFound();

  return (
    <CmsPageView
      titleEn={page.title_en}
      titleAr={page.title_ar}
      contentEn={sanitizeCmsHtml(page.content_en)}
      contentAr={sanitizeCmsHtml(page.content_ar)}
    />
  );
}
