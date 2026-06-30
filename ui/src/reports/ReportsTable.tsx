import * as React from 'react';
import moment from 'moment';
import {
    Checkbox,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableRow,
    Typography,
} from '@material-ui/core';
import {ReportColumn, ReportSort, ReportTimeSpan, SortKey} from './types';
import {
    durationMs,
    formatDuration,
    labelKeys,
    projectValue,
    summarizeEntries,
    tagsToText,
    tagValue,
    userValue,
} from './utils/reportUtils';

const sortable: Record<string, SortKey> = {
    date: 'date',
    start: 'start',
    end: 'end',
    duration: 'duration',
    description: 'description',
    user: 'user',
    project: 'project',
    tags: 'tagCount',
};

export const ReportsTable: React.FC<{
    entries: ReportTimeSpan[];
    columns: ReportColumn[];
    pageSize: number | 'all';
    sort: ReportSort | null;
    onSort: (sort: ReportSort | null) => void;
    onPageSize: (pageSize: number | 'all') => void;
    onColumns: (columns: ReportColumn[]) => void;
}> = ({entries, columns, pageSize, sort, onSort, onPageSize, onColumns}) => {
    const [page, setPage] = React.useState(0);
    React.useEffect(() => setPage(0), [entries, pageSize]);
    const labelColumns = labelKeys(entries).map((key) => ({id: `label:${key}`, label: key, visible: true}));
    const visibleColumns = [...columns.filter((column) => column.visible), ...labelColumns];
    const paged = pageSize === 'all' ? entries : entries.slice(page * pageSize, page * pageSize + pageSize);
    const summary = summarizeEntries(entries);
    const cycleSort = (id: string) => {
        const key = sortable[id];
        if (!key) {
            return;
        }
        if (!sort || sort.key !== key) {
            onSort({key, direction: 'asc'});
        } else if (sort.direction === 'asc') {
            onSort({key, direction: 'desc'});
        } else {
            onSort(null);
        }
    };
    const render = (entry: ReportTimeSpan, id: string) => {
        switch (id) {
            case 'date':
                return moment(entry.start).format('YYYY-MM-DD');
            case 'start':
                return moment(entry.start).format('HH:mm');
            case 'end':
                return entry.end ? moment(entry.end).format('HH:mm') : 'läuft';
            case 'duration':
                return formatDuration(durationMs(entry));
            case 'tags':
                return tagsToText(entry);
            case 'description':
                return entry.note;
            case 'project':
                return projectValue(entry);
            case 'user':
                return userValue(entry);
            case 'created':
                return '';
            default:
                return id.indexOf('label:') === 0 ? tagValue(entry, id.slice(6)) : '';
        }
    };
    return (
        <Paper style={{marginTop: 16, overflowX: 'auto'}}>
            <div style={{display: 'flex', gap: 16, padding: 12, flexWrap: 'wrap'}} className="reports-no-print">
                <FormControl>
                    <InputLabel>Seitengröße</InputLabel>
                    <Select
                        value={String(pageSize)}
                        onChange={(e) => onPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value as string, 10))}>
                        {[25, 50, 100, 250].map((size) => (
                            <MenuItem key={size} value={String(size)}>
                                {size}
                            </MenuItem>
                        ))}
                        <MenuItem value="all">Alle</MenuItem>
                    </Select>
                </FormControl>
                {columns.map((column) => (
                    <label key={column.id} style={{display: 'flex', alignItems: 'center'}}>
                        <Checkbox
                            checked={column.visible}
                            onChange={(e) =>
                                onColumns(columns.map((c) => (c.id === column.id ? {...c, visible: e.target.checked} : c)))
                            }
                        />
                        {column.label}
                    </label>
                ))}
            </div>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        {visibleColumns.map((column) => (
                            <TableCell
                                key={column.id}
                                onClick={() => cycleSort(column.id)}
                                style={{cursor: sortable[column.id] ? 'pointer' : 'default', whiteSpace: 'nowrap'}}>
                                {column.label}{' '}
                                {sort && sortable[column.id] === sort.key ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paged.map((entry) => (
                        <TableRow key={entry.id}>
                            {visibleColumns.map((column) => (
                                <TableCell key={column.id}>{render(entry, column.id)}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={visibleColumns.length}>
                            <Typography variant="subtitle2">
                                Gesamtstunden: {formatDuration(summary.totalMs)} · Gesamteinträge: {summary.count} · Durchschnitt
                                pro Tag: {formatDuration(summary.averagePerDayMs)} · Durchschnitt pro Eintrag:{' '}
                                {formatDuration(summary.averagePerEntryMs)} · Längster Eintrag:{' '}
                                {formatDuration(summary.longestMs)} · Kürzester Eintrag: {formatDuration(summary.shortestMs)}
                            </Typography>
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
            {pageSize !== 'all' ? (
                <div className="reports-no-print" style={{padding: 12}}>
                    <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                        Zurück
                    </button>{' '}
                    <span>
                        Seite {page + 1} / {Math.max(1, Math.ceil(entries.length / pageSize))}
                    </span>{' '}
                    <button disabled={(page + 1) * pageSize >= entries.length} onClick={() => setPage(page + 1)}>
                        Weiter
                    </button>
                </div>
            ) : null}
        </Paper>
    );
};
