import ExcelJS from 'exceljs';
import moment from 'moment';
import {ReportFilters, ReportTimeSpan} from '../types';
import {durationMs, formatDuration, projectValue, summarizeEntries, tagsToText, userValue} from '../utils/reportUtils';

export const buildReportsWorkbook = (entries: ReportTimeSpan[], filters: ReportFilters) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Traggo';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Reports', {views: [{state: 'frozen', ySplit: 4}]});
    const summary = summarizeEntries(entries);
    sheet.columns = [
        {header: 'Datum', key: 'date', width: 14},
        {header: 'Start', key: 'start', width: 10},
        {header: 'Ende', key: 'end', width: 10},
        {header: 'Dauer', key: 'duration', width: 14},
        {header: 'Tags', key: 'tags', width: 30},
        {header: 'Beschreibung', key: 'description', width: 40},
        {header: 'Projekt', key: 'project', width: 20},
        {header: 'Benutzer', key: 'user', width: 20},
    ];
    sheet.spliceRows(1, 0, ['Traggo Reports'], ['Filter', JSON.stringify(filters)], ['Exported at', moment().format('YYYY-MM-DD HH:mm')], []);
    const headerRowNumber = 5;
    entries.forEach((entry) => sheet.addRow({
        date: moment(entry.start).toDate(),
        start: moment(entry.start).format('HH:mm'),
        end: entry.end ? moment(entry.end).format('HH:mm') : 'läuft',
        duration: formatDuration(durationMs(entry)),
        tags: tagsToText(entry),
        description: entry.note,
        project: projectValue(entry),
        user: userValue(entry),
    }));
    sheet.addRow({date: 'Summary', duration: formatDuration(summary.totalMs), description: `${summary.count} entries`});
    sheet.getRow(headerRowNumber).font = {bold: true};
    sheet.getRow(headerRowNumber).alignment = {vertical: 'middle'};
    sheet.autoFilter = {from: {row: headerRowNumber, column: 1}, to: {row: headerRowNumber, column: 8}};
    sheet.getColumn('date').numFmt = 'yyyy-mm-dd';
    sheet.eachRow((row) => row.eachCell((cell) => {
        cell.alignment = {vertical: 'top', wrapText: true};
    }));
    sheet.columns.forEach((column) => {
        let width = column.width || 10;
        if (column.eachCell) {
            column.eachCell({includeEmpty: false}, (cell) => {
                width = Math.min(Math.max(width, String(cell.value || '').length + 2), 60);
            });
        }
        column.width = width;
    });
    return workbook;
};

export const downloadExcel = async (entries: ReportTimeSpan[], filters: ReportFilters) => {
    const workbook = buildReportsWorkbook(entries, filters);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traggo-reports-${moment().format('YYYY-MM-DD')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
};
