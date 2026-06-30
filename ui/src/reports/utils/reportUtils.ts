import moment from 'moment';
import {ReportFilters, ReportSort, ReportTimeSpan} from '../types';

export const DEFAULT_COLUMNS = [
    {id: 'date', label: 'Datum', visible: true},
    {id: 'start', label: 'Start', visible: true},
    {id: 'end', label: 'Ende', visible: true},
    {id: 'duration', label: 'Dauer', visible: true},
    {id: 'tags', label: 'Tags', visible: true},
    {id: 'description', label: 'Beschreibung', visible: true},
    {id: 'project', label: 'Projekt', visible: true},
    {id: 'user', label: 'Benutzer', visible: true},
    {id: 'created', label: 'Erstellt am', visible: false},
];

export const DEFAULT_FILTERS: ReportFilters = {
    search: '',
    datePreset: 'all',
    customStart: '',
    customEnd: '',
    tags: [],
    user: 'Alle',
    project: 'Alle',
    runningOnly: false,
    durationPreset: 'all',
    customDurationMinutes: 0,
    groupBy: 'none',
};

export const tagsToText = (entry: ReportTimeSpan) => (entry.tags || []).map((tag) => tag.value).join(', ');
export const tagValue = (entry: ReportTimeSpan, key: string) => {
    const tag = (entry.tags || []).find((entryTag) => entryTag.key.toLowerCase() === key);
    return tag ? tag.value : '';
};
export const projectValue = (entry: ReportTimeSpan) => tagValue(entry, 'project') || tagValue(entry, 'projekt');
export const userValue = (entry: ReportTimeSpan) => tagValue(entry, 'user') || tagValue(entry, 'benutzer');
export const durationMs = (entry: ReportTimeSpan, now = moment()) => Math.max(0, (entry.end ? moment(entry.end) : now).diff(moment(entry.start)));
export const formatDuration = (ms: number) => {
    const minutes = Math.round(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} h ${rest.toString().padStart(2, '0')} min` : `${rest} min`;
};

const dateRange = (filters: ReportFilters) => {
    const now = moment();
    switch (filters.datePreset) {
        case 'today':
            return {start: now.clone().startOf('day'), end: now.clone().endOf('day')};
        case 'yesterday':
            return {start: now.clone().subtract(1, 'day').startOf('day'), end: now.clone().subtract(1, 'day').endOf('day')};
        case 'thisWeek':
            return {start: now.clone().startOf('isoWeek'), end: now.clone().endOf('isoWeek')};
        case 'lastWeek':
            return {start: now.clone().subtract(1, 'week').startOf('isoWeek'), end: now.clone().subtract(1, 'week').endOf('isoWeek')};
        case 'thisMonth':
            return {start: now.clone().startOf('month'), end: now.clone().endOf('month')};
        case 'lastMonth':
            return {start: now.clone().subtract(1, 'month').startOf('month'), end: now.clone().subtract(1, 'month').endOf('month')};
        case 'thisYear':
            return {start: now.clone().startOf('year'), end: now.clone().endOf('year')};
        case 'custom':
            return {
                start: filters.customStart ? moment(filters.customStart).startOf('day') : null,
                end: filters.customEnd ? moment(filters.customEnd).endOf('day') : null,
            };
        default:
            return {start: null, end: null};
    }
};

export const filterEntries = (entries: ReportTimeSpan[], filters: ReportFilters, now = moment()) => {
    const range = dateRange(filters);
    const minDuration = filters.durationPreset === 'custom' ? filters.customDurationMinutes * 60000 : {all: 0, '30m': 1800000, '1h': 3600000, '2h': 7200000, '4h': 14400000}[filters.durationPreset];
    const search = filters.search.toLowerCase().trim();
    return entries.filter((entry) => {
        const start = moment(entry.start);
        if (range.start && start.isBefore(range.start)) { return false; }
        if (range.end && start.isAfter(range.end)) { return false; }
        if (filters.runningOnly && entry.end) { return false; }
        if (filters.tags.length > 0 && !filters.tags.every((tag) => (entry.tags || []).some((entryTag) => entryTag.key === tag))) { return false; }
        if (filters.user !== 'Alle' && userValue(entry) !== filters.user) { return false; }
        if (filters.project !== 'Alle' && projectValue(entry) !== filters.project) { return false; }
        if (minDuration > 0 && durationMs(entry, now) <= minDuration) { return false; }
        if (search) {
            const haystack = [entry.note, tagsToText(entry), projectValue(entry), userValue(entry)].join(' ').toLowerCase();
            if (!haystack.includes(search)) { return false; }
        }
        return true;
    });
};

export const sortEntries = (entries: ReportTimeSpan[], sort: ReportSort | null, now = moment()) => {
    if (!sort) { return entries; }
    const getValue = (entry: ReportTimeSpan): string | number => {
        switch (sort.key) {
            case 'date': return moment(entry.start).startOf('day').valueOf();
            case 'start': return moment(entry.start).valueOf();
            case 'end': return entry.end ? moment(entry.end).valueOf() : Number.MAX_SAFE_INTEGER;
            case 'duration': return durationMs(entry, now);
            case 'description': return entry.note.toLowerCase();
            case 'user': return userValue(entry).toLowerCase();
            case 'project': return projectValue(entry).toLowerCase();
            case 'tagCount': return (entry.tags || []).length;
            default: return '';
        }
    };
    return entries.slice().sort((a, b) => {
        const av = getValue(a);
        const bv = getValue(b);
        const result = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.direction === 'asc' ? result : -result;
    });
};

export const summarizeEntries = (entries: ReportTimeSpan[], now = moment()) => {
    const durations = entries.map((entry) => durationMs(entry, now));
    const total = durations.reduce((sum, value) => sum + value, 0);
    const days = new Set(entries.map((entry) => moment(entry.start).format('YYYY-MM-DD'))).size || 1;
    return {
        totalMs: total,
        count: entries.length,
        averagePerDayMs: total / days,
        averagePerEntryMs: entries.length ? total / entries.length : 0,
        longestMs: durations.length ? Math.max(...durations) : 0,
        shortestMs: durations.length ? Math.min(...durations) : 0,
    };
};
