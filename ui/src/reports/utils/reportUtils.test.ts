import moment from 'moment';
import {filterEntries, sortEntries, summarizeEntries} from './reportUtils';
import {ReportFilters, ReportTimeSpan} from '../types';

const entries: ReportTimeSpan[] = [
    {id: 1, start: '2026-06-29T08:00:00Z', end: '2026-06-29T09:00:00Z', note: 'Alpha work', tags: [{key: 'project', value: 'A'}, {key: 'work', value: 'yes'}]},
    {id: 2, start: '2026-06-29T10:00:00Z', end: '2026-06-29T12:30:00Z', note: 'Beta study', tags: [{key: 'user', value: 'Lisa'}]},
];
const filters: ReportFilters = {search: '', datePreset: 'all', customStart: '', customEnd: '', tags: [], user: 'Alle', project: 'Alle', runningOnly: false, durationPreset: 'all', customDurationMinutes: 0, groupBy: 'none'};

test('filters reports by search and tags', () => {
    expect(filterEntries(entries, {...filters, search: 'study'})).toHaveLength(1);
    expect(filterEntries(entries, {...filters, tags: ['work']})).toHaveLength(1);
});

test('sorts reports by duration', () => {
    expect(sortEntries(entries, {key: 'duration', direction: 'desc'})[0].id).toBe(2);
});

test('summarizes report durations', () => {
    const summary = summarizeEntries(entries, moment('2026-06-29T13:00:00Z'));
    expect(summary.count).toBe(2);
    expect(summary.totalMs).toBe(12600000);
});

test('groups reports by project', () => {
    const groups = require('./reportUtils').groupEntries(entries, 'project');
    expect(groups[0].id).toBe('A');
    expect(groups[0].count).toBe(1);
});

test('exports semicolon separated csv', () => {
    const csv = require('../export/csv').reportsCsv(entries);
    expect(csv).toContain('"Datum";"Start";"Ende"');
    expect(csv).toContain('"Alpha work"');
});
