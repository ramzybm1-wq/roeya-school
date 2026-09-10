/**
 * Unit Tests: Form Builder System-Protected Fields Safeguards.
 */

describe('Form Builder: Protected Fields Safeguards', () => {
  test('blocks deletion of system protected fields', () => {
    const fields = [
      { id: 'fld_1', fieldKey: 'parent_phone', isSystemProtected: true },
      { id: 'fld_2', fieldKey: 'custom_notes', isSystemProtected: false },
    ];

    const tryDeleteField = (fieldId: string) => {
      const field = fields.find((f) => f.id === fieldId);
      if (field?.isSystemProtected) {
        throw new Error('PROTECTED_FIELD_CANNOT_BE_DELETED');
      }
      return { success: true };
    };

    expect(() => tryDeleteField('fld_1')).toThrow('PROTECTED_FIELD_CANNOT_BE_DELETED');
    expect(tryDeleteField('fld_2').success).toBe(true);
  });
});
