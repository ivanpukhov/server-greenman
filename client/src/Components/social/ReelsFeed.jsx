import React, { useEffect, useRef, useState } from 'react';
import { socialApi } from '../../api/social';

export default function ReelsFeed() {
    const [reels, setReels] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        socialApi.reels.list({ limit: 20 }).then(setReels).catch((e) => setError(e.message));
    }, []);

    return (
        <div className="social-reels">
            {error && <div className="social-error">{error}</div>}
            {reels.map((r) => <ReelCard key={r.id} reel={r} />)}
        </div>
    );
}

function ReelCard({ reel }) {
    const ref = useRef(null);
    const [viewed, setViewed] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                el.play?.().catch(() => {});
                if (!viewed) {
                    socialApi.reels.view(reel.id).catch(() => {});
                    setViewed(true);
                }
            } else {
                el.pause?.();
            }
        }, { threshold: 0.6 });
        io.observe(el);
        return () => io.disconnect();
    }, [reel.id, viewed]);

    return (
        <div className="social-reels__card">
            <video
                ref={ref}
                src={reel.video?.url}
                poster={reel.thumbnail?.url}
                loop
                muted
                playsInline
                controls={false}
            />
            <div className="social-reels__overlay">
                <p>{reel.description}</p>
                <small>👁 {reel.viewCount}</small>
            </div>
        </div>
    );
}
