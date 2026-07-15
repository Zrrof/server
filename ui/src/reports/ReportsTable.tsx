import * as React from 'react';
import moment from 'moment';
import {
    Button,
    Checkbox,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from '@material-ui/core';
import {GroupKey, ReportColumn, ReportSort, ReportTimeSpan, SortKey} from './types';
import {durationMs, formatDuration, groupEntries} from './utils/reportUtils';

const sortable: Record<string, SortKey> = {
    date: 'date',
    start: 'start',
    end: 'end',
    duration: 'duration',
    description: 'description',
    tags: 'tags',
};

const COLUMN_WIDTHS: Record<string, string> = {
    date: '12%',
    start: '8%',
    end: '8%',
    duration: '10%',
    tags: '30%',
    description: '32%',
};

const cellStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

export const ReportsTable: React.FC<{
    entries: ReportTimeSpan[];
    columns: ReportColumn[];
    pageSize: number | 'all';
    sort: ReportSort | null;
    groupBy: GroupKey;
    collapsedGroups: string[];
    onSort: (sort: ReportSort | null) => void;
    onPageSize: (pageSize: number | 'all') => void;
    onColumns: (columns: ReportColumn[]) => void;
    onCollapsedGroups: (collapsedGroups: string[]) => void;
}> = ({entries, columns, pageSize, sort, groupBy, collapsedGroups, onSort, onPageSize, onColumns, onCollapsedGroups}) => {
    const [page, setPage] = React.useState(0);
    React.useEffect(() => setPage(0), [entries, pageSize, groupBy]);
    const visibleColumns = columns.filter((column) => column.visible);
    const paged = groupBy !== 'none' || pageSize === 'all' ? entries : entries.slice(page * pageSize, page * pageSize + pageSize);
    const groups = groupEntries(paged, groupBy);
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
                return moment(entry.start).format('DD.MM.YYYY');
            case 'start':
                return moment(entry.start).format('HH:mm');
            case 'end':
                return entry.end ? moment(entry.end).format('HH:mm') : 'läuft';
            case 'duration':
                return formatDuration(durationMs(entry));
            case 'tags':
                return !entry.tags || entry.tags.length === 0 ? '' : (
                    <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                        {entry.tags.map((tag, i) => (
                            <Chip key={i} label={tag.value} size="small" style={{backgroundColor: '#bbf7d0', color: '#166534'}} />
                        ))}
                    </div>
                );
            case 'description':
                return entry.note;
            default:
                return '';
        }
    };
    const entryRow = (entry: ReportTimeSpan) => (
        <TableRow key={entry.id}>
            {visibleColumns.map((column) => (
                <TableCell key={column.id} style={{...cellStyle, width: COLUMN_WIDTHS[column.id]}}>{render(entry, column.id)}</TableCell>
            ))}
        </TableRow>
    );
    const groupedRows = groups.map((group) => {
        const collapsed = collapsedGroups.indexOf(group.key) >= 0;
        return (
            <React.Fragment key={group.key}>
                <TableRow>
                    <TableCell colSpan={Math.max(1, visibleColumns.length)}>
                        <button
                            type="button"
                            aria-expanded={!collapsed}
                            onClick={() =>
                                onCollapsedGroups(
                                    collapsed
                                        ? collapsedGroups.filter((key) => key !== group.key)
                                        : [...collapsedGroups, group.key]
                                )
                            }>
                            {collapsed ? '▶' : '▼'} {group.label}
                        </button>{' '}
                        — {group.entries.length} Einträge, {formatDuration(group.totalMs)}
                    </TableCell>
                </TableRow>
                {collapsed ? null : group.entries.map(entryRow)}
            </React.Fragment>
        );
    });
    return (
        <Paper style={{marginTop: 16, overflowX: 'auto'}}>
            <div style={{display: 'flex', gap: 16, padding: 12, flexWrap: 'wrap'}} className="reports-no-print">
                {groupBy === 'none' ? (
                    <FormControl>
                        <InputLabel>Seitengröße</InputLabel>
                        <Select
                            value={String(pageSize)}
                            onChange={(e) =>
                                onPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value as string, 10))
                            }>
                            {[25, 50, 100, 250].map((size) => (
                                <MenuItem key={size} value={String(size)}>
                                    {size}
                                </MenuItem>
                            ))}
                            <MenuItem value="all">Alle</MenuItem>
                        </Select>
                    </FormControl>
                ) : null}
                {columns.map((column) => (
                    <label key={column.id} style={{display: 'flex', alignItems: 'center'}}>
                        <Checkbox
                            checked={column.visible}
                            style={{color: '#22c55e'}}
                            onChange={(e) =>
                                onColumns(columns.map((c) => (c.id === column.id ? {...c, visible: e.target.checked} : c)))
                            }
                        />
                        {column.label}
                    </label>
                ))}
            </div>
            <Table size="small" style={{tableLayout: 'fixed'}}>
                <TableHead>
                    <TableRow>
                        {visibleColumns.map((column) => (
                            <TableCell
                                key={column.id}
                                onClick={() => cycleSort(column.id)}
                                style={{
                                    cursor: sortable[column.id] ? 'pointer' : 'default',
                                    width: COLUMN_WIDTHS[column.id],
                                }}>
                                {column.label}{' '}
                                {sort && sortable[column.id] === sort.key ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>{groupBy === 'none' ? paged.map(entryRow) : groupedRows}</TableBody>
            </Table>
            {groupBy === 'none' && pageSize !== 'all' ? (
                <div className="reports-no-print" style={{padding: 12, display: 'flex', alignItems: 'center', gap: 8}}>
                    <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>
                        ← Zurück
                    </Button>
                    <span>
                        Seite {page + 1} / {Math.max(1, Math.ceil(entries.length / pageSize))}
                    </span>
                    <Button size="small" disabled={(page + 1) * pageSize >= entries.length} onClick={() => setPage(page + 1)}>
                        Weiter →
                    </Button>
                </div>
            ) : null}
        </Paper>
    );
};
