import ExcelJS from 'exceljs';
import moment from 'moment-timezone';
import {ReportTimeSpan} from '../types';
import {ExportSettings} from './excelSettings';
import {getSymbolForTags} from './symbolMapping';

const GERMAN_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const getExcelDateString = (m: moment.Moment): string => m.format('DD.MM.YYYY');

const getExcelTimeValue = (m: moment.Moment): number => m.hour() / 24 + m.minute() / 1440;

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
    const notes = dayEntries.map((e) => e.note).filter((n) => n.trim().length > 0);
    return notes.join('; ');
};

export const getCombinedTags = (dayEntries: DayEntry[]): Array<{key: string; value: string}> | null => {
    const seen = new Set<string>();
    const result: Array<{key: string; value: string}> = [];
    for (const entry of dayEntries) {
        if (!entry.tags) { continue; }
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
    if (entries.length === 0) { return null; }
    return moment(entries[0].start).startOf('month');
};

const border: Partial<ExcelJS.Borders> = {
    top: {style: 'thin'},
    left: {style: 'thin'},
    bottom: {style: 'thin'},
    right: {style: 'thin'},
};

const boldFont: Partial<ExcelJS.Font> = {bold: true, size: 11, name: 'Calibri'};
const normalFont: Partial<ExcelJS.Font> = {size: 11, name: 'Calibri'};

export const buildWorkbook = (entries: ReportTimeSpan[], settings: ExportSettings): ExcelJS.Workbook => {
    const month = getMonthFromEntries(entries);
    if (!month) { throw new Error('No entries to build workbook'); }

    const sortedEntries = [...entries].sort((a, b) =>
        moment(a.start).valueOf() - moment(b.start).valueOf(),
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Trackit';
    const ws = wb.addWorksheet('Arbeitszeitnachweis');
    ws.views = [{state: 'frozen', ySplit: 6}];

    [6, 14, 10, 10, 10, 12, 10, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));

    ws.mergeCells(1, 1, 1, 8);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = 'Arbeitszeitnachweis Juniorstudium';
    titleCell.font = {bold: true, size: 16, name: 'Calibri'};
    titleCell.alignment = {horizontal: 'center', vertical: 'middle'};

    ws.getCell(2, 1).value = 'Name:';
    ws.getCell(2, 1).font = boldFont;
    ws.getCell(2, 2).value = settings.name;
    ws.getCell(2, 2).font = normalFont;
    ws.getCell(2, 2).border = {bottom: {style: 'thin'}};
    ws.getCell(2, 4).value = 'Organisationseinheit:';
    ws.getCell(2, 4).font = boldFont;
    ws.getCell(2, 5).value = settings.department;
    ws.getCell(2, 5).font = normalFont;
    ws.getCell(2, 5).border = {bottom: {style: 'thin'}};

    ws.getCell(3, 1).value = 'Monat:';
    ws.getCell(3, 1).font = boldFont;
    ws.getCell(3, 2).value = GERMAN_MONTHS[month.month()];
    ws.getCell(3, 2).font = normalFont;
    ws.getCell(3, 2).border = {bottom: {style: 'thin'}};
    ws.getCell(3, 4).value = 'Jahr:';
    ws.getCell(3, 4).font = boldFont;
    ws.getCell(3, 5).value = month.format('YYYY');
    ws.getCell(3, 5).font = normalFont;
    ws.getCell(3, 5).border = {bottom: {style: 'thin'}};

    ws.getCell(4, 1).value = 'Sollarbeitszeit:';
    ws.getCell(4, 1).font = boldFont;
    ws.getCell(4, 2).value = settings.monthlyHours;
    ws.getCell(4, 2).font = normalFont;
    ws.getCell(4, 2).border = {bottom: {style: 'thin'}};
    ws.getCell(4, 3).value = 'Stunden pro Monat';
    ws.getCell(4, 3).font = normalFont;

    const headers = ['Tag', 'Datum', 'Beginn', 'Ende', 'Pause', 'Dauer (h)', 'Kürzel', 'Bemerkung'];
    headers.forEach((text, i) => {
        const cell = ws.getCell(6, i + 1);
        cell.value = text;
        cell.font = boldFont;
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'D9E1F2'}};
        cell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};
        cell.border = border;
    });

    let currentRow = 7;
    let entryId = 1;
    for (const entry of sortedEntries) {
        const entryMoment = moment(entry.start);
        const endTimeValue = entry.end ? getExcelTimeValue(moment(entry.end)) : null;

        ws.addRow([
            entryId,
            getExcelDateString(entryMoment),
            getExcelTimeValue(entryMoment),
            endTimeValue,
            0,
            {formula: `MAX(0,(D${currentRow}-C${currentRow}-E${currentRow})*24)`},
            getSymbolForTags(entry.tags, settings.symbolMappings),
            entry.note,
        ]);
        currentRow++;
        entryId++;
    }

    const lastDataRow = currentRow - 1;

    ws.addRow([]);
    currentRow++;

    ws.addRow([
        'Gesamtstunden:',
        '',
        '',
        '',
        lastDataRow >= 7 ? {formula: `SUM(F7:F${lastDataRow})`} : 0,
        'Stunden',
    ]);
    const sumRow = currentRow;
    currentRow++;

    ws.addRow(['Sollarbeitszeit:', '', '', settings.monthlyHours, 'Stunden']);
    const targetRow = currentRow;

    ws.addRow(['Differenz:', '', '', {formula: `E${sumRow}-D${targetRow}`}, 'Stunden']);

    for (let r = 7; r <= lastDataRow; r++) {
        ws.getRow(r).height = 20;
        ws.getCell(r, 1).font = normalFont;
        ws.getCell(r, 1).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 1).border = border;

        ws.getCell(r, 2).font = normalFont;
        ws.getCell(r, 2).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 2).border = border;
        ws.getCell(r, 2).numFmt = 'DD.MM.YYYY';

        ws.getCell(r, 3).font = normalFont;
        ws.getCell(r, 3).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 3).border = border;
        ws.getCell(r, 3).numFmt = 'HH:MM';

        ws.getCell(r, 4).font = normalFont;
        ws.getCell(r, 4).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 4).border = border;
        ws.getCell(r, 4).numFmt = 'HH:MM';

        ws.getCell(r, 5).font = normalFont;
        ws.getCell(r, 5).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 5).border = border;
        ws.getCell(r, 5).numFmt = 'HH:MM';

        ws.getCell(r, 6).font = normalFont;
        ws.getCell(r, 6).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 6).border = border;
        ws.getCell(r, 6).numFmt = '0.00';

        ws.getCell(r, 7).font = normalFont;
        ws.getCell(r, 7).alignment = {horizontal: 'center', vertical: 'middle'};
        ws.getCell(r, 7).border = border;

        ws.getCell(r, 8).font = normalFont;
        ws.getCell(r, 8).alignment = {horizontal: 'left', vertical: 'middle', wrapText: true};
        ws.getCell(r, 8).border = border;
    }

    ws.getCell(sumRow, 1).font = boldFont;
    ws.getCell(sumRow, 5).font = boldFont;
    ws.getCell(sumRow, 5).alignment = {horizontal: 'center', vertical: 'middle'};
    ws.getCell(sumRow, 5).numFmt = '0.00';
    ws.getCell(sumRow, 5).border = border;
    ws.getCell(sumRow, 6).font = normalFont;

    ws.getCell(targetRow, 1).font = boldFont;
    ws.getCell(targetRow, 4).font = normalFont;
    ws.getCell(targetRow, 4).border = {bottom: {style: 'thin'}};
    ws.getCell(targetRow, 4).alignment = {horizontal: 'center', vertical: 'middle'};
    ws.getCell(targetRow, 4).numFmt = '0.00';
    ws.getCell(targetRow, 5).font = normalFont;

    ws.getCell(targetRow + 1, 1).font = boldFont;
    ws.getCell(targetRow + 1, 4).font = {bold: true, size: 11, name: 'Calibri', color: {argb: 'FF0000'}};
    ws.getCell(targetRow + 1, 4).alignment = {horizontal: 'center', vertical: 'middle'};
    ws.getCell(targetRow + 1, 4).numFmt = '0.00';
    ws.getCell(targetRow + 1, 4).border = border;
    ws.getCell(targetRow + 1, 5).font = normalFont;
    ws.getCell(targetRow + 1, 6).font = normalFont;

    let footerRow = targetRow + 2;

    ws.addRow([]);
    footerRow++;

    ws.addRow(['Kürzel-Erklärung:']);
    ws.getCell(footerRow, 1).font = boldFont;
    footerRow++;

    for (const mapping of settings.symbolMappings) {
        ws.addRow([mapping.symbol, mapping.tag]);
        ws.getCell(footerRow, 1).font = normalFont;
        ws.getCell(footerRow, 2).font = normalFont;
        footerRow++;
    }

    ws.addRow([]);
    footerRow++;

    ws.addRow(['Datum:', '', '', 'Unterschrift:']);
    ws.getCell(footerRow, 1).font = boldFont;
    ws.getCell(footerRow, 4).font = boldFont;
    footerRow++;

    ws.mergeCells(footerRow, 1, footerRow, 3);
    ws.getCell(footerRow, 1).value = '________________';
    ws.getCell(footerRow, 1).font = normalFont;
    ws.mergeCells(footerRow, 4, footerRow, 6);
    ws.getCell(footerRow, 4).value = '________________';
    ws.getCell(footerRow, 4).font = normalFont;
    footerRow++;

    if (settings.name) {
        ws.addRow(['', '', '', settings.name]);
        ws.getCell(footerRow, 4).font = normalFont;
        ws.getCell(footerRow, 4).alignment = {horizontal: 'center', vertical: 'middle'};
    }

    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
    ws.pageSetup.paperSize = 9;

    ws.headerFooter.oddHeader = 'Arbeitszeitnachweis Juniorstudium';
    ws.headerFooter.oddFooter = 'Seite &P von &N';

    return wb;
};

export const generateFromTemplate = async (
    entries: ReportTimeSpan[],
    settings: ExportSettings,
): Promise<void> => {
    const month = getMonthFromEntries(entries);
    if (!month) { return; }

    const wb = buildWorkbook(entries, settings);
    const buffer = await wb.xlsx.writeBuffer();
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
