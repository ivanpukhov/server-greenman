import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { socialApi } from '../../api/social';
import BlockRenderer from './BlockRenderer';
import MediaPlayer from './MediaPlayer';

export default function CoursePage() {
    const { slug } = useParams();
    const [data, setData] = useState(null);
    const [daysData, setDaysData] = useState(null);
    const [error, setError] = useState(null);
    const [enrolling, setEnrolling] = useState(false);

    const reload = async () => {
        try {
            const course = await socialApi.courses.get(slug);
            setData(course);
            const d = await socialApi.courses.days(slug);
            setDaysData(d);
        } catch (e) { setError(e.message); }
    };

    useEffect(() => { reload(); }, [slug]);

    const enroll = async () => {
        setEnrolling(true);
        try {
            const res = await socialApi.courses.enroll(data.id);
            if (res.requiresPayment) {
                alert(`Этот курс платный (${(res.priceCents / 100).toLocaleString()} ${res.currency}). Админ отправит ссылку на оплату.`);
            }
            await reload();
        } catch (e) { alert(e.message); }
        finally { setEnrolling(false); }
    };

    if (error) return <div className="social-error">{error}</div>;
    if (!data) return <div>Загрузка…</div>;

    const isEnrolled = !!data.enrollment && !!data.enrollment.startedAt;

    return (
        <article className="social-course">
            {data.trailer ? (
                <MediaPlayer media={data.trailer} className="social-course__trailer" />
            ) : data.cover ? (
                <img src={data.cover.url} alt="" className="social-course__cover" />
            ) : null}
            <h1>{data.title}</h1>
            {data.shortDescription && <p className="social-course__short">{data.shortDescription}</p>}
            <div className="social-course__meta">
                <strong>{data.priceCents > 0 ? `${(data.priceCents / 100).toLocaleString()} ${data.currency}` : 'Бесплатно'}</strong>
                <span>{data.durationDays} дней</span>
            </div>
            <BlockRenderer blocks={data.descriptionBlocks} />
            {!isEnrolled && (
                <button disabled={enrolling} onClick={enroll} className="social-course__enroll">
                    {data.priceCents > 0 ? 'Записаться (платно)' : 'Записаться'}
                </button>
            )}
            {daysData && (
                <section className="social-course__days">
                    <h2>Программа курса</h2>
                    <ol>
                        {daysData.days.map((d) => (
                            <li key={d.id || d.dayNumber} className={d.locked ? 'locked' : 'unlocked'}>
                                {d.locked ? (
                                    <span>🔒 День {d.dayNumber}: {d.title}</span>
                                ) : (
                                    <Link to={`/courses/${slug}/day/${d.dayNumber}`}>
                                        День {d.dayNumber}: {d.title}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>
            )}
        </article>
    );
}
