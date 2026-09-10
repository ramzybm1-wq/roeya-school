/**
 * Unit Tests: Spreadsheet Formula-Injection Sanitization in CSV and Excel Exports.
 */

import { ReportService } from '../../apps/api/src/services/report.service';

describe('Reports Security: Formula-Injection Sanitization', () => {
  test('escapes dangerous formula prefixes (=, +, -, @, \\t, \\r) with leading single quote', () => {
    expect(ReportService.sanitizeFormulaInjection('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(ReportService.sanitizeFormulaInjection('+cmd|/c calc.exe')).toBe("'+cmd|/c calc.exe");
    expect(ReportService.sanitizeFormulaInjection('-12+34')).toBe("'-12+34");
    expect(ReportService.sanitizeFormulaInjection('@HYPERLINK("http://evil.com")')).toBe("'@HYPERLINK(\"http://evil.com\")");
  });

  test('leaves normal text and numbers untouched', () => {
    expect(ReportService.sanitizeFormulaInjection('Mohamed Benali')).toBe('Mohamed Benali');
    expect(ReportService.sanitizeFormulaInjection('REG-2026-000125')).toBe('REG-2026-000125');
    expect(ReportService.sanitizeFormulaInjection(150000)).toBe('150000');
    expect(ReportService.sanitizeFormulaInjection(null)).toBe('');
  });
});
