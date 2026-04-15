"use client";

import { ChevronRight } from "lucide-react";
import { BreadcrumbSegment } from "@/lib/breadcrumb";

interface BreadcrumbNavigatorProps {
  segments: BreadcrumbSegment[];
  currentPageID: string;
  onNavigate: (pageID: string | null) => void;
}

export default function BreadcrumbNavigator({
  segments,
  currentPageID,
  onNavigate,
}: BreadcrumbNavigatorProps) {
  return (
    <nav aria-label="Breadcrumb" className="w-full">
      <div className="flex flex-wrap items-center gap-y-1 text-sm">
        {segments.map((segment, index) => {
          const isCurrent = segment.id === currentPageID;
          const isClickable = !isCurrent;

          return (
            <div
              key={`${segment.id ?? "main"}-${index}`}
              className="flex items-center min-w-0"
            >
              <button
                type="button"
                onClick={() => isClickable && onNavigate(segment.id)}
                disabled={!isClickable}
                className={`max-w-55 truncate transition-colors ${
                  isCurrent
                    ? "font-medium text-neutral-600 dark:text-neutral-300 cursor-default"
                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {segment.title}
              </button>

              {index < segments.length - 1 && (
                <ChevronRight
                  size={14}
                  className="mx-1 shrink-0 text-neutral-300 dark:text-neutral-600"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
