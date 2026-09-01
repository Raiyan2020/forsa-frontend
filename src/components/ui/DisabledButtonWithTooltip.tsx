"use client";

import { Button, ButtonProps } from "./Button";

export interface DisabledButtonWithTooltipProps extends ButtonProps {
  tooltipText: string;
  disabled?: boolean;
  showTooltip?: boolean; // Controls tooltip visibility independently of `disabled`
  children: React.ReactNode;
}

const DisabledButtonWithTooltip: React.FC<DisabledButtonWithTooltipProps> = ({
  children,
  disabled = false,
  showTooltip = disabled, // Default to showing when disabled
  tooltipText,
  ...buttonProps
}) => (
  <div className="relative inline-block group">
    <Button {...buttonProps} disabled={disabled}>
      {children}
    </Button>
    {showTooltip && disabled && (
      <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap">
        {tooltipText}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-0 border-t-4 border-gray-900 border-solid" />
      </div>
    )}
  </div>
);

export default DisabledButtonWithTooltip;
