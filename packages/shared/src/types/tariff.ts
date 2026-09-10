/**
 * Domain types for Tariffs and School Fees.
 */

export type PaymentPeriodicity = 'ANNUAL' | 'TRIMESTRIAL' | 'MONTHLY';

export interface FeeItem {
  id: string;
  code: string; // e.g. "INSCRIPTION", "SCOLARITE", "CANTINE", "TRANSPORT", "UNIFORME"
  nameFr: string;
  nameAr: string;
  amount: number; // in DZD
  isMandatory: boolean;
  periodicity: PaymentPeriodicity;
}

export interface LevelTariff {
  id: string;
  schoolId: string;
  levelId: string;
  academicYearId: string;
  currency: string; // default "DZD"
  registrationFee: number;
  annualTuitionFee: number;
  trimestrialTuitionFee?: number;
  monthlyTuitionFee?: number;
  canteenFeeAnnual?: number;
  transportFeeAnnual?: number;
  discountSiblingPercent?: number;
  items: FeeItem[];
  isPubliclyVisible: boolean;
  notesFr?: string;
  notesAr?: string;
  updatedAt: string;
}
