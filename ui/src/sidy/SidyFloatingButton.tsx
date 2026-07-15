import * as React from 'react';
import {Button, Fab, useMediaQuery, useTheme} from '@material-ui/core';
import {Alarm} from '@material-ui/icons';
import {SidyDialog} from './SidyDialog';
import {useSettings} from '../gql/settings';

export const SidyFloatingButton: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    const {done, dateTimeInputStyle, sidyFloatingEnabled} = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!done || dateTimeInputStyle !== 'Sidy' || !sidyFloatingEnabled) {
        return null;
    }

    return (
        <>
            {isMobile ? (
                <Fab
                    color="primary"
                    onClick={() => setOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1300,
                    }}
                >
                    <Alarm />
                </Fab>
            ) : (
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<Alarm />}
                    onClick={() => setOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1300,
                        borderRadius: 28,
                        padding: '12px 32px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    }}
                >
                    Zeit manuell eintragen
                </Button>
            )}
            <SidyDialog open={open} onClose={() => setOpen(false)} />
        </>
    );
};
