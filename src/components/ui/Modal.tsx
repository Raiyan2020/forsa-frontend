"use client";

import React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/helpers";

const modalVariants = cva("fixed inset-0 z-[99] flex", {
  variants: {
    position: {
      default: "items-center justify-center py-16 sm:py-8",
      top: "items-start justify-center pt-16 sm:pt-8",
      bottom: "items-end justify-center pb-16 sm:pb-8",
    },
  },
  defaultVariants: {
    position: "default",
  },
});

const modalContentVariants = cva(
  "bg-white rounded-md shadow-lg relative overflow-hidden flex flex-col",
  {
    variants: {
      size: {
        sm: "w-full 2xl:w-[811px] lg:w-[811px] md:w-[811px] ml-5 mr-5 rounded-[30px]",
        md: "2xl:w-[1140px] lg:w-[1000px] md:w-[900px] w-full ml-5 mr-5 rounded-[30px]",
        lg: "w-full max-w-lg",
        xl: "w-full max-w-xl",
        "2xl": "w-full max-w-2xl",
        full: "w-full max-w-[95vw]",
        small: "w-[800px] ml-5 mr-5 rounded-[30px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalContentVariants> {
  open?: boolean;
  onClose?: () => void;
  closeOnOutsideClick?: boolean;
  showCloseButton?: boolean;
  title?: string;
  footer?: React.ReactNode;
  position?: "default" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "small";
  disableFilterModalClass?: boolean;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      children,
      position,
      size,
      open = false,
      onClose,
      closeOnOutsideClick = true,
      showCloseButton = true,
      title,
      footer,
      disableFilterModalClass = false,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(open);

    React.useEffect(() => {
      setIsVisible(open);

      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }

      return () => {
        document.body.style.overflow = "";
      };
    }, [open]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && closeOnOutsideClick && onClose) {
        onClose();
      }
    };

    if (!isVisible) return null;

    return (
      <div
        className={cn(modalVariants({ position }))}
        onClick={handleBackdropClick}
        aria-modal="true"
        role="dialog"
        {...props}
      >
        <div className="fixed inset-0 bg-[#000000]/80" aria-hidden="true" />
        <div
          ref={ref}
          className={cn(
            modalContentVariants({ size }),
            !disableFilterModalClass && "filtermodal",
            "max-h-[calc(100vh-100px)]",
            className
          )}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b-2 border-[#727272] laptop:py-4 lg:py-4 py-4 2xl:px-9 px-9">
              {title && (
                <h2 className="font-bold text-primary-5 2xl:text-[32px] lg:text-[24px] text-[22px] extrasmall:text-[16px] xss:text-[20px] xsl:text-[25px] xss1:text-[14px]">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto rtl:ml-0 flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-6 w-6 text-[#222222]" />
                </button>
              )}
            </div>
          )}
          <div className="flex-1 2xl:px-[40px] lg:px-[30px] px-[30px] mobilescreen:px-[20px] lg:pt-6 pt-[20px] lg:pb-6 pb-[20px] overflow-y-auto bg-white">
            {children}
            {footer && <div className="">{footer}</div>}
          </div>
        </div>
      </div>
    );
  }
);
Modal.displayName = "Modal";

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 pb-0", className)}
    {...props}
  />
));
ModalHeader.displayName = "ModalHeader";

const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-xl font-semibold text-[#170a51]", className)}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 p-4 overflow-y-auto scrollbar-hide", className)}
    {...props}
  />
));
ModalBody.displayName = "ModalBody";

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end gap-2 p-4 pt-0", className)}
    {...props}
  />
));
ModalFooter.displayName = "ModalFooter";

export { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter };
