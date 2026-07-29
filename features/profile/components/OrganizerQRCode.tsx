"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Title from "@/components/shared/Title";
import { useLanguageStore } from "@/store/languageStore";
import QRCode from "./QRCode";

export default function OrganizerQRCode() {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const [activeTab, setActiveTab] = useState("opportunity");

  return (
    <div className="border-t border-[#000]">
      <div className="mobilescreen:py-[40px] mdscreen:py-[40px] w-[100%] m-auto">
        <h2 className="text-start flex w-[90%] m-auto">
          <Title text="QR Code" variant="default" />
        </h2>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          dir={language === "en" ? "ltr" : "rtl"}
        >
          <div className="flex 2xl:px-5 px-3 mobilescreen:px-[13px] w-[90%] m-auto">
            <TabsList className="bg-transparent p-0 h-auto gap-[38px] xs:gap-3">
              <TabsTrigger
                value="opportunity"
                className="relative px-6 xs:px-2 pt-[32px] pb-[29px] mdscreen:w-auto w-[140px] rounded-t-[20px] rounded-b-[0px] data-[state=active]:bg-white border-t border-l border-r data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-primary-5 data-[state=inactive]:border-primary-5 data-[state=active]:text-primary-5 data-[state=active]:font-bold data-[state=inactive]:bg-[#D2D8F6]
                          before:content-[''] before:absolute before:top-[96%] data-[state=active]:before:top-[99%] before:left-0 before:w-full before:h-[3px] before:bg-[#D2D8F6] before:block data-[state=active]:before:bg-[#fff]
                          after:content-[''] after:absolute after:w-[16px] after:h-[1px] after:bg-primary-5 after:left-[-16px] rtl:after:left-[0] rtl:after:right-[-16px] after:bottom-[-1px] after:block"
              >
                <span className="2xl:text-[30px] lg:text-[20px] md:text-[18px] font-bold text-primary-5">
                  Scan My QR Code
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="certificates"
                onClick={() => router.push("/scan-qr")}
                className="open-btn relative px-6 xs:px-2 pt-[32px] pb-[29px] mdscreen:w-auto w-[140px] rounded-t-[20px] rounded-b-[0px] data-[state=active]:bg-[#fff] border-t border-l border-r data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-primary-5 data-[state=inactive]:border-primary-5 data-[state=active]:text-primary-5 data-[state=active]:font-medium data-[state=inactive]:bg-[#D2D8F6]
                   before:content-[''] before:absolute before:top-[96%] data-[state=active]:before:top-[99%] before:left-0 before:w-full before:h-[3px] before:bg-[#D2D8F6] before:hidden data-[state=active]:before:block data-[state=active]:before:bg-[#fff]"
              >
                <span className="2xl:text-[30px] lg:text-[20px] md:text-[18px] text-primary-5 font-bold">
                  Scan QR
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="opportunity"
            className="mt-0 border-t border-primary-5 2xl:pt-16 laptopmain:pt-8 lg:pt-5 pt-5 md:pt-5 lg:pb-[50px] md:pb-[20px] pb-[20px]"
          >
            <div className="w-[90%] m-auto">
              <QRCode />
            </div>
          </TabsContent>

          <TabsContent
            value="certificates"
            className="mt-0 border-t border-primary-5 lg:pt-[50px] md:pt-[20px] pt-[20px] lg:pb-[50px] md:pb-[20px] pb-[20px]"
          >
            <div className="w-[90%] m-auto">Scan QR</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
