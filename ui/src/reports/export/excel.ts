import ExcelJS from 'exceljs';
import moment from 'moment';
import {ReportTimeSpan} from '../types';
import {ExportSettings} from './excelSettings';
import {getSymbolForTags} from './symbolMapping';
import {createTemplateWorkbook, setDataCell, normalFont, setBorder} from './excelTemplate';

const ROW_INFO_NAME = 2;
const ROW_INFO_MONTH = 3;
const ROW_INFO_HOURS = 4;
const ROW_DATA_START = 7;
const ROW_TARGET = 40;
const ROW_SUM = 39;
const ROW_DIFF = 41;

const COL_DATE = 2;
const COL_START = 3;
const COL_END = 4;
const COL_BREAK = 5;
const COL_SYMBOL = 7;
const COL_NOTE = 8;

interface DayEntry {
    start: moment.Moment;
    end: moment.Moment | null;
    note: string;
    tags: Array<{key: string; value: string}> | null;
}

interface GroupedDay {
    date: moment.Moment;
    entries: DayEntry[];
}

export const groupEntriesByDay = (entries: ReportTimeSpan[]): GroupedDay[] => {
    const grouped = new Map<string, DayEntry[]>();
    for (const entry of entries) {
        const dayKey = moment(entry.start).format('YYYY-MM-DD');
        const existing = grouped.get(dayKey) || [];
        existing.push({
            start: moment(entry.start),
            end: entry.end ? moment(entry.end) : null,
            note: entry.note,
            tags: entry.tags,
        });
        grouped.set(dayKey, existing);
    }
    return Array.from(grouped.entries())
        .map(([key, dayEntries]) => ({
            date: moment.utc(key, 'YYYY-MM-DD'),
            entries: dayEntries,
        }))
        .sort((a, b) => a.date.valueOf() - b.date.valueOf());
};

export const mergeDayEntries = (dayEntries: DayEntry[]): {start: moment.Moment; end: moment.Moment | null} => {
    let earliest = dayEntries[0].start;
    let latest: moment.Moment | null = dayEntries[0].end;
    for (const entry of dayEntries) {
        if (entry.start.isBefore(earliest)) {
            earliest = entry.start;
        }
        if (entry.end && (!latest || entry.end.isAfter(latest))) {
            latest = entry.end;
        }
    }
    return {start: earliest, end: latest};
};

export const combineNotes = (dayEntries: DayEntry[]): string => {
    const notes = dayEntries
        .map((e) => e.note)
        .filter((n) => n.trim().length > 0);
    return notes.join('; ');
};

export const getCombinedTags = (dayEntries: DayEntry[]): Array<{key: string; value: string}> | null => {
    const seen = new Set<string>();
    const result: Array<{key: string; value: string}> = [];
    for (const entry of dayEntries) {
        if (!entry.tags) {
            continue;
        }
        for (const tag of entry.tags) {
            if (!seen.has(tag.key)) {
                seen.add(tag.key);
                result.push(tag);
            }
        }
    }
    return result.length > 0 ? result : null;
};

export const getMonthFromEntries = (entries: ReportTimeSpan[]): moment.Moment | null => {
    if (entries.length === 0) {
        return null;
    }
    return moment(entries[0].start).startOf('month');
};

export const fillTemplate = (
    sheet: ExcelJS.Worksheet,
    groupedDays: GroupedDay[],
    month: moment.Moment,
    settings: ExportSettings,
): void => {
    const monthStr = month.format('MMMM');
    const yearStr = month.format('YYYY');

    sheet.getCell(ROW_INFO_NAME, 2).value = settings.name;
    sheet.getCell(ROW_INFO_NAME, 5).value = settings.department;
    sheet.getCell(ROW_INFO_MONTH, 2).value = monthStr;
    sheet.getCell(ROW_INFO_MONTH, 5).value = yearStr;
    sheet.getCell(ROW_INFO_HOURS, 2).value = settings.monthlyHours;
    sheet.getCell(ROW_TARGET, 4).value = settings.monthlyHours;

    const ROW_LIMIT = 100;

    let row = ROW_DATA_START;
    for (const groupedDay of groupedDays) {
        if (row >= ROW_LIMIT) {
            break;
        }
        const dayOfMonth = groupedDay.date.date();
        const merged = mergeDayEntries(groupedDay.entries);
        const combinedNote = combineNotes(groupedDay.entries);
        const combinedTags = getCombinedTags(groupedDay.entries);
        const symbol = getSymbolForTags(combinedTags, settings.symbolMappings);

        sheet.getRow(row).height = 20;

        sheet.getCell(row, 1).value = dayOfMonth;
        sheet.getCell(row, 1).font = normalFont;
        sheet.getCell(row, 1).alignment = {horizontal: 'center', vertical: 'middle'};
        setBorder(sheet.getCell(row, 1));

        setDataCell(sheet, row, COL_DATE, {numFmt: 'DD.MM.YYYY'}).value = groupedDay.date.toDate();
        setDataCell(sheet, row, COL_START, {numFmt: 'HH:MM'}).value = merged.start.toDate();
        setDataCell(sheet, row, COL_END, {numFmt: 'HH:MM'}).value = merged.end ? merged.end.toDate() : null;
        setDataCell(sheet, row, COL_BREAK, {numFmt: 'HH:MM'}).value = 0;

        const durCell = sheet.getCell(row, 6);
        durCell.value = {formula: `MAX(0,(D${row}-C${row}-E${row})*24)`};
        durCell.font = normalFont;
        durCell.alignment = {horizontal: 'center', vertical: 'middle'};
        durCell.numFmt = '0.00';
        setBorder(durCell);

        setDataCell(sheet, row, COL_SYMBOL);
        sheet.getCell(row, COL_SYMBOL).value = symbol;

        setDataCell(sheet, row, COL_NOTE, {align: 'left'});
        sheet.getCell(row, COL_NOTE).value = combinedNote;

        row++;
    }

    const lastDataRow = row - 1;
    if (lastDataRow >= ROW_DATA_START) {
        sheet.getCell(ROW_SUM, 5).value = {formula: `SUM(F${ROW_DATA_START}:F${lastDataRow})`};
    }
    sheet.getCell(ROW_DIFF, 5).value = {formula: `E${ROW_SUM}-D${ROW_TARGET}`};
};

export const generateFromTemplate = async (
    entries: ReportTimeSpan[],
    settings: ExportSettings,
): Promise<void> => {
    const month = getMonthFromEntries(entries);
    if (!month) {
        return;
    }

    const workbook = createTemplateWorkbook();
    const sheet = workbook.getWorksheet(1);
    if (!sheet) {
        return;
    }

    const groupedDays = groupEntriesByDay(entries);
    fillTemplate(sheet, groupedDays, month, settings);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Arbeitszeitnachweis_${month.format('YYYY_MM')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
};
