import Faq from "@/features/info/components/Faq";

async function fetchFaqs() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/faqs/?page=1&limit=1000`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  if (!res.ok) {
    throw new Error("Failed to fetch FAQs");
  }
  return res.json();
}

export default async function Page() {
  let initialFaqs = [];
  try {
    const response = await fetchFaqs();
    initialFaqs = response?.data || [];
  } catch (err) {
    console.error("Error fetching FAQs on server:", err);
  }

  return <Faq initialFaqs={initialFaqs} />;
}

