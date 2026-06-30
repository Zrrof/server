import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import {Button, Paper, Typography} from '@material-ui/core';
import * as gqlTimeSpan from '../gql/timeSpan';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {ReportFilters, ReportSettings, ReportTimeSpan} from './types';
import {DEFAULT_COLUMNS, DEFAULT_FILTERS, filterEntries, sortEntries} from './utils/reportUtils';
import {ReportsFilters} from './ReportsFilters';
import {ReportsSummary} from './ReportsSummary';
import {ReportsTable} from './ReportsTable';
import {downloadCsv} from './export/csv';
import {downloadExcel} from './export/excel';

const STORAGE_KEY = 'traggo.reports.settings';
const DEFAULT_SETTINGS: ReportSettings = {
    sort: {key: 'start', direction: 'desc'},
    columns: DEFAULT_COLUMNS,
    pageSize: 25,
    filters: DEFAULT_FILTERS,
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

const withoutLegacyFilters = (filters: Partial<ReportFilters>) => {
    const normalized = {...DEFAULT_FILTERS, ...filters} as ReportFilters & {user?: string; project?: string};
    delete normalized.user;
    delete normalized.project;
    return normalized;
};

const readSettings = (): ReportSettings => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ReportSettings>;
        return {...DEFAULT_SETTINGS, ...saved, filters: withoutLegacyFilters(saved.filters || {})};
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
    if (loading && !data) { return <CenteredSpinner />; }
    if (error) { return <Typography color="error">Reports konnten nicht geladen werden: {error.message}</Typography>; }
    const entries: ReportTimeSpan[] = (data && data.timeSpans && data.timeSpans.timeSpans) || [];
    const tags = Array.from(new Set(entries.reduce((all: string[], entry) => all.concat((entry.tags || []).map((tag) => tag.key)), []))).sort();
    const filtered = sortEntries(filterEntries(entries, settings.filters), settings.sort);
    return (
        <div style={{maxWidth: 1600, margin: '0 auto'}} className="reports-page">
            <Typography variant="h4" component="h1" gutterBottom>Reports</Typography>
            <ReportsSummary entries={filtered} />
            <Paper style={{padding: 16, marginTop: 16}} className="reports-no-print">
                <ReportsFilters
                    filters={settings.filters}
                    tags={tags}
                    onChange={(filters) => setSettings({...settings, filters})}
                />
                <div style={{marginTop: 16}}>
                    <Button variant="contained" color="primary" onClick={() => downloadCsv(filtered)}>CSV exportieren</Button>{' '}
                    <Button variant="outlined" onClick={() => downloadExcel(filtered, settings.filters)}>Excel exportieren</Button>{' '}
                    <Button variant="outlined" onClick={() => window.print()}>Drucken / Als PDF speichern</Button>
                </div>
            </Paper>
            <ReportsTable entries={filtered} columns={settings.columns} pageSize={settings.pageSize} sort={settings.sort} onSort={(sort) => setSettings({...settings, sort})} onPageSize={(pageSize) => setSettings({...settings, pageSize})} onColumns={(columns) => setSettings({...settings, columns})} />
        </div>
    );
};
