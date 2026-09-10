/**
 * Validator for Public and Admin Registration Dossier Submissions.
 */

import { ErrorDetail } from '@vision-school/shared';
import { CommonValidator, ValidationResult } from './common.validator';

export interface CreateRegistrationInput {
  schoolId: string;
  levelId: string;
  choiceId?: string;
  previousLevelId?: string;
  previousChoiceId?: string;
  academicYearId: string;
  student: {
    fullName?: string;
    firstNameFr: string;
    lastNameFr: string;
    firstNameAr?: string;
    lastNameAr?: string;
    birthDate: string;
    birthPlaceFr: string;
    birthPlaceAr?: string;
    birthPlace?: string;
    birthWilaya?: string;
    wilaya?: string;
    commune?: string;
    gender: 'MALE' | 'FEMALE';
    nationality?: string;
    currentSchool?: string;
    medicalConditionsNotes?: string;
    specialNeedsNotes?: string;
  };
  primaryParent: {
    fullName?: string;
    relationship: 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN';
    firstNameFr: string;
    lastNameFr: string;
    firstNameAr?: string;
    lastNameAr?: string;
    email: string;
    phonePrimary: string;
    phoneSecondary?: string;
    profession?: string;
    workplace?: string;
    address: string;
    city?: string;
    commune?: string;
    wilaya: string;
    isEmergencyContact: boolean;
  };
  secondaryParent?: {
    fullName?: string;
    relationship?: 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN';
    firstNameFr?: string;
    lastNameFr?: string;
    email?: string;
    phonePrimary?: string;
    profession?: string;
    address?: string;
    city?: string;
    commune?: string;
    wilaya?: string;
    isEmergencyContact?: boolean;
  };
}

export class RegistrationValidator {
  static validateCreate(input: unknown): ValidationResult<CreateRegistrationInput> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid payload body' }] };
    }

    const data = input as Partial<CreateRegistrationInput>;

    // Step 1: Establishment and Level
    if (!CommonValidator.isNonEmptyString(data.schoolId)) {
      errors.push({ field: 'schoolId', message: "L'établissement est requis." });
    }
    if (!CommonValidator.isNonEmptyString(data.levelId)) {
      errors.push({ field: 'levelId', message: 'Le niveau scolaire est requis.' });
    }
    if (!CommonValidator.isNonEmptyString(data.academicYearId)) {
      errors.push({ field: 'academicYearId', message: "L'année scolaire est requise." });
    }

    // Step 2: Student
    const student = data.student;
    if (!student || typeof student !== 'object') {
      errors.push({ field: 'student', message: "Les informations de l'élève sont requises." });
    } else {
      if (!CommonValidator.isNonEmptyString(student.firstNameFr, 2)) {
        errors.push({ field: 'student.firstNameFr', message: "Le prénom de l'élève (Français) est requis." });
      }
      if (!CommonValidator.isNonEmptyString(student.lastNameFr, 2)) {
        errors.push({ field: 'student.lastNameFr', message: "Le nom de l'élève (Français) est requis." });
      }
      if (!CommonValidator.isValidDate(student.birthDate)) {
        errors.push({ field: 'student.birthDate', message: 'Date de naissance invalide (Format: YYYY-MM-DD).' });
      }
      if (!CommonValidator.isNonEmptyString(student.birthPlaceFr)) {
        errors.push({ field: 'student.birthPlaceFr', message: 'Le lieu de naissance est requis.' });
      }
      if (!CommonValidator.isNonEmptyString(student.birthWilaya)) {
        errors.push({ field: 'student.birthWilaya', message: 'La wilaya de naissance est requise.' });
      }
      if (!['MALE', 'FEMALE'].includes(student.gender)) {
        errors.push({ field: 'student.gender', message: 'Le genre doit être Masculin ou Féminin.' });
      }
    }

    // Step 3: Primary Parent
    const parent = data.primaryParent;
    if (!parent || typeof parent !== 'object') {
      errors.push({ field: 'primaryParent', message: 'Les informations du parent / tuteur sont requises.' });
    } else {
      if (!['FATHER', 'MOTHER', 'LEGAL_GUARDIAN'].includes(parent.relationship)) {
        errors.push({ field: 'primaryParent.relationship', message: 'Le lien de parenté est requis.' });
      }
      if (!CommonValidator.isNonEmptyString(parent.firstNameFr, 2)) {
        errors.push({ field: 'primaryParent.firstNameFr', message: 'Le prénom du parent est requis.' });
      }
      if (!CommonValidator.isNonEmptyString(parent.lastNameFr, 2)) {
        errors.push({ field: 'primaryParent.lastNameFr', message: 'Le nom du parent est requis.' });
      }
      if (!CommonValidator.isValidEmail(parent.email)) {
        errors.push({ field: 'primaryParent.email', message: 'Adresse email parent invalide.' });
      }
      if (!CommonValidator.isValidPhone(parent.phonePrimary)) {
        errors.push({ field: 'primaryParent.phonePrimary', message: 'Numéro de téléphone principal invalide.' });
      }
      if (!CommonValidator.isNonEmptyString(parent.address)) {
        errors.push({ field: 'primaryParent.address', message: "L'adresse de résidence est requise." });
      }
      if (!CommonValidator.isNonEmptyString(parent.city)) {
        errors.push({ field: 'primaryParent.city', message: 'La commune / ville est requise.' });
      }
      if (!CommonValidator.isNonEmptyString(parent.wilaya)) {
        errors.push({ field: 'primaryParent.wilaya', message: 'La wilaya est requise.' });
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as CreateRegistrationInput) : undefined,
      errors,
    };
  }
}
