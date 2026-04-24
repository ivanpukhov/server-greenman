export type MediaKind = 'image' | 'video' | 'audio' | 'file';

export type Media = {
  id: number;
  adminUserId: number;
  type: MediaKind;
  storageKey: string;
  url: string;
  mimeType: string;
  originalName: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BlockParagraph = { type: 'paragraph'; data: { text: string } };
export type BlockHeader = { type: 'header'; data: { text: string; level: 1 | 2 | 3 } };
export type BlockList = {
  type: 'list';
  data: { style: 'ordered' | 'unordered'; items: string[] };
};
export type BlockImage = {
  type: 'image';
  data: { mediaId: number; url: string; caption?: string };
};
export type BlockQuote = { type: 'quote'; data: { text: string; caption?: string } };
export type BlockCode = { type: 'code'; data: { code: string } };
export type BlockDelimiter = { type: 'delimiter'; data: Record<string, never> };

export type EditorBlock =
  | BlockParagraph
  | BlockHeader
  | BlockList
  | BlockImage
  | BlockQuote
  | BlockCode
  | BlockDelimiter;

export type EditorDoc = { blocks: EditorBlock[] };

export type Post = {
  id: number;
  adminUserId: number;
  text: string | null;
  publishedAt: string | null;
  isDraft: boolean;
  media?: Media[];
  createdAt?: string;
  updatedAt?: string;
};

export type Story = {
  id: number;
  adminUserId: number;
  mediaId: number;
  categoryTitle: string;
  categorySlug: string;
  categoryOrder: number;
  storyOrder: number;
  caption: string | null;
  durationSec: number;
  publishedAt: string | null;
  expiresAt: string | null;
  isDraft: boolean;
  media?: Media;
};

export type Reel = {
  id: number;
  adminUserId: number;
  videoMediaId: number;
  thumbnailMediaId: number | null;
  description: string | null;
  publishedAt: string | null;
  viewCount: number;
  isDraft: boolean;
  video?: Media;
  thumbnail?: Media | null;
};

export type Article = {
  id: number;
  adminUserId: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverMediaId: number | null;
  blocks: EditorDoc | null;
  publishedAt: string | null;
  isDraft: boolean;
  cover?: Media | null;
};

export type Webinar = {
  id: number;
  adminUserId: number;
  title: string;
  slug: string;
  descriptionBlocks: EditorDoc | null;
  videoMediaId: number | null;
  coverMediaId: number | null;
  publishedAt: string | null;
  isDraft: boolean;
  video?: Media | null;
  cover?: Media | null;
  attachments?: Media[];
};

export type Course = {
  id: number;
  adminUserId: number;
  title: string;
  slug: string;
  shortDescription: string | null;
  descriptionBlocks: EditorDoc | null;
  trailerMediaId: number | null;
  coverMediaId: number | null;
  priceCents: number;
  currency: string;
  durationDays: number;
  publishedAt: string | null;
  isDraft: boolean;
  trailer?: Media | null;
  cover?: Media | null;
  days?: CourseDay[];
};

export type CourseDay = {
  id: number;
  courseId: number;
  dayNumber: number;
  title: string;
  contentBlocks: EditorDoc | null;
  isDraft: boolean;
};

export type AdminComment = {
  id: number;
  commentableType: 'post' | 'reel' | 'article' | 'webinar' | 'course_day';
  commentableId: number;
  userId: number | null;
  adminUserId: number | null;
  body: string;
  parentCommentId: number | null;
  editedAt: string | null;
  isDeleted: boolean;
  createdAt?: string;
  user?: { id: number; phoneNumber: string } | null;
  adminUser?: { id: number; fullName: string } | null;
};

export type AdminProductType = {
  id: number;
  type: string;
  alias: string | null;
  price: number;
  stockQuantity: number | null;
  code?: string;
  productId: number;
};

export type AdminProduct = {
  id: number;
  name: string;
  alias: string | null;
  description: string | null;
  applicationMethodChildren: string | null;
  applicationMethodAdults: string | null;
  diseases: string[];
  contraindications: string;
  videoUrl: string | null;
  types: AdminProductType[];
};

export type AdminProductList = {
  data: AdminProduct[];
  total: number;
};

export type AdminProductResponse = {
  data: AdminProduct;
};
