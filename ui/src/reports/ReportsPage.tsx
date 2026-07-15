import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import {Button, Paper, Typography} from '@material-ui/core';
import makeStyles from '@material-ui/core/styles/makeStyles';
import * as gqlTimeSpan from '../gql/timeSpan';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {
    ChartKey,
    DatePreset,
    DurationPreset,
    GroupKey,
    ReportColumn,
    ReportFilters,
    ReportSettings,
    ReportTimeSpan,
    SortKey,
} from './types';
import {DEFAULT_COLUMNS, DEFAULT_FILTERS, filterEntries, sortEntries} from './utils/reportUtils';
import {ReportsFilters} from './ReportsFilters';
import {ReportsSummary} from './ReportsSummary';
import {ReportsTable} from './ReportsTable';
import {ReportsCharts} from './ReportsCharts';
import {ReportsPrintHeader} from './ReportsPrintHeader';
import {downloadCsv} from './export/csv';
import {ExcelExportDialog} from './export/ExcelExportDialog';

const STORAGE_KEY = 'traggo.reports.settings';
const DEFAULT_SETTINGS: ReportSettings = {
    sort: {key: 'start', direction: 'desc'},
    columns: DEFAULT_COLUMNS,
    pageSize: 25,
    filters: DEFAULT_FILTERS,
    chart: 'none',
    collapsedGroups: [],
};
const SORT_KEYS: SortKey[] = ['date', 'start', 'end', 'duration', 'description', 'tags'];
const DATE_PRESETS: DatePreset[] = [
    'all',
    'today',
    'yesterday',
    'thisWeek',
    'lastWeek',
    'thisMonth',
    'lastMonth',
    'thisYear',
    'custom',
];
const DURATION_PRESETS: DurationPreset[] = ['all', '30m', '1h', '2h', '4h', 'custom'];
const GROUP_KEYS: GroupKey[] = ['none', 'day', 'week', 'month', 'year'];
const CHART_KEYS: ChartKey[] = ['none', 'day', 'week', 'month', 'tag'];

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

const normalizeFilters = (saved: Partial<ReportFilters>): ReportFilters => ({
    search: typeof saved.search === 'string' ? saved.search : DEFAULT_FILTERS.search,
    datePreset: saved.datePreset && DATE_PRESETS.indexOf(saved.datePreset) >= 0 ? saved.datePreset : DEFAULT_FILTERS.datePreset,
    customStart: typeof saved.customStart === 'string' ? saved.customStart : DEFAULT_FILTERS.customStart,
    customEnd: typeof saved.customEnd === 'string' ? saved.customEnd : DEFAULT_FILTERS.customEnd,
    tags: Array.isArray(saved.tags) ? saved.tags.filter((tag) => typeof tag === 'string') : DEFAULT_FILTERS.tags,
    durationPreset:
        saved.durationPreset && DURATION_PRESETS.indexOf(saved.durationPreset) >= 0
            ? saved.durationPreset
            : DEFAULT_FILTERS.durationPreset,
    customDurationMinutes:
        typeof saved.customDurationMinutes === 'number'
            ? Math.max(0, saved.customDurationMinutes)
            : DEFAULT_FILTERS.customDurationMinutes,
    groupBy: saved.groupBy && GROUP_KEYS.indexOf(saved.groupBy) >= 0 ? saved.groupBy : DEFAULT_FILTERS.groupBy,
    monthOffset: typeof saved.monthOffset === 'number' ? saved.monthOffset : DEFAULT_FILTERS.monthOffset,
});

const normalizeColumns = (saved: ReportColumn[] | undefined) => {
    const allowedIds = DEFAULT_COLUMNS.map((column) => column.id);
    const savedColumns = Array.isArray(saved)
        ? saved.filter(
              (column, index, columns) =>
                  column &&
                  allowedIds.indexOf(column.id) >= 0 &&
                  columns.findIndex((candidate) => candidate.id === column.id) === index
          )
        : [];
    return [
        ...savedColumns.map((column) => ({...column, visible: column.visible !== false})),
        ...DEFAULT_COLUMNS.filter((column) => !savedColumns.some((savedColumn) => savedColumn.id === column.id)),
    ];
};

const normalizePageSize = (saved: number | 'all' | undefined): number | 'all' => {
    if (saved === 'all') {
        return saved;
    }
    return typeof saved === 'number' && [25, 50, 100, 250].indexOf(saved) >= 0 ? saved : DEFAULT_SETTINGS.pageSize;
};

const readSettings = (): ReportSettings => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ReportSettings>;
        return {
            sort: saved.sort && SORT_KEYS.indexOf(saved.sort.key) >= 0 ? saved.sort : DEFAULT_SETTINGS.sort,
            columns: normalizeColumns(saved.columns),
            pageSize: normalizePageSize(saved.pageSize),
            filters: normalizeFilters(saved.filters || {}),
            chart: saved.chart && CHART_KEYS.indexOf(saved.chart) >= 0 ? saved.chart : DEFAULT_SETTINGS.chart,
            collapsedGroups: Array.isArray(saved.collapsedGroups)
                ? saved.collapsedGroups.filter((key) => typeof key === 'string')
                : DEFAULT_SETTINGS.collapsedGroups,
        };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};

const useStyles = makeStyles((theme) => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(3),
        overflow: 'hidden',
    },
}));

export const ReportsPage = () => {
    const classes = useStyles();
    const [settings, setSettings] = React.useState<ReportSettings>(readSettings);
    const [excelDialogOpen, setExcelDialogOpen] = React.useState(false);
    const {data, loading, error, fetchMore} = useQuery<ReportsTimeSpansData, ReportsTimeSpansVariables>(gqlTimeSpan.TimeSpans, {
        variables: {cursor: {pageSize: 500}},
    });
    const requestedLength = React.useRef<number | null>(null);
    React.useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);
    React.useEffect(() => {
        if (!data || !data.timeSpans || loading) {
            return;
        }
        const loaded = data.timeSpans.timeSpans.length;
        const cursor = data.timeSpans.cursor;
        if (!cursor || !cursor.pageSize || loaded === 0 || loaded % cursor.pageSize !== 0 || requestedLength.current === loaded) {
            return;
        }
        requestedLength.current = loaded;
        fetchMore({
            variables: {cursor},
            updateQuery: (prev, {fetchMoreResult}) =>
                fetchMoreResult
                    ? {
                          timeSpans: {
                              ...fetchMoreResult.timeSpans,
                              timeSpans: [...prev.timeSpans.timeSpans, ...fetchMoreResult.timeSpans.timeSpans],
                          },
                      }
                    : prev,
        });
    }, [data, loading, fetchMore]);
    if (loading && !data) {
        return <CenteredSpinner />;
    }
    if (error) {
        return <Typography color="error">Reports konnten nicht geladen werden: {error.message}</Typography>;
    }
    const entries: ReportTimeSpan[] = (data && data.timeSpans && data.timeSpans.timeSpans) || [];
    const tags = Array.from(
        new Set(entries.reduce((all: string[], entry) => all.concat((entry.tags || []).map((tag) => tag.key)), []))
    ).sort();
    const filtered = sortEntries(filterEntries(entries, settings.filters), settings.sort);
    return (
        <div className={`${classes.root} reports-page`}>
            <ReportsPrintHeader filters={settings.filters} />
            <Typography variant="h4" component="h1" gutterBottom className="reports-screen-title">
                Reports
            </Typography>
            <ReportsSummary entries={filtered} />
            <Paper style={{padding: 16, marginTop: 16}} className="reports-no-print">
                <ReportsFilters
                    filters={settings.filters}
                    tags={tags}
                    onChange={(filters) => setSettings({...settings, filters})}
                />
                <div style={{marginTop: 16}}>
                    <Button variant="contained" color="primary" onClick={() => setExcelDialogOpen(true)}>
                        Excel exportieren
                    </Button>{' '}
                    <Button variant="outlined" onClick={() => downloadCsv(filtered)}>
                        CSV exportieren
                    </Button>{' '}
                    {excelDialogOpen && (
                        <ExcelExportDialog
                            entries={filtered}
                            onClose={() => setExcelDialogOpen(false)}
                        />
                    )}
                    <Button variant="outlined" onClick={() => window.print()}>
                        Drucken / Als PDF speichern
                    </Button>
                </div>
            </Paper>
            <ReportsCharts entries={filtered} chart={settings.chart} onChart={(chart) => setSettings({...settings, chart})} />
            <ReportsTable
                entries={filtered}
                columns={settings.columns}
                pageSize={settings.pageSize}
                sort={settings.sort}
                groupBy={settings.filters.groupBy}
                collapsedGroups={settings.collapsedGroups}
                onSort={(sort) => setSettings({...settings, sort})}
                onPageSize={(pageSize) => setSettings({...settings, pageSize})}
                onColumns={(columns) => setSettings({...settings, columns})}
                onCollapsedGroups={(collapsedGroups) => setSettings({...settings, collapsedGroups})}
            />
        </div>
    );
};
