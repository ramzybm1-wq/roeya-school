/**
 * Multi-Step Registration Wizard Page.
 * Corresponds to Stitch Screens:
 * - Step 1: '89543c4789e143138c8d480eb8bccac1' (Établissement & Niveau)
 * - Step 2: '61f8822682dd427cb9a75fcd5d71ddff' (Élève)
 * - Step 3: 'b3b142481fc3475e8961acc914d35167' (Parent / Tuteur)
 * - Step 4: '7ffa1af7ebcc41b384401505d3e13111' (Documents)
 * - Step 5: '293ddbfaee134048bd6b844ee2e1fae1' (Confirmation)
 */

import { SEED_SCHOOLS, SEED_LEVELS, SEED_DOCUMENT_TYPES } from '@vision-school/database';

export interface WizardStepState {
  currentStep: number;
  schoolId?: string;
  levelId?: string;
  student?: Record<string, unknown>;
  primaryParent?: Record<string, unknown>;
  customFieldValues?: Record<string, unknown>;
  documents?: Array<{ documentTypeId: string; file?: unknown; status?: string }>;
  confirmationCode?: string;
  documentRequirements?: any[];
  dynamicForm?: any;
}

export function RegistrationWizardPage(props?: {
  step?: number;
  requirements?: any[];
  dynamicForm?: any;
  formData?: Record<string, any>;
}) {
  const currentStep = props?.step || 1;
  const schools = SEED_SCHOOLS.filter((s) => s.isActive);
  const levels = SEED_LEVELS.filter((l) => l.isActive);
  const documentRequirements = props?.requirements || SEED_DOCUMENT_TYPES.map((dt) => ({
    documentTypeId: dt.id,
    nameFr: dt.nameFr,
    nameAr: dt.nameAr,
    descriptionFr: dt.descriptionFr,
    isRequired: false, // Optional by default
    maxFileSizeBytes: dt.maxFileSizeBytes || 5242880,
    fileRuleType: dt.fileRuleType,
  }));

  return {
    wizardId: 'registration_wizard',
    currentStep,
    steps: [
      { number: 1, title: 'Établissement & Niveau', screenId: '89543c4789e143138c8d480eb8bccac1' },
      { number: 2, title: 'Informations Élève', screenId: '61f8822682dd427cb9a75fcd5d71ddff' },
      { number: 3, title: 'Informations Parent', screenId: 'b3b142481fc3475e8961acc914d35167' },
      { number: 4, title: 'Pièces Justificatives', screenId: '7ffa1af7ebcc41b384401505d3e13111' },
      { number: 5, title: 'Confirmation & Reçu', screenId: '293ddbfaee134048bd6b844ee2e1fae1' },
    ],
    schools,
    levels,
    documentRequirements,
    dynamicForm: props?.dynamicForm || null,
    formData: props?.formData || {},
  };
}
