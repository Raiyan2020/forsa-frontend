"use client";

import HomepageBannerClient from "@/features/home/components/HomepageBannerClient";
import AboutForsa from "./AboutForsa";
import WhyForsa from "@/features/home/components/WhyForsa";
import Founders from "./Founders";
import HowForsaWork from "./HowForsaWork";

export default function AboutUs() {
  return (
    <>
      <HomepageBannerClient />
      <AboutForsa />
      <WhyForsa />
      <Founders />
      <HowForsaWork />
    </>
  );
}
