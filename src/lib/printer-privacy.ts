import type { PublicPrintersResponse } from './printer-types';

// File names can contain names or unpublished project titles. Do not forward them by default.
export function publicPrinterData(data: PublicPrintersResponse, showFileNames = false): PublicPrintersResponse {
  if (showFileNames) return data;
  return {
    ...data,
    printers: data.printers.map((printer) => ({
      ...printer,
      currentWork: printer.currentWork ? { ...printer.currentWork, fileName: null } : null,
      lastWork: printer.lastWork ? { ...printer.lastWork, fileName: null } : null,
    })),
  };
}
