import React from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

interface SearchbarProps {
  onFilterClick?: () => void;
  placeholder?: string;
  showFilterIcon?: boolean;
  onSearchChange?: (value: string) => void;
  value?: string;
}

const Searchbar: React.FC<SearchbarProps> = ({
  onFilterClick,
  placeholder,
  showFilterIcon = true,
  onSearchChange,
  value,
}) => {
  const { t } = useTranslation();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <div className="searchitms flex items-center bg-white border border-primary-5/20 rounded-full px-4 py-2 md:h-[50px] h-[50px] laptopmain:h-[50px] mobilescreen:h-[60px] xss:rounded-[20px] w-[687px] 2xl:w-[687px] laptopmain:w-[580px] 2xl:h-[55px] lg:w-[450px] md:w-[350px] mobilescreen:w-full">
      <div className="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
        <Image
          src="/assets/profile/searchicn.svg"
          alt="Search"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <input
        type="text"
        placeholder={placeholder || t("COMMON.SEARCH")}
        className="flex-1 outline-none bg-transparent px-2 2xl:text-[25px] lg:text-lg xss:text-base laptopmain:text-xl lg:w-auto md:w-[150px] w-[150px] placeholder:text-[#181822]/80"
        value={value !== undefined ? value : undefined}
        onChange={handleSearchChange}
      />
      {showFilterIcon && (
        <button
          onClick={onFilterClick}
          className="relative w-6 h-6 flex-shrink-0 focus:outline-none"
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
      )}
    </div>
  );
};

export default Searchbar;
