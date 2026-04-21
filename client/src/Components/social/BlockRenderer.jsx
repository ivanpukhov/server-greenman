import React from 'react';

// Лёгкий рендерер Editor.js-совместимого JSON { blocks: [{ type, data }, ...] }.
// Поддерживает: header, paragraph, image, video, quote, list, delimiter, attaches, embed, code, warning.

function renderBlock(block, key) {
    const { type, data = {} } = block || {};
    switch (type) {
        case 'header': {
            const level = Math.min(6, Math.max(1, Number(data.level) || 2));
            const Tag = `h${level}`;
            return <Tag key={key} dangerouslySetInnerHTML={{ __html: data.text || '' }} />;
        }
        case 'paragraph':
            return <p key={key} dangerouslySetInnerHTML={{ __html: data.text || '' }} />;
        case 'quote':
            return (
                <blockquote key={key} className="social-quote">
                    <p dangerouslySetInnerHTML={{ __html: data.text || '' }} />
                    {data.caption && <cite dangerouslySetInnerHTML={{ __html: data.caption }} />}
                </blockquote>
            );
        case 'list': {
            const Tag = data.style === 'ordered' ? 'ol' : 'ul';
            return (
                <Tag key={key}>
                    {(data.items || []).map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: typeof item === 'string' ? item : item.content || '' }} />
                    ))}
                </Tag>
            );
        }
        case 'delimiter':
            return <hr key={key} className="social-delimiter" />;
        case 'image': {
            const url = data.file?.url || data.url;
            if (!url) return null;
            return (
                <figure key={key} className="social-image">
                    <img src={url} alt={data.caption || ''} />
                    {data.caption && <figcaption dangerouslySetInnerHTML={{ __html: data.caption }} />}
                </figure>
            );
        }
        case 'video': {
            const url = data.file?.url || data.url;
            if (!url) return null;
            return (
                <figure key={key} className="social-video">
                    <video src={url} controls preload="metadata" playsInline />
                    {data.caption && <figcaption dangerouslySetInnerHTML={{ __html: data.caption }} />}
                </figure>
            );
        }
        case 'attaches': {
            const url = data.file?.url || data.url;
            if (!url) return null;
            return (
                <a key={key} href={url} target="_blank" rel="noreferrer" className="social-attach">
                    📎 {data.title || data.file?.name || 'Скачать файл'}
                </a>
            );
        }
        case 'embed': {
            if (!data.embed) return null;
            return (
                <div key={key} className="social-embed">
                    <iframe src={data.embed} title={data.caption || ''} allowFullScreen />
                </div>
            );
        }
        case 'code':
            return <pre key={key} className="social-code"><code>{data.code || ''}</code></pre>;
        case 'warning':
            return (
                <div key={key} className="social-warning">
                    <strong>{data.title}</strong>
                    <p>{data.message}</p>
                </div>
            );
        default:
            return null;
    }
}

export default function BlockRenderer({ blocks, className = 'social-blocks' }) {
    if (!blocks) return null;
    let parsed = blocks;
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { return <div className={className}>{blocks}</div>; }
    }
    const list = Array.isArray(parsed) ? parsed : parsed.blocks;
    if (!Array.isArray(list)) return null;
    return <div className={className}>{list.map((b, i) => renderBlock(b, i))}</div>;
}
