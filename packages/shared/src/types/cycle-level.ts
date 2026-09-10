/**
 * Domain types for Educational Cycles and Grade Levels.
 */

export type CycleCode = 'PREPARATOIRE' | 'PRIMAIRE' | 'MOYEN' | 'SECONDAIRE';

export interface Cycle {
  id: string;
  code: CycleCode;
  nameFr: string;
  nameAr: string;
  order: number;
  descriptionFr?: string;
  descriptionAr?: string;
}

export interface Level {
  id: string;
  cycleId: string;
  code: string; // e.g., "PS", "MS", "GS", "CP", "CE1", "1AM", "1AS"
  nameFr: string;
  nameAr: string;
  order: number;
  minAgeYears?: number;
  maxAgeYears?: number;
  isActive: boolean;
}

export interface SchoolLevelConfig {
  id: string;
  schoolId: string;
  levelId: string;
  academicYearId: string;
  isOpenForRegistration: boolean;
  requiresEntranceExam: boolean;
  maxCapacity: number;
  reservedSeats: number;
  level?: Level;
}
