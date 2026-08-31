import Faq from "@/features/info/components/Faq";
import { API_BASE_URL } from "@/lib/api/config";
import { SERVER_API_HEADERS } from "@/lib/api/server";
import type { ApiResponse, FaqItem } from "@/lib/api/types";

async function fetchFaqs(): Promise<ApiResponse<FaqItem[]>> {
  const res = await fetch(`${API_BASE_URL}/faqs/?page=1&limit=1000`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
    headers: SERVER_API_HEADERS,
  });
  if (!res.ok) {
    throw new Error("Failed to fetch FAQs");
  }

  const response = (await res.json()) as ApiResponse<FaqItem[]>;
  if (response.key !== "success" || response.response_status.error) {
    throw new Error(response.msg || "Failed to fetch FAQs");
  }

  return response;
}

export default async function Page() {
  let initialFaqs: FaqItem[] = [];
  try {
    const response = await fetchFaqs();
    initialFaqs = response.data ?? [];
  } catch (err) {
    console.error("Error fetching FAQs on server:", err);
  }

  return <Faq initialFaqs={initialFaqs} />;
}
