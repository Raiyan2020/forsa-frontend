"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  totalVolunteerHours: string;
  volOppCompleted: number;
  learnserveOppCompleted: number;
  reliefTrips: number;
}

const options = {
  rotation: 80,
  circumference: 360,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
};

export default function DonutChart({
  totalVolunteerHours,
  volOppCompleted,
  learnserveOppCompleted,
  reliefTrips,
}: DoughnutChartProps) {
  const safeVolOppCompleted = volOppCompleted ?? 0;
  const safeLearnserveOppCompleted = learnserveOppCompleted ?? 0;
  const safeReliefTrips = reliefTrips ?? 0;
  const safeTotalVolunteerHours = totalVolunteerHours ?? "0";

  const data = {
    labels: ["Purple", "Blue", "Lime"],
    datasets: [
      {
        data: [safeVolOppCompleted, safeLearnserveOppCompleted, safeReliefTrips],
        backgroundColor: ["#9F6DEE", "#5271FF", "#D9EF61"],
        borderColor: "#fff",
        hoverBorderColor: "#C8C8C8",
        borderWidth: 10,
        cutout: "60%",
      },
    ],
  };

  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.dir() === "rtl";
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    const handleLanguageChange = () => {
      setChartKey((prev) => prev + 1);
    };

    i18n.on("languageChanged", handleLanguageChange);
    setChartKey((prev) => prev + 1);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n, safeTotalVolunteerHours]);

  const centerTextPlugin = {
    id: "centerText",
    beforeDraw: (chart: any) => {
      const { width, height } = chart;
      const ctx = chart.ctx;
      ctx.restore();

      const text1 = safeTotalVolunteerHours || "0";
      const text2 = t("COMMON.VOLUNTEER.HOUR");

      ctx.textAlign = isRTL ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";

      ctx.font = `700 36px ${
        isRTL ? "'Noto Sans Arabic', sans-serif" : "'Open Sans', sans-serif"
      }`;
      const text1Width = ctx.measureText(text1).width;
      const text1X = isRTL
        ? width / 2 + text1Width / 2
        : (width - text1Width) / 2;
      const text1Y = height / 2 - 20;
      ctx.fillText(text1, text1X, text1Y);

      ctx.font = `600 18px ${
        isRTL ? "'Noto Sans Arabic', sans-serif" : "'Open Sans', sans-serif"
      }`;
      const text2Width = ctx.measureText(text2).width;
      const paddingTop = 15;
      const text2X = isRTL
        ? width / 2 + text2Width / 2
        : (width - text2Width) / 2;
      const text2Y = text1Y + 30 + paddingTop;

      ctx.fillText(text2, text2X, text2Y);
      ctx.save();
    },
  };

  return (
    <div className="relative w-full mobilescreen:w-[90%] mx-auto mobilescreen:flex mobilescreen:justify-center mobilescreen:pb-5">
      <Doughnut
        key={chartKey}
        className="2xl:w-[360px] lg:!w-[350px] lg:!h-[350px] md:!w-[400px] md:!h-[400px] w-[300px]"
        data={data}
        options={options}
        plugins={[centerTextPlugin]}
      />
    </div>
  );
}
