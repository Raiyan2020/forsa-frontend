/**
 * Contact us — the address/phone/email panel is admin-editable
 * (`GET /home/` → `footer.contact`); the form posts to `POST /contact-us/`.
 */
import type { Metadata } from "next";
import ContactUs from "@/features/info/components/ContactUs";
import { fetchHomeCms } from "@/features/cms/services/server";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact Us",
};

export default async function Page() {
  const cms = await fetchHomeCms();

  return <ContactUs initialContact={cms?.footer?.contact ?? null} />;
}
