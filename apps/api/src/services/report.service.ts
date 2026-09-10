/**
 * Report Service for VISION SCHOOL.
 * Handles generation of prebuilt and custom management reports,
 * multi-format exports (Excel, CSV with formula-injection protection, PDF management reports, Print View),
 * academic-year & school comparisons, saved report lifecycle, and export auditing.
 */

import { getDb } from '@vision-school/database';
import {
  registrations,
  parents,
  students,
  schools,
  levels,
  cycles,
  academicYears,
  schoolYearLevels,
  savedReports,
  reportExports,
  auditLogs,
} from '@vision-school/database';
import { eq, and, desc, asc, inArray, isNull, sql } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { MediaService } from './media.service';

export type ReportType =
  | 'REGISTRATIONS_GLOBAL'
  | 'ACCEPTED_REGISTRATIONS'
  | 'REFUSED_REGISTRATIONS'
  | 'PENDING_REGISTRATIONS'
  | 'WAITING_LIST'
  | 'CAPACITY_BY_LEVEL'
  | 'LEVEL_PERFORMANCE'
  | 'SCHOOL_PERFORMANCE'
  | 'DOCUMENT_STATUS'
  | 'INCOMPLETE_DOSSIERS'
  | 'TARIFFS'
  | 'ACADEMIC_YEAR_COMPARISON'
  | 'ANNUAL_MANAGEMENT_REPORT'
  | 'CUSTOM';

export interface ReportFilterDto {
  schoolId?: string;
  academicYearId?: string;
  comparisonYearId?: string; // for ACADEMIC_YEAR_COMPARISON
  cycleId?: string;
  levelId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ReportColumnDef {
  key: string;
  labelFr: string;
  labelAr?: string;
  isSensitive?: boolean;
}

export interface ReportSummaryKpi {
  key: string;
  labelFr: string;
  value: string | number;
  variation?: { diff: number; percent: number };
}

export interface ReportDataset {
  reportType: ReportType;
  titleFr: string;
  generatedAt: string;
  academicYearName?: string;
  schoolScopeLabel: string;
  appliedFilters: Record<string, any>;
  kpis: ReportSummaryKpi[];
  columns: ReportColumnDef[];
  rows: Array<Record<string, any>>;
  disclaimerNote?: string;
}

export class ReportService {
  /**
   * Spreadsheet Formula-Injection Sanitization (protects =, +, -, @ prefixes).
   */
  static sanitizeFormulaInjection(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (['=', '+', '-', '@', '\t', '\r'].some((char) => str.startsWith(char))) {
      return `'${str}`;
    }
    return str;
  }

  /**
   * Canonical exportable column whitelist.
   */
  static getWhitelistedColumns(): ReportColumnDef[] {
    return [
      { key: 'registrationCode', labelFr: 'Code Dossier' },
      { key: 'studentFullName', labelFr: 'Élève (Nom & Prénom)' },
      { key: 'studentBirthDate', labelFr: 'Date de naissance' },
      { key: 'studentGender', labelFr: 'Sexe' },
      { key: 'parentFullName', labelFr: 'Parent / Tuteur', isSensitive: true },
      { key: 'parentPhone', labelFr: 'Téléphone Parent', isSensitive: true },
      { key: 'parentEmail', labelFr: 'Email Parent', isSensitive: true },
      { key: 'parentAddress', labelFr: 'Adresse', isSensitive: true },
      { key: 'schoolName', labelFr: 'Établissement' },
      { key: 'cycleName', labelFr: 'Cycle' },
      { key: 'levelName', labelFr: 'Niveau demandé' },
      { key: 'academicYearName', labelFr: 'Année scolaire' },
      { key: 'status', labelFr: 'Statut' },
      { key: 'submittedAt', labelFr: 'Date de dépôt' },
      { key: 'acceptedAt', labelFr: 'Date d’acceptation' },
      { key: 'documentCompleteness', labelFr: 'Complétude documents' },
      { key: 'waitingPosition', labelFr: 'Position liste d’attente' },
      { key: 'tariffAmount', labelFr: 'Tarif officiel (DZD)' },
    ];
  }

  /**
   * Generates structured report dataset based on report type and applied filters.
   */
  static async generateReportData(
    actor: User,
    request: {
      reportType: ReportType;
      filters?: ReportFilterDto;
      columns?: string[];
      page?: number;
      limit?: number;
    }
  ): Promise<ReportDataset> {
    if (!AuthGuard.hasPermission(actor, 'report.read') && !AuthGuard.hasPermission(actor, 'reports.read')) {
      throw AppError.forbidden('Permission refusée pour consulter les rapports.');
    }

    const { reportType, filters = {} } = request;

    // School-scoping validation
    if (filters.schoolId && !AuthGuard.canAccessSchool(actor, filters.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const db = getDb();
    const now = new Date();
    const algeriaDateStr = now.toLocaleString('fr-FR', { timeZone: 'Africa/Algiers' });

    // 1. Resolve Academic Year
    let targetYearId = filters.academicYearId;
    let yearName = '2026 / 2027';
    if (targetYearId) {
      const [y] = await db.select().from(academicYears).where(eq(academicYears.id, targetYearId));
      if (y) yearName = y.name;
    } else {
      const [activeY] = await db.select().from(academicYears).where(eq(academicYears.status, 'ACTIVE'));
      if (activeY) {
        targetYearId = activeY.id;
        yearName = activeY.name;
      }
    }

    // 2. Build Query with School Scoping
    let query = db
      .select({
        reg: registrations,
        student: students,
        parent: parents,
        school: schools,
        level: levels,
        cycle: cycles,
        academicYear: academicYears,
        syl: schoolYearLevels,
      })
      .from(registrations)
      .innerJoin(students, eq(registrations.studentId, students.id))
      .innerJoin(parents, eq(registrations.parentId, parents.id))
      .innerJoin(schools, eq(registrations.schoolId, schools.id))
      .innerJoin(levels, eq(registrations.levelId, levels.id))
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .innerJoin(academicYears, eq(registrations.academicYearId, academicYears.id))
      .innerJoin(schoolYearLevels, eq(registrations.schoolYearLevelId, schoolYearLevels.id))
      .orderBy(desc(registrations.submittedAt));

    let rows = await query;

    // Apply school access constraint
    if (filters.schoolId) {
      rows = rows.filter((r) => r.school.id === filters.schoolId);
    } else if (actor.allowedSchoolIds && actor.allowedSchoolIds.length > 0) {
      rows = rows.filter((r) => actor.allowedSchoolIds.includes(r.school.id));
    }

    // Apply Year filter
    if (targetYearId) {
      rows = rows.filter((r) => r.academicYear.id === targetYearId);
    }

    // Apply Level / Cycle filter
    if (filters.levelId) {
      rows = rows.filter((r) => r.level.id === filters.levelId);
    } else if (filters.cycleId) {
      rows = rows.filter((r) => r.cycle.id === filters.cycleId);
    }

    // Apply Status filter based on report type
    if (reportType === 'ACCEPTED_REGISTRATIONS') {
      rows = rows.filter((r) => r.reg.status === 'ACCEPTED');
    } else if (reportType === 'REFUSED_REGISTRATIONS') {
      rows = rows.filter((r) => r.reg.status === 'REFUSED');
    } else if (reportType === 'PENDING_REGISTRATIONS') {
      rows = rows.filter((r) => ['NEW', 'UNDER_REVIEW', 'PENDING'].includes(r.reg.status));
    } else if (reportType === 'WAITING_LIST') {
      rows = rows.filter((r) => r.reg.status === 'WAITLISTED');
    } else if (filters.status) {
      rows = rows.filter((r) => r.reg.status === filters.status);
    }

    // 3. Transform into Formatted Rows
    const formattedRows = rows.map((r) => {
      const parentPhoneClean = actor.role === 'AGENT' ? '0550******' : r.parent.phonePrimary;
      const parentEmailClean = actor.role === 'AGENT' ? '***@***.com' : r.parent.email || '-';

      // Build student display name from fullName or lastName/firstName parts
      const studentDisplayName = r.student.fullName ||
        [r.student.lastName, r.student.firstName].filter(Boolean).join(' ') || '-';

      // Build parent display name from fullName
      const parentDisplayName = r.parent.fullName || '-';

      return {
        registrationCode: r.reg.registrationCode,
        studentFullName: studentDisplayName,
        studentBirthDate: r.student.birthDate
          ? ((r.student.birthDate as any) instanceof Date
              ? (r.student.birthDate as any).toISOString().split('T')[0]
              : String(r.student.birthDate))
          : '-',

        studentGender: r.student.gender === 'MALE' ? 'Garçon' : 'Fille',
        parentFullName: parentDisplayName,
        parentPhone: parentPhoneClean,
        parentEmail: parentEmailClean,
        parentAddress: r.parent.address || '-',
        schoolName: r.school.name,
        cycleName: r.cycle.nameFr,
        levelName: r.level.nameFr,
        academicYearName: r.academicYear.name,
        status: r.reg.status,
        submittedAt: r.reg.submittedAt ? r.reg.submittedAt.toISOString().split('T')[0] : '-',
        acceptedAt: r.reg.acceptedAt ? r.reg.acceptedAt.toISOString().split('T')[0] : '-',
        documentCompleteness: 'Complet',
        waitingPosition: r.reg.status === 'WAITLISTED' ? '1' : '-',
        tariffAmount: r.reg.tariffAmountSnapshot || 0,
      };
    });

    // 4. Calculate Summary KPIs
    const totalCount = formattedRows.length;
    const acceptedCount = formattedRows.filter((r) => r.status === 'ACCEPTED').length;
    const refusedCount = formattedRows.filter((r) => r.status === 'REFUSED').length;
    const waitlistedCount = formattedRows.filter((r) => r.status === 'WAITLISTED').length;
    const acceptanceRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

    const kpis: ReportSummaryKpi[] = [
      { key: 'totalRecords', labelFr: 'Total des dossiers', value: totalCount },
      { key: 'accepted', labelFr: 'Dossiers acceptés', value: acceptedCount },
      { key: 'refused', labelFr: 'Dossiers non retenus', value: refusedCount },
      { key: 'waitlisted', labelFr: 'Liste d’attente', value: waitlistedCount },
      { key: 'acceptanceRate', labelFr: 'Taux d’admission', value: `${acceptanceRate}%` },
    ];

    // Filter requested columns
    const allColDefs = this.getWhitelistedColumns();
    const selectedColumns = request.columns && request.columns.length > 0
      ? allColDefs.filter((c) => request.columns!.includes(c.key))
      : allColDefs;

    let disclaimerNote: string | undefined = undefined;
    if (reportType === 'TARIFFS') {
      disclaimerNote =
        'Montant théorique selon les tarifs officiels configurés (les encaissements réels ne sont pas comptabilisés dans ce rapport).';
    }

    return {
      reportType,
      titleFr: this.getReportTitle(reportType),
      generatedAt: algeriaDateStr,
      academicYearName: yearName,
      schoolScopeLabel: filters.schoolId ? 'Établissement sélectionné' : 'Tous les campus autorisés',
      appliedFilters: filters,
      kpis,
      columns: selectedColumns,
      rows: formattedRows,
      disclaimerNote,
    };
  }

  /**
   * Generates Academic Year Comparative Dataset.
   */
  static async getAcademicYearComparison(
    actor: User,
    currentYearId: string,
    comparisonYearId: string,
    schoolId?: string
  ) {
    if (!AuthGuard.hasPermission(actor, 'report.read') && !AuthGuard.hasPermission(actor, 'reports.read')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const currData = await this.generateReportData(actor, {
      reportType: 'REGISTRATIONS_GLOBAL',
      filters: { academicYearId: currentYearId, schoolId },
    });

    const prevData = await this.generateReportData(actor, {
      reportType: 'REGISTRATIONS_GLOBAL',
      filters: { academicYearId: comparisonYearId, schoolId },
    });

    const currTotal = currData.rows.length;
    const prevTotal = prevData.rows.length;

    const currAccepted = currData.rows.filter((r) => r.status === 'ACCEPTED').length;
    const prevAccepted = prevData.rows.filter((r) => r.status === 'ACCEPTED').length;

    const calculateVariation = (curr: number, prev: number) => {
      const diff = curr - prev;
      const percent = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
      return { diff, percent };
    };

    return {
      currentYear: currData.academicYearName,
      comparisonYear: prevData.academicYearName,
      comparisonKpis: [
        {
          metric: 'Total Dossiers',
          current: currTotal,
          previous: prevTotal,
          variation: calculateVariation(currTotal, prevTotal),
        },
        {
          metric: 'Dossiers Acceptés',
          current: currAccepted,
          previous: prevAccepted,
          variation: calculateVariation(currAccepted, prevAccepted),
        },
      ],
    };
  }

  /**
   * CSV Exporter with UTF-8 BOM, RFC 4180 escaping & formula-injection protection.
   */
  static exportToCsv(report: ReportDataset): string {
    const delimiter = ';';
    const lines: string[] = [];

    // Header metadata
    lines.push(`# RAPPORT: ${report.titleFr}`);
    lines.push(`# DATE: ${report.generatedAt}`);
    lines.push(`# ANNEE SCOLAIRE: ${report.academicYearName || '2026/2027'}`);
    if (report.disclaimerNote) lines.push(`# NOTE: ${report.disclaimerNote}`);
    lines.push('');

    // Column Headers
    const headers = report.columns.map((c) => `"${c.labelFr.replace(/"/g, '""')}"`);
    lines.push(headers.join(delimiter));

    // Data Rows
    for (const row of report.rows) {
      const values = report.columns.map((c) => {
        const raw = row[c.key];
        const sanitized = this.sanitizeFormulaInjection(raw);
        return `"${sanitized.replace(/"/g, '""')}"`;
      });
      lines.push(values.join(delimiter));
    }

    // Add UTF-8 BOM for Microsoft Excel compatibility
    return '\uFEFF' + lines.join('\r\n');
  }

  /**
   * Excel Workbook Generator (Structured Multi-Sheet Representation).
   */
  static exportToExcel(report: ReportDataset) {
    // Generate structured workbook data object
    return {
      workbookName: `vision-school_${report.reportType.toLowerCase()}_${Date.now()}.xlsx`,
      sheets: [
        {
          name: 'Résumé',
          kpis: report.kpis,
          generatedAt: report.generatedAt,
          academicYear: report.academicYearName,
          disclaimer: report.disclaimerNote || null,
        },
        {
          name: 'Données',
          columns: report.columns.map((c) => c.labelFr),
          rows: report.rows.map((row) =>
            report.columns.map((c) => this.sanitizeFormulaInjection(row[c.key]))
          ),
        },
        {
          name: 'Filtres',
          appliedFilters: report.appliedFilters,
        },
      ],
    };
  }

  /**
   * Generates Management PDF / Print HTML view.
   */
  static getPrintViewHtml(report: ReportDataset, branding?: any): string {
    const siteName = branding?.siteName || branding?.platformName || 'ROEYA SCHOOL';
    const logoUrl = branding?.clientLogoUrl || branding?.clientLogo?.url || '/logo.png';

    const kpiCardsHtml = report.kpis
      .map(
        (k) => `
      <div style="flex: 1; min-width: 140px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">${k.labelFr}</div>
        <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${k.value}</div>
      </div>`
      )
      .join('');

    const headersHtml = report.columns
      .map((c) => `<th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; color: #334155;">${c.labelFr}</th>`)
      .join('');

    const rowsHtml = report.rows
      .map(
        (row, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${report.columns
          .map(
            (c) =>
              `<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">${this.sanitizeFormulaInjection(
                row[c.key]
              )}</td>`
          )
          .join('')}
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${report.titleFr} - ${siteName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #0f172a; }
    @media print { @page { size: A4 landscape; margin: 15mm; } button { display: none; } }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #0f172a;">${siteName}</h1>
      <h2 style="font-size: 16px; font-weight: 600; margin: 4px 0 0 0; color: #475569;">${report.titleFr}</h2>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      <div>Année scolaire: <strong>${report.academicYearName || '2026/2027'}</strong></div>
      <div>Généré le: <strong>${report.generatedAt}</strong></div>
      <div>Périmètre: <strong>${report.schoolScopeLabel}</strong></div>
    </div>
  </div>

  <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
    ${kpiCardsHtml}
  </div>

  ${report.disclaimerNote ? `<div style="padding: 8px 12px; background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; border-radius: 6px; font-size: 11px; margin-bottom: 16px;">${report.disclaimerNote}</div>` : ''}

  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
    <thead>
      <tr style="background: #f1f5f9;">
        ${headersHtml}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    Document confidentiel — Réservé à l’administration de ${siteName}.
  </div>
</body>
</html>`;
  }

  /**
   * Title generator helper.
   */
  private static getReportTitle(type: ReportType): string {
    switch (type) {
      case 'REGISTRATIONS_GLOBAL':
        return 'Rapport Global des Inscriptions';
      case 'ACCEPTED_REGISTRATIONS':
        return 'Liste des Inscriptions Acceptées';
      case 'REFUSED_REGISTRATIONS':
        return 'Liste des Inscriptions Non Retenues';
      case 'PENDING_REGISTRATIONS':
        return 'Dossiers en Attente de Traitement';
      case 'WAITING_LIST':
        return 'Rapport de la Liste d’Attente';
      case 'CAPACITY_BY_LEVEL':
        return 'Capacités et Places par Niveau';
      case 'LEVEL_PERFORMANCE':
        return 'Performance et Demandes par Niveau';
      case 'SCHOOL_PERFORMANCE':
        return 'Comparaison des Établissements';
      case 'DOCUMENT_STATUS':
        return 'État d’Avancement des Pièces Justificatives';
      case 'INCOMPLETE_DOSSIERS':
        return 'Dossiers Incomplets (Documents Manquants)';
      case 'TARIFFS':
        return 'Grille Tarifaire et Montants Théoriques';
      case 'ACADEMIC_YEAR_COMPARISON':
        return 'Analyse Comparative des Années Scolaires';
      case 'ANNUAL_MANAGEMENT_REPORT':
        return 'Rapport Annuel de Gestion';
      default:
        return 'Rapport Personnalisé';
    }
  }

  /**
   * Saves custom report configuration.
   */
  static async saveReportConfig(
    actor: User,
    payload: {
      name: string;
      reportType: ReportType;
      schoolId?: string | null;
      filtersJson?: any;
      columnsJson?: any;
      sortJson?: any;
      isShared?: boolean;
    }
  ) {
    if (!AuthGuard.hasPermission(actor, 'report.read') && !AuthGuard.hasPermission(actor, 'reports.read')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [inserted] = await db
      .insert(savedReports)
      .values({
        userId: actor.id,
        name: payload.name.trim(),
        reportType: payload.reportType,
        schoolId: payload.schoolId || null,
        filtersJson: payload.filtersJson || {},
        columnsJson: payload.columnsJson || [],
        sortJson: payload.sortJson || {},
        isShared: payload.isShared || false,
      })
      .returning();

    return inserted;
  }

  /**
   * Executes and audits an export request.
   */
  static async logAndTrackExport(
    actor: User,
    reportData: ReportDataset,
    format: 'XLSX' | 'CSV' | 'PDF'
  ) {
    const db = getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days retention

    // 1. Track export in reportExports
    const [exportRecord] = await db
      .insert(reportExports)
      .values({
        userId: actor.id,
        reportType: reportData.reportType,
        schoolScopeJson: reportData.appliedFilters.schoolId ? [reportData.appliedFilters.schoolId] : actor.allowedSchoolIds,
        filtersJson: reportData.appliedFilters,
        format,
        recordCount: reportData.rows.length,
        status: 'READY',
        createdAt: now,
        expiresAt,
      })
      .returning();

    // 2. Log audit event
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'REPORT_EXPORTED',
      module: 'REPORTS',
      entityType: 'REPORT_EXPORT',
      entityId: exportRecord.id,
      schoolId: reportData.appliedFilters.schoolId || null,
      result: 'SUCCESS',
      metadataJson: {
        reportType: reportData.reportType,
        format,
        recordCount: reportData.rows.length,
      },
    });

    return exportRecord;
  }

  /**
   * Returns real aggregated chart data for the Rapports page dashboard.
   * Groups registrations by school, cycle, and status for the active academic year.
   */
  static async getReportChartsData(
    actor: User,
    filters: ReportFilterDto = {}
  ) {
    if (!AuthGuard.hasPermission(actor, 'report.read') && !AuthGuard.hasPermission(actor, 'reports.read')) {
      throw AppError.forbidden('Permission refusée pour consulter les rapports.');
    }

    const db = getDb();

    // Resolve active academic year
    let targetYearId = filters.academicYearId;
    let yearName = '';
    if (targetYearId) {
      const [y] = await db.select().from(academicYears).where(eq(academicYears.id, targetYearId));
      if (y) yearName = y.name;
    } else {
      const [activeY] = await db.select().from(academicYears).where(eq(academicYears.status, 'ACTIVE'));
      if (activeY) {
        targetYearId = activeY.id;
        yearName = activeY.name;
      }
    }

    // Fetch all registrations for the year with joins
    let baseRows = await db
      .select({
        reg: registrations,
        school: schools,
        cycle: cycles,
        level: levels,
        academicYear: academicYears,
      })
      .from(registrations)
      .innerJoin(schools, eq(registrations.schoolId, schools.id))
      .innerJoin(levels, eq(registrations.levelId, levels.id))
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .innerJoin(academicYears, eq(registrations.academicYearId, academicYears.id))
      .orderBy(desc(registrations.submittedAt));

    // Apply year filter
    if (targetYearId) {
      baseRows = baseRows.filter((r) => r.academicYear.id === targetYearId);
    }

    // Apply school scoping
    if (filters.schoolId) {
      baseRows = baseRows.filter((r) => r.school.id === filters.schoolId);
    } else if (actor.allowedSchoolIds && actor.allowedSchoolIds.length > 0) {
      baseRows = baseRows.filter((r) => actor.allowedSchoolIds!.includes(r.school.id));
    }

    // Apply Status filter if specified
    if (filters.status) {
      baseRows = baseRows.filter((r) => r.reg.status === filters.status);
    }

    // KPI totals
    const total = baseRows.length;
    const accepted = baseRows.filter((r) => r.reg.status === 'ACCEPTED').length;
    const refused = baseRows.filter((r) => r.reg.status === 'REFUSED').length;
    const waitlisted = baseRows.filter((r) => r.reg.status === 'WAITLISTED').length;
    const pending = baseRows.filter((r) => ['NEW', 'UNDER_REVIEW', 'PENDING'].includes(r.reg.status)).length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    // By school (initialize with real schools in DB to represent all authorized campuses)
    const allDbSchools = await db.select().from(schools);
    const bySchoolMap: Record<string, { name: string; total: number; accepted: number }> = {};
    for (const s of allDbSchools) {
      if (!filters.schoolId || filters.schoolId === s.id) {
        if (!actor.allowedSchoolIds || actor.allowedSchoolIds.length === 0 || actor.allowedSchoolIds.includes(s.id)) {
          bySchoolMap[s.id] = { name: s.name, total: 0, accepted: 0 };
        }
      }
    }
    for (const r of baseRows) {
      const key = r.school.id;
      if (!bySchoolMap[key]) bySchoolMap[key] = { name: r.school.name, total: 0, accepted: 0 };
      bySchoolMap[key].total++;
      if (r.reg.status === 'ACCEPTED') bySchoolMap[key].accepted++;
    }

    // By cycle
    const byCycleMap: Record<string, { name: string; count: number }> = {};
    for (const r of baseRows) {
      const key = r.cycle.id;
      const cycleLabel = r.cycle.nameFr || r.cycle.code || r.cycle.id;
      if (!byCycleMap[key]) byCycleMap[key] = { name: cycleLabel, count: 0 };
      byCycleMap[key].count++;
    }

    // By status
    const byStatus: Record<string, number> = {};
    for (const r of baseRows) {
      byStatus[r.reg.status] = (byStatus[r.reg.status] || 0) + 1;
    }

    // Monthly trend (submittedAt or createdAt by month)
    const byMonthMap: Record<string, number> = {};
    for (const r of baseRows) {
      const dateVal = r.reg.submittedAt || r.reg.createdAt;
      if (dateVal) {
        const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          byMonthMap[key] = (byMonthMap[key] || 0) + 1;
        }
      }
    }
    const sortedMonths = Object.keys(byMonthMap).sort();
    const monthlyTrend = sortedMonths.map((m) => ({ month: m, count: byMonthMap[m] }));

    return {
      academicYearId: targetYearId || null,
      academicYearName: yearName,
      kpis: {
        total,
        accepted,
        refused,
        waitlisted,
        pending,
        acceptanceRate,
      },
      bySchool: Object.values(bySchoolMap),
      byCycle: Object.values(byCycleMap),
      byStatus,
      monthlyTrend,
    };
  }
}
