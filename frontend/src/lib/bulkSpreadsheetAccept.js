/**
 * Allowed bulk spreadsheet types — keep in sync with `backend/utils/multerSpreadsheet.js`.
 * MIME types improve the system file picker; extensions are the primary filter.
 */
export const BULK_SPREADSHEET_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
