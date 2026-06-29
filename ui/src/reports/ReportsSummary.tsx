import * as React from 'react';
import {Grid, Paper, Typography} from '@material-ui/core';
import {activeFilterLabel, formatDuration, summarizeEntries} from './utils/reportUtils';
import {ReportFilters, ReportTimeSpan} from './types';

export const ReportsSummary = React.memo<{entries: ReportTimeSpan[]; totalEntries: number; filters: ReportFilters}>(({entries, totalEntries, filters}) => {
    const summary = React.useMemo(() => summarizeEntries(entries), [entries]);
    const cards = [
        ['Total hours', formatDuration(summary.totalMs)],
        ['Entries', String(summary.count)],
        ['Average/day', formatDuration(summary.averagePerDayMs)],
        ['Average/entry', formatDuration(summary.averagePerEntryMs)],
        ['Longest entry', formatDuration(summary.longestMs)],
        ['Shortest entry', formatDuration(summary.shortestMs)],
        ['Visible entries', `${summary.count} / ${totalEntries}`],
        ['Current filter', activeFilterLabel(filters)],
    ];
    return (
        <Grid container spacing={2}>
            {cards.map(([label, value]) => (
                <Grid item xs={12} sm={6} md={3} key={label}>
                    <Paper style={{padding: 16}}>
                        <Typography color="textSecondary" variant="subtitle2">{label}</Typography>
                        <Typography variant="h6">{value}</Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
});
