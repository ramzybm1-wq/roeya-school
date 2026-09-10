/**
 * Unit Tests: Form Builder Conditional Logic Engine.
 */

import { FormBuilderService } from '../../apps/api/src/services/form-builder.service';

describe('Form Builder: Conditional Logic Evaluation', () => {
  test('evaluates EQUALS condition correctly', () => {
    const rule = {
      operator: 'AND' as const,
      conditions: [{ fieldKey: 'uses_school_transport', comparison: 'EQUALS' as const, value: true }],
    };

    expect(FormBuilderService.evaluateConditionalRule(rule, { uses_school_transport: true })).toBe(true);
    expect(FormBuilderService.evaluateConditionalRule(rule, { uses_school_transport: false })).toBe(false);
  });

  test('evaluates IS_NOT_EMPTY condition correctly', () => {
    const rule = {
      operator: 'AND' as const,
      conditions: [{ fieldKey: 'secondary_parent_name', comparison: 'IS_NOT_EMPTY' as const }],
    };

    expect(FormBuilderService.evaluateConditionalRule(rule, { secondary_parent_name: 'Karim' })).toBe(true);
    expect(FormBuilderService.evaluateConditionalRule(rule, { secondary_parent_name: '' })).toBe(false);
    expect(FormBuilderService.evaluateConditionalRule(rule, {})).toBe(false);
  });

  test('evaluates IN condition correctly', () => {
    const rule = {
      operator: 'AND' as const,
      conditions: [{ fieldKey: 'cycle_code', comparison: 'IN' as const, value: ['CYCLE_MOYEN', 'CYCLE_SECONDAIRE'] }],
    };

    expect(FormBuilderService.evaluateConditionalRule(rule, { cycle_code: 'CYCLE_MOYEN' })).toBe(true);
    expect(FormBuilderService.evaluateConditionalRule(rule, { cycle_code: 'CYCLE_PRIMAIRE' })).toBe(false);
  });
});
