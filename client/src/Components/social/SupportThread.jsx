import React, { useEffect, useState } from 'react';
import { socialApi } from '../../api/social';

export default function SupportThread({ enrollmentId }) {
    const [items, setItems] = useState([]);
    const [text, setText] = useState('');
    const [error, setError] = useState(null);

    const reload = async () => {
        try {
            const list = await socialApi.courses.supportList(enrollmentId);
            setItems(list);
        } catch (e) { setError(e.message); }
    };
    useEffect(() => { if (enrollmentId) reload(); }, [enrollmentId]);

    const send = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        try {
            await socialApi.courses.supportSend(enrollmentId, { text: text.trim() });
            setText('');
            await reload();
        } catch (e) { setError(e.message); }
    };

    return (
        <div className="social-support">
            <h4>Приватный диалог с куратором</h4>
            {error && <div className="social-error">{error}</div>}
            <ul>
                {items.map((m) => (
                    <li key={m.id} className={m.senderType === 'admin' ? 'from-admin' : 'from-user'}>
                        <strong>{m.senderType === 'admin' ? 'Куратор' : 'Вы'}:</strong> {m.text}
                    </li>
                ))}
            </ul>
            <form onSubmit={send}>
                <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение куратору" />
                <button type="submit" disabled={!text.trim()}>Отправить</button>
            </form>
        </div>
    );
}
