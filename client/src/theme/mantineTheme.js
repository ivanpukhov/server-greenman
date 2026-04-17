import { createTheme } from '@mantine/core';

const greenman = [
    '#e6f7f0',
    '#c2ebd8',
    '#9ddfc0',
    '#79d3a8',
    '#54c790',
    '#00AB6D',
    '#009460',
    '#007d52',
    '#006645',
    '#004f37'
];

const mantineTheme = createTheme({
    primaryColor: 'greenman',
    colors: { greenman },
    defaultRadius: 'md',
    fontFamily: 'Manrope, Hagrid, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontFamilyMonospace: 'monospace',
    headings: {
        fontFamily: 'Hagrid, Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        fontWeight: '700'
    },
    components: {
        Button: {
            defaultProps: { radius: 'md' }
        },
        Card: {
            defaultProps: { radius: 'lg' }
        },
        TextInput: {
            defaultProps: { radius: 'md' }
        }
    }
});

export default mantineTheme;
