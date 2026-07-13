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
import {getSymbolForTags} from './symbolMapping';

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

const settings = {...DEFAULT_SETTINGS, name: 'Test User', monthlyHours: 20};

async function roundTrip(entries: ReportTimeSpan[]) {
    const wb = buildWorkbook(entries, settings);
    const buf = await wb.xlsx.writeBuffer();
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buf);
    return wb2.getWorksheet(1)!;
}

const timeVal = (h: number, m: number): Date =>
    new Date(Date.UTC(1899, 11, 30, h, m));

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

describe('header and metadata', () => {
    test('writes info cells with German month name', async () => {
        const ws = await roundTrip([makeEntry(1, 8, 0, 16, 0)]);
        expect(ws.getCell(2, 2).value).toBe('Test User');
        expect(ws.getCell(3, 2).value).toBe('Juli');
        expect(ws.getCell(3, 5).value).toBe('2026');
        expect(ws.getCell(4, 2).value).toBe(20);
        expect(ws.getCell(10, 4).value).toBe(20);
    });
});

describe('sequential ID column', () => {
    test('ID starts at 1 for first entry', async () => {
        const ws = await roundTrip([makeEntry(5, 8, 0, 16, 0, 'Erster')]);
        expect(ws.getCell(7, 1).value).toBe(1);
    });

    test('ID increments for each entry', async () => {
        const ws = await roundTrip([
            makeEntry(1, 8, 0, 16, 0, 'A'),
            makeEntry(1, 9, 0, 17, 0, 'B'),
            makeEntry(3, 10, 0, 18, 0, 'C'),
        ]);
        expect(ws.getCell(7, 1).value).toBe(1);
        expect(ws.getCell(8, 1).value).toBe(2);
        expect(ws.getCell(9, 1).value).toBe(3);
    });
});

describe('data rows', () => {
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

    test('writes all columns for an entry', async () => {
        const entry = makeEntry(5, 8, 0, 16, 0, 'HO Tag', [{key: 'Homeoffice', value: 'true'}]);
        const ws = await roundTrip([entry]);
        expect(ws.getCell(7, 1).value).toBe(1);
        expect(ws.getCell(7, 2).value).toBe('05.07.2026');
        const startVal = ws.getCell(7, 3).value as Date;
        expect(startVal.getUTCHours()).toBe(moment(entry.start).hour());
        expect(startVal.getUTCMinutes()).toBe(moment(entry.start).minute());
        const endVal = ws.getCell(7, 4).value as Date;
        expect(endVal.getUTCHours()).toBe(moment(entry.end!).hour());
        expect(endVal.getUTCMinutes()).toBe(moment(entry.end!).minute());
        expect(ws.getCell(7, 7).value).toBe('HO');
        expect(ws.getCell(7, 8).value).toBe('HO Tag');
    });

    test('only creates as many rows as entries', async () => {
        const entries = [makeEntry(3, 8, 0, 16, 0, 'A'), makeEntry(5, 9, 0, 17, 0, 'B'), makeEntry(7, 10, 0, 18, 0, 'C')];
        const ws = await roundTrip(entries);
        expect(ws.getCell(7, 8).value).toBe('A');
        expect(ws.getCell(8, 8).value).toBe('B');
        expect(ws.getCell(9, 8).value).toBe('C');
        expect(ws.getCell(10, 8).value).toBeNull();
    });
});

describe('formulas', () => {
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
        const sumFormula = ws.getCell(11, 5).value as {formula?: string};
        expect(sumFormula).toBeTruthy();
        expect(sumFormula.formula).toBe('SUM(F7:F9)');
    });

    test('DIFF formula references SUM and TARGET', async () => {
        const ws = await roundTrip([makeEntry(1, 8, 0, 16, 0)]);
        const diffFormula = ws.getCell(11, 4).value as {formula?: string};
        expect(diffFormula).toBeTruthy();
        expect(diffFormula.formula).toContain('E9-D10');
    });
});

describe('getSymbolForTags', () => {
    const defaultMappings = DEFAULT_SETTINGS.symbolMappings;

    test('returns empty for null tags', () => {
        expect(getSymbolForTags(null, defaultMappings)).toBe('');
    });

    test('returns empty for empty tags array', () => {
        expect(getSymbolForTags([], defaultMappings)).toBe('');
    });

    test('returns symbol for a priority tag', () => {
        expect(getSymbolForTags([{key: 'Homeoffice', value: 'true'}], defaultMappings)).toBe('HO');
    });

    test('higher priority tag wins over lower priority', () => {
        expect(getSymbolForTags(
            [{key: 'Homeoffice', value: 'true'}, {key: 'Krank', value: 'true'}],
            defaultMappings,
        )).toBe('K');
    });

    test('returns symbol for non-priority mapped tag', () => {
        const customMappings = [{tag: 'ProjektA', symbol: 'PA'}];
        expect(getSymbolForTags([{key: 'ProjektA', value: 'alpha'}], customMappings)).toBe('PA');
    });

    test('returns empty for unmapped tag', () => {
        expect(getSymbolForTags([{key: 'email', value: 'true'}], defaultMappings)).toBe('');
    });

    test('priority tag takes precedence over non-priority in same entry', () => {
        const customMappings = [
            ...defaultMappings,
            {tag: 'email', symbol: 'EM'},
        ];
        expect(getSymbolForTags(
            [{key: 'email', value: 'true'}, {key: 'Homeoffice', value: 'true'}],
            customMappings,
        )).toBe('HO');
    });

    test('matches key:value exact mapping over key-only mapping', () => {
        const mappings = [
            {tag: 'Urlaub:Sommer', symbol: 'S'},
            {tag: 'Urlaub', symbol: 'U'},
        ];
        expect(getSymbolForTags(
            [{key: 'Urlaub', value: 'Sommer'}],
            mappings,
        )).toBe('S');
    });

    test('falls back to key-only mapping when no key:value match', () => {
        const mappings = [
            {tag: 'Urlaub:Sommer', symbol: 'S'},
            {tag: 'Urlaub', symbol: 'U'},
        ];
        expect(getSymbolForTags(
            [{key: 'Urlaub', value: 'Winter'}],
            mappings,
        )).toBe('U');
    });

    test('key:value match for non-priority tag', () => {
        const mappings = [
            {tag: 'Projekt:A', symbol: 'PA'},
        ];
        expect(getSymbolForTags(
            [{key: 'Projekt', value: 'A'}],
            mappings,
        )).toBe('PA');
    });

    test('matches lowercase system tags against capitalized mappings', () => {
        const mappings = [{tag: 'Homeoffice', symbol: 'HO'}];
        expect(getSymbolForTags(
            [{key: 'homeoffice', value: 'true'}],
            mappings,
        )).toBe('HO');
    });

    test('priority loop matches lowercase tags', () => {
        const mappings = [{tag: 'Urlaub:Sommer', symbol: 'S'}];
        expect(getSymbolForTags(
            [{key: 'urlaub', value: 'sommer'}],
            mappings,
        )).toBe('S');
    });

    test('falls back to key-only with lowercase system tags', () => {
        const mappings = [
            {tag: 'Urlaub:Sommer', symbol: 'S'},
            {tag: 'Urlaub', symbol: 'U'},
        ];
        expect(getSymbolForTags(
            [{key: 'urlaub', value: 'winter'}],
            mappings,
        )).toBe('U');
    });

    test('case-insensitive mapping tag entry matches lowercase system tag', () => {
        const mappings = [{tag: 'homeoffice', symbol: 'HO'}];
        expect(getSymbolForTags(
            [{key: 'Homeoffice', value: 'true'}],
            mappings,
        )).toBe('HO');
    });
});

describe('timezone handling', () => {
    test('stores local hour/minute from UTC input', async () => {
        const entry = makeEntry(11, 10, 25, 10, 40, 'Test');
        const ws = await roundTrip([entry]);
        const startVal = ws.getCell(7, 3).value as Date;
        expect(startVal.getUTCHours()).toBe(moment(entry.start).hour());
        expect(startVal.getUTCMinutes()).toBe(moment(entry.start).minute());
    });
});

describe('symbols in exported Excel', () => {
    test('entry with priority tag shows correct symbol in column 7', async () => {
        const ws = await roundTrip([
            makeEntry(1, 8, 0, 16, 0, 'HO', [{key: 'Homeoffice', value: 'true'}]),
        ]);
        expect(ws.getCell(7, 7).value).toBe('HO');
    });

    test('entry without tags shows empty symbol', async () => {
        const ws = await roundTrip([makeEntry(1, 8, 0, 16, 0, 'no tags')]);
        expect(ws.getCell(7, 7).value).toBe('');
    });

    test('entry with unmapped tag shows empty symbol', async () => {
        const ws = await roundTrip([
            makeEntry(1, 8, 0, 16, 0, 'email', [{key: 'email', value: 'true'}]),
        ]);
        expect(ws.getCell(7, 7).value).toBe('');
    });

    test('entries with different tags get their own symbol', async () => {
        const ws = await roundTrip([
            makeEntry(1, 8, 0, 12, 0, 'HO', [{key: 'Homeoffice', value: 'true'}]),
            makeEntry(1, 13, 0, 17, 0, 'UR', [{key: 'Urlaub', value: 'true'}]),
        ]);
        expect(ws.getCell(7, 7).value).toBe('HO');
        expect(ws.getCell(8, 7).value).toBe('U');
    });

    test('priority tag wins when entry has multiple tags', async () => {
        const ws = await roundTrip([
            makeEntry(1, 8, 0, 16, 0, 'multi',
                [{key: 'Homeoffice', value: 'true'}, {key: 'Krank', value: 'true'}]),
        ]);
        expect(ws.getCell(7, 7).value).toBe('K');
    });

    test('key:value tag matching works in full export', async () => {
        const customSettings = {
            ...settings,
            symbolMappings: [{tag: 'Urlaub:Sommer', symbol: 'S'}],
        };
        const wb = buildWorkbook(
            [makeEntry(1, 8, 0, 16, 0, 'Urlaub:Sommer', [{key: 'Urlaub', value: 'Sommer'}])],
            customSettings,
        );
        const buf = await wb.xlsx.writeBuffer();
        const wb2 = new ExcelJS.Workbook();
        await wb2.xlsx.load(buf);
        const ws = wb2.getWorksheet(1)!;
        expect(ws.getCell(7, 7).value).toBe('S');
    });

    test('lowercase tag from system matches mapping in full export', async () => {
        const customSettings = {
            ...settings,
            symbolMappings: [{tag: 'Urlaub:Sommer', symbol: 'S'}],
        };
        const wb = buildWorkbook(
            [makeEntry(1, 8, 0, 16, 0, 'urlaub:sommer', [{key: 'urlaub', value: 'sommer'}])],
            customSettings,
        );
        const buf = await wb.xlsx.writeBuffer();
        const wb2 = new ExcelJS.Workbook();
        await wb2.xlsx.load(buf);
        const ws = wb2.getWorksheet(1)!;
        expect(ws.getCell(7, 7).value).toBe('S');
    });

    test('key:value falls back to key-only in full export', async () => {
        const customSettings = {
            ...settings,
            symbolMappings: [
                {tag: 'Urlaub:Sommer', symbol: 'S'},
                {tag: 'Urlaub', symbol: 'U'},
            ],
        };
        const wb = buildWorkbook(
            [makeEntry(1, 8, 0, 16, 0, 'Urlaub:Winter', [{key: 'Urlaub', value: 'Winter'}])],
            customSettings,
        );
        const buf = await wb.xlsx.writeBuffer();
        const wb2 = new ExcelJS.Workbook();
        await wb2.xlsx.load(buf);
        const ws = wb2.getWorksheet(1)!;
        expect(ws.getCell(7, 7).value).toBe('U');
    });

    test('custom symbols override defaults', async () => {
        const customSettings = {
            ...settings,
            symbolMappings: [{tag: 'Homeoffice', symbol: 'HM'}],
        };
        const wb = buildWorkbook(
            [makeEntry(1, 8, 0, 16, 0, 'HO', [{key: 'Homeoffice', value: 'true'}])],
            customSettings,
        );
        const buf = await wb.xlsx.writeBuffer();
        const wb2 = new ExcelJS.Workbook();
        await wb2.xlsx.load(buf);
        const ws = wb2.getWorksheet(1)!;
        expect(ws.getCell(7, 7).value).toBe('HM');
    });
});

describe('user data integration test', () => {
    test('user exact entries produce correct local times and separate rows', async () => {
        const entries = [
            makeEntry(11, 16, 25, 16, 40, '', null),
            makeEntry(11, 10, 25, 10, 40, '', [{key: 'email', value: 'true'}]),
        ];

        const ws = await roundTrip(entries);

        // Row 7: first entry (sorted: 10:25 UTC first)
        const start1 = ws.getCell(7, 3).value as Date;
        const expectedH1 = moment(entries[1].start).hour();
        const expectedM1 = moment(entries[1].start).minute();
        expect(start1.getUTCHours()).toBe(expectedH1);
        expect(start1.getUTCMinutes()).toBe(expectedM1);

        // Row 8: second entry (16:25 UTC)
        const start2 = ws.getCell(8, 3).value as Date;
        const expectedH2 = moment(entries[0].start).hour();
        const expectedM2 = moment(entries[0].start).minute();
        expect(start2.getUTCHours()).toBe(expectedH2);
        expect(start2.getUTCMinutes()).toBe(expectedM2);

        // Date strings
        expect(ws.getCell(7, 2).value).toBe('11.07.2026');
        expect(ws.getCell(8, 2).value).toBe('11.07.2026');

        // Sequential IDs
        expect(ws.getCell(7, 1).value).toBe(1);
        expect(ws.getCell(8, 1).value).toBe(2);
    });
});
