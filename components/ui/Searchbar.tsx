"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchbarProps {
  onFilterClick?: () => void;
  placeholder?: string;
  showFilterIcon?: boolean;
  onSearchChange?: (value: string) => void;
  value?: string;
  /** Show a clear-filters × badge on the filter icon when filters are active. */
  hasActiveFilters?: boolean;
  /** Called when the user clicks the × badge to reset all filters. */
  onClearFilters?: () => void;
  /** Show a small inline spinner while a search/filter request is in-flight. */
  isLoading?: boolean;
}

const Searchbar: React.FC<SearchbarProps> = ({
  onFilterClick,
  placeholder,
  showFilterIcon = true,
  onSearchChange,
  value,
  hasActiveFilters = false,
  onClearFilters,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <div className="searchitms flex items-center bg-white border border-primary-5/20 rounded-full px-4 py-2 md:h-[50px] h-[50px] laptopmain:h-[50px] mobilescreen:h-[60px] xss:rounded-[20px] w-[687px] 2xl:w-[687px] laptopmain:w-[580px] 2xl:h-[55px] lg:w-[450px] md:w-[350px] mobilescreen:w-full">
      {/* Search icon / spinner */}
      <div className="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
        {isLoading ? (
          <span
            className="block w-5 h-5 rounded-full border-[2.5px] border-primary-5/30 border-t-primary-5 animate-spin"
            aria-label={t("COMMON.LOADING") || "Loading"}
          />
        ) : (
          <Image
            src="/assets/profile/searchicn.svg"
            alt="Search"
            fill
            className="object-contain"
            unoptimized
          />
        )}
      </div>

      <input
        type="text"
        placeholder={placeholder || t("COMMON.SEARCH")}
        className="flex-1 outline-none bg-transparent px-2 2xl:text-[25px] lg:text-lg xss:text-base laptopmain:text-xl lg:w-auto md:w-[150px] w-[150px] placeholder:text-[#181822]/80"
        value={value !== undefined ? value : undefined}
        onChange={handleSearchChange}
      />

      {showFilterIcon && (
        <div className="relative flex-shrink-0 flex items-center gap-1">
          <button
            onClick={onFilterClick}
            className="relative w-6 h-6 focus:outline-none"
            aria-label={t("COMMON.FILTER") || "Filter"}
          >
            <Image
              src="/assets/profile/filter.svg"
              alt=""
              fill
              className="object-contain"
              unoptimized
            />
          </button>

          {/* Clear-filters badge — only shown when at least one filter is active */}
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearFilters?.();
              }}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-5 hover:bg-primary-5/80 transition-colors focus:outline-none"
              aria-label={t("COMMON.CLEAR_FILTERS") || "Clear filters"}
              title={t("COMMON.CLEAR_FILTERS") || "Clear filters"}
            >
              <X className="w-3 h-3 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Searchbar;
