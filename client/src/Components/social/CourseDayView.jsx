import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { socialApi } from '../../api/social';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';
import SupportThread from './SupportThread';

export default function CourseDayView() {
    const { slug, dayNumber } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [reportText, setReportText] = useState('');
    const [reportSent, setReportSent] = useState(false);
    const [showSupport, setShowSupport] = useState(false);

    useEffect(() => { socialApi.courses.day(slug, dayNumber).then(setData).catch((e) => setError(e.message)); }, [slug, dayNumber]);

    if (error) return <div className="social-error">{error}</div>;
    if (!data) return <div>Загрузка…</div>;

    const submitReport = async (e) => {
        e.preventDefault();
        try {
            await socialApi.courses.submitReport(data.enrollment.id, { courseDayId: data.day.id, text: reportText });
            setReportSent(true);
            setReportText('');
        } catch (e) { alert(e.message); }
    };

    return (
        <article className="social-courseday">
            <Link to={`/courses/${slug}`}>← Назад к курсу</Link>
            <h1>День {data.day.dayNumber}: {data.day.title}</h1>
            <BlockRenderer blocks={data.day.contentBlocks} />
            {data.day.files?.length > 0 && (
                <section>
                    <h3>Файлы</h3>
                    <ul>{data.day.files.map((f) => (<li key={f.id}><a href={f.url} target="_blank" rel="noreferrer">📎 {f.originalName}</a></li>))}</ul>
                </section>
            )}
            <section className="social-courseday__report">
                <h3>Отчёт о прохождении</h3>
                {reportSent && <div className="social-success">Отчёт отправлен</div>}
                <form onSubmit={submitReport}>
                    <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={4} placeholder="Ваш отчёт" />
                    <button type="submit">Отправить</button>
                </form>
            </section>
            <section>
                <button onClick={() => setShowSupport((v) => !v)}>
                    {showSupport ? 'Скрыть' : 'Написать куратору'}
                </button>
                {showSupport && <SupportThread enrollmentId={data.enrollment.id} />}
            </section>
            <CommentThread type="course_day" id={data.day.id} />
        </article>
    );
}
