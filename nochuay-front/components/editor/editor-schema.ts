import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { PageBlock } from "./page-block";

/**
 * Custom BlockNote schema that extends the defaults with the "page" block type.
 * This allows users to embed nested page links directly in the editor.
 */
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    page: PageBlock(),
  },
});
