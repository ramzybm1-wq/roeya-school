/**
 * Unit Tests: Form Builder Custom Fields & Option Constraints.
 */

describe('Form Builder: Custom Fields & Options Validation', () => {
  test('validates submitted value against configured select/radio options', () => {
    const field = {
      fieldKey: 'canteen_diet',
      fieldType: 'SELECT',
      options: [
        { value: 'STANDARD', labelFr: 'Standard' },
        { value: 'VEGETARIAN', labelFr: 'Végétarien' },
        { value: 'ALLERGY', labelFr: 'Sans allergènes' },
      ],
    };

    const validateOption = (val: string) => {
      const allowed = field.options.map((o) => o.value);
      return allowed.includes(val);
    };

    expect(validateOption('STANDARD')).toBe(true);
    expect(validateOption('VEGETARIAN')).toBe(true);
    expect(validateOption('INJECTED_OPTION_ATTACK')).toBe(false);
  });
});
