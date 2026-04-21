import React, { useEffect, useState } from 'react';
import { socialApi } from '../../api/social';

export default function CommentThread({ type, id }) {
    const [items, setItems] = useState([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const reload = async () => {
        try {
            const list = await socialApi.comments.list(type, id);
            setItems(list);
        } catch (e) { setError(e.message); }
    };

    useEffect(() => { if (id) reload(); }, [type, id]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setLoading(true);
        try {
            await socialApi.comments.create(type, id, body.trim());
            setBody('');
            await reload();
        } catch (e) {
            setError(e.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="social-comments">
            <h4>Комментарии</h4>
            {error && <div className="social-error">{error}</div>}
            <ul className="social-comments__list">
                {items.map((c) => (
                    <li key={c.id}>
                        <span className="social-comments__author">{c.adminUserId ? 'Админ' : `Пользователь #${c.userId}`}</span>
                        <p>{c.body}</p>
                    </li>
                ))}
            </ul>
            <form className="social-comments__form" onSubmit={onSubmit}>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Оставить комментарий" rows={2} />
                <button type="submit" disabled={loading || !body.trim()}>Отправить</button>
            </form>
        </div>
    );
}
