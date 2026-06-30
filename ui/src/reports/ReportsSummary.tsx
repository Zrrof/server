import * as React from 'react';
import {Grid, Paper, Typography} from '@material-ui/core';
import {formatDuration, summarizeEntries} from './utils/reportUtils';
import {ReportTimeSpan} from './types';

export const ReportsSummary: React.FC<{entries: ReportTimeSpan[]}> = ({entries}) => {
    const summary = React.useMemo(() => summarizeEntries(entries), [entries]);
    const cards = [
        ['Gesamtstunden', formatDuration(summary.totalMs)],
        ['Einträge', String(summary.count)],
        ['Durchschnitt', formatDuration(summary.averagePerEntryMs)],
        ['Längster Eintrag', formatDuration(summary.longestMs)],
    ];
    return (
        <Grid container spacing={2}>
            {cards.map(([label, value]) => (
                <Grid item xs={12} sm={6} md={3} key={label}>
                    <Paper style={{padding: 16}}>
                        <Typography color="textSecondary" variant="subtitle2">
                            {label}
                        </Typography>
                        <Typography variant="h5">{value}</Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
};
