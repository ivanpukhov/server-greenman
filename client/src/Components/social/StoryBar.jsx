import React, { useEffect, useState } from 'react';
import { socialApi } from '../../api/social';
import StoryViewer from './StoryViewer';

export default function StoryBar() {
    const [groups, setGroups] = useState([]);
    const [activeGroupIdx, setActiveGroupIdx] = useState(null);

    useEffect(() => {
        socialApi.stories.active().then(setGroups).catch(() => {});
    }, []);

    if (!groups.length) return null;

    return (
        <>
            <div className="social-storybar">
                {groups.map((g, i) => (
                    <button key={g.adminUserId} className="social-storybar__item" onClick={() => setActiveGroupIdx(i)}>
                        <div className="social-storybar__circle">
                            <img src={g.stories[0]?.media?.url} alt="" />
                        </div>
                        <span>Автор #{g.adminUserId}</span>
                    </button>
                ))}
            </div>
            {activeGroupIdx !== null && (
                <StoryViewer
                    group={groups[activeGroupIdx]}
                    onClose={() => setActiveGroupIdx(null)}
                    onNextGroup={() => setActiveGroupIdx((i) => (i + 1 < groups.length ? i + 1 : null))}
                />
            )}
        </>
    );
}
