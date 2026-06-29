import * as React from 'react';
import moment from 'moment';
import {FixedSizeList, ListChildComponentProps} from 'react-window';
import {Checkbox, Collapse, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableFooter, TableHead, TablePagination, TableRow, Typography} from '@material-ui/core';
import DownIcon from '@material-ui/icons/KeyboardArrowDown';
import RightIcon from '@material-ui/icons/KeyboardArrowRight';
import LeftIcon from '@material-ui/icons/ArrowBack';
import MoveRightIcon from '@material-ui/icons/ArrowForward';
import {GroupKey, ReportColumn, ReportGroup, ReportSort, ReportTimeSpan, SortKey} from './types';
import {durationMs, formatDuration, groupEntries, projectValue, summarizeEntries, tagsToText, userValue} from './utils/reportUtils';
import {reportLabels} from './localization';

const sortable: Record<string, SortKey> = {date: 'date', start: 'start', end: 'end', duration: 'duration', description: 'description', user: 'user', project: 'project', tags: 'tagCount'};
const pageSizes = [25, 50, 100, 250];

const renderCell = (entry: ReportTimeSpan, id: string) => {
    switch (id) {
        case 'date': return moment(entry.start).format('YYYY-MM-DD');
        case 'start': return moment(entry.start).format('HH:mm');
        case 'end': return entry.end ? moment(entry.end).format('HH:mm') : 'läuft';
        case 'duration': return formatDuration(durationMs(entry));
        case 'tags': return tagsToText(entry);
        case 'description': return entry.note;
        case 'project': return projectValue(entry);
        case 'user': return userValue(entry);
        case 'created': return '';
        default: return '';
    }
};

export const ReportsTable = React.memo<{
    entries: ReportTimeSpan[];
    columns: ReportColumn[];
    pageSize: number | 'all';
    sort: ReportSort | null;
    groups: ReportGroup[];
    groupBy: GroupKey;
    collapsedGroups: string[];
    onSort: (sort: ReportSort | null) => void;
    onPageSize: (pageSize: number | 'all') => void;
    onColumns: (columns: ReportColumn[]) => void;
    onCollapsedGroups: (collapsedGroups: string[]) => void;
}>(({entries, columns, pageSize, sort, groups, groupBy, collapsedGroups, onSort, onPageSize, onColumns, onCollapsedGroups}) => {
    const [page, setPage] = React.useState(0);
    React.useEffect(() => setPage(0), [entries, pageSize]);
    const visibleColumns = React.useMemo(() => columns.filter((column) => column.visible), [columns]);
    const pagedEntries = React.useMemo(() => pageSize === 'all' ? entries : entries.slice(page * pageSize, page * pageSize + pageSize), [entries, page, pageSize]);
    const visibleGroups = React.useMemo(() => groupBy === 'none' ? groupEntries(pagedEntries, 'none') : groups, [groupBy, groups, pagedEntries]);
    const summary = React.useMemo(() => summarizeEntries(entries), [entries]);
    const isVirtual = pageSize === 'all' && entries.length > 2000 && groups.length === 1;
    const cycleSort = React.useCallback((id: string) => {
        const key = sortable[id];
        if (!key) { return; }
        if (!sort || sort.key !== key) { onSort({key, direction: 'asc'}); }
        else if (sort.direction === 'asc') { onSort({key, direction: 'desc'}); }
        else { onSort(null); }
    }, [onSort, sort]);
    const toggleColumn = React.useCallback((id: string, visible: boolean) => onColumns(columns.map((column) => column.id === id ? {...column, visible} : column)), [columns, onColumns]);
    const moveColumn = React.useCallback((id: string, delta: number) => {
        const index = columns.findIndex((column) => column.id === id);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= columns.length) { return; }
        const next = columns.slice();
        const moved = next.splice(index, 1)[0];
        next.splice(target, 0, moved);
        onColumns(next);
    }, [columns, onColumns]);
    const toggleGroup = React.useCallback((id: string) => {
        onCollapsedGroups(collapsedGroups.indexOf(id) >= 0 ? collapsedGroups.filter((groupId) => groupId !== id) : [...collapsedGroups, id]);
    }, [collapsedGroups, onCollapsedGroups]);
    const virtualRow = React.useCallback(({index, style}: ListChildComponentProps) => (
        <div style={{...style, display: 'flex'}} role="row" aria-rowindex={index + 2}>
            {visibleColumns.map((column) => <div key={column.id} role="cell" style={{minWidth: 140, flex: 1, padding: 8}}>{renderCell(entries[index], column.id)}</div>)}
        </div>
    ), [entries, visibleColumns]);
    return (
        <Paper style={{marginTop: 16, overflowX: 'auto'}}>
            <div style={{display: 'flex', gap: 16, padding: 12, flexWrap: 'wrap'}} className="reports-no-print">
                <FormControl><InputLabel>{reportLabels.pageSize}</InputLabel><Select value={String(pageSize)} onChange={(event) => onPageSize(event.target.value === 'all' ? 'all' : parseInt(event.target.value as string, 10))}>{pageSizes.map((size) => <MenuItem key={size} value={String(size)}>{size}</MenuItem>)}<MenuItem value="all">{reportLabels.all}</MenuItem></Select></FormControl>
                {columns.map((column, index) => <span key={column.id} style={{display: 'flex', alignItems: 'center'}}><Checkbox inputProps={{'aria-label': `${reportLabels.columns}: ${column.label}`}} checked={column.visible} onChange={(event) => toggleColumn(column.id, event.target.checked)} />{column.label}<IconButton size="small" disabled={index === 0} onClick={() => moveColumn(column.id, -1)} aria-label={`Move ${column.label} left`}><LeftIcon fontSize="small" /></IconButton><IconButton size="small" disabled={index === columns.length - 1} onClick={() => moveColumn(column.id, 1)} aria-label={`Move ${column.label} right`}><MoveRightIcon fontSize="small" /></IconButton></span>)}
            </div>
            {isVirtual ? <VirtualTable entries={entries} visibleColumns={visibleColumns} sort={sort} cycleSort={cycleSort} rowRenderer={virtualRow} /> : <GroupedTable groups={visibleGroups} visibleColumns={visibleColumns} sort={sort} collapsedGroups={collapsedGroups} cycleSort={cycleSort} toggleGroup={toggleGroup} />}
            <Table size="small"><TableFooter><TableRow><TableCell><Typography variant="subtitle2">Total hours: {formatDuration(summary.totalMs)} · Entries: {summary.count} · Average/day: {formatDuration(summary.averagePerDayMs)} · Average/entry: {formatDuration(summary.averagePerEntryMs)} · Longest: {formatDuration(summary.longestMs)} · Shortest: {formatDuration(summary.shortestMs)}</Typography></TableCell></TableRow></TableFooter></Table>
            {pageSize !== 'all' ? <TablePagination className="reports-no-print" component="div" count={entries.length} page={page} onChangePage={(_, nextPage) => setPage(nextPage)} rowsPerPage={pageSize} onChangeRowsPerPage={(event) => onPageSize(parseInt(event.target.value, 10))} rowsPerPageOptions={[25, 50, 100, 250]} /> : null}
        </Paper>
    );
});

const Header: React.FC<{visibleColumns: ReportColumn[]; sort: ReportSort | null; cycleSort: (id: string) => void}> = ({visibleColumns, sort, cycleSort}) => (
    <TableHead><TableRow>{visibleColumns.map((column) => <TableCell key={column.id} onClick={() => cycleSort(column.id)} tabIndex={sortable[column.id] ? 0 : -1} role="columnheader" aria-sort={sort && sortable[column.id] === sort.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} style={{cursor: sortable[column.id] ? 'pointer' : 'default', whiteSpace: 'nowrap'}}>{column.label} {sort && sortable[column.id] === sort.key ? (sort.direction === 'asc' ? '↑' : '↓') : ''}</TableCell>)}</TableRow></TableHead>
);

const GroupedTable: React.FC<{groups: ReportGroup[]; visibleColumns: ReportColumn[]; sort: ReportSort | null; collapsedGroups: string[]; cycleSort: (id: string) => void; toggleGroup: (id: string) => void}> = ({groups, visibleColumns, sort, collapsedGroups, cycleSort, toggleGroup}) => (
    <Table size="small"><Header visibleColumns={visibleColumns} sort={sort} cycleSort={cycleSort} /><TableBody>{groups.map((group) => {
        const collapsed = collapsedGroups.indexOf(group.id) >= 0;
        return <React.Fragment key={group.id}><TableRow><TableCell colSpan={visibleColumns.length}><IconButton size="small" onClick={() => toggleGroup(group.id)} aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${group.label}`}>{collapsed ? <RightIcon /> : <DownIcon />}</IconButton><strong>{group.label}</strong> · {formatDuration(group.totalMs)} · {group.count} entries</TableCell></TableRow><TableRow><TableCell colSpan={visibleColumns.length} style={{padding: 0}}><Collapse in={!collapsed} timeout="auto" unmountOnExit><Table size="small"><TableBody>{group.entries.map((entry) => <TableRow key={entry.id}>{visibleColumns.map((column) => <TableCell key={column.id}>{renderCell(entry, column.id)}</TableCell>)}</TableRow>)}</TableBody></Table></Collapse></TableCell></TableRow></React.Fragment>;
    })}</TableBody></Table>
);

const VirtualTable: React.FC<{entries: ReportTimeSpan[]; visibleColumns: ReportColumn[]; sort: ReportSort | null; cycleSort: (id: string) => void; rowRenderer: React.ComponentType<ListChildComponentProps>}> = ({entries, visibleColumns, sort, cycleSort, rowRenderer}) => (
    <div role="table" aria-rowcount={entries.length}>
        <Table size="small"><Header visibleColumns={visibleColumns} sort={sort} cycleSort={cycleSort} /></Table>
        <FixedSizeList height={600} itemCount={entries.length} itemSize={44} width="100%">{rowRenderer}</FixedSizeList>
    </div>
);
