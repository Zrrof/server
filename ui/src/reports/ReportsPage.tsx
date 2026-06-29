import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import {Button, Paper, Typography} from '@material-ui/core';
import * as gqlTimeSpan from '../gql/timeSpan';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {ReportSettings, ReportTimeSpan} from './types';
import {DEFAULT_COLUMNS, DEFAULT_FILTERS, filterEntries, groupEntries, projectValue, sortEntries, userValue} from './utils/reportUtils';
import {ReportsCharts} from './ReportsCharts';
import {ReportsFilters} from './ReportsFilters';
import {ReportsPrintHeader} from './ReportsPrintHeader';
import {ReportsSummary} from './ReportsSummary';
import {ReportsTable} from './ReportsTable';
import {downloadCsv} from './export/csv';
import {downloadExcel} from './export/excel';
import {reportLabels} from './localization';

const STORAGE_KEY = 'traggo.reports.settings';
const DEFAULT_SETTINGS: ReportSettings = {
    sort: {key: 'start', direction: 'desc'},
    columns: DEFAULT_COLUMNS,
    pageSize: 25,
    filters: DEFAULT_FILTERS,
    collapsedGroups: [],
    chart: 'none',
};

interface ReportsCursor {
    pageSize: number;
    offset: number;
    startId: number;
}

interface ReportsTimeSpansData {
    timeSpans: {
        timeSpans: ReportTimeSpan[];
        cursor: ReportsCursor;
    };
}

interface ReportsTimeSpansVariables {
    cursor: Partial<ReportsCursor>;
}

const readSettings = () => {
    try {
        return {...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')};
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};

export const ReportsPage = () => {
    const [settings, setSettings] = React.useState<ReportSettings>(readSettings);
    const {data, loading, error, fetchMore} = useQuery<ReportsTimeSpansData, ReportsTimeSpansVariables>(gqlTimeSpan.TimeSpans, {variables: {cursor: {pageSize: 500}}});
    const requestedLength = React.useRef<number | null>(null);
    React.useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
    React.useEffect(() => {
        if (!data || !data.timeSpans || loading) { return; }
        const loaded = data.timeSpans.timeSpans.length;
        const cursor = data.timeSpans.cursor;
        if (!cursor || !cursor.pageSize || loaded === 0 || loaded % cursor.pageSize !== 0 || requestedLength.current === loaded) { return; }
        requestedLength.current = loaded;
        fetchMore({
            variables: {cursor},
            updateQuery: (prev, {fetchMoreResult}) => fetchMoreResult ? {
                timeSpans: {
                    ...fetchMoreResult.timeSpans,
                    timeSpans: [...prev.timeSpans.timeSpans, ...fetchMoreResult.timeSpans.timeSpans],
                },
            } : prev,
        });
    }, [data, loading, fetchMore]);
    const entries: ReportTimeSpan[] = React.useMemo(() => (data && data.timeSpans && data.timeSpans.timeSpans) || [], [data]);
    const tags = React.useMemo(() => Array.from(new Set(entries.reduce((all: string[], entry) => all.concat((entry.tags || []).map((tag) => tag.key)), []))).sort(), [entries]);
    const users = React.useMemo(() => Array.from(new Set(entries.map(userValue).filter(Boolean))).sort(), [entries]);
    const projects = React.useMemo(() => Array.from(new Set(entries.map(projectValue).filter(Boolean))).sort(), [entries]);
    const filtered = React.useMemo(() => sortEntries(filterEntries(entries, settings.filters), settings.sort), [entries, settings.filters, settings.sort]);
    const groups = React.useMemo(() => groupEntries(filtered, settings.filters.groupBy), [filtered, settings.filters.groupBy]);
    const updateSettings = React.useCallback((patch: Partial<ReportSettings>) => setSettings((current) => ({...current, ...patch})), []);
    if (loading && !data) { return <CenteredSpinner />; }
    if (error) { return <Typography color="error">Reports konnten nicht geladen werden: {error.message}</Typography>; }
    return (
        <div style={{maxWidth: 1600, margin: '0 auto'}} className="reports-page">
            <ReportsPrintHeader filters={settings.filters} />
            <Typography variant="h4" component="h1" gutterBottom className="reports-screen-title">{reportLabels.title}</Typography>
            <ReportsSummary entries={filtered} totalEntries={entries.length} filters={settings.filters} />
            <ReportsCharts entries={filtered} chart={settings.chart} onChart={(chart) => updateSettings({chart})} />
            <Paper style={{padding: 16, marginTop: 16}} className="reports-no-print">
                <ReportsFilters filters={settings.filters} tags={tags} users={users} projects={projects} onChange={(filters) => updateSettings({filters, collapsedGroups: []})} />
                <div style={{marginTop: 16}}>
                    <Button variant="contained" color="primary" onClick={() => downloadCsv(filtered)}>{reportLabels.csv}</Button>{' '}
                    <Button variant="outlined" onClick={() => downloadExcel(filtered, settings.filters)}>{reportLabels.excel}</Button>{' '}
                    <Button variant="outlined" onClick={() => window.print()}>{reportLabels.print}</Button>
                </div>
            </Paper>
            <ReportsTable
                entries={filtered}
                columns={settings.columns}
                pageSize={settings.pageSize}
                sort={settings.sort}
                groups={groups}
                groupBy={settings.filters.groupBy}
                collapsedGroups={settings.collapsedGroups}
                onSort={(sort) => updateSettings({sort})}
                onPageSize={(pageSize) => updateSettings({pageSize})}
                onColumns={(columns) => updateSettings({columns})}
                onCollapsedGroups={(collapsedGroups) => updateSettings({collapsedGroups})}
            />
        </div>
    );
};
