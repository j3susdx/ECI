"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            "transition-colors duration-200",
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-110"
          )}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => !disabled && setHoverValue(0)}
          onClick={() => !disabled && onChange(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-all duration-200",
              hoverValue >= star || value >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-muted-foreground hover:text-yellow-400"
            )}
          />
        </button>
      ))}
    </div>
  );
}
