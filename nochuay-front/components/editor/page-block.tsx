"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Custom "page" block for BlockNote.
 * Renders a clickable card that links to a nested child page,
 * similar to Notion's inline page references.
 */
export const PageBlock = createReactBlockSpec(
  {
    type: "page" as const,
    propSchema: {
      pageId: { default: "" },
      pageTitle: { default: "Untitled" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const router = useRouter();
      const { pageId, pageTitle } = props.block.props;

      return (
        <div
          onClick={() => {
            if (pageId) {
              router.push(`/documents/${pageId}`);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid #e5e5e5",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            backgroundColor: "transparent",
            width: "100%",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <FileText size={20} style={{ color: "#737373", flexShrink: 0 }} />
          <span
            style={{
              color: "#404040",
              fontWeight: 500,
              fontSize: "14px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pageTitle || "Untitled"}
          </span>
        </div>
      );
    },
  },
);
