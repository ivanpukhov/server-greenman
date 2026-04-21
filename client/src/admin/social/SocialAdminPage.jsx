import { useEffect, useState } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import PostsTab from './tabs/PostsTab';
import ReelsTab from './tabs/ReelsTab';
import StoriesTab from './tabs/StoriesTab';
import ArticlesTab from './tabs/ArticlesTab';
import WebinarsTab from './tabs/WebinarsTab';
import CoursesTab from './tabs/CoursesTab';
import MediaTab from './tabs/MediaTab';
import CommentsTab from './tabs/CommentsTab';

const TABS = [
    { key: 'media', label: 'Медиа', Component: MediaTab },
    { key: 'posts', label: 'Посты', Component: PostsTab },
    { key: 'reels', label: 'Reels', Component: ReelsTab },
    { key: 'stories', label: 'Сториз', Component: StoriesTab },
    { key: 'articles', label: 'Статьи', Component: ArticlesTab },
    { key: 'webinars', label: 'Вебинары', Component: WebinarsTab },
    { key: 'courses', label: 'Курсы', Component: CoursesTab },
    { key: 'comments', label: 'Комментарии', Component: CommentsTab }
];

export default function SocialAdminPage() {
    const [tab, setTab] = useState(() => localStorage.getItem('socialAdminTab') || 'media');
    useEffect(() => { localStorage.setItem('socialAdminTab', tab); }, [tab]);
    const active = TABS.find((t) => t.key === tab) || TABS[0];
    const ActiveComp = active.Component;
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Соцсеть</Typography>
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={tab}
                    onChange={(_e, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {TABS.map((t) => (<Tab key={t.key} value={t.key} label={t.label} />))}
                </Tabs>
            </Paper>
            <ActiveComp />
        </Box>
    );
}
