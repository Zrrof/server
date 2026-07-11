import ExcelJS from 'exceljs';

const ROW_TITLE = 1;
const ROW_HEADER = 6;
const ROW_DATA_START = 7;
const ROW_DATA_END = 37;
const ROW_SUM = 39;
const ROW_TARGET = 40;
const ROW_DIFF = 41;

const border: Partial<ExcelJS.Borders> = {
    top: {style: 'thin'},
    left: {style: 'thin'},
    bottom: {style: 'thin'},
    right: {style: 'thin'},
};

const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {argb: 'D9E1F2'},
};

const boldFont: Partial<ExcelJS.Font> = {bold: true, size: 11, name: 'Calibri'};
const normalFont: Partial<ExcelJS.Font> = {size: 11, name: 'Calibri'};
const titleFont: Partial<ExcelJS.Font> = {bold: true, size: 16, name: 'Calibri'};

const setBorder = (cell: ExcelJS.Cell): void => {
    cell.border = border;
};

const setHeaderCell = (sheet: ExcelJS.Worksheet, row: number, col: number, text: string): void => {
    const cell = sheet.getCell(row, col);
    cell.value = text;
    cell.font = boldFont;
    cell.fill = headerFill;
    cell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};
    setBorder(cell);
};

const setDataCell = (
    sheet: ExcelJS.Worksheet,
    row: number,
    col: number,
    options?: {numFmt?: string; align?: 'center' | 'left'},
): ExcelJS.Cell => {
    const cell = sheet.getCell(row, col);
    cell.font = normalFont;
    cell.alignment = {
        horizontal: options?.align === 'left' ? 'left' : 'center',
        vertical: 'middle',
        wrapText: options?.align === 'left',
    };
    setBorder(cell);
    if (options?.numFmt) {
        cell.numFmt = options.numFmt;
    }
    return cell;
};

export const createTemplateWorkbook = (): ExcelJS.Workbook => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Trackit';
    const ws = wb.addWorksheet('Arbeitszeitnachweis');

    ws.views = [{state: 'frozen', ySplit: ROW_HEADER}];

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 10;
    ws.getColumn(6).width = 12;
    ws.getColumn(7).width = 10;
    ws.getColumn(8).width = 40;

    ws.mergeCells(ROW_TITLE, 1, ROW_TITLE, 8);
    const titleCell = ws.getCell(ROW_TITLE, 1);
    titleCell.value = 'Arbeitszeitnachweis Juniorstudium';
    titleCell.font = titleFont;
    titleCell.alignment = {horizontal: 'center', vertical: 'middle'};

    ws.getCell(2, 1).value = 'Name:';
    ws.getCell(2, 1).font = boldFont;
    ws.getCell(2, 2).font = normalFont;
    ws.getCell(2, 2).border = {bottom: {style: 'thin'}};
    ws.getCell(2, 4).value = 'Organisationseinheit:';
    ws.getCell(2, 4).font = boldFont;
    ws.getCell(2, 5).font = normalFont;
    ws.getCell(2, 5).border = {bottom: {style: 'thin'}};

    ws.getCell(3, 1).value = 'Monat:';
    ws.getCell(3, 1).font = boldFont;
    ws.getCell(3, 2).font = normalFont;
    ws.getCell(3, 2).border = {bottom: {style: 'thin'}};
    ws.getCell(3, 4).value = 'Jahr:';
    ws.getCell(3, 4).font = boldFont;
    ws.getCell(3, 5).font = normalFont;
    ws.getCell(3, 5).border = {bottom: {style: 'thin'}};

    ws.getCell(4, 1).value = 'Sollarbeitszeit:';
    ws.getCell(4, 1).font = boldFont;
    ws.getCell(4, 2).value = 17;
    ws.getCell(4, 2).font = normalFont;
    ws.getCell(4, 2).border = {bottom: {style: 'thin'}};
    ws.getCell(4, 3).value = 'Stunden pro Monat';
    ws.getCell(4, 3).font = normalFont;

    const headers = ['Tag', 'Datum', 'Beginn', 'Ende', 'Pause', 'Dauer (h)', 'Kürzel', 'Bemerkung'];
    headers.forEach((text, i) => setHeaderCell(ws, ROW_HEADER, i + 1, text));

    for (let r = ROW_DATA_START; r <= ROW_DATA_END; r++) {
        const dayNum = r - ROW_DATA_START + 1;
        ws.getCell(r, 1).value = dayNum;
        ws.getCell(r, 1).font = normalFont;
        ws.getCell(r, 1).alignment = {horizontal: 'center', vertical: 'middle'};
        setBorder(ws.getCell(r, 1));

        setDataCell(ws, r, 2, {numFmt: 'DD.MM.YYYY'});
        setDataCell(ws, r, 3, {numFmt: 'HH:MM'});
        setDataCell(ws, r, 4, {numFmt: 'HH:MM'});
        setDataCell(ws, r, 5, {numFmt: 'HH:MM'});

        const durCell = ws.getCell(r, 6);
        durCell.value = {formula: `MAX(0,(D${r}-C${r}-E${r})*24)`};
        durCell.font = normalFont;
        durCell.alignment = {horizontal: 'center', vertical: 'middle'};
        durCell.numFmt = '0.00';
        setBorder(durCell);

        setDataCell(ws, r, 7);
        setDataCell(ws, r, 8, {align: 'left'});
    }

    for (let r = ROW_DATA_START; r <= ROW_DATA_END; r++) {
        ws.getRow(r).height = 20;
    }

    ws.getRow(38).height = 8;

    ws.getCell(ROW_SUM, 1).value = 'Gesamtstunden:';
    ws.getCell(ROW_SUM, 1).font = boldFont;
    ws.getCell(ROW_SUM, 5).value = {formula: `SUM(F${ROW_DATA_START}:F${ROW_DATA_END})`};
    ws.getCell(ROW_SUM, 5).font = boldFont;
    ws.getCell(ROW_SUM, 5).alignment = {horizontal: 'center', vertical: 'middle'};
    ws.getCell(ROW_SUM, 5).numFmt = '0.00';
    setBorder(ws.getCell(ROW_SUM, 5));
    ws.getCell(ROW_SUM, 6).value = 'Stunden';
    ws.getCell(ROW_SUM, 6).font = normalFont;

    ws.getCell(ROW_TARGET, 1).value = 'Sollarbeitszeit:';
    ws.getCell(ROW_TARGET, 1).font = boldFont;
    ws.getCell(ROW_TARGET, 4).font = normalFont;
    ws.getCell(ROW_TARGET, 4).border = {bottom: {style: 'thin'}};
    ws.getCell(ROW_TARGET, 4).alignment = {horizontal: 'center', vertical: 'middle'};
    ws.getCell(ROW_TARGET, 4).numFmt = '0.00';
    ws.getCell(ROW_TARGET, 5).value = 'Stunden';
    ws.getCell(ROW_TARGET, 5).font = normalFont;

    ws.getCell(ROW_DIFF, 1).value = 'Differenz:';
    ws.getCell(ROW_DIFF, 1).font = boldFont;
    ws.getCell(ROW_DIFF, 5).value = {formula: `E${ROW_SUM}-E${ROW_TARGET}`};
    ws.getCell(ROW_DIFF, 5).font = {bold: true, size: 11, name: 'Calibri', color: {argb: 'FF0000'}};
    ws.getCell(ROW_DIFF, 5).alignment = {horizontal: 'center', vertical: 'middle'};
    ws.getCell(ROW_DIFF, 5).numFmt = '0.00';
    setBorder(ws.getCell(ROW_DIFF, 5));
    ws.getCell(ROW_DIFF, 6).value = 'Stunden';
    ws.getCell(ROW_DIFF, 6).font = normalFont;

    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
    ws.pageSetup.paperSize = 9;

    ws.headerFooter.oddHeader = 'Arbeitszeitnachweis Juniorstudium';
    ws.headerFooter.oddFooter = 'Seite &P von &N';

    return wb;
};
