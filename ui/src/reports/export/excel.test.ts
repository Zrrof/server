import ExcelJS from 'exceljs';
import moment from 'moment';
import {ReportTimeSpan} from '../types';
import {ExportSettings, DEFAULT_SETTINGS} from './excelSettings';
import {createTemplateWorkbook} from './excelTemplate';
import {
    groupEntriesByDay,
    mergeDayEntries,
    combineNotes,
    getCombinedTags,
    getMonthFromEntries,
    fillTemplate,
} from './excel';

const makeEntry = (day: number, startH: number, endH: number, note = '', tags: any = null): ReportTimeSpan => ({
    id: day * 100 + startH,
    start: `2026-07-${String(day).padStart(2, '0')}T${String(startH).padStart(2, '0')}:00:00.000Z`,
    end: endH > 0 ? `2026-07-${String(day).padStart(2, '0')}T${String(endH).padStart(2, '0')}:00:00.000Z` : null,
    note,
    tags,
});

describe('groupEntriesByDay', () => {
    test('groups entries by date, sorts ascending', () => {
        const entries = [makeEntry(3, 8, 16), makeEntry(1, 9, 17)];
        const result = groupEntriesByDay(entries);
        expect(result).toHaveLength(2);
        expect(result[0].date.date()).toBe(1);
        expect(result[1].date.date()).toBe(3);
    });

    test('merges multiple entries on same day', () => {
        const entries = [makeEntry(1, 8, 12, 'morgens'), makeEntry(1, 13, 17, 'nachmittags')];
        const result = groupEntriesByDay(entries);
        expect(result).toHaveLength(1);
        expect(result[0].entries).toHaveLength(2);
    });

    test('includes entries without end (running)', () => {
        const entry = makeEntry(5, 10, 0, 'running');
        entry.end = null;
        const result = groupEntriesByDay([entry]);
        expect(result).toHaveLength(1);
        expect(result[0].entries[0].end).toBeNull();
    });

    test('handles empty array', () => {
        expect(groupEntriesByDay([])).toEqual([]);
    });
});

describe('mergeDayEntries', () => {
    function de(startH: number, startM: number, endH?: number, endM?: number) {
        return {
            start: moment.utc(`2026-07-01T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00Z`),
            end: endH ? moment.utc(`2026-07-01T${String(endH).padStart(2, '0')}:${String(endM || 0).padStart(2, '0')}:00Z`) : null,
            note: '',
            tags: null,
        };
    }

    test('earliest start, latest end', () => {
        const e1 = de(8, 0, 12, 0);
        const e2 = de(9, 0, 17, 0);
        const merged = mergeDayEntries([e1, e2]);
        expect(merged.start.utc().hour()).toBe(8);
        expect(merged.end!.utc().hour()).toBe(17);
    });

    test('handles entries with null end', () => {
        const e1 = de(8, 0);
        const e2 = de(9, 0, 12, 0);
        const merged = mergeDayEntries([e1, e2]);
        expect(merged.start.utc().hour()).toBe(8);
        expect(merged.end!.utc().hour()).toBe(12);
    });

    test('single entry returns same values', () => {
        const e = de(8, 30, 16, 45);
        const merged = mergeDayEntries([e]);
        expect(merged.start.utc().hour()).toBe(8);
        expect(merged.start.utc().minute()).toBe(30);
        expect(merged.end!.utc().hour()).toBe(16);
        expect(merged.end!.utc().minute()).toBe(45);
    });
});

describe('combineNotes', () => {
    test('joins non-empty notes', () => {
        const entries = [
            {start: moment(), end: moment(), note: 'Note 1', tags: null},
            {start: moment(), end: moment(), note: 'Note 2', tags: null},
        ];
        expect(combineNotes(entries)).toBe('Note 1; Note 2');
    });

    test('filters out empty notes', () => {
        const entries = [
            {start: moment(), end: moment(), note: 'Note 1', tags: null},
            {start: moment(), end: moment(), note: '', tags: null},
            {start: moment(), end: moment(), note: '  ', tags: null},
        ];
        expect(combineNotes(entries)).toBe('Note 1');
    });

    test('returns empty string for all empty', () => {
        const entries = [
            {start: moment(), end: moment(), note: '', tags: null},
            {start: moment(), end: moment(), note: '', tags: null},
        ];
        expect(combineNotes(entries)).toBe('');
    });
});

describe('getCombinedTags', () => {
    test('deduplicates tags by key', () => {
        const entries = [
            {start: moment(), end: moment(), note: '', tags: [{key: 'activity', value: 'dev'}, {key: 'project', value: 'A'}]},
            {start: moment(), end: moment(), note: '', tags: [{key: 'activity', value: 'test'}, {key: 'project', value: 'B'}]},
        ];
        const tags = getCombinedTags(entries);
        expect(tags).toHaveLength(2);
        expect(tags).toContainEqual({key: 'activity', value: 'dev'});
        expect(tags).toContainEqual({key: 'project', value: 'A'});
    });

    test('returns null for no tags', () => {
        const entries = [
            {start: moment(), end: moment(), note: '', tags: null},
            {start: moment(), end: moment(), note: '', tags: []},
        ];
        expect(getCombinedTags(entries)).toBeNull();
    });
});

describe('getMonthFromEntries', () => {
    test('returns start of month from first entry', () => {
        const entries = [makeEntry(15, 8, 16)];
        const month = getMonthFromEntries(entries);
        expect(month!.month()).toBe(6);
        expect(month!.date()).toBe(1);
    });

    test('returns null for empty entries', () => {
        expect(getMonthFromEntries([])).toBeNull();
    });
});

describe('fillTemplate + round-trip (dynamic rows)', () => {
    const settings: ExportSettings = {...DEFAULT_SETTINGS, name: 'Test User', monthlyHours: 20};

    async function roundTrip(groupedDays: any, month: moment.Moment) {
        const wb = createTemplateWorkbook();
        const sheet = wb.getWorksheet(1)!;
        fillTemplate(sheet, groupedDays, month, settings);
        const buf = await wb.xlsx.writeBuffer();
        const wb2 = new ExcelJS.Workbook();
        await wb2.xlsx.load(buf);
        return wb2.getWorksheet(1)!;
    }

    test('writes info cells correctly', async () => {
        const ws = await roundTrip(groupEntriesByDay([makeEntry(1, 8, 16)]), moment('2026-07-01'));
        expect(ws.getCell(2, 2).value).toBe('Test User');
        expect(ws.getCell(3, 2).value).toBeTruthy();
        expect(ws.getCell(3, 5).value).toBe('2026');
        expect(ws.getCell(4, 2).value).toBe(20);
        expect(ws.getCell(40, 4).value).toBe(20);
    });

    test('writes first entry at row 7', async () => {
        const ws = await roundTrip(groupEntriesByDay([makeEntry(5, 8, 16, 'Erster')]), moment('2026-07-01'));
        expect(ws.getCell(7, 8).value).toBe('Erster');
    });

    test('writes two entries sequentially at rows 7 and 8', async () => {
        const ws = await roundTrip(
            groupEntriesByDay([makeEntry(1, 8, 16, 'Entry1'), makeEntry(11, 9, 17, 'Entry2')]),
            moment('2026-07-01'),
        );
        expect(ws.getCell(7, 8).value).toBe('Entry1');
        expect(ws.getCell(8, 8).value).toBe('Entry2');
    });

    test('writes correct day number in column A', async () => {
        const ws = await roundTrip(groupEntriesByDay([makeEntry(15, 8, 16, 'Mitte')]), moment('2026-07-01'));
        expect(ws.getCell(7, 1).value).toBe(15);
    });

    test('only creates as many rows as grouped days', async () => {
        const entries = [makeEntry(3, 8, 16, 'A'), makeEntry(5, 9, 17, 'B'), makeEntry(7, 10, 18, 'C')];
        const ws = await roundTrip(groupEntriesByDay(entries), moment('2026-07-01'));
        expect(ws.getCell(7, 8).value).toBe('A');
        expect(ws.getCell(8, 8).value).toBe('B');
        expect(ws.getCell(9, 8).value).toBe('C');
        expect(ws.getCell(10, 8).value).toBeNull();
    });

    test('writes all columns for an entry', async () => {
        const tags = [{key: 'Homeoffice', value: 'true'}];
        const ws = await roundTrip(groupEntriesByDay([makeEntry(5, 8, 16, 'HO Tag', tags)]), moment('2026-07-01'));
        expect(ws.getCell(7, 2).value).toBeTruthy();
        expect(ws.getCell(7, 3).value).toBeTruthy();
        expect(ws.getCell(7, 4).value).toBeTruthy();
        expect(ws.getCell(7, 7).value).toBe('HO');
        expect(ws.getCell(7, 8).value).toBe('HO Tag');
    });

    test('merges same-day entries into one sequential row', async () => {
        const ws = await roundTrip(
            groupEntriesByDay([makeEntry(3, 8, 12, 'Vormittag'), makeEntry(3, 13, 17, 'Nachmittag')]),
            moment('2026-07-01'),
        );
        expect(ws.getCell(7, 8).value).toBe('Vormittag; Nachmittag');
    });

    test('preserves formula in column 6', async () => {
        const ws = await roundTrip(groupEntriesByDay([makeEntry(1, 8, 16)]), moment('2026-07-01'));
        const f: any = ws.getCell(7, 6).value;
        expect(f).toBeTruthy();
        expect(f.formula).toContain('MAX');
    });

    test('SUM formula covers only written rows', async () => {
        const ws = await roundTrip(
            groupEntriesByDay([makeEntry(1, 8, 16, 'A'), makeEntry(2, 9, 17, 'B'), makeEntry(3, 10, 18, 'C')]),
            moment('2026-07-01'),
        );
        const sumFormula: any = ws.getCell(39, 5).value;
        expect(sumFormula).toBeTruthy();
        expect(sumFormula.formula).toBe('SUM(F7:F9)');
    });

    test('DIFF formula references SUM and TARGET', async () => {
        const ws = await roundTrip(groupEntriesByDay([makeEntry(1, 8, 16)]), moment('2026-07-01'));
        const diffFormula: any = ws.getCell(41, 5).value;
        expect(diffFormula).toBeTruthy();
        expect(diffFormula.formula).toContain('E39-D40');
    });
});