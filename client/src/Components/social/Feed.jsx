import React, { useEffect, useState } from 'react';
import { socialApi } from '../../api/social';
import StoryBar from './StoryBar';
import PostCard from './PostCard';
import BlockRenderer from './BlockRenderer';
import MediaPlayer from './MediaPlayer';
import { Link } from 'react-router-dom';

function Item({ entry }) {
    const { kind, data } = entry;
    if (kind === 'post') return <PostCard post={data} />;
    if (kind === 'reel') return (
        <Link to={`/reels`} className="social-feed__reel">
            <MediaPlayer media={data.thumbnail || data.video} controls={false} />
            <div className="social-feed__reel-desc">{data.description}</div>
        </Link>
    );
    if (kind === 'article') return (
        <Link to={`/articles/${data.slug}`} className="social-feed__article">
            {data.cover && <img src={data.cover.url} alt="" />}
            <h3>{data.title}</h3>
            {data.excerpt && <p>{data.excerpt}</p>}
        </Link>
    );
    if (kind === 'webinar') return (
        <Link to={`/webinars/${data.slug}`} className="social-feed__webinar">
            {data.cover && <img src={data.cover.url} alt="" />}
            <h3>{data.title}</h3>
        </Link>
    );
    return null;
}

export default function Feed() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    useEffect(() => {
        socialApi.feed({ limit: 30 }).then((r) => setItems(r.items || [])).catch((e) => setError(e.message));
    }, []);
    return (
        <div className="social-feed">
            <StoryBar />
            {error && <div className="social-error">{error}</div>}
            {items.length === 0 && !error && <div className="social-empty">Пока нет публикаций</div>}
            {items.map((entry, i) => <Item key={`${entry.kind}-${entry.data.id}-${i}`} entry={entry} />)}
        </div>
    );
}
