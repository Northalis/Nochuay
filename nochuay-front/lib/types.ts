export interface Page {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  icon?: string;
  coverImage?: string;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface PageNode extends Page {
  children: PageNode[];
  depth: number;
}

export interface UploadedAsset {
  url: string;
  contentType: string;
  size: number;
  name: string;
}

export interface PageSearchResult {
  id: string;
  parentId: string | null;
  title: string;
  icon?: string;
}

export interface PageTrashItem {
  id: string;
  parentId: string | null;
  title: string;
  icon?: string;
  deletedAt: string;
}
