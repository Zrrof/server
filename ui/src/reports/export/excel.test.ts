// tslint:disable:no-any
jest.mock('exceljs', () => {
    class Worksheet {
        public rows: any[] = [];
        public columns: any[] = [];
        public autoFilter: any;
        public addRow(row: any) {
            this.rows.push(row);
            return row;
        }
        public spliceRows() { return undefined; }
        public getRow() { return {font: {}, alignment: {}}; }
        public getColumn() { return {numFmt: ''}; }
        public eachRow() { return undefined; }
    }
    class Workbook {
        public creator = '';
        public created = new Date();
        public sheet = new Worksheet();
        public xlsx = {writeBuffer: () => Promise.resolve(new ArrayBuffer(1))};
        public addWorksheet() { return this.sheet; }
    }
    return {__esModule: true, default: {Workbook}, Workbook};
}, {virtual: true});

import {buildReportsWorkbook} from './excel';
import {ReportTimeSpan} from '../types';

const entries: ReportTimeSpan[] = [
    {id: 1, start: '2026-06-29T08:00:00Z', end: '2026-06-29T09:00:00Z', note: 'Alpha', tags: []},
];

test('builds an xlsx workbook with autofilter and rows', () => {
    const workbook: any = buildReportsWorkbook(entries, {search: '', datePreset: 'all', customStart: '', customEnd: '', tags: [], user: 'Alle', project: 'Alle', runningOnly: false, durationPreset: 'all', customDurationMinutes: 0, groupBy: 'none'});
    expect(workbook.sheet.autoFilter).toBeTruthy();
    expect(workbook.sheet.rows.length).toBeGreaterThan(1);
});
