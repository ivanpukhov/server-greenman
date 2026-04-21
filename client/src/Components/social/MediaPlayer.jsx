import React from 'react';

export default function MediaPlayer({ media, poster, autoPlay = false, loop = false, muted = false, controls = true, className = '' }) {
    if (!media) return null;
    const url = media.url || media;
    if (!url) return null;
    if (media.type === 'image') {
        return <img src={url} alt={media.originalName || ''} className={className} />;
    }
    if (media.type === 'audio') {
        return <audio src={url} controls={controls} className={className} />;
    }
    return (
        <video
            src={url}
            poster={poster?.url || poster || undefined}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline
            controls={controls}
            className={className}
        />
    );
}
