import moment from 'moment';
import {ReportTimeSpan} from '../types';
import {durationMs, formatDuration, projectValue, tagsToText, userValue} from '../utils/reportUtils';

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const reportsCsv = (entries: ReportTimeSpan[]) => {
    const header = ['Datum', 'Start', 'Ende', 'Dauer', 'Tags', 'Beschreibung', 'Projekt', 'Benutzer', 'Erstellt am'];
    const rows = entries.map((entry) => [
        moment(entry.start).format('YYYY-MM-DD'),
        moment(entry.start).format('HH:mm'),
        entry.end ? moment(entry.end).format('HH:mm') : 'läuft',
        formatDuration(durationMs(entry)),
        tagsToText(entry),
        entry.note,
        projectValue(entry),
        userValue(entry),
        '',
    ]);
    return [header, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');
};

export const downloadCsv = (entries: ReportTimeSpan[]) => {
    const blob = new Blob(['\ufeff' + reportsCsv(entries)], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traggo-reports-${moment().format('YYYY-MM-DD')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};
