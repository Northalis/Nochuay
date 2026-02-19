export interface Page {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  icon?: string;
  coverImage?: string;
  content: string;
  createdAt: string;
}

export interface PageNode extends Page {
  children: PageNode[];
  depth: number;
}
