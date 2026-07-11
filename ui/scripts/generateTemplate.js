const ExcelJS = require('exceljs');
const path = require('path');

const ROW_TITLE = 1;
const ROW_INFO_NAME = 2;
const ROW_INFO_MONTH = 3;
const ROW_INFO_HOURS = 4;
const ROW_HEADER = 6;
const ROW_DATA_START = 7;
const ROW_DATA_END = 37;
const ROW_SUM = 39;
const ROW_TARGET = 40;
const ROW_DIFF = 41;

const COL_DAY = 1;
const COL_DATE = 2;
const COL_START = 3;
const COL_END = 4;
const COL_BREAK = 5;
const COL_DURATION = 6;
const COL_SYMBOL = 7;
const COL_NOTE = 8;

const DURATION_FORMULA = (row) => `MAX(0,(D${row}-C${row}-E${row})*24)`;

const buildTemplate = async (outputPath) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Trackit';
    const ws = wb.addWorksheet('Arbeitszeitnachweis');

    ws.views = [{ state: 'frozen', ySplit: ROW_HEADER }];

    const border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };

    const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D9E1F2' },
    };

    const boldFont = { bold: true, size: 11, name: 'Calibri' };
    const normalFont = { size: 11, name: 'Calibri' };
    const titleFont = { bold: true, size: 16, name: 'Calibri' };

    // Column widths
    ws.getColumn(COL_DAY).width = 6;
    ws.getColumn(COL_DATE).width = 14;
    ws.getColumn(COL_START).width = 10;
    ws.getColumn(COL_END).width = 10;
    ws.getColumn(COL_BREAK).width = 10;
    ws.getColumn(COL_DURATION).width = 12;
    ws.getColumn(COL_SYMBOL).width = 10;
    ws.getColumn(COL_NOTE).width = 40;

    // Row 1: Title
    ws.mergeCells(ROW_TITLE, 1, ROW_TITLE, 8);
    const titleCell = ws.getCell(ROW_TITLE, 1);
    titleCell.value = 'Arbeitszeitnachweis Juniorstudium';
    titleCell.font = titleFont;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Name / Department
    ws.getCell(ROW_INFO_NAME, 1).value = 'Name:';
    ws.getCell(ROW_INFO_NAME, 1).font = boldFont;
    ws.getCell(ROW_INFO_NAME, 2).value = '';
    ws.getCell(ROW_INFO_NAME, 2).font = normalFont;
    ws.getCell(ROW_INFO_NAME, 2).border = { bottom: { style: 'thin' } };
    ws.getCell(ROW_INFO_NAME, 4).value = 'Organisationseinheit:';
    ws.getCell(ROW_INFO_NAME, 4).font = boldFont;
    ws.getCell(ROW_INFO_NAME, 5).value = '';
    ws.getCell(ROW_INFO_NAME, 5).font = normalFont;
    ws.getCell(ROW_INFO_NAME, 5).border = { bottom: { style: 'thin' } };

    // Row 3: Month / Year
    ws.getCell(ROW_INFO_MONTH, 1).value = 'Monat:';
    ws.getCell(ROW_INFO_MONTH, 1).font = boldFont;
    ws.getCell(ROW_INFO_MONTH, 2).value = '';
    ws.getCell(ROW_INFO_MONTH, 2).font = normalFont;
    ws.getCell(ROW_INFO_MONTH, 2).border = { bottom: { style: 'thin' } };
    ws.getCell(ROW_INFO_MONTH, 4).value = 'Jahr:';
    ws.getCell(ROW_INFO_MONTH, 4).font = boldFont;
    ws.getCell(ROW_INFO_MONTH, 5).value = '';
    ws.getCell(ROW_INFO_MONTH, 5).font = normalFont;
    ws.getCell(ROW_INFO_MONTH, 5).border = { bottom: { style: 'thin' } };

    // Row 4: Target hours
    ws.getCell(ROW_INFO_HOURS, 1).value = 'Sollarbeitszeit:';
    ws.getCell(ROW_INFO_HOURS, 1).font = boldFont;
    ws.getCell(ROW_INFO_HOURS, 2).value = 17;
    ws.getCell(ROW_INFO_HOURS, 2).font = normalFont;
    ws.getCell(ROW_INFO_HOURS, 2).border = { bottom: { style: 'thin' } };
    ws.getCell(ROW_INFO_HOURS, 3).value = 'Stunden pro Monat';
    ws.getCell(ROW_INFO_HOURS, 3).font = normalFont;

    // Row 6: Table header
    const headers = ['Tag', 'Datum', 'Beginn', 'Ende', 'Pause', 'Dauer (h)', 'Kürzel', 'Bemerkung'];
    headers.forEach((text, i) => {
        const cell = ws.getCell(ROW_HEADER, i + 1);
        cell.value = text;
        cell.font = boldFont;
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = border;
    });

    // Data rows 7-37
    for (let r = ROW_DATA_START; r <= ROW_DATA_END; r++) {
        const dayNum = r - ROW_DATA_START + 1;
        ws.getCell(r, COL_DAY).value = dayNum;
        ws.getCell(r, COL_DAY).font = normalFont;
        ws.getCell(r, COL_DAY).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_DAY).border = border;

        ws.getCell(r, COL_DATE).font = normalFont;
        ws.getCell(r, COL_DATE).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_DATE).border = border;
        ws.getCell(r, COL_DATE).numFmt = 'DD.MM.YYYY';

        ws.getCell(r, COL_START).font = normalFont;
        ws.getCell(r, COL_START).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_START).border = border;
        ws.getCell(r, COL_START).numFmt = 'HH:MM';

        ws.getCell(r, COL_END).font = normalFont;
        ws.getCell(r, COL_END).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_END).border = border;
        ws.getCell(r, COL_END).numFmt = 'HH:MM';

        ws.getCell(r, COL_BREAK).font = normalFont;
        ws.getCell(r, COL_BREAK).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_BREAK).border = border;
        ws.getCell(r, COL_BREAK).numFmt = 'HH:MM';

        // Duration formula
        ws.getCell(r, COL_DURATION).value = { formula: DURATION_FORMULA(r) };
        ws.getCell(r, COL_DURATION).font = normalFont;
        ws.getCell(r, COL_DURATION).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_DURATION).border = border;
        ws.getCell(r, COL_DURATION).numFmt = '0.00';

        ws.getCell(r, COL_SYMBOL).font = normalFont;
        ws.getCell(r, COL_SYMBOL).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, COL_SYMBOL).border = border;

        ws.getCell(r, COL_NOTE).font = normalFont;
        ws.getCell(r, COL_NOTE).alignment = { vertical: 'middle', wrapText: true };
        ws.getCell(r, COL_NOTE).border = border;
    }

    // Row height for data rows
    for (let r = ROW_DATA_START; r <= ROW_DATA_END; r++) {
        ws.getRow(r).height = 20;
    }

    // Row 38: spacer
    ws.getRow(38).height = 8;

    // Row 39: SUM
    ws.getCell(ROW_SUM, 1).value = 'Gesamtstunden:';
    ws.getCell(ROW_SUM, 1).font = boldFont;
    ws.getCell(ROW_SUM, 5).value = { formula: `SUM(F${ROW_DATA_START}:F${ROW_DATA_END})` };
    ws.getCell(ROW_SUM, 5).font = boldFont;
    ws.getCell(ROW_SUM, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(ROW_SUM, 5).border = border;
    ws.getCell(ROW_SUM, 5).numFmt = '0.00';
    ws.getCell(ROW_SUM, 6).value = 'Stunden';
    ws.getCell(ROW_SUM, 6).font = normalFont;

    // Row 40: Target hours
    ws.getCell(ROW_TARGET, 1).value = 'Sollarbeitszeit:';
    ws.getCell(ROW_TARGET, 1).font = boldFont;
    ws.getCell(ROW_TARGET, 4).value = null;
    ws.getCell(ROW_TARGET, 4).font = normalFont;
    ws.getCell(ROW_TARGET, 4).border = { bottom: { style: 'thin' } };
    ws.getCell(ROW_TARGET, 4).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(ROW_TARGET, 4).numFmt = '0.00';
    ws.getCell(ROW_TARGET, 5).value = 'Stunden';
    ws.getCell(ROW_TARGET, 5).font = normalFont;

    // Row 41: Difference
    ws.getCell(ROW_DIFF, 1).value = 'Differenz:';
    ws.getCell(ROW_DIFF, 1).font = boldFont;
    ws.getCell(ROW_DIFF, 5).value = { formula: `E${ROW_SUM}-D${ROW_TARGET}` };
    ws.getCell(ROW_DIFF, 5).font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF0000' } };
    ws.getCell(ROW_DIFF, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(ROW_DIFF, 5).border = border;
    ws.getCell(ROW_DIFF, 5).numFmt = '0.00';
    ws.getCell(ROW_DIFF, 6).value = 'Stunden';
    ws.getCell(ROW_DIFF, 6).font = normalFont;

    // Print settings
    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
    ws.pageSetup.paperSize = 9; // A4

    ws.headerFooter.oddHeader = 'Arbeitszeitnachweis Juniorstudium';
    ws.headerFooter.oddFooter = 'Seite &P von &N';

    await wb.xlsx.writeFile(outputPath);
    console.log('Template created:', outputPath);
};

const outputPath = path.join(__dirname, '..', 'public', 'Arbeitszeitnachweis_Juniorstudium.xlsx');
buildTemplate(outputPath).catch(console.error);
