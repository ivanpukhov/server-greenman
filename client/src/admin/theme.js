import { createTheme } from '@mui/material/styles';

const adminTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#146C43'
        },
        secondary: {
            main: '#D35400'
        },
        background: {
            default: '#F2F5F0',
            paper: '#FFFFFF'
        }
    },
    shape: {
        borderRadius: 14
    },
    typography: {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        h6: {
            fontWeight: 700
        }
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600
                }
            }
        }
    }
});

export default adminTheme;
