/**
 * Admin Reports & Exports Routes (/api/admin/reports/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { ReportService } from '../../services/report.service';
import { MediaService } from '../../services/media.service';
import { ApiResponse } from '@vision-school/shared';
import { getDb, savedReports, reportExports } from '@vision-school/database';
import { eq, desc } from 'drizzle-orm';

const router = Router();
router.use(requireAuth());

// POST /api/admin/reports/preview - Preview report dataset and KPIs
router.post('/preview', requirePermission('report.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, filters, columns, page, limit } = req.body;
    if (!reportType) {
      return res.status(400).json(ApiResponse.error('VALIDATION_ERROR', 'Le type de rapport est requis.'));
    }

    const reportData = await ReportService.generateReportData(req.user!, {
      reportType,
      filters,
      columns,
      page,
      limit,
    });

    res.json(ApiResponse.success(reportData));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/reports/export - Export report (CSV, XLSX, PDF)
router.post('/export', requirePermission('report.export'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, filters, columns, format = 'CSV' } = req.body;
    if (!reportType) {
      return res.status(400).json(ApiResponse.error('VALIDATION_ERROR', 'Le type de rapport est requis.'));
    }

    const reportData = await ReportService.generateReportData(req.user!, {
      reportType,
      filters,
      columns,
    });

    // Track export audit
    const exportRecord = await ReportService.logAndTrackExport(req.user!, reportData, format);

    if (format === 'CSV') {
      const csvString = ReportService.exportToCsv(reportData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="vision-school_${reportType.toLowerCase()}_${Date.now()}.csv"`);
      return res.send(csvString);
    }

    if (format === 'XLSX') {
      const excelData = ReportService.exportToExcel(reportData);
      return res.json(ApiResponse.success({ excelData, exportRecordId: exportRecord.id }));
    }

    // PDF format
    const branding = await MediaService.getPublicBranding(filters?.schoolId);
    const htmlView = ReportService.getPrintViewHtml(reportData, branding);
    res.json(ApiResponse.success({ htmlView, exportRecordId: exportRecord.id }));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reports/print - Return print view HTML
router.get('/print', requirePermission('report.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportType = (req.query.reportType as any) || 'REGISTRATIONS_GLOBAL';
    const schoolId = req.query.schoolId as string | undefined;

    const reportData = await ReportService.generateReportData(req.user!, {
      reportType,
      filters: { schoolId },
    });

    const branding = await MediaService.getPublicBranding(schoolId);
    const html = ReportService.getPrintViewHtml(reportData, branding);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reports/charts - Real aggregated chart data for dashboard
router.get('/charts', requirePermission('report.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    if (req.query.schoolId) filters.schoolId = req.query.schoolId as string;
    if (req.query.academicYearId) filters.academicYearId = req.query.academicYearId as string;
    if (req.query.status) filters.status = req.query.status as string;
    const chartsData = await ReportService.getReportChartsData(req.user!, filters);
    res.json(ApiResponse.success(chartsData));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reports/export - Direct browser download for CSV/PDF (for window.location.href links)
router.get('/export', requirePermission('report.export'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportType = (req.query.type as string) || (req.query.reportType as string) || 'REGISTRATIONS_GLOBAL';
    const format = ((req.query.format as string) || 'CSV').toUpperCase();
    const schoolId = req.query.schoolId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const status = req.query.status as string | undefined;

    const reportData = await ReportService.generateReportData(req.user!, {
      reportType: reportType as any,
      filters: { schoolId, academicYearId, status },
    });

    // Audit the export
    await ReportService.logAndTrackExport(req.user!, reportData, format as any);

    if (format === 'CSV') {
      const csvString = ReportService.exportToCsv(reportData);
      const filename = `vision-school_${reportType.toLowerCase()}_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvString);
    }

    if (format === 'PDF' || format === 'PRINT') {
      const branding = await MediaService.getPublicBranding(schoolId);
      const html = ReportService.getPrintViewHtml(reportData, branding);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // Default: JSON
    res.json(ApiResponse.success(reportData));
  } catch (error) {
    next(error);
  }
});


// GET /api/admin/reports/saved - List saved report configurations
router.get('/saved', requirePermission('report.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const list = await db
      .select()
      .from(savedReports)
      .where(eq(savedReports.userId, req.user!.id))
      .orderBy(desc(savedReports.createdAt));

    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/reports/saved - Save report configuration
router.post('/saved', requirePermission('report.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saved = await ReportService.saveReportConfig(req.user!, req.body);
    res.json(ApiResponse.success(saved));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reports/exports - List export history
router.get('/exports', requirePermission('report.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const list = await db
      .select()
      .from(reportExports)
      .where(eq(reportExports.userId, req.user!.id))
      .orderBy(desc(reportExports.createdAt));

    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

export const AdminReportsRouter = router;
export default router;
