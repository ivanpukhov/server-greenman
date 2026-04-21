import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { socialApi } from '../../api/social';

export default function CoursesList() {
    const [items, setItems] = useState([]);
    useEffect(() => { socialApi.courses.list().then(setItems).catch(() => {}); }, []);
    return (
        <div className="social-courses">
            <h1>Курсы</h1>
            <ul className="social-courses__list">
                {items.map((c) => (
                    <li key={c.id}>
                        <Link to={`/courses/${c.slug}`}>
                            {c.cover && <img src={c.cover.url} alt="" />}
                            <h3>{c.title}</h3>
                            {c.shortDescription && <p>{c.shortDescription}</p>}
                            <strong>{c.priceCents > 0 ? `${(c.priceCents / 100).toLocaleString()} ${c.currency}` : 'Бесплатно'}</strong>
                            <small>{c.durationDays} дней</small>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
