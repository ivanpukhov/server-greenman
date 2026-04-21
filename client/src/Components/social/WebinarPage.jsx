import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socialApi } from '../../api/social';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';
import MediaPlayer from './MediaPlayer';

export default function WebinarPage() {
    const { slug } = useParams();
    const [w, setW] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => { socialApi.webinars.get(slug).then(setW).catch((e) => setError(e.message)); }, [slug]);
    if (error) return <div className="social-error">{error}</div>;
    if (!w) return <div>Загрузка…</div>;

    const vote = async (pollId, optionId) => {
        try {
            await socialApi.polls.vote(pollId, [optionId]);
            const fresh = await socialApi.webinars.get(slug);
            setW(fresh);
        } catch (e) { alert(e.message); }
    };

    return (
        <article className="social-webinar">
            <h1>{w.title}</h1>
            {w.video && <MediaPlayer media={w.video} className="social-webinar__video" />}
            <BlockRenderer blocks={w.descriptionBlocks} />
            {w.files?.length > 0 && (
                <section className="social-webinar__files">
                    <h3>Файлы</h3>
                    <ul>{w.files.map((f) => (
                        <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer">📎 {f.originalName || 'Файл'}</a></li>
                    ))}</ul>
                </section>
            )}
            {w.polls?.length > 0 && (
                <section className="social-webinar__polls">
                    <h3>Опросы</h3>
                    {w.polls.map((p) => (
                        <div key={p.id} className="social-poll">
                            <strong>{p.question}</strong>
                            <ul>
                                {p.options.map((o) => (
                                    <li key={o.id}>
                                        <button onClick={() => vote(p.id, o.id)}>
                                            {o.text} — {p.voteCounts?.[o.id] || 0}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <small>Всего голосов: {p.totalVotes}</small>
                        </div>
                    ))}
                </section>
            )}
            <CommentThread type="webinar" id={w.id} />
        </article>
    );
}
