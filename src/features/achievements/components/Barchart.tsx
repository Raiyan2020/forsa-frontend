"use client";

import { useState, CSSProperties } from "react";
import { useTranslation } from "react-i18next";

export default function Barchart({
  data,
}: {
  data: { year: string; total_hours: number }[];
}) {
  const { t } = useTranslation();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || !Array.isArray(data)) {
    return (
      <div
        style={{
          fontFamily: "Open Sans",
          padding: "53px 39px",
          margin: "0 auto",
          boxShadow: "0px 4px 4px 0px #00000040",
          border: "1px solid #CBCBCB",
          borderRadius: "8px",
          backgroundColor: "white",
          textAlign: "center",
          color: "#666",
        }}
      >
        {t("COMMON.NO_DATA_AVAILABLE") || "No data available"}
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) =>
    String(a.year).localeCompare(String(b.year))
  );

  const maxDataHours = sortedData?.length
    ? Math.max(...sortedData.map((item) => item.total_hours))
    : 0;
  const buffer = 1.1;
  const maxHours = Math.max(30000, maxDataHours * buffer);
  const chartHeight = 400;
  const barWidth = 60;

  const step = Math.ceil(maxHours / 6000) * 1000;
  const gridLines = [];
  for (let i = 0; i <= maxHours; i += step) {
    gridLines.push(i);
  }

  const chartStyles: Record<string, CSSProperties> = {
    container: {
      paddingLeft: "39px",
      paddingRight: "39px",
      paddingTop: "53px",
      paddingBottom: "53px",
      margin: "0 auto",
      boxShadow: "0px 4px 4px 0px #00000040",
      border: "1px solid #CBCBCB",
      borderRadius: "8px",
      backgroundColor: "white",
      overflowX: "auto" as const,
      maxWidth: "100%",
      marginRight: "0px",
    },
    title: {
      textAlign: "center" as const,
      fontSize: "20px",
      fontWeight: "bold",
      marginBottom: "50px",
    },
    chartArea: {
      position: "relative" as const,
      height: `${chartHeight}px`,
      marginTop: "20px",
      marginLeft: "100px",
      marginBottom: "40px",
      minWidth: `${data?.length * (barWidth + 20)}px`,
    },
    gridLine: {
      position: "absolute" as const,
      width: "100%",
      height: "3px",
      left: 10,
      background: "transparent",
      backgroundImage:
        "linear-gradient(to right, #9F9F9F 10px, transparent 10px)",
      backgroundSize: "25px 10px",
      backgroundRepeat: "repeat-x" as const,
    },
    yAxisLabel: {
      position: "absolute" as const,
      left: "-95px",
      fontSize: "14px",
      color: "#000000",
    },
    barsContainer: {
      display: "flex" as const,
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: "100%",
      alignItems: "flex-end" as const,
      justifyContent: "space-around" as const,
      minWidth: "100%",
    },
    barContainer: {
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      position: "relative" as const,
      top: "30px",
      flex: "0 0 auto" as const,
    },
    bar: {
      width: `${barWidth}px`,
      backgroundColor: "#29246D",
      borderTopLeftRadius: "10px",
      borderTopRightRadius: "10px",
    },
    xAxisLabel: {
      marginTop: "8px",
      fontSize: "14px",
    },
    tooltip: {
      position: "absolute" as const,
      top: "-30px",
      padding: "4px 8px",
      backgroundColor: "rgba(0,0,0,0.8)",
      color: "white",
      borderRadius: "4px",
      fontSize: "14px",
      whiteSpace: "nowrap" as const,
    },
  };

  return (
    <div id="style-1" style={chartStyles.container}>
      <h2 style={chartStyles.title}>{t("COMMON.VOLUNTEER.BARCHAR.TTILE")}</h2>

      <div style={chartStyles.chartArea}>
        {gridLines.map((line, index) => (
          <div key={index}>
            {line !== 0 && (
              <div
                style={{
                  ...chartStyles.gridLine,
                  bottom: `${(line / maxHours) * chartHeight}px`,
                }}
              />
            )}
            <div
              style={{
                ...chartStyles.yAxisLabel,
                bottom: `${(line / maxHours) * chartHeight - 6}px`,
              }}
            >
              {line === 0
                ? "0"
                : `${line / 1000} ${t("ACHIEVEMENTS.THOUSAND")}`}
            </div>
          </div>
        ))}

        <div style={chartStyles.barsContainer}>
          {sortedData?.map((item, index) => (
            <div
              key={index}
              style={chartStyles.barContainer}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {hoverIndex === index && (
                <div style={chartStyles.tooltip}>
                  {item.total_hours.toLocaleString()} hours
                </div>
              )}

              <div
                style={{
                  ...chartStyles.bar,
                  height: `${(item.total_hours / maxHours) * chartHeight}px`,
                }}
              />

              <div style={chartStyles.xAxisLabel}>{item.year}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
