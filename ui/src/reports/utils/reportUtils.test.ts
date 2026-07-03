import moment from 'moment';
import {chartRows, DEFAULT_COLUMNS, filterEntries, groupEntries, sortEntries, summarizeEntries} from './reportUtils';
import {ChartKey, GroupKey, ReportFilters, ReportTimeSpan} from '../types';

const entries: ReportTimeSpan[] = [
    {
        id: 1,
        start: '2026-06-29T08:00:00Z',
        end: '2026-06-29T09:00:00Z',
        note: 'Alpha work',
        tags: [{key: 'activity', value: 'Planning'}],
    },
    {
        id: 2,
        start: '2026-06-30T10:00:00Z',
        end: '2026-06-30T12:30:00Z',
        note: 'Beta study',
        tags: [
            {key: 'activity', value: 'Research'},
            {key: 'location', value: 'Office'},
        ],
    },
];

const filters: ReportFilters = {
    search: '',
    datePreset: 'all',
    customStart: '',
    customEnd: '',
    tags: [],
    durationPreset: 'all',
    customDurationMinutes: 0,
    groupBy: 'none',
};

test('defines only the supported report columns', () => {
    expect(DEFAULT_COLUMNS.map((column) => column.id)).toEqual(['date', 'start', 'end', 'duration', 'tags', 'description']);
});

test('searches descriptions, tag keys, tag values, and dates', () => {
    expect(filterEntries(entries, {...filters, search: 'study'}).map((entry) => entry.id)).toEqual([2]);
    expect(filterEntries(entries, {...filters, search: 'location'}).map((entry) => entry.id)).toEqual([2]);
    expect(filterEntries(entries, {...filters, search: 'planning'}).map((entry) => entry.id)).toEqual([1]);
    expect(filterEntries(entries, {...filters, search: '30.06.2026'}).map((entry) => entry.id)).toEqual([2]);
});

test('combines tag, date, and duration filters', () => {
    const now = moment('2026-06-30T13:00:00Z');
    const result = filterEntries(
        entries,
        {
            ...filters,
            datePreset: 'custom',
            customStart: '2026-06-30',
            customEnd: '2026-06-30',
            tags: ['activity'],
            durationPreset: '2h',
        },
        now
    );
    expect(result.map((entry) => entry.id)).toEqual([2]);
});

test('sorts by duration and displayed tags in both directions', () => {
    expect(sortEntries(entries, {key: 'duration', direction: 'desc'})[0].id).toBe(2);
    expect(sortEntries(entries, {key: 'duration', direction: 'asc'})[0].id).toBe(1);
    expect(sortEntries(entries, {key: 'tags', direction: 'asc'})[0].id).toBe(1);
    expect(sortEntries(entries, {key: 'tags', direction: 'desc'})[0].id).toBe(2);
});

test('calculates every summary value', () => {
    const summary = summarizeEntries(entries, moment('2026-06-30T13:00:00Z'));
    expect(summary).toEqual({
        totalMs: 12600000,
        count: 2,
        averagePerDayMs: 6300000,
        averagePerEntryMs: 6300000,
        longestMs: 9000000,
        shortestMs: 3600000,
    });
});

test('groups only by supported calendar periods', () => {
    const groupings: Array<[GroupKey, number]> = [
        ['none', 0],
        ['day', 2],
        ['week', 1],
        ['month', 1],
        ['year', 1],
    ];
    groupings.forEach(([groupBy, expectedGroups]) => {
        expect(groupEntries(entries, groupBy)).toHaveLength(expectedGroups);
    });
    expect(groupEntries(entries, 'day')[0].totalMs).toBe(3600000);
});

test('creates chart data only for supported calendar periods and tags', () => {
    const charts: Array<Exclude<ChartKey, 'none'>> = ['day', 'week', 'month', 'tag'];
    charts.forEach((chart) => expect(chartRows(entries, chart).length).toBeGreaterThan(0));
    expect(chartRows(entries, 'tag')).toEqual([
        {name: 'activity', hours: 3.5},
        {name: 'location', hours: 2.5},
    ]);
});
