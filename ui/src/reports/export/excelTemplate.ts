import ExcelJS from 'exceljs';

export const border: Partial<ExcelJS.Borders> = {
    top: {style: 'thin'},
    left: {style: 'thin'},
    bottom: {style: 'thin'},
    right: {style: 'thin'},
};

export const normalFont: Partial<ExcelJS.Font> = {size: 11, name: 'Calibri'};

export const setBorder = (cell: ExcelJS.Cell): void => {
    cell.border = border;
};

export const setDataCell = (
    sheet: ExcelJS.Worksheet,
    row: number,
    col: number,
    options?: {numFmt?: string; align?: 'center' | 'left'},
): ExcelJS.Cell => {
    const cell = sheet.getCell(row, col);
    cell.font = normalFont;
    const align = options && options.align;
    cell.alignment = {
        horizontal: align === 'left' ? 'left' : 'center',
        vertical: 'middle',
        wrapText: align === 'left',
    };
    setBorder(cell);
    if (options && options.numFmt) {
        cell.numFmt = options.numFmt;
    }
    return cell;
};
