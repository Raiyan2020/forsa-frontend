import React from "react";

enum BtnSize {
  SMALL = "small",
  MEDIUM = "medium",
  XS = "xs",
  LARGE = "large",
  MODAL = "modal",
  XSS = "xss",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "custom"
    | "selectable"
    | "secondarys"
    | "orange"
    | "blue";
  size?: "small" | "medium" | "xs" | "large" | "modal" | "xss";
  isSelected?: boolean;
  /**
   * Shows a spinner inside the button and blocks further clicks. Use this for
   * work the button itself started — a page-covering overlay is the wrong
   * feedback for a form submit.
   */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = BtnSize.SMALL,
      isSelected = false,
      loading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClassNames =
      "transition focus:outline-none text-center flex justify-center items-center gap-2 opacity-100 focus:ring-2 font-bold text-base";

    const variantClassNames = {
      primary: "bg-primary-5 text-white",
      secondary: "bg-[#F4F4F7] text-primary-5",
      secondarys: "bg-primary-5 text-primary-400 text-white",
      danger: "bg-red-500 focus:bg-red-400 text-white",
      selectable: `p-[8.5px] border border-secondary-20 text-sm font-normal rounded-[24px] bg-secondary-10 text-seconday-250 ${
        isSelected ? "text-white" : ""
      }`,
      custom: "",
      orange: "bg-primary-801 text-white",
      blue: "bg-primary-802 text-white",
    };

    const sizeClassNames = {
      [BtnSize.SMALL]: "h-[48px] rounded-[10px]",
      [BtnSize.MEDIUM]:
        "w-[160px] h-[50px] 2xl:h-[60px] 2xl:w-[190px] rounded-[30px] 2xl:text-[20px] lg:text-[14px] laptop:w-[180px] lg:w-[150px] lg:h-[50px] laptop:rounded-[30px] laptop:h-[50px] laptopmain:h-[50px] xss:rounded-[30px]",
      [BtnSize.XS]: "h-[50px] lg:h-[40px] w-[122px] rounded-[30px]",
      [BtnSize.XSS]:
        "2xl:h-[50px] w-[122px] lg:h-[40px] h-[40px] rounded-[30px] xss:rounded-[30px]",
      [BtnSize.LARGE]: "h-[59px] w-[100%] rounded-[15px] text-xl",
      [BtnSize.MODAL]: "h-[66px] w-[415.45px] rounded-[15px] text-xl",
    };

    const buttonClassNames = [
      baseClassNames,
      size ? sizeClassNames[size] : "",
      variantClassNames[variant],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        className={buttonClassNames}
        ref={ref}
        {...props}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading && (
          <span
            aria-hidden="true"
            // `border-current` so the spinner takes the button's text colour on
            // every variant, dark-on-light and light-on-dark alike.
            className="inline-block shrink-0 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
