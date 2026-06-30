import moment from 'moment';
import {ReportFilters, ReportTimeSpan} from '../types';
import {durationMs, formatDuration, projectValue, summarizeEntries, tagsToText, userValue} from '../utils/reportUtils';

const escapeHtml = (value: string | number) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const downloadExcel = (entries: ReportTimeSpan[], filters: ReportFilters) => {
    const summary = summarizeEntries(entries);
    const rows = entries.map((entry) => `
        <tr>
            <td>${escapeHtml(moment(entry.start).format('YYYY-MM-DD'))}</td>
            <td>${escapeHtml(moment(entry.start).format('HH:mm'))}</td>
            <td>${escapeHtml(entry.end ? moment(entry.end).format('HH:mm') : 'läuft')}</td>
            <td>${escapeHtml(formatDuration(durationMs(entry)))}</td>
            <td>${escapeHtml(tagsToText(entry))}</td>
            <td>${escapeHtml(entry.note)}</td>
            <td>${escapeHtml(projectValue(entry))}</td>
            <td>${escapeHtml(userValue(entry))}</td>
        </tr>`).join('');
    const html = `
        <html><head><meta charset="utf-8" /></head><body>
        <h1>Traggo Reports</h1>
        <p>Filter: ${escapeHtml(JSON.stringify(filters))}</p>
        <table border="1">
            <thead><tr><th>Datum</th><th>Start</th><th>Ende</th><th>Dauer</th><th>Tags</th><th>Beschreibung</th><th>Projekt</th><th>Benutzer</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td colspan="8">Gesamtstunden: ${escapeHtml(formatDuration(summary.totalMs))}; Einträge: ${summary.count}</td></tr></tfoot>
        </table>
        </body></html>`;
    const blob = new Blob([html], {type: 'application/vnd.ms-excel;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traggo-reports-${moment().format('YYYY-MM-DD')}.xls`;
    link.click();
    URL.revokeObjectURL(url);
};
