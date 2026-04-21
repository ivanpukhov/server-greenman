import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socialApi } from '../../api/social';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';

export default function ArticlePage() {
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => { socialApi.articles.get(slug).then(setArticle).catch((e) => setError(e.message)); }, [slug]);
    if (error) return <div className="social-error">{error}</div>;
    if (!article) return <div>Загрузка…</div>;
    return (
        <article className="social-article">
            {article.cover && <img src={article.cover.url} alt="" className="social-article__cover" />}
            <h1>{article.title}</h1>
            {article.excerpt && <p className="social-article__excerpt">{article.excerpt}</p>}
            <BlockRenderer blocks={article.blocks} />
            <CommentThread type="article" id={article.id} />
        </article>
    );
}
