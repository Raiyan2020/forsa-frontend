"use client";

import React from "react";

interface TitleProps {
  text: string;
  variant?: "default" | "white" | "green" | "orange" | "blue" | "cyan";
  className?: string;
  hasMargin?: boolean;
  hasPadding?: boolean;
}

const Title: React.FC<TitleProps> = ({
  text,
  variant = "default",
  className = "",
  hasMargin = true,
  hasPadding = false,
}) => {
  const variantClasses = {
    default: "text-primary-5",
    white: "text-white",
    green: "text-primary-505",
    orange: "text-primary-801",
    blue: "text-primary-802",
    cyan: "text-primary-803",
  };

  const marginClasses = hasMargin
    ? "mb-[25px] 2xl:mb-[50px] laptops:mb-[38px] laptop:mb-[38px] laptopmain:mb-[38px] lg:mb-[24px] md:mb-[30px]"
    : "";

  const paddingClasses = hasPadding ? "px-4 py-2" : "";

  return (
    <p
      className={`text-center leading-9 text-[24px] xsl:text-[32px] 2xl:text-[50px] laptopmain:text-[40px] laptop:text-[40px] lg:text-[32px] md:text-[38px] font-bold 
      ${variantClasses[variant]} ${marginClasses} ${paddingClasses} ${className}`}
    >
      {text}
    </p>
  );
};

export default Title;
