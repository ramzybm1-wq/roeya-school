/**
 * DynamicRegistrationFormRenderer Component.
 * Dynamically renders form sections, inputs, options, and evaluates conditional visibility
 * while preserving Stitch design tokens and UI structure.
 */

export interface DynamicFormField {
  fieldKey: string;
  fieldType: string;
  labelFr: string;
  labelAr?: string | null;
  placeholderFr?: string | null;
  helpTextFr?: string | null;
  isRequired: boolean;
  isEditableClient: boolean;
  options?: Array<{ value: string; labelFr: string; labelAr?: string }> | null;
  conditionalLogic?: {
    operator?: 'AND' | 'OR';
    conditions: Array<{
      fieldKey: string;
      comparison: 'EQUALS' | 'NOT_EQUALS' | 'IS_EMPTY' | 'IS_NOT_EMPTY' | 'IN' | 'NOT_IN';
      value?: any;
    }>;
  } | null;
  width?: string;
}

export interface DynamicFormSection {
  key: string;
  labelFr: string;
  labelAr?: string | null;
  displayOrder: number;
  fields: DynamicFormField[];
}

export interface DynamicFormDefinition {
  id: string;
  name: string;
  version: number;
  sections: DynamicFormSection[];
}

export function evaluateClientCondition(
  rule: DynamicFormField['conditionalLogic'],
  formValues: Record<string, any>
): boolean {
  if (!rule || !rule.conditions || rule.conditions.length === 0) return true;

  const operator = rule.operator || 'AND';
  const results = rule.conditions.map((cond) => {
    const val = formValues[cond.fieldKey];
    switch (cond.comparison) {
      case 'EQUALS':
        return val === cond.value;
      case 'NOT_EQUALS':
        return val !== cond.value;
      case 'IS_EMPTY':
        return val === undefined || val === null || val === '';
      case 'IS_NOT_EMPTY':
        return val !== undefined && val !== null && val !== '';
      case 'IN':
        return Array.isArray(cond.value) && cond.value.includes(val);
      case 'NOT_IN':
        return Array.isArray(cond.value) && !cond.value.includes(val);
      default:
        return true;
    }
  });

  return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export function DynamicRegistrationFormRenderer(props: {
  form: DynamicFormDefinition;
  values: Record<string, any>;
  currentSectionIndex?: number;
  language?: 'fr' | 'ar';
}) {
  const { form, values, currentSectionIndex = 0, language = 'fr' } = props;
  const currentSection = form.sections[currentSectionIndex];

  if (!currentSection) return null;

  const visibleFields = currentSection.fields.filter((field) =>
    evaluateClientCondition(field.conditionalLogic, values)
  );

  return {
    component: 'DynamicRegistrationFormRenderer',
    formId: form.id,
    formVersion: form.version,
    currentSection: {
      key: currentSection.key,
      label: language === 'ar' && currentSection.labelAr ? currentSection.labelAr : currentSection.labelFr,
    },
    visibleFields: visibleFields.map((f) => ({
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      label: language === 'ar' && f.labelAr ? f.labelAr : f.labelFr,
      placeholder: f.placeholderFr,
      helpText: f.helpTextFr,
      isRequired: f.isRequired,
      options: f.options,
      width: f.width || 'full',
      currentValue: values[f.fieldKey],
    })),
  };
}
