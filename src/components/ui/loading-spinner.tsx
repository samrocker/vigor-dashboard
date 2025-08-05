import React from "react";
import { cn } from "@/lib/utils";

// FIX: Directly use React.HTMLAttributes<HTMLDivElement>
export function LoadingSpinner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <div className="animate-spin rounded-full h-full w-full border-b-2 border-secondary"></div>
    </div>
  );
}