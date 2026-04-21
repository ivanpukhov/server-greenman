import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { socialApi } from '../../api/social';

export default function MyCourses() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    useEffect(() => { socialApi.courses.mine().then(setItems).catch((e) => setError(e.message)); }, []);
    if (error) return <div className="social-error">{error}</div>;
    return (
        <div className="social-mycourses">
            <h1>Мои курсы</h1>
            <ul>
                {items.map((e) => (
                    <li key={e.id}>
                        <Link to={`/courses/${e.course?.slug}`}>
                            {e.course?.cover && <img src={e.course.cover.url} alt="" />}
                            <div>
                                <strong>{e.course?.title}</strong>
                                <div>Открыто дней: {e.unlockedUpTo}/{e.course?.durationDays}</div>
                                <div>Статус: {e.status}</div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
            {items.length === 0 && <p>Пока нет записей на курсы</p>}
        </div>
    );
}
