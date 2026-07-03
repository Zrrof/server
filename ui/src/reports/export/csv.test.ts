import {reportsCsv} from './csv';
import {ReportTimeSpan} from '../types';

const entries: ReportTimeSpan[] = [
    {
        id: 1,
        start: '2026-06-29T08:00:00Z',
        end: '2026-06-29T09:00:00Z',
        note: 'Text with "quotes"; and separator',
        tags: [{key: 'activity', value: 'Planning'}],
    },
];

test('exports only the supported columns and escapes cell values', () => {
    const lines = reportsCsv(entries).split('\n');
    expect(lines[0]).toBe('"Datum";"Start";"Ende";"Dauer";"Tags";"Beschreibung"');
    expect(lines[1]).toContain('"Text with ""quotes""; and separator"');
    expect(lines[1].split(';')).toHaveLength(7);
});
