import * as React from 'react';
import {Button, Checkbox, FormControl, Grid, InputLabel, MenuItem, Select, TextField} from '@material-ui/core';
import {DatePreset, DurationPreset, GroupKey, ReportFilters} from './types';
import {DEFAULT_FILTERS} from './utils/reportUtils';

export const ReportsFilters: React.FC<{
    filters: ReportFilters;
    tags: string[];
    onChange: (filters: ReportFilters) => void;
}> = ({filters, tags, onChange}) => {
    const set = (patch: Partial<ReportFilters>) => onChange({...filters, ...patch});
    const monthLabel = () => {
        const name = filters.datePreset === 'lastMonth' ? 'letzter Monat' : 'dieser Monat';
        const offset = filters.monthOffset || 0;
        if (offset === 0) {
            return name;
        }
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() + offset);
        const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        return months[d.getMonth()] + ' ' + d.getFullYear();
    };
    const showNav = filters.datePreset === 'thisMonth' || filters.datePreset === 'lastMonth';
    return (
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
                <TextField fullWidth label="Suche" value={filters.search} onChange={(e) => set({search: e.target.value})} />
            </Grid>
            <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                    <InputLabel>Zeitraum</InputLabel>
                    <Select value={filters.datePreset} onChange={(e) => set({datePreset: e.target.value as DatePreset, monthOffset: 0})}>
                        {[
                            'all',
                            'today',
                            'yesterday',
                            'thisWeek',
                            'lastWeek',
                            'thisMonth',
                            'lastMonth',
                            'thisYear',
                            'custom',
                        ].map((v) => (
                            <MenuItem key={v} value={v}>
                                {v}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {showNav ? (
                    <div style={{display: 'flex', alignItems: 'center', marginTop: 4, gap: 4}}>
                        <Button size="small" onClick={() => set({monthOffset: (filters.monthOffset || 0) - 1})}>
                            ←
                        </Button>
                        <span style={{fontSize: '0.875rem', whiteSpace: 'nowrap', minWidth: 90, textAlign: 'center'}}>
                            {monthLabel()}
                        </span>
                        <Button size="small" onClick={() => set({monthOffset: (filters.monthOffset || 0) + 1})}>
                            →
                        </Button>
                    </div>
                ) : null}
            </Grid>
            {filters.datePreset === 'custom' ? (
                <>
                    <Grid item xs={6} md={2}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Von"
                            InputLabelProps={{shrink: true}}
                            value={filters.customStart}
                            onChange={(e) => set({customStart: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Bis"
                            InputLabelProps={{shrink: true}}
                            value={filters.customEnd}
                            onChange={(e) => set({customEnd: e.target.value})}
                        />
                    </Grid>
                </>
            ) : null}
            <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                    <InputLabel>Tags</InputLabel>
                    <Select multiple value={filters.tags} onChange={(e) => set({tags: e.target.value as string[]})}>
                        {tags.map((tag) => (
                            <MenuItem key={tag} value={tag}>
                                <Checkbox checked={filters.tags.indexOf(tag) >= 0} />
                                {tag}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                    <InputLabel>Dauer</InputLabel>
                    <Select
                        value={filters.durationPreset}
                        onChange={(e) => set({durationPreset: e.target.value as DurationPreset})}>
                        {['all', '30m', '1h', '2h', '4h', 'custom'].map((v) => (
                            <MenuItem key={v} value={v}>
                                {v}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            {filters.durationPreset === 'custom' ? (
                <Grid item xs={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="Minuten"
                        value={filters.customDurationMinutes}
                        onChange={(e) => set({customDurationMinutes: parseInt(e.target.value, 10) || 0})}
                    />
                </Grid>
            ) : null}
            <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                    <InputLabel>Gruppierung</InputLabel>
                    <Select value={filters.groupBy} onChange={(e) => set({groupBy: e.target.value as GroupKey})}>
                        {['none', 'day', 'week', 'month', 'year'].map((v) => (
                            <MenuItem key={v} value={v}>
                                {v}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
                <Button onClick={() => onChange(DEFAULT_FILTERS)}>Reset</Button>
            </Grid>
        </Grid>
    );
};
