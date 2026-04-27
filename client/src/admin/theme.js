import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

const PRIMARY = '#1f9a60';
const PRIMARY_DARK = '#127146';
const PRIMARY_LIGHT = '#58c48e';

const TEXT_PRIMARY = '#0f1718';
const TEXT_SECONDARY = '#5b6b66';
const DIVIDER = 'rgba(15,23,28,0.08)';
const BORDER_STRONG = 'rgba(15,23,28,0.12)';

const BG_DEFAULT = '#f6f8f7';
const BG_PAPER = '#ffffff';

let theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: PRIMARY,
            dark: PRIMARY_DARK,
            light: PRIMARY_LIGHT,
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#136f63',
            contrastText: '#ffffff'
        },
        success: { main: PRIMARY },
        warning: { main: '#d97706' },
        error: { main: '#dc2626' },
        info: { main: '#2563eb' },
        background: {
            default: BG_DEFAULT,
            paper: BG_PAPER
        },
        text: {
            primary: TEXT_PRIMARY,
            secondary: TEXT_SECONDARY
        },
        divider: DIVIDER
    },
    shape: {
        borderRadius: 10
    },
    typography: {
        fontFamily: '"Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.02em' },
        h4: { fontWeight: 700, letterSpacing: '-0.015em' },
        h5: { fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontWeight: 650, letterSpacing: '-0.005em' },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' }
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    background: BG_DEFAULT,
                    fontFeatureSettings: '"cv11", "ss01"'
                },
                '*::-webkit-scrollbar': {
                    width: 10,
                    height: 10
                },
                '*::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(15,23,28,0.18)',
                    borderRadius: 8,
                    border: '2px solid transparent',
                    backgroundClip: 'padding-box'
                },
                '*::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: 'rgba(15,23,28,0.28)'
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                },
                outlined: {
                    border: `1px solid ${DIVIDER}`,
                    boxShadow: 'none'
                },
                elevation1: {
                    boxShadow: '0 1px 2px rgba(15,23,28,0.04), 0 1px 1px rgba(15,23,28,0.03)'
                }
            }
        },
        MuiCard: {
            defaultProps: {
                variant: 'outlined'
            },
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    border: `1px solid ${DIVIDER}`,
                    boxShadow: 'none'
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: 'none'
                }
            }
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true
            },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    paddingInline: 14,
                    fontWeight: 600,
                    textTransform: 'none'
                },
                sizeSmall: {
                    paddingInline: 10
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' }
                },
                containedPrimary: {
                    backgroundColor: PRIMARY,
                    '&:hover': { backgroundColor: PRIMARY_DARK }
                },
                outlined: {
                    borderColor: BORDER_STRONG,
                    '&:hover': {
                        borderColor: PRIMARY,
                        backgroundColor: alpha(PRIMARY, 0.04)
                    }
                },
                text: {
                    '&:hover': {
                        backgroundColor: alpha(PRIMARY, 0.06)
                    }
                }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
                size: 'small'
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: BG_PAPER,
                    borderRadius: 10,
                    '& fieldset': {
                        borderColor: BORDER_STRONG
                    },
                    '&:hover fieldset': {
                        borderColor: alpha(TEXT_PRIMARY, 0.32)
                    }
                }
            }
        },
        MuiFilledInput: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    backgroundColor: alpha(TEXT_PRIMARY, 0.04),
                    '&:hover': {
                        backgroundColor: alpha(TEXT_PRIMARY, 0.06)
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600
                },
                outlined: {
                    borderColor: BORDER_STRONG
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: DIVIDER,
                    paddingTop: 10,
                    paddingBottom: 10
                },
                head: {
                    fontWeight: 600,
                    color: TEXT_SECONDARY,
                    backgroundColor: alpha(TEXT_PRIMARY, 0.025),
                    fontSize: '0.78rem',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase'
                }
            }
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    border: `1px solid ${DIVIDER}`
                },
                standardSuccess: {
                    backgroundColor: alpha(PRIMARY, 0.08),
                    color: PRIMARY_DARK
                }
            }
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: TEXT_PRIMARY,
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    borderRadius: 8,
                    padding: '6px 10px'
                },
                arrow: {
                    color: TEXT_PRIMARY
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 14,
                    boxShadow: '0 24px 48px rgba(15,23,28,0.14)'
                }
            }
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 10,
                    border: `1px solid ${DIVIDER}`,
                    boxShadow: '0 12px 28px rgba(15,23,28,0.12)'
                }
            }
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    margin: '0 6px',
                    minHeight: 36,
                    fontSize: '0.9rem'
                }
            }
        },
        MuiLink: {
            defaultProps: {
                underline: 'hover'
            },
            styleOverrides: {
                root: {
                    color: PRIMARY_DARK,
                    fontWeight: 500
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 44
                }
            }
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    height: 2,
                    borderRadius: 2
                }
            }
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: DIVIDER
                }
            }
        },
        MuiSwitch: {
            styleOverrides: {
                root: {
                    padding: 8
                }
            }
        },
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    margin: '2px 8px',
                    padding: '8px 12px',
                    borderRadius: 8,
                    color: TEXT_SECONDARY,
                    fontWeight: 500,
                    minHeight: 38,
                    '&:hover': {
                        backgroundColor: alpha(PRIMARY, 0.06),
                        color: TEXT_PRIMARY
                    },
                    '& .RaMenuItemLink-icon': {
                        color: 'inherit',
                        minWidth: 32
                    }
                },
                active: {
                    backgroundColor: alpha(PRIMARY, 0.1) + ' !important',
                    color: PRIMARY_DARK + ' !important',
                    fontWeight: 600
                }
            }
        },
        RaDatagrid: {
            styleOverrides: {
                root: {
                    '& .RaDatagrid-headerCell': {
                        backgroundColor: alpha(TEXT_PRIMARY, 0.025)
                    },
                    '& .RaDatagrid-row': {
                        transition: 'background-color 120ms ease'
                    },
                    '& .RaDatagrid-row:hover': {
                        backgroundColor: alpha(PRIMARY, 0.04)
                    }
                }
            }
        },
        RaList: {
            styleOverrides: {
                main: {
                    '& .RaList-content': {
                        borderRadius: 12,
                        overflow: 'hidden'
                    }
                }
            }
        },
        RaSimpleList: {
            styleOverrides: {
                root: {
                    '& .MuiListItem-root': {
                        borderBottom: `1px solid ${DIVIDER}`,
                        paddingTop: 12,
                        paddingBottom: 12
                    },
                    '& .MuiListItem-root:last-of-type': {
                        borderBottom: 0
                    }
                }
            }
        }
    }
});

theme = responsiveFontSizes(theme, { factor: 2.2 });

export default theme;
