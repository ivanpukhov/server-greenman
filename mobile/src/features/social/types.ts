export type MediaRef = {
  id: number;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string | null;
  blurhash?: string | null;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type FeedKind = 'post' | 'article' | 'reel' | 'webinar' | 'course' | 'story';

export type FeedEngagement = {
  likes: number;
  comments: number;
  bookmarks: number;
  reposts: number;
  views?: number;
};

export type FeedMe = {
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
};

export type FeedItem = {
  id: string;
  kind: FeedKind;
  entityId: number;
  publishedAt: string;
  adminUserId: number;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  text?: string | null;
  description?: string | null;
  cover?: MediaRef | null;
  video?: MediaRef | null;
  media: MediaRef[];
  engagement: FeedEngagement;
  me: FeedMe;
  raw?: Record<string, unknown>;
};

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
};

export type ReactableType = 'post' | 'article' | 'reel' | 'webinar' | 'course_day' | 'comment';
export type BookmarkableType = 'post' | 'article' | 'reel' | 'webinar' | 'course';
export type RepostableType = 'post' | 'article' | 'reel' | 'webinar';
