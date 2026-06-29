import * as React from 'react';
import {Button, Checkbox, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, TextField} from '@material-ui/core';
import {DatePreset, DurationPreset, GroupKey, ReportFilters} from './types';
import {DEFAULT_FILTERS} from './utils/reportUtils';
import {datePresetLabels, durationPresetLabels, groupLabels, reportLabels} from './localization';

const datePresets: DatePreset[] = ['all', 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'custom'];
const durationPresets: DurationPreset[] = ['all', '30m', '1h', '2h', '4h', 'custom'];
const groupOptions: GroupKey[] = ['none', 'day', 'week', 'month', 'year', 'project', 'user'];

export const ReportsFilters = React.memo<{
    filters: ReportFilters;
    tags: string[];
    users: string[];
    projects: string[];
    onChange: (filters: ReportFilters) => void;
}>(({filters, tags, users, projects, onChange}) => {
    const set = React.useCallback((patch: Partial<ReportFilters>) => onChange({...filters, ...patch}), [filters, onChange]);
    return (
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><TextField fullWidth label={reportLabels.search} value={filters.search} onChange={(e) => set({search: e.target.value})} inputProps={{'aria-label': reportLabels.search}} /></Grid>
            <Grid item xs={6} md={2}><FormControl fullWidth><InputLabel>{reportLabels.datePreset}</InputLabel><Select value={filters.datePreset} onChange={(e) => set({datePreset: e.target.value as DatePreset})}>{datePresets.map((value) => <MenuItem key={value} value={value}>{datePresetLabels[value]}</MenuItem>)}</Select></FormControl></Grid>
            {filters.datePreset === 'custom' ? <><Grid item xs={6} md={2}><TextField fullWidth type="date" label="From" InputLabelProps={{shrink: true}} value={filters.customStart} onChange={(e) => set({customStart: e.target.value})} /></Grid><Grid item xs={6} md={2}><TextField fullWidth type="date" label="To" InputLabelProps={{shrink: true}} value={filters.customEnd} onChange={(e) => set({customEnd: e.target.value})} /></Grid></> : null}
            <Grid item xs={6} md={2}><FormControl fullWidth><InputLabel>{reportLabels.tags}</InputLabel><Select multiple value={filters.tags} onChange={(e) => set({tags: e.target.value as string[]})}>{tags.map((tag) => <MenuItem key={tag} value={tag}><Checkbox checked={filters.tags.indexOf(tag) >= 0} />{tag}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} md={2}><FormControl fullWidth><InputLabel>{reportLabels.user}</InputLabel><Select value={filters.user} onChange={(e) => set({user: e.target.value as string})}>{['Alle', ...users].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} md={2}><FormControl fullWidth><InputLabel>{reportLabels.project}</InputLabel><Select value={filters.project} onChange={(e) => set({project: e.target.value as string})}>{['Alle', ...projects].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} md={2}><FormControl fullWidth><InputLabel>{reportLabels.duration}</InputLabel><Select value={filters.durationPreset} onChange={(e) => set({durationPreset: e.target.value as DurationPreset})}>{durationPresets.map((value) => <MenuItem key={value} value={value}>{durationPresetLabels[value]}</MenuItem>)}</Select></FormControl></Grid>
            {filters.durationPreset === 'custom' ? <Grid item xs={6} md={2}><TextField fullWidth type="number" label="Minutes" value={filters.customDurationMinutes} onChange={(e) => set({customDurationMinutes: parseInt(e.target.value, 10) || 0})} /></Grid> : null}
            <Grid item xs={6} md={2}><FormControl fullWidth><InputLabel>{reportLabels.groupBy}</InputLabel><Select value={filters.groupBy} onChange={(e) => set({groupBy: e.target.value as GroupKey})}>{groupOptions.map((value) => <MenuItem key={value} value={value}>{groupLabels[value]}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={2}><FormControlLabel control={<Checkbox checked={filters.runningOnly} onChange={(e) => set({runningOnly: e.target.checked})} />} label={reportLabels.runningOnly} /></Grid>
            <Grid item xs={12} md={1}><Button onClick={() => onChange(DEFAULT_FILTERS)} aria-label={reportLabels.reset}>{reportLabels.reset}</Button></Grid>
        </Grid>
    );
});
