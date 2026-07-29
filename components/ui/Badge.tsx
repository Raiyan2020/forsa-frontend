import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const badgeStyles = {
  default:
    "inline-flex items-center rounded-full border border-transparent bg-primary text-primary-foreground xss:text-base px-2.5 py-0.5 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-primary/80",
  secondary:
    "inline-flex items-center rounded-full border border-transparent bg-secondary text-secondary-foreground xss:text-base px-2.5 py-0.5 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80",
  destructive:
    "inline-flex items-center rounded-full border border-transparent bg-destructive text-destructive-foreground xss:text-base px-2.5 py-0.5 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive/80",
  outline:
    "inline-flex items-center rounded-full border text-foreground px-2.5 py-0.5 text-base font-semibold transition-colors xss:text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-[15px] p-4",
};

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return <div className={`${badgeStyles[variant]} ${className}`} {...props} />;
}

export { Badge };
export default Badge;
