import { parse } from "csv-parse/sync";

export function parseCsv(text) {
  if (!text) {
    return [];
  }

  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}
