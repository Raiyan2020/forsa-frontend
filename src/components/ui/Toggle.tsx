import React from "react";

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, disabled }) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-secondary-100 font-bold">{label}</span>
      <label className={`relative cursor-${disabled ? "default" : "pointer"}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={disabled ? undefined : onChange}
          className="sr-only"
          disabled={disabled}
        />
        <div
          className={`w-[36px] h-[20px] rounded-full shadow-inner transition duration-300 ${
            checked ? "bg-primary-5" : "bg-[#cbcbcb]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <div
          className={`absolute top-[2px] ${
            checked ? "left-[-3px]" : "left-[4px]"
          } w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
            checked ? "translate-x-5" : "translate-x-0"
          } ${disabled ? "cursor-not-allowed" : ""}`}
        />
      </label>
    </div>
  );
};

export default Toggle;
