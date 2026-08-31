"use client";

import React from "react";

interface ErrorBlockProps {
  error: string;
  className?: string;
}

export default function ErrorBlock({ error, className = "" }: ErrorBlockProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200/50 rounded-2xl max-w-md mx-auto my-4 text-center ${className}`}>
      <svg className="w-12 h-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="text-[#29246D] font-bold text-lg mb-1">Something went wrong</h3>
      <p className="text-gray-600 text-sm">{error}</p>
    </div>
  );
}
