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
    '#00622a'
];

const mantineTheme = createTheme({
    primaryColor: 'greenman',
    primaryShade: { light: 6, dark: 5 },
    colors: { greenman },
    white: '#ffffff',
    black: '#0b1712',
    defaultRadius: 'lg',
    cursorType: 'pointer',
    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    headings: {
        fontFamily: 'Hagrid, Manrope, -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: '700',
        sizes: {
            h1: { fontSize: rem(48), lineHeight: '1.1', fontWeight: '700' },
            h2: { fontSize: rem(36), lineHeight: '1.15', fontWeight: '700' },
            h3: { fontSize: rem(26), lineHeight: '1.25', fontWeight: '700' },
            h4: { fontSize: rem(20), lineHeight: '1.3', fontWeight: '600' },
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
        xs: '0 1px 2px rgba(11, 23, 18, 0.04)',
        sm: '0 2px 6px rgba(11, 23, 18, 0.05)',
        md: '0 8px 24px rgba(11, 23, 18, 0.06)',
        lg: '0 18px 40px rgba(11, 23, 18, 0.08)',
        xl: '0 30px 60px rgba(11, 23, 18, 0.10)',
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
        Select: {
            defaultProps: { radius: 'md', size: 'md' },
        },
        Textarea: {
            defaultProps: { radius: 'md' },
        },
        Badge: {
            defaultProps: { radius: 'sm' },
        },
        Paper: {
            defaultProps: { radius: 'lg' },
        },
        Modal: {
            defaultProps: { radius: 'lg', centered: true, overlayProps: { blur: 6, opacity: 0.5 } },
        },
        Drawer: {
            defaultProps: { overlayProps: { blur: 6, opacity: 0.5 } },
        },
    },
});

export default mantineTheme;
