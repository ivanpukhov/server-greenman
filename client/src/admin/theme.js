import { createTheme } from '@mui/material/styles';

const adminTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1f9a60',
            dark: '#127146',
            light: '#58c48e',
            contrastText: '#f7fffb'
        },
        secondary: {
            main: '#136f63',
            contrastText: '#ecfcf7'
        },
        success: {
            main: '#1f9a60'
        },
        warning: {
            main: '#e38b2c'
        },
        error: {
            main: '#d1495b'
        },
        background: {
            default: '#f2f7f4',
            paper: '#fafffd'
        },
        text: {
            primary: '#10281d',
            secondary: '#537266'
        }
    },
    shape: {
        borderRadius: 18
    },
    typography: {
        fontFamily: '"Avenir Next", "Segoe UI", "Trebuchet MS", sans-serif',
        h4: {
            fontWeight: 750,
            letterSpacing: '-0.02em'
        },
        h6: {
            fontWeight: 720,
            letterSpacing: '-0.01em'
        },
        button: {
            fontWeight: 650
        }
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    background:
                        'radial-gradient(circle at 0% 0%, rgba(88,196,142,0.15) 0%, rgba(88,196,142,0) 45%), radial-gradient(circle at 100% 100%, rgba(19,111,99,0.16) 0%, rgba(19,111,99,0) 50%), #f2f7f4'
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid rgba(16,40,29,0.07)',
                    boxShadow: '0 18px 50px rgba(16,40,29,0.08)'
                }
            }
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true
            },
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 14,
                    paddingInline: 18,
                    fontWeight: 650
                },
                containedPrimary: {
                    background: 'linear-gradient(120deg, #1f9a60 0%, #188f77 100%)',
                    boxShadow: '0 8px 24px rgba(18,113,70,0.28)'
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 22
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined'
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(249,254,251,0.9)',
                    borderRadius: 14
                },
                notchedOutline: {
                    borderColor: 'rgba(16,40,29,0.14)'
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(16,40,29,0.08)'
                },
                head: {
                    fontWeight: 650,
                    color: '#2f4f43',
                    background: 'linear-gradient(180deg, rgba(88,196,142,0.15), rgba(88,196,142,0.02))'
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 10
                }
            }
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 14
                }
            }
        },
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    marginBottom: 6,
                    borderRadius: 12
                },
                active: {
                    background:
                        'linear-gradient(90deg, rgba(31,154,96,0.18), rgba(19,111,99,0.14)) !important',
                    border: '1px solid rgba(19,111,99,0.16)'
                }
            }
        },
        RaDatagrid: {
            styleOverrides: {
                root: {
                    '& .RaDatagrid-row:nth-of-type(even)': {
                        backgroundColor: 'rgba(88,196,142,0.05)'
                    },
                    '& .RaDatagrid-row:hover': {
                        backgroundColor: 'rgba(19,111,99,0.09)'
                    }
                }
            }
        },
        RaList: {
            styleOverrides: {
                main: {
                    '& .RaList-content': {
                        borderRadius: 20,
                        overflow: 'hidden'
                    }
                }
            }
        }
    }
});

export default adminTheme;
