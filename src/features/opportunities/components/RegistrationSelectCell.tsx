"use client";

import Select from "react-select";
import { SelectOption } from "./volunteerListHelpers";

const selectStyles = {
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({ ...base, minWidth: "200px", width: "auto" }),
  control: (base: any) => ({ ...base, minWidth: "150px" }),
};

interface RegistrationSelectCellProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string | undefined) => void | Promise<void>;
  onMenuScrollToBottom: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  placeholder: string;
}

/** The team/role dropdown a registration row can be reassigned from, shared by both columns. */
export default function RegistrationSelectCell({
  options,
  value,
  onChange,
  onMenuScrollToBottom,
  isLoading,
  isDisabled,
  placeholder,
}: RegistrationSelectCellProps) {
  return (
    <div className="relative z-10">
      <Select
        className="w-full"
        options={options}
        value={options.find((option) => option.value === value) || options[0]}
        onChange={async (option: SelectOption | null) => {
          await onChange(option?.value || undefined);
        }}
        onMenuScrollToBottom={onMenuScrollToBottom}
        isLoading={isLoading}
        isDisabled={isDisabled}
        placeholder={placeholder}
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        styles={selectStyles}
        menuShouldBlockScroll={false}
        isSearchable={false}
      />
    </div>
  );
}
