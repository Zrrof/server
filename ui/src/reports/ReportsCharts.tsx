import * as React from 'react';
import {FormControl, InputLabel, MenuItem, Paper, Select} from '@material-ui/core';
import {useTheme} from '@material-ui/core/styles';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {ChartKey, ReportTimeSpan} from './types';
import {chartRows} from './utils/reportUtils';

const chartOptions: ChartKey[] = ['none', 'day', 'week', 'month', 'project', 'tag', 'user'];

export const ReportsCharts = React.memo<{
    entries: ReportTimeSpan[];
    chart: ChartKey;
    onChart: (chart: ChartKey) => void;
}>(({entries, chart, onChart}) => {
    const theme = useTheme();
    const data = React.useMemo(() => chart === 'none' ? [] : chartRows(entries, chart), [entries, chart]);
    return (
        <Paper style={{padding: 16, marginTop: 16}} className="reports-no-print">
            <FormControl>
                <InputLabel>Chart</InputLabel>
                <Select value={chart} onChange={(event) => onChart(event.target.value as ChartKey)} inputProps={{'aria-label': 'Report chart'}}>
                    {chartOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </Select>
            </FormControl>
            {chart !== 'none' ? (
                <div style={{height: 260, marginTop: 16}}>
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="hours" fill={theme.palette.primary.main} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : null}
        </Paper>
    );
});
