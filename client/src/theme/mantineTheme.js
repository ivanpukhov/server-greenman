import { createTheme, rem } from '@mantine/core';

const greenman = [
    '#e8f6ee',
    '#cde9d6',
    '#9ad4ad',
    '#63bf84',
    '#3aad64',
    '#1fa150',
    '#0e9a47',
    '#00853a',
    '#007432',
    '#00622a',
];

const sage = [
    '#f1f9f4',
    '#dff1e6',
    '#c7ead5',
    '#9fd7b6',
    '#72c595',
    '#4fb77c',
    '#38a066',
    '#2a8553',
    '#1f6a42',
    '#164c2f',
];

const ink = [
    '#f7f8f7',
    '#eef1ef',
    '#e0e5e2',
    '#c7cfc9',
    '#9aa7a0',
    '#6f7d76',
    '#4f5c55',
    '#354a3f',
    '#1d2a23',
    '#0b1712',
];

const mantineTheme = createTheme({
    primaryColor: 'greenman',
    primaryShade: { light: 6, dark: 5 },
    colors: { greenman, sage, ink },
    white: '#ffffff',
    black: '#0b1712',
    defaultRadius: 'lg',
    cursorType: 'pointer',
    fontFamily:
        'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontFamilyMonospace:
        '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    headings: {
        fontFamily:
            'Hagrid, Manrope, -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: '700',
        sizes: {
            h1: { fontSize: 'var(--fs-h1)', lineHeight: 'var(--lh-heading)', fontWeight: '800' },
            h2: { fontSize: 'var(--fs-h2)', lineHeight: 'var(--lh-heading)', fontWeight: '800' },
            h3: { fontSize: 'var(--fs-h3)', lineHeight: 'var(--lh-tight)', fontWeight: '700' },
            h4: { fontSize: 'var(--fs-h4)', lineHeight: 'var(--lh-tight)', fontWeight: '600' },
            h5: { fontSize: rem(16), lineHeight: '1.4', fontWeight: '600' },
            h6: { fontSize: rem(14), lineHeight: '1.4', fontWeight: '600' },
        },
    },
    radius: {
        xs: rem(6),
        sm: rem(10),
        md: rem(14),
        lg: rem(20),
        xl: rem(28),
    },
    spacing: {
        xs: rem(8),
        sm: rem(12),
        md: rem(16),
        lg: rem(24),
        xl: rem(40),
    },
    shadows: {
        xs: 'var(--shadow-e1)',
        sm: 'var(--shadow-e1)',
        md: 'var(--shadow-e2)',
        lg: 'var(--shadow-e3)',
        xl: 'var(--shadow-e4)',
    },
    breakpoints: {
        xs: '30em',   // 480
        sm: '40em',   // 640
        md: '48em',   // 768
        lg: '64em',   // 1024
        xl: '77.5em', // 1240
    },
    components: {
        Button: {
            defaultProps: { radius: 'xl', size: 'md' },
        },
        ActionIcon: {
            defaultProps: { radius: 'xl', variant: 'subtle' },
        },
        Card: {
            defaultProps: { radius: 'lg', withBorder: true, padding: 'lg' },
        },
        TextInput: {
            defaultProps: { radius: 'md', size: 'md' },
        },
        NumberInput: {
            defaultProps: { radius: 'md', size: 'md' },
        },
        PasswordInput: {
            defaultProps: { radius: 'md', size: 'md' },
        },
        PinInput: {
            defaultProps: { radius: 'md', size: 'lg' },
        },
        Select: {
            defaultProps: { radius: 'md', size: 'md' },
        },
        MultiSelect: {
            defaultProps: { radius: 'md', size: 'md' },
        },
        Textarea: {
            defaultProps: { radius: 'md' },
        },
        Checkbox: {
            defaultProps: { radius: 'sm' },
        },
        Badge: {
            defaultProps: { radius: 'sm', fw: 600 },
        },
        Chip: {
            defaultProps: { radius: 'xl', size: 'md' },
        },
        Paper: {
            defaultProps: { radius: 'lg' },
        },
        Modal: {
            defaultProps: {
                radius: 'xl',
                centered: true,
                overlayProps: { blur: 8, backgroundOpacity: 0.5 },
                transitionProps: { transition: 'pop', duration: 200 },
            },
        },
        Drawer: {
            defaultProps: {
                overlayProps: { blur: 8, backgroundOpacity: 0.5 },
                transitionProps: { duration: 240, timingFunction: 'cubic-bezier(0.2, 0, 0, 1)' },
            },
        },
        Notification: {
            defaultProps: { radius: 'md' },
        },
        Skeleton: {
            defaultProps: { radius: 'md' },
        },
        Tooltip: {
            defaultProps: { radius: 'sm', transitionProps: { transition: 'pop', duration: 120 } },
        },
        Menu: {
            defaultProps: { radius: 'md', shadow: 'md' },
        },
        SegmentedControl: {
            defaultProps: { radius: 'xl' },
        },
        Tabs: {
            defaultProps: { radius: 'md' },
        },
        Accordion: {
            defaultProps: { radius: 'md' },
        },
    },
});

export default mantineTheme;
