import React from 'react';
import MediaPlayer from './MediaPlayer';
import CommentThread from './CommentThread';

export default function PostCard({ post, withComments = false }) {
    if (!post) return null;
    return (
        <article className="social-post">
            {post.text && <p className="social-post__text">{post.text}</p>}
            {(post.media || []).map((m) => (
                <MediaPlayer key={m.id} media={m} className="social-post__media" />
            ))}
            {post.publishedAt && (
                <time className="social-post__time">{new Date(post.publishedAt).toLocaleString()}</time>
            )}
            {withComments && <CommentThread type="post" id={post.id} />}
        </article>
    );
}
