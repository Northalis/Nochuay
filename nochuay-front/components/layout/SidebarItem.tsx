"use client";

import { useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { PageNode } from "@/lib/types";

interface SidebarItemProps {
  node: PageNode;
}

export default function SidebarItem({ node }: SidebarItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const paddingLeft = 12 + node.depth * 12;

  return (
    <div>
      <button
        className="flex items-center w-full py-1 text-sm text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 group"
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "8px" }}
        onClick={() => {
          // TODO: navigate to page
        }}
      >
        {/* Expand/Collapse Toggle */}
        <span
          className={`shrink-0 mr-1 transition-transform duration-150 ${
            hasChildren
              ? "opacity-100 cursor-pointer"
              : "opacity-0 pointer-events-none"
          } ${expanded ? "rotate-90" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <ChevronRight size={14} className="text-neutral-400" />
        </span>

        {/* Page Icon */}
        <span className="shrink-0 mr-1.5 text-base leading-none">
          {node.icon || <FileText size={15} className="text-neutral-400" />}
        </span>

        {/* Page Title */}
        <span className="truncate">{node.title}</span>
      </button>

      {/* Recursive Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <SidebarItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
