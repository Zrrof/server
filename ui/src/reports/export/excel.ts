import ExcelJS from 'exceljs';
import moment from 'moment';
import {ReportTimeSpan} from '../types';
import {ExportSettings} from './excelSettings';
import {getSymbolForTags} from './symbolMapping';
import {createTemplateWorkbook} from './excelTemplate';

const ROW_INFO_NAME = 2;
const ROW_INFO_MONTH = 3;
const ROW_INFO_HOURS = 4;
const ROW_DATA_START = 7;
const ROW_DATA_END = 37;
const ROW_TARGET = 40;

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

const groupEntriesByDay = (entries: ReportTimeSpan[]): GroupedDay[] => {
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
            date: moment(key),
            entries: dayEntries,
        }))
        .sort((a, b) => a.date.valueOf() - b.date.valueOf());
};

const mergeDayEntries = (dayEntries: DayEntry[]): {start: moment.Moment; end: moment.Moment | null} => {
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

const combineNotes = (dayEntries: DayEntry[]): string => {
    const notes = dayEntries
        .map((e) => e.note)
        .filter((n) => n.trim().length > 0);
    return notes.join('; ');
};

const getCombinedTags = (dayEntries: DayEntry[]): Array<{key: string; value: string}> | null => {
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

const getMonthFromEntries = (entries: ReportTimeSpan[]): moment.Moment | null => {
    if (entries.length === 0) {
        return null;
    }
    return moment(entries[0].start).startOf('month');
};

const fillTemplate = (
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

    for (const groupedDay of groupedDays) {
        const dayOfMonth = groupedDay.date.date();
        if (dayOfMonth < 1) {
            continue;
        }
        const row = ROW_DATA_START + dayOfMonth - 1;
        if (row > ROW_DATA_END) {
            continue;
        }
        const merged = mergeDayEntries(groupedDay.entries);
        const combinedNote = combineNotes(groupedDay.entries);
        const combinedTags = getCombinedTags(groupedDay.entries);
        const symbol = getSymbolForTags(combinedTags, settings.symbolMappings);

        sheet.getCell(row, COL_DATE).value = groupedDay.date.toDate();
        sheet.getCell(row, COL_START).value = merged.start.toDate();
        sheet.getCell(row, COL_END).value = merged.end ? merged.end.toDate() : null;
        sheet.getCell(row, COL_BREAK).value = 0;
        sheet.getCell(row, COL_SYMBOL).value = symbol;
        sheet.getCell(row, COL_NOTE).value = combinedNote;
    }
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
