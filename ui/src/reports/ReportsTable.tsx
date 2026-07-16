import * as React from 'react';
import moment from 'moment';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    useTheme,
} from '@material-ui/core';
import {KeyboardArrowDown, KeyboardArrowRight} from '@material-ui/icons';
import {GroupKey, ReportColumn, ReportSort, ReportTimeSpan, SortKey} from './types';
import {durationMs, formatDuration, groupEntries} from './utils/reportUtils';

const BASE_COLUMNS = ['date', 'start', 'end'];

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
    const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
    const theme = useTheme();
    React.useEffect(() => setPage(0), [entries, pageSize, groupBy]);

    const detailColumns = columns.filter((c) => c.visible && BASE_COLUMNS.indexOf(c.id) === -1);

    const paged = groupBy !== 'none' || pageSize === 'all' ? entries : entries.slice(page * pageSize, page * pageSize + pageSize);
    const groups = groupEntries(paged, groupBy);

    const toggleExpand = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const cycleSort = (id: string) => {
        const key = (id === 'time' ? 'start' : id) as SortKey;
        if (!sort || sort.key !== key) {
            onSort({key, direction: 'asc'});
        } else if (sort.direction === 'asc') {
            onSort({key, direction: 'desc'});
        } else {
            onSort(null);
        }
    };

    const renderDetail = (id: string, entry: ReportTimeSpan) => {
        switch (id) {
            case 'duration':
                return (
                    <Box>
                        <Typography variant="caption" color="textSecondary">Dauer</Typography>
                        <Typography variant="body1" style={{fontWeight: 600}}>{formatDuration(durationMs(entry))}</Typography>
                    </Box>
                );
            case 'tags':
                return !entry.tags || entry.tags.length === 0 ? null : (
                    <Box>
                        <Typography variant="caption" color="textSecondary">Tags</Typography>
                        <Box style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2}}>
                            {entry.tags.map((tag, i) => (
                                <Chip key={i} label={tag.value} size="small" style={{backgroundColor: '#bbf7d0', color: '#166534'}} />
                            ))}
                        </Box>
                    </Box>
                );
            case 'description':
                return !entry.note ? null : (
                    <Box>
                        <Typography variant="caption" color="textSecondary">Notiz</Typography>
                        <Typography variant="body2" color="textPrimary">{entry.note}</Typography>
                    </Box>
                );
            default:
                return null;
        }
    };

    const entryRow = (entry: ReportTimeSpan) => {
        const isExpanded = expanded.has(entry.id);
        return (
            <React.Fragment key={entry.id}>
                <TableRow
                    hover
                    onClick={() => toggleExpand(entry.id)}
                    style={{cursor: 'pointer'}}
                >
                    <TableCell style={{width: '40%', borderBottom: isExpanded ? 'none' : undefined}}>
                        {moment(entry.start).format('DD.MM.YYYY')}
                    </TableCell>
                    <TableCell style={{width: '50%', borderBottom: isExpanded ? 'none' : undefined}}>
                        {moment(entry.start).format('HH:mm')} – {entry.end ? moment(entry.end).format('HH:mm') : 'läuft'}
                    </TableCell>
                    <TableCell style={{width: '10%', textAlign: 'right', borderBottom: isExpanded ? 'none' : undefined}}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(entry.id); }}>
                            {isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                        </IconButton>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell
                        colSpan={3}
                        style={{padding: 0, borderBottom: isExpanded ? undefined : 'none'}}
                    >
                        <Collapse in={isExpanded} timeout={200} unmountOnExit>
                            <Box style={{
                                padding: theme.spacing(2),
                                paddingTop: 0,
                                backgroundColor: theme.palette.action.hover,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: theme.spacing(3),
                            }}>
                                {detailColumns.map((col) => (
                                    <Box key={col.id} style={{minWidth: 140, flex: '1 1 auto'}}>
                                        {renderDetail(col.id, entry)}
                                    </Box>
                                ))}
                                {detailColumns.length === 0 ? (
                                    <Typography variant="body2" color="textSecondary">
                                        Keine Details ausgewählt. Aktivieren Sie Spalten über die Checkboxen.
                                    </Typography>
                                ) : null}
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            </React.Fragment>
        );
    };

    const groupedRows = groups.map((group) => {
        const collapsed = collapsedGroups.indexOf(group.key) >= 0;
        return (
            <React.Fragment key={group.key}>
                <TableRow>
                    <TableCell colSpan={3}>
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
        <Paper style={{marginTop: 16}}>
            <Box style={{display: 'flex', gap: 16, padding: 12, flexWrap: 'wrap', alignItems: 'center'}} className="reports-no-print">
                {groupBy === 'none' ? (
                    <FormControl style={{minWidth: 120}}>
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
                <Box style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
                    {columns.map((column) => (
                        <label key={column.id} style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                            <Checkbox
                                checked={column.visible}
                                style={{color: '#22c55e', padding: 4}}
                                onChange={(e) =>
                                    onColumns(columns.map((c) => (c.id === column.id ? {...c, visible: e.target.checked} : c)))
                                }
                            />
                            <Typography variant="body2">{column.label}</Typography>
                        </label>
                    ))}
                </Box>
            </Box>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell
                            onClick={() => cycleSort('date')}
                            style={{cursor: 'pointer', width: '40%', fontWeight: 600}}
                        >
                            Datum {sort && sort.key === 'date' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                        </TableCell>
                        <TableCell
                            onClick={() => cycleSort('time')}
                            style={{cursor: 'pointer', width: '50%', fontWeight: 600}}
                        >
                            Zeit {sort && sort.key === 'start' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                        </TableCell>
                        <TableCell style={{width: '10%'}} />
                    </TableRow>
                </TableHead>
                <TableBody>{groupBy === 'none' ? paged.map(entryRow) : groupedRows}</TableBody>
            </Table>
            {groupBy === 'none' && pageSize !== 'all' ? (
                <Box className="reports-no-print" style={{padding: 12, display: 'flex', alignItems: 'center', gap: 8}}>
                    <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>
                        ← Zurück
                    </Button>
                    <Typography variant="body2">
                        Seite {page + 1} / {Math.max(1, Math.ceil(entries.length / pageSize))}
                    </Typography>
                    <Button size="small" disabled={(page + 1) * pageSize >= entries.length} onClick={() => setPage(page + 1)}>
                        Weiter →
                    </Button>
                </Box>
            ) : null}
        </Paper>
    );
};
