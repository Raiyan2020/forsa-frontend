import AboutUs from "@/features/about/components/AboutUs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Fursa, our founders, vision, mission, and how we connect volunteers with organizations to create community impact.",
};

export default function Page() {
  return <AboutUs />;
}


