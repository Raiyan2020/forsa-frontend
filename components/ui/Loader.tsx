interface LoaderProps {
  inline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Loader({
  inline = false,
  size = "md",
  className = "",
}: LoaderProps) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-12 h-12 border-4",
    lg: "w-16 h-16 border-4",
  };

  if (inline) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div
          className={`border-primary-5 border-t-transparent rounded-full animate-spin ${sizeClasses[size]}`}
        />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-white z-50 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div
          className={`border-primary border-t-transparent rounded-full animate-spin ${sizeClasses[size]}`}
        />
      </div>
    </div>
  );
}

