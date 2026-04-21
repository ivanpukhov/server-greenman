import React, { useEffect, useState } from 'react';
import { socialApi } from '../../api/social';

export default function StoryViewer({ group, onClose, onNextGroup }) {
    const [idx, setIdx] = useState(0);
    const story = group.stories[idx];

    useEffect(() => {
        if (!story) return;
        socialApi.stories.view(story.id).catch(() => {});
        const duration = (Number(story.durationSec) || 7) * 1000;
        const timer = setTimeout(() => {
            if (idx + 1 < group.stories.length) setIdx(idx + 1);
            else onNextGroup ? onNextGroup() : onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [idx, story?.id]);

    if (!story) return null;

    return (
        <div className="social-storyviewer" onClick={onClose}>
            <div className="social-storyviewer__content" onClick={(e) => e.stopPropagation()}>
                <div className="social-storyviewer__progress">
                    {group.stories.map((_, i) => (
                        <span key={i} className={i < idx ? 'done' : i === idx ? 'active' : ''} />
                    ))}
                </div>
                {story.media?.type === 'video' ? (
                    <video src={story.media.url} autoPlay muted playsInline />
                ) : (
                    <img src={story.media?.url} alt={story.caption || ''} />
                )}
                {story.caption && <div className="social-storyviewer__caption">{story.caption}</div>}
                <button className="social-storyviewer__close" onClick={onClose}>×</button>
            </div>
        </div>
    );
}
