export const pageStackSx = {
    gap: { xs: 2, md: 2.5 }
};

export const pageHeaderSx = {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    alignItems: { xs: 'flex-start', md: 'center' },
    justifyContent: 'space-between',
    gap: { xs: 1.5, md: 2 },
    mb: { xs: 1, md: 1.5 }
};

export const pageTitleSx = {
    fontSize: { xs: '1.4rem', md: '1.75rem' },
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: '-0.015em',
    color: 'text.primary'
};

export const pageDescriptionSx = {
    color: 'text.secondary',
    fontSize: { xs: '0.85rem', md: '0.9rem' },
    mt: 0.5
};

export const cardSx = {
    p: { xs: 2, md: 2.5 },
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    boxShadow: 'none'
};

export const cardHeaderSx = {
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1,
    mb: 1.5
};

export const cardTitleSx = {
    fontSize: { xs: '1rem', md: '1.05rem' },
    fontWeight: 650,
    color: 'text.primary',
    letterSpacing: '-0.01em'
};

export const sectionTitleRowSx = {
    mb: 1.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    flexWrap: 'wrap'
};

export const summaryGridSx = {
    display: 'grid',
    gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, minmax(0, 1fr))',
        md: 'repeat(3, minmax(0, 1fr))',
        lg: 'repeat(4, minmax(0, 1fr))'
    },
    gap: { xs: 1.25, md: 1.5 }
};

export const metricCardSx = {
    p: { xs: 1.75, md: 2 },
    borderRadius: 2.5,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5
};

export const metricLabelSx = {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

export const metricValueSx = {
    fontSize: { xs: '1.5rem', md: '1.75rem' },
    fontWeight: 700,
    color: 'text.primary',
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1
};

export const metricDeltaSx = {
    fontSize: '0.8rem',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums'
};

export const tableWrapSx = {
    overflowX: 'auto',
    borderRadius: 2.5,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper'
};

export const tableSx = {
    minWidth: 640,
    '& .MuiTableHead-root .MuiTableCell-root': {
        position: 'sticky',
        top: 0,
        zIndex: 1
    },
    '& .MuiTableBody-root .MuiTableRow-root:hover': {
        backgroundColor: (theme) => theme.palette.action.hover
    },
    '& .MuiTableRow-root:last-of-type .MuiTableCell-root': {
        borderBottom: 0
    },
    '& .MuiTableCell-root': {
        fontSize: '0.875rem'
    }
};

export const insightGridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
    gap: { xs: 1.25, md: 1.5 }
};

export const insightCardSx = {
    p: { xs: 1.5, md: 2 },
    borderRadius: 2.5,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper'
};

export const mobileCardSx = {
    p: 1.75,
    borderRadius: 2.5,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper'
};

export const emptyStateSx = {
    p: { xs: 2.5, md: 3 },
    borderRadius: 2.5,
    textAlign: 'center',
    border: '1px dashed',
    borderColor: 'divider',
    color: 'text.secondary',
    backgroundColor: 'background.paper'
};

export const heroSx = cardSx;

export const sectionSx = cardSx;

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
