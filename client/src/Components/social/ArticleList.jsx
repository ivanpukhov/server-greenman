import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { socialApi } from '../../api/social';

export default function ArticleList() {
    const [items, setItems] = useState([]);
    useEffect(() => { socialApi.articles.list({ limit: 50 }).then(setItems).catch(() => {}); }, []);
    return (
        <div className="social-articles">
            <h1>Статьи</h1>
            <ul className="social-articles__list">
                {items.map((a) => (
                    <li key={a.id}>
                        <Link to={`/articles/${a.slug}`}>
                            {a.cover && <img src={a.cover.url} alt="" />}
                            <h3>{a.title}</h3>
                            {a.excerpt && <p>{a.excerpt}</p>}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
