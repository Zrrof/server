import * as React from 'react';
import {MuiThemeProvider, Theme} from '@material-ui/core/styles';
import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import CssBaseline from '@material-ui/core/CssBaseline';
import {useSettings} from '../gql/settings';
import {Theme as SettingTheme} from '../gql/__generated__/globalTypes';

const themes: Record<SettingTheme, Theme> = {
    [SettingTheme.GruvboxDark]: createMuiTheme({
        overrides: {
            MuiLink: {
                root: {
                    color: '#458588',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: '#a89984',
                },
            },
        },
        palette: {
            background: {
                default: '#282828',
                paper: '#32302f',
            },
            text: {
                primary: '#fbf1d4',
            },
            primary: {
                main: '#a89984',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'dark',
        },
    }),
    [SettingTheme.GruvboxLight]: createMuiTheme({
        overrides: {
            MuiLink: {
                root: {
                    color: '#458588',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: '#7c6f64',
                },
            },
        },
        palette: {
            background: {
                default: '#fbf1c7',
                paper: '#f9f5d7',
            },
            text: {
                primary: '#282828',
            },
            primary: {
                main: '#7c6f64',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'light',
        },
    }),
    [SettingTheme.MaterialLight]: createMuiTheme({
        overrides: {
            MuiLink: {
                root: {
                    color: '#2980b9',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
        },
        palette: {
            background: {default: '#eeeeee'},
            primary: {
                main: '#455a64',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'light',
        },
    }),
    [SettingTheme.Zrofflight]: createMuiTheme({
        overrides: {
            MuiLink: {
                root: {
                    color: '#3B82F6',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: '#3B82F6',
                },
            },
        },
        palette: {
            background: {
                default: '#F9FAFB',
                paper: '#FFFFFF',
            },
            text: {
                primary: '#111827',
                secondary: '#4B5563',
            },
            primary: {
                main: '#3B82F6',
                light: '#60A5FA',
                dark: '#2563EB',
            },
            secondary: {
                main: '#10B981',
                light: '#34D399',
                dark: '#059669',
            },
            error: {
                main: '#EF4444',
            },
            type: 'light',
        },
        typography: {
            fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
        },
        shape: {
            borderRadius: 8,
        },
    }),
    [SettingTheme.MaterialDark]: createMuiTheme({
        overrides: {
            MuiLink: {
                root: {
                    color: '#3498db',
                },
            },
        },
        palette: {
            primary: {
                main: '#455a64',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'dark',
        },
    }),
    [SettingTheme.Zrrofviolet]: createMuiTheme({
        overrides: {
            MuiLink: {
                root: {
                    color: '#8b5cf6',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: '#8b5cf6',
                    color: '#ffffff',
                },
            },
            MuiButton: {
                containedPrimary: {
                    color: '#ffffff',
                },
            },
            MuiChip: {
                root: {
                    backgroundColor: '#ede9fe',
                    color: '#8b5cf6',
                },
            },
            MuiPaper: {
                rounded: {
                    borderRadius: 12,
                },
            },
            MuiCard: {
                root: {
                    borderRadius: 12,
                },
            },
        },
        palette: {
            background: {
                default: '#faf8ff',
                paper: '#ffffff',
            },
            text: {
                primary: '#131b2e',
                secondary: '#494454',
            },
            primary: {
                main: '#8b5cf6',
                light: '#a78bfa',
                dark: '#7c3aed',
            },
            secondary: {
                main: '#ede9fe',
                light: '#f5f3ff',
                dark: '#c4b5fd',
                contrastText: '#8b5cf6',
            },
            error: {
                main: '#ba1a1a',
            },
            type: 'light',
        },
        typography: {
            fontFamily: 'Geist, Inter, "Helvetica Neue", Arial, sans-serif',
        },
        shape: {
            borderRadius: 8,
        },
    }),
};

export const ThemeProvider: React.FC = ({children}) => {
    const {theme} = useSettings();
    return (
        <MuiThemeProvider theme={themes[theme] || themes[SettingTheme.Zrrofviolet]}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
};
