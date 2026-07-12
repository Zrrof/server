import ExcelJS from 'exceljs';
import moment from 'moment-timezone';
import {ReportTimeSpan} from '../types';
import {ExportSettings, DEFAULT_SETTINGS} from './excelSettings';
import {
    groupEntriesByDay,
    mergeDayEntries,
    combineNotes,
    getCombinedTags,
    getMonthFromEntries,
    buildWorkbook,
} from './excel';

const makeEntry = (
    day: number, startH: number, startM: number,
    endH: number, endM: number, note = '',
    tags: ReportTimeSpan['tags'] = null,
): ReportTimeSpan => ({
    id: day * 10000 + startH * 100 + startM,
    start: `2026-07-${String(day).padStart(2, '0')}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00.000Z`,
    end: `2026-07-${String(day).padStart(2, '0')}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000Z`,
    note,
    tags,
});

// Helper to run round-trip with controllable timezone
async function roundTrip(entries: ReportTimeSpan[], timezone = 'Europe/Berlin') {
    const spy = jest.spyOn(moment.tz, 'guess').mockReturnValue(timezone);
    try {
        const wb = buildWorkbook(entries, {...DEFAULT_SETTINGS, name: 'Test User', monthlyHours: 20});
        const buf = await wb.xlsx.writeBuffer();
        const wb2 = new ExcelJS.Workbook();
        await wb2.xlsx.load(buf);
        return wb2.getWorksheet(1)!;
    } finally {
        spy.mockRestore();
    }
}

describe('groupEntriesByDay', () => {
    test('groups entries by date, sorts ascending', () => {
        const entries = [makeEntry(3, 8, 0, 16, 0), makeEntry(1, 9, 0, 17, 0)];
        const result = groupEntriesByDay(entries);
        expect(result).toHaveLength(2);
        expect(result[0].date.date()).toBe(1);
        expect(result[1].date.date()).toBe(3);
    });

    test('merges multiple entries on same day', () => {
        const entries = [makeEntry(1, 8, 0, 12, 0, 'morgens'), makeEntry(1, 13, 0, 17, 0, 'nachmittags')];
        const result = groupEntriesByDay(entries);
        expect(result).toHaveLength(1);
        expect(result[0].entries).toHaveLength(2);
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
        const entries = [makeEntry(15, 8, 0, 16, 0)];
        const month = getMonthFromEntries(entries);
        expect(month!.month()).toBe(6);
        expect(month!.date()).toBe(1);
    });

    test('returns null for empty entries', () => {
        expect(getMonthFromEntries([])).toBeNull();
    });
});

describe('buildWorkbook - round-trip', () => {
    test('writes info cells correctly', async () => {
        const ws = await roundTrip([makeEntry(1, 8, 0, 16, 0)]);
        expect(ws.getCell(2, 2).value).toBe('Test User');
        expect(ws.getCell(3, 2).value).toBe('Juli');
        expect(ws.getCell(3, 5).value).toBe('2026');
        expect(ws.getCell(4, 2).value).toBe(20);
        expect(ws.getCell(10, 4).value).toBe(20);
    });

    test('writes first entry at row 7', async () => {
        const ws = await roundTrip([makeEntry(5, 8, 0, 16, 0, 'Erster')]);
        expect(ws.getCell(7, 8).value).toBe('Erster');
    });

    test('writes entries sequentially sorted by start time', async () => {
        const ws = await roundTrip([
            makeEntry(1, 9, 0, 17, 0, 'Spaet'),
            makeEntry(1, 8, 0, 16, 0, 'Frueh'),
        ]);
        expect(ws.getCell(7, 8).value).toBe('Frueh');
        expect(ws.getCell(8, 8).value).toBe('Spaet');
    });

    test('lists same-day entries in separate rows', async () => {
        const ws = await roundTrip([
            makeEntry(3, 8, 0, 12, 0, 'Vormittag'),
            makeEntry(3, 13, 0, 17, 0, 'Nachmittag'),
        ]);
        expect(ws.getCell(7, 8).value).toBe('Vormittag');
        expect(ws.getCell(8, 8).value).toBe('Nachmittag');
    });

    test('writes correct day number in column A', async () => {
        const ws = await roundTrip([makeEntry(15, 8, 0, 16, 0, 'Mitte')]);
        expect(ws.getCell(7, 1).value).toBe(15);
    });

    test('only creates as many rows as entries', async () => {
        const entries = [makeEntry(3, 8, 0, 16, 0, 'A'), makeEntry(5, 9, 0, 17, 0, 'B'), makeEntry(7, 10, 0, 18, 0, 'C')];
        const ws = await roundTrip(entries);
        expect(ws.getCell(7, 8).value).toBe('A');
        expect(ws.getCell(8, 8).value).toBe('B');
        expect(ws.getCell(9, 8).value).toBe('C');
        expect(ws.getCell(10, 8).value).toBeNull();
    });

    test('writes all columns for an entry', async () => {
        const tags = [{key: 'Homeoffice', value: 'true'}];
        const ws = await roundTrip([makeEntry(5, 8, 0, 16, 0, 'HO Tag', tags)]);
        expect(ws.getCell(7, 2).value).toBeTruthy();
        // Time values come back as Date objects (Excel epoch wrapper)
        const startVal = ws.getCell(7, 3).value as Date;
        expect(startVal.getUTCHours()).toBe(10);
        expect(startVal.getUTCMinutes()).toBe(0);
        const endVal = ws.getCell(7, 4).value as Date;
        expect(endVal.getUTCHours()).toBe(18);
        expect(endVal.getUTCMinutes()).toBe(0);
        expect(ws.getCell(7, 7).value).toBe('HO');
        expect(ws.getCell(7, 8).value).toBe('HO Tag');
    });

    test('preserves formula in column 6', async () => {
        const ws = await roundTrip([makeEntry(1, 8, 0, 16, 0)]);
        const f = ws.getCell(7, 6).value as {formula?: string};
        expect(f).toBeTruthy();
        expect(f.formula).toContain('MAX');
    });

    test('SUM formula covers only written rows', async () => {
        const ws = await roundTrip([
            makeEntry(1, 8, 0, 16, 0, 'A'),
            makeEntry(2, 9, 0, 17, 0, 'B'),
            makeEntry(3, 10, 0, 18, 0, 'C'),
        ]);
        // 3 entries → data rows 7-9, spacer 10, sum at 11
        const sumFormula = ws.getCell(11, 5).value as {formula?: string};
        expect(sumFormula).toBeTruthy();
        expect(sumFormula.formula).toBe('SUM(F7:F9)');
    });

    test('DIFF formula references SUM and TARGET', async () => {
        const ws = await roundTrip([makeEntry(1, 8, 0, 16, 0)]);
        // 1 entry → data row 7, spacer 8, sum 9, target 10, diff 11
        const diffFormula = ws.getCell(11, 4).value as {formula?: string};
        expect(diffFormula).toBeTruthy();
        expect(diffFormula.formula).toContain('E9-D10');
    });
});

describe('timezone handling', () => {
    test('converts UTC to Europe/Berlin (UTC+2 summer) correctly', async () => {
        // 10:25 UTC → 12:25 Berlin summer
        const ws = await roundTrip([makeEntry(11, 10, 25, 10, 40, 'Test')], 'Europe/Berlin');
        const startVal = ws.getCell(7, 3).value as Date;
        expect(startVal.getUTCHours()).toBe(12);
        expect(startVal.getUTCMinutes()).toBe(25);
    });

    test('converts UTC to UTC timezone (no conversion)', async () => {
        // 10:25 UTC → 10:25 UTC
        const ws = await roundTrip([makeEntry(11, 10, 25, 10, 40, 'Test')], 'UTC');
        const startVal = ws.getCell(7, 3).value as Date;
        expect(startVal.getUTCHours()).toBe(10);
        expect(startVal.getUTCMinutes()).toBe(25);
    });
});

describe('user data integration test', () => {
    test('user exact entries produce correct local times in separate rows', async () => {
        // User's entries on 11.07.2026:
        // 1. 12:25-12:40 MESZ (10:25-10:40 UTC), tag "email"
        // 2. 18:25-18:40 MESZ (16:25-16:40 UTC), no tag
        const entries = [
            makeEntry(11, 16, 25, 16, 40, '', null),
            makeEntry(11, 10, 25, 10, 40, '', [{key: 'email', value: 'true'}]),
        ];

        const ws = await roundTrip(entries, 'Europe/Berlin');

        // Row 7: first entry (sorted: 10:25 UTC) = 12:25 local
        const start1 = ws.getCell(7, 3).value as Date;
        expect(start1.getUTCHours()).toBe(12);
        expect(start1.getUTCMinutes()).toBe(25);
        const end1 = ws.getCell(7, 4).value as Date;
        expect(end1.getUTCHours()).toBe(12);
        expect(end1.getUTCMinutes()).toBe(40);

        // Row 8: second entry (16:25 UTC) = 18:25 local
        const start2 = ws.getCell(8, 3).value as Date;
        expect(start2.getUTCHours()).toBe(18);
        expect(start2.getUTCMinutes()).toBe(25);
        const end2 = ws.getCell(8, 4).value as Date;
        expect(end2.getUTCHours()).toBe(18);
        expect(end2.getUTCMinutes()).toBe(40);

        // all have same date
        expect(ws.getCell(7, 2).value).toBe('11.07.2026');
        expect(ws.getCell(8, 2).value).toBe('11.07.2026');

        // "email" tag not in DEFAULT_SYMBOLS → symbol should be empty
        expect(ws.getCell(7, 7).value).toBe('');
        expect(ws.getCell(8, 7).value).toBe('');
    });
});
