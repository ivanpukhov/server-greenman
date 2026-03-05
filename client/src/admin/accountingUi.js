export const formatMoney = (value) =>
    `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₸`;

export const formatDate = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('ru-RU');
};

export const periodOptions = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'halfyear', label: 'Полгода' }
];

export const pageStackSx = {
    gap: 2.25
};

export const heroSx = {
    position: 'relative',
    overflow: 'hidden',
    p: { xs: 2, md: 3 },
    borderRadius: 5,
    border: '1px solid rgba(14, 51, 37, 0.11)',
    background:
        'radial-gradient(circle at 20% -10%, rgba(99, 223, 168, 0.28), rgba(99, 223, 168, 0) 52%), linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(239,250,244,0.96) 45%, rgba(228,247,238,0.95) 100%)',
    boxShadow: '0 24px 54px rgba(16, 40, 29, 0.12)',
    '&::after': {
        content: '""',
        position: 'absolute',
        top: -56,
        right: -44,
        width: 170,
        height: 170,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,154,113,0.26) 0%, rgba(20,154,113,0) 72%)',
        pointerEvents: 'none'
    }
};

export const sectionSx = {
    borderRadius: 4,
    p: { xs: 1.4, sm: 1.9, md: 2.4 },
    border: '1px solid rgba(14, 51, 37, 0.1)',
    background: 'rgba(255,255,255,0.84)',
    boxShadow: '0 14px 34px rgba(16, 40, 29, 0.1)'
};

export const summaryGridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
    gap: 1.4
};

export const metricCardSx = {
    p: 1.8,
    borderRadius: 3,
    border: '1px solid rgba(18, 77, 58, 0.12)',
    background:
        'linear-gradient(155deg, rgba(250,255,252,0.98) 0%, rgba(239,251,244,0.95) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 10px 18px rgba(16, 40, 29, 0.08)'
};

export const mobileCardSx = {
    borderRadius: 3,
    border: '1px solid rgba(16,40,29,0.1)',
    boxShadow: '0 8px 20px rgba(16,40,29,0.08)',
    background: 'linear-gradient(170deg, rgba(255,255,255,0.94) 0%, rgba(245,253,248,0.92) 100%)'
};

export const tableWrapSx = {
    overflowX: 'auto',
    borderRadius: 3,
    border: '1px solid rgba(16,40,29,0.08)',
    background: 'rgba(252,255,253,0.94)'
};

export const tableSx = {
    minWidth: 760,
    '& .MuiTableRow-root:last-of-type .MuiTableCell-root': {
        borderBottom: 0
    }
};

export const sectionTitleRowSx = {
    mb: 1.2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    flexWrap: 'wrap'
};

export const emptyStateSx = {
    p: 2.2,
    borderRadius: 3,
    textAlign: 'center',
    border: '1px dashed rgba(16,40,29,0.22)',
    color: 'text.secondary',
    background: 'rgba(248, 253, 250, 0.9)'
};
